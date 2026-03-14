# Motion & Animation

Orchestrated motion that creates delight without overwhelming.

**Philosophy**: One well-choreographed page load with staggered reveals > scattered micro-interactions everywhere.

**Rule**: Springs over easing. Springs feel natural — they respond to physics, not arbitrary curves.

---

## When to Use What

| Technique | Use Case |
|-----------|----------|
| CSS `transition` | Hover states, color changes, simple transforms |
| CSS `@keyframes` | Loading spinners, ambient loops |
| `motion-v` / Motion library | Entrance animations, scroll reveals, stagger, gestures |
| `mcp__motion__generate-css-spring` | CSS spring timing functions |

---

## motion-v Setup (Nuxt)

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['motion-v/nuxt']
})
```

---

## Page Load Choreography

The highest-impact animation pattern. Stagger children for orchestrated entrances:

```vue
<Motion
  :initial="{ opacity: 0 }"
  :animate="{ opacity: 1 }"
  :transition="{ staggerChildren: 0.08 }"
>
  <Motion
    v-for="item in items"
    :key="item.id"
    :initial="{ opacity: 0, y: 20 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, ease: 'easeOut' }"
  >
    <ItemCard :item="item" />
  </Motion>
</Motion>
```

---

## Scroll Reveals

```vue
<Motion
  :initial="{ opacity: 0, y: 30 }"
  :in-view="{ opacity: 1, y: 0 }"
  :transition="{ duration: 0.6, ease: 'easeOut' }"
>
  <UCard>Content revealed on scroll</UCard>
</Motion>
```

### Staggered Scroll Reveal
```vue
<Motion :in-view="{ transition: { staggerChildren: 0.1 } }">
  <Motion
    v-for="feature in features"
    :key="feature.id"
    :initial="{ opacity: 0, y: 20 }"
    :in-view="{ opacity: 1, y: 0 }"
  >
    <FeatureCard :feature="feature" />
  </Motion>
</Motion>
```

---

## Spring Timing Guide

Use `mcp__motion__generate-css-spring` to generate:

| Feel | Duration | Bounce | Use Case |
|------|----------|--------|----------|
| Snappy | 0.2s | 0.1-0.2 | Buttons, toggles, micro-interactions |
| Normal | 0.3-0.4s | 0.2-0.3 | Cards, modals, page elements |
| Dramatic | 0.5-0.8s | 0.3-0.4 | Hero entrances, reveals |
| Slow | 1s+ | 0.1 | Background elements, ambient |

---

## Page Transitions

```vue
<!-- app.vue -->
<NuxtPage>
  <template #default="{ Component }">
    <Motion
      :initial="{ opacity: 0, filter: 'blur(10px)' }"
      :animate="{ opacity: 1, filter: 'blur(0px)' }"
      :exit="{ opacity: 0, filter: 'blur(10px)' }"
      :transition="{ duration: 0.3 }"
    >
      <component :is="Component" />
    </Motion>
  </template>
</NuxtPage>
```

---

## Parallax (Hero sections)

```vue
<script setup lang="ts">
const { scrollY } = useScroll()
</script>

<template>
  <div class="relative overflow-hidden">
    <!-- Background moves slower -->
    <Motion :style="{ y: scrollY * 0.3 }" class="absolute inset-0 bg-mesh" />
    <!-- Content stays normal -->
    <div class="relative z-10">
      <slot />
    </div>
  </div>
</template>
```

---

## Floating Elements

```vue
<Motion
  :animate="{ y: [0, -10, 0] }"
  :transition="{ duration: 4, repeat: Infinity, ease: 'easeInOut' }"
>
  <div class="decorative-orb" />
</Motion>
```

---

## PROHIBITED (when motion-v available)

- Raw `@keyframes` for entrance animations
- CSS `cubic-bezier` for spring-like effects
- Manual delay classes for stagger
- Inline timing approximations

---

## Performance

- Prefer `transform` and `opacity` (GPU-composited)
- Limit parallax layers to 2-3 max
- Always respect `prefers-reduced-motion`
