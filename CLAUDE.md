# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal Claude Code plugin for Nuxt/Vue/TypeScript development. Provides hooks, skills, and commands for standardized workflow automation.

## Repository Structure

```
harlan-claude-code/           # The actual plugin (installed by marketplace)
  .claude-plugin/
    plugin.json               # Hook configuration, triggers on tool events
  hooks/                      # Bash scripts executed on lifecycle events
  skills/                     # Markdown prompts for complex tasks
  commands/                   # Slash commands
README.md                     # Marketplace listing
CLAUDE.md                     # This file
```

## Plugin Components

**Hooks** (`harlan-claude-code/hooks/`):
- `session-start.sh` - SessionStart: detect project type, show git status
- `pre-compact.sh` - PreCompact: save context to .claude/session-context.md (includes scratchpad + active plans)
- `grind.sh` - Stop: autonomous iteration until scratchpad marked DONE
- `eslint.sh` - PostToolUse(Write|Edit): auto-lint changed files
- `typecheck.sh` - PostToolUse(Write|Edit): run vue-tsc/tsc
- `vitest.sh` - PostToolUse(Write|Edit): run related tests
- `pnpm-only.sh` - PreToolUse(Bash): block npm/yarn, suggest pnpm
- `pre-commit-push.sh` - PreToolUse(Bash): run lint/typecheck/test before commit/push
- `check-config.sh` - Shared config loader (checks .claude/hooks.json)

**Skills** (`harlan-claude-code/skills/`):
- `pkg-init/` - scaffold/sync npm packages
- `nuxt-module-init/` - scaffold/sync Nuxt modules
- `claude-plugin-init/` - scaffold/sync Claude Code plugins
- `tdd/` - test-driven development workflow

**Commands** (`harlan-claude-code/commands/`):
- `pr.md` - create PR with conventional commit template
- `fix-issue.md` - fetch GitHub issue, implement fix, create PR
- `review.md` - review changes for issues and improvements
- `save-plan.md` - persist plans to .claude/plans/
- `debug.md` - hypothesis-driven debugging with instrumentation
- `diagram.md` - generate Mermaid architecture diagrams
- `resume.md` - resume interrupted work from scratchpad/plan

## Hook Patterns

**Input**: Hooks receive JSON via stdin with `tool_input.file_path` or `tool_input.command`

**Blocking**: PreToolUse hooks block with:
```json
{ "decision": "block", "reason": "Use pnpm instead of npm" }
```

**Per-project disable**: Target projects create `.claude/hooks.json`:
```json
{ "disabled": ["typecheck", "vitest", "grind"] }
```

## Grind Pattern (Autonomous Iteration)

The `grind.sh` Stop hook enables autonomous iteration until a goal is achieved.

**How it works:**
1. Agent creates `.claude/scratchpad.md` with goal and tasks
2. Agent works on tasks, updating scratchpad with progress
3. When agent stops, hook checks scratchpad
4. If not marked `## DONE`, hook sends `followup_message` to continue
5. Agent resumes work (up to 10 iterations)

**Scratchpad format:**
```markdown
## Goal
[What you're trying to achieve]

## Current Task
- [ ] Task 1
- [ ] Task 2

## Status
In progress

## DONE  <- Add this when complete
```

**Markers:**
- `## DONE` - Stops iteration, work complete
- `## BLOCKED` - Stops iteration, needs human help

## Plan Persistence

Save plans to `.claude/plans/` for documentation and resumption:
- Plans auto-included in session context during compaction
- Reference in new conversations: "Continue plan in .claude/plans/[name].md"

## Hook Integration

All hooks work together:

```
Write/Edit file
    ↓
eslint.sh → auto-fix lint
    ↓
typecheck.sh → suggest typecheck
    ↓
vitest.sh → run related tests
    ↓
[Agent continues work]
    ↓
git commit
    ↓
pre-commit-push.sh → block if lint/typecheck/test fail
    ↓
[Agent stops]
    ↓
grind.sh → check scratchpad, continue if not DONE
```

Commands reference these hooks:
- `/fix-issue`, `/debug` - mention vitest auto-runs
- `/review` - checks hook output before re-running
- `/tdd` skill - relies on vitest hook for iteration

## Proactive Workflows

**Use these commands automatically based on context:**

| Trigger | Action |
|---------|--------|
| User mentions "fix issue", "GitHub issue", or gives issue number | Invoke `/fix-issue` |
| User asks to debug, mentions bug, or something isn't working | Invoke `/debug` with hypothesis-driven approach |
| User says "write tests first", "TDD", or "test-driven" | Invoke `/tdd` skill |
| Before committing significant changes | Invoke `/review` to catch issues |
| Creating a PR or user says "make a PR" | Invoke `/pr` |
| Multi-step task (3+ steps) | Create `.claude/scratchpad.md` for grind pattern |
| User mentions "diagram", "architecture", "flowchart" | Invoke `/diagram` |
| New session with `.claude/scratchpad.md` or `.claude/plans/` | Invoke `/resume` |

**Always:**
- Use scratchpad for any task that might span multiple turns
- Let hooks do their job (lint, typecheck, test run automatically)
- Reference `/review` output before committing

## Testing

No build. Test via marketplace install:
```bash
/plugin marketplace add harlan-zw/harlan-claude-code
/plugin install harlan-claude-code
```
