# Command Configuration

## Command Frontmatter

```yaml
---
description: Short description shown in /help
argument-hint: <branch-name>       # optional argument hint
allowed-tools:                     # restrict available tools
  - Bash
  - Read
  - Write
---
```

## Example: commands/pr.md

```markdown
---
description: Create a PR with conventional commit template
allowed-tools:
  - Bash
  - Read
---

Create a GitHub PR for the current branch.

## Steps

1. Get current branch name
2. Check for uncommitted changes
3. Push branch if needed
4. Create PR with `gh pr create`

## PR Template

Title: `<type>: <description>`

Types: feat, fix, docs, style, refactor, test, chore

Body:
- Summary of changes
- Related issues
- Testing done
```

## Command with Arguments

```markdown
---
description: Deploy to environment
argument-hint: <env>
allowed-tools:
  - Bash
---

Deploy to the specified environment.

The user will provide the environment as an argument: `{argument}`

Valid environments: staging, production
```

## Registration in plugin.json

Commands are auto-discovered from `commands/` directory. No manual registration needed.
