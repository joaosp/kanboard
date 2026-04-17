# Architecture: Drag-and-Drop with Animations for Cards

## Summary
Adds pointer + keyboard drag-and-drop for cards using `@dnd-kit/core` + `@dnd-kit/sortable`. The server side gets a minor hardening pass on `PATCH /api/cards/:id` to explicitly authorize cross-list moves (the Zod schema and the service already accept `listId` + `position`, so no Prisma migration is needed), plus server-side position rebalancing on the affected list(s) in a single transaction. The client wires a single `DndContext` into `BoardView`, turns `ColumnView`'s card list into a `SortableContext`, makes `CardItem` sortable, and adds a `DragCardPreview` rendered inside `DragOverlay`. Optimistic updates run through `useCardsStore`; failures snap back and toast via `useUiStore`. Phase 1 (server) and Phase 2 (client scaffold + visuals) are fully independent and can be implemented by parallel agents; Phase 3 wires behaviour + E2E on top of both.

## Data Model

### Prisma Changes
```prisma
// No schema changes. `Card.position: Int` + `Card.listId` (with FK + index idx_card_list)
// already support the move. Re-confirmed against prisma/schema.prisma.
```

- **Migration command:** None.
- **Indexes added:** None. Existing `idx_card_list (listId)` covers `prisma.card.findMany({ where: { listId } })` during rebalance.
- **FKs / cascades:** Unchanged.
- **Backfill / data migration notes:** None — feature is additive.

## API Contract

### `PATCH /api/cards/:id` (modified — tighten authorization + add rebalance)
- **Auth:** `requireAuth` + inline membership check (see `routes/cards.ts:59`). **New:** if the body contains `listId` different from the current card's `listId`, the handler must also verify the user is a member of the **target** list's board (reject `403` otherwise). Target list must exist (`404` otherwise).
- **Params schema:** `cardParamsSchema` in `src/server/schemas/card.schema.ts` (unchanged).
- **Body schema:** `updateCardSchema` in `src/server/schemas/card.schema.ts` — already includes `position?: number.int().min(0)` and `listId?: string.uuid()`. Add a refinement: if both `listId` and `position` are omitted, require at least one of `title`/`description` (no empty PATCH).
- **Request body (drag case):** `{ listId?: string; position: number }`.
- **Response:** `{ data: Card }` with the updated card (shape unchanged from today).
- **Errors:**
  - `400` — Zod validation (`createAppError` via `validate` middleware).
  - `401` — missing/invalid Bearer (`requireAuth`).
  - `403` — user is not a member of the card's current board *or* of the target list's board. `createAppError('Not a member of this board', 403)`.
  - `404` — card not found, or target `listId` does not exist. `createAppError('Card not found', 404)` / `createAppError('Target list not found', 404)`.
  - `409` — target list belongs to a different board than the card. `createAppError('Cannot move card across boards', 409)`.
- **Side effects:** Updates the target card's `listId` + `position`. **Rebalances** `position` on the destination list (and on the source list if it differs) using the strategy below. Idempotent for identical `(listId, position)` — no-op at the client guard, and server re-execution yields the same final ordering.

### Position rebalance strategy
Full recomputation of the affected list(s) in a single `prisma.$transaction`:

1. Load source list cards ordered by `position asc` (exclude the moving card).
2. If target list differs, load target list cards ordered by `position asc` (exclude the moving card if present).
3. Insert moving card into target list at the requested `position` index (clamp to `[0, targetList.length]`).
4. Re-write `position = index` (contiguous 0..N-1) for every card whose index changed, using one `prisma.card.update` per changed row inside the transaction. Small lists (< ~50 cards per column in practice) keep this cheap; correctness over micro-optimisation.

**Justification for full recompute over integer-gap:** integer-gap requires eventual rebalance anyway, adds branching, and complicates concurrent-drop ordering. Full recompute is O(N) on two short lists and is trivially correct under last-write-wins (see scope edge case "another client reorders mid-drag").

## Frontend Plan

### New Components
| Path                                                                                  | Responsibility                                    | Props                 | testids                                      |
| ------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------- | -------------------------------------------- |
| `src/client/components/Card/DragCardPreview/DragCardPreview.tsx` + `.module.css`      | Non-interactive clone of `CardItem` inside overlay | `{ card: Card }`      | `drag-overlay`, `drag-overlay-card-{cardId}` |
| `src/client/components/Column/EmptyDropZone/EmptyDropZone.tsx` + `.module.css`        | Full-width dashed target for empty list           | `{ listId: string }`  | `column-empty-drop-{listId}`                 |

### Modified Components
| Path                                                               | Change                                                                                                                                               |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/client/components/Board/BoardView/BoardView.tsx`              | Wrap `.columns` in `<DndContext>`; add `PointerSensor` (activation distance 6) + `KeyboardSensor`; `onDragStart/Over/End/Cancel`; render `<DragOverlay>` portal. Add `data-testid="board-dnd-context"`. |
| `src/client/components/Column/ColumnView/ColumnView.tsx`           | Wrap cards list in `<SortableContext items={sortedCards.map(c => c.id)} strategy={verticalListSortingStrategy}>`; register cards wrapper as `useDroppable` fallback; render `<EmptyDropZone>` when list is empty. Add `data-testid={column-droppable-${list.id}}`. |
| `src/client/components/Card/CardItem/CardItem.tsx`                 | Use `useSortable({ id: card.id })`; apply library `transform`/`transition` via inline `style`; add `styles.cardGhost` while `isDragging`; add `data-testid={card-draggable-${card.id}}` alongside existing `card-item`; guard click-to-open when drag just ended (use activation distance threshold). |
| `src/client/components/Card/CardItem/CardItem.module.css`          | Add `.cardGhost` (opacity 0.4, desaturate); add `:focus-visible` outline using `--color-primary`. |
| `src/client/stores/cards.ts`                                       | Add `moveCard(cardId, { listId, position })` — optimistically patches `currentBoard` lists via `useBoardsStore.setState`, calls `updateCardApi`, reverts + toasts on failure. Existing `updateCard` unchanged. |
| `src/client/stores/boards.ts`                                      | Expose a local-only setter, e.g. `applyCardMove(cardId, targetListId, targetPosition)` used by `moveCard` to mutate `currentBoard` in place without a refetch. |

### Stores
- **New:** None.
- **Modified:**
  - `src/client/stores/cards.ts` — adds `moveCard` action (see above).
  - `src/client/stores/boards.ts` — adds `applyCardMove` local mutator and a matching `revertCardMove` (or capture snapshot in `moveCard`).

### API Client Wrappers
- `src/client/api/cards.ts` — **no change** (existing `updateCardApi(id, { listId?, position? })` is already typed correctly).

### Routes (if any)
- None.

### Design Tokens
- **New in `src/client/styles/tokens.css`:**
  - `--shadow-drag: 0 20px 25px -5px rgb(0 0 0 / 0.2), 0 10px 10px -5px rgb(0 0 0 / 0.1);`
  - `--rotation-drag: -2deg;`
  - `--scale-drag: 1.03;`
  - `--z-drag-overlay: 300;`
  - `--opacity-ghost: 0.4;`

## Phases

> **Parallelism note:** Phases 1 and 2 are fully independent and can run in parallel. Phase 3 depends on both.

### Phase 1 — Server hardening + rebalance (independent; ships alone)
- [ ] `src/server/schemas/card.schema.ts`: add `.refine()` to `updateCardSchema` disallowing an empty body (at least one of `title`, `description`, `position`, `listId`).
- [ ] `src/server/services/card.service.ts`: add `moveCard(cardId, { listId?, position }, userId)` that runs the rebalance in `prisma.$transaction`. Keep `updateCard` in place for non-move patches (title/description).
- [ ] `src/server/routes/cards.ts`: in the existing `PATCH /cards/:id` handler (line 53), after the current membership check, branch: if `listId` is present and differs from `card.list.id`, load the target list (`404` if missing), assert the target list's `boardId === card.list.boardId` (`409` if not), re-check `boardMember` on the target board (same `boardId` today but future-proof), then call `moveCard(...)`. Else if `position` is present, call `moveCard(...)` on the same list. Else fall through to existing `updateCard(...)`.
- [ ] No router mount change — routes already mounted in `src/server/index.ts`.
- [ ] `tests/unit/services/card.service.test.ts`: extend with cases for `moveCard` (same-list reorder; cross-list move; clamping; rebalance re-writes only changed positions).
- [ ] `tests/unit/schemas/card.schema.test.ts` (create if absent): assert empty-body rejection; assert `listId` + `position` accepted.
- [ ] `tests/unit/routes/cards.route.test.ts` (create): supertest coverage for 400/403/404/409 paths on the PATCH route (reuse the pattern from `tests/unit/routes/` if existing, otherwise a minimal supertest harness with mocked Prisma). Happy-path cross-list move returns 200 with updated card.
- [ ] Exit: `npm run typecheck && npm run lint && npm test` green.

### Phase 2 — Client scaffold + visuals (independent; ships alone, zero behaviour)
- [ ] `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` — updates `package.json` + `package-lock.json`. (Also `clsx` if not already available; otherwise use template strings.)
- [ ] `src/client/styles/tokens.css`: add the five new tokens listed above.
- [ ] `src/client/components/Card/DragCardPreview/DragCardPreview.tsx` + `.module.css`: presentational clone of `CardItem` (labels strip + title), applies `--shadow-drag`, `transform: rotate(var(--rotation-drag)) scale(var(--scale-drag))`, `z-index: var(--z-drag-overlay)`. No `onClick`, no store subscriptions. `data-testid="drag-overlay"` on root, inner `data-testid={drag-overlay-card-${card.id}}`.
- [ ] `src/client/components/Column/EmptyDropZone/EmptyDropZone.tsx` + `.module.css`: dashed `--color-primary` border, `--color-primary-light` bg, `--radius-md`, min-height equal to a card. Exposes `useDroppable({ id: empty-${listId} })`. `data-testid={column-empty-drop-${listId}}`.
- [ ] `src/client/components/Card/CardItem/CardItem.module.css`: add `.cardGhost { opacity: var(--opacity-ghost); filter: saturate(0.6); box-shadow: none; }` and `:focus-visible` outline. **Do not** wire the sortable hook yet — visuals only; the class will be toggled in Phase 3.
- [ ] `src/client/components/Board/BoardView/BoardView.module.css`: ensure the columns region is positioned for the `DragOverlay` portal (no change expected; just verify `position: relative` semantics).
- [ ] `tests/unit/components/DragCardPreview.test.tsx`: renders title + labels, applies `drag-overlay` testid, contains no `onClick` handler.
- [ ] `tests/unit/components/EmptyDropZone.test.tsx`: renders with the correct testid.
- [ ] Exit: `npm run typecheck && npm run lint && npm test` green. App builds and renders exactly as before (no behavioural change).

### Phase 3 — Behaviour + E2E (depends on Phases 1 + 2)
- [ ] `src/client/components/Card/CardItem/CardItem.tsx`: adopt `useSortable({ id: card.id })`; merge library `transform`/`transition` with existing styles; toggle `.cardGhost` on `isDragging`; add `data-draggable-id={card-draggable-${card.id}}` (plus a real `data-testid={card-draggable-${card.id}}`); suppress `onClick` when a drag just fired (compare pointer delta against activation distance or rely on dnd-kit's built-in click-vs-drag discrimination).
- [ ] `src/client/components/Column/ColumnView/ColumnView.tsx`: wrap card list in `<SortableContext>`; render `<EmptyDropZone listId={list.id} />` when `sortedCards.length === 0`; add `data-testid={column-droppable-${list.id}}` on the cards wrapper.
- [ ] `src/client/components/Board/BoardView/BoardView.tsx`: wrap `.columns` in `<DndContext>` with `PointerSensor({ activationConstraint: { distance: 6 } })` + `KeyboardSensor`; `collisionDetection: closestCorners`; state `activeCard: Card | null`; handlers `onDragStart`/`onDragOver`/`onDragEnd`/`onDragCancel` that call `useCardsStore.getState().moveCard(...)` on commit; render `<DragOverlay>{activeCard ? <DragCardPreview card={activeCard} /> : null}</DragOverlay>`; provide `accessibility.announcements` map exactly as specified in `design.md`.
- [ ] `src/client/stores/cards.ts`: implement `moveCard(cardId, { listId, position })` — snapshot current `currentBoard`; apply optimistic mutation via `useBoardsStore.getState().applyCardMove(...)`; `await updateCardApi(cardId, { listId, position })`; on throw, restore snapshot and `useUiStore.getState().addToast('Move failed', 'error')`.
- [ ] `src/client/stores/boards.ts`: implement `applyCardMove(cardId, targetListId, targetPosition)` that immutably relocates the card and renumbers positions in the affected list(s).
- [ ] `tests/unit/stores/cards.test.ts`: add cases — `moveCard` optimistically updates, calls `updateCardApi`, and on rejection reverts + toasts.
- [ ] `tests/unit/stores/boards.test.ts`: cover `applyCardMove` same-list and cross-list ordering.
- [ ] `tests/e2e/drag-animations.spec.ts`: seeded demo login → navigate to a board with ≥2 lists and ≥2 cards → drag card-1 below card-2 in same list (assert order via `data-testid` on cards) → drag card across columns (assert list membership) → reload page → assert persistence. Also exercise Escape cancellation path.
- [ ] Manual smoke: `npm run dev`, exercise click-to-open (AC 8), within-list, cross-list, empty-list drops, Escape, keyboard path.
- [ ] Exit: `npm run typecheck && npm run lint && npm test && npm run test:e2e` green.

## Technical Decisions
1. **No Prisma migration.** `Card.position` + `Card.listId` already model the move; `updateCardSchema` already accepts both. The feature is additive at the schema boundary. Trade-off: we keep the `Int` gap-less approach and pay O(N) writes per drop instead of introducing a float/gap column.
2. **Authorization stays inline.** The existing `routes/cards.ts` pattern (load card → check membership) is extended with a second check on the *target* list's board. Using middleware would require reading the body before the validator, which contradicts the project's `validateParams → validate → access` ordering. Trade-off: more code in the handler, but matches the neighbouring handlers in the same file.
3. **Response envelope unchanged.** `{ data: Card }` from `PATCH /cards/:id` remains. Clients that only reorder still get a fully-shaped card back and can ignore it (the store applies optimistic state).
4. **Index rationale.** `idx_card_list (listId)` already exists and serves both the rebalance's `findMany({ where: { listId }, orderBy: { position: 'asc' } })` and the source-list scan. No new index.
5. **Position strategy = full recompute.** Chosen over integer-gap because (a) columns are short, (b) correctness under concurrent drops is trivial with last-write-wins, (c) avoids a future rebalance pass. Trade-off: one extra `update` per shifted card per drop.
6. **Optimistic client + snapshot revert.** `moveCard` snapshots `currentBoard` before mutating so revert is a single `setState`. Trade-off: transient memory hold of the board snapshot during the in-flight PATCH (tiny).
7. **Single `DndContext` at `BoardView`.** Nesting contexts per column would prevent cross-list drags. Trade-off: all columns re-render on drag start — acceptable at MVP board sizes.
8. **Phase boundary rationale.** Phase 1 ships alone: the existing client never sends `listId` today, so added server behaviour is dormant. Phase 2 ships alone: installing `@dnd-kit` + adding tokens + new presentational components is inert until Phase 3 wires handlers. If Phase 3 slips, the board still works exactly as today.
9. **Card-labels branch coexistence.** The modified files (`CardItem.tsx`, `CardModal.tsx`, `BoardView.tsx`, `ColumnView.tsx`, `cards.ts` store, tokens.css) are already dirty on `workshop/JOAO_CAMARATE` from the in-progress card-labels work. The plan edits the *same* files but only **appends** (new classes, new tokens, new wrapper elements) — no deletions of in-flight label code. Implementers should rebase/merge card-labels first if it has not yet landed, then apply drag changes on top.

## Test Strategy

### Unit
| Test file                                                      | Layer     | Asserts                                                                                                           | AC         |
| -------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------- | ---------- |
| `tests/unit/services/card.service.test.ts`                     | service   | `moveCard` same-list rebalance rewrites positions 0..N-1; returns updated card                                    | #1, #6     |
| `tests/unit/services/card.service.test.ts`                     | service   | `moveCard` cross-list move removes from source list, inserts at clamped target position, renumbers both lists     | #2, #6     |
| `tests/unit/schemas/card.schema.test.ts`                       | schema    | `updateCardSchema` rejects empty body; accepts `{ position }`; accepts `{ listId, position }`                     | #6         |
| `tests/unit/routes/cards.route.test.ts`                        | route     | `PATCH /cards/:id` returns 403 when user is not a member of target list's board                                   | #7         |
| `tests/unit/routes/cards.route.test.ts`                        | route     | `PATCH /cards/:id` returns 404 when target `listId` does not exist                                                | #7         |
| `tests/unit/routes/cards.route.test.ts`                        | route     | `PATCH /cards/:id` returns 409 when target list belongs to a different board                                      | #7         |
| `tests/unit/components/DragCardPreview.test.tsx`               | component | Renders title + labels + `data-testid="drag-overlay"`; has no click handler                                       | #3         |
| `tests/unit/components/EmptyDropZone.test.tsx`                 | component | Renders with `data-testid={column-empty-drop-<id>}`                                                               | #3         |
| `tests/unit/stores/cards.test.ts`                              | store     | `moveCard` optimistically updates board then calls `updateCardApi`; reverts + toasts on rejection                 | #1, #6     |
| `tests/unit/stores/boards.test.ts`                             | store     | `applyCardMove` reorders within a list and across lists, renumbering positions                                    | #1, #2     |
| `tests/unit/components/CardItem.test.tsx`                      | component | `card-draggable-{id}` testid present; `cardGhost` class applied when `isDragging=true` (mock `useSortable`)       | #1, #8     |

### E2E
| Spec                                           | Flow                                                                                                                              | ACs covered       |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `tests/e2e/drag-animations.spec.ts`            | Login as demo → open a board → drag `card-draggable-{a}` below `card-draggable-{b}` in the same column → assert DOM order → reload → assert order persists | #1, #6            |
| `tests/e2e/drag-animations.spec.ts`            | Drag a card from column A onto `column-empty-drop-{b}` → assert card now inside `column-droppable-{b}` → reload → assert persists | #2, #3, #6        |
| `tests/e2e/drag-animations.spec.ts`            | Start a keyboard drag (`Tab` → `Space` → arrows → `Space`) and assert new position persists                                       | #5                |
| `tests/e2e/drag-animations.spec.ts`            | Start a pointer drag then press `Escape`; assert no network PATCH fired and order unchanged                                        | #4                |
| `tests/e2e/drag-animations.spec.ts`            | Click (press + release < 6px) on a card opens the card modal                                                                       | #8                |
| *(backend-only — no E2E cell)*                 | AC #7 (access control) is fully covered by the route-level unit tests in the Unit table above                                     | #7                |

## How to Verify
```bash
# Phase 1 (server) — can run alone on its own branch
npm run typecheck && npm run lint && npm test

# Phase 2 (client scaffold) — can run alone on its own branch
npm install            # picks up @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
npm run typecheck && npm run lint && npm test
npm run dev            # board should render identically to today (no behavioural change)

# Phase 3 (integration) — after 1 + 2 are merged
npm install
npm run typecheck && npm run lint && npm test
npm run test:e2e
npm run dev            # manual smoke: drag within a list, drag across lists, Escape cancels, click still opens modal
```
