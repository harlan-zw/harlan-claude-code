---
description: Fetch GitHub issue, implement fix, create PR
args: issue_number
---

Fix GitHub issue #$ARGUMENTS and create a PR.

## Workflow

1. **Parallel context gathering** (30-40% faster)
   Spawn these IN PARALLEL (single message, multiple tool calls):

   ```
   # Fetch issue while exploring codebase simultaneously
   Bash: gh issue view $ARGUMENTS --json title,body,labels,comments
   Task(Explore): "Find files related to: [issue keywords]. Search for error messages, function names, component names mentioned."
   Task(Explore): "Find test files that cover: [issue area]. Look for existing test patterns."
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

4. **Review exploration results** from parallel agents, identify target files

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
