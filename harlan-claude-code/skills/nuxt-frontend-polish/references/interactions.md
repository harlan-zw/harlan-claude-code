# Micro Interactions

Small UI details that make a design feel polished and alive.

---

## Hover States

Every interactive element needs a visible hover response. CSS transitions are fine here — no motion library needed.

```css
/* Card lift */
.card-hover {
  transition: transform 200ms ease, box-shadow 200ms ease;
}
.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
}

/* Subtle scale */
.scale-hover {
  transition: transform 200ms ease;
}
.scale-hover:hover {
  transform: scale(1.02);
}

/* Border glow */
.glow-hover {
  transition: border-color 200ms ease, box-shadow 200ms ease;
}
.glow-hover:hover {
  border-color: rgba(var(--color-primary-500), 0.5);
  box-shadow: 0 0 20px rgba(var(--color-primary-500), 0.15);
}
```

### Spring Hovers (CSS)

Use `mcp__motion__generate-css-spring` to generate spring easing for more physical feel:

```css
/* Snappy card spring — bounce: 0.2, duration: 0.35s */
.spring-card {
  transition: transform 350ms linear(0, 0.3566, 0.7963, 1.0045, 1.0459, 1.0287, 1.0088, 0.9996, 1);
}
.spring-card:hover {
  transform: translateY(-4px) scale(1.01);
}

/* Bouncy button spring — bounce: 0.3, duration: 0.55s */
.spring-button {
  transition: transform 550ms linear(0, 0.1719, 0.4986, 0.7952, 0.9887, 1.0779, 1.0939, 1.0726, 1.0412, 1.0148, 0.9986, 1);
}
.spring-button:hover {
  transform: scale(1.05);
}
```

---

## Focus States

Every focusable element must have a visible focus indicator:

```vue
<UButton class="focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2" />
```

Use `focus-visible` not `focus` — prevents showing ring on click, only on keyboard navigation.

---

## Button Feedback

### Press Effect
```css
.press {
  transition: transform 100ms ease;
}
.press:active {
  transform: scale(0.97);
}
```

### Haptic Press (translate down)
```css
.haptic:active {
  transform: translateY(1px);
}
```

---

## Loading States

### Skeleton Screens
Use `USkeleton` for content placeholders. Match the shape of the content they replace:

```vue
<template>
  <div v-if="pending" class="space-y-4">
    <USkeleton class="h-8 w-48" />
    <USkeleton class="h-4 w-full" />
    <USkeleton class="h-4 w-3/4" />
  </div>
  <div v-else>
    <!-- actual content -->
  </div>
</template>
```

### Button Loading
```vue
<UButton :loading="submitting" loading-icon="i-lucide-loader-2">
  Save Changes
</UButton>
```

### Optimistic Updates
Update UI immediately, revert on error:
```ts
const items = ref([...])
function removeItem(id: string) {
  const backup = [...items.value]
  items.value = items.value.filter(i => i.id !== id)
  try { await api.delete(id) }
  catch { items.value = backup }
}
```

---

## State Transitions

### Empty States
Never show a blank page. Empty states are onboarding moments:

```vue
<div v-if="!items.length" class="flex flex-col items-center py-16 text-center">
  <UIcon name="i-lucide-inbox" class="text-4xl text-dimmed mb-4" />
  <h3 class="text-lg font-semibold text-default">No items yet</h3>
  <p class="text-muted mt-1 max-w-sm">Create your first item to get started.</p>
  <UButton class="mt-6" @click="create">Create Item</UButton>
</div>
```

### Success Feedback
Brief, non-blocking confirmation:
```ts
const toast = useToast()
toast.add({ title: 'Saved', icon: 'i-lucide-check', color: 'success' })
```

---

## Sticky Headers with Blur

```vue
<header class="sticky top-0 z-50 backdrop-blur-lg bg-default/80 border-b border-default">
```
