---
name: tdd
description: Use when user says "write tests first", "TDD", "test-driven", "tests before implementation", or when implementing a feature where verification is critical. Creates scratchpad, writes failing tests, then iterates implementation until tests pass.
user_invocable: true
---

# Test-Driven Development Workflow

Structured TDD approach with grind pattern for autonomous iteration.

## Phase 1: Write Tests

1. **Initialize scratchpad**
   ```markdown
   # .claude/scratchpad.md
   ## Goal
   TDD: [feature/fix description]

   ## Phase
   1. Writing tests

   ## Current Task
   - [ ] Write test cases
   - [ ] Confirm tests fail
   - [ ] Commit tests
   ```

2. **Write test cases** based on expected behavior
   - Focus on input/output pairs
   - Cover happy path and edge cases
   - NO mocks for unimplemented functionality
   - Use existing test patterns in the codebase

3. **Run tests** - confirm they fail
   ```bash
   pnpm test [test-file]
   ```

4. **Commit tests** (if requested)
   ```bash
   git add [test-files]
   git commit -m "test: add tests for [feature]"
   ```

## Phase 2: Implement

1. **Update scratchpad**
   ```markdown
   ## Phase
   2. Implementing

   ## Current Task
   - [ ] Write minimal implementation
   - [ ] Verify tests pass
   - [ ] Iterate until pass
   ```

2. **Write implementation**
   - Minimal code to pass tests
   - Do NOT modify tests
   - Focus on one test at a time

3. **Tests auto-run on each edit**
   - `vitest.sh` hook runs related tests automatically on Write/Edit
   - `eslint.sh` hook auto-fixes lint issues
   - `typecheck.sh` suggests running typecheck
   - Check hook output for failures

4. **Iterate** until all tests pass
   - Grind hook will continue automatically if scratchpad not marked DONE
   - If tests keep failing, update scratchpad with what's blocking

5. **Mark complete**
   ```markdown
   ## DONE
   All tests passing
   - Tests: [count] passing
   - Files: [list]
   ```

## Phase 3: Refactor (Optional)

1. With tests green, refactor implementation
2. Run tests after each refactor
3. Keep tests passing throughout

## Key Rules

- **Never modify tests during implementation phase**
- **Tests must fail before implementation**
- **Commit tests separately from implementation**
- **Use real dependencies, not mocks for new code**
- **One test at a time for complex features**
