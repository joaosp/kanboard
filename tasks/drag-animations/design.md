# Design: Drag-and-Drop with Animations for Cards

## Screens Affected
- **Modified:** `BoardView` — wraps the columns region in a single `DndContext` and renders a `DragOverlay` portal for the lifted preview.
- **Modified:** `ColumnView` — its cards list becomes a `SortableContext` (vertical strategy) and also registers as a droppable for empty-list drops.
- **Modified:** `CardItem` — becomes a sortable node via `useSortable`; gains a "ghost" visual while its own position is occupied by the dragged card.
- **New:** `DragCardPreview` (`components/Card/DragCardPreview`) — pure presentational clone of `CardItem` used only inside `DragOverlay`. No click handler, no store subscription.

## User Flow
1. Member hovers a card. Resting shadow already applied (AC 8 — no regression).
2. Member presses the pointer on the card. After 6px activation distance, drag begins: source card enters "ghost" state, `DragCardPreview` appears at cursor with lift (AC 1, 2).
3. As the pointer moves, `SortableContext` reorders sibling `CardItem`s with a 200ms translate animation; a dashed placeholder slot marks the target slot (AC 3).
4. Moving over another column's cards list (or its empty region) animates insertion into that column's `SortableContext` (AC 2, and empty-column case in AC 3).
5. Member releases: overlay snaps to the target slot with a short drop transition; cards store optimistically commits, then `PATCH /api/cards/:id` persists `position` and (if changed) `listId` (AC 1, 2, 6).
6. If member presses `Escape` mid-drag, the overlay fades out and cards restore prior order; no network call (AC 4).
7. Keyboard path: `Tab` to card → `Space` picks up (announced) → Arrow keys move → `Space` drops (announced) / `Escape` cancels (AC 5).
8. Non-drag interactions are untouched: a pointer press that releases under 6px of movement is treated as a click and opens the modal (AC 8).

## Wireframes

### BoardView — Before
```
+---------------------------------------------------------------+
| BoardHeader                                                   |
| LabelFilterBar                                                |
| +----------+  +----------+  +----------+                      |
| | Column A |  | Column B |  | Column C |  [ + Add List ]      |
| | [card]   |  | [card]   |  | (empty)  |                      |
| | [card]   |  | [card]   |  |          |                      |
| | + add    |  | + add    |  | + add    |                      |
| +----------+  +----------+  +----------+                      |
+---------------------------------------------------------------+
```

### BoardView — After (mid-drag: card from A dragged toward B position 1)
```
+---------------------------------------------------------------+
| BoardHeader                                                   |
| LabelFilterBar                                                |
| +----------+  +----------+  +----------+                      |
| | Column A |  | Column B |  | Column C |                      |
| | [card]   |  | [card-1] |  | (empty)  |                      |
| | (ghost)  |  | ~~~~~~~~ |  |          |   <-- dashed         |
| | [card]   |  | [card-2] |  |          |       placeholder    |
| | + add    |  | + add    |  | + add    |       in Column B    |
| +----------+  +----------+  +----------+                      |
|                                                               |
|            [ lifted DragCardPreview near cursor ]             |
|            tilt -2deg, scale 1.03, shadow-drag                |
+---------------------------------------------------------------+
```

### ColumnView — Empty state, pointer hovering
```
+----------------+              +----------------+
| Column C       |              | Column C       |
| (no cards)     |   dragging   | ~~~~~~~~~~~~~~ |  <-- full-width
|                |    over ->   | ~~~~~~~~~~~~~~ |      dashed drop
|                |              | ~~~~~~~~~~~~~~ |      target
| + Add card     |              | + Add card     |
+----------------+              +----------------+
```

## Component Inventory

### Reused
- `CardItem` (`components/Card/CardItem`) — becomes sortable; click-to-open behaviour preserved.
- `ColumnView` (`components/Column/ColumnView`) — wraps card list with `SortableContext`; registers its cards region as a droppable.
- `BoardView` (`components/Board/BoardView`) — owns the single `DndContext`, sensors, and `DragOverlay`.
- `LabelChip` — rendered inside `DragCardPreview` unchanged.

### New
- `DragCardPreview` (`components/Card/DragCardPreview/{DragCardPreview.tsx, .module.css}`) — `{ card: Card }`. Renders a non-interactive clone of `CardItem` for `DragOverlay`. Applies lift styles (scale, rotate, shadow-drag).
- `CardDropPlaceholder` (`components/Card/CardDropPlaceholder/{…}`) — optional; a dashed-border block occupying the height of the lifted card. If `@dnd-kit` sortable strategy already animates siblings into the gap, this is only used for the empty-column case. (Architect decides whether to extract or inline in `ColumnView.module.css`.)

## States

### CardItem (sortable node)
- **Default:** surface bg, 1px border, `--shadow-sm` on hover. Unchanged from today.
- **Hover/Focus:** existing hover shadow; focus adds a 2px `--color-primary` outline for keyboard (`:focus-visible`).
- **Picking up (first 80ms after activation):** scale 1 → 1.03, rotate 0 → -2deg, shadow → `--shadow-drag`. Transition via `--transition-normal`.
- **Dragging (source node, while overlay is airborne):** opacity 0.4, desaturated, no shadow. Acts as ghost/placeholder so the sibling shift reads correctly.
- **Dropping:** overlay animates from cursor to the target rect (`@dnd-kit` default drop animation, duration matches `--transition-normal`). Source node's ghost opacity fades back to 1.
- **Cancelled (Escape):** overlay fades out in 120ms; no reorder; source opacity restored.
- **Disabled:** not applicable to cards (membership is enforced at the board level; a non-member can't reach this screen).

### ColumnView cards list (droppable container)
- **Default:** no visible chrome.
- **Hover (during drag, non-empty):** siblings translate open a gap; no container-level highlight.
- **Hover (during drag, empty list):** full-area dashed drop zone appears, `--radius-md`, `--color-primary` border, `--color-primary-light` bg at ~50% (see tokens section — may need `--color-primary-light` only).
- **Loading:** N/A (board already renders).
- **Error (drop rejected):** cards snap back; a toast is shown via `useUiStore`.

### DragCardPreview (overlay)
- **Default:** only rendered while `active` is set. scale 1.03, rotate -2deg, `--shadow-drag`, `cursor: grabbing`.
- **Drop animation:** translate + rotate → 0 with `--transition-normal`.

### CardDropPlaceholder
- **Default:** dashed 2px `--color-primary` border, transparent background, `--radius-md`, height equal to the dragged card (driven by `@dnd-kit` measurements).

## Accessibility
- **Keyboard:** `Tab` through cards in DOM order (column-by-column, top-down). `Space` activates/drops. Arrow keys move within and across lists. `Escape` cancels.
- **Focus:** Focus stays on the originating card node throughout the lift; on drop it re-binds to the now-moved card (`@dnd-kit` keyboard sensor default).
- **ARIA:** `DndContext` receives an `accessibility.announcements` map:
  - `onDragStart`: "Picked up card {title}."
  - `onDragOver`: "Card {title} is over position {n} in {list}."
  - `onDragEnd`: "Card {title} dropped in {list} at position {n}."
  - `onDragCancel`: "Dropping cancelled. Card {title} returned to original position."
  - Announcements render into the library's default `aria-live="assertive"` region.
- **Focus ring:** card adds `outline: 2px solid var(--color-primary); outline-offset: 2px;` on `:focus-visible` so keyboard users see the handle.
- **Contrast:** placeholder border `--color-primary` on `--color-background` = 4.5:1+. All other colors are existing token pairs already validated in `design-system.md`.

## Design Tokens Used
- `var(--color-surface)` — DragCardPreview background.
- `var(--color-border)` — preview border.
- `var(--color-primary)` — focus ring; drop-zone dashed border for empty columns.
- `var(--color-primary-light)` — empty-column drop-zone tint.
- `var(--radius-md)` — preview + placeholder corners (matches `CardItem`).
- `var(--space-2)` / `var(--space-3)` — placeholder inner padding to match card height.
- `var(--transition-normal)` — pickup and drop transitions.
- `var(--transition-fast)` — ghost opacity fade.
- `var(--shadow-sm)` — existing hover.
- `--shadow-drag` *(new)* — lifted preview.
- `--rotation-drag` *(new)* — pickup tilt.
- `--scale-drag` *(new)* — pickup scale.
- `--z-drag-overlay` *(new)* — stacks above toasts (200) and below nothing; safe floor is 300.

### New Tokens Needed
- `--shadow-drag: 0 20px 25px -5px rgb(0 0 0 / 0.2), 0 10px 10px -5px rgb(0 0 0 / 0.1)` — deeper lift than `--shadow-lg`.
- `--rotation-drag: -2deg` — subtle tilt so static CSS doesn't hardcode a magic number.
- `--scale-drag: 1.03` — pickup scale factor.
- `--z-drag-overlay: 300` — slot above `Toast` (200), document in `design-system.md` Z-Index table.
- (Optional) `--opacity-ghost: 0.4` for the source card during drag, if we want the value reusable elsewhere. Architect may inline it in the module.

## data-testid Map
| Element                                         | testid                              |
| ----------------------------------------------- | ----------------------------------- |
| BoardView drag context root                     | `board-dnd-context`                 |
| Column as droppable (cards region)              | `column-droppable-{listId}`         |
| Empty-column drop target                        | `column-empty-drop-{listId}`        |
| Card sortable node (source)                     | `card-draggable-{cardId}`           |
| Existing card click target (unchanged)          | `card-item` (kept for back-compat)  |
| Drop placeholder slot within a column           | `card-drop-placeholder-{listId}`    |
| Lifted preview rendered in DragOverlay          | `drag-overlay`                      |
| Preview inner card                              | `drag-overlay-card-{cardId}`        |

> Note: `card-item` is the existing testid on `CardItem`'s root. The new `card-draggable-{id}` is added to the same element alongside it so E2E can target a specific card without breaking `smoke.spec.ts`.

## Component Tree Delta (JSX skeleton)
```
// BoardView.tsx
<DndContext sensors={[PointerSensor, KeyboardSensor]}
            collisionDetection={closestCorners}
            onDragStart={...} onDragOver={...}
            onDragEnd={...} onDragCancel={...}
            accessibility={{ announcements }}
            data-testid="board-dnd-context">
  <BoardHeader />
  <LabelFilterBar />
  <div className={styles.columns}>
    {filteredLists.map(list => <ColumnView key={list.id} list={list} />)}
    <form>...add list...</form>
  </div>
  <DragOverlay dropAnimation={{ duration: 200 }}>
    {activeCard ? <DragCardPreview card={activeCard} /> : null}
  </DragOverlay>
</DndContext>

// ColumnView.tsx
<div className={styles.column} data-testid="column">
  <ColumnHeader list={list} />
  <SortableContext items={sortedCards.map(c => c.id)} strategy={verticalListSortingStrategy}>
    <div className={styles.cards}
         data-testid={`column-droppable-${list.id}`}>
      {sortedCards.length === 0 && <EmptyDropZone listId={list.id} />}
      {sortedCards.map(card => <CardItem key={card.id} card={card} />)}
    </div>
  </SortableContext>
  <AddCardForm listId={list.id} />
</div>

// CardItem.tsx
const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
<div ref={setNodeRef} {...attributes} {...listeners}
     className={clsx(styles.card, isDragging && styles.cardGhost)}
     data-testid="card-item"
     data-draggable-id={`card-draggable-${card.id}`}
     onClick={openModal}> ... </div>
```

## Anti-patterns to Avoid
- No `style={{ transform: ... }}` inline — translate/rotate/scale are applied via CSS variables set on the element through `style` only for `@dnd-kit`-provided `transform` and `transition` values (this is the library contract; any static values live in the module).
- No hardcoded colors, shadows, rotation, or z-index — everything goes through tokens (new ones listed above).
- No `any` on drag handlers: import `DragStartEvent`, `DragOverEvent`, `DragEndEvent`, `DragCancelEvent` from `@dnd-kit/core`.
- No `fetch` — persistence uses existing `updateCardApi` via the cards store.
- No global CSS; all new styles are CSS Modules on the owning component.
- Don't skip `data-testid`s on new droppable/draggable elements.

## AC Coverage
| AC # | Screen / Component                             | Covered by                                         |
| ---- | ---------------------------------------------- | -------------------------------------------------- |
| 1    | `ColumnView` `SortableContext` + `CardItem`    | Within-list reorder via `useSortable`              |
| 2    | `BoardView` `DndContext` spans all columns     | Cross-list drop with `collisionDetection`          |
| 3    | `CardDropPlaceholder` + sibling translate      | Visible dashed slot + auto-shifted siblings        |
| 4    | `DndContext.onDragCancel`                      | `Escape` restores order; no PATCH                  |
| 5    | `KeyboardSensor` + announcements               | Tab / Space / Arrows / Escape                      |
| 6    | Cards store `moveCard` → `updateCardApi`       | Single PATCH with `position` + optional `listId`   |
| 7    | Existing `requireBoardMember` middleware       | NO UI — backend only (no new bypass)               |
| 8    | Click heuristic (activation distance 6px)      | Pointer click below threshold still opens modal    |
