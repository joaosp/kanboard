# Lab 4: Test, Ship, Integrate

**Duration**: 60 minutes
**Objective**: Generate E2E tests, create a CI pipeline with AI review gates, create a PR, and do a deployment dry-run.

---

## Exercise 1: Generate E2E Tests (20 min)

### Step 1: Plan the Tests

First, map acceptance criteria to test cases:

```bash
claude
```

```
Read the acceptance criteria in docs/stories/[feature-name].md.

For each criterion, define a Playwright E2E test case:
- Test name
- What it sets up (preconditions)
- What actions it performs
- What it asserts

Output as a test plan table — don't write code yet.
```

This gives you a plan before writing tests. Review the plan:
- [ ] Every acceptance criterion has at least one test
- [ ] Edge cases from the story have tests
- [ ] Tests are independent (no test depends on another)

### Step 2: Generate the Tests

```
Now generate the Playwright E2E tests based on the test plan.

Write to tests/e2e/[feature-name].spec.ts

Follow these rules:
1. Use data-testid attributes for all selectors
2. Each test is fully independent — complete setup and teardown
3. Use test fixtures for common setup (create board, create user, etc.)
4. Test both success path and primary error path
5. Add descriptive test names that read like requirements
6. Include page.waitForSelector() for dynamic content
7. Use expect() assertions — at least one per test

Also check if tests/e2e/fixtures/ exists. If not, create
a test-helpers.ts with reusable setup functions for:
- Creating a test user and logging in
- Creating a board with sample data
- Cleaning up test data
```

### Step 3: Run the Tests

```bash
# Make sure dev server is running
npm run dev

# Run E2E tests
npx playwright test tests/e2e/[feature-name].spec.ts

# If tests fail — diagnose
npx playwright test --debug tests/e2e/[feature-name].spec.ts
```

### Common E2E Issues

**Tests fail because UI elements don't have data-testid:**
The E2E tests reference `data-testid` attributes that don't exist yet (since we only built Phase 1 — the backend). This is expected.

Two approaches:
1. **Stub the tests**: Mark them as `test.skip()` with a comment explaining they need Phase 2
2. **Test the API directly**: Write API-level tests using Playwright's `request` context:

```
The UI isn't built yet (Phase 2). Rewrite the E2E tests to test the API
endpoints directly using Playwright's request API:

test('should create a label via API', async ({ request }) => {
  const response = await request.post('/api/boards/123/labels', {
    data: { name: 'Bug', color: '#EF4444' }
  });
  expect(response.status()).toBe(201);
  const label = await response.json();
  expect(label.name).toBe('Bug');
});
```

### Step 4: Verify All Tests Pass

```bash
# Full test suite
npm test                 # Unit tests
npx playwright test      # E2E tests
npm run lint             # No lint errors
npm run typecheck        # No type errors
```

---

## Exercise 2: Set Up Pre-Push Hook and CI Pipeline (20 min)

### Step 1: Generate the Pre-Push Hook

```bash
claude
```

```
Create a git pre-push hook that runs AI code review and security scanning
before allowing a push.

Create two files:

1. scripts/hooks/pre-push — the hook script that:
   - Runs claude --agent review in --print mode on the diff about to be pushed
   - Runs claude --agent security in --print mode on the same diff
   - Blocks the push if either agent outputs a line starting with "BLOCKING:"
   - Shows all findings to the developer regardless
   - Is executable (chmod +x)

2. scripts/setup-hooks.sh — a setup script that:
   - Sets git core.hooksPath to scripts/hooks
   - Confirms the setup worked

The review prompt should tell the agent to focus on bugs, convention violations,
and missing tests. The security prompt should check for input validation,
SQL injection, auth gaps, and hardcoded secrets.

Both agents should output BLOCKING: only for critical issues.
```

### Step 2: Install and Test the Hook

```bash
# Install the hooks
bash scripts/setup-hooks.sh

# Test by pushing your branch
git push origin feature/[feature-name]
```

The hook should run both agents and show you the output. If there are blocking issues, fix them and push again.

### Step 3: Generate the CI Pipeline

```bash
claude
```

```
Create a GitHub Actions CI pipeline at .github/workflows/ci.yml

The pipeline should have three stages:

Stage 1 (parallel, fast checks):
- lint: run npm run lint
- typecheck: run npm run typecheck
- unit-tests: run npm test with coverage

Stage 2 (depends on Stage 1):
- build: run npm run build, upload artifact

Stage 3 (depends on Stage 2):
- e2e-tests: run Playwright tests with a PostgreSQL 16 service container
- Upload playwright-report as artifact on failure

Stage 4 (depends on Stage 3, only on push to main):
- deploy-staging: placeholder step that echoes "deploying to staging"

Requirements:
- Use Node.js 20
- Set reasonable timeouts (15 min for E2E)

Note: AI review and security scanning are handled by the local pre-push hook,
NOT in CI. Do not add any Claude Code steps to the pipeline.

Write to .github/workflows/ci.yml
```

### Step 4: Understand the Full Flow

Walk through with a partner:
- [ ] Pre-push hook: does it run review and security agents?
- [ ] Pre-push hook: does it block on critical issues?
- [ ] CI pipeline: are the stages ordered correctly?
- [ ] CI pipeline: no API keys or Claude Code steps in CI?
- [ ] Can a developer bypass the hook with `--no-verify` if needed?

---

## Exercise 3: Create a Pull Request (10 min)

### Step 1: Ensure Everything Is Committed

```bash
git add -A
git status  # Review what's being committed
git commit -m "Implement [feature-name]: Phase 1 with E2E tests and CI pipeline"
git push origin feature/[feature-name]
```

### Step 2: Generate the PR

```bash
claude
```

```
Create a pull request for the feature/[feature-name] branch targeting main.

Use the gh CLI to create it.

The PR should include:
- Title: descriptive, under 72 characters
- Description with:
  - Summary of changes (2-3 sentences)
  - What was implemented (reference the architecture spec)
  - What was NOT implemented yet (Phase 2/3)
  - Testing done (unit tests, E2E tests, linter, typecheck)
  - Database migration notes (new tables/columns)
  - How to test manually

Create with: gh pr create --title "..." --body "..."
```

### Step 3: View the PR

```bash
gh pr view --web
```

Check:
- [ ] PR description is clear and complete
- [ ] The diff looks correct
- [ ] Files changed list is what you expect

---

## Exercise 4: Deployment Dry-Run (10 min)

### The Scenario

Imagine the PR was approved and merged. Walk through the deployment:

### Step 1: Verify Build

```bash
npm run build
```

The build should succeed.

### Step 2: Migration Check

```
Review the Prisma migration at prisma/migrations/[timestamp]_add_[feature]/

Is this migration safe to run on a production database with existing data?
Check for:
1. Does it add columns with NOT NULL and no default? (dangerous)
2. Does it drop any existing columns or tables? (dangerous)
3. Does it add indexes that could lock large tables? (potentially slow)
4. Is it backward-compatible with the previous code version?

Classify as: SAFE / NEEDS REVIEW / DANGEROUS
```

### Step 3: Rollback Plan

```
If this deployment goes wrong, what is the rollback plan?

Consider:
1. Can we revert the migration? Write the down migration SQL.
2. Is the old code compatible with the new schema? (backward-compatible)
3. What monitoring should we check after deployment?
4. What is the blast radius if this feature breaks?
```

---

## Checkpoint and Wrap-Up

By end of Lab 4, you should have:

- [ ] E2E tests (or API-level tests) for your feature
- [ ] Pre-push hook running AI review and security scan locally
- [ ] GitHub Actions CI pipeline (lint, test, build, E2E)
- [ ] A pull request with complete description
- [ ] Understanding of deployment safety (migration review, rollback plan)

### Final Commit

```bash
git add -A
git commit -m "Add E2E tests, pre-push hook, CI pipeline, and deployment docs for [feature-name]"
git push origin feature/[feature-name]
```

---

## Workshop Wrap-Up (Last 10 min)

### What You Built Today

```
CLAUDE.md                          # Project context
.claude/settings.json              # Permissions + MCP
.claude/agents/                    # 6 specialized agents
docs/stories/[feature].md          # AI-authored user story
docs/specs/[feature]-ui.md         # UI specification
docs/specs/[feature]-arch.md       # Architecture specification
src/routes/[feature].ts            # Implementation (Phase 1)
prisma/migrations/                 # Database migration
tests/unit/[feature].test.ts       # Unit tests
tests/e2e/[feature].spec.ts       # E2E tests
scripts/hooks/pre-push             # AI review + security gate
.github/workflows/ci.yml          # CI pipeline (lint, test, E2E)
PR on GitHub                       # Ready for review
```

### The Loop in Practice

You just ran the full 7-step loop on a real feature:

1. Story — scope agent defined requirements
2. UI Design — wireframes and flow
3. Architecture — database, API, components, phases
4. Implementation — code, tests, linting
5. Review — AI code review caught issues
6. Security — vulnerability scan found gaps
7. Ship — E2E tests, CI pipeline, PR, deployment plan

### What to Do Monday Morning

1. Pick a real project at work
2. Write a CLAUDE.md for it (30 min)
3. Configure .claude/settings.json (15 min)
4. Create the 6 agents (20 min)
5. Try the loop on a small feature (2-3 hours)
6. Iterate — refine CLAUDE.md and agents based on what works

### Resources

- The Agentic Development Playbook (provided as PDF)
- Claude Code documentation: https://docs.anthropic.com/claude-code
- Workshop repo: stays available for practice
- Follow-up Q&A session in 2 weeks

---

## Instructor Notes

- Exercise 1 (E2E tests) is the hardest because we only built Phase 1 (backend). Guide participants toward API-level tests if they get stuck on UI selectors.
- Exercise 2 (hook + CI) — the pre-push hook is the interesting part. Make sure participants actually test it by pushing. The CI pipeline is straightforward generation.
- Exercise 3 (PR) is fast and rewarding — people like seeing a real PR with their work.
- Exercise 4 (deployment) is conceptual but important. It teaches the habit of thinking about safety.
- Save 10 minutes for the wrap-up. The "What to Do Monday Morning" section is the most actionable takeaway.
