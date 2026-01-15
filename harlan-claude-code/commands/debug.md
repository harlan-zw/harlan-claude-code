---
description: Hypothesis-driven debugging with instrumentation
args: bug_description
---

Debug "$ARGUMENTS" using hypothesis-driven approach.

## Phase 1: Hypothesize

Generate 3-5 hypotheses about what could cause this bug:

```markdown
## Hypotheses

1. **[Most likely]** Description - why this could cause it
2. **[Possible]** Description - why this could cause it
3. **[Less likely]** Description - why this could cause it
```

For each hypothesis, identify:
- What code path would be involved
- What evidence would confirm/refute it
- What logging would help

## Phase 2: Instrument

Add targeted logging to gather evidence:

```typescript
// DEBUG: Hypothesis 1 - checking [condition]
console.log('[DEBUG H1]', { relevantVar, state })
```

Guidelines:
- Log at decision points
- Include timestamps for timing issues
- Log before/after suspect operations
- Use prefixes like `[DEBUG H1]` to track which hypothesis

## Phase 3: Reproduce

Ask user to reproduce the bug:
- What steps to take
- What to look for in console
- What behavior to observe

## Phase 4: Analyze

Review the evidence:
- Which hypothesis is confirmed?
- What unexpected behavior appeared?
- Refine hypotheses if needed

## Phase 5: Fix

Make targeted fix based on evidence:
- Fix only what the evidence points to
- `vitest.sh` auto-runs tests on each edit
- Remove debug logging when done
- Verify fix with full test suite if needed: `pnpm test`

## Scratchpad Integration

Initialize `.claude/scratchpad.md`:
```markdown
## Goal
Debug: $ARGUMENTS

## Hypotheses
1. [ ] Hypothesis 1 - not tested
2. [ ] Hypothesis 2 - not tested

## Evidence
[Add findings here]

## Status
Investigating
```

Update as evidence is gathered. Mark `## DONE` when bug is fixed and verified.
