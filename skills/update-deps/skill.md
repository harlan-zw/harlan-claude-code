---
description: Update dependencies using taze
user_invocable: true
---

# Update Deps Skill

Update project dependencies using taze.

## Steps

1. Run taze to check for updates
2. Review major version bumps carefully
3. Apply updates
4. Run tests to verify

## Commands

```bash
# check for updates (dry run)
pnpm dlx taze

# apply minor/patch updates
pnpm dlx taze -w

# apply all including major
pnpm dlx taze major -w

# interactive mode
pnpm dlx taze -I
```

## Usage

```
/update-deps           # check only
/update-deps --write   # apply safe updates
/update-deps --major   # include major versions
/update-deps -I        # interactive
```

## After Updating

1. `pnpm install`
2. `pnpm test`
3. `pnpm typecheck`
4. Check playground works

## Notes

- Be careful with major updates to @nuxt/* packages
- Check changelogs for breaking changes
- Monorepos: run from root
