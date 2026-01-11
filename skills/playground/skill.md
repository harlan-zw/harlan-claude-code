---
description: Start Nuxt dev server for module playground
user_invocable: true
---

# Playground Skill

Start the Nuxt development server for a module's playground.

## Steps

1. Detect playground location:
   - `playground/` directory (most common)
   - `docs/` directory (for doc sites)
   - Root if it's a Nuxt app

2. Check for existing dev process and warn

3. Run `pnpm dev` or `nuxi dev <dir>`

## Commands

```bash
# If playground/ exists
nuxi dev playground

# If script exists in package.json
pnpm dev

# For docs
nuxi dev docs
```

## Usage

```
/playground       # start playground
/playground docs  # start docs dev server
```

## Notes

- Playground runs on port 3000 by default
- Use `--port` to specify different port
- Check `.nuxtrc` for custom playground config
