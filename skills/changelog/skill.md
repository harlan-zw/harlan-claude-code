---
description: Generate changelog from git commits or PRs
user_invocable: true
---

# Changelog Skill

Generate changelog entries from git history.

## Steps

1. Get commits since last tag: `git log $(git describe --tags --abbrev=0)..HEAD --oneline`
2. Group by type (feat, fix, chore, etc.)
3. Format for CHANGELOG.md

## Conventional Commits

```
feat: add new feature      → Features
fix: resolve bug           → Bug Fixes
docs: update readme        → Documentation
chore: update deps         → Chores
perf: improve speed        → Performance
refactor: clean up code    → Refactoring
```

## Commands

```bash
# commits since last tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline

# or use changelogen
pnpm dlx changelogen
```

## Usage

```
/changelog              # show unreleased changes
/changelog --write      # append to CHANGELOG.md
```

## Notes

- Follow Keep a Changelog format
- Group breaking changes separately
- Include PR/commit links if available
- bumpp usually handles this automatically
