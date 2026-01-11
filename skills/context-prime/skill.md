---
description: Load comprehensive project context - package.json, tsconfig, recent changes, structure
user_invocable: true
---

# Context Prime Skill

Load comprehensive project context for better Claude understanding.

## What to Load

1. **Project identity**
   - `package.json` (name, scripts, deps)
   - `nuxt.config.ts` or `vite.config.ts`
   - `.claude/CLAUDE.md` if exists

2. **Structure**
   - Key directories (`src/`, `runtime/`, `composables/`)
   - Entry points (`src/module.ts`, `src/index.ts`)

3. **Recent context**
   - `git log -10 --oneline` - recent commits
   - `git diff --stat HEAD~3` - recent changes
   - Current branch and status

4. **Config**
   - `tsconfig.json` - paths, aliases
   - `eslint.config.js` - lint rules
   - `.env.example` - env vars (not .env!)

## Usage

```
/context-prime         # load full context
/context-prime --lite  # just package.json + git status
```

## Output Format

Summarize for Claude:
- Project: <name> (<type>)
- Stack: Nuxt 3 + Vue 3 + TypeScript
- Key scripts: dev, build, test
- Recent work: <last 3 commits summary>
- Current branch: <branch> (<clean/dirty>)

## Notes

- Don't load node_modules, dist, .nuxt
- Respect .gitignore
- Truncate large files
