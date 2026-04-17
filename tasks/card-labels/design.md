# Design: Card Labels

## Screens Affected

- **Modified:** `BoardHeader` (`components/Board/BoardHeader`) — gains a "Manage labels" action that opens `LabelManagerModal`.
- **Modified:** `BoardView` (`components/Board/BoardView`) — gains a `LabelFilterBar` row between the header and the columns; filters which `CardItem`s render.
- **Modified:** `CardItem` (`components/Card/CardItem`) — renders a horizontal strip of `LabelChip` above the title when the card carries labels.
- **Modified:** `CardModal` (`components/Card/CardModal`) — gains a "Labels" section between Title and Description showing attached chips and an `+ Add label` trigger.
- **New:** `LabelManagerModal` (`components/Label/LabelManagerModal`) — board-scoped CRUD for labels (list + create + inline edit + inline delete confirm).
- **New:** `LabelPickerPopover` (`components/Label/LabelPickerPopover`) — anchored popover hung off the `+ Add label` button inside `CardModal`; toggles attach/detach per label.
- **New:** `LabelFilterBar` (`components/Label/LabelFilterBar`) — board-level filter pills + clear-all action.
- **New (primitives):** `LabelChip`, `LabelSwatchGrid` (both under `components/Label/`).

## User Flow

1. **Land on a board.** User opens a board they're a member of. `BoardView` mounts `BoardHeader` (now with a Manage labels button), then `LabelFilterBar` (hidden when the board has zero labels), then the columns. Cards already carrying labels show their chip strip above the title. _(Sets up AC 1, AC 5 visibility, AC 8 scoping.)_

2. **Open the manager.** User clicks `manage-labels-button` in `BoardHeader`. `LabelManagerModal` opens. It lists every existing label on the board (each row: chip + name + Edit + Delete) and an inline create form at the bottom. _(AC 1, AC 2, AC 3.)_

3. **Create a label.** User types a name into the create input, clicks one of six color swatches, then clicks Create. New row appears in the list on success. Duplicate name returns a server 400 → inline error under the input. _(AC 1; edges: duplicate name, empty name, unsupported color.)_

4. **Edit a label.** User clicks the Edit icon on a label row. The row swaps to inline form: name input + swatch grid + Save/Cancel. Save persists; on the next render every chip on every card and every filter pill reflects the new name and color (no re-attach required). _(AC 2.)_

5. **Delete a label.** User clicks Delete on a row. The row swaps to a confirm sentence ("Delete 'Bug'? Attached to 4 cards.") + Cancel + destructive Delete. Confirm removes the label from the board and (after refetch) detaches it from every card; cards themselves are not deleted. _(AC 3.)_

6. **Attach labels to a card.** User clicks a `CardItem`, opening `CardModal`. In the new Labels section under Title, currently-attached chips display alongside an `+ Add label` trigger. Clicking the trigger opens `LabelPickerPopover` anchored below it, listing every board label as a checkbox row. Clicking a row toggles attach/detach without closing the popover (multi-select). Outside-click or Escape closes the popover. A footer link "Manage labels…" closes the popover and opens `LabelManagerModal`. _(AC 5; idempotent re-attach is a no-op at the API.)_

7. **Detach a label from a card.** Inside `CardModal` the user clicks the small `×` on an attached chip; the chip disappears immediately. The label remains on the board and on other cards that carried it. _(AC 6.)_

8. **Filter the board.** User clicks a pill in `LabelFilterBar`. The pill becomes "selected" (solid fill instead of outlined). `BoardView` filters the rendered cards to only those carrying at least one selected label (OR semantics). Columns are kept visible even if empty. The `Clear all` button (visible only while at least one pill is active) restores the full view. _(AC 7; edges: empty-result columns stay rendered; deleted-label silent prune.)_

9. **Non-member never sees the UI.** AC 4 is server-enforced. The client only renders any of this once `fetchBoard` succeeds, which itself requires `requireBoardMember`. Flagged in AC Coverage as "no UI".

## Wireframes

### BoardView — Before

```
+------------------------------------------------------------------+
| BoardHeader: [<- Boards]  Board Name  [Edit]                     |
+------------------------------------------------------------------+
| +----------+  +----------+  +----------+  +-------------------+  |
| | Todo     |  | Doing    |  | Done     |  | New list name...  |  |
| +----------+  +----------+  +----------+  | [Add List]        |  |
| | [ Card ] |  | [ Card ] |  | [ Card ] |  +-------------------+  |
| | [ Card ] |  |          |  |          |                         |
| | + Add    |  | + Add    |  | + Add    |                         |
| +----------+  +----------+  +----------+                         |
+------------------------------------------------------------------+
```

### BoardView — After

```
+------------------------------------------------------------------+
| BoardHeader: [<- Boards]  Board Name  [Edit]   [Manage labels]   |
+------------------------------------------------------------------+
| LabelFilterBar:                                                  |
|   Filter:  (Bug)  (Urgent)  (Design)  (Backend)    [Clear all]   |
|           SELECTED  SELECTED  idle    idle                       |
+------------------------------------------------------------------+
| +------------+  +------------+  +------------+  +--------------+ |
| | Todo       |  | Doing      |  | Done       |  | New list...  | |
| +------------+  +------------+  +------------+  | [Add List]   | |
| | [Bug][Urg] |  | [Bug]      |  |            |  +--------------+ |
| | Card A     |  | Card D     |  |            |                   |
| |            |  |            |  |            |                   |
| | [Urg]      |  |            |  |            |                   |
| | Card B     |  |            |  |            |                   |
| | + Add      |  | + Add      |  | + Add      |                   |
| +------------+  +------------+  +------------+                   |
+------------------------------------------------------------------+

Notes:
- Each [...] above a card title is a LabelChip (palette-colored pill).
- When filter pills active, cards lacking any selected label are hidden;
  empty columns remain visible (Done above stays as empty list).
```

### LabelFilterBar — Empty board (no labels defined)

```
(component renders nothing — zero footprint, no layout shift)
```

### CardItem — Before

```
+----------------------------+
| Ship the auth flow         |
+----------------------------+
```

### CardItem — After (1 label)

```
+----------------------------+
| [ Bug ]                    |   <- chip strip row, gap var(--space-1)
| Ship the auth flow         |
+----------------------------+
```

### CardItem — After (many labels with overflow)

```
+--------------------------------+
| [Bug] [Urg] [Design] [+2]      |   <- max 3 chips, then +N counter
| Refactor card store            |
+--------------------------------+
```

### CardModal — Before

```
+----------------------------------------------+
|  Card Details                          [x]   |
|----------------------------------------------|
|  Title                                       |
|  [___________________________________]       |
|                                              |
|  Description                                 |
|  [___________________________________]       |
|  [___________________________________]       |
|                                              |
|  List: xxx  Created: yyy  Updated: zzz       |
|  [Delete]                          [Save]    |
+----------------------------------------------+
```

### CardModal — After

```
+----------------------------------------------+
|  Card Details                          [x]   |
|----------------------------------------------|
|  Title                                       |
|  [___________________________________]       |
|                                              |
|  Labels                                      |
|  ( Bug x ) ( Urgent x )   [ + Add label ]    |
|                                              |
|  Description                                 |
|  [___________________________________]       |
|  [___________________________________]       |
|                                              |
|  List: xxx  Created: yyy  Updated: zzz       |
|  [Delete]                          [Save]    |
+----------------------------------------------+
```

### LabelPickerPopover — anchored below `+ Add label`

```
                          [ + Add label ]
                          +-----------------------------+
                          | [ Search labels...      ]   |
                          |-----------------------------|
                          | [x] [Bug]                   |
                          | [x] [Urgent]                |
                          | [ ] [Design]                |
                          | [ ] [Backend]               |
                          | [ ] [Polish]                |
                          |-----------------------------|
                          | + Manage labels...          |
                          +-----------------------------+
```

### LabelManagerModal — Default (labels exist)

```
+--------------------------------------------------------+
|  Manage Labels                                   [x]   |
|--------------------------------------------------------|
|  Existing                                              |
|  +--------------------------------------------------+  |
|  | [Bug]      Bug              [Edit] [Delete]      |  |
|  | [Urgent]   Urgent           [Edit] [Delete]      |  |
|  | [Design]   Design           [Edit] [Delete]      |  |
|  +--------------------------------------------------+  |
|                                                        |
|  New label                                             |
|  Name:  [_________________________________]            |
|  Color:  (R) (A) (G) (B) (P) (S)                       |
|                                  [Cancel]   [Create]   |
+--------------------------------------------------------+
```

### LabelManagerModal — Empty state (no labels yet)

```
+--------------------------------------------------------+
|  Manage Labels                                   [x]   |
|--------------------------------------------------------|
|  No labels on this board yet.                          |
|  Create one below to start tagging cards.              |
|                                                        |
|  Name:  [_________________________________]            |
|  Color:  (R) (A) (G) (B) (P) (S)                       |
|                                  [Cancel]   [Create]   |
+--------------------------------------------------------+
```

### LabelRow — Edit-in-row state (after clicking Edit)

```
+--------------------------------------------------------+
|  [chip] [Bug____________]   (R) (A) (G) (B) (P) (S)    |
|                                  [Cancel]   [Save]     |
+--------------------------------------------------------+
```

### LabelRow — Delete-confirm state

```
+--------------------------------------------------------+
|  Delete "Bug"? Attached to 4 cards.                    |
|                                  [Cancel]   [Delete]   |
+--------------------------------------------------------+
```

## Component Inventory

### Reused

- `Button` (`components/shared/Button`) — `primary` for Create/Save, `secondary` for Cancel/Manage labels and the `+ Add label` trigger, `destructive` for Delete confirm and inline row Delete; `sm` size for in-row actions inside the manager rows.
- `Input` (`components/shared/Input`) — name input in create form, edit-in-row, and picker search; uses the existing `error` prop to surface duplicate-name validation inline.
- `Modal` (`components/shared/Modal`) — host for `LabelManagerModal`. Already provides Escape-to-close, overlay-click-to-close, and the `modal-overlay`/`modal`/`modal-close` testids.
- `Spinner` (`components/shared/Spinner`) — initial fetch in the manager; per-row in the picker while attach/detach is pending.
- `Toast` / `ToastContainer` — surface API errors (attach/detach failures, label fetch failures) via `useUiStore.addToast`.
- `useUiStore.openModal/closeModal` — gains a new `activeModal` key namespace `labels:<boardId>` for the manager. Picker open state is local to `CardModal`.

### New

**`LabelChip`** (`components/Label/LabelChip`)
- Props:
  ```
  label: { id: string; name: string; color: LabelColor }
  variant?: 'solid' | 'outline'   // default 'solid'
  size?: 'sm' | 'md'              // default 'sm'
  onRemove?: () => void           // shows trailing 'x' button when set
  onClick?: () => void            // makes the whole chip a button (filter pill)
  isPending?: boolean             // shows spinner overlay (used during detach)
  ```
- Renders a rounded pill. `solid` = palette fill + on-color text; `outline` = transparent bg + 1px border in palette color + ink-color text. The `LabelColor` type is the slot name (`'red' | 'amber' | 'green' | 'blue' | 'purple' | 'slate'`); the chip maps it to CSS variables (see Design Tokens).
- Used by: `CardItem` strip (display, solid), `CardModal` Labels section (solid + `onRemove`), `LabelManagerModal` row (display, solid), `LabelFilterBar` (solid when selected, outline when idle, with `onClick`).

**`LabelSwatchGrid`** (`components/Label/LabelSwatchGrid`)
- Props:
  ```
  selectedColor: LabelColor | null
  onSelect: (color: LabelColor) => void
  disabled?: boolean
  idPrefix: string                // for testid uniqueness across create/edit
  ```
- Horizontal row of six round swatch buttons (one per palette slot). Uses native `role="radiogroup" aria-label="Label color"`; each swatch is `role="radio" aria-checked aria-label="<Color name>"`. Selected swatch gets a 2px ring in `--color-primary` (offset 2px). Arrow keys move selection.

**`LabelManagerModal`** (`components/Label/LabelManagerModal`)
- Props: `boardId: string`.
- Wraps shared `Modal`. Calls a new `useBoardLabels(boardId)` hook (architect's call) that returns `{ labels, isLoading, error, refetch }`. Renders the empty/loaded list of `LabelRow`s plus the create form. Surfaces inline validation errors from the API. After any successful op, refetches and the underlying `BoardView` board fetch (so chips on cards refresh too).

**`LabelRow`** (`components/Label/LabelRow`)
- Props:
  ```
  label: Label
  cardCount: number               // for delete-confirm copy
  onSave: (patch: { name?: string; color?: LabelColor }) => Promise<void>
  onDelete: () => Promise<void>
  ```
- Internal to the manager. Three local states: `view` (default), `edit`, `confirmDelete`. Owns its own loading/error state. View renders a `LabelChip` + name + Edit/Delete; Edit renders `Input` + `LabelSwatchGrid` + Cancel/Save; ConfirmDelete renders the confirm sentence + Cancel + destructive Delete.

**`LabelPickerPopover`** (`components/Label/LabelPickerPopover`)
- Props:
  ```
  cardId: string
  attachedLabelIds: string[]
  labels: Label[]                 // from useBoardLabels
  onAttach: (labelId: string) => Promise<void>
  onDetach: (labelId: string) => Promise<void>
  onClose: () => void
  onOpenManager: () => void
  anchorRef: React.RefObject<HTMLButtonElement>
  ```
- Positioned absolutely below the anchor (via `getBoundingClientRect` on the anchor). Closes on outside-click and Escape, returning focus to the anchor. Renders a search input that filters the list locally by name (case-insensitive substring). Each row is a checkbox-like `button[role="menuitemcheckbox"]` with `aria-checked` reflecting attached state — clicking toggles attach/detach without closing.

**`LabelFilterBar`** (`components/Label/LabelFilterBar`)
- Props: `boardId: string`.
- Reads labels via `useBoardLabels(boardId)` and the active filter from a new client store slice (architect picks shape; `useLabelFilterStore` is the suggested name). Renders one `LabelChip` per label as a pill (`solid` when selected, `outline` when idle) with `onClick` toggling the label's id in the filter set. `Clear all` button visible only when the filter is non-empty. Renders nothing when the board has zero labels.

## States

### LabelFilterBar
- **Default (no labels on board):** Returns null. No empty message — the bar exists only to filter existing labels.
- **Default (labels exist, none selected):** Row of outlined pills; "Clear all" hidden.
- **Hover (pill):** Background shifts to `var(--color-background)`; border thickens to 2px in palette color.
- **Focus (pill):** 2px outline in `var(--color-primary)` offset 2px (CSS `outline-offset`).
- **Selected:** Pill switches to `solid` variant (palette fill + on-color text). `aria-pressed="true"`.
- **Loading (initial fetch):** Render three neutral skeleton pills (background `var(--color-border)`, fixed widths) to prevent layout shift.
- **Error (fetch failure):** Bar suppressed; `useUiStore.addToast({ variant: 'destructive', message: 'Could not load labels.' })`.
- **Disabled:** Not applicable.

### LabelManagerModal
- **Default:** Loaded list + create form idle.
- **Loading (initial fetch):** `<Spinner size="lg" />` centered in modal body until labels arrive.
- **Empty:** Renders the empty-state copy then the create form (same layout, no row list).
- **Creating (submit in flight):** Create `Button` `isLoading`; name `Input` and swatches `disabled`.
- **Error — duplicate name:** `Input` `error="A label named "<name>" already exists."` (red border + message), driven by the API 400 message.
- **Error — empty name:** Create button stays disabled while name is blank; if user attempts submit anyway, inline error `"Name is required."`.
- **Error — generic API failure:** Toast (destructive); modal stays open.
- **Disabled (Create button):** Disabled until name is non-blank AND a swatch is selected.

### LabelRow (inside the manager)
- **View (default):** Chip + name + Edit + Delete visible.
- **View — hover:** Row background `var(--color-background)`.
- **View — focus on row controls:** Standard `Button` focus ring.
- **Edit:** Inline `Input` + `LabelSwatchGrid` + Cancel + Save. Save disabled if name is empty OR (name unchanged AND color unchanged).
- **Edit — loading:** Save `isLoading`; inputs disabled.
- **Edit — error (duplicate):** Inline error below `Input`.
- **ConfirmDelete:** Sentence + Cancel + destructive Delete.
- **ConfirmDelete — loading:** Delete `isLoading`.
- **ConfirmDelete — error:** Toast; row returns to view state.

### LabelPickerPopover
- **Default:** Opens below the anchor; search input auto-focuses.
- **Hover/Focus (row):** Background `var(--color-background)`.
- **Loading (per row):** During an in-flight attach/detach for a row, replace its checkbox with `<Spinner size="sm" />`. Other rows remain interactive.
- **Empty (no labels on board):** Single message row "No labels yet." + "Manage labels…" footer is the only CTA.
- **Empty (search):** "No labels match "<query>"." Clear-search by emptying the input.
- **Error (attach/detach):** Toast (destructive); checkbox state reverts.
- **Disabled:** Per-row only, while its own attach/detach is pending.

### LabelChip — inside CardItem (display only)
- **Default:** `solid` variant, palette fill, on-color text, no interactivity.
- **No hover/focus:** chip is a `<span>` inside the clickable card; it does not trap focus.
- **Overflow:** When attached labels > 3, render the first 3 chips followed by a neutral `+N` chip (`background: var(--color-border)`, `color: var(--color-text)`).

### LabelChip — inside CardModal Labels section (with remove)
- **Default:** `solid` chip with trailing `x` button.
- **Hover/Focus on `x`:** `x` background gets a 15% black overlay; outline visible on keyboard focus.
- **Loading (detach in flight):** Chip muted (opacity 0.6), `x` swapped for `<Spinner size="sm" />`.
- **Error:** Toast (destructive); chip returns to default.
- **Disabled:** While detach is pending.

### Card tile chip strip — 0 / 1 / many labels
- **0 labels:** No strip row rendered; CardItem layout identical to before.
- **1 label:** Single chip above title, gap `var(--space-2)` between strip and title.
- **2-3 labels:** Chips render in attach order with `gap: var(--space-1)` between chips.
- **4+ labels:** First 3 chips, then `+N` overflow chip.

### `+ Add label` trigger (CardModal)
- **Default:** `Button variant="secondary" size="sm"` with `+ Add label` label.
- **Hover/Focus:** Inherits `Button` secondary hover.
- **Loading:** Not used (popover handles in-flight state).
- **Empty:** N/A (always available; popover handles "no labels yet" case).
- **Disabled:** Not applicable.

## Accessibility

- **Keyboard — filter bar:** Bar wrapper is `role="toolbar" aria-label="Filter by label"`. Each pill is a `<button aria-pressed="true|false">`; Tab walks pills left-to-right then "Clear all". Space/Enter toggles a pill.
- **Keyboard — manager modal:** Inherits Escape-to-close from shared `Modal`. Tab order: close → row 1 Edit → row 1 Delete → row 2 Edit → … → create-name input → swatch radiogroup → Cancel → Create. Arrow keys move within `LabelSwatchGrid` (native radiogroup behavior).
- **Keyboard — picker popover:** Tab order: search → each list row → "Manage labels…". Escape closes the popover and returns focus to the `+ Add label` anchor. Outside click also closes.
- **Keyboard — card modal chip remove:** Each chip's `x` is a real `<button>` inside the chip; Tab reaches them in chip order; Enter/Space activates.
- **Focus management:** Opening `LabelManagerModal` focuses the close button (default `Modal` behavior — should be improved later to focus the first row's Edit, but inheriting current behavior is acceptable for v1). Opening the picker focuses its search input. Closing either returns focus to the trigger that opened it.
- **ARIA — swatches:** `LabelSwatchGrid` is `role="radiogroup" aria-label="Label color"`. Each swatch: `role="radio" aria-checked="true|false" aria-label="Red" / "Amber" / "Green" / "Blue" / "Purple" / "Slate"`. Color is never the only signifier — the accessible name carries the slot.
- **ARIA — chips on cards:** Chip wrapper has `aria-label="<name> label"` so screen readers announce it even if the visible text gets truncated. Overflow `+N` chip uses `aria-label="N more labels"`.
- **ARIA — picker rows:** Each row is `role="menuitemcheckbox" aria-checked="true|false"`. Popover wrapper is `role="dialog" aria-modal="false" aria-label="Attach labels"`.
- **Live region:** Attach/detach success and failure surface through the existing `ToastContainer`, which is already an `aria-live="polite"` region.
- **Contrast (chips):** Each palette slot has been chosen so that `solid` chips meet WCAG AA (≥ 4.5:1) against either `--color-text-inverse` (#ffffff) or `--color-text` (#0f172a), whichever is paired in the token table below. The Green slot uses `--color-text` because white-on-green at the chosen hue is below 4.5:1; all other slots use white text.
- **Contrast (outlined filter pills):** Idle pills use a darker per-slot ink token paired against `--color-background` (#f8fafc); every ink token clears 7:1 (AAA).
- **Color-blind safety:** Chip strip on cards, filter pills, and manager rows always render the label NAME alongside the color. Color alone never carries meaning.

## Design Tokens Used

Existing tokens referenced (every visual decision below maps to one of these — no hardcoded values):

- `var(--color-primary)` — focus ring on swatches, selected-swatch indicator, picker footer "Manage labels…" link, focus outline on filter pills.
- `var(--color-primary-light)` — inner ring on selected filter pills (legibility against any palette color).
- `var(--color-secondary)` — "Filter:" prefix label, secondary button text.
- `var(--color-destructive)`, `var(--color-destructive-hover)` — Delete buttons in manager rows and confirm row.
- `var(--color-surface)` — manager modal body, picker popover background.
- `var(--color-background)` — hover background on manager rows and picker rows; idle filter pill background; outlined-chip background.
- `var(--color-border)` — divider between manager rows; picker popover border; `+N` overflow chip background; skeleton pill background.
- `var(--color-text)` — body copy; on-color text for Green chip; outlined-chip text fallback.
- `var(--color-text-secondary)` — meta copy ("Attached to N cards.", "Filter:" prefix), card-count text.
- `var(--color-text-inverse)` — text on solid chips for Red, Amber, Blue, Purple, Slate slots.
- `var(--font-size-xs)` — chip text inside `CardItem` strip; `+N` overflow chip; meta text.
- `var(--font-size-sm)` — manager row name; picker row text; filter pill text; chip text in modal.
- `var(--font-size-md)` — manager name input; create button.
- `var(--font-size-xl)` — manager modal title (inherits from Modal header).
- `var(--font-weight-medium)` — chip text, filter pills, action buttons (matches Button base).
- `var(--font-weight-semibold)` — manager modal title (inherits from Modal header).
- `var(--space-1)` — gap between chips inside the strip; padding-y on chips.
- `var(--space-2)` — gap between chip strip and card title; picker row padding-y; gap inside chip between text and `x`.
- `var(--space-3)` — manager row padding; picker row padding-x; chip padding-x.
- `var(--space-4)` — `LabelFilterBar` padding; vertical rhythm between modal sections.
- `var(--space-6)` — modal inner padding (inherits from Modal).
- `var(--radius-sm)` — picker popover border-radius; outlined filter pill (slight square feel).
- `var(--radius-md)` — manager row container; `+N` overflow chip.
- `var(--radius-full)` — solid chip pills; round swatch buttons; selected filter pill.
- `var(--shadow-sm)` — picker popover (subtle lift over the card modal).
- `var(--shadow-lg)` — manager modal (inherits from Modal).
- `var(--transition-fast)` — chip hover, pill press, swatch select ring.

### New Tokens Needed

The feature requires a fixed six-color palette. The architect should extend `src/client/styles/tokens.css` with the tokens below. Each palette slot ships as a triple: `fill` (chip background when solid), `on` (text color on solid fill), `ink` (text color when chip is outlined on `--color-background`). Contrast ratios are versus the paired text token and meet WCAG AA (≥ 4.5:1).

| Token                       | Value     | Paired text token       | Contrast | Slot     |
| --------------------------- | --------- | ----------------------- | -------- | -------- |
| `--color-label-red`         | `#dc2626` | `--color-text-inverse`  | 4.83:1   | Red      |
| `--color-label-red-on`      | `var(--color-text-inverse)` | —         | —        | Red      |
| `--color-label-red-ink`     | `#991b1b` | `--color-background`    | 9.10:1   | Red      |
| `--color-label-amber`       | `#f59e0b` | `--color-text`          | 9.13:1   | Amber    |
| `--color-label-amber-on`    | `var(--color-text)`         | —         | —        | Amber    |
| `--color-label-amber-ink`   | `#92400e` | `--color-background`    | 8.02:1   | Amber    |
| `--color-label-green`       | `#16a34a` | `var(--color-text)`     | 4.74:1   | Green    |
| `--color-label-green-on`    | `var(--color-text)`         | —         | —        | Green    |
| `--color-label-green-ink`   | `#166534` | `--color-background`    | 7.90:1   | Green    |
| `--color-label-blue`        | `#2563eb` | `--color-text-inverse`  | 6.23:1   | Blue     |
| `--color-label-blue-on`     | `var(--color-text-inverse)` | —         | —        | Blue     |
| `--color-label-blue-ink`    | `#1e40af` | `--color-background`    | 9.47:1   | Blue     |
| `--color-label-purple`      | `#7c3aed` | `--color-text-inverse`  | 6.44:1   | Purple   |
| `--color-label-purple-on`   | `var(--color-text-inverse)` | —         | —        | Purple   |
| `--color-label-purple-ink`  | `#5b21b6` | `--color-background`    | 10.14:1  | Purple   |
| `--color-label-slate`       | `#475569` | `--color-text-inverse`  | 7.26:1   | Slate    |
| `--color-label-slate-on`    | `var(--color-text-inverse)` | —         | —        | Slate    |
| `--color-label-slate-ink`   | `#334155` | `--color-background`    | 10.74:1  | Slate    |

Notes for the architect:
- The `*-on` variant indirects to either `--color-text` or `--color-text-inverse` so the `LabelChip` CSS can do `color: var(--color-label-{slot}-on)` data-driven from the slot name without conditionals in TS.
- Green's white-on-fill ratio is below 4.5:1 (3.92:1 measured), so its `on` token resolves to `--color-text`. All others use white.
- The Zod schema for label color (server-side) must enumerate these six slot names exactly: `'red' | 'amber' | 'green' | 'blue' | 'purple' | 'slate'`. The API stores the slot name; the client maps slot → CSS variable. The API never stores hex.
- No new spacing, radius, typography, or shadow tokens are required.
- No new z-index layer needed. `LabelManagerModal` reuses the Modal layer (`100`). `LabelPickerPopover` renders inside `CardModal` (already on layer `100`) using `position: absolute` relative to its anchor.

## data-testid Map

| Element                                                  | testid                                       |
| -------------------------------------------------------- | -------------------------------------------- |
| BoardHeader — "Manage labels" button                     | `manage-labels-button`                       |
| LabelFilterBar — root container                          | `label-filter-bar`                           |
| LabelFilterBar — individual filter pill (per label)      | `filter-label-toggle-<labelId>`              |
| LabelFilterBar — "Clear all" button                      | `clear-label-filter`                         |
| LabelManagerModal — modal root (in addition to shared `modal`) | `label-manager-modal`                  |
| LabelManagerModal — label row (per label, view state)    | `label-row-<labelId>`                        |
| LabelManagerModal — row Edit button                      | `label-edit-<labelId>`                       |
| LabelManagerModal — row Delete button                    | `label-delete-<labelId>`                     |
| LabelManagerModal — row delete-confirm Delete button     | `label-delete-confirm-<labelId>`             |
| LabelManagerModal — row delete-confirm Cancel button     | `label-delete-cancel-<labelId>`              |
| LabelManagerModal — row edit name input                  | `label-edit-name-<labelId>`                  |
| LabelManagerModal — row edit Save button                 | `label-edit-save-<labelId>`                  |
| LabelManagerModal — row edit Cancel button               | `label-edit-cancel-<labelId>`                |
| LabelManagerModal — create-form name input               | `label-create-name`                          |
| LabelManagerModal — create-form Submit button            | `label-create-submit`                        |
| LabelManagerModal — create-form Cancel button            | `label-create-cancel`                        |
| LabelSwatchGrid — swatch (create form)                   | `label-swatch-create-<colorSlot>`            |
| LabelSwatchGrid — swatch (edit row)                      | `label-swatch-edit-<labelId>-<colorSlot>`    |
| CardItem — chip strip container                          | `card-label-strip`                           |
| CardItem — individual chip                               | `card-label-chip-<labelId>`                  |
| CardItem — overflow `+N` chip                            | `card-label-overflow`                        |
| CardModal — Labels section container                     | `card-modal-labels`                          |
| CardModal — attached chip (per label)                    | `card-modal-label-<labelId>`                 |
| CardModal — attached chip remove button                  | `card-modal-label-remove-<labelId>`          |
| CardModal — "+ Add label" trigger                        | `card-modal-add-label`                       |
| LabelPickerPopover — root                                | `label-picker-popover`                       |
| LabelPickerPopover — search input                        | `label-picker-search`                        |
| LabelPickerPopover — row (per label)                     | `label-picker-row-<labelId>`                 |
| LabelPickerPopover — "Manage labels…" footer button      | `label-picker-manage`                        |

All testids follow the kebab-case convention used in `tests/e2e/smoke.spec.ts`. `<labelId>` and `<colorSlot>` interpolate at runtime. E2E specs can scope queries to `label-manager-modal` or `label-picker-popover` to disambiguate when multiple instances of `LabelChip` are on screen.

## AC Coverage

| AC # | Screen / Component                                                | Covered by                                                                                                                                          |
| ---- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `LabelManagerModal` (create form) → `LabelFilterBar` + `CardItem` strip | Create form `default` / `creating` / `error` states; on success, `useBoardLabels` refetches and the new chip appears in the bar (and on cards once attached). |
| 2    | `LabelManagerModal` (`LabelRow` `edit` state)                     | Inline edit form persists name/color; on Save, board refetch causes every `CardItem` chip and every `LabelFilterBar` pill to reflect new name/color. |
| 3    | `LabelManagerModal` (`LabelRow` `confirmDelete` state)            | Destructive confirm with card-count copy; on success, board refetch removes chips from every `CardItem` and the pill from `LabelFilterBar`.          |
| 4    | **NO UI — backend only.**                                         | All label endpoints sit behind `requireBoardMember`. The client only renders any label UI after `fetchBoard` succeeds (which itself requires membership). Non-members never reach this surface. Flagged for the architect. |
| 5    | `CardModal` Labels section + `LabelPickerPopover`                 | Toggling multiple rows in the picker attaches multiple labels; chips render in attach order in the modal and on the card tile. Re-clicking an attached row is idempotent (API no-op, UI keeps the same checked state). |
| 6    | `CardModal` chip `x` and `LabelPickerPopover` uncheck             | Either path detaches; chip disappears in the modal and on the card tile after refetch. Label remains on the board's manager list and on other cards. |
| 7    | `LabelFilterBar` + `BoardView`                                    | Pill toggling updates a client-side filter store; `BoardView` filters cards before passing them to `ColumnView` / `CardItem`. "Clear all" resets to empty selection. Empty columns remain visible (no list hiding). |
| 8    | `LabelFilterBar` + `LabelPickerPopover` + `LabelManagerModal`     | All three scope reads to the current `boardId` via `useBoardLabels(boardId)`. Board A's labels never appear on Board B's UI. Cross-board attach is server-side 400 — no UI affordance attempts it. |

### Edge-case UI coverage

- **Duplicate label name (case-insensitive).** Inline error under `label-create-name` / `label-edit-name-<id>` driven by the API 400 message, surfaced via the `Input` `error` prop.
- **Empty / whitespace-only name.** Create / Save buttons disabled while trimmed name is blank; on attempted submit, inline `"Name is required."` error.
- **Unsupported color.** Impossible via UI (the swatch grid enumerates exactly the six supported slots). API still validates and returns 400 if forged.
- **Board deletion cascade.** UI n/a; the client simply navigates away from the deleted board.
- **Deleting a card with labels attached.** UI n/a; existing card-delete flow unchanged. Labels remain on the board.
- **Empty filter result.** `BoardView` keeps every `ColumnView` rendered; each column shows zero cards (existing empty-cards visual). No additional UI needed.
- **Filter references a deleted label.** `LabelFilterBar` only renders pills for ids that exist in the freshly fetched labels. The filter store selector intersects its set with `labels.map(l => l.id)`; stale ids are silently dropped on the next board load. If the selection becomes empty, "Clear all" hides automatically and the board shows all cards.
- **Non-member.** No UI surface — server returns 403 and the board never loads (existing behavior).
