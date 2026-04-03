# Lab 3: Implement and Review

**Duration**: 60 minutes
**Objective**: Use the implement agent to build Phase 1 of your feature, then run AI review and security scanning to validate the work.

---

## Exercise 1: Implement Phase 1 (30 min)

### Step 1: Create a Feature Branch

```bash
git checkout -b feature/[your-feature-name]
```

### Step 2: Invoke the Implement Agent

```bash
claude --agent implement
```

### Step 3: Build Phase 1

```
Read the architecture spec at docs/specs/[feature-name]-arch.md.

Implement Phase 1 (Data Layer) only. Do NOT proceed to Phase 2.

For each file you create or modify:
1. Follow all conventions in CLAUDE.md
2. Match the patterns used by existing code in this repo
3. Write unit tests alongside the implementation
4. After creating the Prisma model, run: npx prisma migrate dev --name add-[feature]
5. After writing code, run: npm run lint
6. After lint passes, run: npm test
7. Fix any failures before continuing

When done, report:
- Files created (with brief description)
- Files modified (with what changed)
- Tests added and pass/fail status
- Any deviations from the architecture spec (with justification)
```

### What to Watch For

Claude will generate code. As it works, observe:

1. **Does it follow CLAUDE.md conventions?** Check naming, file location, export style
2. **Does it match existing patterns?** Compare new route handlers to existing ones
3. **Does it write tests?** If not, prompt: "You forgot to write tests for [component]"
4. **Does it run the linter?** If not: "Run the linter and fix any issues"

### Common Issues and Fixes

**Claude creates files in the wrong directory:**
```
That file should be in src/routes/, not src/api/. Move it to match
the existing pattern and update any imports.
```

**Claude uses a different coding style:**
```
The existing route handlers use async/await with try/catch.
Your code uses .then().catch(). Rewrite to match the project convention.
```

**Claude skips validation:**
```
The POST endpoint for creating a [resource] has no input validation.
Add validation matching the pattern used in src/routes/cards.ts.
```

**Tests are too shallow:**
```
The tests only check happy path. Add tests for:
- Missing required fields
- Invalid field values
- Unauthorized access (no auth token)
- Not found (invalid ID)
```

### Step 4: Self-Verify

Before moving to review, verify the implementation yourself:

```bash
# All should pass
npm run lint
npm run typecheck
npm test

# Check the migration was created
ls prisma/migrations/
```

---

## Exercise 2: AI Code Review (15 min)

### Step 1: Switch to the Review Agent

Open a NEW Claude Code session (fresh context):

```bash
claude --agent review
```

### Step 2: Run the Review

```
Review the implementation on the current branch (feature/[feature-name]).

1. Read the user story at docs/stories/[feature-name].md
2. Read the architecture spec at docs/specs/[feature-name]-arch.md
3. Read every file that was created or modified (check git diff)
4. Run the linter: npm run lint
5. Run the type checker: npm run typecheck
6. Run unit tests: npm test
7. Check against CLAUDE.md conventions

Produce a structured review:
- Overall verdict: APPROVE / REQUEST CHANGES / BLOCK
- Critical issues (must fix before merge)
- Warnings (should fix)
- Suggestions (nice to have)
- Test coverage assessment (are all acceptance criteria tested?)
```

### Step 3: Process Review Findings

Read the review output. For critical issues:

```bash
# Switch back to implement agent
claude --agent implement
```

```
The review found these issues:
[Paste critical issues]

Fix each issue. After fixing, re-run lint and tests to verify.
```

### Step 4: Re-Review (if needed)

If there were critical issues, run the review agent again to verify fixes.

---

## Exercise 3: Security Scan (10 min)

### Step 1: Switch to the Security Agent

Open another new session:

```bash
claude --agent security
```

### Step 2: Run the Scan

```
Perform a security audit on the feature/[feature-name] branch.

Focus on:
1. Input validation — are all new endpoint inputs validated?
2. SQL injection — check for any raw queries or ORM misuse
3. Authorization — does every endpoint verify the user has board access?
4. IDOR — can a user access another user's resources by guessing IDs?
5. XSS — is user input sanitized before rendering?
6. Error handling — do error responses leak internal details?
7. Dependencies — run npm audit and report findings

Also run: npm audit

Produce a security assessment: PASS / CONDITIONAL / FAIL
```

### Step 3: Fix Security Issues

If the scan finds issues:

```bash
claude --agent implement
```

```
The security scan found these vulnerabilities:
[Paste security findings]

Fix each one. For input validation issues, add Zod schemas matching
the pattern used in existing endpoints.
```

---

## Exercise 4: Cross-Review (5 min)

### Pair Review

Find a partner who implemented a different feature. Review their work:

1. Read their story and arch spec (2 min)
2. Look at the files they changed: `git diff main..feature/[their-feature]` (2 min)
3. Give one piece of feedback — something the AI review missed (1 min)

> This is the human layer. AI catches bugs and convention violations. Humans catch architectural blind spots and UX issues.

---

## Checkpoint

By end of Lab 3, you should have:

- [ ] Phase 1 implemented with all tests passing
- [ ] Lint and typecheck passing
- [ ] AI review completed with verdict of APPROVE (or issues fixed)
- [ ] Security scan with verdict of PASS (or issues fixed)
- [ ] Cross-review with a partner

### Commit

```bash
git add -A
git commit -m "Implement [feature-name] Phase 1: data layer and API endpoints"
git push origin feature/[feature-name]
```

---

## Instructor Notes

- 30 minutes for implementation sounds short but Phase 1 is backend-only. If someone is stuck, check that the architecture spec is clear enough.
- The review agent occasionally flags non-issues. This is a teaching moment: "AI review is a starting point, not gospel. Use judgment."
- Security scan almost always finds something. That's the point — it demonstrates the value of a dedicated scan.
- Cross-review is deliberately short. The goal is to plant the habit, not do a thorough review.
- If someone finishes early, let them start Phase 2 implementation.
