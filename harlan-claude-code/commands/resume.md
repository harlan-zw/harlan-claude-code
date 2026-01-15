---
description: Resume interrupted work from scratchpad or plan
---

Resume previous work session.

## Process

1. **Check for scratchpad** (`.claude/scratchpad.md`)
   - Read current goal and status
   - Identify incomplete tasks
   - Review any blockers noted

2. **Check for recent plans** (`.claude/plans/*.md`)
   - Find plans modified in last 24 hours
   - Read plan status and remaining steps

3. **Check session context** (`.claude/session-context.md`)
   - Review git state at last session
   - See recently modified files
   - Understand where work left off

4. **Resume work**
   - Update scratchpad with current task
   - Continue from where previous session stopped
   - Use grind pattern for autonomous iteration

## Output

Summarize what was found and continue working:

```
Resuming from scratchpad:
- Goal: [goal]
- Last task: [task]
- Status: [status]

Continuing with: [next action]
```

If no incomplete work found:
```
No incomplete work found. Ready for new task.
```
