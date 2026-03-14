# Nuxt UI Design System Setup

Configure a Nuxt UI design system using existing Tailwind and Nuxt UI variables. **Do NOT invent new tokens when Tailwind/Nuxt UI already provides them.**

---

## Principle: Use What Exists

Tailwind CSS and Nuxt UI provide a complete token system. Your design system should:
1. **Override `--ui-*` vars** to set your visual identity (colors, radius, backgrounds)
2. **Override `--font-*` vars** in `@theme` for typography
3. **Use `app.config.ts`** for component-level theming (slots, variants)
4. **Only create custom `@theme` tokens** for things truly unique to your design (e.g., theme-specific gradients, glass effects, mesh backgrounds)

Do NOT create `--shadow-soft`, `--radius-card`, `--color-surface` etc. — Tailwind has `shadow-sm/md/lg/xl`, `rounded-sm/md/lg/xl/2xl`, and Nuxt UI has `bg-default/muted/elevated`.

---

## Color Configuration

```ts
// app.config.ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'amber', // Not default blue — pick something distinctive
      neutral: 'stone' // Warm neutrals feel more intentional
    },
    button: {
      defaultVariants: { color: 'primary', variant: 'solid' }
    }
  }
})
```

---

## Semantic Token Overrides

Override Nuxt UI's `--ui-*` variables in `app/assets/css/main.css` to define your visual identity:

```css
@import "tailwindcss";
@import "@nuxt/ui";

:root {
  --ui-bg: #faf8f5;
  --ui-bg-muted: #f5f0eb;
  --ui-bg-elevated: #ffffff;
  --ui-border: rgba(0, 0, 0, 0.08);
  --ui-radius: 0.75rem;
}

.dark {
  --ui-bg: #0a0a0a;
  --ui-text: rgba(255, 255, 255, 0.9);
  --ui-text-muted: rgba(255, 255, 255, 0.6);
}
```

These are the levers. Every Nuxt UI component reads from them — change here, change everywhere.

---

## Typography via Nuxt Fonts

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  fonts: {
    families: [
      { name: 'Instrument Serif', provider: 'google' },
      { name: 'Space Mono', provider: 'google' }
    ]
  }
})
```

Override Tailwind's font family tokens:

```css
/* app/assets/css/main.css */
@theme {
  --font-sans: 'IBM Plex Sans', sans-serif;
  --font-display: 'Instrument Serif', serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

`--font-display` is the one custom addition — Tailwind doesn't have it by default, and it's useful for hero/headline fonts.

See `nuxt-frontend-polish` typography reference for font pairing rules and recommended pairings.

---

## Icon System

Icons are part of the design language — pick a collection that matches the theme's weight, geometry, and personality. Nuxt UI uses `@nuxt/icon` (Iconify-based).

### Setup

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  icon: {
    serverBundle: 'local',
    collections: ['lucide'] // only bundle what you use
  }
})
```

### Usage

```vue
<UIcon name="i-lucide-arrow-right" />
```

### Choosing a Collection

| Collection | Stroke | Feel | Best for |
|-----------|--------|------|----------|
| `lucide` | 2px, consistent | Clean, minimal | Zen, minimal, docs |
| `phosphor` | Variable (thin/light/regular/bold/duotone/fill) | Versatile, playful | Clay, flow, general |
| `tabler` | 2px, rounded | Friendly, thick | Blueprint, industrial |
| `solar` | 1.5px, geometric | Modern, sharp | Neon, nebula, dashboards |
| `heroicons` | 1.5px outline / solid | Apple-like, polished | Premium, frost, SaaS |
| `mingcute` | 2px, rounded corners | Warm, approachable | Soft themes, consumer apps |

**Rules**:
- Pick ONE collection per project — mixing icon styles breaks cohesion
- Match stroke weight to your typography weight (thin fonts → thin icons, bold fonts → bold icons)
- Dark themes: prefer outline/line icons (they glow well). Light themes: fills and duotone work
- Use the `duotone` variant from Phosphor or `solid` from Heroicons for filled states (active nav, selected items)
- **Icons should be monochrome** — use `text-current` or inherit from parent. Only apply color to icons semantically (success/error/warning states, brand accent on hover). Random colorful icons look like a toy dashboard

---

## Theme-Specific Custom Tokens

Only add `@theme` tokens for things that don't exist in Tailwind/Nuxt UI. Examples of **valid** custom tokens:

```css
@theme {
  /* Glassmorphism — no Tailwind equivalent */
  --color-glass-bg: rgba(255, 255, 255, 0.05);
  --color-glass-border: rgba(255, 255, 255, 0.08);

  /* Theme-specific gradient mesh — unique to this design */
  --color-mesh-purple: rgba(168, 85, 247, 0.15);
  --color-mesh-blue: rgba(59, 130, 246, 0.1);
}
```

Examples of **unnecessary** custom tokens (use Tailwind instead):
- `--shadow-soft` → use `shadow-sm` or `shadow-md`
- `--radius-card` → use `rounded-xl` or override `--ui-radius`
- `--color-surface` → use `bg-default` or `bg-elevated`

---

## Component Theme Overrides

Override any Nuxt UI component globally via `app.config.ts`:

```ts
export default defineAppConfig({
  ui: {
    card: {
      slots: {
        root: 'rounded-2xl shadow-md',
        header: 'p-6',
        body: 'p-6'
      },
      variants: {
        variant: {
          outline: { root: 'border border-default' },
          soft: { root: 'bg-muted' }
        }
      }
    }
  }
})
```

**Pattern**: Use `slots` for base styles, `variants` for conditional styles, `compoundVariants` for color+variant combos, `defaultVariants` for defaults.

---

## Extended Theme Colors

Register custom colors for use as component color props:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  ui: {
    theme: {
      colors: ['primary', 'secondary', 'accent', 'success', 'warning', 'error']
    }
  }
})
```

```ts
// app.config.ts
export default defineAppConfig({
  ui: {
    colors: {
      accent: 'orange',
      success: 'emerald'
    }
  }
})
```

---

## Project Structure

```
app/
├── assets/css/main.css    # @theme font overrides, --ui-* overrides, theme-specific utilities
├── layouts/default.vue    # Shared header/footer (not app.vue)
├── error.vue              # Custom error page
├── composables/           # Reusable logic
├── components/            # UI components
└── pages/                 # Route pages

app.config.ts              # Nuxt UI component overrides
nuxt.config.ts             # Modules, fonts, colorMode
```

---

## MCP Available

Use `nuxt-ui-remote` MCP for component docs:
- `mcp__nuxt-ui-remote__get-component` — full docs for any component
- `mcp__nuxt-ui-remote__get-component-metadata` — props/slots/events
- `mcp__nuxt-ui-remote__list-components` — all available components
