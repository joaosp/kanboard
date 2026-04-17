# Scope: Card Labels

## Summary
Card labels let board members categorize cards with colored tags and narrow the board view to specific categories. Labels are defined once at the board level (each with a name and color), then attached to any number of cards on that board; multiple labels may coexist on a single card. Members can then filter the board so that only cards matching a selected label (or set of labels) remain visible. This closes a long-standing gap in Kanboard: today a board can only be organized by list/column, which forces users to encode type information ("bug", "urgent", "design") in the card title. Labels make that metadata first-class, queryable, and visually scannable.

## Persona
Any board `member` (including `admin`, who is a member with elevated board-level rights elsewhere in the app). All label operations — creating, renaming, recoloring, deleting, attaching, detaching, and filtering — are available to any member of the board. Labels live strictly within a single board and are not visible or reusable from other boards.

## User Story
As a board member, I want to tag cards with colored labels defined on my board and filter the board to show only cards carrying specific labels, so that I can visually group work by type (bug, feature, priority, team, etc.) and focus on a relevant subset without hunting through every list.

## Acceptance Criteria

1. **Member creates a label.** Given a `member` on a board with no labels, when they submit a new label with a non-empty `name` and a `color` chosen from the board's supported color set, then the label is persisted to that board and appears immediately in the board's label list for every member. The API response follows the `{ data: Label }` envelope.

2. **Member edits a label.** Given a `member` on a board with at least one existing label, when they change that label's `name` and/or `color`, then the update is persisted and every card that already carries the label reflects the new name and color on its next render without requiring the label to be re-attached.

3. **Member deletes a label.** Given a `member` on a board with at least one label attached to one or more cards, when they delete the label, then the label is removed from the board's label list *and* detached from every card that carried it; no cards are themselves deleted, and the operation returns a success response.

4. **Non-member of the board is denied.** Given an authenticated user who is **not** a member of the target board, when they attempt to list, create, rename, recolor, delete, attach, detach, or filter that board's labels via the API, then every such request is rejected with a `403` status and no database change occurs.

5. **Member attaches multiple labels to a card.** Given a `member` on a board with at least two labels defined, when they attach two or more of those labels to a single card, then all attached labels are persisted on that card and visible on the card in the board view to every board member. Attaching a label already on the card is a no-op (no duplicates, no error).

6. **Member detaches a label from a card.** Given a `member` viewing a card that carries one or more labels, when they remove a label from the card, then that label is no longer associated with that card, but the label remains defined on the board and attached to any other cards that carried it.

7. **Member filters the board by one or more labels.** Given a board with multiple cards carrying various labels, when a member activates a filter for one or more labels, then the board view shows only cards carrying **at least one** of the selected labels (OR semantics); cards with no labels or with only unselected labels are hidden. Clearing the filter restores the full board view. The filter is a client-side view state and does not mutate any data.

8. **Labels are board-scoped and isolated.** Given a member who belongs to two boards (Board A has label "Bug", Board B does not), when they open Board B, then "Bug" is not listed among Board B's labels and cannot be attached to any card on Board B. Attempting to attach Board A's label to a Board B card via the API is rejected.

## Edge Cases
- **Duplicate label name on the same board.** Two labels on the same board must not share a name (case-insensitive). Attempting to create or rename into a conflict returns a `400`-class error with a clear message.
- **Empty or whitespace-only label name.** Rejected by validation before reaching the database.
- **Unsupported color value.** Colors are constrained to a fixed palette defined for the feature; any value outside that palette is rejected.
- **Deleting a board cascades to labels.** When a board is deleted, all its labels (and their card associations) are removed along with the board's lists and cards.
- **Deleting a card with labels attached.** Removes the card–label associations for that card only; the labels themselves remain on the board.
- **Attaching a label to a card on a different board.** Rejected: the label's `boardId` must match the board that owns the card's list.
- **Filtering when no labels match any visible card.** The board renders every list/column with zero cards inside (empty filtered state) — lists themselves are not hidden.
- **Filtering when the user selects a label that is then deleted by another member.** The filter silently drops the deleted label from its selection on the next board load; if the selection becomes empty, the filter is cleared.
- **Non-member of the board.** Cannot read, create, attach, detach, or filter by that board's labels — all such requests return `403`.

## Out of Scope
- **AND-semantic filtering** (cards must carry *all* selected labels). This release ships OR semantics only; stricter filtering is a future iteration.
- **Global / cross-board labels.** Labels are strictly board-scoped; sharing a label across boards is not supported.
- **User-defined custom hex colors.** Only a fixed palette is supported in this iteration. A custom color picker is a future iteration.
- **Label descriptions or icons.** Name + color only.
- **Filtering by "no label" / "any label".** Only filtering by specific label selection is in scope.
- **Bulk label operations** (e.g. "apply label X to selected cards"). Labels are attached/detached one card at a time.
- **Search or text filtering of cards.** This scope covers label-based filtering only.
- **Reordering labels.** Labels display in creation order; manual reorder is out of scope.
- **Activity log / audit trail for label changes.** Not covered by this feature.

## Complexity
**M** — Introduces two new entities (`Label`, `CardLabel` join), four CRUD endpoints for labels plus two attach/detach endpoints on cards, board-membership access checks reusing existing middleware, and a client-side filter state layered over the existing board view. No new auth mechanism, no external integrations, no migration of existing data.
