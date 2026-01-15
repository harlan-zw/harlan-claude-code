---
description: Review recent changes for issues and improvements
---

Review the current changes and provide feedback.

## Steps

1. **Get diff of changes**
   ```bash
   git diff HEAD
   git diff --cached
   ```

2. **Check static analysis output**
   Note: `eslint.sh` and `vitest.sh` hooks run automatically on Write/Edit.
   - Review any lint/test output from recent edits
   - Run full checks only if needed:
     - `pnpm lint` - full lint check
     - `pnpm typecheck` - type checking
     - `pnpm test` - full test suite

3. **Review for common issues**

   Check each changed file for:
   - **Logic errors**: Off-by-one, null checks, async/await issues
   - **Security**: XSS, injection, exposed secrets, unsafe operations
   - **Performance**: N+1 queries, unnecessary re-renders, memory leaks
   - **Types**: Any usage, missing types, incorrect generics
   - **Edge cases**: Empty arrays, undefined, error paths

4. **Check architectural concerns**
   - Does this follow existing patterns in the codebase?
   - Are there abstraction leaks?
   - Is error handling consistent?
   - Are new dependencies justified?

5. **Output format**

   Provide a summary:
   ```
   ## Review Summary

   ### 🔴 Critical (must fix)
   - [file:line] Description

   ### 🟡 Warnings (should fix)
   - [file:line] Description

   ### 🟢 Suggestions (nice to have)
   - [file:line] Description

   ### ✅ What looks good
   - Brief positive notes
   ```

Only report issues you're confident about. Don't nitpick style if there's a linter.
