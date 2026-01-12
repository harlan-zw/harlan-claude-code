---
description: Initialize or sync Claude Code plugin structure
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

---

## Directory Structure

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json      # manifest (required)
├── skills/              # markdown prompts
│   └── my-skill/
│       └── skill.md
├── hooks/               # bash scripts
└── commands/            # slash commands
```

---

## plugin.json

```json
{
  "name": "my-plugin",
  "version": "0.1.0",
  "description": "Short description",
  "author": {
    "name": "Harlan Wilton",
    "email": "harlan@harlanzw.com"
  },
  "license": "MIT",
  "repository": "https://github.com/harlan-zw/repo",
  "skills": [
    {
      "name": "skill-name",
      "path": "${CLAUDE_PLUGIN_ROOT}/skills/skill-name/skill.md"
    }
  ]
}
```

See `references/hooks.md` for hook configuration.

---

## Skill Frontmatter

```yaml
---
description: What this skill does
user_invocable: true
---
```

For complex skills, add `references/` subdirectory.

---

## Sync Checklist

1. [ ] `plugin.json` - skills array, hooks registered
2. [ ] Skills have frontmatter with `description` and `user_invocable`
3. [ ] README documents installation
