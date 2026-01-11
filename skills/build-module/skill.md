---
description: Build a Nuxt module using nuxt-module-build
user_invocable: true
---

# Build Module Skill

Build a Nuxt module for distribution.

## Steps

1. Detect build system:
   - `nuxt-module-build` for Nuxt modules
   - `unbuild` for unjs packages
   - Check `build` script in package.json

2. Run build with stub mode awareness:
   - Development: `nuxt-module-build build --stub`
   - Production: `nuxt-module-build prepare && nuxt-module-build build`

3. Verify output in `dist/` directory

## Commands

```bash
# Nuxt module (full build)
pnpm nuxt-module-build prepare && pnpm nuxt-module-build build

# Nuxt module (stub for dev)
pnpm nuxt-module-build build --stub

# Unbuild
pnpm unbuild
```

## Usage

```
/build-module        # full production build
/build-module --stub # stub mode for development
```

## Notes

- Check for `build.config.ts` for unbuild config
- Verify exports in package.json match dist output
- Run `attw` (arethetypeswrong) after build if installed
