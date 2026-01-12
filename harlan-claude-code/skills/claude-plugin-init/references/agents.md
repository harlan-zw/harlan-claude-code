# Agent Configuration

## Agent Frontmatter

```yaml
---
model: sonnet # sonnet, opus, haiku
color: blue # terminal color
tools: # allowed tools
  - Read
  - Grep
  - Glob
---
```

## Agent File Structure

```markdown
---
model: sonnet
color: green
tools:
  - Read
  - Write
  - Bash
---

You are a specialized agent for [purpose].

## Your Role

[Describe what this agent does]

## Guidelines

1. [Guideline 1]
2. [Guideline 2]

## Output Format

[Describe expected output]
```

## Example: agents/code-reviewer.md

```markdown
---
model: sonnet
color: yellow
tools:
  - Read
  - Grep
  - Glob
---

You are a code review agent that analyzes code for bugs, security issues, and best practices.

## Your Role

Review code changes and provide actionable feedback.

## Review Categories

1. **Bugs**: Logic errors, edge cases, null checks
2. **Security**: Injection, XSS, hardcoded secrets
3. **Performance**: N+1 queries, unnecessary loops
4. **Style**: Naming, formatting, consistency

## Output Format

For each issue:
- File and line number
- Category (bug/security/performance/style)
- Description
- Suggested fix
```

## Registration in plugin.json

```json
{
  "agents": [
    {
      "name": "code-reviewer",
      "path": "${CLAUDE_PLUGIN_ROOT}/agents/code-reviewer.md"
    }
  ]
}
```

## Triggering Agents

Agents are triggered via the Task tool with `subagent_type`:

```
Task tool: subagent_type="plugin-name:agent-name"
```
