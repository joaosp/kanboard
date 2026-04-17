# Kanboard

Kanban board MVP. Email/password auth, then CRUD over **Boards → Lists → Cards** with role-based access (`admin` / `member`) per board. React SPA on `:3000`, Express JSON API on `:3001`, PostgreSQL via Prisma.

## Tech Stack

| Layer            | Tool                           | Version       |
| ---------------- | ------------------------------ | ------------- |
| Language         | TypeScript                     | 5.6.3 (strict) |
| Client framework | React + react-dom              | 18.3.1        |
| Client routing   | react-router-dom               | 6.28.0        |
| Client state     | Zustand                        | 5.0.1         |
| Client build     | Vite                           | 6.0.0         |
| Server framework | Express                        | 4.21.1        |
| ORM              | Prisma + @prisma/client        | 5.22.0        |
| Database         | PostgreSQL                     | 16-alpine     |
| Validation       | Zod                            | 3.23.8        |
| Auth             | jsonwebtoken + bcryptjs        | 9.0.2 / 2.4.3 |
| Server runtime   | tsx (watch mode)               | 4.19.2        |
| Unit tests       | Vitest + jsdom + RTL           | 2.1.5         |
| E2E tests        | Playwright (chromium only)     | 1.49.0        |
| Linter           | ESLint + @typescript-eslint    | 8.15.0        |

ESM throughout (`"type": "module"`). Path alias `@/*` → `src/client/*` (Vite + Vitest + tsconfig).

## Architecture

Two halves share `src/` and a single TypeScript project:

```
src/
├── server/                          # Express API on :3001 (tsx watch src/server/index.ts)
│   ├── index.ts                     # App bootstrap; mounts /api/auth, /api/boards, /api/lists, /api
│   ├── prisma.ts                    # Singleton PrismaClient
│   ├── middleware/
│   │   ├── auth.ts                  # requireAuth — Bearer JWT → req.user
│   │   ├── board-access.ts          # requireBoardMember(param) / requireBoardAdmin(param)
│   │   ├── validate.ts              # validate(schema) for body, validateParams(schema) for :params
│   │   └── errors.ts                # AppError + createAppError + errorHandler
│   ├── routes/                      # Thin handlers: validate → access check → service → res.json({ data })
│   │   ├── auth.ts                  # POST /register, POST /login
│   │   ├── boards.ts                # GET/POST/GET:id/PATCH:id/DELETE:id
│   │   ├── lists.ts                 # POST /:boardId/lists, PATCH/DELETE /lists/:id
│   │   └── cards.ts                 # POST /:listId/cards, GET/PATCH/DELETE /cards/:id
│   ├── services/                    # Pure Prisma calls; no Express types here
│   ├── schemas/                     # Zod schemas (one file per resource: body + params)
│   └── types/express.d.ts           # Augments Request with user?, boardId?
│
└── client/                          # SPA on :3000 (vite); /api proxies to :3001
    ├── main.tsx                     # createRoot + BrowserRouter
    ├── App.tsx                      # Routes wrapped in <AuthGuard><AppLayout>
    ├── api/
    │   ├── client.ts                # apiClient.get/post/patch/delete — injects Bearer from auth store
    │   └── {auth,boards,lists,cards}.ts
    ├── stores/                      # Zustand: auth, boards, cards, ui
    ├── hooks/                       # useAuth, useBoard, useBoards, useCards
    ├── components/
    │   ├── Auth/                    # LoginForm, RegisterForm, AuthGuard (Outlet gate)
    │   ├── Board/                   # BoardList, BoardView, BoardCard, BoardHeader, CreateBoardModal
    │   ├── Column/                  # ColumnView, ColumnHeader, AddCardForm
    │   ├── Card/                    # CardItem, CardModal
    │   ├── Layout/                  # AppLayout, Navbar
    │   └── shared/                  # Button, Input, Modal, Spinner, Toast, ToastContainer
    ├── styles/
    │   ├── tokens.css               # :root CSS variables — single source of truth for design
    │   └── global.css
    └── types/                       # User, Board, BoardMember, List, Card, ApiResponse<T>

prisma/
├── schema.prisma
├── migrations/                      # Prisma migration history
└── seed.ts                          # Seeds demo@example.com / admin@example.com (passwords: demo123 / admin123)

tests/
├── setup.ts                         # imports @testing-library/jest-dom/vitest
├── test-utils.tsx                   # renderWithRouter
├── unit/{components,middleware,services,stores}/
└── e2e/                             # Playwright specs
```

API response envelope is always `{ data: T }`. Errors are `{ error: string }` with HTTP status from `AppError.statusCode`.

## Data Model

Tables snake-cased via `@@map`; fields snake-cased via `@map`. UUID primary keys, all FKs `onDelete: Cascade`.

```
User (users)
  id, email UNIQUE, name, passwordHash, createdAt, updatedAt
  └── boards: BoardMember[]

Board (boards)
  id, name, createdAt, updatedAt
  ├── members: BoardMember[]
  └── lists: List[]

BoardMember (board_members)             ← join table with role
  PK (boardId, userId)
  role: "admin" | "member" (default "member")
  Index: idx_board_member_user (userId)

List (lists)
  id, boardId, name, position (Int), createdAt, updatedAt
  └── cards: Card[]
  Index: idx_list_board (boardId)

Card (cards)
  id, listId, title, description? (nullable), position (Int), createdAt, updatedAt
  Index: idx_card_list (listId)
```

`position: Int` orders lists within a board and cards within a list (sort `asc`). Board creator becomes the `admin` BoardMember (`board.service.ts:31`).

## Dev Commands

```bash
npm run dev              # concurrently: dev:server + dev:client
npm run dev:client       # vite (port 3000, proxies /api → 3001)
npm run dev:server       # tsx watch src/server/index.ts (port 3001)
npm run build            # tsc + vite build
npm run typecheck        # tsc --noEmit
npm run lint             # eslint . --ext .ts,.tsx
npm test                 # vitest run
npm run test:watch       # vitest
npm run test:e2e         # playwright test (auto-starts npm run dev)
npm run db:migrate       # prisma migrate dev
npm run db:seed          # tsx prisma/seed.ts
npm run db:reset         # prisma migrate reset --force (re-applies migrations + seed)
npm run db:studio        # prisma studio
```

Local bring-up:

```bash
docker compose up -d     # postgres:16-alpine on :5432 (kanboard/kanboard/kanboard)
cp .env.example .env     # DATABASE_URL, JWT_SECRET, PORT=3001
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

For DB inspection, prefer the MCP postgres server (`mcp__postgres__query`) over reading `schema.prisma` or running `psql` manually.

## Code Conventions

These are enforced by tooling or established by every file in the repo. Match the existing style.

**TypeScript**
- `strict: true`, plus `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`. Index access returns `T | undefined` — narrow with `as string` only after a Zod check (route handlers do this for `req.params.id`).
- `@typescript-eslint/no-explicit-any: error` — no `any`, anywhere.
- Unused vars/args must be prefixed with `_` to be ignored.

**Modules**
- **Named exports only.** No `export default`. Routers re-export as `export { router as boardsRouter }`.
- ESM imports; use `.ts` extensions only when required by a tool (e.g. `prisma/seed.ts` imports `'../src/server/prisma.ts'`).

**Server**
- Every route mounted on `/api/boards`, `/api/lists`, `/api` uses `requireAuth`. Only `/api/auth/*` is public.
- Validate before doing anything else: `validateParams(...)` for URL params, `validate(...)` for body. Both are thin Zod wrappers in `src/server/middleware/validate.ts`.
- After param validation, use `requireBoardMember('paramName')` or `requireBoardAdmin('paramName')` for board-scoped resources. For list/card routes that load the resource first to find the board, replicate the inline membership check in `src/server/routes/lists.ts` / `cards.ts`.
- Services contain only Prisma calls — no Express types. Never write raw SQL; use the Prisma client.
- Errors: `throw createAppError('message', 404)` and let the central `errorHandler` format the response. Don't `res.json({ error })` from handlers.
- Always wrap async handlers in `try/catch (err) { next(err) }`.
- `console`: only `warn` / `error` (others trigger an ESLint warning). Use `console.warn` for boot logs (`server/index.ts:26`).

**Client**
- React function components, named export, `.tsx` files.
- All HTTP through `apiClient` in `src/client/api/client.ts` — never call `fetch` directly. The client injects the Bearer token from the auth store and unwraps `{ data }`.
- State in Zustand stores under `src/client/stores/`. Cross-component side effects (modals, toasts) go through `useUiStore`.
- **CSS Modules only** (`*.module.css`, camelCase locals). Reference design tokens from `src/client/styles/tokens.css` (`var(--color-primary)`, `var(--space-4)`, etc.) — no hardcoded colors, fonts, or spacing. See `design-system.md` for the full token catalog, component patterns, and visual anti-patterns — it is the source of truth for anything design-related.
- `data-testid` on every interactive element (buttons, inputs, list/card containers, modals). E2E tests rely on these (see `tests/e2e/smoke.spec.ts`).

**Validation contract**
- Every API input passes through a Zod schema in `src/server/schemas/`. Body schemas are paired with `validate(...)`; `:param` schemas are paired with `validateParams(...)`. Add a schema even for one-field inputs.

**Tests**
- Live in `tests/`, never co-located with source.
- Unit tests: Vitest + jsdom + Testing Library. Globals enabled (`describe`, `it`, `vi` are ambient). Mock Prisma at the module boundary with `vi.mock('../../../src/server/prisma', () => ({ prisma: { ... } }))` before importing the service under test (see `tests/unit/services/board.service.test.ts`).
- Component tests mock the CSS module: `vi.mock('.../X.module.css', () => ({ default: { ... } }))`.
- E2E tests: Playwright, chromium only, baseURL `http://localhost:3000`. They drive the seeded `demo@example.com` / `demo123` user. The `webServer` config auto-starts `npm run dev`.

## Anti-patterns — Do Not

- ❌ Use `any` or `as any` to silence the type checker.
- ❌ Add `export default` to anything.
- ❌ Write raw SQL or use `prisma.$queryRaw` — use the typed query builder.
- ❌ Use inline `style={{...}}`, styled-components, Tailwind, or any styling other than CSS Modules + tokens.
- ❌ Hardcode color/spacing/typography values — extend `tokens.css` and reference the variable.
- ❌ Mount a route without `requireAuth` (anything outside `/api/auth/*`).
- ❌ Mutate a board/list/card resource without a board-membership check (middleware or inline).
- ❌ Accept request input without a Zod schema.
- ❌ Call `fetch` from a component or store — go through `apiClient`.
- ❌ Co-locate tests next to source. They live in `tests/unit/` or `tests/e2e/`.
- ❌ Use `console.log` (only `warn` / `error` are allowed).
- ❌ Skip `data-testid` on interactive elements.

## Feature Development Workflow

Each feature is planned and built on its own branch with a matching folder of artifacts under `tasks/`.

1. **Branch.** `git checkout -b feature/<slug>` from `main`. The slug is kebab-case and reused for the artifact folder.

2. **Plan in `tasks/<slug>/`.** Three documents are produced sequentially by the agent pipeline (see `.claude/agents/`):

   ```
   tasks/<slug>/
   ├── scope.md         # User story + acceptance criteria          (scope agent)
   ├── design.md        # UI specification: screens, components,     (design agent)
   │                    # tokens used, data-testid map, states
   └── architect.md     # Architecture spec: data model deltas,      (architect agent)
                        # API contract, file plan, phased rollout
   ```

   Each step builds on the prior file. Don't start the next stage until the previous artifact is checked in.

3. **Implement.** Follow the **phases** defined in `architect.md` in order. Within a phase, write code first, then tests, then run `npm run typecheck && npm run lint && npm test` before moving on. Do not invent scope outside the spec.

4. **Where code goes.** New code extends the existing layout — don't introduce parallel directory roots:

   | Concern                  | Location                                                   |
   | ------------------------ | ---------------------------------------------------------- |
   | New API endpoint         | `src/server/routes/` + `src/server/services/` + `src/server/schemas/` |
   | New middleware           | `src/server/middleware/`                                   |
   | Schema change            | `prisma/schema.prisma` + `npm run db:migrate`              |
   | New page / route         | `src/client/components/<Feature>/` + add `<Route>` in `src/client/App.tsx` |
   | New shared UI primitive  | `src/client/components/shared/<Name>/{Name.tsx,Name.module.css}` |
   | New client state         | `src/client/stores/<name>.ts`                              |
   | New API client wrapper   | `src/client/api/<name>.ts` (using `apiClient`)             |
   | New design token         | `src/client/styles/tokens.css`                             |

5. **Tests.**
   - Unit tests under `tests/unit/{components,middleware,services,stores}/` mirroring the source path.
   - E2E flows under `tests/e2e/` as `*.spec.ts`. They run against a live dev server seeded with the demo data.
   - At minimum: a service-layer unit test for new endpoints (with mocked Prisma) and an E2E happy-path covering the user story from `scope.md`.

6. **Pre-PR checklist.** `npm run typecheck && npm run lint && npm test && npm run test:e2e` all green; the artifacts in `tasks/<slug>/` are committed alongside the implementation.
