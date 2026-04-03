# Kanboard

A Kanban board application for managing projects with boards, lists, and cards. Supports multi-user collaboration with role-based board membership (admin/member).

**Status**: MVP — core CRUD for boards, lists, cards, and auth is implemented. No drag-and-drop, no real-time updates, no notifications yet.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 18 |
| Bundler | Vite | 6 |
| Language | TypeScript (strict) | 5.6 |
| Styling | CSS Modules + design tokens | — |
| State | Zustand | 5 |
| Routing | React Router | 6 |
| Backend | Express | 4 |
| ORM | Prisma | 5.22 |
| Database | PostgreSQL | 16 (Alpine, via Docker) |
| Validation | Zod | 3 |
| Auth | JWT (Bearer token) + bcryptjs | — |
| Unit Tests | Vitest + Testing Library | — |
| E2E Tests | Playwright | — |
| Package Manager | npm (lockfile present); pnpm also available | — |

## Architecture

```
src/
├── client/                    # React SPA
│   ├── api/                   # API client (fetch wrapper with auth headers)
│   │   ├── client.ts          # Generic request() with Bearer token injection
│   │   ├── auth.ts            # login/register API calls
│   │   ├── boards.ts          # board CRUD
│   │   ├── cards.ts           # card CRUD
│   │   └── lists.ts           # list CRUD
│   ├── components/
│   │   ├── Auth/              # LoginForm, RegisterForm, AuthGuard
│   │   ├── Board/             # BoardCard, BoardHeader, BoardList, BoardView, CreateBoardModal
│   │   ├── Card/              # CardItem, CardModal
│   │   ├── Column/            # AddCardForm, ColumnHeader, ColumnView
│   │   ├── Layout/            # AppLayout, Navbar
│   │   └── shared/            # Button, Input, Modal, Spinner, Toast, ToastContainer
│   ├── hooks/                 # useAuth, useBoard, useBoards, useCards
│   ├── stores/                # Zustand stores: auth, boards, cards, ui
│   ├── styles/
│   │   ├── global.css         # CSS reset + base styles
│   │   └── tokens.css         # Design tokens (colors, typography, spacing, radii, shadows)
│   ├── types/                 # TypeScript interfaces (User, Board, Card, List, ApiResponse)
│   ├── App.tsx                # Route definitions
│   └── main.tsx               # Entry point (BrowserRouter + App)
│
├── server/                    # Express API
│   ├── middleware/
│   │   ├── auth.ts            # requireAuth (JWT verification)
│   │   ├── board-access.ts    # requireBoardMember, requireBoardAdmin
│   │   ├── errors.ts          # AppError class + errorHandler
│   │   └── validate.ts        # Zod body/params validation middleware
│   ├── routes/                # Express routers (auth, boards, lists, cards)
│   ├── schemas/               # Zod schemas for request validation
│   ├── services/              # Business logic (Prisma queries)
│   ├── types/express.d.ts     # Express Request augmentation (user, boardId)
│   ├── prisma.ts              # Singleton PrismaClient
│   └── index.ts               # App bootstrap, route mounting, middleware
│
prisma/
├── schema.prisma              # Data model: User, Board, BoardMember, List, Card
├── seed.ts                    # Demo data (2 users, 2 boards with lists/cards)
└── migrations/                # SQL migrations

tests/
├── setup.ts                   # Vitest setup (jest-dom matchers)
├── test-utils.tsx             # renderWithRouter helper
├── unit/
│   ├── components/            # Button, Input, Modal tests
│   ├── middleware/             # auth, validate middleware tests
│   ├── services/              # board.service, auth.service tests
│   └── stores/                # auth, boards store tests
└── e2e/                       # Playwright specs (smoke, full-spec, rename-bug)

.claude/agents/                # Claude Code agent definitions
├── scope.md                   # Product manager (user stories)
├── design.md                  # UI/UX designer (visual specs + Pencil mockups)
├── architect.md               # System architect (technical specs)
├── implement.md               # Senior developer (phase-by-phase implementation)
├── review.md                  # Code reviewer (read-only)
├── security.md                # Security auditor (read-only)
└── release.md                 # Release manager (E2E, CI, PR)

scripts/hooks/
└── pre-push-review.sh         # AI-powered pre-push review + security scan
```

### Data Model

```
User ──< BoardMember >── Board ──< List ──< Card
```

- **User**: id (uuid), email (unique), name, passwordHash
- **Board**: id (uuid), name
- **BoardMember**: composite PK (boardId, userId), role ("admin" | "member")
- **List**: id (uuid), boardId (FK), name, position (int, for ordering)
- **Card**: id (uuid), listId (FK), title, description (optional), position (int)

All tables use snake_case column names via `@@map` / `@map`. Prisma models use camelCase.

### API Structure

All endpoints under `/api`. Auth via Bearer token in Authorization header.

- `POST /api/auth/register` — create account
- `POST /api/auth/login` — get JWT
- `GET /api/boards` — list user's boards (requireAuth)
- `POST /api/boards` — create board (requireAuth)
- `GET /api/boards/:id` — get board with lists/cards/members (requireAuth + requireBoardMember)
- `PATCH /api/boards/:id` — rename board (requireAuth + requireBoardAdmin)
- `DELETE /api/boards/:id` — delete board (requireAuth + requireBoardAdmin)
- Lists and cards follow the same pattern with board membership checks

### Client Routes

| Path | Component | Auth |
|------|-----------|------|
| `/login` | LoginForm | No |
| `/register` | RegisterForm | No |
| `/boards` | BoardList | AuthGuard |
| `/boards/:boardId` | BoardView | AuthGuard |
| `*` | Redirect to /boards | — |

## Dev Commands

```bash
# Start both client (Vite :3000) and server (Express :3001)
npm run dev

# Start individually
npm run dev:client          # Vite dev server on port 3000
npm run dev:server          # Express with tsx watch on port 3001

# Build
npm run build               # tsc + vite build

# Quality
npm run typecheck           # tsc --noEmit
npm run lint                # eslint .ts,.tsx files

# Tests
npm test                    # vitest run (unit tests)
npm run test:watch          # vitest in watch mode
npm run test:e2e            # playwright test

# Database
npm run db:migrate          # prisma migrate dev
npm run db:seed             # tsx prisma/seed.ts
npm run db:reset            # prisma migrate reset --force (destructive)
npm run db:studio           # prisma studio GUI
```

### Database Setup

```bash
docker compose up -d        # Start PostgreSQL 16
cp .env.example .env        # DATABASE_URL, JWT_SECRET, PORT
npm run db:migrate           # Apply migrations
npm run db:seed              # Seed demo data
```

**Seed users**: `demo@example.com` / `demo123`, `admin@example.com` / `admin123`

## Code Conventions

### TypeScript
- **Strict mode** with `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`
- **No `any`** — `@typescript-eslint/no-explicit-any` is set to `error`
- **No unused vars** — underscore prefix `_` is allowed for intentionally unused params
- **Named exports only** — no default exports
- **ES Modules** — `"type": "module"` in package.json
- **Target**: ES2022
- **Path alias**: `@/*` maps to `./src/client/*`

### Backend
- **Async/await** everywhere — no `.then()` chains
- **Zod validation** on all request bodies and params
- **`requireAuth`** middleware on every endpoint (except `/api/auth/*`)
- **Board access** middleware (`requireBoardMember` / `requireBoardAdmin`) on board-scoped endpoints
- **Prisma ORM only** — no raw SQL
- **UUID primary keys** on all models
- **Service layer** pattern: routes call services, services call Prisma
- **Error handling**: throw `AppError(message, statusCode)` for operational errors; `errorHandler` middleware catches all

### Frontend
- **CSS Modules** for all styling — no inline styles, no global class selectors
- CSS Modules configured with `camelCaseOnly` convention in Vite
- **Design tokens** in `src/client/styles/tokens.css` — always use CSS variables, never hardcode colors/spacing/typography
- **Zustand** for state management — one store per domain (auth, boards, cards, ui)
- **`data-testid`** attributes on all interactive elements
- **Shared components**: `Button`, `Input`, `Modal`, `Spinner`, `Toast` — reuse before creating new ones

### Design Tokens

Colors: `--color-primary`, `--color-primary-hover`, `--color-primary-light`, `--color-secondary`, `--color-destructive`, `--color-success`, `--color-warning`, `--color-background`, `--color-surface`, `--color-border`, `--color-text`, `--color-text-secondary`, `--color-text-inverse`

Typography: `--font-size-{xs,sm,md,lg,xl,2xl,3xl}`, `--font-weight-{normal,medium,semibold,bold}`

Spacing: `--space-{1,2,3,4,5,6,8,10,12,16}`

Radii: `--radius-{sm,md,lg,xl,full}`

Shadows: `--shadow-{sm,md,lg}`

Transitions: `--transition-{fast,normal}`

Z-index hierarchy: modal overlay (100), toast container (200)

### Testing
- **Unit tests**: Vitest + jsdom + Testing Library + jest-dom matchers
- **E2E tests**: Playwright (Chromium only, `tests/e2e/`)
- Test files live in `tests/` (not co-located with source)
- Unit tests mock Prisma and CSS Modules via `vi.mock()`
- `renderWithRouter` helper wraps components in BrowserRouter
- E2E tests use `data-testid` selectors exclusively — never CSS classes

### ESLint Rules
- `eslint:recommended` + `@typescript-eslint/recommended` + `react-hooks/recommended`
- `no-console`: warn (except `console.warn` and `console.error`)
- `@typescript-eslint/no-explicit-any`: error
- `@typescript-eslint/no-unused-vars`: error (prefix `_` to silence)

## Anti-Patterns (Do Not)

- Do NOT use `any` — find the correct type or define an interface
- Do NOT use default exports — always use named exports
- Do NOT use inline styles — use CSS Modules
- Do NOT hardcode colors, spacing, or typography — use design tokens
- Do NOT write raw SQL — use Prisma client methods
- Do NOT skip `requireAuth` middleware on API endpoints
- Do NOT skip Zod validation on request inputs
- Do NOT use `.then()` chains — use async/await
- Do NOT use `console.log` — use `console.warn` or `console.error`
- Do NOT create components without `data-testid` on interactive elements
- Do NOT introduce new shared components without checking if an existing one (`Button`, `Input`, `Modal`, `Spinner`, `Toast`) already covers the need

## Agentic Workflow

This project uses a structured agent pipeline for feature development:

1. **scope** — Define user story and acceptance criteria (`tasks/<slug>/scope.md`)
2. **design** — Create UI spec with wireframes and token usage (`tasks/<slug>/design.md`); optionally produce Pencil mockups in `.pen` files
3. **architect** — Design technical spec with phases (`tasks/<slug>/architect.md`)
4. **implement** — Build one phase at a time, validate with lint/typecheck/tests
5. **review** — Read-only code review (bugs, security, conventions)
6. **security** — Read-only security audit (OWASP Top 10)
7. **release** — E2E tests, CI validation, PR creation

Task artifacts live in `tasks/<slug>/` directories.

## MCP Servers

- **postgres**: Direct database queries via `@modelcontextprotocol/server-postgres`
- **pencil**: Visual design editor for `.pen` files (mockups and design screens)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://kanboard:kanboard@localhost:5432/kanboard?schema=public` |
| `JWT_SECRET` | Secret for signing JWTs | `change-me-in-production` |
| `PORT` | Express server port | `3001` |
