---
description: Use when user asks to "init nuxt module", "create nuxt module", "scaffold module", "sync nuxt module", "add playground", "setup test fixtures", "configure @nuxt/test-utils", or needs help with Nuxt module architecture, runtime vs build-time code, addImports, addServerHandler, or nuxt-module-builder.
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

## Key Concepts

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
- `references/module-structure.md` - directory layout and runtime rules
- `references/module-template.md` - full src/module.ts template
- `references/configs.md` - vitest, tsconfig, build.config, package.json
- `references/test-patterns.md` - playground, fixtures, e2e tests

---

## Sync Checklist

In addition to `/pkg-init` checklist:

**Structure:**
1. [ ] `src/module.ts` - main module entry exists
2. [ ] `src/runtime/app/` - client/SSR code directory
3. [ ] `src/runtime/server/` - Nitro server code directory
4. [ ] `src/types.ts` - module options types
5. [ ] `playground/` - nuxt.config.ts, app.vue, pages/
6. [ ] `test/fixtures/basic/` - nuxt.config.ts

**Config:**
7. [ ] `pnpm-workspace.yaml` - add `nuxt:` catalog
8. [ ] `package.json` - nuxt module exports, peerDependencies
9. [ ] `tsconfig.json` - extends `.nuxt/tsconfig.json`
10. [ ] `vitest.config.ts` - use `defineVitestProject` for e2e
11. [ ] `build.config.ts` - nuxt externals including `#imports`
12. [ ] `eslint.config.mjs` - ignore fixtures/playground
13. [ ] `.gitignore` - nuxt build dirs

**Scripts:**
14. [ ] `typecheck` - uses `nuxt typecheck` (not `tsc`)
15. [ ] `dev:prepare` - prepares module + playground
16. [ ] `prepare:fixtures` - prepares test fixtures
17. [ ] `.github/workflows/test.yml` - includes prepare step
