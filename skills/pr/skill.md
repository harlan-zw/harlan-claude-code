---
description: Create a GitHub pull request with proper template
user_invocable: true
---

# PR Skill

Create a GitHub pull request from the current branch.

## Steps

1. Check current branch isn't main/master
2. Check for uncommitted changes - commit or warn
3. Push branch to origin if needed
4. Create PR using `gh pr create`

## Template

```markdown
## Summary
<brief description of changes>

## Changes
- <change 1>
- <change 2>

## Testing
- [ ] Tests pass (`pnpm test`)
- [ ] Types check (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)

## Related
Fixes #<issue> (if applicable)
```

## Usage

```
/pr                    # interactive PR creation
/pr "Title here"       # with title
/pr --draft           # create as draft
```

## Commands

```bash
# push and create PR
git push -u origin HEAD
gh pr create --fill

# or with template
gh pr create --title "feat: ..." --body "..."
```
