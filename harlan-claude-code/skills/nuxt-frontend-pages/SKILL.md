---
description: Build pages and compose UI patterns with Nuxt UI v4+ components. Use when building landing pages, dashboards, forms, tables, navigation, modals, toasts, or assembling page layouts from Nuxt UI components.
user_invocable: true
argument-hint: "[page-type or pattern: landing, dashboard, forms, tables, navigation, feedback]"
---

# Nuxt UI Pages & Patterns

Build pages and compose UI patterns with Nuxt UI v4+ components.

If `$ARGUMENTS` names a page type or pattern, read only that reference.

## Step 0: Read the Design System

Before building anything, read the project's foundation files so pages use the established tokens:

```
Read: app/assets/css/main.css      → @theme tokens, --ui-* overrides, custom utilities
Read: app.config.ts                → colors, component theme overrides, defaultVariants
Read: nuxt.config.ts               → fonts, colorMode, ui.theme.colors
```

**If no design system exists**: run `nuxt-frontend-design-system` first.

Use the project's semantic tokens (`bg-muted`, `text-default`, `border-default`), fonts (`font-sans`, `font-display`), and component overrides — never hardcode colors, shadows, or radii that bypass the design system.

## References

| Building... | Reference |
|-------------|-----------|
| Landing / marketing page | [pages/landing.md](references/pages/landing.md) — Stripe-style landing with UPageHero, UPageSection, UPricingPlans |
| Dashboard / admin | [pages/dashboard.md](references/pages/dashboard.md) — Linear-style dashboard with UDashboardSidebar, UTable |
| Forms | [components/forms.md](references/components/forms.md) — UForm + Zod, validation UX, v4 component mapping |
| Data tables | [components/tables.md](references/components/tables.md) — UTable, empty states, row actions, sorting |
| Navigation | [components/navigation.md](references/components/navigation.md) — Header, sidebar, breadcrumbs, command palette, tabs |
| Feedback / overlays | [components/feedback.md](references/components/feedback.md) — Toasts, modals, confirmations, dropdowns, UEmpty |

## After Building

Verify the page is consistent with the design system:
- No hardcoded colors (`bg-slate-*`, `text-gray-*`) — use semantic tokens
- No hardcoded shadows/radii that bypass `app.config.ts` component overrides
- Fonts use `font-sans` / `font-display` / `font-mono` from `@theme`, not inline font families
- Interactive elements use Nuxt UI components, not raw HTML
