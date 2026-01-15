---
description: Fetch GitHub issue, implement fix, create PR
args: issue_number
---

Fix GitHub issue #$ARGUMENTS and create a PR.

## Workflow

1. **Fetch issue details**
   ```bash
   gh issue view $ARGUMENTS --json title,body,labels,comments
   ```

2. **Initialize scratchpad** for grind pattern
   Create `.claude/scratchpad.md`:
   ```markdown
   ## Goal
   Fix issue #$ARGUMENTS: [issue title]

   ## Current Task
   - [ ] Understand the issue
   - [ ] Find relevant code
   - [ ] Implement fix
   - [ ] Add/update tests
   - [ ] Verify fix works

   ## Status
   In progress
   ```

3. **Create feature branch**
   ```bash
   git checkout -b fix/issue-$ARGUMENTS
   ```

4. **Find relevant code** using Explore agent or grep based on issue description

5. **Implement the fix** - make minimal changes to solve the issue
   - `eslint.sh` auto-fixes lint on each edit
   - `vitest.sh` runs related tests on each edit
   - `typecheck.sh` suggests typecheck after edits

6. **Verify all checks pass**
   - Check hook output for failures
   - Run full test suite if needed: `pnpm test`

7. **Update scratchpad** with progress after each step

8. **When complete**, mark scratchpad as DONE:
   ```markdown
   ## DONE
   Fixed issue #$ARGUMENTS
   - Changed: [files]
   - Tests: passing
   ```

9. **Create PR** using `/pr` command, linking the issue with "Fixes #$ARGUMENTS"
   - `pre-commit-push.sh` runs lint/typecheck/test before commit allowed
   - If blocked, fix issues and try again
