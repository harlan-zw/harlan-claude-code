---
description: Release a package - bump version, generate changelog, publish to npm
user_invocable: true
---

# Release Skill

Release the current package using bumpp for version bumping.

## Steps

1. Check for uncommitted changes - warn if dirty
2. Run `pnpm build` to ensure build passes
3. Run `pnpm test` if tests exist
4. Run `bumpp` for interactive version bump (or `bumpp patch/minor/major` if specified)
5. The bumpp config handles changelog, git tag, and npm publish

## Usage

```
/release        # interactive version selection
/release patch  # patch release
/release minor  # minor release
/release major  # major release
```

## Prerequisites

- bumpp installed (`pnpm add -D bumpp`)
- Clean git working directory (recommended)
- Logged into npm (`npm whoami`)

## Notes

- If bumpp not installed, fall back to `pnpm version` + `pnpm publish`
- Check for `publishConfig` in package.json for scoped packages
- Respect `private: true` packages - skip publish step
