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

3. **Parallel batch analysis** (8-10x faster than sequential)
   Split issues into batches and spawn parallel haiku agents:

   ```
   # Spawn 5-10 Task agents IN PARALLEL (single message, multiple tool calls)
   Task(model: haiku, prompt: "Analyze issues 1-10: [JSON]. Return JSON array with: number, difficulty (1-5), impact (1-5), hasRepro (bool), notes")
   Task(model: haiku, prompt: "Analyze issues 11-20: [JSON]. Return JSON array...")
   Task(model: haiku, prompt: "Analyze issues 21-30: [JSON]. Return JSON array...")
   ... (continue for all batches)
   ```

   Each agent evaluates:
   - **Difficulty** (1-5): code complexity, unknowns, testing effort
   - **Impact** (1-5): user-facing value, frequency, severity
   - **Has Repro**: reproduction steps, stackblitz/codesandbox links, minimal repo

4. **Merge results** from all agents into unified list

5. **Display table** sorted by: has repro (yes first), then impact/difficulty ratio
   Include columns: #, Title, Labels, Repro, Diff, Impact, Notes

6. **Highlight quick wins** - low difficulty (1-2), decent impact (2+)

7. **Highlight high priorities** - impact 4-5 regardless of difficulty

## Example Output

```
| # | Title | Labels | Repro | Diff | Impact | Notes |
|---|-------|--------|-------|------|--------|-------|
| 42 | Fix CSS regression | bug | ✓ | 1 | 3 | 1-line fix |
| 17 | Add dark mode | enhancement | | 2 | 4 | no repro needed |
```

## Notes

- For large repos, focus on first 100 issues
- Labels like "good first issue" suggest low difficulty
- "bug" labels often higher impact than "enhancement"
- Issues with reproductions are prioritized - easier to verify fix works
