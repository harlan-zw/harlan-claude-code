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
    ],
    "PreCompact": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/pre-compact.sh"
          }
        ]
      }
    ]
  }
}
```

## Hook Events

| Event | When | Can Block | Use Case |
|-------|------|-----------|----------|
| `SessionStart` | session begins | no | show status, load context |
| `PreToolUse` | before tool execution | yes | validate, block dangerous ops |
| `PostToolUse` | after tool execution | no | lint, test, notify |
| `PreCompact` | before context compaction | no | save context to file |
| `Stop` | conversation ends | no | cleanup, summary |
| `SubagentStop` | subagent completes | no | post-agent tasks |

## Matchers

```json
{
  "matcher": "Bash",           // single tool
  "matcher": "Write|Edit",     // multiple tools (regex)
  "matcher": ".*"              // all tools
}
```

## Blocking Hook (PreToolUse only)

```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [[ "$COMMAND" =~ ^npm ]]; then
  echo '{"decision": "block", "reason": "Use pnpm instead of npm"}'
  exit 0
fi
```

## Hook Input (stdin JSON)

```json
{
  "session_id": "abc123",
  "tool_name": "Bash",
  "tool_input": {
    "command": "npm install",
    "file_path": "/path/to/file"
  }
}
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
