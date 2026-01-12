# Hook Configuration

## plugin.json hooks section

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.sh"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/my-hook.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/post-write.sh",
            "timeout": 30000
          }
        ]
      }
    ]
  }
}
```

## Hook Events

- `SessionStart` - session begins
- `PreToolUse` - before tool execution (can block)
- `PostToolUse` - after tool execution
- `PreCompact` - before context compaction
- `Stop` / `SubagentStop` - conversation ends

## Blocking Hook (PreToolUse)

```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [[ "$COMMAND" =~ ^npm ]]; then
  echo '{"decision": "block", "reason": "Use pnpm instead of npm"}'
  exit 0
fi
```

## Per-project disable

Target projects create `.claude/hooks.json`:

```json
{"disabled": ["hook-name"]}
```

Check in hook script:

```bash
CONFIG_FILE=".claude/hooks.json"
HOOK_NAME="my-hook"

if [[ -f "$CONFIG_FILE" ]]; then
  DISABLED=$(jq -r ".disabled // [] | index(\"$HOOK_NAME\")" "$CONFIG_FILE")
  if [[ "$DISABLED" != "null" ]]; then
    exit 0
  fi
fi
```
