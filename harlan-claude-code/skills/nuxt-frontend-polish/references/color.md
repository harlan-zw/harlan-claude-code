# Color Strategy

Intentional color systems that create cohesive, distinctive interfaces.

---

## CSS Variable Strategy

Always define colors as CSS variables, never hardcode:

```css
/* app/assets/css/main.css */
@theme {
  --color-surface: #ffffff;
  --color-surface-elevated: #fafafa;
  --color-accent: #ff6b35;
  --color-accent-subtle: rgba(255, 107, 53, 0.1);
}
```

Override Nuxt UI semantic tokens for global consistency:

```css
:root {
  --ui-bg: var(--color-surface);
  --ui-bg-elevated: var(--color-surface-elevated);
}
```

---

## Dominant + Accent Pattern

One dominant color + one sharp accent outperforms evenly-distributed palettes:

```ts
// app.config.ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'amber', // Dominant — used for CTAs, active states
      neutral: 'stone' // Background system
    }
  }
})
```

Use accent sparingly — on the ONE thing you want users to notice:
- Primary CTA button
- Active navigation indicator
- Important badges/tags
- Focus rings

---

## Dark Mode

Don't just invert. Design dark mode intentionally:

```css
:root {
  --ui-bg: #faf8f5;
  --ui-bg-muted: #f0ebe4;
  --ui-bg-elevated: #ffffff;
  --ui-text: #1a1a1a;
  --ui-text-muted: #6b6b6b;
  --ui-border: rgba(0, 0, 0, 0.08);
}

.dark {
  --ui-bg: #0a0a0a;
  --ui-bg-muted: #141414;
  --ui-bg-elevated: #1a1a1a;
  --ui-text: rgba(255, 255, 255, 0.9);
  --ui-text-muted: rgba(255, 255, 255, 0.5);
  --ui-border: rgba(255, 255, 255, 0.08);
}
```

### Dark Mode Rules
- Reduce saturation slightly in dark mode (vivid colors strain eyes)
- Use lower opacity for backgrounds (`bg-white/5` not solid colors)
- Borders become lighter opacity, not darker
- Shadows become irrelevant — use glows or border highlights instead

---

## Force Dark/Light Mode

For themes that only work in one mode:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  colorMode: {
    preference: 'dark',
    fallback: 'dark'
  }
})
```

---

## Glass/Transparency Colors

For glassmorphism themes, use alpha values:

```css
@theme {
  --color-glass-bg: rgba(255, 255, 255, 0.05);
  --color-glass-border: rgba(255, 255, 255, 0.08);
  --color-glass-border-hover: rgba(255, 255, 255, 0.15);
}
```

| Layer | Background | Blur |
|-------|------------|------|
| Back | `rgba(0,0,0,0.25)` | `24-32px` |
| Middle | `rgba(0,0,0,0.35)` | `12-16px` |
| Front | `rgba(0,0,0,0.4)` | `8-12px` |

---

## Glow Effects

For dark themes, replace shadows with colored glows:

```css
@theme {
  --shadow-glow: 0 0 40px rgba(var(--color-primary-500), 0.15);
  --shadow-glow-intense: 0 0 60px rgba(var(--color-primary-500), 0.3);
}
```

