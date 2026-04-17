# Scope: Card Due Date with Overdue Indicator

## Summary
Board members need a lightweight way to track when a card is due so work doesn't silently slip past its deadline. This feature adds an optional due date to each card and surfaces an overdue indicator in the UI whenever the due date has passed and the card is still open. The due date is purely informational — it does not move cards, block edits, send notifications, or integrate with any calendar system. It only has to be settable, clearable, persisted per card, and visibly flagged when overdue.

## Persona
Any authenticated board member (role `admin` or `member`) viewing or editing cards on a board they belong to. Both roles have identical permissions for this feature — mirroring the existing card-mutation rules in `src/server/routes/cards.ts`. Non-members of the board cannot read or modify the due date, consistent with all other card fields.

## User Story
As a board member, I want to set an optional due date on a card and see at a glance when a card is overdue, so that I can prioritise work that has fallen behind schedule without leaving the board view.

## Acceptance Criteria

1. **Setting a due date.** Given a board member is viewing a card's detail view, when they choose a calendar date and save, then the card is persisted with that due date and the detail view reflects the saved value on reload.

2. **Clearing a due date.** Given a card already has a due date, when a board member clears the date and saves, then the card is persisted with no due date and no overdue indicator appears for it anywhere in the UI.

3. **Due date is optional on create.** When a board member creates a new card without specifying a due date, then the card is created successfully and is treated as having no due date (no indicator shown).

4. **Overdue indicator on the board tile.** Given a card's due date is strictly earlier than the current date (the user's local "today"), when the board member views the card's compact tile on the board, then a visible overdue indicator is shown on that tile. Given the due date is today or in the future, then no overdue indicator is shown.

5. **Overdue indicator on the card detail view.** Given a card's due date is strictly earlier than the current date, when a board member opens the card detail view, then the same overdue indicator is shown alongside the displayed due date.

6. **Due date visible without overdue state.** Given a card has a due date that is today or in the future, when a board member views the card (tile or detail view), then the due date is rendered in a human-readable form without the overdue indicator.

7. **Access control on read and write.** Given a user is not a member of the board a card belongs to, when they attempt to read or modify the card's due date via the API, then the request is rejected with the same `403` response the existing card endpoints return for non-members; membership errors take precedence over validation errors.

8. **Input validation.** Given a board member submits a due date that is not a valid calendar date (malformed string, wrong type, or non-existent date such as Feb 30), when the API processes the request, then the server rejects the request with a `400` response via the existing Zod validation pipeline and the card is not modified.

## Edge Cases
- **Due date is exactly today.** The card is not overdue — the indicator only appears when the due date is strictly before today.
- **Timezone boundaries.** "Today" is evaluated against the viewer's local time. A card due 2026-04-17 is not overdue for a viewer whose local date is still 2026-04-17, even if UTC has rolled over.
- **Clearing versus never-set.** Both states (explicitly cleared and never set) must behave identically in the UI — no due date text, no indicator.
- **Very old due dates.** A due date years in the past must still render and show as overdue; there is no cap on how overdue a card can be.
- **Concurrent edits.** If two members edit the same card simultaneously (one sets a due date, the other clears it), the last write wins, consistent with how `title` and `description` already behave in `updateCard`.
- **Card moved between lists.** Moving a card to a different list does not alter its due date or overdue status.
- **Board deletion / list deletion.** Cascade delete continues to remove the card (and its due date) per existing `onDelete: Cascade` behaviour — no new handling required.
- **Clock skew between client and server.** The overdue flag is derived on the client from the persisted date plus the viewer's local clock, so a user with a badly misconfigured clock may see stale overdue states. Acceptable for this MVP.

## Out of Scope
- **Due time of day.** Only calendar-day precision is in scope; no hours/minutes.
- **Reminders, notifications, or emails.** No background jobs or scheduled messages.
- **Recurring due dates.** Each card has at most one due date at a time.
- **Sorting or filtering cards by due date.** The board order continues to be driven solely by `position`.
- **Calendar integration (iCal, Google Calendar, etc.).** No external sync.
- **Per-user "my overdue cards" dashboard.** Overdue is computed per card in place; there is no aggregated view.
- **Different overdue thresholds per board or per user.** The rule is uniformly "strictly before today."
- **"Due soon" / "due today" warning states.** Only two states exist in this iteration: has/doesn't-have a due date, and if it has one, overdue or not.
- **Audit trail of due-date changes.** The existing `updatedAt` timestamp is sufficient; no history table.

## Complexity
**S** — One nullable scalar column on `cards`, one optional field added to create/update schemas, one read-only derived flag on the client, and indicator styling on two existing card components. No new endpoints, no new routes, no new middleware, no role-model changes.
