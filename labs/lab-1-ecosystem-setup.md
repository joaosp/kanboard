# Lab 1: Ecosystem Setup

**Duration**: 60 minutes
**Objective**: Configure Claude Code as a production-grade development partner for the Kanboard repository.

> **Already done?** If you completed Exercise A and Exercise B during the Day 1 theory session, you've already done Lab 1. Skip to the [Checkpoint](#checkpoint) below, verify all items, and commit your work.

---

## Setup (5 min)

### Clone the Workshop Repo

```bash
git clone https://github.com/joaosp/kanboard.git
cd kanboard
npm install
```

### Verify Claude Code

```bash
claude --version
# Should show v1.x.x

# Verify Claude Code works
claude "Say hello in one sentence"
```

### Start the Dev Environment

```bash
# In a separate terminal
docker compose up -d    # PostgreSQL
npm run db:migrate      # Run migrations
npm run dev             # Start dev server
```

Verify: open http://localhost:3000 — you should see the Kanboard UI.

---

## Exercise 1: Generate CLAUDE.md (20 min)

### The Task

The repo has no CLAUDE.md. Your first job is to generate one.

### Step 1: Open Claude Code in the repo

```bash
cd kanboard-workshop
claude
```

### Step 2: Run the extraction prompt

Paste this prompt into Claude Code:

```
Analyze this repository and generate a comprehensive CLAUDE.md file.

Examine:
1. package.json for tech stack and dependencies
2. Directory structure (run `find src -type f | head -50`) for architecture patterns
3. tsconfig.json for TypeScript settings
4. .eslintrc or eslint.config for code conventions
5. The scripts section in package.json for dev commands
6. prisma/schema.prisma for the data model
7. Any existing README for project context
8. Test files for testing patterns and frameworks
9. .github/workflows/ for CI configuration if present

Output a CLAUDE.md file that covers:
- Project description (what Kanboard is, its current status)
- Complete tech stack table
- Architecture overview with directory map
- Data model summary (key entities and relationships)
- Code conventions extracted from linter configs and existing code
- All dev commands
- Important constraints and anti-patterns to avoid

Write it to ./CLAUDE.md

Be specific to THIS codebase. Extract actual patterns, not generic advice.
```

### Step 3: Review and Refine

Read the generated CLAUDE.md. Check for:

- [ ] Is the tech stack accurate?
- [ ] Does the architecture description match what you see in `src/`?
- [ ] Are the dev commands correct? (Try running them)
- [ ] Are the code conventions specific, not generic?

If anything is off, tell Claude:
```
The architecture section is too generic. Look at how the route handlers are
structured in src/routes/ and describe the specific pattern this project uses.
```

### Step 4: Test It

Start a new Claude Code session and ask it to do something:
```
What is the data model for this project? How are boards, lists, and cards related?
```

Claude should answer accurately because it loaded CLAUDE.md automatically.

---

## Exercise 2: Configure Project Settings (15 min)

### Step 1: Create the Settings File

```bash
mkdir -p .claude
```

Ask Claude to generate project settings:

```
Create a .claude/settings.json file for this project.

Based on the package.json scripts and the tools used in this repo, configure:

1. Permission allow-list: which commands should Claude be able to run
   without asking? Include all npm scripts, prisma commands, and git commands
   that are safe for development.

2. Permission deny-list: which commands should be blocked? Think about
   destructive operations.

3. MCP servers: configure a PostgreSQL MCP server pointing to the local
   database (check the DATABASE_URL in .env or docker-compose.yml).

Write the file to .claude/settings.json
```

### Step 2: Verify Permissions

Test that permissions work:
```
Run the linter on this project.
```

Claude should run `npm run lint` without asking for approval (because it's in the allow list).

```
Delete the node_modules directory.
```

Claude should either refuse or ask for permission (because `rm -rf` is denied or unmatched).

### Step 3: Test MCP

```
Using the database, list all tables and their row counts.
```

If the PostgreSQL MCP server is configured correctly, Claude should query the database directly.

---

## Exercise 3: Create Agents (15 min)

### Step 1: Create the Agent Directory

```bash
mkdir -p .claude/agents
```

### Step 2: Generate the Agent Suite

Ask Claude to create the agents from the templates covered in the theory:

```
Create the following agent files in .claude/agents/:

1. scope.md — Product manager agent for writing user stories
2. architect.md — System architect for technical specifications
3. implement.md — Developer agent that follows conventions
4. review.md — Code reviewer (read-only, never modifies files)
5. security.md — Security engineer for vulnerability scanning
6. release.md — Release manager for CI/CD and deployment

Each agent should:
- Be tailored to this specific project (reference CLAUDE.md conventions)
- Include the project's actual test and lint commands
- Reference the project's tech stack (React, Node, Prisma, PostgreSQL)
- Have clear constraints about what the agent can and cannot do

Use the patterns from the theory session but customize for Kanboard.
```

### Step 3: Test an Agent

```bash
# Test the scope agent
claude --agent scope "Add a card due date feature to the Kanban board"
```

Check that the output is a well-structured user story, not code.

```bash
# Test the review agent
claude --agent review "Review the current state of the codebase for any issues"
```

Check that the review agent does not attempt to modify any files.

---

## Exercise 4: Extract Design System (5 min)

### The Task

Extract the existing design system from the Kanboard UI and add it to CLAUDE.md.

```
Analyze the frontend design system in this project:

1. Check src/styles/ for CSS variables, color tokens, and typography
2. Check component files for common patterns (buttons, cards, inputs)
3. Check any Tailwind config or CSS framework configuration
4. Look at the existing UI components for spacing and layout patterns

Add a "Design System" section to CLAUDE.md with:
- Color palette with variable names and values
- Typography (font families, sizes, weights)
- Spacing scale
- Component patterns (button variants, card styles, form inputs)
- Anti-patterns to avoid

Append this to the existing CLAUDE.md — do not overwrite what's there.
```

---

## Checkpoint

By end of Lab 1, you should have:

- [ ] A comprehensive CLAUDE.md at the repo root
- [ ] `.claude/settings.json` with permissions and MCP servers
- [ ] Six agent files in `.claude/agents/`
- [ ] Design system encoded in CLAUDE.md
- [ ] Verified that Claude can run dev commands, access the database, and invoke agents

### Commit Your Work

```bash
git add CLAUDE.md .claude/
git commit -m "Configure Claude Code ecosystem for AI-driven development"
git push origin main
```

---

## Instructor Notes

- Walk around during Exercise 1 — the CLAUDE.md quality varies a lot depending on the prompt. Help participants refine.
- Exercise 2 is where people hit issues with MCP — have the PostgreSQL connection string ready to share.
- Exercise 3 is fast if people copy from theory, but encourage them to customize.
- Exercise 4 can be quick if the design system is simple. It's a taste of what's possible.
