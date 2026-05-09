# Vue Conventions

Framework-agnostic Vue patterns the skill applies regardless of whether the codebase is Nuxt, Vite + Vue, or another shell. The Nuxt-specific application of these patterns lives in [NUXT-APP-CONVENTIONS.md](NUXT-APP-CONVENTIONS.md).

The dominant smell on the Vue side is **logic in components** — `<script setup>` blocks growing into multi-hundred-line slabs of refs, watchers, async calls, validation, and error mapping. That's an architectural smell, not style: a component with logic inside is only testable through component mounting, which means jsdom, hydration mismatches, async flush quirks, and slow tests. The seam discipline pushes logic out of components into composables you can unit-test directly.

> **These are deepening candidates, not unconditional rules.** Surface them during the Explore phase ([SKILL.md](SKILL.md) §1); walk the design tree in the grilling loop ([SKILL.md](SKILL.md) §3); accept rejections with load-bearing reasons via ADR. **No DI container** — vitest module mocking + Vue's `provide`/`inject` cover what one would. Vocabulary: the **module** is the *composable*; "service" describes what the composable owns and is fine in that compound, but don't drop "composable" — that's the Vue shape per [LANGUAGE.md](LANGUAGE.md).

## 1. Service composables (factory + provide + use)

**Gap.** Heavy logic lives in `<script setup>`: form state, validation, submission, async loaders, derived state, error mapping. The component owns the logic *and* the markup. The only way to test it is to mount it.

**Smell signals.**

- More than ~80 lines in `<script setup>` with multiple `ref`s, `watch`es, and async functions.
- The same `ref` + handler pair duplicated across two or more components in the same feature.
- A child component receives state via prop drilling that the parent only owns because it called an async loader once.
- The component cannot be tested without `mount()` + `flushPromises()` + jsdom.

**Seam.** A **service composable** owns the feature's state and behaviour as a plain factory function. A `provide` wrapper publishes the instance to a subtree; a `use` accessor consumes it. The injection key *is* the seam — tests, storybook, parent overrides all swap the implementation by calling `provide(KEY, fake)` higher up.

The factory is split out so unit tests don't need an `effectScope` or a mounted component. Tests call `createXxxService()` directly and pass IO ports as injected dependencies.

**Template.**

```ts
// composables/useOrderForm.ts
import type { InjectionKey, Ref } from 'vue'
import { inject, provide, ref } from 'vue'

export interface OrderInput { items: { sku: string, qty: number }[] }
export interface Order { id: string }

export interface OrderFormService {
  input: Ref<OrderInput>
  errors: Ref<Record<string, string>>
  submitting: Ref<boolean>
  addItem(sku: string, qty: number): void
  removeItem(sku: string): void
  submit(): Promise<Order | null>
}

const KEY: InjectionKey<OrderFormService> = Symbol('OrderFormService')

// Pure factory — no Vue lifecycle, IO injected as a port.
export function createOrderFormService(deps: {
  submit: (input: OrderInput) => Promise<Order>
  initial?: Partial<OrderInput>
}): OrderFormService {
  const input = ref<OrderInput>({ items: [], ...deps.initial })
  const errors = ref<Record<string, string>>({})
  const submitting = ref(false)

  function addItem(sku: string, qty: number) {
    input.value.items.push({ sku, qty })
  }
  function removeItem(sku: string) {
    input.value.items = input.value.items.filter(i => i.sku !== sku)
  }
  async function submit() {
    submitting.value = true
    errors.value = {}
    try {
      return await deps.submit(input.value)
    }
    catch (err: any) {
      errors.value = err?.data?.fieldErrors ?? { _: err?.message ?? 'Failed' }
      return null
    }
    finally {
      submitting.value = false
    }
  }

  return { input, errors, submitting, addItem, removeItem, submit }
}

// Component-facing wrapper. Builds + provides in one call. The `submit` port
// is supplied here; in a Nuxt app it'd be `$fetch(...)`, in a plain Vue app
// it might be axios or a hand-rolled fetch wrapper.
export function provideOrderForm(submit: (input: OrderInput) => Promise<Order>, initial?: Partial<OrderInput>): OrderFormService {
  const service = createOrderFormService({ submit, initial })
  provide(KEY, service)
  return service
}

export function useOrderForm(): OrderFormService {
  const service = inject(KEY)
  if (!service)
    throw new Error('useOrderForm() must be called in a subtree of provideOrderForm()')
  return service
}
```

```vue
<!-- pages/orders/new.vue (or any parent component) -->
<script setup lang="ts">
import { provideOrderForm } from '~/composables/useOrderForm'
const form = provideOrderForm(input => $fetch('/api/orders', { method: 'POST', body: input }))
</script>

<template>
  <OrderItemList />
  <OrderTotals />
  <button :disabled="form.submitting.value" @click="form.submit">Place order</button>
</template>
```

```vue
<!-- components/OrderItemList.vue (anywhere in the subtree) -->
<script setup lang="ts">
const form = useOrderForm() // same instance as the parent
</script>
```

**Test surface (no component mount, no jsdom needed).**

```ts
// composables/useOrderForm.test.ts
import { describe, expect, it, vi } from 'vitest'
import { createOrderFormService } from './useOrderForm'

describe('OrderFormService', () => {
  it('adds and removes items', () => {
    const submit = vi.fn().mockResolvedValue({ id: 'order-1' })
    const form = createOrderFormService({ submit })
    form.addItem('SKU-1', 2)
    form.addItem('SKU-2', 1)
    expect(form.input.value.items).toHaveLength(2)
    form.removeItem('SKU-1')
    expect(form.input.value.items).toEqual([{ sku: 'SKU-2', qty: 1 }])
  })

  it('maps API field errors onto errors ref', async () => {
    const submit = vi.fn().mockRejectedValue({ data: { fieldErrors: { items: 'too few' } } })
    const form = createOrderFormService({ submit })
    form.addItem('SKU-1', 1)
    const result = await form.submit()
    expect(result).toBeNull()
    expect(form.errors.value.items).toBe('too few')
    expect(form.submitting.value).toBe(false)
  })
})
```

The factory takes IO as injected functions (`deps.submit`). Tests pass mocks directly; production passes the real implementation. This is the **Remote-but-owned (Ports & Adapters)** category from DEEPENING.md applied at the composable level — and the reason the entire file unit-tests without a single `mount()` call.

**Why split the factory from the provide wrapper?**

Calling `provide()` outside a component setup throws. If the factory called `provide()` directly, tests would need `effectScope().run()` or `withSetup()` helpers. The split is purely about keeping tests trivial: `createXxxService()` is a plain function call.

## 2. Component thinness

A component should:

- Render markup.
- Bind to a service composable's state.
- Translate user events into service method calls.

A component should NOT:

- Call HTTP/fetch APIs directly. Pass them as ports into a service composable, or use a typed async-resource composable.
- Implement validation, multi-step async logic, or error mapping inline.
- Hold business state in raw `ref`s for more than a few lines.

When the smell signals from §1 are present in `<script setup>`, the fix is always the same: extract a service composable.

**Anti-pattern**: a "container" component containing a "presentational" component, both in the same feature, where the only thing the container does is hold state and pass it down. The container should *be* a service composable; the component renders directly from `useXxx()`.

## 3. State scoping (Vue level)

Two scoping options at the Vue layer. Pick the **smallest that works**:

| Scope                             | Mechanism                                              | When                                                                     |
| --------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ |
| **Per-component instance**        | Plain `ref`/`reactive` inside a composable             | Stateless utilities, derived state per-component                         |
| **Per-subtree (shared instance)** | Service composable with `provide`/`inject` (§1)        | Form state, wizard state, feature service multiple components share      |

Pure Vue does not have an SSR-safe app-wide state primitive — for Nuxt's `useState` and the SSR considerations that come with it, see [NUXT-APP-CONVENTIONS.md](NUXT-APP-CONVENTIONS.md) §4.

**Common scope mistakes.**

- A "current user" stored in a per-component `ref` re-fetches on every mount.
- Per-subtree form state stuffed into a module-level singleton leaks across pages — and breaks SSR (state shared between requests on the server).
- A service composable that *should* be subtree-scoped using a module-level `ref` for "convenience": works in dev with one user; fails in any multi-tenant or SSR scenario.

When in doubt, build the service as a factory (§1) and let consumers choose: `provideX()` at a feature root for subtree, `provideX()` at the app root for app-wide, or call the factory directly without `provide` for a per-component instance.

## How these compose

A typical Vue feature looks like:

1. The **page or feature root** calls `provideX()` from a service composable (§1) and renders.
2. **Child components** in the subtree call `useX()` to read state and trigger methods (§2 keeps them thin).
3. The service composable owns its IO via injected ports; the `provide` wrapper supplies the production port (`$fetch`, `axios`, etc.); tests supply mocks to the factory directly.
4. State scoping (§3) is a deliberate choice, not an accident.

A component with logic in it is failing §1 + §2; a feature where the same state is duplicated across siblings is failing §1; state at the wrong scope is failing §3.
