# Lab Guide — AI-Driven Application Lifecycle Management

Welcome. This is your copy-paste handbook for the 4-hour lab block. Work through it top to bottom. Every command is meant to be run. Every prompt is meant to be pasted.

**What you'll build:** a new feature on Kanboard (a small Kanban app), using Claude Code as your development partner. You'll take the feature from a raw idea → user story → UI spec → architecture → Phase 1 code → AI review → security scan → E2E tests → PR → deployment plan.

**How to use this guide:**
- Read the short intro of each section, then copy-paste the commands / prompts in order
- Green commands (`bash`) run in your terminal
- Grey blocks (no language) are prompts you paste into the `claude` CLI
- Checkpoints at the end of each lab — don't skip them
- Stuck? Jump to [Troubleshooting](#troubleshooting) at the bottom

All lab examples use `card-labels` as the feature slug. You'll pick your own feature in Lab 2 — just replace `card-labels` with your slug everywhere.

---

## 0 · Pre-flight (10 min, do this first)

### 0.1 · Check your toolchain

```bash
node --version       # need >= 20
npm --version        # need >= 10
claude --version     # need >= 1.x
docker --version
gh --version
```

Missing something? Flag it to the instructor now.

### 0.2 · Clone and enter the practice repo

```bash
git clone https://github.com/joaosp/kanboard.git
cd kanboard
git checkout workshop-practice
npm install
```

`workshop-practice` is the pristine starter branch. It has the app code but no `CLAUDE.md`, no `.claude/`, no CI. You'll add those today.

### 0.3 · Bring up the database + dev server

```bash
docker compose up -d        # Postgres 16 on localhost:5432
npm run db:migrate          # apply existing Prisma migrations
npm run db:seed             # seed demo users + boards
npm run dev                 # dev server (keep this terminal open)
```

Open `http://localhost:3000`. Log in:

- **Email:** `demo@example.com`
- **Password:** `demo123`

You should see some seeded boards. If not, stop and raise your hand.

### 0.4 · Baseline green

In a **new terminal** (keep the dev server running in the first one):

```bash
cd kanboard
npm run lint           # 0 errors (some no-console warnings are OK)
npm run typecheck      # silent = pass
npm test               # 33 tests pass
```

All four terminals you'll want open today:

| # | Terminal for | Keep running |
|---|--------------|--------------|
| 1 | `npm run dev` | whole lab block |
| 2 | `claude` CLI sessions | swap agents in/out |
| 3 | git / npm / gh commands | ad-hoc |
| 4 | running tests / Prisma | ad-hoc |

---

## Lab 1 · Ecosystem Setup (60 min)

You'll turn the empty repo into an AI-ready workspace: a `CLAUDE.md`, a `.claude/settings.json`, and six specialized agents.

### 1.1 · Start Claude Code in the repo

```bash
claude
```

Leave this session open for the whole lab.

### 1.2 · Generate `CLAUDE.md` (20 min)

Paste this prompt:

```
Analyze this repository and generate a comprehensive CLAUDE.md file.

Examine:
1. package.json for tech stack and dependencies
2. Directory structure (run `find src -type f | head -50`) for architecture patterns
3. tsconfig.json for TypeScript settings
4. .eslintrc.cjs for code conventions
5. The scripts section in package.json for dev commands
6. prisma/schema.prisma for the data model
7. tests/ for testing patterns and frameworks
8. docker-compose.yml and .env.example for local environment

Output a CLAUDE.md file that covers:
- Project description (Kanboard, MVP with auth + boards/lists/cards CRUD)
- Complete tech stack table with versions
- Architecture overview with a directory map
- Data model summary (User, Board, BoardMember, List, Card + relationships)
- Code conventions extracted from linter configs and existing code
- All dev commands
- Important constraints and anti-patterns to avoid (no any, no default exports,
  no raw SQL, CSS Modules only, Zod on every input, requireAuth on every endpoint)

Write it to ./CLAUDE.md.
Be specific to THIS codebase. Extract actual patterns, not generic advice.
```

Read the result carefully. Check:

- Is the tech stack table accurate?
- Does the architecture section actually describe what's in `src/`?
- Are the dev commands real (not invented)?
- Are the conventions specific (not generic)?

**If the architecture section is too generic**, paste:

```
The architecture section is too generic. Look at how route handlers are
structured under src/server/routes/ (they call services in src/server/services/
which call Prisma). Describe the specific 3-layer pattern this project uses
(routes → services → Prisma) and cite one concrete example.
```

**Validate** by starting a fresh `claude` session and asking:

```
What is the data model for this project? How are boards, lists, and cards related,
and how does BoardMember gate access?
```

If it answers correctly, your `CLAUDE.md` is loading properly.

### 1.3 · Project settings + MCP (15 min)

```bash
mkdir -p .claude
```

In Claude Code:

```
Create a .claude/settings.json file for this project.

Based on package.json scripts and the tools in this repo, configure:

1. permissions.allow — allow-list the safe dev commands Claude can run
   without asking:
   - npm run lint, npm run typecheck, npm test, npm run test:e2e
   - npm run dev, npm run build
   - npm run db:migrate, npm run db:seed, npm run db:studio
   - npx prisma migrate dev, npx prisma generate
   - git status, git diff, git log, git branch, git checkout, git add, git commit
   - gh pr create, gh pr view

2. permissions.deny — block destructive operations:
   - rm -rf /*
   - git push --force
   - npm run db:reset
   - any curl/wget that isn't localhost

3. mcpServers — configure a PostgreSQL MCP server pointing to the local DB.
   DATABASE_URL is: postgresql://kanboard:kanboard@localhost:5432/kanboard
   Use @modelcontextprotocol/server-postgres.

Write to .claude/settings.json.
```

**Restart `claude`** after saving settings (important — settings only load on startup).

**Test permissions:**

```
Run the linter on this project.
```

Should execute `npm run lint` without prompting.

```
Delete the node_modules directory.
```

Should refuse or ask for approval.

**Test MCP (Postgres must be running):**

```
Using the postgres MCP server, list all tables and their row counts.
```

### 1.4 · Create the agent suite (15 min)

```bash
mkdir -p .claude/agents
```

Prompt:

```
Create the following agent files in .claude/agents/:

1. scope.md      — Product manager for user stories (no code, no implementation)
2. architect.md  — System architect: DB/API/UI/phases specs, no code
3. implement.md  — Senior developer: follows CLAUDE.md strictly, builds one phase
                   at a time, always runs npm run lint && typecheck && test after changes
4. review.md     — READ-ONLY code reviewer (tools: Read, Grep, Glob, Bash for
                   lint/typecheck/test only — NO Edit, NO Write)
5. security.md   — READ-ONLY security auditor focused on OWASP Top 10 (same tool
                   restrictions as review)
6. release.md    — Release manager: E2E tests, CI, PR creation via gh

Each agent file uses Markdown frontmatter (name, description, tools) then a body:
Role → Objective → Constraints → Process → Output Format.

Tailor every agent to Kanboard:
- Reference CLAUDE.md for conventions
- Use the project's exact commands (npm run lint/typecheck/test/test:e2e)
- Mention the stack (React 18, Express, Prisma, PostgreSQL, Zod, Vitest, Playwright)
```

**Test the scope agent** (fresh `claude` session):

```
/agents scope
```

```
Feature request: Add a due date to each card with an overdue indicator.
Context: Kanboard — boards, lists, cards, board members.
Produce a user story with 6-8 testable acceptance criteria, edge cases, out-of-scope,
and a complexity estimate. Do NOT write code.
```

Output should be a user story, not code.

**Test the review agent** refuses to modify files:

```
/agents review
Review src/server/routes/boards.ts for convention issues,
and also fix them by editing the file.
```

It should review but refuse the edit.

### 1.5 · Append the design system to `CLAUDE.md` (5 min)

```
Analyze the frontend design system in this project:
1. Read src/client/styles/tokens.css for CSS variables
2. Read src/client/styles/global.css for resets
3. Look at Button, Input, Modal, Card components for token usage patterns
4. Check vite.config.ts for CSS Modules configuration

APPEND a new "## Design System" section to CLAUDE.md with:
- Color tokens (names and hex values)
- Typography (families, sizes, weights)
- Spacing scale
- Radius scale
- Shadow scale
- Z-index hierarchy
- Component patterns (button variants, card, input, modal)
- Anti-patterns (no inline styles, no hardcoded colors, no global selectors)

Do NOT overwrite existing content — append only.
```

### 1.6 · Lab 1 checkpoint

- [ ] `CLAUDE.md` at repo root, covers stack / architecture / data model / conventions / commands / design system
- [ ] `.claude/settings.json` with allow-list, deny-list, and postgres MCP
- [ ] `.claude/agents/{scope,architect,implement,review,security,release}.md` all present
- [ ] Claude runs `npm run lint` without prompting
- [ ] Claude refuses destructive commands
- [ ] MCP query against Postgres works
- [ ] `scope` agent produces a story; `review` agent refuses to edit

**Commit your work:**

```bash
git add CLAUDE.md .claude/
git commit -m "Lab 1: configure Claude Code ecosystem"
```

---

## Lab 2 · Story → UI → Architecture (45 min)

Now pick a feature and run it through three planning agents. You'll produce three linked artifacts under `tasks/<slug>/`.

### 2.1 · Pick your feature

| # | Feature          | Slug           | Complexity |
|---|------------------|----------------|------------|
| 1 | Card Labels      | `card-labels`  | M          |
| 2 | Card Due Dates   | `due-dates`    | M          |
| 3 | Board Search     | `board-search` | S–M        |
| 4 | Card Attachments | `attachments`  | M–L        |
| 5 | Activity Log     | `activity-log` | M          |
| 6 | Card Checklists  | `checklists`   | M          |

**Don't pick the same feature as your immediate neighbor** — you'll cross-review each other later.

```bash
git checkout -b feature/card-labels          # replace card-labels with your slug
mkdir -p tasks/card-labels
```

### 2.2 · User story with the scope agent (15 min)

In Claude Code:

```
/agents scope
```

```
Feature request: "Card Labels — colored tags for categorizing cards.
A user can create labels on a board, attach multiple labels to any card,
and filter the board view by label."

Context: Kanboard — boards with lists and cards; board members share access.

Produce:
1. Summary paragraph (3-4 sentences)
2. User story in "As a … I want … so that …" format
3. 6-8 acceptance criteria, each a testable statement
4. Edge cases and errors (duplicate names, deletion with attached cards, color collisions)
5. Explicit out-of-scope items
6. Complexity estimate (S/M/L) with justification

Save to tasks/card-labels/scope.md
```

Read your story. Check every acceptance criterion: could a QA engineer write an automated test from it alone?

**If it's over-scoped** (very common), paste:

```
The scope is too large for one iteration. Split into:
- Story A: minimum viable (create, list, attach/detach — no filtering, 5 preset colors)
- Story B: enhancements (custom colors, filter-by-label, bulk operations)

Rewrite Story A with the tighter scope and save it to tasks/card-labels/scope.md.
```

**If an AC is vague**:

```
Acceptance criterion 3 is not testable as written. Rewrite it so a QA engineer
could build an automated test from it alone — include the precondition, the user
action, and the expected observable outcome.
```

### 2.3 · UI specification (10 min)

Stay in the same session (default agent, not scope):

```
Based on the user story at tasks/card-labels/scope.md, produce a UI specification.

1. List every screen or view that changes (BoardView, CardModal, etc.)
2. For each view: layout, components to add/modify, interactions
3. ASCII wireframes for the key views (show before/after if a view is modified)
4. Reference design-system tokens from CLAUDE.md (colors, spacing, radii)
5. Describe hover, loading, empty, and error states
6. Step-by-step user flow
7. Accessibility notes (keyboard focus order, aria-labels)

Save to tasks/card-labels/design.md
```

Refinement if a state is missing:

```
The wireframe for the label-picker doesn't show what happens when a board has
zero labels yet. Add the empty state with a "Create your first label" CTA and
describe the user flow for it.
```

### 2.4 · Architecture spec with the architect agent (15 min)

```
/agents architect
```

```
Read:
1. tasks/card-labels/scope.md
2. tasks/card-labels/design.md
3. CLAUDE.md for conventions
4. prisma/schema.prisma for current data model
5. src/server/routes/ for route patterns
6. src/server/services/ for service patterns
7. src/client/api/ for client API patterns

Produce an architecture specification saved to tasks/card-labels/architect.md with:

1. DATABASE CHANGES
   - New Prisma models (Label, CardLabel join table) with exact fields and relations
   - snake_case @@map / @map for all tables/columns
   - onDelete specified on every relation
   - The migration SQL the generator will produce
   - Required indexes

2. API ENDPOINTS
   - Method, path, request body, response shape
   - Auth: requireAuth + requireBoardMember (or requireBoardAdmin for destructive)
   - Zod schema per endpoint

3. FRONTEND COMPONENTS
   - New components with Props interfaces (named {Component}Props)
   - Modified existing components
   - Zustand store changes (which store, what selectors)
   - New entries in src/client/api/

4. IMPLEMENTATION PHASES (3, each independently deployable)
   - Phase 1: pure backend — schema + migration + service + routes + unit tests
   - Phase 2: core UI — label chip on card, picker in CardModal, manage-labels view
   - Phase 3: polish — keyboard shortcuts, optimistic updates, empty states

5. TECHNICAL DECISIONS
   - Library additions (aim for zero — justify any you need)
   - Pattern choices (e.g., join table vs. array column — explain why)

6. TEST STRATEGY
   - Unit tests per phase
   - E2E tests mapped 1:1 to acceptance criteria from scope.md
```

**Validate your spec — walk through this checklist:**

- [ ] Do the Prisma models match existing conventions (UUID id, snake_case `@@map`, `@default(now())`)?
- [ ] Do the API endpoints follow the pattern of `src/server/routes/cards.ts`?
- [ ] Is Phase 1 actually deployable without Phase 2 (backend-only, no UI dependency)?
- [ ] Is every acceptance criterion covered by at least one implementation item and at least one test?

### 2.5 · Cross-review (5 min)

Pair up with a neighbor on a **different** feature. Swap `tasks/<slug>/architect.md` files. In 2 minutes each, check:

1. Does it follow CLAUDE.md?
2. Are the DB changes backward-compatible?
3. Are the phases truly independent?
4. Is anything missing?

Give one concrete piece of feedback. Apply it if they're right.

### 2.6 · Lab 2 checkpoint

- [ ] `tasks/<slug>/scope.md`
- [ ] `tasks/<slug>/design.md` (wireframes + states + flow)
- [ ] `tasks/<slug>/architect.md` (DB + API + UI + 3 phases + tests)
- [ ] Peer feedback applied

**Commit:**

```bash
git add tasks/
git commit -m "Lab 2: story + UI spec + architecture for <slug>"
```

---

## Lab 3 · Implement + Review + Security (60 min)

Time to write code. You'll build **only Phase 1** (backend) using the `implement` agent, then run the read-only `review` and `security` agents against your diff.

### 3.1 · Implement Phase 1 (30 min)

Verify you're still on your feature branch:

```bash
git status          # should say "On branch feature/card-labels"
```

Start a fresh Claude session for this exercise:

```bash
claude
```

```
/agents implement
```

```
Read tasks/card-labels/architect.md.

Implement PHASE 1 ONLY. Do NOT proceed to Phase 2.

For each file you create or modify:
1. Follow every convention in CLAUDE.md (no any, named exports, async/await, Zod, requireAuth)
2. Match existing patterns exactly — look at src/server/routes/cards.ts and
   services/board.service.ts first
3. Write Vitest unit tests in tests/unit/ mirroring the src/ structure
4. After the Prisma model lands, run:
       npx prisma migrate dev --name add-card-labels
5. After code changes, run:
       npm run lint && npm run typecheck && npm test
   Fix any failures before continuing.

When done, report:
- Files created (with one-sentence purpose each)
- Files modified (what changed)
- Tests added (count and names)
- Any deviations from the architecture spec + justification
```

**Watch carefully** as it works. Things to catch:

| What to watch for | What to paste if it happens |
|-------------------|-----------------------------|
| File created in wrong directory | `That file should be in src/server/routes/, not src/routes/. Move it and update imports in src/server/index.ts.` |
| Missing Zod validation on a POST | `The POST /api/boards/:boardId/labels endpoint has no Zod validation. Add a createLabelSchema following the pattern in src/server/schemas/ and wire it via the validate middleware.` |
| Happy-path-only tests | `Your tests only cover the happy path. Add tests for missing required fields (400), invalid values, unauthorized (401 no token), forbidden (403 non-member), and not found (404 invalid boardId).` |
| Wrong style (e.g. `.then().catch()`) | `Existing route handlers use async/await with try/catch. Rewrite to match project convention.` |
| Uses `any` | `CLAUDE.md forbids `any`. Find the correct type or create an interface.` |

**Self-verify before the review:**

```bash
npm run lint
npm run typecheck
npm test
ls prisma/migrations/        # new migration directory present?
```

All four must be happy.

### 3.2 · AI code review (15 min)

**Open a fresh `claude` session** — a clean context is important for an honest review.

```bash
claude
```

```
/agents review
```

```
Review the feature/card-labels branch.

1. Read tasks/card-labels/scope.md and tasks/card-labels/architect.md
2. Run: git diff main..HEAD --stat      then: git diff main..HEAD
3. Read every file that was created or modified
4. Run: npm run lint
5. Run: npm run typecheck
6. Run: npm test
7. Check every diffed file against CLAUDE.md conventions

Produce a structured review:
- Verdict: APPROVE / REQUEST CHANGES / BLOCK
- Critical issues (must fix before merge) — cite file:line
- Warnings (should fix)
- Suggestions (nice to have)
- Test coverage assessment: map each acceptance criterion in scope.md to a test

Do NOT modify any files.
```

**If there are critical issues**, switch back to the implement agent:

```bash
claude
```

```
/agents implement
```

```
The review found these critical issues:
<paste the critical issues section>

Fix each one. After each fix, run lint + typecheck + tests before moving on.
```

Then re-run the review agent to verify.

### 3.3 · Security scan (10 min)

**Another fresh session:**

```bash
claude
```

```
/agents security
```

```
Perform a security audit on the feature/card-labels branch.

Check the diff against main and focus on:
1. Input validation — every new endpoint has Zod, every field has bounds
2. SQL injection — no raw SQL, no string interpolation into Prisma raw methods
3. Authorization — requireAuth on every new endpoint, requireBoardMember on
   board-scoped endpoints, requireBoardAdmin on destructive endpoints
4. IDOR — user's board membership verified before returning label data
5. XSS — user-controlled text is safely handled (React escapes by default;
   flag any dangerouslySetInnerHTML)
6. Error handling — responses don't leak Prisma errors or internal fields
7. Dependencies — run: npm audit --json | head -40
                  report any high or critical vulns

Verdict: PASS / CONDITIONAL / FAIL

Do NOT modify files.
```

**Fix findings** in an implement-agent session:

```
/agents implement
```

```
The security scan found these issues:
<paste findings>

Fix each. Use Zod schemas that mirror src/server/schemas/card.schema.ts
for any validation gaps.
```

### 3.4 · Cross-review (5 min)

Find a partner with a different feature:

```bash
git fetch
git checkout feature/<partner-slug>
git diff main..HEAD --stat
```

Give one piece of feedback the AI review missed — usually a UX or architectural blind spot. Then:

```bash
git checkout feature/card-labels
```

### 3.5 · Lab 3 checkpoint

- [ ] Phase 1 files under `src/server/` and `tests/unit/`
- [ ] New migration directory under `prisma/migrations/`
- [ ] `npm run lint` / `typecheck` / `test` — all pass
- [ ] Review agent: APPROVE (or all CRITICAL fixed)
- [ ] Security agent: PASS (or all HIGH+ fixed)
- [ ] One piece of human feedback received

**Commit:**

```bash
git add -A
git commit -m "Lab 3: implement <slug> Phase 1 (data layer + API + unit tests)"
```

---

## Lab 4 · Test, Ship, Integrate (60 min)

E2E tests → pre-push AI gate → CI pipeline → Pull Request → deployment safety.

### 4.1 · Plan and write E2E tests (20 min)

**Plan first** (start a fresh `claude` session):

```bash
claude
```

```
Read tasks/card-labels/scope.md.

For each acceptance criterion, define a Playwright E2E test case:
- Test name (reads like a requirement)
- Preconditions (logged-in user, board exists, etc.)
- Actions (click/type sequences)
- Assertions (what must be true at the end)

Output as a Markdown table. Do NOT write code yet.
```

Review the plan. Every AC should have ≥1 test; every test must be independent (no test depends on another).

**Now generate the tests:**

```
Now generate Playwright E2E tests based on the plan.

IMPORTANT: Phase 1 is backend-only — no UI exists yet. Use Playwright's
request context to test the API directly:

  test('creates a label via API', async ({ request }) => {
    const { token } = await login(request, 'demo@example.com', 'demo123');
    const res = await request.post('/api/boards/<id>/labels', {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'Bug', color: '#EF4444' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe('Bug');
  });

Write to tests/e2e/card-labels.spec.ts.

Rules:
1. API-level tests only — no UI selectors yet
2. Each test fully independent: arrange → act → assert → cleanup
3. Create tests/e2e/fixtures/test-helpers.ts if it doesn't exist, with:
     - login(request, email, password)   → { token, userId }
     - createBoard(request, token, name) → boardId
     - cleanupBoard(request, token, boardId)
4. Test success path + primary error paths (auth, validation, authorization)
5. Descriptive names. At least one expect() per test.
```

**Run the tests:**

```bash
# dev server must be running (Terminal 1)
npx playwright test tests/e2e/card-labels.spec.ts

# if something fails, debug:
npx playwright test --debug tests/e2e/card-labels.spec.ts
```

**Full suite green before moving on:**

```bash
npm run lint
npm run typecheck
npm test
npx playwright test
```

### 4.2 · Pre-push AI gate + CI pipeline (20 min)

**Generate the hook:**

```
Create a git pre-push hook that runs the review and security agents on
the diff about to be pushed. Two files:

1. scripts/hooks/pre-push
   - Bash, executable
   - Compute range: "$(git merge-base HEAD origin/main)..HEAD"
   - Run: claude --agent review --print "$diff"
   - Run: claude --agent security --print "$diff"
   - Print both outputs so the developer sees them
   - Block the push (exit 1) ONLY if either output contains a line starting
     with "BLOCKING:"
   - Otherwise exit 0

2. scripts/setup-hooks.sh
   - Bash, executable
   - Runs: git config core.hooksPath scripts/hooks
   - Prints "Hooks installed." and lists current hooks

Update the review and security agent prompts (in .claude/agents/) so they
emit "BLOCKING:" prefix for CRITICAL findings only.

Make both scripts executable with chmod +x.
```

**Install and try it:**

```bash
bash scripts/setup-hooks.sh
chmod +x scripts/hooks/pre-push

git push origin feature/card-labels
```

If it blocks, read the `BLOCKING:` lines, fix, push again. Emergency escape: `git push --no-verify` (use sparingly).

**Generate the CI pipeline:**

```
Create a GitHub Actions pipeline at .github/workflows/ci.yml.

Triggers: push to any branch, pull_request against main.

Four stages:

Stage 1 (parallel, fast checks):
- lint      → npm ci && npm run lint
- typecheck → npm ci && npm run typecheck
- unit      → npm ci && npm test -- --coverage
              upload coverage/ as artifact

Stage 2 (needs: [lint, typecheck, unit]):
- build → npm ci && npm run build
          upload dist/ as artifact

Stage 3 (needs: build):
- e2e
  - services: postgres:16-alpine with env POSTGRES_USER/PASSWORD/DB=kanboard
  - wait for Postgres health, then:
      npm ci
      cp .env.example .env
      export JWT_SECRET=ci-test-secret
      npx prisma migrate deploy
      npm run db:seed
      npx playwright install --with-deps chromium
      npm run dev &
      npx wait-on http://localhost:3000
      npx playwright test
  - upload playwright-report/ on failure

Stage 4 (needs: e2e, if: github.ref == 'refs/heads/main'):
- deploy-staging — placeholder echo step

Node 20 on ubuntu-latest. Timeout: 15 min for e2e, 10 min for others.

NOTE: AI review/security run in the LOCAL pre-push hook, NOT in CI.
Do NOT add any claude or anthropic-related steps to this workflow.
```

**Sanity-check with a partner:**

- [ ] Pre-push hook actually runs both agents
- [ ] `BLOCKING:` really blocks
- [ ] CI stages are ordered correctly
- [ ] No API keys / no Claude steps in CI
- [ ] Developers can bypass locally with `--no-verify`

### 4.3 · Open a pull request (10 min)

```bash
git add -A
git status
git commit -m "Lab 4: add E2E tests, pre-push AI gate, CI pipeline"
git push origin feature/card-labels
```

```
Create a pull request for feature/card-labels targeting main. Use gh CLI.

PR title: short, under 72 chars, describes the feature.

PR body (Markdown):

## Summary
1-2 sentences: what this PR does and why.

## Implemented (Phase 1)
- Bullet list of each file touched with one-sentence purpose
- Reference tasks/card-labels/architect.md

## Not implemented (later phases)
- Phase 2: UI (CardModal label picker, chip rendering)
- Phase 3: polish (keyboard shortcuts, optimistic updates)

## Testing
- Unit: X tests (list) — all pass
- E2E: Y tests (API-level) — all pass
- Lint + typecheck — pass

## Database
- New migration: add-card-labels
- Adds labels, card_labels tables. Backward-compatible (additive only).
- Run: npx prisma migrate deploy

## Manual test plan
- [ ] POST /api/boards/:id/labels with valid body → 201
- [ ] POST without auth → 401
- [ ] POST as non-member → 403
- [ ] GET /api/boards/:id/labels → only that board's labels

Create with: gh pr create --title "…" --body "…"
```

```bash
gh pr view --web
```

### 4.4 · Deployment dry-run (10 min)

**Migration safety:**

```
Review the Prisma migration at prisma/migrations/<timestamp>_add_card_labels/migration.sql.

Classify as SAFE / NEEDS REVIEW / DANGEROUS:
1. Adds NOT NULL columns without a default on existing tables? (DANGEROUS)
2. Drops columns or tables? (DANGEROUS — needs multi-step migration)
3. Adds indexes that could lock large tables? (NEEDS REVIEW — consider CONCURRENTLY)
4. Backward-compatible with code running in production before deploy? (must be YES)

Verdict + reasoning.
```

**Rollback plan:**

```
Draft the rollback plan for this deployment:

1. Down-migration SQL to reverse add-card-labels
2. Is the previous code (main) compatible with the new schema post-rollback?
3. Monitoring to watch after deploy:
   - API 4xx/5xx rates on /api/boards/:id/labels
   - DB query latency on labels / card_labels
   - Error log for Prisma errors containing "label"
4. Blast radius if this feature breaks
```

### 4.5 · Lab 4 checkpoint

- [ ] `tests/e2e/<slug>.spec.ts` — all pass
- [ ] `scripts/hooks/pre-push` + `scripts/setup-hooks.sh` (executable)
- [ ] Review + security agents emit `BLOCKING:` for critical findings
- [ ] `.github/workflows/ci.yml` with 4 stages, no Claude steps
- [ ] PR created on GitHub with full description
- [ ] Migration classified + rollback plan documented

**Final commit:**

```bash
git add -A
git commit -m "Lab 4: E2E + pre-push AI gate + CI pipeline + PR + deployment plan"
git push origin feature/card-labels
```

---

## What you built today

On `feature/<slug>`:

```
CLAUDE.md                                    # Lab 1
.claude/settings.json                        # Lab 1
.claude/agents/                              # Lab 1 — six agents
tasks/<slug>/scope.md                        # Lab 2
tasks/<slug>/design.md                       # Lab 2
tasks/<slug>/architect.md                    # Lab 2
src/server/routes/<slug>.ts                  # Lab 3
src/server/services/<slug>.service.ts        # Lab 3
src/server/schemas/<slug>.schema.ts          # Lab 3
prisma/schema.prisma                         # modified
prisma/migrations/…_add_<slug>/              # Lab 3
tests/unit/services/<slug>.service.test.ts   # Lab 3
tests/e2e/<slug>.spec.ts                     # Lab 4
tests/e2e/fixtures/test-helpers.ts           # Lab 4
scripts/hooks/pre-push                       # Lab 4
scripts/setup-hooks.sh                       # Lab 4
.github/workflows/ci.yml                     # Lab 4
Open PR on GitHub                            # Lab 4
```

The 7-step loop you just ran:

1. **Story** — `scope` agent → `tasks/<slug>/scope.md`
2. **UI** — default agent → `tasks/<slug>/design.md`
3. **Architecture** — `architect` agent → `tasks/<slug>/architect.md`
4. **Implement** — `implement` agent → Phase 1 code + unit tests
5. **Review** — `review` agent (read-only)
6. **Security** — `security` agent (read-only)
7. **Ship** — E2E + pre-push gate + CI + PR + deployment plan

---

## Monday-morning playbook

1. Pick one small feature on a real project at work
2. Write a `CLAUDE.md` for it (≈30 min)
3. Configure `.claude/settings.json` with permissions + any MCP servers (≈15 min)
4. Create the six agents (≈20 min — most of Kanboard's can be copy-adapted)
5. Run the loop on the feature (2–3 h)
6. Iterate: refine `CLAUDE.md` and agents based on what worked

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `claude` command not found | `npm i -g @anthropic-ai/claude-code` |
| `docker compose up` fails with port conflict on 5432 | `docker ps` → stop the other Postgres, or change port in `docker-compose.yml` and `.env` |
| Prisma migration hangs | Check `.env` has `DATABASE_URL=postgresql://kanboard:kanboard@localhost:5432/kanboard` |
| Playwright tests: "connection refused" | Dev server not running — `npm run dev` in Terminal 1, then re-run |
| Agent refuses a command you need | Add it to `permissions.allow` in `.claude/settings.json`, then restart `claude` |
| Review/security agent modified a file | Edit its frontmatter `tools:` — only `Read, Grep, Glob, Bash` (remove `Edit`, `Write`) |
| MCP postgres errors on start | Is Postgres running? `docker ps` — container should be `kanboard-db` |
| `git push` rejected by pre-push hook | Read the `BLOCKING:` lines, fix, push again. Emergency bypass: `git push --no-verify` |
| Unit tests can't find a Prisma type | `npx prisma generate` after schema changes |
| "Want to start over from scratch" | `git checkout workshop-practice && git clean -fd && npm install` |
| Everything is on fire | Raise your hand |

---

## Copy-paste cheat sheet

```bash
# Startup
cd kanboard
git checkout workshop-practice
npm install
docker compose up -d
npm run db:migrate && npm run db:seed
npm run dev

# Claude sessions
claude
/agents scope        # or architect / implement / review / security / release

# Self-verify loop (run this a lot)
npm run lint && npm run typecheck && npm test

# E2E
npx playwright test
npx playwright test --debug path/to/spec.ts

# Git flow
git checkout -b feature/<slug>
git add -A
git commit -m "…"
git push origin feature/<slug>
gh pr create --title "…" --body "…"
gh pr view --web

# Reset if needed
git checkout workshop-practice && git clean -fd && npm install
```

Good luck — and ask questions loudly.
