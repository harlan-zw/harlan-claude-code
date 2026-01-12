# src/module.ts Template

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

## Mock Pattern (when disabled)

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
