---
description: Initialize or sync npm package architecture (catalogs, GH actions, configs)
user_invocable: true
---

# Package Init / Sync Skill

Initialize a new package or sync an existing one to standardized architecture.

## UnJS Conventions

Always prefer UnJS ecosystem packages over Node.js builtins and common alternatives:

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

**Principles:**
- ESM-first, avoid CJS
- Minimal dependencies
- Full TypeScript support
- Universal (Node, browser, edge)

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

## Standard Catalogs

Use named catalogs only (no default `catalog:`). Max 5 catalogs.

### pnpm-workspace.yaml

```yaml
packages:
  - playground
  # - packages/*  # for monorepos

catalogMode: prefer
shellEmulator: true
trustPolicy: no-downgrade

catalogs:
  # Runtime dependencies (usually peer deps)
  deps:
    defu: ^6.1.4
    pathe: ^2.0.3
    ufo: ^1.6.2
    ohash: ^2.0.11
    hookable: ^6.0.1

  # Linting
  dev-lint:
    '@antfu/eslint-config': ^6.7.3
    eslint: ^9.39.2

  # Testing
  dev-test:
    vitest: ^4.0.16

  # Build tooling
  dev-build:
    typescript: ^5.9.3
    unbuild: ^3.6.1
    bumpp: ^10.3.2
    '@arethetypeswrong/cli': ^0.18.2

onlyBuiltDependencies:
  - '@parcel/watcher'
  - esbuild
  - vue-demi
```

### Usage in package.json

```json
{
  "devDependencies": {
    "eslint": "catalog:dev-lint",
    "@antfu/eslint-config": "catalog:dev-lint",
    "vitest": "catalog:dev-test",
    "typescript": "catalog:dev-build"
  },
  "dependencies": {
    "defu": "catalog:deps"
  }
}
```

---

## GitHub Actions

### .github/workflows/test.yml

```yaml
name: Test

on:
  push:
    paths-ignore:
      - '**/README.md'
      - 'docs/**'

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
          cache: pnpm

      - run: pnpm i

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Build
        run: pnpm build

      - name: Test
        run: pnpm test:run
```

### .github/workflows/release.yml

```yaml
name: Release

permissions:
  contents: write
  id-token: write

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
          cache: pnpm
          registry-url: https://registry.npmjs.org

      - run: npx changelogithub
        env:
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}

      - run: pnpm i

      - run: pnpm build

      - run: pnpm publish -r --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}
```

---

## Config Files

### .npmrc

```ini
shamefully-hoist=true
strict-peer-dependencies=false
ignore-workspace-root-check=true
```

### .editorconfig

```ini
root = true

[*]
indent_size = 2
indent_style = space
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

### .gitignore

```gitignore
# Dependencies
node_modules

# Build output
dist
.output

# IDE
.idea
.vscode
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log

# Test
coverage

# Local
.env
.env.*
!.env.example
```

### eslint.config.mjs

```js
import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib', // or 'app' for applications
  ignores: [
    'CLAUDE.md',
  ],
})
```

### vitest.config.ts

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    reporters: 'dot',
  },
})
```

For projects with unit + e2e separation:

```ts
import { defineConfig, defineProject } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    reporters: 'dot',
    projects: [
      defineProject({
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
        },
      }),
      defineProject({
        test: {
          name: 'e2e',
          include: ['test/e2e/**/*.test.ts'],
        },
      }),
    ],
  },
})
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "Preserve",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "noUnusedLocals": true,
    "noEmit": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### build.config.ts

```ts
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: true,
  entries: [
    'src/index',
  ],
  externals: [
    // add runtime externals here
  ],
})
```

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

## Sync Checklist

When syncing existing project, check and update:

1. [ ] `pnpm-workspace.yaml` - catalogs structure, `onlyBuiltDependencies` (not `ignoredBuiltDependencies`)
2. [ ] `package.json` - migrate deps to `catalog:*` format, add `packageManager` field
3. [ ] `.github/workflows/test.yml` - action versions (checkout@v6, setup-node@v6, pnpm/action-setup@v4)
4. [ ] `.github/workflows/release.yml` - action versions
5. [ ] `.npmrc` - standard settings
6. [ ] `.editorconfig` - standard config
7. [ ] `.gitignore` - standard patterns
8. [ ] `eslint.config.mjs` - antfu config with ignores
9. [ ] `vitest.config.ts` - standard config with projects if needed
10. [ ] `tsconfig.json` - modern options (module: Preserve, moduleDetection: force)
11. [ ] `build.config.ts` - externals defined
12. [ ] Package scripts - standard naming, include `lint:fix`

## Sync Process

```bash
# 1. Check current state
cat pnpm-workspace.yaml
cat package.json | jq '.devDependencies'

# 2. Update catalogs
# Edit pnpm-workspace.yaml with standard catalogs

# 3. Migrate package.json deps to catalog:* format

# 4. Update GH actions to latest versions

# 5. Verify
pnpm install
pnpm lint
pnpm typecheck
pnpm build
pnpm test:run
```
