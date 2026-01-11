---
description: Run vitest tests
user_invocable: true
---

# Test Skill

Run vitest tests for the project.

## Usage

```
/test              # run all tests
/test <pattern>    # run tests matching pattern
/test --watch      # run in watch mode
/test --coverage   # run with coverage
```

## Steps

1. Check vitest is installed
2. Run with appropriate flags:
   - Default: `pnpm vitest run`
   - With pattern: `pnpm vitest run <pattern>`
   - Watch mode: `pnpm vitest`
   - Coverage: `pnpm vitest run --coverage`

3. Summarize results - passed/failed/skipped counts

## Notes

- Check for `test` script in package.json first
- For Nuxt modules, tests may be in `test/` directory
- Report failed test names and file locations
