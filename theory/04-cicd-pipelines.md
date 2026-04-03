# Module 4: CI/CD and Production Pipelines

**Duration**: 35 minutes
**Goal**: Participants understand how to use git hooks for local AI review and security scanning, and CI/CD for automated testing and deployment.

---

## 4.1 — Why CI/CD Changes with AI (10 min)

### The Old Pipeline

```
Developer pushes code → Lint → Test → Build → Deploy
```

This pipeline checks if the code is syntactically correct and if tests pass. It does not check if the code is well-written, secure, or matches the intended design.

### The New Pipeline

```
Developer commits
   │
   pre-push hook ──▶ claude review + claude security (local)
   │                        │
   │                  issues found? → fix before push
   │
Code pushed → Lint → Test → Build → E2E → Deploy
```

AI review and security scanning run **locally** via a git pre-push hook. Issues are caught before code ever reaches CI — saving pipeline time and PR round-trips.

### What This Buys You

1. **Every push gets reviewed** — the hook runs automatically, no discipline required
2. **Issues caught early** — before CI, before PR, before anyone else sees the code
3. **No API keys in CI** — everything runs locally with the developer's Claude Code session
4. **Fast feedback** — fix issues in your working tree, not in a PR review cycle

### What This Does NOT Replace

- Human architectural review for significant changes
- Product review of UX decisions
- Team code review for knowledge sharing and mentoring

---

## 4.2 — Local AI Review with Git Hooks (15 min)

### The Pre-Push Hook

Instead of running AI review in CI (which requires API keys in GitHub secrets), we run it **locally** as a git pre-push hook. The developer's own Claude Code session handles authentication.

```bash
#!/usr/bin/env bash
# .git/hooks/pre-push (or managed via a setup script)

set -e

echo "Running AI code review..."
claude --agent review --print \
  "Review the changes about to be pushed.

   Run git diff @{push}.. to see the diff.
   Read all changed files for full context.

   Focus on: bugs, security issues, convention violations,
   missing tests, and error handling gaps.

   Output a structured review as markdown.
   If you find critical issues, end with: BLOCKING: <summary>" \
| tee /tmp/ai-review-output.md

# Block push if critical issues found
if grep -q "^BLOCKING:" /tmp/ai-review-output.md; then
  echo ""
  echo "AI review found blocking issues. Fix them before pushing."
  exit 1
fi

echo ""
echo "Running AI security scan..."
claude --agent security --print \
  "Perform a security audit on the changes about to be pushed.

   Run git diff @{push}.. to see the diff.
   Read all changed files.

   Check for:
   1. Input validation on all new endpoints
   2. SQL injection or ORM misuse
   3. Authentication and authorization gaps
   4. Secrets or credentials in code
   5. XSS vulnerabilities
   6. IDOR (insecure direct object reference)

   Output a security assessment as markdown.
   If you find critical vulnerabilities, end with: BLOCKING: <summary>" \
| tee /tmp/ai-security-output.md

if grep -q "^BLOCKING:" /tmp/ai-security-output.md; then
  echo ""
  echo "Security scan found blocking issues. Fix them before pushing."
  exit 1
fi

echo "AI review and security scan passed."
```

### Setting It Up

Git hooks live in `.git/hooks/` which is not committed. To share hooks across the team, use a script:

```bash
# scripts/setup-hooks.sh
#!/usr/bin/env bash
cp scripts/hooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push
echo "Git hooks installed."
```

Or use the `core.hooksPath` git config:

```bash
git config core.hooksPath scripts/hooks
```

This way the hooks are versioned in `scripts/hooks/` and shared via the repo.

### Key Design Decisions

**Why `--print` mode?** The hook runs non-interactively. `--print` sends a single prompt and streams the response to stdout — no interactive approval needed.

**Why local, not CI?** No API keys to manage in GitHub secrets. The developer sees issues immediately in their terminal, not as PR comments minutes later. Faster feedback loop.

**Why `BLOCKING` convention?** The hook needs a machine-readable signal to decide pass/fail. The agent is instructed to output `BLOCKING:` only for critical issues. Non-critical findings are shown but don't block the push.

**Bypass when needed:** Developers can skip the hook with `git push --no-verify` for WIP branches or emergencies. This is a team convention, not a hard gate.

---

## 4.3 — E2E Testing with Playwright (10 min)

### Why E2E Tests Matter for AI-Generated Code

When AI writes code, the risk is not that it's syntactically wrong — linters catch that. The risk is that it does the wrong thing correctly. E2E tests verify behavior from the user's perspective.

### Playwright Setup

```bash
npm install -D @playwright/test
npx playwright install
```

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### AI-Generated E2E Test Pattern

**Prompt for generating tests from acceptance criteria:**
```
Read the acceptance criteria for card labels.
Generate Playwright E2E tests.

Rules:
1. One test per acceptance criterion
2. Use data-testid attributes for selectors
3. Each test is independent — full setup and teardown
4. Test both happy path and primary error case
5. Use Page Object pattern for reusable page interactions
6. Include test data factories for boards, cards, and labels

File structure:
tests/e2e/
├── card-labels.spec.ts      # Test file
├── pages/
│   ├── board.page.ts        # Board page object
│   └── card-detail.page.ts  # Card detail page object
└── fixtures/
    └── test-data.ts          # Test data factories
```

### E2E in CI

```yaml
# Add to your CI pipeline
  e2e-tests:
    runs-on: ubuntu-latest
    needs: [build]

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: kanboard_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/kanboard_test

      - run: npx playwright install --with-deps
      - run: npx playwright test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/kanboard_test

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 4.4 — The Full Pipeline (5 min)

### Putting It All Together

AI review and security run locally via pre-push hook. CI handles deterministic checks only.

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  # Stage 1: Quick checks (parallel)
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run typecheck

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test -- --coverage

  # Stage 2: Build (depends on Stage 1)
  build:
    needs: [lint, typecheck, unit-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/

  # Stage 3: E2E tests (depends on Stage 2)
  e2e-tests:
    needs: [build]
    # ... (as defined above)

  # Stage 4: Deploy (depends on Stage 3)
  deploy-staging:
    needs: [e2e-tests]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build
      # Deploy to staging...
```

### Pipeline Visualization

```
Developer pushes
   │
   pre-push hook ──▶ AI review + security scan (local, blocks on critical issues)
   │
PR opened / code pushed
   │
   ├──▶ lint ──────────┐
   ├──▶ typecheck ─────┤
   └──▶ unit tests ────┘
                        │
                     build
                        │
                   E2E tests
                        │
                  merge to main
                        │
                  deploy staging
```

### Where Each Check Runs

| Check | Where | Why |
|-------|-------|-----|
| AI Code Review | Local (pre-push hook) | Immediate feedback, no API keys in CI |
| Security Scan | Local (pre-push hook) | Same — developer fixes before push |
| Lint + Typecheck | CI | Deterministic, fast, catches env differences |
| Unit Tests | CI | Must pass in clean environment |
| E2E Tests | CI | Needs services (PostgreSQL), headless browser |

---

## 4.5 — Branch Strategy and Deployment (5 min)

### Recommended Branch Strategy

```
main (production)
  │
  ├── feature/card-labels     ← one branch per feature
  ├── feature/board-search    ← independent work streams
  └── fix/login-timeout       ← bugfix branches
```

Each feature branch gets the full pipeline. The pre-push hook runs AI review and security locally. CI runs deterministic checks. Human review is required for merge.

### Deployment Flow

```
feature branch → pre-push hook (AI review + security) → push → CI (lint, test, E2E) → PR → human approve → merge → deploy staging
```

### Running Agents Manually

The pre-push hook runs automatically, but developers can also invoke agents directly:

```bash
# Ad-hoc review of specific changes
claude --agent review "Review my changes against the card labels spec"

# Quick security check without pushing
claude --agent security "Check my changes for vulnerabilities"

# Then push — hook runs automatically, CI handles the rest
git push origin feature/card-labels
```

---

## Key Takeaways

1. **AI review runs locally via pre-push hook** — immediate feedback, no API keys in CI
2. **Security scanning runs alongside review** in the same hook — catches vulnerabilities before push
3. **E2E tests verify behavior**, not just syntax — critical for AI-generated code
4. **CI stays simple** — lint, typecheck, test, build, E2E — all deterministic, no AI credentials needed
5. **The BLOCKING convention** gives the hook a clear pass/fail signal while showing all findings

---

## Transition to Labs

> "Theory is done. You understand the ecosystem, the agents, the loop, and the pipeline. After lunch, you will do all of this yourself — on a real codebase, with real features, producing real PRs. Hands on keyboards."
