---
description: Initialize a new Nuxt module with proper structure and CLAUDE.md
user_invocable: true
---

# Init Module Skill

Scaffold a new Nuxt module or add CLAUDE.md to existing one.

## New Module

Use nuxi to scaffold:

```bash
pnpm dlx nuxi init -t module my-module
cd my-module
pnpm install
```

## CLAUDE.md Template

Create `.claude/CLAUDE.md` with project context:

```markdown
# <module-name>

Nuxt module for <purpose>.

## Structure

- `src/module.ts` - Module entry point (build-time)
- `src/runtime/` - Runtime code (bundled into app)
- `playground/` - Development playground

## Commands

- `pnpm dev` - Start playground
- `pnpm build` - Build module
- `pnpm test` - Run tests
- `pnpm release` - Release (bumpp)

## Patterns

- Use `defu` for merging options
- Use `pathe` for paths (not `path`)
- Runtime code can't import build-time code
- Use `addImports` for auto-imported composables

## Module Options

```ts
interface ModuleOptions {
  enabled: boolean
  // ...
}
```
```

## Usage

```
/init-module              # add CLAUDE.md to current project
/init-module my-module    # scaffold new module
```
