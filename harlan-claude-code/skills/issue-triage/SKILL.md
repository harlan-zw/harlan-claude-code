---
description: Triage open issues by difficulty and impact
user_invocable: true
---

Triage all open issues and rank by difficulty/impact.

## Workflow

1. **Determine repo and filters**
   - If `$ARGUMENTS` provided, parse it:
     - Bare value = repo name (e.g., `nuxt/nuxt`)
     - `--label <name>` = filter by label
     - `--limit <n>` = override default 100
   - Otherwise auto-detect: `gh repo view --json nameWithOwner -q .nameWithOwner`

2. **Fetch all open issues**
   ```bash
   gh issue list --repo <repo> --state open --limit <limit> --json number,title,labels,body,createdAt,author,comments,assignees
   ```

3. **Parallel batch analysis** (8-10x faster than sequential)
   Split issues into batches of 10 and spawn parallel haiku agents.
   If ≤10 issues, use a single agent.

   ```
   # Spawn Task agents IN PARALLEL (single message, multiple tool calls)
   Task(model: haiku, prompt: "Analyze these issues: [JSON]. Return JSON array with: number, difficulty (1-5), impact (1-5), hasRepro (bool), needsCodebaseReview (bool), notes")
   ```

   Each agent evaluates using these heuristics:

   **Difficulty** (1-5):
   - 1: typo, config, or docs change
   - 2: single-file logic change
   - 3: multi-file change, needs testing
   - 4: architectural or cross-cutting concern
   - 5: unknown scope, research needed — set `needsCodebaseReview: true`

   **Impact** (1-5):
   - 1: cosmetic, niche use case
   - 2: minor improvement, few users affected
   - 3: moderate user-facing value
   - 4: significant pain point or common request
   - 5: critical bug, data loss, or security issue

   **Signals to factor in**:
   - `comments` count — high count suggests community interest/severity
   - `assignees` — if assigned, note in output (someone may already be working on it)
   - `labels` — "good first issue" suggests low difficulty, "bug" often higher impact than "enhancement"
   - `createdAt` — old issues with no assignee may be stale or deprioritized
   - Reproduction steps, stackblitz/codesandbox links, minimal repos → `hasRepro: true`

4. **Merge results** from all agents into unified list

5. **Display table** sorted by: has repro (yes first), then impact/difficulty ratio (descending)

   | # | Title | Labels | Repro | Diff | Impact | Assigned | Notes |
   |---|-------|--------|-------|------|--------|----------|-------|
   | 42 | Fix CSS regression | bug | ✓ | 1 | 3 | | 1-line fix |
   | 17 | Add dark mode | enhancement | n/a | 2 | 4 | @dev | PR in progress |

6. **Highlight quick wins** — low difficulty (1-2), decent impact (2+)

7. **Highlight high priorities** — impact 4-5 regardless of difficulty

8. **Offer worktree setup** — prompt user with options:
   - "Create worktrees for quick wins (difficulty 1-2, impact 2+)?"
   - "Create worktrees for high priorities (impact 4-5)?"
   - "Pick specific issues by number?"

   For each selected issue, create an isolated worktree using `wt` (git worktree manager):
   ```bash
   wt switch --create fix/<number>-<slug>
   ```
   Where `<slug>` is a kebab-case short title (first 4-5 words). `wt switch --create` creates a new branch + worktree from current HEAD.

   After creation, list worktrees with `wt list` so user can open them in separate sessions.
