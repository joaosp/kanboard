## Design: Card Labels

### Overview

Card labels introduce a visual categorization system at the board level. The feature touches four main areas of the UI:

1. **BoardHeader** -- gains a "Labels" button that opens the Label Management Modal for creating, editing, and deleting board-level labels.
2. **CardItem** (column card) -- displays colored label chips beneath the card title.
3. **CardModal** (card detail) -- gains a "Labels" section for assigning/removing labels from the card.
4. **BoardView** (board toolbar area) -- gains a label filter bar that appears when a filter is active, showing the active label and a clear button.

A predefined color palette of 10 colors is used across all label-related UI. Labels are rendered as small colored chips (pill shapes) with white text on a solid background.

---

### Predefined Color Palette

The following 10 colors form the label palette. They are **not** design tokens (they are domain-specific data), but they must be defined in a single shared constant (`LABEL_COLORS`) so all components reference the same list. Each entry has a `value` (hex string stored in DB) and a `name` (for accessibility / screen readers).

| Name       | Hex       | Usage / Vibe        |
|------------|-----------|----------------------|
| Red        | `#ef4444` | Urgent, blocker      |
| Orange     | `#f97316` | High priority        |
| Amber      | `#f59e0b` | Warning, attention   |
| Green      | `#22c55e` | Done, approved       |
| Teal       | `#14b8a6` | In review            |
| Blue       | `#3b82f6` | Feature, default     |
| Indigo     | `#6366f1` | Design               |
| Purple     | `#a855f7` | Research             |
| Pink       | `#ec4899` | Personal, fun        |
| Gray       | `#6b7280` | Low priority, misc   |

All label chips render the hex value as `background-color` with `var(--color-text-inverse)` (#ffffff) as the text color. The "name" column above is for human reference only; the actual label name is user-defined.

---

### Screens & States

---

#### 1. Board Column View -- Card Item with Labels

**Layout**

```
┌─────────────────────────────── 280px column ──┐
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │  ┌────────┐ ┌──────┐ ┌───────────┐      │  │
│  │  │ Bug    │ │ P1   │ │ Frontend  │      │  │
│  │  └────────┘ └──────┘ └───────────┘      │  │
│  │  Fix the login redirect issue            │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │  Card without labels -- no chip row      │  │
│  └──────────────────────────────────────────┘  │
│                                                │
└────────────────────────────────────────────────┘
```

Label chips appear **above** the card title inside `CardItem`. If the card has no labels, the chip row is not rendered at all (no empty space).

**Design Guidelines**

- **Label chip container**: `display: flex`, `flex-wrap: wrap`, `gap: var(--space-1)`, `margin-bottom: var(--space-2)` (only when labels exist)
- **Label chip**:
  - `background-color`: the label's hex color
  - `color`: `var(--color-text-inverse)`
  - `font-size`: `var(--font-size-xs)` (0.75rem)
  - `font-weight`: `var(--font-weight-medium)`
  - `padding`: `var(--space-1) var(--space-2)` (2px 8px effective)
  - `border-radius`: `var(--radius-full)` (pill shape)
  - `line-height`: 1.2
  - `max-width`: 120px; `overflow: hidden`; `text-overflow: ellipsis`; `white-space: nowrap` (truncate long names)
- **Card surface**: no changes to existing `.card` styles
- **Card title**: remains `var(--font-size-sm)` / `var(--font-weight-medium)` as today

**Interaction Notes**

- Hover on label chip: no special hover effect (the card itself has a hover shadow)
- Clicking anywhere on the card (including on a label chip) opens the CardModal as today
- **Empty state**: if a card has zero labels, the chip container element is not rendered; the card looks identical to today

---

#### 2. Board Header -- Labels Button & Filter Controls

**Layout**

```
┌──────────────────────────────────────────────────────────────────────┐
│  <- Boards    My Project Board  [Edit]          [Labels]  [Filter v] │
└──────────────────────────────────────────────────────────────────────┘
```

Two new elements are added to the right side of `BoardHeader`:

1. **"Labels" button** -- opens the Label Management Modal
2. **"Filter" dropdown button** -- opens a dropdown listing all board labels for single-label filtering

**Design Guidelines**

- **Header layout change**: The existing `.header` flex container gets `justify-content: space-between`. Left side keeps back-link + name. Right side is a new `div.headerActions` with `display: flex`, `align-items: center`, `gap: var(--space-2)`.
- **Labels button**: shared `Button` component, `variant: "secondary"`, `size: "sm"`. Text: "Labels".
- **Filter button**: shared `Button` component, `variant: "secondary"`, `size: "sm"`. Text: "Filter". Has a small downward-caret indicator (CSS border-based triangle or Unicode `&#9662;`).

**Filter Dropdown**

```
                                                ┌──────────────────────┐
                                                │  Filter by Label     │
                                                ├──────────────────────┤
                                                │  [o] Bug             │
                                                │  [o] P1              │
                                                │  [o] Frontend        │
                                                │  [o] Backend         │
                                                │  [o] Design          │
                                                ├──────────────────────┤
                                                │  Clear Filter        │
                                                └──────────────────────┘
```

- **Dropdown panel**: `position: absolute`, anchored below the Filter button, `right: 0`
  - `background-color`: `var(--color-surface)`
  - `border`: `1px solid var(--color-border)`
  - `border-radius`: `var(--radius-lg)`
  - `box-shadow`: `var(--shadow-md)`
  - `padding`: `var(--space-2) 0`
  - `min-width`: 200px
  - `z-index`: 50 (below modal overlay at 100)
- **Dropdown header**: "Filter by Label", `font-size: var(--font-size-xs)`, `font-weight: var(--font-weight-semibold)`, `color: var(--color-text-secondary)`, `padding: var(--space-2) var(--space-3)`, `text-transform: uppercase`, `letter-spacing: 0.05em`
- **Each label row**: `display: flex`, `align-items: center`, `gap: var(--space-2)`, `padding: var(--space-2) var(--space-3)`, `cursor: pointer`
  - Left: a small color dot (12px circle, `border-radius: var(--radius-full)`, background = label hex)
  - Right: label name, `font-size: var(--font-size-sm)`, `color: var(--color-text)`
  - **Hover**: `background-color: var(--color-background)`
  - **Active/selected**: `background-color: var(--color-primary-light)`, name in `font-weight: var(--font-weight-semibold)`, plus a small checkmark icon or `var(--color-primary)` text color
- **"Clear Filter" row**: only visible when a filter is active. `font-size: var(--font-size-sm)`, `color: var(--color-destructive)`, `padding: var(--space-2) var(--space-3)`, `border-top: 1px solid var(--color-border)`
- **Empty state**: if no labels exist on the board, show "No labels yet" in `var(--color-text-secondary)`, `var(--font-size-sm)`, `padding: var(--space-3)`
- **Closing**: dropdown closes on outside click or Escape key

**Interaction Notes**

- Clicking a label in the dropdown selects it as the active filter (single selection). Clicking the same label again deselects it (clears filter).
- The Filter button text changes to show the active label: e.g., "Filter: Bug" with the label's color dot inline, or reverts to "Filter" when no filter is active.
- Dropdown closes after a selection is made.

---

#### 3. Active Filter Bar (Board View)

When a label filter is active, a thin bar appears between the BoardHeader and the columns area.

**Layout**

```
┌──────────────────────────────────────────────────────────────────────┐
│  BoardHeader (as above)                                              │
├──────────────────────────────────────────────────────────────────────┤
│  Showing cards with label:  [o Bug]                          [Clear] │
├──────────────────────────────────────────────────────────────────────┤
│  Column1          Column2          Column3           + Add List      │
│  ...              ...              ...                               │
└──────────────────────────────────────────────────────────────────────┘
```

**Design Guidelines**

- **Filter bar**: `display: flex`, `align-items: center`, `justify-content: space-between`, `padding: var(--space-2) var(--space-6)`, `background-color: var(--color-primary-light)`, `border-bottom: 1px solid var(--color-border)`
- **Left text**: "Showing cards with label:" in `var(--font-size-sm)`, `var(--color-text-secondary)`, followed by a label chip (same styling as card item chips)
- **Clear button**: shared `Button`, `variant: "secondary"`, `size: "sm"`. Text: "Clear filter". Alternatively, a text-only button styled as a link: `color: var(--color-primary)`, `font-size: var(--font-size-sm)`, `cursor: pointer`, no background/border.
- **Visibility**: only rendered when `activeLabelFilter` is non-null in the board/UI store. When no filter is active, this bar is not in the DOM.

**Interaction Notes**

- Clicking "Clear filter" removes the filter and shows all cards again
- When filtering is active, `ColumnView` receives a filtered card list -- cards without the active label are hidden. Empty columns still render (with their header and add-card form) but show no cards.
- If the active filter label is deleted (via Label Management Modal), the filter is automatically cleared

---

#### 4. Label Management Modal

Opened by clicking "Labels" in the BoardHeader. Uses the shared `Modal` component.

**Layout -- Default State (list of labels)**

```
┌──────────────────────────────────────────────────────┐
│  Board Labels                                    [x] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  [o]  Bug                          [Edit] [Del]│  │
│  ├────────────────────────────────────────────────┤  │
│  │  [o]  P1                           [Edit] [Del]│  │
│  ├────────────────────────────────────────────────┤  │
│  │  [o]  Frontend                     [Edit] [Del]│  │
│  ├────────────────────────────────────────────────┤  │
│  │  [o]  Backend                      [Edit] [Del]│  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  [+ Create new label]                                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Layout -- Create / Edit Label Form (inline, replaces list)**

```
┌──────────────────────────────────────────────────────┐
│  Board Labels                                    [x] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Name                                                │
│  ┌────────────────────────────────────────────────┐  │
│  │  Bug fix                                       │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Color                                               │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                │
│  │red │ │ org│ │ambr│ │grn │ │teal│                │
│  └────┘ └────┘ └────┘ └────┘ └────┘                │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                │
│  │blue│ │ind │ │purp│ │pink│ │gray│                │
│  └────┘ └────┘ └────┘ └────┘ └────┘                │
│                                                      │
│  Preview                                             │
│  ┌──────────────┐                                    │
│  │  Bug fix     │                                    │
│  └──────────────┘                                    │
│                                                      │
│  [Cancel]                              [Save Label]  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Design Guidelines**

*Modal wrapper*:
- Uses shared `Modal` component with `title="Board Labels"`
- Modal width: `min-width: 480px` (override default 400px via a className prop or wrapper)

*Label list*:
- **List container**: `display: flex`, `flex-direction: column`, `gap: 0` (rows separated by borders)
- **Each label row**: `display: flex`, `align-items: center`, `padding: var(--space-3)`, `border-bottom: 1px solid var(--color-border)`, `gap: var(--space-3)`
  - **Color dot**: 16px circle, `border-radius: var(--radius-full)`, `background-color`: label hex, `flex-shrink: 0`
  - **Label name**: `font-size: var(--font-size-sm)`, `font-weight: var(--font-weight-medium)`, `color: var(--color-text)`, `flex: 1`
  - **Edit button**: text-only button, `color: var(--color-text-secondary)`, `font-size: var(--font-size-sm)`, hover: `color: var(--color-primary)`, `background: none`, `border: none`, `padding: var(--space-1)`
  - **Delete button**: text-only button, `color: var(--color-text-secondary)`, `font-size: var(--font-size-sm)`, hover: `color: var(--color-destructive)`, `background: none`, `border: none`, `padding: var(--space-1)`
- **"+ Create new label" button**: full-width, `text-align: left`, `padding: var(--space-3)`, `color: var(--color-primary)`, `font-size: var(--font-size-sm)`, `font-weight: var(--font-weight-medium)`, `background: none`, `border: 1px dashed var(--color-border)`, `border-radius: var(--radius-md)`, `cursor: pointer`, `margin-top: var(--space-3)`. Hover: `background-color: var(--color-primary-light)`.

*Create / Edit form*:
- **Name field**: shared `Input` component with `label="Name"`, `placeholder="Label name..."`, `maxLength={30}`
- **Color palette**: `display: grid`, `grid-template-columns: repeat(5, 1fr)`, `gap: var(--space-2)`
  - **Each color swatch**: 40px x 28px rectangle, `border-radius: var(--radius-md)`, `background-color`: palette hex, `cursor: pointer`, `border: 2px solid transparent`, `transition: border-color var(--transition-fast)`
  - **Selected swatch**: `border: 2px solid var(--color-text)`, plus a white checkmark (Unicode `\u2713`) centered inside
  - **Hover (non-selected)**: `border-color: var(--color-border)`, slight `opacity: 0.85`
- **Preview**: shows a label chip rendered at actual size with the chosen color and typed name. `margin-top: var(--space-2)`. Uses the same chip styling as CardItem labels.
- **Form section label** ("Name", "Color", "Preview"): `font-size: var(--font-size-sm)`, `font-weight: var(--font-weight-medium)`, `color: var(--color-text-secondary)`, `margin-bottom: var(--space-1)`
- **Actions row**: `display: flex`, `justify-content: space-between`, `margin-top: var(--space-4)`
  - "Cancel": shared `Button`, `variant: "secondary"`, `size: "sm"`
  - "Save Label" / "Update Label": shared `Button`, `variant: "primary"`, `size: "sm"`, `isLoading` while saving

*Empty state*:
- If the board has no labels: centered text "No labels yet. Create one to get started!" in `var(--font-size-sm)`, `var(--color-text-secondary)`, `padding: var(--space-6)`, `text-align: center`

**Interaction Notes**

- **Opening**: modal opens in list view by default
- **Create flow**: clicking "+ Create new label" transitions the modal content to the form view (same modal, content swaps). A back arrow or "Cancel" returns to the list view.
- **Edit flow**: clicking "Edit" on a label row transitions to the form view pre-filled with that label's name and color. Title changes contextually to show "Edit Label" in the form header area.
- **Delete flow**: clicking "Del" shows an inline confirmation: the row transforms to show "Delete 'Bug'? This removes it from all cards." with [Cancel] and [Delete] buttons. Delete button uses shared `Button` with `variant: "destructive"`, `size: "sm"`. This avoids opening a second modal.
- **Validation errors**: displayed via the shared `Input` error prop (red text below the field). Errors: empty name, name > 30 chars, duplicate name on board.
- **Loading**: "Save Label" button shows `isLoading` state (shared Button handles this)
- **Success**: after create/edit/delete, the list view refreshes. A success toast is shown via the existing `Toast`/`ToastContainer` system.
- **Keyboard**: Tab navigates through form fields and palette swatches. Enter on a swatch selects it. Escape closes the modal.

---

#### 5. Card Detail Modal -- Labels Section

A new "Labels" section is added to the existing `CardModal`, positioned between the Description field and the Meta section.

**Layout**

```
┌──────────────────────────────────────────────────────┐
│  Card Details                                    [x] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Title                                               │
│  ┌────────────────────────────────────────────────┐  │
│  │  Fix the login redirect issue                  │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Description                                         │
│  ┌────────────────────────────────────────────────┐  │
│  │  Users are being redirected to /home ...       │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Labels                                              │
│  ┌────────┐ ┌──────┐ ┌───────────┐                  │
│  │ Bug  x │ │ P1 x │ │Frontend x │                  │
│  └────────┘ └──────┘ └───────────┘                   │
│  [+ Add label]                                       │
│                                                      │
│  List: abc123                                        │
│  Created: 1/15/2026                                  │
│  Updated: 1/16/2026                                  │
│                                                      │
│  [Delete]                              [Save]        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**"+ Add label" popover**

```
             ┌───────────────────────────┐
             │  ┌─────────────────────┐  │
             │  │ Search labels...    │  │
             │  └─────────────────────┘  │
             ├───────────────────────────┤
             │  [o] Bug         (added)  │
             │  [o] P1          (added)  │
             │  [o] Frontend    (added)  │
             │  [ ] Backend              │
             │  [ ] Design               │
             │  [ ] Research             │
             └───────────────────────────┘
```

**Design Guidelines**

*Labels section*:
- **Section label** ("Labels"): same styling as existing `.label` class in CardModal -- `font-size: var(--font-size-sm)`, `font-weight: var(--font-weight-medium)`, `color: var(--color-text-secondary)`
- **Assigned labels container**: `display: flex`, `flex-wrap: wrap`, `gap: var(--space-2)`, `margin-top: var(--space-1)`
- **Assigned label chip**: same as CardItem chips but slightly larger and with a remove button:
  - `background-color`: label hex
  - `color`: `var(--color-text-inverse)`
  - `font-size`: `var(--font-size-xs)`
  - `font-weight`: `var(--font-weight-medium)`
  - `padding`: `var(--space-1) var(--space-2)`
  - `border-radius`: `var(--radius-full)`
  - `display: inline-flex`, `align-items: center`, `gap: var(--space-1)`
  - **Remove "x" button**: `background: none`, `border: none`, `color: var(--color-text-inverse)`, `font-size: var(--font-size-xs)`, `opacity: 0.7`, `cursor: pointer`, `padding: 0`, `line-height: 1`. Hover: `opacity: 1`.
- **"+ Add label" button**: `color: var(--color-primary)`, `font-size: var(--font-size-sm)`, `background: none`, `border: none`, `cursor: pointer`, `padding: var(--space-1) 0`, `margin-top: var(--space-1)`. Hover: `text-decoration: underline`.
- **Empty state**: when no labels are assigned, only the "+ Add label" button is shown (no "No labels" text needed -- the button is self-explanatory).

*Add label popover*:
- Triggered by clicking "+ Add label". Positioned below the button.
- `position: absolute` (relative to a positioned parent wrapper)
- `background-color: var(--color-surface)`
- `border: 1px solid var(--color-border)`
- `border-radius: var(--radius-lg)`
- `box-shadow: var(--shadow-md)`
- `padding: var(--space-2)`
- `min-width`: 240px
- `z-index`: 50 (within the modal, still below modal overlay)
- **Search field**: shared `Input`, `size: "sm"` (compact), `placeholder="Search labels..."`. Filters the label list as the user types.
- **Label list**: each row is `display: flex`, `align-items: center`, `gap: var(--space-2)`, `padding: var(--space-2)`, `border-radius: var(--radius-md)`, `cursor: pointer`
  - Left: color dot (12px, circle)
  - Middle: label name, `font-size: var(--font-size-sm)`
  - Right (if already assigned): checkmark in `var(--color-success)` or muted "(added)" text in `var(--font-size-xs)`, `var(--color-text-secondary)`
  - **Hover**: `background-color: var(--color-background)`
- **Clicking a row**: toggles assignment. If not assigned, assigns the label (optimistic UI). If already assigned, removes it. The chip list above updates immediately.
- **Closing**: outside click or Escape
- **Empty search results**: "No matching labels" in `var(--color-text-secondary)`, `var(--font-size-sm)`, `padding: var(--space-3)`, `text-align: center`
- **No board labels at all**: "No labels on this board. Manage labels from the board header." in `var(--color-text-secondary)`, `var(--font-size-sm)`, `padding: var(--space-3)`, `text-align: center`

**Interaction Notes**

- Assigning/removing a label is an **immediate API call** (not deferred to the "Save" button). This matches the mental model that labels are metadata toggles, not part of the card's editable content (title/description).
- Optimistic UI: chip appears/disappears instantly; on API error, revert and show an error toast.
- The "Save" button on the card modal continues to save only title and description, as before.
- Removing a label via the "x" on a chip also triggers an immediate API call (same as toggling off in the popover).

---

### Component Inventory

| Component | New/Existing | Notes |
|-----------|-------------|-------|
| `Button` | Existing (shared) | Used for Labels button, Filter button, form actions, clear filter |
| `Input` | Existing (shared) | Used for label name input, search field in popover |
| `Modal` | Existing (shared) | Used for Label Management Modal |
| `Spinner` | Existing (shared) | Used for loading state when fetching labels |
| `Toast` / `ToastContainer` | Existing (shared) | Used for success/error feedback on label CRUD |
| `CardItem` | Existing (Card) | Modified to render label chips above title |
| `CardModal` | Existing (Card) | Modified to add Labels section with assign/remove |
| `BoardHeader` | Existing (Board) | Modified to add Labels button and Filter dropdown |
| `BoardView` | Existing (Board) | Modified to add active filter bar and pass filter state |
| `ColumnView` | Existing (Column) | Modified to accept and apply label filter to card list |
| `LabelChip` | **New** (shared) | Reusable pill component: `{ label: Label, size?: 'sm' \| 'md', onRemove?: () => void }`. Used in CardItem, CardModal, filter bar. Keeps chip styling DRY. |
| `LabelManagementModal` | **New** (Label) | Board-level label CRUD modal with list/form views |
| `LabelForm` | **New** (Label) | Create/edit form with name input, color palette, preview |
| `ColorPalette` | **New** (Label) | Grid of selectable color swatches |
| `LabelFilterDropdown` | **New** (Label) | Dropdown for single-label board filtering |
| `LabelPicker` | **New** (Label) | Popover in CardModal for assigning/removing labels |

### New Component File Structure

```
src/client/components/
  Label/
    LabelChip/
      LabelChip.tsx
      LabelChip.module.css
    LabelManagementModal/
      LabelManagementModal.tsx
      LabelManagementModal.module.css
    LabelForm/
      LabelForm.tsx
      LabelForm.module.css
    ColorPalette/
      ColorPalette.tsx
      ColorPalette.module.css
    LabelFilterDropdown/
      LabelFilterDropdown.tsx
      LabelFilterDropdown.module.css
    LabelPicker/
      LabelPicker.tsx
      LabelPicker.module.css
```

---

### Responsive Considerations

N/A -- desktop-only for this iteration. The column layout already scrolls horizontally. Label chips use `flex-wrap` so they handle narrow cards gracefully. The label management modal uses `min-width: 480px` which fits comfortably on desktop viewports.

---

### Accessibility Notes

- **Label chips**: each chip should include `role="listitem"` inside a container with `role="list"` and `aria-label="Card labels"`. The remove button on each chip needs `aria-label="Remove label: {name}"`.
- **Color palette swatches**: each swatch should be a `<button>` with `aria-label="{color name}"` and `aria-pressed="true/false"` to indicate selection. The palette container should have `role="radiogroup"` and `aria-label="Label color"`.
- **Filter dropdown**: the trigger button should have `aria-haspopup="listbox"` and `aria-expanded="true/false"`. The dropdown list items should use `role="option"` with `aria-selected` for the active filter.
- **Label picker popover**: the search input should have `aria-label="Search labels"`. The label list should have `role="listbox"`. Each item should have `role="option"` with `aria-selected` indicating assignment state.
- **Focus management**:
  - Opening the Label Management Modal focuses the first interactive element (first label's Edit button, or the Create button if empty).
  - Opening the filter dropdown focuses the first label option.
  - Opening the label picker popover focuses the search input.
  - Closing any popover/dropdown returns focus to the trigger button.
- **Keyboard navigation**:
  - Color palette: arrow keys navigate between swatches, Enter/Space selects.
  - Dropdown/popover lists: arrow keys navigate items, Enter selects, Escape closes.
  - Delete confirmation: Tab moves between Cancel and Delete, Enter activates.
- **Color contrast**: all label hex colors from the palette have been chosen to provide sufficient contrast (>= 4.5:1) against `#ffffff` text per WCAG AA -- except Amber (`#f59e0b`) which is 3.1:1. For Amber, use `var(--color-text)` (dark text) instead of `var(--color-text-inverse)` to maintain readability. The `LabelChip` component should include logic to select text color based on background luminance (light backgrounds get dark text, dark backgrounds get white text).

---

### Pencil Mockup

- **File**: `/Users/jcamarate/dev/kanboard/kanboard.pen`
- **Screens created**: 5 high-fidelity mockup frames covering all Card Labels UI states

| Screen | Node ID | Name |
|--------|---------|------|
| Board Column with Labels | `28dbk` | 1 - Board Column with Labels |
| Board Header with Filter Dropdown | `biOGh` | 2 - Board Header with Filter Dropdown |
| Active Filter Bar | `t2LzJ` | 3 - Active Filter Bar |
| Label Management Modal | `paJOA` | 4 - Label Management Modal |
| Card Modal Labels Section | `wuxB4` | 5 - Card Modal Labels Section |

**Design tokens used in mockups**: All Kanboard design tokens were registered as Pencil variables (`$--color-primary`, `$--color-surface`, `$--color-border`, `$--color-text`, `$--font-size-sm`, `$--radius-md`, etc.) ensuring mockups are grounded in the actual design system.

**Label color palette rendered**: All 10 colors (Red `#ef4444`, Orange `#f97316`, Amber `#f59e0b`, Green `#22c55e`, Teal `#14b8a6`, Blue `#3b82f6`, Indigo `#6366f1`, Purple `#a855f7`, Pink `#ec4899`, Gray `#6b7280`) are visible in the color palette grid in the Label Management Modal (Screen 4).
