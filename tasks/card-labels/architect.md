# Architecture: Card Labels

## Summary
Card labels add two new Prisma models (`Label`, `CardLabel`), six new REST endpoints (board-scoped CRUD for labels + attach/detach for cards), extensions to existing board and card read endpoints so the client can hydrate labels in a single round-trip, and five new React components under `src/client/components/Label/` plus small modifications to `BoardHeader`, `BoardView`, `CardItem`, and `CardModal`. Phase 1 ships the schema, migration, and full backend (callable by `curl`, unit-tested, no UI). Phase 2 wires label CRUD, attach/detach, and display into the existing card/board surfaces. Phase 3 adds the board-level `LabelFilterBar`, polish states from `design.md` (empty/loading/error), accessibility guarantees, and the Playwright spec covering the scope user story end-to-end.

## Data Model

### Prisma Changes

```prisma
// prisma/schema.prisma — diff against current file

 model Board {
   id        String        @id @default(uuid())
   name      String
   createdAt DateTime      @default(now()) @map("created_at")
   updatedAt DateTime      @updatedAt @map("updated_at")
   members   BoardMember[]
   lists     List[]
+  labels    Label[]

   @@map("boards")
 }

 model Card {
   id          String   @id @default(uuid())
   listId      String   @map("list_id")
   title       String
   description String?
   position    Int
   createdAt   DateTime @default(now()) @map("created_at")
   updatedAt   DateTime @updatedAt @map("updated_at")
   list        List     @relation(fields: [listId], references: [id], onDelete: Cascade)
+  labels      CardLabel[]

   @@index([listId], name: "idx_card_list")
   @@map("cards")
 }

+model Label {
+  id        String      @id @default(uuid())
+  boardId   String      @map("board_id")
+  name      String
+  color     String       // slot name, one of: 'red'|'amber'|'green'|'blue'|'purple'|'slate' (enforced by Zod on the server)
+  createdAt DateTime    @default(now()) @map("created_at")
+  updatedAt DateTime    @updatedAt @map("updated_at")
+  board     Board       @relation(fields: [boardId], references: [id], onDelete: Cascade)
+  cards     CardLabel[]
+
+  @@unique([boardId, name], map: "uniq_label_board_name")
+  @@index([boardId], map: "idx_label_board")
+  @@map("labels")
+}
+
+model CardLabel {
+  cardId    String   @map("card_id")
+  labelId   String   @map("label_id")
+  createdAt DateTime @default(now()) @map("created_at")
+  card      Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
+  label     Label    @relation(fields: [labelId], references: [id], onDelete: Cascade)
+
+  @@id([cardId, labelId])
+  @@index([labelId], map: "idx_card_label_label")
+  @@map("card_labels")
+}
```

- **Migration command:** `npm run db:migrate -- --name add_card_labels`
- **Indexes added:**
  - `uniq_label_board_name` on `labels(board_id, name)` — enforces AC8 "labels are board-scoped" and backs the duplicate-name 400 path (edge case in `scope.md`). Note: this constraint is **case-sensitive** at the DB layer; the scope requires **case-insensitive** duplicate detection, so the service layer does a normalized (`name.trim().toLowerCase()`) existence check before insert/update and the DB unique is a defense-in-depth fallback.
  - `idx_label_board` on `labels(board_id)` — backs `GET /api/boards/:boardId/labels` and `getBoardById` hydration.
  - `idx_card_label_label` on `card_labels(label_id)` — backs label-deletion cascade queries and the count-by-label query used in the delete-confirm UI (`LabelRow` shows "Attached to N cards.").
  - Composite PK `card_labels(card_id, label_id)` — prevents duplicate attachments at the DB level; idempotent attach (AC5) is implemented in the service as "find-or-create" returning 200 with the existing row.
- **FKs / cascades:**
  - `labels.board_id → boards.id` `onDelete: Cascade` — deleting a board removes its labels (scope edge case).
  - `card_labels.card_id → cards.id` `onDelete: Cascade` — deleting a card drops its label joins (scope edge case); the labels themselves remain.
  - `card_labels.label_id → labels.id` `onDelete: Cascade` — deleting a label detaches it from every card (AC3).
- **Backfill / data migration notes:** None. Both tables are additive and start empty. No existing rows need migration.

## API Contract

All six new endpoints live under `/api/boards/...` or `/api/cards/...`. All require `requireAuth`. All return `{ data: T }` on success, `{ error: string }` on failure via the central `errorHandler`.

### `GET /api/boards/:boardId/labels`  — list labels on a board
- **Auth:** `requireAuth` → `validateParams(labelBoardParamsSchema)` → `requireBoardMember('boardId')`.
- **Params schema:** `labelBoardParamsSchema` in `src/server/schemas/label.schema.ts`:
  ```ts
  z.object({ boardId: z.string().uuid() })
  ```
- **Body schema:** none (GET).
- **Response:** `{ data: Label[] }` where `Label = { id: string; boardId: string; name: string; color: LabelColor; createdAt: string; updatedAt: string }`. Sorted by `createdAt asc` (creation order — scope says manual reordering is out of scope).
- **Errors:**
  - `400` — `boardId` not a UUID → `validateParams` sends `{ error: '...' }`.
  - `401` — no/invalid Bearer → `requireAuth` sends `{ error: 'Unauthorized' }`.
  - `403` — not a board member → `requireBoardMember` sends `{ error: 'Not a member of this board' }` (AC4).
- **Side effects:** None (pure read). Idempotent.

### `POST /api/boards/:boardId/labels`  — create a label
- **Auth:** `requireAuth` → `validateParams(labelBoardParamsSchema)` → `requireBoardMember('boardId')` → `validate(createLabelSchema)`.
- **Params schema:** `labelBoardParamsSchema`.
- **Body schema:** `createLabelSchema` in `src/server/schemas/label.schema.ts`:
  ```ts
  export const LABEL_COLORS = ['red','amber','green','blue','purple','slate'] as const;
  const createLabelSchema = z.object({
    name: z.string().trim().min(1).max(50),
    color: z.enum(LABEL_COLORS),
  });
  ```
- **Request body:** `{ name: string; color: LabelColor }`.
- **Response (`201`):** `{ data: Label }`.
- **Errors:**
  - `400` — body invalid (empty name, >50 chars, unsupported color) → `validate(...)`.
  - `400` — duplicate name on this board (case-insensitive) → `createAppError('A label named "<name>" already exists on this board.', 400)` from the service after its pre-check; the DB unique constraint throws a Prisma P2002 which the service catches and re-throws as the same `AppError`.
  - `401` / `403` as above (AC4).
- **Side effects:** inserts one row into `labels`. Not idempotent.

### `PATCH /api/labels/:id`  — rename/recolor a label (AC2)
- **Auth:** `requireAuth` → `validateParams(labelParamsSchema)` → inline board-membership check (pattern from `routes/cards.ts`): service loads the label (`label.findUnique`), 404 if missing, then `prisma.boardMember.findUnique` on `(label.boardId, req.user.id)`; 403 if not a member → `validate(updateLabelSchema)` runs **after** the access check (same ordering as `routes/cards.ts` — validate params, custom auth, then body).
- **Params schema:** `labelParamsSchema`:
  ```ts
  z.object({ id: z.string().uuid() })
  ```
- **Body schema:** `updateLabelSchema`:
  ```ts
  z.object({
    name: z.string().trim().min(1).max(50).optional(),
    color: z.enum(LABEL_COLORS).optional(),
  }).refine((d) => d.name !== undefined || d.color !== undefined, { message: 'At least one of name or color is required.' })
  ```
- **Request body:** `{ name?: string; color?: LabelColor }`.
- **Response (`200`):** `{ data: Label }`.
- **Errors:**
  - `400` — body invalid / empty patch / duplicate name (case-insensitive) via service pre-check.
  - `401` / `403` / `404` — standard.
- **Side effects:** updates one row in `labels`. Because only `name`/`color` change, every existing `card_labels` row is unaffected — cards keep their attachment and render the updated name/color on the next board fetch (AC2).

### `DELETE /api/labels/:id`  — delete a label (AC3)
- **Auth:** `requireAuth` → `validateParams(labelParamsSchema)` → inline board-membership check (same pattern as PATCH).
- **Body schema:** none.
- **Response (`204`):** empty body.
- **Errors:** `401` / `403` / `404` — standard.
- **Side effects:** deletes one row from `labels`; `card_labels` rows referencing it cascade-delete (FK `onDelete: Cascade`). Cards themselves are untouched (AC3).

### `POST /api/cards/:cardId/labels`  — attach a label to a card (AC5)
- **Auth:** `requireAuth` → `validateParams(cardLabelParamsSchema)` → inline board-membership check: service loads the card with its list and board, returns 404 if missing, then `boardMember.findUnique`; 403 if not a member → `validate(attachLabelSchema)`.
- **Params schema:** `cardLabelParamsSchema`:
  ```ts
  z.object({ cardId: z.string().uuid() })
  ```
- **Body schema:** `attachLabelSchema`:
  ```ts
  z.object({ labelId: z.string().uuid() })
  ```
- **Request body:** `{ labelId: string }`.
- **Response (`200`):** `{ data: { cardId: string; labelId: string; createdAt: string } }`. **Idempotent**: re-attaching an already-attached label returns the existing row with `200` (not `201`, not `409`), per AC5. Implemented via Prisma `upsert` on the composite PK.
- **Errors:**
  - `400` — `labelId` not a UUID.
  - `400` — **cross-board attach**: label's `boardId` ≠ card's list's `boardId` → `createAppError('Label does not belong to this card\'s board', 400)` (AC8 + scope edge case "attaching a label to a card on a different board").
  - `401` / `403` — standard.
  - `404` — card not found, or label not found.
- **Side effects:** inserts (or no-ops) one row in `card_labels`. Idempotent.

### `DELETE /api/cards/:cardId/labels/:labelId`  — detach a label from a card (AC6)
- **Auth:** `requireAuth` → `validateParams(cardLabelDetachParamsSchema)` → inline board-membership check (same as attach).
- **Params schema:** `cardLabelDetachParamsSchema`:
  ```ts
  z.object({ cardId: z.string().uuid(), labelId: z.string().uuid() })
  ```
- **Body schema:** none.
- **Response (`204`):** empty body. **Idempotent**: detaching a label that is not attached returns `204` (the service uses `deleteMany` on the composite pair and does not treat `count === 0` as an error — matches AC6 "the label is no longer associated with that card").
- **Errors:** `401` / `403` / `404` (card not found) — standard.
- **Side effects:** deletes zero or one row from `card_labels`. Idempotent.

### Changes to existing read endpoints (hydration)

The client needs labels on every surface that already reads boards or cards. **No new endpoints** are added for reads; we extend the existing `getBoardById` and `getCardById` services to include labels. Response shapes are **additive** — existing fields are preserved, so Phase 1 does not break any current client.

- **`GET /api/boards/:id`** — `getBoardById` extended to include `labels: Label[]` on the board and `labels: Label[]` on every card (flattened from `CardLabel[]`). Response shape additions:
  ```ts
  type Board = {
    // ... existing
    labels?: Label[];                     // new
    lists?: (List & {
      cards?: (Card & { labels?: Label[] })[];  // new
    })[];
  };
  ```
  Implementation: `include: { labels: true, lists: { include: { cards: { include: { labels: { include: { label: true } } } } } } }`, then service maps `cardLabels[].label` → `card.labels` before returning.

- **`GET /api/cards/:id`** — `getCardById` extended with `labels: Label[]` (flattened same way). Used by `CardModal` which already calls this endpoint on open.

- **`GET /api/boards`** (list) — **unchanged**. The board list does not render labels, so no hydration needed. Scope only requires label visibility inside a board, not in the dashboard.

## Frontend Plan

### New Components

| Path | Responsibility | Props | testids | Stores consumed |
|------|----------------|-------|---------|-----------------|
| `src/client/components/Label/LabelChip/LabelChip.tsx` | Render a palette-colored pill; optional trailing `x` remove, optional `onClick` (filter pill usage), optional spinner overlay for in-flight detach. Pure presentational. | `{ label: { id: string; name: string; color: LabelColor }; variant?: 'solid' \| 'outline'; size?: 'sm' \| 'md'; onRemove?: () => void; onClick?: () => void; isPending?: boolean; testIdPrefix?: string }` | `card-label-chip-<labelId>` \| `card-modal-label-<labelId>` \| `card-modal-label-remove-<labelId>` \| `filter-label-toggle-<labelId>` (computed from `testIdPrefix`) | none |
| `src/client/components/Label/LabelSwatchGrid/LabelSwatchGrid.tsx` | Six-slot palette picker; `role="radiogroup"`; arrow-key navigation. | `{ selectedColor: LabelColor \| null; onSelect: (c: LabelColor) => void; disabled?: boolean; idPrefix: string }` | `label-swatch-create-<colorSlot>` \| `label-swatch-edit-<labelId>-<colorSlot>` (computed from `idPrefix`) | none |
| `src/client/components/Label/LabelManagerModal/LabelManagerModal.tsx` | Board-scoped CRUD modal hosting `LabelRow[]` + create form. | `{ boardId: string }` | `label-manager-modal`, `label-create-name`, `label-create-submit`, `label-create-cancel` | `useLabelsStore`, `useUiStore` |
| `src/client/components/Label/LabelRow/LabelRow.tsx` | One row inside the manager; three local states: view / edit / confirmDelete. | `{ label: Label; cardCount: number; onSave: (patch: { name?: string; color?: LabelColor }) => Promise<void>; onDelete: () => Promise<void> }` | `label-row-<labelId>`, `label-edit-<labelId>`, `label-delete-<labelId>`, `label-edit-name-<labelId>`, `label-edit-save-<labelId>`, `label-edit-cancel-<labelId>`, `label-delete-confirm-<labelId>`, `label-delete-cancel-<labelId>` | local state only |
| `src/client/components/Label/LabelPickerPopover/LabelPickerPopover.tsx` | Anchored popover for attach/detach inside `CardModal`; search + menuitemcheckbox rows + "Manage labels…" footer. | `{ cardId: string; boardId: string; attachedLabelIds: string[]; labels: Label[]; onAttach: (labelId: string) => Promise<void>; onDetach: (labelId: string) => Promise<void>; onClose: () => void; onOpenManager: () => void; anchorRef: React.RefObject<HTMLButtonElement> }` | `label-picker-popover`, `label-picker-search`, `label-picker-row-<labelId>`, `label-picker-manage` | `useUiStore` (toast on error) |
| `src/client/components/Label/LabelFilterBar/LabelFilterBar.tsx` | Board-level filter pill row + "Clear all" control. Renders null when the board has zero labels. | `{ boardId: string }` | `label-filter-bar`, `filter-label-toggle-<labelId>`, `clear-label-filter` | `useLabelsStore`, `useLabelFilterStore` |

All components are named-export `.tsx` files with a colocated `<Name>.module.css`.

### Modified Components

| Path | Change | testids added |
|------|--------|---------------|
| `src/client/components/Board/BoardHeader/BoardHeader.tsx` | Add a secondary "Manage labels" button (right side of header) that calls `useUiStore.openModal('labels:' + board.id)`. | `manage-labels-button` |
| `src/client/components/Board/BoardView/BoardView.tsx` | (a) Render `<LabelFilterBar boardId={boardId} />` between `BoardHeader` and the columns. (b) Before mapping lists, filter each list's `cards` by the active filter set from `useLabelFilterStore` (OR semantics: card kept if `card.labels` intersects the selection, or the selection is empty). Columns are always rendered; only cards are filtered (AC7 edge: empty-result columns stay visible). (c) Mount `<LabelManagerModal boardId={boardId} />` when `activeModal === 'labels:' + boardId`. | none added |
| `src/client/components/Card/CardItem/CardItem.tsx` | Render a chip strip above the title when `card.labels?.length > 0`. Show first 3 chips + `+N` overflow chip if `length > 3`. Chips use `LabelChip` `variant="solid"` `size="sm"`, no interactivity (they do not trap card clicks). | `card-label-strip`, `card-label-chip-<labelId>` (via `LabelChip`), `card-label-overflow` |
| `src/client/components/Card/CardModal/CardModal.tsx` | Add a "Labels" section between Title and Description: (a) row of attached chips (each with `onRemove` → `useLabelsStore.detach(cardId, labelId)`), (b) `+ Add label` button (anchor ref) that toggles `LabelPickerPopover`. After any attach/detach, `useLabelsStore` refetches the current board so chips update everywhere. | `card-modal-labels`, `card-modal-add-label` |

### Stores

- **New: `src/client/stores/labels.ts`** — `useLabelsStore`.
  - Shape:
    ```ts
    interface LabelsState {
      // keyed by boardId → label list
      byBoard: Record<string, Label[]>;
      isLoadingByBoard: Record<string, boolean>;
      errorByBoard: Record<string, string | null>;
      fetchLabels: (boardId: string) => Promise<void>;
      createLabel: (boardId: string, data: { name: string; color: LabelColor }) => Promise<Label>;
      updateLabel: (boardId: string, labelId: string, patch: { name?: string; color?: LabelColor }) => Promise<Label>;
      deleteLabel: (boardId: string, labelId: string) => Promise<void>;
      attachLabel: (cardId: string, labelId: string) => Promise<void>;
      detachLabel: (cardId: string, labelId: string) => Promise<void>;
    }
    ```
  - After any mutation, the store calls `useBoardsStore.getState().fetchBoard(boardId)` (same pattern as `useCardsStore`). This refreshes card-level label hydration so chips on cards, chips on the card modal, and filter pills all stay in sync.
  - Each mutation wraps in `try/catch`; on `Error`, the store dispatches `useUiStore.getState().addToast(message, 'error')` and rethrows so the calling component can surface inline state (e.g. `LabelRow` edit-mode duplicate error).

- **New: `src/client/stores/labelFilter.ts`** — `useLabelFilterStore`.
  - Shape:
    ```ts
    interface LabelFilterState {
      selectedByBoard: Record<string, string[]>;  // boardId → labelId[]
      toggle: (boardId: string, labelId: string) => void;
      clear: (boardId: string) => void;
      pruneDeleted: (boardId: string, existingLabelIds: string[]) => void;  // called by LabelFilterBar after labels fetch; drops stale ids (edge case)
    }
    ```
  - Purely client-side; never hits the server. Not persisted across reloads (scope says the filter is a view state).

- **Modified: `src/client/stores/boards.ts`** — no shape change; `fetchBoard` already returns the hydrated board, now enriched with `labels` on the board and on each card via the extended service. The `Board` and `Card` TypeScript types get optional `labels?: Label[]`.

### API Client Wrappers

- **New: `src/client/api/labels.ts`**
  ```ts
  fetchBoardLabelsApi(boardId: string): Promise<ApiResponse<Label[]>>                 // GET /api/boards/:boardId/labels
  createLabelApi(boardId: string, data: { name: string; color: LabelColor }): Promise<ApiResponse<Label>>  // POST /api/boards/:boardId/labels
  updateLabelApi(labelId: string, patch: { name?: string; color?: LabelColor }): Promise<ApiResponse<Label>>  // PATCH /api/labels/:id
  deleteLabelApi(labelId: string): Promise<ApiResponse<void>>                          // DELETE /api/labels/:id
  attachLabelApi(cardId: string, labelId: string): Promise<ApiResponse<CardLabel>>     // POST /api/cards/:cardId/labels
  detachLabelApi(cardId: string, labelId: string): Promise<ApiResponse<void>>          // DELETE /api/cards/:cardId/labels/:labelId
  ```
  All go through `apiClient` (never `fetch` directly).

### New Type Files

- **New: `src/client/types/label.ts`**:
  ```ts
  export const LABEL_COLORS = ['red','amber','green','blue','purple','slate'] as const;
  export type LabelColor = typeof LABEL_COLORS[number];
  export interface Label {
    id: string;
    boardId: string;
    name: string;
    color: LabelColor;
    createdAt: string;
    updatedAt: string;
  }
  ```
- **Modified: `src/client/types/card.ts`** — add `labels?: Label[]` to `Card`.
- **Modified: `src/client/types/board.ts`** — add `labels?: Label[]` to `Board`.
- **Modified: `src/client/types/index.ts`** — re-export `Label`, `LabelColor`, `LABEL_COLORS`.

### Routes (if any)

None. The feature is fully accessible from the existing `/boards/:boardId` route via the manager modal and card modal.

### Design Tokens

**New in `src/client/styles/tokens.css`** (per `design.md`'s palette table; palette tokens + paired ink/on tokens exactly as specified):

```css
/* Label palette — six slots. Each slot ships as {slot, slot-on, slot-ink}. */
--color-label-red:        #dc2626;
--color-label-red-on:     var(--color-text-inverse);
--color-label-red-ink:    #991b1b;

--color-label-amber:      #f59e0b;
--color-label-amber-on:   var(--color-text);
--color-label-amber-ink:  #92400e;

--color-label-green:      #16a34a;
--color-label-green-on:   var(--color-text);           /* white-on-green below 4.5:1; use dark ink */
--color-label-green-ink:  #166534;

--color-label-blue:       #2563eb;
--color-label-blue-on:    var(--color-text-inverse);
--color-label-blue-ink:   #1e40af;

--color-label-purple:     #7c3aed;
--color-label-purple-on:  var(--color-text-inverse);
--color-label-purple-ink: #5b21b6;

--color-label-slate:      #475569;
--color-label-slate-on:   var(--color-text-inverse);
--color-label-slate-ink:  #334155;
```

`LabelChip.module.css` uses `--color-label-<slot>` / `--color-label-<slot>-on` / `--color-label-<slot>-ink` interpolated from a `data-color` attribute on the chip root (`[data-color="red"] { background: var(--color-label-red); color: var(--color-label-red-on); }`, …). This keeps the chip CSS data-driven without TS conditionals, per `design.md`. No new spacing, radius, typography, or shadow tokens are required.

## Phases

### Phase 1 — Backend (ships independently)

The backend is additive: every new endpoint is on a new path, and the extensions to `GET /api/boards/:id` and `GET /api/cards/:id` add optional fields only (`labels`, nested `card.labels`). No existing client break.

- [ ] Edit `prisma/schema.prisma`: add `Label` and `CardLabel` models, add relation fields on `Board` and `Card`. (Exact diff above.)
- [ ] Run `npm run db:migrate -- --name add_card_labels`.
- [ ] Create `src/server/schemas/label.schema.ts` — exports `LABEL_COLORS`, `createLabelSchema`, `updateLabelSchema`, `attachLabelSchema`, `labelParamsSchema`, `labelBoardParamsSchema`, `cardLabelParamsSchema`, `cardLabelDetachParamsSchema`.
- [ ] Create `src/server/services/label.service.ts`:
  - `listBoardLabels(boardId)` — `prisma.label.findMany` ordered by `createdAt asc`.
  - `createLabel(boardId, { name, color })` — normalized duplicate-name check, then insert. Catches Prisma P2002 → `createAppError(..., 400)`.
  - `updateLabel(labelId, patch)` — loads label (404 if missing), normalized duplicate-name check if `patch.name`, update. Returns `{ label, boardId }` so the route can skip a second `findUnique`.
  - `deleteLabel(labelId)` — `prisma.label.delete` (cascades `card_labels`).
  - `attachLabelToCard(cardId, labelId)` — loads card (with `list: { select: { boardId: true } }`), loads label, cross-board check, then `upsert` on composite PK. Returns the row.
  - `detachLabelFromCard(cardId, labelId)` — `prisma.cardLabel.deleteMany({ where: { cardId, labelId } })`. Idempotent (returns `{ count }` which the route ignores).
  - `getCardWithBoard(cardId)` and `getLabelWithBoard(labelId)` — small helpers used by the route's inline access check, analogous to `getCardById` in `card.service.ts`.
  - `countCardsForLabel(labelId)` — `prisma.cardLabel.count({ where: { labelId } })` — used by the client (`LabelRow` delete-confirm) **and** not yet exposed; keep the helper for Phase 2 integration.
- [ ] Extend `src/server/services/board.service.ts` `getBoardById` include tree to hydrate `labels` on the board and on every card (map `cardLabels[].label` → `card.labels` in the service before returning).
- [ ] Extend `src/server/services/card.service.ts` `getCardById` similarly (hydrate `card.labels`).
- [ ] Create `src/server/routes/labels.ts` — mounts:
  - `GET  /:boardId/labels` (mounted under `/api/boards`)
  - `POST /:boardId/labels` (mounted under `/api/boards`)
  - `PATCH /labels/:id` (mounted under `/api`)
  - `DELETE /labels/:id` (mounted under `/api`)
  - `POST /cards/:cardId/labels` (mounted under `/api`)
  - `DELETE /cards/:cardId/labels/:labelId` (mounted under `/api`)
  Follow the `lists.ts` pattern: board-scoped routes use `requireBoardMember('boardId')` middleware; resource-scoped routes (`labels/:id`, `cards/:cardId/labels`) do the inline load-and-check pattern from `routes/cards.ts`. Export `export { router as labelsRouter }`.
- [ ] Mount router in `src/server/index.ts`:
  ```ts
  import { labelsRouter } from './routes/labels';
  app.use('/api/boards', labelsRouter);  // matches /:boardId/labels
  app.use('/api', labelsRouter);          // matches /labels/:id and /cards/:cardId/labels
  ```
- [ ] **Phase 1 tests** (see Test Strategy for AC mapping):
  - `tests/unit/services/label.service.test.ts` — services with mocked Prisma, covering list / create / update / delete / attach / detach, duplicate-name rejection, cross-board attach rejection, idempotent attach, idempotent detach.
  - `tests/unit/middleware/label-route-access.test.ts` — smoke test of the inline access pattern used in the label/card-label routes (copy the shape from `tests/unit/middleware/auth.test.ts`).
- [ ] Exit gate: `npm run typecheck && npm run lint && npm test` all green. Phase 1 is deployable and manually verifiable via `curl` against `:3001`.

### Phase 2 — Frontend wiring (depends on Phase 1)

Client CRUD for labels + attach/detach surfaces. Filter bar is deferred to Phase 3.

- [ ] Create `src/client/types/label.ts`; extend `src/client/types/card.ts` and `board.ts`; re-export from `index.ts`.
- [ ] Create `src/client/api/labels.ts` with the six wrappers listed above.
- [ ] Create `src/client/stores/labels.ts` (`useLabelsStore`) per the shape above. Every mutation calls `useBoardsStore.getState().fetchBoard(boardId)` after success; every failure surfaces via `useUiStore.addToast` and rethrows.
- [ ] Add the palette tokens block to `src/client/styles/tokens.css`.
- [ ] Create `src/client/components/Label/LabelChip/{LabelChip.tsx,LabelChip.module.css}`.
- [ ] Create `src/client/components/Label/LabelSwatchGrid/{LabelSwatchGrid.tsx,LabelSwatchGrid.module.css}`.
- [ ] Create `src/client/components/Label/LabelRow/{LabelRow.tsx,LabelRow.module.css}`.
- [ ] Create `src/client/components/Label/LabelManagerModal/{LabelManagerModal.tsx,LabelManagerModal.module.css}`.
- [ ] Create `src/client/components/Label/LabelPickerPopover/{LabelPickerPopover.tsx,LabelPickerPopover.module.css}`.
- [ ] Modify `src/client/components/Board/BoardHeader/BoardHeader.tsx` — add "Manage labels" button wired to `openModal('labels:' + board.id)`.
- [ ] Modify `src/client/components/Board/BoardView/BoardView.tsx` — mount `<LabelManagerModal boardId={boardId} />` when `activeModal === 'labels:' + boardId`. (Filter-bar mount is added in Phase 3.)
- [ ] Modify `src/client/components/Card/CardItem/CardItem.tsx` — render chip strip + overflow chip using `LabelChip`.
- [ ] Modify `src/client/components/Card/CardModal/CardModal.tsx` — add Labels section with attached chips + `+ Add label` trigger + popover toggle.
- [ ] **Phase 2 tests:**
  - `tests/unit/stores/labels.test.ts` — Zustand store unit tests with mocked `api/labels.ts` module; covers every action's success + error path and the post-mutation `fetchBoard` call.
  - `tests/unit/components/LabelChip.test.tsx` — variants, remove callback, overflow rendering when used inside a strip.
  - `tests/unit/components/LabelManagerModal.test.tsx` — render create form + rows; duplicate-name inline error path; uses `renderWithRouter` from `tests/test-utils.tsx`.
  - `tests/unit/components/LabelPickerPopover.test.tsx` — check toggle, search filter, Escape-to-close.
- [ ] Exit gate: `npm run typecheck && npm run lint && npm test` all green. A manual smoke via `npm run dev` should demonstrate create/edit/delete/attach/detach end-to-end with labels visible on cards.

### Phase 3 — Polish, filter bar, and E2E (depends on Phase 2)

- [ ] Create `src/client/stores/labelFilter.ts` (`useLabelFilterStore`).
- [ ] Create `src/client/components/Label/LabelFilterBar/{LabelFilterBar.tsx,LabelFilterBar.module.css}`.
- [ ] Wire `<LabelFilterBar boardId={boardId} />` into `src/client/components/Board/BoardView/BoardView.tsx` **between** `BoardHeader` and the columns. Apply the OR-semantic filter to each list's `cards` in the map step before passing into `<ColumnView>` (architect choice: filter at the `BoardView` level so `ColumnView` and `CardItem` stay ignorant of filter state).
- [ ] Implement every state called out in `design.md`:
  - Empty board label list (manager modal empty state copy).
  - Loading states: manager `<Spinner size="lg" />`, filter bar skeleton pills, picker per-row spinner during attach/detach, chip muted-state during in-flight detach in `CardModal`.
  - Error states: duplicate-name inline error via the shared `Input` `error` prop; toast for generic failures; attach/detach error reverts checkbox state in the picker.
  - Disabled states: Create button disabled while name blank or no color selected; Save disabled while unchanged or name blank.
  - Filter-bar edge: `pruneDeleted` runs after each labels fetch; if the selection becomes empty, "Clear all" hides.
- [ ] Accessibility:
  - Focus trap on `LabelManagerModal` inherited from shared `Modal`; return focus to `manage-labels-button` on close.
  - `LabelPickerPopover`: `role="dialog" aria-modal="false" aria-label="Attach labels"`; Escape closes and returns focus to `card-modal-add-label` anchor; outside-click closes.
  - `LabelSwatchGrid`: `role="radiogroup"`, each swatch `role="radio"` with `aria-checked` and `aria-label` per slot (Red/Amber/Green/Blue/Purple/Slate). Arrow keys navigate.
  - `LabelChip`: wrapper `aria-label="<name> label"`; overflow chip `aria-label="N more labels"`.
  - `LabelFilterBar` wrapper `role="toolbar" aria-label="Filter by label"`; each pill `<button aria-pressed="true|false">`.
  - Card-modal chip `x`: real `<button>`; Enter/Space activates.
- [ ] E2E Playwright spec: `tests/e2e/card-labels.spec.ts` covering the full user story end-to-end against the seeded `demo@example.com` user. Flow outlined in the Test Strategy below.
- [ ] Manual smoke: `npm run dev`, walk through the flow described in `design.md` (land → create label → attach to two cards → filter → edit label → delete label).
- [ ] Exit gate: `npm run test:e2e` green + `npm run typecheck && npm run lint && npm test` still green.

## Technical Decisions

1. **Join table vs. array column.** Chose a dedicated `CardLabel` join table (composite PK `(card_id, label_id)`) over a `String[]` column on `Card`. Trade-off: the join adds one table but gives us cascade deletion from both sides, constant-time idempotent upsert, and proper indexing for "count cards by label" (needed by the delete-confirm UI) and "filter cards by label set" (future server-side path if Phase 3 perf becomes an issue). An array column would force an `updateMany` + `array_contains` query path with no index support and no cascade from label deletion.

2. **Color slot name vs. hex on the wire.** Chose to store the slot name (`'red'|'amber'|…`) in `labels.color` as a `String`, enforced via Zod `z.enum(LABEL_COLORS)`. Trade-off: less flexible than hex, but matches the fixed-palette scope ("user-defined custom hex colors" is explicitly out of scope), lets the CSS drive all visual decisions via tokens, and keeps theming possible without a DB migration. The design-token palette is the single source of truth for what "red" looks like.

3. **Access-check placement.** Board-scoped routes (`:boardId/labels`) use `requireBoardMember('boardId')` middleware — same pattern as `routes/lists.ts`. Resource-scoped routes (`/labels/:id`, `/cards/:cardId/labels[/...]`) use the inline load-and-check pattern from `routes/cards.ts` because the `boardId` isn't in the URL and requires a prior DB lookup. This is consistent with the existing codebase and avoids introducing a third access-check style.

4. **Idempotent attach/detach.** Attach uses `prisma.cardLabel.upsert` returning 200 (not 201) so a double-click never races into a 409. Detach uses `deleteMany` so a stale client request never 404s. This matches AC5 ("attaching a label already on the card is a no-op") and AC6 and keeps the picker UI simple — it doesn't need to track per-row attach pending vs. "already attached". Trade-off: 200 on create is slightly non-RESTful, but matches user expectation and the scope wording.

5. **Hydration on the existing board read.** Labels are included in the existing `GET /api/boards/:id` response rather than introducing a `GET /api/boards/:boardId/cards?withLabels=true` endpoint. Trade-off: the board fetch payload grows by roughly `O(labels × avg attachments per card)` bytes; for the expected MVP scale (≤ ~20 labels × ≤ ~200 cards × ≤ ~3 labels per card) this is negligible vs. the round-trip cost of a second endpoint. Keeps the client-side store pattern (refetch board after mutation) unchanged.

6. **Index choices.**
   - `uniq_label_board_name` (case-sensitive at DB layer) serves the duplicate-name 400 path as a last-resort guard and the `ON CONFLICT` catch in the service. Cost: 1 B-tree. The service still normalizes to lowercase before pre-checking so the **case-insensitive** scope rule is honored at application level.
   - `idx_label_board` serves `listBoardLabels` and the `include: { labels: true }` in `getBoardById`. Cost: 1 B-tree; standard.
   - `idx_card_label_label` serves `countCardsForLabel(labelId)` (delete-confirm UI) and future "filter cards by label" if pushed server-side. Cost: 1 B-tree; light.
   - Composite PK on `card_labels` doubles as the `(cardId, labelId)` lookup index used by `upsert` — no separate index needed.

7. **Client filter = client-side only, not server-pushed.** Filtering stays in `BoardView` against already-hydrated labels per AC7 ("filter is a client-side view state and does not mutate any data"). This avoids a new endpoint, avoids cache invalidation complexity, and keeps the UI instantaneous. The filter store is not persisted across navigations/reloads. Trade-off: for very large boards (~1000 cards, many labels) the client-side filter may become a scroll-perf concern. That is out of scope for this release; the index on `card_labels(label_id)` leaves a server-side filter as a cheap future extension.

8. **`{ data: T }` envelope preserved.** Every new endpoint returns `{ data: <declared type> }`. `DELETE` endpoints return `204` with no body, matching the existing pattern (`apiClient.delete` already handles `204` → `{ data: undefined }`). No deviation required.

9. **Phase boundary rationale.** Phase 1 is deployable alone because all schema changes are additive (new tables only), all new endpoints are on new paths, and the modifications to existing read endpoints only *add* fields to the response. Existing clients that don't know about `labels` will simply ignore the new field. If Phases 2/3 slip, the backend is exercisable via `curl` or Postman, all unit tests still cover it, and no partial UI is shipped. If Phase 3 slips after Phase 2 lands, users get label CRUD and attach/detach but no filter — still demoable and useful, and no broken affordance (filter bar simply isn't mounted yet).

10. **"Manage labels" is a member action, not admin-only.** Per AC1 and AC scope ("Any board `member`"), creating/renaming/deleting labels uses `requireBoardMember`, not `requireBoardAdmin`. This is a deliberate deviation from the board CRUD routes (where mutations are admin-only). Documented here so the reviewer doesn't flag it as an oversight.

## Test Strategy

### Unit tests

| Path | Layer | Assertion | AC |
|------|-------|-----------|----|
| `tests/unit/services/label.service.test.ts` | service | `listBoardLabels` calls Prisma with `findMany` ordered by `createdAt asc`. | 1 |
| `tests/unit/services/label.service.test.ts` | service | `createLabel` inserts a label; returns the row. | 1 |
| `tests/unit/services/label.service.test.ts` | service | `createLabel` throws `AppError(400)` when a case-insensitive name conflict is detected. | 1 (edge) |
| `tests/unit/services/label.service.test.ts` | service | `updateLabel` updates name/color without touching `card_labels` rows. | 2 |
| `tests/unit/services/label.service.test.ts` | service | `updateLabel` throws `AppError(400)` on case-insensitive rename conflict (excluding the current row). | 2 (edge) |
| `tests/unit/services/label.service.test.ts` | service | `deleteLabel` calls `prisma.label.delete` (FK cascades detach). | 3 |
| `tests/unit/services/label.service.test.ts` | service | `attachLabelToCard` upserts on composite PK; second call is a no-op with same row. | 5 |
| `tests/unit/services/label.service.test.ts` | service | `attachLabelToCard` throws `AppError(400)` when label's `boardId` ≠ card's board. | 8 |
| `tests/unit/services/label.service.test.ts` | service | `attachLabelToCard` throws `AppError(404)` when card or label is missing. | 8 (edge) |
| `tests/unit/services/label.service.test.ts` | service | `detachLabelFromCard` deletes when present; silent success (no throw) when absent. | 6 |
| `tests/unit/services/label.service.test.ts` | service | `countCardsForLabel` returns count from `prisma.cardLabel.count`. | 3 (delete-confirm copy) |
| `tests/unit/services/board.service.test.ts` (extended) | service | `getBoardById` hydrates `labels` on the board and on each card. | 1,5,8 |
| `tests/unit/services/card.service.test.ts` (new) | service | `getCardById` hydrates `card.labels`. | 5,6 |
| `tests/unit/middleware/label-route-access.test.ts` | middleware-ish | Non-member receives 403 from the inline access check in `routes/labels.ts`. | 4 (backend-only) |
| `tests/unit/stores/labels.test.ts` | store | Each action calls the matching `api/labels.ts` wrapper and, on success, calls `useBoardsStore.fetchBoard(boardId)`. | 1,2,3,5,6 |
| `tests/unit/stores/labels.test.ts` | store | `createLabel` surfaces the server 400 message via `useUiStore.addToast` and rethrows. | 1 (edge) |
| `tests/unit/components/LabelChip.test.tsx` | component | Renders `solid` and `outline` variants; fires `onRemove` when `x` clicked; shows overflow behavior when used in a strip. | 5 |
| `tests/unit/components/LabelManagerModal.test.tsx` | component | Renders empty state when no labels; renders rows per label; Create submits and clears the form on success; duplicate-name error from API is shown inline under `label-create-name`. | 1,2,3 |
| `tests/unit/components/LabelPickerPopover.test.tsx` | component | Toggling a row calls `onAttach`/`onDetach`; search input filters rows locally; Escape triggers `onClose`. | 5,6 |
| `tests/unit/components/LabelFilterBar.test.tsx` | component | Returns null when board has zero labels; toggling a pill updates `useLabelFilterStore`; "Clear all" resets the store; stale ids are pruned. | 7, 7 (edge) |

Services mock Prisma at module boundary with `vi.mock('../../../src/server/prisma', () => ({ prisma: { ... } }))` following `tests/unit/services/board.service.test.ts`. Components mock their own CSS module (`vi.mock('../../../src/client/components/Label/.../X.module.css', () => ({ default: { ... } }))`). Stores mock the matching `api/labels.ts` module.

### E2E tests

| Spec | Flow | `data-testid` selectors | ACs covered |
|------|------|-------------------------|-------------|
| `tests/e2e/card-labels.spec.ts` | 1. Login as `demo@example.com` / `demo123`. 2. Open the first seeded board. 3. Click `manage-labels-button` → modal opens. 4. Fill `label-create-name="Bug"`, click `label-swatch-create-red`, click `label-create-submit` → row `label-row-<id>` appears. 5. Repeat to create `Urgent` (amber). 6. Close manager. 7. Click first `card-item` → `CardModal` opens. 8. Click `card-modal-add-label` → popover opens (`label-picker-popover`). 9. Click two rows (`label-picker-row-<id>` for Bug + Urgent) → both attached; close popover. 10. Save-and-close modal; back on board `card-label-strip` shows two chips on that card. 11. Click `filter-label-toggle-<bugId>` → only cards with Bug remain. 12. Click `clear-label-filter` → all cards return. 13. Reopen manager, click `label-edit-<bugId>`, change name to "Defect", `label-edit-save-<bugId>` → chip on card now reads "Defect". 14. `label-delete-<defectId>` → `label-delete-confirm-<defectId>` → chip disappears from card and pill disappears from filter bar. | `manage-labels-button`, `label-manager-modal`, `label-create-name`, `label-create-submit`, `label-swatch-create-red`, `label-swatch-create-amber`, `label-row-<id>`, `label-edit-<id>`, `label-edit-name-<id>`, `label-edit-save-<id>`, `label-delete-<id>`, `label-delete-confirm-<id>`, `card-item`, `card-modal-add-label`, `label-picker-popover`, `label-picker-row-<id>`, `card-modal-label-<id>`, `card-label-strip`, `card-label-chip-<id>`, `label-filter-bar`, `filter-label-toggle-<id>`, `clear-label-filter` | 1, 2, 3, 5, 6, 7, 8 |

**AC 4 is backend-only** — no E2E cell by design. It is covered exclusively by `tests/unit/middleware/label-route-access.test.ts` and is transitively enforced in E2E by the fact that the entire label UI sits behind a membership-gated board read.

## Risks / Open Questions

1. **Concurrency on label deletion while attached.** Two members could simultaneously delete a label and attach it to a card. With FK `onDelete: Cascade`, the attach that commits after the delete would fail with a FK violation (P2003) and the service would surface `createAppError('Label not found', 404)`. The Phase-2 error toast is sufficient; no explicit locking needed. Documented so the reviewer doesn't flag P2003 handling as missing — it rides through as a generic `AppError`.

2. **Filter performance on large boards.** Client-side OR filter is `O(cards × attached labels)` per render. For the MVP scale this is negligible. If a later deployment pushes card counts above ~1000 with ~5+ labels per card, move the filter server-side by adding `GET /api/boards/:boardId/cards?labelIds=<csv>` backed by `idx_card_label_label`. No schema changes required for that future path.

3. **Label ordering on a card.** Attachment order is preserved via `CardLabel.createdAt asc` — labels on a card appear in the order they were attached. This matches "Labels display in creation order; manual reorder is out of scope" (scope). The overflow `+N` chip therefore hides the *most recently attached* labels when count > 3. If user feedback prefers alphabetical, flip the `orderBy` in `getCardById`/`getBoardById` hydration without a schema change.

4. **Case-sensitive DB unique vs. case-insensitive scope rule.** The unique index is case-sensitive; the scope's duplicate-name rule is case-insensitive. Resolution: service normalizes (`name.trim().toLowerCase()`) before inserting and before the pre-check; the DB unique is defense-in-depth only. Alternative considered: add a generated column `name_lower` with a unique index. Rejected as over-engineering for an MVP with a single-process write path.

5. **Stale filter after another member deletes a label.** `useLabelFilterStore.pruneDeleted` runs after every labels fetch, so stale ids drop silently on the next board load — matching the scope edge case. There is a narrow window between another user's delete and the next fetch where the local filter still references the deleted id; during that window the filter matches no cards (`labels` on each card won't contain a deleted id), so the user sees an empty board. This is acceptable behavior; no further mitigation needed.

6. **Seed data.** `prisma/seed.ts` isn't updated by this feature — the demo user starts with zero labels. The E2E spec creates labels as part of the flow. If the reviewer wants pre-seeded labels for dev ergonomics, add two rows to `seed.ts` in Phase 3 (out of current scope).
