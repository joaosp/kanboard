## Card Labels

### Summary
Card labels allow board members to categorize and visually distinguish cards using colored tags. Labels are defined at the board level so that all members of a board share a consistent vocabulary for categorization. Members can create labels with a name and color, assign one or more labels to any card on the board, remove labels from cards, and filter the board view to show only cards that carry a specific label. This feature reduces cognitive load when scanning a board and helps teams quickly identify card types, priorities, or categories at a glance.

### User Story
As a board member, I want to create colored labels and assign them to cards, so that I can visually categorize cards and quickly find cards of a specific type.

### Acceptance Criteria
- [ ] A board admin or member can create a new label for a board by providing a name (1-30 characters) and selecting a color from a predefined palette of at least 8 colors.
- [ ] A board admin or member can edit the name and color of an existing label on a board, and the change is reflected on all cards that carry that label.
- [ ] A board admin or member can delete a label from a board, which removes it from all cards that currently carry it.
- [ ] A board member can assign one or more labels to a card from the card detail modal; the same label cannot be assigned to a card more than once.
- [ ] A board member can remove a label from a card via the card detail modal.
- [ ] Assigned labels are displayed as colored chips on the card item in the board column view, showing the label color and name.
- [ ] A board member can filter the board view by one label at a time; when a filter is active, only cards carrying that label are visible across all lists, and a clear indication of the active filter is shown with an option to remove it.
- [ ] When a board is fetched (GET /api/boards/:id), the response includes all labels defined for that board and each card includes its assigned labels.

### Edge Cases
- A user attempts to create a label with an empty or whitespace-only name -- the request should be rejected with a validation error.
- A user attempts to create a label with a name longer than 30 characters -- the request should be rejected with a validation error.
- A user attempts to create a label with a color value not in the predefined palette -- the request should be rejected with a validation error.
- A user attempts to create two labels with the same name on the same board -- the request should be rejected indicating the name is already taken on this board.
- A user attempts to assign the same label to a card that already has it -- the request should be rejected or handled idempotently (no duplicate created).
- A user attempts to assign a label from Board A to a card on Board B -- the request should be rejected (labels are board-scoped).
- A user who is not a member of the board attempts to create, edit, delete, or assign labels -- the request should return 403.
- A label is deleted while a user has it selected as an active filter -- the filter should be cleared and all cards should become visible again.
- A card has multiple labels assigned and the user removes one -- only the targeted label is removed; the others remain.
- A card with labels is moved to a different list on the same board (future feature) -- labels should persist since they are board-scoped.

### Out of Scope
- Global/workspace-level labels shared across multiple boards (labels are board-scoped only).
- Custom hex color input -- users select from a predefined palette only.
- Multi-label filtering (AND/OR logic) -- this iteration supports filtering by a single label at a time.
- Label ordering or sorting within the label list.
- Label icons or emoji support -- labels have a name and color only.
- Card creation with labels pre-assigned in the add-card form -- labels are managed only through the card detail modal.
- Drag-and-drop reordering of labels on a card.
- Label usage analytics or counts.

### Complexity Estimate: M
This is a medium-complexity feature. It introduces a new data model (Label) and a join relationship (card-to-label, many-to-many), requiring a database migration, new API endpoints (CRUD for labels, assign/unassign for card-labels), Zod validation schemas, a service layer, and corresponding frontend components (label management UI in the card modal, label chips on card items, board-level label management, and a filter mechanism in the board view). While none of these pieces are individually complex, the breadth of changes across the full stack -- schema, API, validation, state management, and multiple UI components -- places this solidly in medium territory. Estimated at 2 days of implementation effort.
