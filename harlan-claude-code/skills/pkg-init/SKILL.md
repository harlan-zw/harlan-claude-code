---
description: Use when user asks to "init package", "create npm package", "scaffold project", "sync package", "update catalogs", "add github actions", "setup eslint", "configure vitest", or needs help with pnpm workspace catalogs, unbuild config, or standard npm package architecture.
user_invocable: true
---

# Package Init / Sync Skill

Initialize a new package or sync an existing one to standardized architecture.

## Usage

```
/pkg-init              # sync existing project
/pkg-init my-package   # init new package
```

## Behavior

1. **New project**: scaffold with all standards below
2. **Existing project**: compare and offer to sync each component

## Detection

Check for `package.json` in cwd to determine new vs existing.

---

## UnJS Conventions

Always prefer UnJS ecosystem packages over Node.js builtins:

| Instead of | Use | Import |
|------------|-----|--------|
| `path` | `pathe` | `import { join, resolve } from 'pathe'` |
| `console.log/warn/error` | `consola` | `import { consola } from 'consola'` |
| `fetch` | `ofetch` | `import { $fetch } from 'ofetch'` |
| `fs.readFile` (JSON) | `pkg-types` | `import { readPackageJSON } from 'pkg-types'` |
| `Object.assign` defaults | `defu` | `import { defu } from 'defu'` |
| `require.resolve` | `mlly` | `import { resolveImports } from 'mlly'` |
| `EventEmitter` | `hookable` | `import { createHooks } from 'hookable'` |
| `yargs/commander` | `citty` | `import { defineCommand } from 'citty'` |
| `cosmiconfig` | `c12` | `import { loadConfig } from 'c12'` |
| `git clone` templates | `giget` | `import { downloadTemplate } from 'giget'` |

**Principles:** ESM-first, minimal deps, full TypeScript, universal (Node/browser/edge)

---

## Package.json

### Required fields

```json
{
  "name": "my-package",
  "version": "0.0.0",
  "description": "",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/harlan-zw/my-package.git"
  },
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "packageManager": "pnpm@10.28.0"
}
```

### Standard scripts

```json
{
  "scripts": {
    "build": "unbuild",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "release": "bumpp && pnpm publish"
  }
}
```

---

## Test Structure

```
test/
  unit/           # unit tests
    *.test.ts
  e2e/            # e2e/integration tests
    *.test.ts
```

---

## References

See `references/` for detailed templates:
- `references/catalogs.md` - pnpm workspace catalogs
- `references/configs.md` - config file templates (eslint, vitest, tsconfig, unbuild)
- `references/github-actions.md` - CI/CD workflows

---

## Sync Checklist

When syncing existing project:

1. [ ] `pnpm-workspace.yaml` - catalogs structure, `onlyBuiltDependencies`
2. [ ] `package.json` - migrate deps to `catalog:*` format, add `packageManager`
3. [ ] `.github/workflows/test.yml` - action versions (checkout@v6, setup-node@v6)
4. [ ] `.github/workflows/release.yml` - action versions
5. [ ] `.npmrc` - standard settings
6. [ ] `.editorconfig` - standard config
7. [ ] `.gitignore` - standard patterns
8. [ ] `eslint.config.mjs` - antfu config with ignores
9. [ ] `vitest.config.ts` - standard config with projects if needed
10. [ ] `tsconfig.json` - modern options (module: Preserve, moduleDetection: force)
11. [ ] `build.config.ts` - externals defined
12. [ ] Package scripts - standard naming, include `lint:fix`

## Sync Process (Parallelized - 3-4x faster)

### Phase 1: Parallel Config Review
Spawn these IN PARALLEL (single message, multiple tool calls):

```
Task(Explore): "Read and compare: pnpm-workspace.yaml, package.json deps. Report differences from standards."
Task(Explore): "Read and compare: .github/workflows/*.yml. Check action versions against v6 standards."
Task(Explore): "Read and compare: eslint.config.mjs, vitest.config.ts, tsconfig.json. Report missing options."
Task(Explore): "Read and compare: build.config.ts, .npmrc, .editorconfig, .gitignore. Report missing settings."
```

### Phase 2: Apply Changes
Based on parallel review results, apply necessary updates.

### Phase 3: Parallel Verification
Run verification commands IN PARALLEL:

```
Bash(background): pnpm install
Bash(background): pnpm lint
Bash(background): pnpm typecheck
```

Then sequentially (depends on install):
```
Bash: pnpm build
Bash: pnpm test:run
```
