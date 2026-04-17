# Kanboard Design System

Single source of truth for visual design. All tokens are defined in `src/client/styles/tokens.css` and must be referenced as CSS custom properties (e.g. `var(--color-primary)`) — never hardcoded. Resets and element defaults live in `src/client/styles/global.css`. CSS Modules are configured in `vite.config.ts` with `localsConvention: 'camelCaseOnly'`.

## Color Tokens

| Token                        | Value       | Purpose                                              |
| ---------------------------- | ----------- | ---------------------------------------------------- |
| `--color-primary`            | `#2563eb`   | Primary action (button bg, focused input border, link accent) |
| `--color-primary-hover`      | `#1d4ed8`   | Primary button hover                                 |
| `--color-primary-light`      | `#dbeafe`   | Subtle primary tint (selected row, badge bg)         |
| `--color-secondary`          | `#64748b`   | Secondary button text, meta labels                   |
| `--color-secondary-hover`    | `#475569`   | Secondary button hover text                          |
| `--color-destructive`        | `#dc2626`   | Destructive actions, error borders, error text       |
| `--color-destructive-hover`  | `#b91c1c`   | Destructive button hover                             |
| `--color-success`            | `#16a34a`   | Success toasts/confirmations                         |
| `--color-warning`            | `#d97706`   | Warning toasts/banners                               |
| `--color-background`         | `#f8fafc`   | App background (`body`)                              |
| `--color-surface`            | `#ffffff`   | Cards, modals, inputs                                |
| `--color-border`             | `#e2e8f0`   | Default 1px borders, dividers                        |
| `--color-text`               | `#0f172a`   | Body copy, headings                                  |
| `--color-text-secondary`     | `#64748b`   | Meta, captions, close icons                          |
| `--color-text-inverse`       | `#ffffff`   | Text on primary/destructive backgrounds              |

## Typography

**Family:** `--font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
**Base:** `html { font-size: 16px; }`, `body { line-height: 1.5; -webkit-font-smoothing: antialiased; }`

### Sizes (rem)

| Token              | Value      | Typical use                          |
| ------------------ | ---------- | ------------------------------------ |
| `--font-size-xs`   | `0.75rem`  | Badges, micro meta                   |
| `--font-size-sm`   | `0.875rem` | Labels, small buttons, card titles   |
| `--font-size-md`   | `1rem`     | Body, input, default button          |
| `--font-size-lg`   | `1.125rem` | BoardCard name                       |
| `--font-size-xl`   | `1.25rem`  | Modal title, close icon              |
| `--font-size-2xl`  | `1.5rem`   | Page/section headings                |
| `--font-size-3xl`  | `1.875rem` | Hero / auth screen titles            |

### Weights

| Token                      | Value | Use                              |
| -------------------------- | ----- | -------------------------------- |
| `--font-weight-normal`     | 400   | Body copy                        |
| `--font-weight-medium`     | 500   | Buttons, labels, card titles     |
| `--font-weight-semibold`   | 600   | Modal title, BoardCard name      |
| `--font-weight-bold`       | 700   | Reserved for emphatic headings   |

## Spacing Scale

Used for padding, margin, and gap. Flex/grid layouts prefer `gap` over margin.

| Token         | Value      | Common use                         |
| ------------- | ---------- | ---------------------------------- |
| `--space-1`   | `0.25rem`  | Micro gap (label↔input), icon pad  |
| `--space-2`   | `0.5rem`   | Input padding-y, small-button y    |
| `--space-3`   | `0.75rem`  | Input padding-x, card padding      |
| `--space-4`   | `1rem`     | Default button padding-x, stack gap|
| `--space-5`   | `1.25rem`  | Section inner pad                  |
| `--space-6`   | `1.5rem`   | Modal padding                      |
| `--space-8`   | `2rem`     | Page gutters                       |
| `--space-10`  | `2.5rem`   | Large section rhythm               |
| `--space-12`  | `3rem`     | Hero spacing                       |
| `--space-16`  | `4rem`     | Max vertical rhythm                |

## Radius Scale

| Token             | Value        | Use                                  |
| ----------------- | ------------ | ------------------------------------ |
| `--radius-sm`     | `0.25rem`    | Tags, badges                         |
| `--radius-md`     | `0.375rem`   | Buttons, inputs, CardItem            |
| `--radius-lg`     | `0.5rem`     | BoardCard                            |
| `--radius-xl`     | `0.75rem`    | Modal surface                        |
| `--radius-full`   | `9999px`     | Pills, avatars                       |

## Shadow Scale

| Token           | Value                                                                 | Use                      |
| --------------- | --------------------------------------------------------------------- | ------------------------ |
| `--shadow-sm`   | `0 1px 2px 0 rgb(0 0 0 / 0.05)`                                        | Resting BoardCard, hover lift on CardItem |
| `--shadow-md`   | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`     | BoardCard hover          |
| `--shadow-lg`   | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`   | Modal surface            |

## Transitions

| Token                 | Value        | Use                                        |
| --------------------- | ------------ | ------------------------------------------ |
| `--transition-fast`   | `150ms ease` | Color, border, shadow hover states; modal fade-in |
| `--transition-normal` | `200ms ease` | Larger UI transitions; modal slide-up       |

## Z-Index Hierarchy

No `--z-*` tokens yet — values are set literally inside the component that owns the layer. Keep them monotonically increasing:

| Layer                | Value  | Owner                                            |
| -------------------- | ------ | ------------------------------------------------ |
| Modal overlay + panel| `100`  | `src/client/components/shared/Modal/Modal.module.css` |
| Toast stack          | `200`  | `src/client/components/shared/ToastContainer/ToastContainer.module.css` |

If a new layer is needed (dropdowns, tooltips, drag previews), slot it between existing layers and document it here before shipping.

## Component Patterns

### Button — `components/shared/Button`

Props: `variant: 'primary' | 'secondary' | 'destructive'` (default `primary`), `size: 'sm' | 'md'` (default `md`), `isLoading?: boolean`. When `isLoading`, the button is `disabled` and renders `...`.

Styling contract (see `Button.module.css`):
- Base: `inline-flex` centered, `border-radius: var(--radius-md)`, `font-weight: var(--font-weight-medium)`, `transition: background-color var(--transition-fast)`, `line-height: 1`.
- **primary** — `bg: --color-primary` / text: `--color-text-inverse`, hover: `--color-primary-hover`.
- **secondary** — `bg: --color-surface`, text: `--color-secondary`, 1px `--color-border`, hover bg `--color-background` + text `--color-secondary-hover`.
- **destructive** — `bg: --color-destructive` / text: `--color-text-inverse`, hover: `--color-destructive-hover`.
- **sm** — `padding: var(--space-1) var(--space-3)`, `font-size: var(--font-size-sm)`.
- **md** — `padding: var(--space-2) var(--space-4)`, `font-size: var(--font-size-md)`.
- `:disabled` → `opacity: 0.6; cursor: not-allowed`.

### Input — `components/shared/Input`

Props: `label?`, `error?`, plus native `InputHTMLAttributes`. `forwardRef` so RHF/imperative focus works. Structure: `.wrapper > .label? + .input + .error?`. Focus ring is a `--color-primary` border-color swap; error state swaps border and message to `--color-destructive`.

### CardItem — `components/Card/CardItem`

Resting: `bg: --color-surface`, 1px `--color-border`, `border-radius: var(--radius-md)`, `padding: var(--space-3)`, `cursor: pointer`, `transition: box-shadow var(--transition-fast)`. Hover: `box-shadow: var(--shadow-sm)`. Title uses `--font-size-sm` + `--font-weight-medium`.

### BoardCard — `components/Board/BoardCard`

Higher-weight card used on the board index. Flex column, `gap: var(--space-2)`, `padding: var(--space-4)`, `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-sm)`, transitions `box-shadow` + `border-color`. Hover lifts shadow to `--shadow-md` and borders in `--color-primary`.

### Modal — `components/shared/Modal`

Rendered through `createPortal` into `#root`. Escape key and overlay click both call `onClose`. Always exposes `data-testid="modal-overlay"`, `data-testid="modal"`, `data-testid="modal-close"`.

Overlay: `position: fixed; inset: 0; bg: rgba(0,0,0,0.5); z-index: 100`, `animation: fadeIn var(--transition-fast)`.
Panel: `bg: --color-surface`, `border-radius: var(--radius-xl)`, `box-shadow: var(--shadow-lg)`, `padding: var(--space-6)`, `min-width: 400px; max-width: 90vw; max-height: 90vh; overflow-y: auto`, `animation: slideUp var(--transition-normal)`.
Header: flex row, `margin-bottom: var(--space-4)`, title uses `--font-size-xl` / `--font-weight-semibold`, close button is borderless, `--font-size-xl`, `--color-text-secondary` → `--color-text` on hover.

### Toast / ToastContainer — `components/shared/Toast`, `components/shared/ToastContainer`

Container is fixed top-right at `var(--space-4)` inset, flex column with `gap: var(--space-2)`, `z-index: 200`, `max-width: 360px`. Toast variants should map to `--color-success`, `--color-warning`, `--color-destructive`, and `--color-primary` for info.

## Anti-patterns — Do Not

- ❌ **No inline `style={{ ... }}` on elements.** All styling goes through a `*.module.css` file.
- ❌ **No hardcoded color, spacing, radius, shadow, or font values.** Reference a token from `tokens.css`. If one doesn't exist, extend `tokens.css` first.
- ❌ **No global selectors in CSS Modules.** Do not use `:global`, element selectors, or tag-level rules inside component modules — scope to locals (camelCase classes). The only global CSS lives in `global.css` (resets) and `tokens.css` (variables).
- ❌ **No Tailwind, styled-components, emotion, or CSS-in-JS.** CSS Modules only.
- ❌ **Do not hardcode z-index.** Look up the layer in the Z-Index Hierarchy table, or add a new row before shipping.
- ❌ **Do not bypass shared primitives.** Reach for `Button`, `Input`, `Modal`, `Spinner`, `Toast` before authoring a new one.
- ❌ **Do not omit `data-testid` on interactive elements** (buttons, inputs, modals, list/card containers, form submits) — the E2E suite in `tests/e2e/` depends on them.
- ❌ **Do not invent size/variant names** that don't already exist in the component's prop union. If you need a new variant, add it intentionally and document it here.
