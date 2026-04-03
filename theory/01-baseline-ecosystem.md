# Module 1: The Baseline Ecosystem

**Duration**: 35 minutes
**Goal**: Participants understand how to configure Claude Code as a production-grade development partner, not just a code-completion tool.

---

## 1.1 — Why Configuration Matters (10 min)

### The Problem
Most developers use AI coding tools at 20% capacity. They open a chat, ask a question, paste the answer. This is the equivalent of buying a CNC machine and using it as a paperweight.

The difference between a developer who "uses AI" and one who builds with AI at 10x speed is **ecosystem configuration** — the scaffolding that turns a general-purpose model into a domain expert for your specific codebase.

### The Three Layers

```
┌─────────────────────────────────┐
│  Layer 3: Agent Orchestration   │  ← Autonomous multi-step workflows
├─────────────────────────────────┤
│  Layer 2: Context Engineering   │  ← CLAUDE.md, memory, project knowledge
├─────────────────────────────────┤
│  Layer 1: Tool Configuration    │  ← CLI settings, MCP servers, permissions
└─────────────────────────────────┘
```

Most people only touch Layer 1. Today we wire all three.

### Key Insight
> AI is not a tool you use. It is an environment you configure. The better the environment, the better every interaction becomes — compounding over time.

---

## 1.2 — Claude Code Installation and Settings (10 min)

### Installation

```bash
npm install -g @anthropic-ai/claude-code
```

### The Settings Hierarchy

Claude Code reads settings from multiple sources, in priority order:

```
1. Enterprise policy   (managed, cannot override)
2. User settings       ~/.claude/settings.json
3. Project settings    .claude/settings.json  (git-committed)
4. Local overrides     .claude/settings.local.json  (git-ignored)
```

**Demonstration**: Show how project settings create a shared team baseline while local overrides let individuals customize without affecting others.

### Essential User Settings

```json
// ~/.claude/settings.json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(pnpm *)",
      "Bash(git *)",
      "Bash(cargo *)",
      "Bash(npx vitest *)",
      "Bash(npx playwright *)"
    ],
    "deny": [
      "Bash(rm -rf /)",
      "Bash(git push --force)",
      "Bash(curl * | bash)"
    ]
  }
}
```

### Project Settings

```json
// .claude/settings.json (committed to repo)
{
  "permissions": {
    "allow": [
      "Bash(npm test)",
      "Bash(npm run lint)",
      "Bash(npm run build)",
      "Bash(npx prisma *)"
    ]
  },
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost:5432/kanboard"]
    }
  }
}
```

### Key Concept: Permission Design
Permissions are your safety rails. Think of them as the "sudo" model for AI:
- **Allow patterns** let the agent run without asking (automation-friendly)
- **Deny patterns** are hard blocks — the agent cannot execute these even if instructed
- **Unmatched commands** require interactive approval (safe default)

**Principle**: Start restrictive, widen as trust builds. In CI, allow only what the pipeline needs.

---

## 1.3 — CLAUDE.md: The Context File (15 min)

### What Is CLAUDE.md?

CLAUDE.md is a markdown file at the root of your project that Claude reads automatically at the start of every conversation. It is the single most impactful file you can write for AI-assisted development.

Think of it as the "new developer onboarding document" — except the new developer has perfect recall and follows instructions literally.

### CLAUDE.md Hierarchy

```
~/.claude/CLAUDE.md              → Global (your personal preferences)
/project/CLAUDE.md               → Project root (team shared)
/project/src/CLAUDE.md           → Directory-specific (module context)
/project/src/api/CLAUDE.md       → Deeper nesting (more specific)
```

Claude reads ALL applicable CLAUDE.md files, from global to most specific.

### Anatomy of an Effective CLAUDE.md

A good CLAUDE.md answers five questions:

1. **What is this?** — Project purpose, status, one-paragraph summary
2. **How is it built?** — Tech stack, key dependencies, architecture overview
3. **What are the rules?** — Code conventions, naming, patterns, anti-patterns
4. **How do I run it?** — Dev commands, test commands, build commands
5. **What should I never do?** — Constraints, forbidden patterns, important caveats

### CLAUDE.md Template

```markdown
# Project Name

One-paragraph description of what this project does and its current status.

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React + Vite | No Next.js |
| Backend | Node.js + Express | REST API |
| Database | PostgreSQL + Prisma | |
| Testing | Vitest + Playwright | Unit + E2E |

## Architecture

Brief description of how the system is organized. Mention key directories,
data flow, and any non-obvious patterns.

## Code Conventions

- Named exports only — no default exports
- TypeScript strict mode — no `any`, no `as` casts
- CSS Modules for styling — no Tailwind, no inline styles
- Feature-organized components: `src/components/{feature}/`
- All database access through Prisma — never raw SQL in route handlers

## Dev Commands

```bash
npm run dev          # Start development server
npm test             # Run unit tests
npm run test:e2e     # Run Playwright E2E tests
npm run lint         # ESLint
npm run typecheck    # TypeScript checking
npm run build        # Production build
```

## Important Constraints

- Never use `any` type
- Never import from `node_modules` directly — use package aliases
- Never store secrets in code — use environment variables
- Database migrations must be backward-compatible
- All API endpoints require authentication middleware
```

### Prompt: Extracting a CLAUDE.md from an Existing Repo

This is the prompt participants will use in Lab 1:

```
Analyze this repository and generate a comprehensive CLAUDE.md file.

Examine:
1. Package.json / Cargo.toml / requirements.txt for tech stack
2. Directory structure for architecture patterns
3. Existing config files (.eslintrc, tsconfig, etc.) for code conventions
4. Scripts section for dev commands
5. Any existing README or docs for project context
6. Test files for testing patterns and frameworks
7. CI config (.github/workflows/) for build/deploy process

Output a CLAUDE.md that covers:
- Project description and status
- Complete tech stack table
- Architecture overview with directory map
- Code conventions (extracted from linter configs and existing code patterns)
- All dev commands
- Important constraints and anti-patterns to avoid

Be specific to THIS codebase. Don't write generic advice — extract actual
patterns from the code.
```

### Live Demo
Walk through a real CLAUDE.md extraction on the workshop repo. Show how Claude reads the package.json, scans the directory tree, examines linter configs, and produces a tailored document.

---

## 1.4 — Model Context Protocol (MCP) (10 min)

### What Is MCP?

MCP (Model Context Protocol) is a standard for connecting AI models to external tools and data sources. Think of it as USB for AI — a universal plug that lets Claude access databases, APIs, file systems, and custom tools.

### Architecture

```
Claude Code ←→ MCP Client ←→ MCP Server ←→ External System
                                │
                                ├── PostgreSQL
                                ├── GitHub API
                                ├── Filesystem
                                ├── Sentry / monitoring
                                └── Custom tools
```

### Configuring MCP Servers

MCP servers are configured in `.claude/settings.json`:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres",
               "postgresql://localhost:5432/kanboard"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "your-token-here"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem",
               "/path/to/project"]
    }
  }
}
```

### Why MCP Matters for ALM

Without MCP, the AI can only see what you paste into it. With MCP:
- **Database context**: Claude can query your schema, understand relationships, write migrations that actually match your data
- **GitHub integration**: Read issues, PRs, CI status — the AI understands your project management context
- **Monitoring**: Connect Sentry or your logging system — the AI can diagnose production issues with real data

### Practical MCP Servers for This Workshop

| Server | Purpose | When to Use |
|--------|---------|-------------|
| `server-postgres` | Query schema, understand data model | Architecture, migrations, debugging |
| `server-github` | Read issues, PRs, CI results | Story authoring, review, release |
| `server-filesystem` | Structured file access | Large repo navigation |

---

## 1.5 — Memory and Context Management (5 min)

### How Claude Code Remembers

Claude Code has a built-in memory system. When you tell it something important, it can store that in project-level or user-level memory.

```
/memory                          # View current memories
"Remember that we use UTC timestamps everywhere in this project"
```

Memories persist across sessions and augment the CLAUDE.md context.

### Context Window Management

Claude has a finite context window. As conversations grow long, early context gets compressed. Strategies:

1. **Start with `/task`**: Load fresh context at the start of each task
2. **Use CLAUDE.md**: Information here is always loaded first — it never gets compressed
3. **Break work into focused sessions**: One feature per conversation
4. **Reference files, don't paste**: Let Claude read files directly rather than pasting content

### The Compound Effect

```
  Session 1: Write CLAUDE.md → Claude understands your project
  Session 2: Configure agents → Claude knows how to work in your style
  Session 3: Add MCP servers → Claude can access your data
  Session 4: Build feature → 10x faster because everything compounds
```

Each layer of configuration makes every future interaction better. This is the baseline ecosystem.

---

## Key Takeaways

1. **CLAUDE.md is the highest-ROI file in your repo** — write it once, improve every AI interaction forever
2. **Settings hierarchy** gives you team consistency with individual flexibility
3. **MCP servers** turn Claude from a code generator into a system-aware development partner
4. **Permissions** are your safety rails — start tight, widen as trust builds
5. **Configuration compounds** — 30 minutes of setup saves hours on every feature

---

## Exercise A: Ecosystem Setup (15 min)

> **Prerequisite**: You should have the Kanboard repo cloned, `docker compose up -d` running, and `npm run dev` running before starting.

Put the theory into practice. Open a terminal in your `kanboard` directory and complete these two tasks.

### Task 1: Generate CLAUDE.md

```bash
cd kanboard
claude
```

Paste this prompt into Claude Code:

```
Analyze this repository and generate a comprehensive CLAUDE.md file.

Examine:
1. package.json for tech stack and dependencies
2. Directory structure for architecture patterns
3. tsconfig.json for TypeScript settings
4. .eslintrc or eslint.config for code conventions
5. The scripts section in package.json for dev commands
6. prisma/schema.prisma for the data model
7. Any existing README for project context

Output a CLAUDE.md file that covers:
- Project description
- Complete tech stack table
- Architecture overview with directory map
- Data model summary
- Code conventions extracted from linter configs and existing code
- All dev commands
- Important constraints and anti-patterns to avoid

Write it to ./CLAUDE.md. Be specific to THIS codebase.
```

Quick check: is the tech stack accurate? Are the dev commands correct?

### Task 2: Configure Project Settings

```
Create a .claude/settings.json file for this project.

Based on package.json scripts and tools used in this repo, configure:
1. Permission allow-list for safe dev commands (npm scripts, prisma, git)
2. Permission deny-list for destructive operations
3. MCP server for the local PostgreSQL database

Write the file to .claude/settings.json
```

Test it: ask Claude to `Run the linter on this project` — it should run without asking for approval.

> **Note**: This covers Lab 1 Exercises 1-2. You'll finish the remaining exercises after Module 2.

---

## Transition to Module 2

> "You now have the foundation — Claude knows your project, has access to your tools, and operates within safety rails. Next: how to create specialized agents that handle different phases of development, and how to encode your design system so the AI produces pixel-perfect work."
