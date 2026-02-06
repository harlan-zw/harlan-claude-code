---
description: Use when user asks to "init package", "create npm package", "scaffold project", "sync package", "update catalogs", "add github actions", "setup eslint", "configure vitest", "init nuxt module", "create nuxt module", "scaffold module", "sync nuxt module", "add playground", "setup test fixtures", "configure @nuxt/test-utils", or needs help with pnpm workspace catalogs, obuild config, standard npm package architecture, Nuxt module architecture, runtime vs build-time code, addImports, addServerHandler, or nuxt-module-builder.
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
Check for `packages:` in `pnpm-workspace.yaml` to detect monorepo vs single repo.
Check for `@nuxt/module-builder` in devDependencies to detect Nuxt module → apply Nuxt-specific patterns.

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

**Principles:** ESM-only, minimal deps, full TypeScript, universal (Node/browser/edge)

---

## Package.json

### Single repo

```json
{
  "name": "my-package",
  "type": "module",
  "version": "0.0.0",
  "packageManager": "pnpm@10.28.2",
  "description": "",
  "author": {
    "name": "Harlan Wilton",
    "email": "harlan@harlanzw.com",
    "url": "https://harlanzw.com/"
  },
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/harlan-zw/my-package"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.mts",
      "import": "./dist/index.mjs"
    }
  },
  "main": "./dist/index.mjs",
  "types": "./dist/index.d.mts",
  "files": ["dist"],
  "scripts": {
    "build": "obuild",
    "dev:prepare": "obuild --stub",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:attw": "attw --pack",
    "prepack": "pnpm run build",
    "release": "pnpm build && bumpp --output=CHANGELOG.md"
  },
  "devDependencies": {
    "@antfu/eslint-config": "catalog:",
    "@arethetypeswrong/cli": "catalog:",
    "@types/node": "catalog:",
    "obuild": "catalog:",
    "bumpp": "catalog:",
    "eslint": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

### Monorepo root

```json
{
  "type": "module",
  "private": true,
  "packageManager": "pnpm@10.28.2",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/harlan-zw/my-monorepo"
  },
  "scripts": {
    "build": "pnpm run -r build",
    "lint": "eslint .",
    "typecheck": "pnpm run -r typecheck",
    "test": "vitest",
    "test:attw": "pnpm -r --parallel --filter=./packages/** run test:attw",
    "release": "pnpm build && bumpp --output=CHANGELOG.md packages/*/package.json"
  },
  "devDependencies": {
    "@antfu/eslint-config": "catalog:",
    "@arethetypeswrong/cli": "catalog:",
    "@types/node": "catalog:",
    "bumpp": "catalog:",
    "eslint": "catalog:",
    "obuild": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
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
  fixtures/       # test data
```

---

## Nuxt Module (when `@nuxt/module-builder` detected)

### Build-time vs Runtime

| Context | Location | Access | Registration |
|---------|----------|--------|--------------|
| Build-time | `src/module.ts` | `@nuxt/kit`, nuxt config | runs during `nuxi build` |
| App runtime | `src/runtime/app/` | Vue, `useNuxtApp()` | `addPlugin()`, `addImports()` |
| Server runtime | `src/runtime/server/` | H3, Nitro | `addServerHandler()`, `addServerPlugin()` |
| Shared | `src/runtime/shared/` | Pure JS only | import via alias |

### Quick Reference

```ts
// Build-time (src/module.ts)
import { addImports, addPlugin, addServerHandler, addServerImportsDir, addServerPlugin, createResolver, defineNuxtModule } from '@nuxt/kit'

// App composable (auto-imported in Vue)
addImports({ name: 'useMyModule', from: resolve('./runtime/app/composables/useMyModule') })

// App plugin
addPlugin({ src: resolve('./runtime/app/plugins/init'), mode: 'all' })

// Server composables (auto-imported in Nitro)
addServerImportsDir(resolve('./runtime/server/composables'))

// Nitro plugin (runs on server startup)
addServerPlugin(resolve('./runtime/server/plugins/init'))

// API route
addServerHandler({ route: '/api/my-module', handler: resolve('./runtime/server/routes/api') })

// H3 middleware
addServerHandler({ middleware: true, handler: resolve('./runtime/server/middleware/context') })
```

---

## References

See `references/` for detailed templates:
- `references/catalogs.md` - pnpm workspace catalogs
- `references/configs.md` - config file templates (eslint, vitest, tsconfig, obuild)
- `references/github-actions.md` - CI/CD workflows

**Nuxt module references** (when `@nuxt/module-builder` detected):
- `references/nuxt-module-structure.md` - directory layout and runtime rules
- `references/nuxt-module-template.md` - full src/module.ts template
- `references/nuxt-configs.md` - vitest, tsconfig, build.config, package.json for Nuxt
- `references/nuxt-test-patterns.md` - playground, fixtures, e2e tests

---

## Sync Checklist

When syncing existing project:

1. [ ] `pnpm-workspace.yaml` - default catalog, `ignoredBuiltDependencies`, `shellEmulator`
2. [ ] `package.json` - `type: module`, migrate deps to `catalog:`, add `packageManager`
3. [ ] `.github/workflows/test.yml` - action versions (checkout@v6, setup-node@v6)
4. [ ] `.github/workflows/release.yml` - action versions, `bumpp --output=CHANGELOG.md`
5. [ ] `.editorconfig` - standard config
6. [ ] `.gitignore` - standard patterns
7. [ ] `eslint.config.js` - antfu config with standard rule overrides
8. [ ] `vitest.config.ts` - coverage config, projects if unit + e2e
9. [ ] `tsconfig.json` - `module: preserve`, `moduleDetection: force`, `types: ["node", "vitest/globals"]`
10. [ ] `build.config.ts` - obuild with explicit entry points
11. [ ] Package exports - ESM-only (`.d.mts` + `.mjs`), no CJS
12. [ ] Package scripts - `obuild`, `dev:prepare`, `test:attw`, `lint:fix`

### Additional Nuxt Module Checklist

When `@nuxt/module-builder` detected, also check:

**Structure:**
13. [ ] `src/module.ts` - main module entry exists
14. [ ] `src/runtime/app/` - client/SSR code directory
15. [ ] `src/runtime/server/` - Nitro server code directory
16. [ ] `src/types.ts` - module options types
17. [ ] `playground/` - nuxt.config.ts, app.vue, pages/
18. [ ] `test/fixtures/basic/` - nuxt.config.ts

**Config:**
19. [ ] `pnpm-workspace.yaml` - add `nuxt:` catalog
20. [ ] `package.json` - nuxt module exports, peerDependencies
21. [ ] `tsconfig.json` - extends `.nuxt/tsconfig.json`
22. [ ] `vitest.config.ts` - use `defineVitestProject` for e2e
23. [ ] `build.config.ts` - nuxt externals including `#imports`
24. [ ] `eslint.config.mjs` - ignore fixtures/playground
25. [ ] `.gitignore` - nuxt build dirs

**Scripts:**
26. [ ] `typecheck` - uses `nuxt typecheck` (not `tsc`)
27. [ ] `dev:prepare` - prepares module + playground
28. [ ] `prepare:fixtures` - prepares test fixtures
29. [ ] `.github/workflows/test.yml` - includes prepare step

## Sync Process (Parallelized)

### Phase 1: Parallel Config Review
Spawn these IN PARALLEL (single message, multiple tool calls):

```
Task(Explore): "Read and compare: pnpm-workspace.yaml, package.json deps. Report differences from standards."
Task(Explore): "Read and compare: .github/workflows/*.yml. Check action versions against v6 standards."
Task(Explore): "Read and compare: eslint.config.js, vitest.config.ts, tsconfig.json. Report missing options."
Task(Explore): "Read and compare: build.config.ts, .editorconfig, .gitignore. Report missing settings."
```

**If Nuxt module**, add in parallel:
```
Task(Explore): "Review src/module.ts: check registration methods, resolver usage, module options. Report issues."
Task(Explore): "Review src/runtime/app/: check composables export, plugins mode, imports registration."
Task(Explore): "Review src/runtime/server/: check server handlers, Nitro plugins, middleware. Verify no Vue deps."
Task(Explore): "Review playground/ and test/fixtures/: check nuxt.config, prepare scripts, test patterns."
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
Bash: pnpm test --run
```

**Nuxt module** verification:
```
Bash: pnpm dev:prepare && pnpm prepare:fixtures
Bash(background): pnpm lint
Bash(background): pnpm typecheck  # Uses nuxt typecheck
Bash: pnpm test:run
```
