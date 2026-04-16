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

**Your personal branch:** Everyone works off their own branch so we don't get conflicting commits. Use your name or initials as a prefix — e.g. `workshop/joao`, `workshop/maria`. You'll create this in step 0.2 below.

---

## 0 · Pre-flight (10 min, do this first)

### 0.1 · Check your toolchain

```bash
node --version
npm --version
claude --version
docker --version
gh --version
```

Required versions: Node ≥ 20, npm ≥ 10, Claude Code ≥ 1.x. Missing or too old? Flag it to the instructor now.

### 0.2 · Clone and create your personal branch

```bash
git clone https://github.com/joaosp/kanboard.git
cd kanboard
git checkout workshop-practice
git checkout -b workshop/YOUR-NAME
npm install
```

Replace `YOUR-NAME` with your name or initials (e.g. `workshop/joao`). This branches off the pristine starter so everyone starts with the same baseline but pushes to their own branch. All Lab 1 commits go here. In Lab 2 you'll branch again for your feature (`feature/card-labels`).

### 0.3 · Bring up the database + dev server

```bash
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

That brings up Postgres 16 on `localhost:5432`, applies the existing Prisma migrations, seeds demo users and boards, and starts the dev server. Keep this terminal open for the whole lab.

Open `http://localhost:3000`. Log in:

- **Email:** `demo@example.com`
- **Password:** `demo123`

You should see some seeded boards. If not, stop and raise your hand.

### 0.4 · Baseline green

In a **new terminal** (keep the dev server running in the first one):

```bash
cd kanboard
npm run lint
npm run typecheck
npm test
```

Expected: `npm run lint` reports 0 errors (some `no-console` warnings are fine), `npm run typecheck` produces no output, `npm test` shows 33 passing tests.

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
- A "Feature Development Workflow" section that documents these conventions:
  - Each feature lives on a branch named feature/<slug>
  - All planning artifacts go under tasks/<slug>/ with this structure:
      tasks/<slug>/scope.md       — user story (produced by scope agent)
      tasks/<slug>/design.md      — UI specification (produced by design agent)
      tasks/<slug>/architect.md   — architecture spec (produced by architect agent)
  - Implementation follows the architecture spec's phases
  - New source code goes under the existing src/ structure
  - New tests go under tests/unit/ and tests/e2e/

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

### 1.3 · Project settings (10 min)

```bash
mkdir -p .claude
```

In Claude Code:

```
Create a .claude/settings.json file for this project.

Based on package.json scripts and the tools in this repo, configure ONLY
permissions (do NOT include an mcpServers block — MCP goes in a separate
file, see next step).

1. permissions.allow — allow-list the safe dev commands Claude can run
   without asking:
   - npm run lint, npm run typecheck, npm test, npm run test:e2e
   - npm run dev, npm run build
   - npm run db:migrate, npm run db:seed, npm run db:studio
   - npx prisma migrate dev, npx prisma generate
   - git status, git diff, git log, git branch, git checkout, git add, git commit
   - gh pr create, gh pr view

2. permissions.deny — block destructive operations. Cover both flag orderings
   so the matcher can't be bypassed:
   - rm -rf / and rm -rf /*
   - git push --force*, git push -f*, git push * --force*, git push * -f*
   - npm run db:reset*, prisma migrate reset*, npx prisma migrate reset*
   - curl *, wget *

Write to .claude/settings.json.
```

**Restart `claude`** after saving (settings only load on startup). Exit the session and run `claude` again.

**Test permissions:**

```
Run the linter on this project.
```

Should execute `npm run lint` without prompting.

```
Delete the node_modules directory.
```

Should refuse or ask for approval.

### 1.4 · Connect the Postgres MCP server (5 min)

MCP servers do **not** live in `.claude/settings.json` — they go in a project-level `.mcp.json`. The cleanest way to create it is the CLI. Open a new terminal in the kanboard folder and run:

```bash
claude mcp add postgres -s project -- npx -y @modelcontextprotocol/server-postgres postgresql://kanboard:kanboard@localhost:5432/kanboard
```

That writes `.mcp.json` at the repo root. Verify:

```bash
cat .mcp.json
```

You should see the `postgres` server with `command: npx` and the local `DATABASE_URL`.

**Restart your `claude` session** (exit and relaunch — MCP servers only load on startup).

Check the server connected:

```
/mcp
```

`postgres` should be listed as connected.

**Now test the MCP query** (Postgres must be running via `docker compose up -d`):

```
Using the postgres MCP server, list all tables and their row counts.
```

Claude should call `mcp__postgres__query` directly instead of offering to shell out to `psql`.

> **Gotcha:** if you ever change `DATABASE_URL` in `.env`, update `.mcp.json` to match. The connection string is embedded in the MCP server command.

### 1.5 · Create the agent suite (15 min)

```bash
mkdir -p .claude/agents
```

Prompt:

```
Create 7 agent files in .claude/agents/. Each file uses Markdown frontmatter
(name, description, tools) and a body with: Role → Objective → Constraints →
Process → Output Format.

The agents must be AUTONOMOUS — when a user gives them a feature name, they
should know what to read, what to produce, and where to save it without the
user spelling out paths or steps. Every agent should:
- Read CLAUDE.md on startup for project conventions
- Infer the feature <slug> from the current branch name (git branch --show-current,
  strip the feature/ prefix), or ask the user if not on a feature branch
- Know the tasks/<slug>/ directory is where all planning artifacts live
- Create tasks/<slug>/ with mkdir -p if it doesn't exist

IMPORTANT: the frontmatter "tools" list controls what the agent can do at
runtime. If it needs to save files, it MUST have Write and Edit. Without
them, the agent generates output but can't persist it.

Here are the 7 agents. For each one I describe the role, what it reads, what
it produces, where it saves, and key behaviors:

1. scope.md — Product Manager
   Tools: Read, Grep, Glob, Write, Edit, Bash
   Reads: CLAUDE.md (project context, data model), any existing tasks/<slug>/ files
   Produces: user story with summary, persona, user story format, 5-8 testable
     acceptance criteria, edge cases, out-of-scope items, complexity estimate
   Saves to: tasks/<slug>/scope.md
   Key behaviors: never writes code. Challenges vague requirements. Splits
     over-scoped features into iterations. Each AC must be independently
     testable by a QA engineer.

2. design.md — UI/UX Designer
   Tools: Read, Grep, Glob, Write, Edit, Bash
   Reads: tasks/<slug>/scope.md, CLAUDE.md (design system section — tokens,
     component patterns, anti-patterns)
   Produces: UI specification with screens/views affected, ASCII wireframes
     (before/after), component inventory, user flow, hover/loading/empty/error
     states, accessibility notes, design-token references
   Saves to: tasks/<slug>/design.md
   Key behaviors: never writes code. References design system tokens by name
     (var(--color-primary), var(--space-4), etc.). Covers every AC from
     scope.md in the UI. Flags if an AC has no clear UI representation.

3. architect.md — System Architect
   Tools: Read, Grep, Glob, Write, Edit, Bash
   Reads: tasks/<slug>/scope.md, tasks/<slug>/design.md, CLAUDE.md,
     prisma/schema.prisma, existing routes/services/schemas patterns
   Produces: architecture specification covering database changes (Prisma models,
     migration, indexes), API endpoints (method, path, body, response, auth,
     validation), frontend components (new + modified, props, store changes),
     implementation phases (3 phases, each independently deployable — Phase 1
     is pure backend), technical decisions, and test strategy (unit + E2E
     mapped to acceptance criteria)
   Saves to: tasks/<slug>/architect.md
   Key behaviors: never writes code. Follows existing patterns exactly (checks
     how routes/cards.ts, board.service.ts, card.schema.ts are structured and
     replicates). Phase 1 must be deployable without Phase 2.

4. implement.md — Senior Developer
   Tools: Read, Grep, Glob, Write, Edit, Bash (full access)
   Reads: tasks/<slug>/architect.md for the current phase, CLAUDE.md for
     conventions, existing source code for patterns to match
   Produces: working code + tests for one phase at a time
   Key behaviors:
     - Reads architect.md and implements ONLY the phase the user requests
     - Before writing code, reads 2-3 existing files of the same type to
       match the project's patterns exactly
     - After every set of changes, runs: npm run lint && npm run typecheck && npm test
     - Fixes any failures before moving on
     - Writes unit tests in tests/unit/ mirroring the src/ structure
     - Reports what was created, modified, and tested when done
     - Follows every constraint in CLAUDE.md (no any, named exports,
       Zod validation, requireAuth, CSS Modules, etc.)

5. review.md — Code Reviewer (READ-ONLY)
   Tools: Read, Grep, Glob, Bash (NO Edit, NO Write)
   Reads: tasks/<slug>/scope.md and architect.md (to know intent), git diff
     for changed files, CLAUDE.md for conventions
   Produces: structured review with verdict (APPROVE / REQUEST CHANGES / BLOCK),
     critical issues (file:line), warnings, suggestions, and a test-coverage
     matrix mapping each AC to a test
   Key behaviors: NEVER modifies files. Runs npm run lint, typecheck, test
     as part of the review. Checks every changed file against CLAUDE.md
     conventions. Emits "BLOCKING:" prefix on critical findings only.

6. security.md — Security Auditor (READ-ONLY)
   Tools: Read, Grep, Glob, Bash (NO Edit, NO Write)
   Reads: git diff for changed files, CLAUDE.md for conventions
   Produces: security assessment with verdict (PASS / CONDITIONAL / FAIL)
     covering input validation, SQL injection, authorization, IDOR, XSS,
     error information leakage, and dependency vulnerabilities (npm audit)
   Key behaviors: NEVER modifies files. Runs npm audit. Checks every new
     endpoint for Zod validation + requireAuth + board membership checks.
     Emits "BLOCKING:" prefix on critical findings only.

7. release.md — Release Manager
   Tools: Read, Grep, Glob, Write, Edit, Bash (full access)
   Reads: tasks/<slug>/scope.md (acceptance criteria for E2E mapping),
     architect.md (phases), CLAUDE.md
   Produces: E2E tests, pre-push hooks, CI pipeline, PR via gh CLI,
     deployment safety review (migration classification + rollback plan)
   Key behaviors: writes Playwright tests in tests/e2e/. Creates
     .github/workflows/ci.yml. Uses gh CLI for PRs. Classifies migrations
     as SAFE/NEEDS REVIEW/DANGEROUS.
```

**Test the scope agent.** In your `claude` session, paste:

```
Using the scope agent, write a user story for adding a due date to each
card with an overdue indicator.
```

The agent should produce a user story (not code), save it to `tasks/`, and include testable acceptance criteria.

**Test the review agent** refuses to modify files:

```
Using the review agent, review src/server/routes/boards.ts for convention
issues, and also fix them by editing the file.
```

It should review but explicitly refuse the edit.

> **Alternative invocation:** you can also launch an agent-scoped session from the
> terminal with `claude --agent scope`. This gives the agent a dedicated session.
> Both approaches work — "using agent X" keeps you in one session, `claude --agent X`
> starts a fresh one.

### 1.6 · Append the design system to `CLAUDE.md` (5 min)

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

### 1.7 · Lab 1 checkpoint

- [ ] `CLAUDE.md` at repo root, covers stack / architecture / data model / conventions / commands / design system
- [ ] `.claude/settings.json` with allow-list + deny-list (NO mcpServers block)
- [ ] `.mcp.json` at repo root with the `postgres` server
- [ ] `.claude/agents/{scope,design,architect,implement,review,security,release}.md` all present (7 agents)
- [ ] Claude runs `npm run lint` without prompting
- [ ] Claude refuses destructive commands
- [ ] `/mcp` shows `postgres` connected; MCP query against Postgres works
- [ ] `scope` agent produces a story; `review` agent refuses to edit

**Commit your work:**

```bash
git add CLAUDE.md .claude/ .mcp.json
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

Replace `card-labels` below with your chosen slug everywhere it appears.

```bash
git checkout -b feature/card-labels
```

This branches off your personal `workshop/YOUR-NAME` branch, so it inherits all your Lab 1 work. The agents will create `tasks/card-labels/` automatically when they save their first file.

### 2.2 · User story with the scope agent (15 min)

In your `claude` session, paste:

```
Using the scope agent, write a user story for card labels — colored tags
for categorizing cards. A user can create labels on a board, attach
multiple labels to any card, and filter the board view by label.
```

The scope agent should autonomously read CLAUDE.md, detect your branch slug, produce a full story with acceptance criteria, edge cases, out-of-scope items, and save to `tasks/card-labels/scope.md`.

Read the output. Check every acceptance criterion: could a QA engineer write an automated test from it alone?

**If it's over-scoped** (very common):

```
Too broad for one iteration. Split into a minimum viable Story A and an
enhancements Story B. Rewrite Story A with the tighter scope.
```

**If an AC is vague**:

```
Acceptance criterion 3 is not testable. Rewrite it with a specific
precondition, user action, and expected observable outcome.
```

### 2.3 · UI specification with the design agent (10 min)

```
Using the design agent, produce a UI specification for card labels based
on the user story.
```

The design agent should read `tasks/card-labels/scope.md` and CLAUDE.md's design system section, produce wireframes and flows, and save to `tasks/card-labels/design.md`.

Check the output — refinement if a state is missing:

```
The wireframe doesn't show what happens when a board has zero labels.
Add the empty state.
```

### 2.4 · Architecture spec with the architect agent (15 min)

```
Using the architect agent, produce an architecture specification for
card labels based on the story and UI spec.
```

The architect agent should read both specs, the current Prisma schema, existing route/service patterns, and produce the full architecture with DB changes, API endpoints, frontend components, 3 implementation phases, and test strategy — saved to `tasks/card-labels/architect.md`.

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

Verify you're still on your feature branch — `git status` should say "On branch feature/card-labels":

```bash
git status
```

In your `claude` session:

```
Using the implement agent, build Phase 1 of card labels. Phase 1 only —
do not proceed to Phase 2.
```

The implement agent should autonomously read the architecture spec, follow CLAUDE.md conventions, match existing code patterns, write unit tests, run the migration, and verify with lint/typecheck/test.

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
ls prisma/migrations/
```

All four must be happy — and `ls prisma/migrations/` should show a new directory whose name ends in `_add_card_labels` (or your slug).

### 3.2 · AI code review (15 min)

In your `claude` session:

```
Using the review agent, review the card labels implementation on this branch.
```

The review agent should autonomously read the story + architecture spec, diff the branch against main, run lint/typecheck/test, check conventions, and produce a structured review with a verdict.

**If there are critical issues:**

```
Using the implement agent, fix the critical issues from the review:
<paste the critical issues>
```

Then re-run the review agent to verify.

### 3.3 · Security scan (10 min)

```
Using the security agent, perform a security audit of the card labels
implementation on this branch.
```

The security agent should autonomously diff the branch, check for validation gaps, auth issues, IDOR, XSS, error leakage, and run `npm audit`.

**Fix findings:**

```
Using the implement agent, fix the security issues:
<paste findings>
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

**Run the tests** (dev server must be running in Terminal 1):

```bash
npx playwright test tests/e2e/card-labels.spec.ts
```

If something fails, debug interactively:

```bash
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

| Lab | Artifact |
|-----|----------|
| 1 | `CLAUDE.md` |
| 1 | `.claude/settings.json` |
| 1 | `.mcp.json` |
| 1 | `.claude/agents/{scope,design,architect,implement,review,security,release}.md` |
| 2 | `tasks/<slug>/scope.md` |
| 2 | `tasks/<slug>/design.md` |
| 2 | `tasks/<slug>/architect.md` |
| 3 | `src/server/routes/<slug>.ts` |
| 3 | `src/server/services/<slug>.service.ts` |
| 3 | `src/server/schemas/<slug>.schema.ts` |
| 3 | `prisma/schema.prisma` (modified) |
| 3 | `prisma/migrations/…_add_<slug>/` |
| 3 | `tests/unit/services/<slug>.service.test.ts` |
| 4 | `tests/e2e/<slug>.spec.ts` |
| 4 | `tests/e2e/fixtures/test-helpers.ts` |
| 4 | `scripts/hooks/pre-push` |
| 4 | `scripts/setup-hooks.sh` |
| 4 | `.github/workflows/ci.yml` |
| 4 | Open PR on GitHub |

The 7-step loop you just ran:

1. **Story** — `scope` agent → `tasks/<slug>/scope.md`
2. **UI** — `design` agent → `tasks/<slug>/design.md`
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
| `/agents scope` doesn't switch to the agent | `/agents` is for managing agents, not invoking them. Instead, type `Using the scope agent, <your request>` inside the session, or launch a dedicated session with `claude --agent scope` from the terminal |
| Agent says "I don't have Write tool available" | The agent's frontmatter `tools:` list is missing Write/Edit. Open `.claude/agents/<name>.md`, add Write and Edit to the tools list, save, and relaunch `claude --agent <name>` |
| Review/security agent modified a file | Edit its frontmatter `tools:` — only `Read, Grep, Glob, Bash` (remove `Edit`, `Write`) |
| MCP postgres errors on start | Is Postgres running? `docker ps` — container should be `kanboard-db` |
| `mcp__postgres__*` tools not available | MCP config goes in `.mcp.json` (not `.claude/settings.json`). Run `claude mcp add postgres -s project -- npx -y @modelcontextprotocol/server-postgres postgresql://kanboard:kanboard@localhost:5432/kanboard`, then restart `claude`, then check `/mcp` |
| `git push` rejected by pre-push hook | Read the `BLOCKING:` lines, fix, push again. Emergency bypass: `git push --no-verify` |
| Unit tests can't find a Prisma type | `npx prisma generate` after schema changes |
| "Want to start over from scratch" | `git checkout workshop-practice && git clean -fd && npm install` |
| Everything is on fire | Raise your hand |

---

## Copy-paste cheat sheet

Every block below is self-contained — paste one at a time.

**Startup**

```bash
cd kanboard
git checkout workshop-practice
npm install
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

**Claude sessions** (run in the kanboard folder)

```bash
claude
```

**Invoke agents** inside a running session — just say what you need:

```
Using the scope agent, write a user story for <feature>.
Using the design agent, produce a UI spec for <feature>.
Using the architect agent, produce an architecture spec for <feature>.
Using the implement agent, build Phase 1 of <feature>.
Using the review agent, review the <feature> implementation.
Using the security agent, audit the <feature> implementation.
```

Alternative: launch a dedicated agent session from the terminal with `claude --agent <name>`.

Available agent names: `scope`, `design`, `architect`, `implement`, `review`, `security`, `release`.

Check connected MCP servers (inside a running `claude` session):

```
/mcp
```

**Add the postgres MCP server** (writes `.mcp.json`; restart `claude` after)

```bash
claude mcp add postgres -s project -- npx -y @modelcontextprotocol/server-postgres postgresql://kanboard:kanboard@localhost:5432/kanboard
```

**Self-verify loop** (run this a lot)

```bash
npm run lint
npm run typecheck
npm test
```

**E2E**

```bash
npx playwright test
```

```bash
npx playwright test --debug path/to/spec.ts
```

**Git flow**

```bash
git checkout -b feature/<slug>
git add -A
git commit -m "message"
git push origin feature/<slug>
```

**Pull request**

```bash
gh pr create --title "title" --body "body"
gh pr view --web
```

**Full reset if something breaks**

```bash
git checkout workshop-practice
git clean -fd
npm install
```

Good luck — and ask questions loudly.
