---
name: pr
description: Create, make, open, update, submit, or sync a PR / pull request with conventional commit template, auto-linking related issues
user_invocable: true
---

Create or update a pull request for the current branch. Idempotent — safe to run at any stage.

## Step 0: Branch Check

```bash
git branch --show-current
```

**If on `main`** → isolate work into a new branch via `wt` (git worktree manager):

1. Derive a branch name from the session's changes (e.g. `feat/add-widget`, `fix/login-bug`). Use `git diff --stat` and `git status` to inform the name.
2. Create worktree with `wt`:
   ```bash
   wt step setup <branch-name>
   ```
3. Copy uncommitted changes into the worktree:
   ```bash
   git diff > /tmp/pr-changes.patch
   git diff --cached > /tmp/pr-staged.patch
   wt switch <branch-name>
   git apply /tmp/pr-changes.patch 2>/dev/null
   git apply /tmp/pr-staged.patch 2>/dev/null
   ```
4. Commit the changes in the worktree, then continue from Step 1 **inside the worktree directory**.
5. After PR is created, switch back and clean up:
   ```bash
   wt switch main
   git checkout .
   ```

**If NOT on `main`** → continue normally.

## Step 1: Detect State

Run IN PARALLEL:

```
Bash: git log main..HEAD --oneline
Bash: git diff main...HEAD --stat
Bash: gh issue list --state open --limit 20 --json number,title
Bash: gh pr view --json number,title,body,url 2>&1
```

Determine what exists:
- **No commits ahead of main** and **no uncommitted changes** → nothing to do, tell user
- **PR exists** → we're syncing title/body, skip to Step 4
- **No PR** → creating fresh, continue to Step 2

## Step 2: Find Related Issues

From the last 20 open issues, match titles against the branch name and commit messages. Use keyword overlap — no need to be exact. If `$ARGUMENTS` contains an issue number, include that directly.

## Step 3: Build PR Content

**Title:** Conventional commit format — `feat:`, `fix:`, `docs:`, `chore:`, etc. Under 70 chars.

**Body template:**

```markdown
### 🔗 Linked issue

Resolves #<number>
<!-- or "Related to #<number>" if not a full fix -->

### ❓ Type of change

- [ ] 📖 Documentation
- [ ] 🐞 Bug fix
- [ ] 👌 Enhancement
- [ ] ✨ New feature
- [ ] 🧹 Chore
- [ ] ⚠️ Breaking change

### 📚 Description

<!-- 2-3 sentences: what problem existed → what we did -->
```

Tick the relevant type checkbox. Fill in the description — be concise, write like a human.

Only add `### ⚠️ Breaking Changes` and `### 📝 Migration` sections if actually breaking.

## Step 4: Verify

Run all checks before pushing:

```bash
pnpm lint && pnpm typecheck && pnpm build
```

Fix any failures before proceeding.

## Step 5: Push & Create or Update

```bash
# Push if remote is behind
git push -u origin HEAD
```

**If PR exists** → update it:
```bash
gh pr edit <number> --title "<title>" --body "$(cat <<'EOF'
<body>
EOF
)"
```

**If no PR** → create it:
```bash
gh pr create --title "<title>" --body "$(cat <<'EOF'
<body>
EOF
)"
```

Output the PR URL when done.
