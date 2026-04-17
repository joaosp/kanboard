# Scope: Drag-and-Drop with Animations for Cards

## Summary
Today, reordering a card or moving it to another list requires opening the card modal and manually editing fields — there is no direct manipulation on the board. This feature enables any board member to drag a card within its list (reorder) or across lists (move), with smooth animations and a clear drop placeholder, persisting the new position to the server on drop. It is the most commonly expected interaction on any Kanban board and closes a major usability gap before the MVP ships.

## Persona
Board members (both `admin` and `member` roles on a given board) who actively triage work and need to reshuffle cards as priorities change.

## User Story
As a board member, I want to drag a card to reorder it within a list or move it to another list, so that I can reorganize work directly on the board without opening each card.

## Acceptance Criteria

1. **Within-list reorder.** Given a list with at least two cards, when a member grabs a card with the mouse and drops it above or below a sibling card in the same list, then the card's new position is reflected in the UI immediately and the order persists after a full page reload.
2. **Cross-list move.** Given two lists on the same board, when a member drags a card from list A and drops it onto a position in list B, then the card appears in list B at the drop position, is removed from list A, and the move persists after reload.
3. **Drop placeholder.** While a card is being dragged, a visible placeholder indicates where the card will land if released, and the placeholder updates as the pointer moves across valid drop targets (other card positions and empty-list regions).
4. **Drag cancellation.** When a member presses `Escape` during an active drag, the drag is cancelled, the card returns to its original list and position, and no `PATCH` request is sent to the server.
5. **Keyboard support (baseline).** A member can `Tab` to focus a card, press `Space` to pick it up, use `Arrow` keys to move it between positions and across lists, and press `Space` again to drop it — producing the same persistence behaviour as a mouse drop. `Escape` while picked up cancels without persisting.
6. **Persistence via existing endpoint.** On a successful drop, the client issues a single `PATCH /api/cards/:id` that updates the card's `position` and (when the list changed) its `listId`; the server responds with the updated card and the board state reconciles without a full refetch.
7. **Access control.** Both `admin` and `member` board members can drag cards; a user who is not a member of the board cannot drag (consistent with existing board-access middleware — no new bypass).
8. **No regression of non-drag interactions.** Clicking a card still opens the card modal, the "Add card" form still works, and list/column layouts render unchanged when no drag is in progress.

## Edge Cases
- Dropping a card onto its original position (no-op): no network request is sent.
- Dropping into an empty list: card becomes the only card in that list at position 0.
- Server rejects the `PATCH` (network error, 403, 404): the card snaps back to its pre-drag position and a toast surfaces the failure.
- Another client reorders the same list mid-drag: last write wins; the local drag completes and a subsequent refetch reconciles.
- Very long list that scrolls: autoscroll during drag is acceptable default behaviour from `@dnd-kit` — no custom scroll logic required.

## Out of Scope
- **List (column) reordering** — separate feature; cards only in this iteration.
- **Touch/mobile optimization** beyond `@dnd-kit` defaults — desktop pointer and keyboard are the target.
- **Undo / redo** of a drag operation.
- **Multi-select drag** (dragging more than one card at a time).
- **Optimistic conflict resolution** beyond snap-back-on-error.

## Complexity
**M** — Well-scoped client interaction using a mature library, plus a minor server contract extension (`listId` on card `PATCH`) and state reconciliation in the cards store.
