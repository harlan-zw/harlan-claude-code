---
description: Save current plan to .claude/plans/ for persistence
args: plan_name
---

Save the current implementation plan for future reference.

## Steps

1. **Create plans directory** if it doesn't exist
   ```bash
   mkdir -p .claude/plans
   ```

2. **Generate filename**
   - Use provided name: `$ARGUMENTS` or
   - Auto-generate from date: `plan-YYYY-MM-DD-HHMMSS.md`

3. **Write plan file** to `.claude/plans/[name].md`

   Include:
   ```markdown
   # Plan: [Title]

   Created: [timestamp]
   Status: in-progress | completed | abandoned

   ## Context
   [What problem this solves]

   ## Approach
   [High-level strategy]

   ## Steps
   - [ ] Step 1
   - [ ] Step 2
   - [ ] Step 3

   ## Files to modify
   - `path/to/file.ts` - description
   - `path/to/other.ts` - description

   ## Notes
   [Any decisions, trade-offs, or considerations]
   ```

4. **Confirm save** with path to file

## Usage

Plans are automatically included in session context during compaction, so interrupted work can be resumed.

Reference plans in new conversations: "Continue the plan in .claude/plans/auth-refactor.md"
