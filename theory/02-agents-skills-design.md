# Module 2: Agents, Skills and Design Systems

**Duration**: 20 minutes
**Goal**: Participants learn to create role-specific agents, reusable skills, and encode design systems so the AI produces consistent, brand-aligned output.

---

## 2.1 — Custom Agents (15 min)

### What Are Agents?

An agent is a markdown file that gives Claude a specific role, set of instructions, and constraints. Instead of one general-purpose assistant, you create specialists:

```
.claude/agents/
├── scope.md          # Product manager — writes user stories
├── architect.md      # System architect — designs technical approach
├── implement.md      # Developer — writes code
├── review.md         # Code reviewer — read-only analysis
├── security.md       # Security engineer — vulnerability scanning
└── release.md        # Release manager — CI/CD and deployment
```

### Why Agents Matter

The same model behaves dramatically differently based on the role you assign it. A "reviewer" agent that's told "you are read-only, never modify files" catches things that a "developer" agent misses — because it's optimized for critique, not creation.

### Anatomy of an Agent File

```markdown
# Agent Name

## Role
One sentence defining who this agent is.

## Objective
What this agent is trying to accomplish.

## Constraints
- What this agent must NOT do
- Boundaries and limitations

## Process
Step-by-step workflow the agent follows.

## Output Format
What the agent produces and in what structure.

## Tools
Which MCP servers and CLI tools this agent can use.
```

### Agent: Scope (Product Manager)

```markdown
# scope

## Role
You are a product manager defining requirements for a software feature.

## Objective
Transform a rough feature idea into a structured user story with clear
acceptance criteria, edge cases, and scope boundaries.

## Constraints
- Never write code or suggest implementation details
- Never make technology choices — that is the architect's job
- Focus on WHAT and WHY, never HOW
- Flag ambiguity — ask questions rather than assume

## Process
1. Read the feature request or idea
2. Identify the primary user and their goal
3. Write user story in "As a [user], I want [action], so that [benefit]" format
4. Define 5-8 acceptance criteria as testable statements
5. List edge cases and error scenarios
6. Define what is explicitly OUT of scope
7. Estimate complexity as S/M/L

## Output Format
Produce a markdown document with these sections:
- Summary (1 paragraph)
- User Story
- Acceptance Criteria (checkbox list)
- Edge Cases
- Out of Scope
- Complexity Estimate
```

### Agent: Review (Code Reviewer)

```markdown
# review

## Role
You are a senior code reviewer performing a thorough review of
implementation work.

## Objective
Identify bugs, security issues, performance problems, and deviations
from project conventions before code is merged.

## Constraints
- NEVER modify any files — you are read-only
- NEVER run code or execute commands that change state
- You may only read files, run linters, and run tests
- Flag issues with severity: critical / warning / suggestion

## Process
1. Read the task spec to understand what was supposed to be built
2. Read every changed file
3. Run the linter: `npm run lint`
4. Run the type checker: `npm run typecheck`
5. Run unit tests: `npm test`
6. Check for:
   - Logic errors and off-by-one mistakes
   - Missing error handling
   - SQL injection or XSS vulnerabilities
   - Hardcoded values that should be config
   - Missing tests for new code paths
   - Deviation from conventions in CLAUDE.md
7. Produce a structured review report

## Output Format
### Review Summary
Overall assessment: APPROVE / REQUEST CHANGES / BLOCK

### Critical Issues
(Must fix before merge)

### Warnings
(Should fix, not blocking)

### Suggestions
(Nice to have improvements)

### Test Coverage
(Assessment of test adequacy)
```

### Agent: Security

```markdown
# security

## Role
You are a security engineer performing a focused security audit
on new or changed code.

## Objective
Identify vulnerabilities, insecure patterns, and compliance issues
before code reaches production.

## Constraints
- Read-only — never modify files
- Focus on security, not code style or performance
- Every finding must include a remediation recommendation
- Classify by OWASP Top 10 category where applicable

## Process
1. Identify all changed files and their attack surface
2. Check authentication and authorization on every endpoint
3. Review input validation and sanitization
4. Check for secrets, tokens, or credentials in code
5. Review database queries for injection vulnerabilities
6. Check dependencies for known CVEs: `npm audit`
7. Verify CORS, CSP, and security headers
8. Check file upload handling if applicable
9. Review error messages for information leakage

## Output Format
### Security Assessment: PASS / CONDITIONAL / FAIL

### Findings
For each finding:
- **Severity**: Critical / High / Medium / Low
- **Category**: OWASP category
- **Location**: File and line
- **Description**: What the issue is
- **Remediation**: How to fix it
```

### How to Invoke Agents

```bash
# In Claude Code, use the /agents command or reference directly
claude --agent scope "Add a card labeling feature to the Kanban board"
claude --agent review "Review the implementation of card labels"
claude --agent security "Security audit on the card labels feature"
```

### The Agent Pipeline

Agents chain naturally through the development lifecycle:

```
scope → architect → implement → review → security → release
  │         │           │          │          │          │
  ▼         ▼           ▼          ▼          ▼          ▼
 story    spec        code      report    audit      deploy
```

Each agent's output becomes the next agent's input. This is the foundation of the 7-step loop we cover in Module 3.

---

## 2.2 — Skills (5 min)

### What Are Skills?

Skills are reusable prompt templates stored as markdown files. While agents define WHO the AI is, skills define HOW it performs specific tasks.

```
.claude/skills/
├── extract-claude-md.md      # Generate CLAUDE.md from any repo
├── write-user-story.md       # Structured story authoring
├── create-migration.md       # Database migration workflow
├── write-e2e-test.md         # Playwright E2E test pattern
└── review-pr.md              # Pull request review checklist
```

### Skill Example: Write E2E Test

```markdown
# Write E2E Test

## When to Use
After implementing a feature, generate Playwright E2E tests.

## Input Required
- Feature description or user story
- Acceptance criteria

## Process
1. Read the acceptance criteria
2. For each criterion, write a Playwright test that:
   - Navigates to the relevant page
   - Performs user actions (click, type, drag)
   - Asserts the expected outcome
3. Include setup/teardown for test data
4. Use page object pattern if the page has reusable elements
5. Test both happy path and primary error cases

## Template
```typescript
import { test, expect } from '@playwright/test';

test.describe('[Feature Name]', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: navigate and prepare state
  });

  test('should [acceptance criterion]', async ({ page }) => {
    // Arrange
    // Act
    // Assert
  });
});
```

## Constraints
- One test file per feature
- Use data-testid attributes for selectors — never CSS classes
- Each test must be independently runnable
- No test should depend on another test's state


### Skills vs Agents

| Aspect | Agent | Skill |
|--------|-------|-------|
| Scope | Entire role/persona | Single task template |
| Persistence | Active throughout conversation | Invoked once, produces output |
| Complexity | Multi-step workflow | Focused procedure |
| Example | "Code Reviewer" | "Write E2E Test" |

---

## 2.3 — Encoding Design Systems (10 min)

### The Problem

Without a design system in context, AI generates:
- Random color choices
- Inconsistent spacing
- Mismatched typography
- Components that look nothing like your app

With a design system encoded in CLAUDE.md, AI generates components that look like they were built by your team.

### What to Encode

#### 1. Design Tokens

```markdown
## Design Tokens

### Colors
- Primary: `--blue-600: #2563EB` (buttons, links, active states)
- Neutral: `--gray-50` through `--gray-950` (backgrounds, text, borders)
- Success: `--green-500: #22C55E`
- Error: `--red-500: #EF4444`
- Warning: `--amber-500: #F59E0B`

### Typography
- Sans: `'Inter', system-ui, sans-serif`
- Mono: `'JetBrains Mono', monospace`
- Body: 14px / 1.5 line-height
- Headings: font-weight 600

### Spacing
- Base unit: 4px
- Component padding: 8px 12px (small), 12px 16px (medium), 16px 24px (large)
- Section gaps: 24px between related, 48px between sections
```

#### 2. Component Patterns

```markdown
## Component Patterns

### Buttons
- Primary: blue-600 bg, white text, 8px 16px padding, 6px radius
- Secondary: transparent bg, gray-700 border, gray-700 text
- Destructive: red-600 bg, white text
- All buttons: 14px font, 500 weight, 2px focus ring on :focus-visible

### Cards
- White background, 1px gray-200 border, 8px radius
- 16px padding, 8px gap between elements
- Subtle shadow: 0 1px 3px rgba(0,0,0,0.1)

### Form Inputs
- 40px height, 12px horizontal padding
- 1px gray-300 border, 6px radius
- Focus: 2px blue-600 ring
```

#### 3. Anti-Patterns

```markdown
## Design Anti-Patterns (NEVER do these)
- Never use box-shadow for emphasis — use border or background
- Never use more than 2 font weights on a single view
- Never hardcode pixel values — use spacing tokens
- Never use color for the only indicator — always pair with icon or text
- Never center-align body text
```

### Prompt: Extract Design System from Existing App

```
Analyze this project's design system by examining:

1. CSS/SCSS files — extract color variables, spacing values, typography
2. Component files — identify reusable patterns (buttons, cards, inputs)
3. Tailwind config (if present) — extract the theme configuration
4. Any existing design documentation

Produce a "Design System" section for CLAUDE.md that includes:
- Color palette with semantic names and hex values
- Typography scale (font families, sizes, weights, line-heights)
- Spacing scale (base unit and common values)
- Component patterns (buttons, cards, forms, tables) with exact specs
- Anti-patterns to avoid

Be precise. Extract actual values from the code, not generic recommendations.
```

### Why This Matters

When the design system is in CLAUDE.md, every component Claude generates matches your app. The architect agent references it when specifying UI. The implement agent uses it when writing CSS. The review agent checks against it when reviewing.

The design system becomes a shared contract between all agents.

---

## Key Takeaways

1. **Agents are role-specific personas** — they dramatically change AI behavior and output quality
2. **The agent pipeline** (scope → architect → implement → review → security → release) mirrors a real team
3. **Skills are reusable task templates** — write once, invoke whenever needed
4. **Encoding your design system** in CLAUDE.md ensures consistent, brand-aligned output
5. **Everything is git-committable** — agents, skills, and design tokens live in `.claude/` and evolve with your codebase

---

## Exercise B: Agents and Design System (10 min)

Continue in your `kanboard` Claude Code session.

### Task 1: Create Agents

```
Create the following agent files in .claude/agents/:

1. scope.md — Product manager for writing user stories
2. architect.md — System architect for technical specs
3. implement.md — Developer that follows CLAUDE.md conventions
4. review.md — Code reviewer (read-only, never modifies files)
5. security.md — Security engineer for vulnerability scanning
6. release.md — Release manager for CI/CD and deployment

Tailor each agent to this project: reference CLAUDE.md conventions,
the actual test/lint commands, and the tech stack (React, Node, Prisma, PostgreSQL).
```

### Task 2: Extract Design System

```
Analyze the frontend design system in this project:

1. Check src/styles/ for CSS variables, color tokens, and typography
2. Check component files for common patterns (buttons, cards, inputs)
3. Look at existing UI components for spacing and layout patterns

Add a "Design System" section to CLAUDE.md with color palette,
typography, spacing, component patterns, and anti-patterns.
Append to the existing CLAUDE.md — do not overwrite.
```

Quick test:
```bash
claude --agent scope "Add a card due date feature to the Kanban board"
```

The output should be a structured user story, not code.

> **Note**: This covers Lab 1 Exercises 3-4. At the end of the session we'll commit all Lab 1 work.

---

## Transition to Module 3

> "You now have the team: a product manager, an architect, a developer, a reviewer, a security engineer, and a release manager — all running on Claude Code. Next: how they work together in a structured 7-step loop that takes a feature from idea to production."
