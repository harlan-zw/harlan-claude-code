---
description: Run TypeScript type checking on the project
user_invocable: true
---

# Typecheck Skill

Run TypeScript type checking without emitting files.

## Steps

1. Detect project type:
   - Vue/Nuxt project: use `vue-tsc --noEmit`
   - Plain TS: use `tsc --noEmit`
   - Monorepo: check for workspace root tsconfig

2. Run the appropriate command

3. Parse and summarize errors if any

## Commands

For Vue/Nuxt:
```bash
pnpm vue-tsc --noEmit
```

For plain TypeScript:
```bash
pnpm tsc --noEmit
```

## Notes

- Nuxt projects may need `nuxi typecheck` instead
- Check for `typecheck` script in package.json first
- Report file:line for each error for easy navigation
