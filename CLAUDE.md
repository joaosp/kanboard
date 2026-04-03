# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kanboard is a Kanban board web application. It uses a split client/server architecture within a single repository.

## Commands

```bash
# Development (runs both client and server concurrently)
npm run dev

# Run only client (Vite on :3000) or server (Express on :3001)
npm run dev:client
npm run dev:server

# Build
npm run build          # tsc + vite build

# Type checking / Linting
npm run typecheck      # tsc --noEmit
npm run lint           # eslint .ts,.tsx

# Unit tests (vitest, jsdom)
npm run test           # run all once
npm run test:watch     # watch mode
npx vitest run tests/unit/services/board.service.test.ts   # single file

# E2E tests (Playwright, requires running app)
npm run test:e2e

# Database
docker compose up -d   # start PostgreSQL 16
npm run db:migrate     # prisma migrate dev
npm run db:seed        # tsx prisma/seed.ts
npm run db:reset       # reset + re-migrate
npm run db:studio      # Prisma Studio GUI
```

**Environment**: Copy `.env.example` to `.env` before first run.

## Architecture

### Tech Stack
- **Client**: React 18, Vite, React Router v6, Zustand (state), CSS Modules
- **Server**: Express, Prisma ORM, PostgreSQL 16, JWT auth (Bearer token)
- **Validation**: Zod schemas on all API endpoints
- **Testing**: Vitest + Testing Library (unit), Playwright (e2e)

### Source Layout

- `src/client/` — React frontend (path alias `@` maps here)
- `src/server/` — Express backend
- `prisma/` — Schema and migrations
- `tests/unit/` — Vitest unit tests (components, middleware, services, stores)
- `tests/e2e/` — Playwright specs

### Server Pattern (routes → services → Prisma)

Each domain has four files that follow a consistent pattern:
1. **Schema** (`src/server/schemas/*.schema.ts`) — Zod validation schemas
2. **Route** (`src/server/routes/*.ts`) — Express router with middleware chain: `requireAuth` → `validateParams` → `requireBoardMember/Admin` → `validate(bodySchema)` → handler
3. **Service** (`src/server/services/*.service.ts`) — Business logic using Prisma client
4. **Middleware** (`src/server/middleware/`) — `auth.ts` (JWT), `validate.ts` (Zod body/params), `board-access.ts` (role check), `errors.ts` (error handler)

### Client Pattern

- **API layer** (`src/client/api/`) — Thin wrappers around `apiClient` (fetch-based, auto-attaches Bearer token from auth store)
- **Stores** (`src/client/stores/`) — Zustand stores (auth, boards, cards, ui)
- **Hooks** (`src/client/hooks/`) — React hooks that bridge stores and API calls
- **Components** (`src/client/components/`) — Organized by domain (Auth, Board, Card, Column, Layout) plus `shared/` for reusables (Button, Input, Modal, Spinner, Toast)
- **Types** (`src/client/types/`) — TypeScript interfaces exported via barrel `index.ts`

### Data Model

`User` → `BoardMember` (role: admin/member) → `Board` → `List` (position-ordered) → `Card` (position-ordered). All IDs are UUIDs. Cascade deletes from parent to children.

### API Routes

All routes are prefixed with `/api`. The Vite dev server proxies `/api` to `localhost:3001`.
- `/api/auth` — register, login
- `/api/boards` — CRUD + nested list/card routes
- `/api/lists` — CRUD within a board
- `/api/lists/:listId/cards` — CRUD within a list

## Conventions

- **Named exports only** — no default exports
- **No `any`** — ESLint enforces `@typescript-eslint/no-explicit-any: error`
- **No console.log** — use `console.warn` or `console.error` (ESLint rule)
- **CSS Modules** with `camelCaseOnly` convention — every component gets a `.module.css` file
- **Strict TypeScript** — `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters` enabled
- **Unused vars**: prefix with `_` (e.g., `_unused`) to satisfy ESLint
- **Test files** live in `tests/` (not colocated), mirroring `src/` structure
- **Test utils**: use `renderWithRouter` from `tests/test-utils.tsx` for component tests

## Design System

All design tokens live in `src/client/styles/tokens.css` as CSS custom properties. Every component CSS file must reference tokens via `var(--*)` — no hardcoded colors, font sizes, spacing, or shadows.

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#2563eb` | Buttons, links, focus rings, brand accents |
| `--color-primary-hover` | `#1d4ed8` | Primary interactive hover state |
| `--color-primary-light` | `#dbeafe` | Subtle primary backgrounds |
| `--color-secondary` | `#64748b` | Secondary buttons, muted text |
| `--color-secondary-hover` | `#475569` | Secondary interactive hover state |
| `--color-destructive` | `#dc2626` | Delete actions, error states |
| `--color-destructive-hover` | `#b91c1c` | Destructive hover state |
| `--color-success` | `#16a34a` | Success toasts |
| `--color-warning` | `#d97706` | Warning indicators |
| `--color-background` | `#f8fafc` | Page background, column backgrounds |
| `--color-surface` | `#ffffff` | Cards, modals, navbar, form panels |
| `--color-border` | `#e2e8f0` | All borders (inputs, cards, dividers) |
| `--color-text` | `#0f172a` | Primary body text |
| `--color-text-secondary` | `#64748b` | Labels, metadata, muted text |
| `--color-text-inverse` | `#ffffff` | Text on colored backgrounds (buttons, toasts) |

### Typography Scale

Font family: `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

| Token | Size | Typical use |
|---|---|---|
| `--font-size-xs` | `0.75rem` (12px) | Badge counts, metadata timestamps |
| `--font-size-sm` | `0.875rem` (14px) | Labels, secondary text, small buttons |
| `--font-size-md` | `1rem` (16px) | Body text, inputs, default button |
| `--font-size-lg` | `1.125rem` (18px) | Card titles, modal titles |
| `--font-size-xl` | `1.25rem` (20px) | Board name, navbar brand |
| `--font-size-2xl` | `1.5rem` (24px) | Page headings (board list, auth forms) |
| `--font-size-3xl` | `1.875rem` (30px) | Hero/display text (reserved) |

Font weights: `--font-weight-normal` (400), `--font-weight-medium` (500), `--font-weight-semibold` (600), `--font-weight-bold` (700)

### Spacing Scale

4px base unit system (`1rem = 16px`):

| Token | Value | px |
|---|---|---|
| `--space-1` | `0.25rem` | 4 |
| `--space-2` | `0.5rem` | 8 |
| `--space-3` | `0.75rem` | 12 |
| `--space-4` | `1rem` | 16 |
| `--space-5` | `1.25rem` | 20 |
| `--space-6` | `1.5rem` | 24 |
| `--space-8` | `2rem` | 32 |
| `--space-10` | `2.5rem` | 40 |
| `--space-12` | `3rem` | 48 |
| `--space-16` | `4rem` | 64 |

### Border Radius

`--radius-sm` (4px), `--radius-md` (6px), `--radius-lg` (8px), `--radius-xl` (12px), `--radius-full` (pill)

### Shadows

- `--shadow-sm` — cards at rest, subtle elevation
- `--shadow-md` — card hover, toasts, form panels
- `--shadow-lg` — modals

### Transitions

- `--transition-fast` (150ms) — hover states, focus rings
- `--transition-normal` (200ms) — modal animations, toast slide-in

### Component Patterns

**Shared components** (`src/client/components/shared/`):

| Component | Variants / Props | Notes |
|---|---|---|
| `Button` | `variant`: primary, secondary, destructive; `size`: sm, md; `isLoading` | Extends `ButtonHTMLAttributes`. Accepts `className` for composition. |
| `Input` | `label`, `error` | `forwardRef`-based. Shows error text below input when `error` is set. |
| `Modal` | `isOpen`, `onClose`, `title` | Portal-rendered to `#root`. Closes on Escape and overlay click. |
| `Spinner` | `size`: sm (16px), md (24px), lg (40px) | Border-based CSS spinner. |
| `Toast` | `type`: success, error, info | Auto-dismisses after 3s. Managed by `useUiStore`. |
| `ToastContainer` | — | Fixed top-right. Renders all active toasts from UI store. |

**Recurring domain patterns:**
- **Card-like surfaces**: `background: var(--color-surface)`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-md/lg)`, `box-shadow: var(--shadow-sm)`, hover lifts to `--shadow-md`
- **Section headers**: flex row with `justify-content: space-between`, title + action button
- **Auth forms**: centered card (`max-width: 400px`), `--space-8` padding, `--radius-xl`, `--shadow-md`
- **Inline edit inputs**: match display text size/weight, `--color-primary` border on focus, `--radius-md`
- **Icon/action buttons**: `background: none; border: none; color: var(--color-text-secondary)`, hover changes color to `--color-primary` or `--color-destructive`
- **Column layout**: fixed width (`280px`), `max-height: calc(100vh - 180px)`, scrollable card list

### Anti-Patterns to Avoid

- **Hardcoded colors/sizes** — never use raw hex, px font sizes, or magic-number spacing; always reference `var(--*)`
- **Inline styles** — use CSS Modules; inline styles bypass the token system
- **New CSS custom properties** — add tokens to `tokens.css` if a new value is truly needed; don't define ad-hoc `--vars` in component files
- **Overriding shared components via global CSS** — compose with `className` prop or wrap; never target `.button` etc. from parent modules
- **Duplicating shared component styles** — use `Button`, `Input`, `Modal` etc. instead of re-implementing their patterns in domain components (e.g., `AddCardForm.input` should ideally use the `Input` component)
- **z-index escalation** — current layers: modal overlay (100), toast container (200); stay within this hierarchy
- **Missing hover/focus states** — all interactive elements need `:hover` and `:focus` transitions using token values
- **Skipping disabled states** — buttons must handle `:disabled` with `opacity: 0.6; cursor: not-allowed`

## Agentic Development

This repo includes custom agent definitions in `.claude/agents/` for a multi-phase development loop: `scope` → `architect` → `implement` → `review` → `security` → `release`. Each agent has specific constraints and output formats defined in its markdown file.
