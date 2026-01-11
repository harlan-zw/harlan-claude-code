---
description: Initialize or sync Nuxt module architecture (catalogs, playground, fixtures, GH actions)
user_invocable: true
---

# Nuxt Module Init / Sync Skill

Initialize a new Nuxt module or sync an existing one to standardized architecture.

Extends `/pkg-init` with Nuxt-specific patterns.

## Usage

```
/nuxt-module-init                # sync existing module
/nuxt-module-init my-module      # init new module
```

## Behavior

1. **New module**: scaffold with nuxt-module-builder + all standards
2. **Existing module**: compare and offer to sync each component

## Detection

Check for `@nuxt/module-builder` in devDependencies.

---

## Additional Catalogs

Add these to `pnpm-workspace.yaml` alongside base catalogs from `/pkg-init`:

```yaml
catalogs:
  # ... base catalogs from /pkg-init ...

  # Nuxt testing
  dev-test:
    vitest: ^4.0.16
    happy-dom: ^20.1.0
    '@vue/test-utils': ^2.4.6
    '@nuxt/test-utils': ^3.23.0
    playwright: ^1.57.0

  # Vue build
  dev-build:
    typescript: ^5.9.3
    unbuild: ^3.6.1
    vue-tsc: ^3.2.2
    bumpp: ^10.3.2
    '@arethetypeswrong/cli': ^0.18.2

  # Nuxt ecosystem
  nuxt:
    '@nuxt/kit': ^4.2.2
    '@nuxt/module-builder': ^1.0.2
    '@nuxt/schema': ^4.2.2
    nuxt: ^4.2.2
    nitropack: ^2.12.9
```

---

## Module Structure

```
src/
├── module.ts              # Main module entry (build-time)
├── runtime/
│   ├── app/               # Client/SSR code (Vue context)
│   │   ├── composables/   # Auto-imported composables
│   │   │   └── useX.ts
│   │   ├── components/    # Auto-imported components
│   │   ├── plugins/       # Nuxt plugins
│   │   │   ├── init.ts
│   │   │   └── X.server.ts  # SSR-only plugin
│   │   └── utils/         # Client utilities
│   ├── server/            # Nitro server code
│   │   ├── composables/   # Server composables (auto-imported)
│   │   │   └── useX.ts
│   │   ├── plugins/       # Nitro plugins (startup hooks)
│   │   │   └── init.ts
│   │   ├── routes/        # API endpoints
│   │   │   ├── api.ts
│   │   │   └── __my-module__/  # Debug routes (prefixed)
│   │   │       └── debug.ts
│   │   ├── middleware/    # H3 middleware
│   │   └── utils/         # Server utilities
│   ├── shared/            # Isomorphic code (client + server)
│   │   ├── utils.ts
│   │   └── constants.ts
│   └── types.ts           # Runtime types
├── content.ts             # Content module integration (optional)
└── types.ts               # Module options types

playground/
├── nuxt.config.ts
├── app.vue
└── pages/
    └── index.vue

test/
├── unit/
│   └── *.test.ts
├── e2e/
│   └── *.test.ts
└── fixtures/
    ├── basic/
    │   ├── nuxt.config.ts
    │   └── app.vue
    └── i18n/              # Additional fixture variants
```

### Runtime Directory Rules

**`runtime/app/`** - Client & SSR code (Vue context)
- Has access to `useNuxtApp()`, `useRuntimeConfig()`, Vue reactivity
- Composables auto-imported via `addImports()`
- Plugins registered via `addPlugin()`
- Use `.server.ts` suffix for SSR-only files
- Use `.client.ts` suffix for client-only files

**`runtime/server/`** - Nitro server code
- Has access to H3, Nitro context, `useRuntimeConfig()`
- NO access to Vue, Nuxt app context
- Composables auto-imported via `addServerImportsDir()`
- Plugins registered via `addServerPlugin()` (run on Nitro startup)
- Routes registered via `addServerHandler()`
- Debug routes prefixed with `__module-name__/`

**`runtime/shared/`** - Isomorphic code
- Pure JS/TS utilities usable in both contexts
- NO framework-specific imports (no Vue, no H3)
- Constants, type guards, pure functions
- Import via alias in both app/ and server/

---

## src/module.ts Template

```ts
import { addImports, addPlugin, addServerHandler, addServerImportsDir, addServerPlugin, createResolver, defineNuxtModule, hasNuxtModule } from '@nuxt/kit'
import type { ModuleOptions } from './types'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'my-module',
    configKey: 'myModule',
  },
  defaults: {
    enabled: true,
  },
  async setup(config, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    // Skip if disabled
    if (!config.enabled)
      return

    // Aliases for clean imports
    nuxt.options.alias['#my-module'] = resolve('./runtime')
    nuxt.options.nitro.alias ||= {}
    nuxt.options.nitro.alias['#my-module'] = resolve('./runtime')
    nuxt.options.nitro.alias['#my-module/server'] = resolve('./runtime/server')

    // App plugins
    addPlugin({
      src: resolve('./runtime/app/plugins/init'),
      mode: 'all', // or 'server' | 'client'
    })

    // App composables (auto-imported)
    addImports({
      name: 'useMyModule',
      from: resolve('./runtime/app/composables/useMyModule'),
    })

    // Server composables (auto-imported in Nitro)
    addServerImportsDir(resolve('./runtime/server/composables'))

    // Nitro plugin (runs on server startup)
    addServerPlugin(resolve('./runtime/server/plugins/init'))

    // API routes
    addServerHandler({
      route: '/api/my-module',
      handler: resolve('./runtime/server/routes/api'),
    })

    // Debug routes (dev only)
    if (nuxt.options.dev) {
      addServerHandler({
        route: '/__my-module__/debug',
        handler: resolve('./runtime/server/routes/__my-module__/debug'),
      })
    }

    // H3 middleware
    addServerHandler({
      middleware: true,
      handler: resolve('./runtime/server/middleware/context'),
    })

    // Conditional features based on other modules
    if (hasNuxtModule('@nuxt/content')) {
      addServerPlugin(resolve('./runtime/server/plugins/content'))
    }

    // Virtual modules (dynamic content at build time)
    nuxt.hooks.hook('nitro:config', (nitroConfig) => {
      nitroConfig.virtual ||= {}
      nitroConfig.virtual['#my-module/virtual'] = `export default ${JSON.stringify(config)}`
    })

    // Runtime config
    nuxt.options.runtimeConfig.public.myModule = defu(
      nuxt.options.runtimeConfig.public.myModule,
      { enabled: config.enabled }
    )
  },
})
```

### Registration Patterns

| What | Function | Mode/Location |
|------|----------|---------------|
| App composable | `addImports()` | auto-imported in Vue |
| App plugin | `addPlugin()` | `mode: 'all'/'server'/'client'` |
| App component | `addComponent()` | auto-imported in Vue |
| Server composable | `addServerImportsDir()` | auto-imported in Nitro |
| Server plugin | `addServerPlugin()` | runs on Nitro startup |
| API route | `addServerHandler({ route })` | GET/POST endpoint |
| Middleware | `addServerHandler({ middleware: true })` | H3 middleware |

### Mock Pattern (when disabled)

```ts
// In module setup when disabled:
if (!config.enabled) {
  // Provide mock composables so imports don't break
  addImports({
    name: 'useMyModule',
    from: resolve('./runtime/app/composables/mock'),
  })

  // Mock server composables
  nuxt.hooks.hook('nitro:config', (nitroConfig) => {
    nitroConfig.imports ||= {}
    nitroConfig.imports.presets ||= []
    nitroConfig.imports.presets.push({
      from: resolve('./runtime/server/composables/mock'),
      imports: ['useMyServerComposable'],
    })
  })
  return
}
```

---

## Config Overrides

### tsconfig.json

Nuxt modules extend generated config:

```json
{
  "extends": "./.nuxt/tsconfig.json"
}
```

**Important**: Requires `nuxi prepare` before typecheck works.

### vitest.config.ts

Use `@nuxt/test-utils/config` for e2e tests:

```ts
import { defineConfig, defineProject } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

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
      defineVitestProject({
        test: {
          name: 'e2e',
          include: ['test/e2e/**/*.test.ts'],
          environment: 'nuxt',
          environmentOptions: {
            nuxt: {
              rootDir: './test/fixtures/basic',
            },
          },
        },
      }),
    ],
  },
})
```

### eslint.config.mjs

```js
import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  ignores: [
    'CLAUDE.md',
    'test/fixtures/**',
    'playground/**',
  ],
})
```

### build.config.ts

Nuxt modules need externals for runtime dependencies:

```ts
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: true,
  entries: [
    'src/module',
    // Additional entries for separate bundles
    { input: 'src/content', name: 'content' },
  ],
  externals: [
    // Nuxt core
    'nuxt',
    'nuxt/schema',
    '@nuxt/kit',
    '@nuxt/schema',
    'nitropack',
    'nitropack/types',
    'h3',
    // Vue
    'vue',
    'vue-router',
    '@vue/runtime-core',
    // Common deps
    '#imports',
  ],
})
```

### .gitignore additions

```gitignore
# Nuxt
.nuxt
.output
playground/.nuxt
playground/.output
test/fixtures/**/.nuxt
test/fixtures/**/.output
```

---

## Package.json

### Nuxt module exports

```json
{
  "name": "@nuxtjs/my-module",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/module.mjs",
      "require": "./dist/module.cjs"
    }
  },
  "main": "./dist/module.cjs",
  "types": "./dist/types.d.ts",
  "files": ["dist"],
  "peerDependencies": {
    "nuxt": "^3.0.0 || ^4.0.0"
  }
}
```

### Nuxt module scripts

```json
{
  "scripts": {
    "build": "nuxt-module-build build",
    "dev": "nuxi dev playground",
    "dev:prepare": "nuxt-module-build prepare && nuxi prepare playground",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "nuxt typecheck",
    "prepare:fixtures": "nuxi prepare test/fixtures/basic",
    "test": "pnpm prepare:fixtures && vitest",
    "test:run": "pnpm prepare:fixtures && vitest run",
    "release": "bumpp && pnpm publish"
  }
}
```

---

## Playground Setup

### playground/nuxt.config.ts

```ts
export default defineNuxtConfig({
  modules: ['../src/module'],

  myModule: {
    // module options
  },

  devtools: { enabled: true },
  compatibilityDate: '2025-01-01',
})
```

### playground/app.vue

```vue
<template>
  <div>
    <NuxtPage />
  </div>
</template>
```

### playground/pages/index.vue

```vue
<template>
  <div>
    <h1>My Module Playground</h1>
  </div>
</template>
```

---

## Test Fixtures

### test/fixtures/basic/nuxt.config.ts

```ts
export default defineNuxtConfig({
  modules: ['../../../src/module'],

  myModule: {
    // test options
  },
})
```

### test/fixtures/basic/app.vue

```vue
<template>
  <div>
    <NuxtPage />
  </div>
</template>
```

---

## GitHub Actions

### .github/workflows/test.yml (Nuxt variant)

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

      - name: Prepare
        run: pnpm dev:prepare

      - name: Typecheck
        run: pnpm typecheck

      - name: Build
        run: pnpm build

      - name: Test
        run: pnpm test:run
```

---

## E2E Test Patterns

### Basic module test

```ts
import { describe, expect, it } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('my-module', async () => {
  await setup({
    rootDir: './test/fixtures/basic',
  })

  it('renders page', async () => {
    const html = await $fetch('/')
    expect(html).toContain('My Module')
  })
})
```

### Testing composables

```ts
import { describe, expect, it } from 'vitest'
import { setup, useTestContext } from '@nuxt/test-utils/e2e'

describe('composables', async () => {
  await setup({
    rootDir: './test/fixtures/basic',
  })

  it('useMyComposable works', async () => {
    const ctx = useTestContext()
    // test composable behavior
  })
})
```

---

## Sync Checklist (Nuxt additions)

In addition to `/pkg-init` checklist:

**Structure:**
1. [ ] `src/module.ts` - main module entry exists
2. [ ] `src/runtime/app/` - client/SSR code directory
3. [ ] `src/runtime/server/` - Nitro server code directory
4. [ ] `src/runtime/shared/` - isomorphic utilities (if needed)
5. [ ] `src/types.ts` - module options types
6. [ ] `playground/` - exists with nuxt.config.ts, app.vue, pages/
7. [ ] `test/fixtures/basic/` - exists with nuxt.config.ts

**Config:**
8. [ ] `pnpm-workspace.yaml` - add `nuxt:` catalog
9. [ ] `package.json` - nuxt module exports, peerDependencies
10. [ ] `tsconfig.json` - extends `.nuxt/tsconfig.json`
11. [ ] `vitest.config.ts` - use `defineVitestProject` for e2e
12. [ ] `build.config.ts` - nuxt externals including `#imports`
13. [ ] `eslint.config.mjs` - ignore fixtures/playground
14. [ ] `.gitignore` - nuxt build dirs (.nuxt, .output)

**Scripts:**
15. [ ] `typecheck` - uses `nuxt typecheck` (not `tsc --noEmit`)
16. [ ] `dev:prepare` - prepares module + playground
17. [ ] `prepare:fixtures` - prepares test fixtures
18. [ ] `.github/workflows/test.yml` - includes prepare step before typecheck

### Typecheck Difference

| Project Type | Command | Why |
|--------------|---------|-----|
| Nuxt module | `nuxt typecheck` | Uses generated `.nuxt/tsconfig.json` with auto-imports |
| Non-Nuxt lib | `tsc --noEmit` | Standard TypeScript check |

## Common Migration Issues

1. **"Cannot find module '#imports'"** - add to externals in build.config.ts
2. **Typecheck fails without prepare** - run `pnpm dev:prepare` first (generates .nuxt/)
3. **E2E tests fail** - check fixture nuxt.config points to correct module path (`../../../src/module`)
4. **Runtime code bundled wrong** - ensure runtime/ files use runtime imports only
5. **Server composables not found** - use `addServerImportsDir()` not `addImports()`
6. **Plugin runs twice** - check `mode` is set correctly ('server', 'client', or 'all')
