---
description: Use when user asks to "init plugin", "create claude plugin", "scaffold plugin", "sync plugin", "add hook", "create command", "add agent", "configure plugin.json", or needs help with Claude Code plugin architecture, hook events, skill frontmatter, or ${CLAUDE_PLUGIN_ROOT}.
user_invocable: true
---

# Claude Plugin Init / Sync Skill

Initialize a new Claude Code plugin or sync an existing one.

## Usage

```
/claude-plugin-init              # sync existing plugin
/claude-plugin-init my-plugin    # init new plugin
```

## Detection

Check for `.claude-plugin/plugin.json` to determine new vs existing.

## Delegation

For new plugins or significant improvements, invoke the `plugin-dev:create-plugin` skill:

```
Skill tool: skill="plugin-dev:create-plugin" args="Improve existing plugin: [plugin-name]. Improve all skills. Be creative and autonomous."
```

---

## Directory Structure

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json      # manifest (required)
├── package.json         # scripts: lint, release
├── eslint.config.js     # @antfu/eslint-config
├── scripts/
│   └── release.ts       # version bump + git tag
├── skills/              # markdown prompts
│   └── my-skill/
│       ├── skill.md
│       └── references/  # supporting docs
├── commands/            # slash commands
│   └── my-command.md
├── agents/              # subagents
│   └── my-agent.md
└── hooks/               # bash scripts
    └── my-hook.sh
```

## package.json Template

```json
{
  "name": "my-plugin",
  "type": "module",
  "packageManager": "pnpm@10.27.0",
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "release": "npx tsx scripts/release.ts"
  },
  "dependencies": {
    "@antfu/eslint-config": "^6.7.3",
    "eslint": "^9.39.2"
  },
  "devDependencies": {
    "@types/node": "^25.0.3",
    "typescript": "^5.9.3"
  }
}
```

---

## plugin.json

```json
{
  "name": "my-plugin",
  "version": "0.1.0",
  "description": "Short description",
  "author": {
    "name": "Your Name",
    "email": "you@example.com"
  },
  "license": "MIT",
  "repository": "https://github.com/user/repo",
  "skills": [
    {
      "name": "skill-name",
      "path": "${CLAUDE_PLUGIN_ROOT}/skills/skill-name/skill.md"
    }
  ],
  "agents": [
    {
      "name": "agent-name",
      "path": "${CLAUDE_PLUGIN_ROOT}/agents/agent-name.md"
    }
  ]
}
```

Commands in `commands/` are auto-discovered.

---

## Skill Frontmatter

```yaml
---
description: Use when user asks to "trigger phrase 1", "trigger phrase 2", or needs help with specific topic.
user_invocable: true
---
```

**Best practices:**
- Include specific trigger phrases in description
- Use progressive disclosure (lean main file + references/)
- Write in imperative form ("Do X" not "This does X")

---

## References

See `references/` for component details:
- `references/hooks.md` - hook events, matchers, blocking
- `references/commands.md` - command frontmatter, arguments
- `references/agents.md` - agent frontmatter, tools, registration

---

## Sync Checklist

1. [ ] `plugin.json` - skills array, hooks registered, agents registered
2. [ ] `package.json` - lint and release scripts
3. [ ] `eslint.config.js` - @antfu/eslint-config
4. [ ] `scripts/release.ts` - version bump script
5. [ ] Skills have frontmatter with `description` and `user_invocable`
6. [ ] Skills have trigger phrases in description
7. [ ] Commands have `description` in frontmatter
8. [ ] Agents have `model`, `color`, `tools` in frontmatter
9. [ ] README documents installation
10. [ ] All paths use `${CLAUDE_PLUGIN_ROOT}`

## Auto-improvements (when syncing)

- Better descriptions with trigger phrases
- Clearer instructions and examples
- Missing references or context
- Consistency across components
- Progressive disclosure patterns
