---
description: Check package exports and types using attw (are the types wrong)
user_invocable: true
---

# Check Exports Skill

Verify package.json exports are correct and types are properly configured.

## Steps

1. Build the package first
2. Run attw to check exports
3. Report any issues

## Commands

```bash
# check exports
pnpm dlx @arethetypeswrong/cli --pack .

# or if attw is installed
pnpm attw --pack .
```

## Common Issues

### "No types found"
- Missing `types` field in exports
- Types not generated in dist/

### "Incorrect resolution"
- Mismatch between `import` and `types` paths
- Wrong file extensions (.mjs vs .js)

### "Internal resolution error"
- Circular dependencies
- Missing files in dist/

## Fix Pattern

```json
{
  "exports": {
    ".": {
      "types": "./dist/types.d.mts",
      "import": "./dist/module.mjs"
    }
  }
}
```

## Usage

```
/check-exports         # run attw
```

## Notes

- Always run after `/build-module`
- Check before publishing
- See .attw.json for config
