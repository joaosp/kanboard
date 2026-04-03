# Module 3: The 7-Step Agentic Loop

**Duration**: 40 minutes
**Goal**: Participants understand the complete development loop from feature idea to production-ready PR, and can execute each step with specific prompts.

---

## 3.0 — The Big Picture (5 min)

### One Feature, Seven Steps

```
 ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
 │  1.STORY │───▶│ 2.DESIGN │───▶│  3.ARCH  │───▶│ 4.BUILD  │
 │  scope   │    │  UI/UX   │    │ architect│    │implement │
 └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                       │
 ┌──────────┐    ┌──────────┐    ┌──────────┐          │
 │  7.SHIP  │◀───│ 6.SECURE │◀───│ 5.REVIEW │◀─────────┘
 │ test+CI  │    │ security │    │  review  │
 └──────────┘    └──────────┘    └──────────┘
```

Each step:
- Has a dedicated agent
- Takes the previous step's output as input
- Produces a specific artifact
- Has quality gates before advancing

### Why Seven Steps?

This is not arbitrary. It maps to how the best teams actually work — they just do it with humans in meetings. We automate the mundane parts while keeping human judgment at the gates.

**Human decisions**: approve scope, approve architecture, approve merge
**AI execution**: draft story, generate designs, write code, run reviews

---

## 3.1 — Step 1: Story (10 min)

### Agent: `scope`

### Input
A rough feature idea — can be as simple as a Slack message or bullet point.

### Process

**Prompt:**
```
You are acting as the scope agent.

Feature request: "Add card labels to the Kanban board — users should be able
to create colored labels and assign them to cards for categorization."

Produce a complete user story with:
1. Summary paragraph
2. User story (As a [user], I want [action], so that [benefit])
3. Acceptance criteria (5-8 testable statements)
4. Edge cases and error scenarios
5. What is explicitly OUT of scope for this iteration
6. Complexity estimate (S/M/L) with justification
```

### Expected Output

```markdown
## Card Labels

### Summary
Users need a way to categorize and visually distinguish cards on the Kanban
board. Card labels provide colored tags that can be created, named, and
assigned to any card. Labels are board-scoped and reusable across cards.

### User Story
As a board member, I want to create colored labels and assign them to cards,
so that I can visually categorize and filter my work.

### Acceptance Criteria
- [ ] User can create a new label with a name and color
- [ ] User can assign one or more labels to a card
- [ ] User can remove a label from a card
- [ ] Labels appear as colored pills on the card in the board view
- [ ] User can filter the board view by label
- [ ] User can edit a label's name and color
- [ ] User can delete a label (removes from all cards)
- [ ] Maximum 20 labels per board

### Edge Cases
- Deleting a label that is assigned to multiple cards
- Label name longer than 30 characters
- Two labels with the same name (allow, distinguish by color)
- Color contrast — label text must be readable on the label background

### Out of Scope
- Label groups or categories
- Global labels across boards
- Label-based automation rules
- Label access permissions

### Complexity: M
Touches frontend (label component, filter UI), backend (CRUD endpoints,
card-label relationship), and database (new table, join table). No complex
algorithms but multiple touchpoints.
```

### Quality Gate
The human reviews the story. Questions to ask:
- Does the scope feel right for one iteration?
- Are the acceptance criteria testable?
- Is anything missing that would block implementation?

---

## 3.2 — Step 2: UI Design (5 min)

### Agent: `scope` (continued) or dedicated `design` agent

### Process

**Prompt:**
```
Based on the card labels user story, produce a UI specification:

1. List every screen or view that needs changes
2. For each view, describe the UI elements (layout, components, interactions)
3. Define the user flow step-by-step
4. Reference the design system tokens from CLAUDE.md for colors, spacing, typography
5. Describe hover states, loading states, and error states
6. Produce ASCII wireframes for key views

Keep it practical — specify enough for an engineer to build from,
not a pixel-perfect mockup.
```

### Expected Output Fragment

```markdown
## UI Specification: Card Labels

### Views Affected
1. **Board View** — cards show label pills
2. **Card Detail Modal** — label picker/editor
3. **Board Settings** — label management

### Board View — Card Labels
Cards display assigned labels as colored pills below the card title:
┌─────────────────────────┐
│ Fix login timeout bug   │
│ ┌─────┐ ┌────────────┐ │
│ │ Bug │ │ High Prio   │ │
│ └─────┘ └────────────┘ │
│ 3 comments · 2 files    │
└─────────────────────────┘

- Label pills: 6px radius, 4px 8px padding, 11px font, 500 weight
- Pill color: label's chosen color as background, auto-contrast text
- Max 3 visible labels, then "+N more" overflow indicator
- Spacing: 4px gap between pills

### Card Detail Modal — Label Section
┌──────────────────────────────────────┐
│ Labels                        [Edit] │
│ ┌─────┐ ┌────────────┐ ┌──────────┐ │
│ │ Bug │ │ High Prio   │ │ + Label  │ │
│ └─────┘ └────────────┘ └──────────┘ │
└──────────────────────────────────────┘

Clicking "+ Label" opens the label picker dropdown:
┌──────────────────────────┐
│ Search labels...         │
├──────────────────────────┤
│ ✓ Bug        ■ red       │
│ ✓ High Prio  ■ orange    │
│   Feature    ■ blue      │
│   Design     ■ purple    │
├──────────────────────────┤
│ + Create new label       │
└──────────────────────────┘
```

### Why ASCII Wireframes?

They work in markdown, git-commit cleanly, and the architect/implementer agents can parse them. No external tools needed.

---

## 3.3 — Step 3: Architecture (10 min)

### Agent: `architect`

### Process

**Prompt:**
```
You are acting as the architect agent.

Read:
1. The card labels user story (input from Step 1)
2. The UI specification (input from Step 2)
3. The existing codebase structure and CLAUDE.md

Produce an architecture specification:

1. Database changes — new tables, columns, indexes, migrations
2. API endpoints — method, path, request/response shapes, auth requirements
3. Frontend components — new components, modified components, prop interfaces
4. State management — new store slices, data flow, cache invalidation
5. Implementation phases — ordered list of buildable increments
6. Technical decisions — choices made and rationale
7. Risk assessment — what could go wrong, what to watch for

Each implementation phase must be independently deployable and testable.
```

### Expected Output Fragment


## Architecture: Card Labels

### Database Changes

New tables:
```sql
CREATE TABLE labels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id    UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name        VARCHAR(30) NOT NULL,
  color       VARCHAR(7) NOT NULL,  -- hex color
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, name)
);

CREATE TABLE card_labels (
  card_id   UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  label_id  UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);

CREATE INDEX idx_labels_board ON labels(board_id);
CREATE INDEX idx_card_labels_card ON card_labels(card_id);
```

### API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/boards/:boardId/labels` | List all labels for board | Board member |
| POST | `/api/boards/:boardId/labels` | Create a label | Board member |
| PATCH | `/api/labels/:labelId` | Update label name/color | Board member |
| DELETE | `/api/labels/:labelId` | Delete label | Board admin |
| POST | `/api/cards/:cardId/labels` | Assign label to card | Board member |
| DELETE | `/api/cards/:cardId/labels/:labelId` | Remove label from card | Board member |

### Implementation Phases

**Phase 1: Data Layer** (isolated, no UI changes)
- Create Prisma migration for labels and card_labels tables
- Add Prisma models and relations
- Write API route handlers with validation
- Unit tests for all endpoints

**Phase 2: Label Management UI** (builds on Phase 1)
- LabelManager component in Board Settings
- Create/edit/delete label flows
- Color picker component

**Phase 3: Card Integration** (builds on Phase 2)
- LabelPicker component in Card Detail Modal
- Label pills on Card component in Board View
- Board-level label filter


### Quality Gate
The human reviews the architecture. Key questions:
- Do the phases make sense as independent increments?
- Are there missing endpoints or edge cases?
- Does the approach fit with the existing codebase patterns?

---

## 3.4 — Step 4: Implementation (5 min)

### Agent: `implement`

Implementation works phase-by-phase. The agent receives the architecture spec and builds one phase at a time.

**Prompt (for Phase 1):**
```
You are acting as the implement agent.

Read the architecture specification for card labels.
Implement Phase 1: Data Layer.

For each file you create or modify:
1. Follow all conventions in CLAUDE.md
2. Match existing code patterns in the codebase
3. Write unit tests alongside the implementation
4. Run the linter after changes: npm run lint
5. Run tests after changes: npm test
6. Do not proceed to Phase 2

When done, summarize:
- Files created/modified
- Tests added and their status
- Any deviations from the architecture spec (with justification)
```

### The Phase Rhythm

```
For each phase:
  1. Load architecture spec
  2. Implement the phase
  3. Run linter → fix issues
  4. Run tests → fix failures
  5. Self-review against spec
  6. Report completion

Human: confirm phase complete, advance to next
```

---

## 3.5 — Step 5: Code Review (5 min)

### Agent: `review`

**Prompt:**
```
You are acting as the review agent.

Review the implementation of card labels (all phases).

1. Read the original user story and architecture spec
2. Read every file that was created or modified
3. Run the linter: npm run lint
4. Run the type checker: npm run typecheck
5. Run tests: npm test
6. Check against CLAUDE.md conventions
7. Check for missing error handling, edge cases, and test gaps

Produce a structured review with:
- Overall verdict: APPROVE / REQUEST CHANGES / BLOCK
- Critical issues (must fix)
- Warnings (should fix)
- Suggestions (nice to have)
- Test coverage assessment
```

### Review Focus Areas

The review agent checks things humans often miss:
- **Error handling**: What happens when the database is down? When input is malformed?
- **Authorization**: Can a non-board-member access labels?
- **Data validation**: Can someone create a label with an empty name?
- **Consistency**: Do new endpoints follow the same patterns as existing ones?
- **Test coverage**: Is every acceptance criterion tested?

---

## 3.6 — Step 6: Security Scan (3 min)

### Agent: `security`

**Prompt:**
```
You are acting as the security agent.

Perform a security audit on the card labels implementation.

Focus on:
1. Input validation on all new endpoints
2. SQL injection — check Prisma queries for raw SQL
3. Authorization — verify board membership checks on every endpoint
4. IDOR — can user A access user B's labels by guessing IDs?
5. Rate limiting on label creation
6. Error messages — no stack traces or internal details exposed
7. Dependency audit: npm audit

Produce a security assessment: PASS / CONDITIONAL / FAIL
with findings classified by severity.
```

### Common Findings
- Missing rate limits on creation endpoints
- UUID predictability (not an issue with random UUIDs, but worth noting)
- Missing input sanitization on label names (XSS via label rendering)
- Verbose error messages in development mode leaking to production

---

## 3.7 — Step 7: Test and Ship (7 min)

### Agent: `release`

This step has three sub-phases:

### 7a. E2E Test Generation

**Prompt:**
```
Based on the card labels acceptance criteria, generate Playwright E2E tests.

For each acceptance criterion:
1. Write a test that exercises the full user flow
2. Use data-testid selectors
3. Include setup (create board, create user) and teardown
4. Test both success and primary failure cases

File: tests/e2e/card-labels.spec.ts
```

### 7b. CI Pipeline Validation

**Prompt:**
```
Verify that the card labels implementation passes the full CI pipeline:

1. Run: npm run lint
2. Run: npm run typecheck
3. Run: npm test
4. Run: npx playwright test
5. Run: npm run build

Report results. If anything fails, diagnose and fix.
```

### 7c. PR Creation

**Prompt:**
```
Create a pull request for the card labels feature:

1. Ensure all changes are on a feature branch: feature/card-labels
2. Write a PR description that includes:
   - Summary of changes
   - Link to user story
   - Screenshots of UI changes (describe what they would show)
   - Testing done
   - Migration notes
3. Create the PR with: gh pr create

The PR title should be: "Add card labels with board-level filtering"
```

---

## 3.8 — The Human-AI Contract (5 min)

### Where Humans Decide

Not everything should be automated. The loop has explicit human checkpoints:

| Gate | Question | Human Decides |
|------|----------|---------------|
| After Step 1 | Is the scope right? | Yes — scope defines everything downstream |
| After Step 3 | Is the architecture sound? | Yes — wrong architecture wastes all implementation |
| After Step 5 | Is the review satisfactory? | Yes — the human has final merge authority |
| After Step 7 | Ready to ship? | Yes — deployment is a business decision |

### What AI Should NOT Decide
- Whether a feature is worth building
- Trade-offs between competing priorities
- Deployment timing
- Whether to cut scope or push a deadline
- Architectural paradigm shifts

### What AI Handles Excellently
- Translating rough ideas into structured specs
- Generating consistent, convention-following code
- Catching bugs, security issues, and convention violations
- Writing tests, migrations, and boilerplate
- Producing PRs with proper documentation

---

## Key Takeaways

1. **Seven steps, seven agents** — each step has a clear input, process, and output
2. **Phase-by-phase implementation** — never build everything at once; each phase is independently testable
3. **Review and security are separate concerns** — different agents catch different things
4. **Human gates** at scope, architecture, and merge — AI executes, humans decide
5. **The loop is repeatable** — same process works for any feature, any stack, any team size

---

## Transition to Module 4

> "You now know the loop. But a loop running on a single developer's machine is not a team process. Next: how to automate AI review and security with git hooks, set up CI/CD for testing, and ship with confidence."
