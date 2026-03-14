# Spatial Composition

Layout, whitespace, and visual rhythm that creates character.

---

## Break the Grid

Predictable layouts feel generic. Introduce controlled asymmetry:

```vue
<!-- Offset grid — items don't align perfectly -->
<div class="grid grid-cols-3 gap-6">
  <div class="col-span-2 mt-8">Large feature</div>
  <div class="col-span-1 -mt-4">Small accent</div>
</div>

<!-- Overlapping elements -->
<div class="relative">
  <div class="absolute -top-6 -right-6 z-10">Floating badge</div>
  <UCard>Main content</UCard>
</div>

<!-- Diagonal flow -->
<div class="grid grid-cols-2 gap-8">
  <div class="justify-self-start">Left item</div>
  <div class="justify-self-end mt-16">Right item, offset down</div>
</div>
```

---

## Whitespace (Negative Space)

Generous whitespace signals quality. Cramped layouts feel cheap.

```css
/* Section spacing — generous */
.section { @apply py-24 md:py-32; }
.section-tight { @apply py-16 md:py-20; }

/* Content max-width — don't stretch to full screen */
.content-narrow { @apply max-w-2xl mx-auto; }
.content-medium { @apply max-w-4xl mx-auto; }
```

### Density Levels

| Context | Approach |
|---------|----------|
| Landing page | Generous space, breathing room between sections |
| Dashboard | Controlled density, tight but organized |
| Documentation | Medium spacing, readable column width |
| Pricing page | Cards need room to be compared side-by-side |

---

## Bento Grid

Irregular grid cells create visual interest:

```css
.bento-grid {
  @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6;
}

/* Cell sizes */
.bento-featured { @apply col-span-1 row-span-1 lg:col-span-2 lg:row-span-2; }
.bento-wide { @apply col-span-1 lg:col-span-2; }
.bento-tall { @apply row-span-1 lg:row-span-2; }
```

---

## Layering & Depth

Create depth through overlapping layers:

```vue
<div class="relative">
  <!-- Background layer -->
  <div class="absolute inset-0 bg-gradient-to-br from-primary-50 to-transparent rounded-3xl" />

  <!-- Decorative elements -->
  <div class="absolute -top-4 -right-4 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />

  <!-- Content (foreground) -->
  <div class="relative z-10 p-8">
    <slot />
  </div>
</div>
```

---

## Backgrounds & Atmosphere

Create depth and character beyond flat colors:

```css
/* Gradient mesh */
.bg-mesh {
  background-image:
    radial-gradient(at 20% 30%, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
    radial-gradient(at 80% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 40%),
    radial-gradient(at 60% 80%, rgba(34, 211, 238, 0.08) 0%, transparent 45%);
}

/* Noise texture overlay */
.bg-noise {
  background-image: url("data:image/svg+xml,..."); /* tiny noise SVG */
  opacity: 0.03;
}

/* Dot grid pattern */
.bg-dots {
  background-image: radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px);
  background-size: 20px 20px;
}
```

---

## Anti-Patterns

- Even spacing everywhere (no rhythm)
- Content stretching to full width
- All items perfectly aligned (too rigid)
- No layering/depth (flat)
- Identical spacing between all sections
