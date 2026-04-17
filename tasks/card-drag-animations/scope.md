# Scope: Animated Card Drag-and-Drop

## Summary
Kanboard currently has no way to move cards by direct manipulation — reordering or reassigning a card to another list requires opening the card modal (or isn't possible at all). This feature introduces mouse/touch drag-and-drop for cards on the board view, with motion treated as a first-class quality concern: a card visibly lifts when picked up, follows the pointer smoothly, neighboring cards slide out of the way to preview the drop target, and the card settles into its final slot with a short transition rather than a jarring snap. Cancelled drags animate the card back to its origin. The result should feel like a physical card on a physical board, not like a DOM reflow.

## Database & API Support
The existing schema already models what this feature needs: `Card.position: Int` orders cards within a list and `Card.listId` identifies which list the card belongs to (`prisma/schema.prisma` lines 59–71). **No migration is required.** However, the current `PATCH /api/cards/:id` handler performs a blind write and does not reshuffle neighboring cards' positions, and there is no unique constraint on `(list_id, position)`. To satisfy AC4, AC5, and AC7 atomically, the persistence boundary for this feature is a server-side move operation that updates the dragged card and reshuffles affected neighbors inside a single transaction — either by extending the existing PATCH endpoint's semantics or by adding a dedicated move endpoint. The exact shape is left to the architect; the scope only requires that a drop results in a consistent ordering without duplicate positions.

## Persona
Any authenticated board member — both `admin` and `member` roles — working on a board they belong to. Both roles already have permission to update card position through the existing `PATCH /api/cards/:id` endpoint, so the drag interaction is role-agnostic within a board.

## User Story
As a board member, I want to drag a card to a new position — within its current list or onto another list — and see smooth visual feedback throughout the motion, so that reorganizing my board feels immediate, tactile, and obvious rather than abrupt.

## Acceptance Criteria

1. **Pick-up animation.** Given a card on the board, when a member presses and begins dragging it, then within 150ms the card visually lifts (elevation increases and the card scales up slightly) to indicate it is being held. The original slot remains visible as a placeholder.

2. **Follow-the-pointer ghost.** While a drag is in progress, the dragged card follows the pointer position smoothly on every frame with no visible jitter or lag behind cursor movement on a 60Hz display.

3. **Neighbor reflow.** When the dragged card hovers over a valid drop position (within any list on the current board), the cards at and after that position slide down to open a gap sized to the dragged card. The gap updates as the pointer moves across positions, and only one gap is open at a time.

4. **Drop settle — same list, atomic persistence.** Given a card is dragged to a new position within the same list, when the member releases the pointer, then the card animates from the pointer location into the target slot (transition ≤ 250ms), the placeholder closes, and the move is persisted in a single atomic server operation. After a hard reload the card and every other card in that list appear at the same positions seen after the drop, with no duplicate `position` values.

5. **Drop settle — cross-list, atomic persistence.** Given a card is dragged onto a different list, when the member releases the pointer, then the card animates into its target slot in the new list, the source list closes its placeholder, and the move (new `listId` + new `position` + any neighbor reshuffling in both lists) is persisted in a single atomic server operation. After a hard reload, both lists show the same ordering the UI settled on.

6. **Cancelled drag returns home.** When a member presses Escape during a drag, or releases the pointer outside any valid list, then the dragged card animates back to its original slot (transition ≤ 250ms) and no API request is made.

7. **Failed persistence rolls back visually.** If the server rejects the move (any non-2xx response), the card animates back to its original position, an error toast is shown through `useUiStore`, and the board state shows the same ordering as before the drag. After a hard reload the server state and UI state agree.

8. **Reduced motion respected.** When the user's OS reports `prefers-reduced-motion: reduce`, all transitions above collapse to instant position changes (no lift, no slide, no settle tween) while the drag itself and the persistence behavior continue to work identically.

## Edge Cases
- Dragging a card onto the same position it started from: no API request, no error, card returns to origin with a short settle animation (or instantly under reduced motion).
- Two members dragging cards in the same list simultaneously (last-write-wins via the server is acceptable for this iteration): whichever drop is persisted last defines final order; no duplicate positions should remain on disk after both PATCHes complete.
- Dropping onto an empty list: the placeholder renders at position 0 and the drop settles into that slot.
- Rapid consecutive drags (user drops and immediately picks up another card): each drag's animation is independent; a new pick-up must not be blocked waiting for a prior settle to finish.
- The dragged card is deleted or its list is deleted by another client mid-drag (if realtime updates are ever added): out of scope for this iteration — assume single-client behavior.
- Touch devices: long-press to initiate drag is acceptable but detailed touch gesture tuning is out of scope (see below).
- Board with many cards (100+ in one list): pick-up, follow, and settle animations must still render at ≥ 30fps on a mid-range laptop.
- Keyboard-only users: no new keyboard interaction is added in this iteration (see Out of Scope).

## Out of Scope
- **List reordering** (dragging whole lists left/right). Separate feature; file under future iteration `list-drag-animations`.
- **Keyboard-accessible drag-and-drop** (space to pick up, arrows to move, enter to drop). Important for a11y but large enough to warrant its own scope doc — future iteration.
- **Multi-card selection and drag.** Single-card drags only.
- **Autoscroll** when dragging near the top/bottom edge of the board. Nice-to-have, not required for this iteration.
- **Touch gesture polish** beyond basic long-press-to-drag (haptics, velocity-based release, etc.).
- **Realtime sync** of other clients' drags. This feature assumes single-client interaction with the board.
- **Prisma schema migration.** No new tables or columns — `Card.position` and `Card.listId` already exist. Extending the server persistence layer (service and/or route) to reshuffle atomically is in scope; schema changes are not.
- **Adding a unique constraint on `(list_id, position)`.** Atomicity is enforced by the server-side transactional move, not by a DB constraint, in this iteration.
- **Realtime broadcast of moves to other connected clients.** Out of scope — single-client interaction only.

## Complexity
**L** — Introduces a new interaction primitive (drag-and-drop) on the board view, requires a motion/DnD library choice, touches every card and column component, and needs careful coordination between optimistic UI state and an atomic server-side move (transactional reshuffle across one or two lists) with rollback on failure. Scope is contained to the board view and the card persistence layer; no schema migration is required.
