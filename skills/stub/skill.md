---
description: Build Nuxt module in stub mode for fast development iteration
user_invocable: true
---

# Stub Skill

Quick stub mode build for Nuxt module development.

## What is Stub Mode?

Stub mode creates lightweight proxies to source files instead of bundling. Changes to source are immediately reflected without rebuilding.

## Steps

1. Run `nuxt-module-build build --stub`
2. Prepare types with `nuxt-module-build prepare`
3. Optionally start playground

## Commands

```bash
pnpm nuxt-module-build build --stub && pnpm nuxt-module-build prepare
```

## Usage

```
/stub              # stub build only
/stub --play       # stub + start playground
```

## When to Use

- Active development on module
- Testing changes in playground
- Before running tests locally

## Notes

- Stub mode is NOT for production/publishing
- Run full build (`/build-module`) before release
- Some edge cases may behave differently in stub vs bundled
