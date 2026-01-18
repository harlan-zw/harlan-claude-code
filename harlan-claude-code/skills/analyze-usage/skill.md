---
name: analyze-usage
description: Analyze Claude Code usage patterns to identify skill improvement opportunities
---

# Usage Pattern Analysis

Analyze session logs from `~/.claude/logs/sessions/` to identify improvement opportunities.

## What's Logged

Each session has a jsonl file with:
- First line: `{type: "session_start", project: "...", branch: "...", ts: ...}`
- Subsequent lines: `{tool: "Skill|Write|Edit|Task", ts: ..., ctx: {...}}`

## Patterns to Detect

**Skill Corrections** - Edit follows Skill (output needed fixing):
```
{tool: "Skill", ctx: {skill: "diagram"}}
{tool: "Edit", ctx: {file: "diagram.md"}}  <- user fixed output
```
Action: Improve that skill's output quality

**Edit Chains** - Many edits to same file type:
```
{tool: "Edit", ctx: {file: "foo.ts"}}
{tool: "Edit", ctx: {file: "foo.ts"}}
{tool: "Edit", ctx: {file: "foo.ts"}}
```
Action: Potential automation opportunity if pattern repeats across sessions

**Skill Frequency** - Which skills get used:
- Never used = dead or undiscoverable, consider removing
- Heavily used = invest in improving quality

**Agent Usage** - Task tool patterns:
- Which agents get spawned most
- Agents that could be skills instead

## Analysis Steps

1. List recent sessions:
```bash
ls -lt ~/.claude/logs/sessions/*.jsonl | head -20
```

2. Get overview of each session:
```bash
for f in $(ls -t ~/.claude/logs/sessions/*.jsonl 2>/dev/null | head -10); do
  echo "=== $(basename "$f" .jsonl) ==="
  head -1 "$f" | jq -r '"Project: \(.project | split("/") | .[-1])"'
  echo "Skills: $(grep -o '"skill":"[^"]*"' "$f" | cut -d'"' -f4 | sort | uniq -c | sort -rn | tr '\n' ' ')"
  echo "Edits: $(grep -c '"Edit"' "$f" 2>/dev/null || echo 0)"
  echo ""
done
```

3. Find skill corrections (Skill followed by Edit within 60s):
```bash
# Parse with jq, look for Skill->Edit sequences
```

4. Aggregate skill usage across all sessions:
```bash
grep -h '"Skill"' ~/.claude/logs/sessions/*.jsonl 2>/dev/null | \
  jq -r '.ctx.skill' | sort | uniq -c | sort -rn
```

5. Compare against available skills to find unused ones.

## Output Format

Group findings into:
- **Fix**: Skills producing output that needs correction (with examples)
- **Automate**: Repeated manual patterns that could be skills
- **Remove**: Skills never/rarely used
- **Promote**: Useful skills that could be more discoverable
