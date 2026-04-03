# Lab 2: Story to Architecture

**Duration**: 45 minutes
**Objective**: Use the scope and architect agents to take a raw feature idea through story definition, UI specification, and architecture design.

---

## The Feature

Each participant (or pair) picks one of these features to work on:

| # | Feature | Complexity |
|---|---------|-----------|
| 1 | **Card Labels** — colored tags for categorizing cards | M |
| 2 | **Card Due Dates** — date picker, overdue indicators, calendar view | M |
| 3 | **Board Search** — full-text search across card titles and descriptions | S-M |
| 4 | **Card Attachments** — file upload and preview on cards | M-L |
| 5 | **Activity Log** — timeline of all actions on a board | M |
| 6 | **Card Checklists** — subtask lists within cards with progress tracking | M |

> **Rule**: No two adjacent participants should pick the same feature. We want diversity in the room for the review step later.

---

## Exercise 1: Write the User Story (15 min)

### Step 1: Invoke the Scope Agent

```bash
claude --agent scope
```

Then give it your feature:

```
Feature request: "[Your chosen feature description]"

Context: This is for Kanboard, a Kanban board application.
The app has boards, lists (columns), and cards.
Users are board members with equal permissions.

Produce a complete user story with:
1. Summary paragraph
2. User story format
3. 5-8 acceptance criteria as testable statements
4. Edge cases and error scenarios
5. Explicit out-of-scope items
6. Complexity estimate with justification
```

### Step 2: Review Your Story

Read the output critically:

- [ ] Does each acceptance criterion describe observable behavior?
- [ ] Could a QA engineer write a test from each criterion alone?
- [ ] Is the scope tight enough for a 1-2 day implementation?
- [ ] Are the edge cases realistic?

### Step 3: Refine

If the story is too broad:
```
The scope is too large for one iteration. Split this into two stories:
- Story A: the minimum viable version (core functionality only)
- Story B: enhancements for a second iteration

Rewrite Story A with tighter scope.
```

If acceptance criteria are vague:
```
Acceptance criterion 3 is not testable as written. Rewrite it so that
a QA engineer could write an automated test from it alone, with specific
expected behavior and measurable outcomes.
```

### Step 4: Save the Story

```
Save this user story to docs/stories/[feature-name].md
```

---

## Exercise 2: UI Specification (10 min)

### Step 1: Generate UI Spec

Stay in the same session (or start a new one and load the story):

```
Based on the user story at docs/stories/[feature-name].md,
produce a UI specification.

1. List every screen or view that changes
2. For each view, describe layout, components, and interactions
3. Include ASCII wireframes for the key views
4. Reference design system tokens from CLAUDE.md
5. Describe hover, loading, empty, and error states
6. Define the step-by-step user flow

Save to docs/specs/[feature-name]-ui.md
```

### Step 2: Validate

Check the wireframes:
- [ ] Do they match the existing Kanboard UI patterns?
- [ ] Are all acceptance criteria represented in the UI?
- [ ] Are error and empty states covered?
- [ ] Would a developer know exactly what to build from this spec?

### Quick Refinement

```
The wireframe for the [component] doesn't show what happens when [edge case].
Add that state and describe the user flow for it.
```

---

## Exercise 3: Architecture Specification (20 min)

### Step 1: Switch to the Architect Agent

```bash
claude --agent architect
```

### Step 2: Generate Architecture Spec

```
Read:
1. The user story at docs/stories/[feature-name].md
2. The UI spec at docs/specs/[feature-name]-ui.md
3. The existing codebase structure and CLAUDE.md
4. The current Prisma schema at prisma/schema.prisma
5. Existing route patterns in src/routes/

Produce an architecture specification:

1. **Database changes**
   - New Prisma models and relations
   - Migration SQL (what the migration will generate)
   - Indexes needed for query performance

2. **API endpoints**
   - Method, path, request body, response shape
   - Authentication and authorization requirements
   - Validation rules for each endpoint

3. **Frontend components**
   - New components with their props interfaces
   - Modified existing components
   - State management changes (if any)

4. **Implementation phases**
   - Break into 2-3 phases, each independently testable
   - Phase 1 should be pure backend (no UI)
   - Phase 2 should add core UI
   - Phase 3 (if needed) should add polish and edge cases

5. **Technical decisions**
   - Any library additions needed (justify each)
   - Patterns chosen and why

6. **Test strategy**
   - Unit tests per phase
   - E2E tests mapped to acceptance criteria

Save to docs/specs/[feature-name]-arch.md
```

### Step 3: Validate the Architecture

Critical checks:

- [ ] Do the Prisma models match the existing schema conventions?
- [ ] Do the API endpoints follow the same patterns as existing routes?
- [ ] Are the implementation phases truly independent?
- [ ] Could Phase 1 be deployed without Phase 2?
- [ ] Is anything missing? (Check each acceptance criterion against the spec)

### Step 4: Cross-Review (5 min)

Pair up with a neighbor who picked a different feature. Read each other's architecture spec and check:

1. Does it follow the patterns in CLAUDE.md?
2. Are the database changes backward-compatible?
3. Do the phases make sense as buildable increments?
4. Is anything obviously missing?

Give feedback. Refine the spec if needed.

---

## Checkpoint

By end of Lab 2, you should have:

- [ ] `docs/stories/[feature-name].md` — complete user story
- [ ] `docs/specs/[feature-name]-ui.md` — UI specification with wireframes
- [ ] `docs/specs/[feature-name]-arch.md` — architecture spec with phases
- [ ] Peer-reviewed architecture spec

### Commit

```bash
git add docs/
git commit -m "Add story and architecture spec for [feature-name]"
git push origin feature/[feature-name]
```

---

## Instructor Notes

- Encourage participants to pick different features — diversity makes the cross-review valuable.
- The scope agent sometimes over-scopes. Coach participants to ruthlessly cut scope in Step 3.
- Architecture validation is the most important step. Walk around and check that phases are truly independent.
- The cross-review at the end is short but powerful — it builds team habits.
- If participants finish early, challenge them: "Can you split your Phase 1 into two even smaller phases?"
