---
description: Triage open issues by difficulty and impact
args: repo (optional - auto-detects from current git repo)
---

Triage all open issues and rank by difficulty/impact.

## Workflow

1. **Determine repo**
   - If `$ARGUMENTS` provided, use it
   - Otherwise auto-detect: `gh repo view --json nameWithOwner -q .nameWithOwner`

2. **Fetch all open issues**
   ```bash
   gh issue list --repo <repo> --state open --limit 100 --json number,title,labels,body,createdAt,author
   ```

3. **Spawn haiku agent** to rank each issue
   Use Task tool with `model: haiku` to analyze issues:
   - **Difficulty** (1-5): code complexity, unknowns, testing effort
   - **Impact** (1-5): user-facing value, frequency, severity

4. **Display table** sorted by impact/difficulty ratio
   Include columns: #, Title, Labels, Difficulty, Impact, Notes

5. **Highlight quick wins** - low difficulty (1-2), decent impact (2+)

6. **Highlight high priorities** - impact 4-5 regardless of difficulty

## Example Output

```
| # | Title | Labels | Diff | Impact | Notes |
|---|-------|--------|------|--------|-------|
| 42 | Fix CSS regression | bug | 1 | 3 | 1-line fix |
```

## Notes

- For large repos, focus on first 100 issues
- Labels like "good first issue" suggest low difficulty
- "bug" labels often higher impact than "enhancement"
