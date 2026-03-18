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

## Duration Rules

Timing matters more than easing:

| Duration | Use Case | Examples |
|----------|----------|---------|
| 100-150ms | Instant feedback | Button press, toggle, color change |
| 200-300ms | State changes | Menu open, tooltip, hover |
| 300-500ms | Layout changes | Accordion, modal, drawer |
| 500-800ms | Entrance animations | Page load, hero reveals |

Exit animations should be ~75% of entrance duration.

---

## Easing Without Springs

When CSS springs aren't available, use exponential curves — they mimic real physics:

```css
/* Quart out — smooth, refined (recommended default) */
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);

/* Expo out — snappy, confident */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
```

**Avoid bounce and elastic curves.** They feel dated and amateurish. Real objects decelerate smoothly — they don't bounce when they stop. Overshoot draws attention to the animation instead of the content.

---

## Reduced Motion

Not optional. Vestibular disorders affect ~35% of adults over 40.

```css
@media (prefers-reduced-motion: reduce) {
  .card { animation: fade-in 200ms ease-out; /* Crossfade instead of motion */ }
}
```

Preserve functional animations (progress bars, spinners, focus indicators) — just remove spatial movement.

---

## Perceived Performance

Nobody cares how fast your site is — just how fast it *feels*.

- **80ms threshold**: Our brains buffer input for ~80ms. Anything under feels instant. Target this for micro-interactions.
- **Preemptive start**: Begin transitions immediately while loading (skeleton UI). Users perceive work happening.
- **Optimistic UI**: Update immediately, handle failures gracefully. Use for low-stakes actions (likes, follows); avoid for payments or destructive operations.
- **Ease-in toward completion** makes tasks feel shorter (peak-end effect weights final moments).
- Too-fast responses can decrease perceived value — users may distrust instant results for complex operations.

---

## Performance

- Only animate `transform` and `opacity` — everything else causes layout recalculation
- For height animations (accordions), use `grid-template-rows: 0fr → 1fr` instead of animating `height`
- Don't use `will-change` preemptively — only when animation is imminent (`:hover`, `.animating`)
- For scroll-triggered animations, use Intersection Observer; unobserve after animating once
- Limit parallax layers to 2-3 max
- Cap total stagger time — 10 items at 50ms = 500ms max. For many items, reduce per-item delay
