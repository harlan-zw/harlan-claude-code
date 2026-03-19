---
description: Build pages and compose UI patterns with Nuxt UI v4+ components. Use when user says "build a page", "create a landing page", "make a dashboard", "add a form", "build a table", "add navigation", "create a modal", or is assembling page layouts from Nuxt UI components.
user_invocable: true
argument-hint: "[page-type or pattern: landing, dashboard, forms, tables, navigation, feedback]"
---

# Nuxt UI Pages & Patterns

Build pages and compose UI patterns with Nuxt UI v4+ components.

If `$ARGUMENTS` names a page type or pattern, read only that reference.

## Step 0: Read the Design System

Before building anything, read the project's foundation files so pages use the established tokens:

```
Read: .claude/context/design-guidelines.md  -> aesthetic intent, component rules, avoid list, custom utilities
Read: app/assets/css/main.css               -> @theme tokens, --ui-* overrides, custom utilities
Read: app.config.ts                         -> colors, component theme overrides, defaultVariants
Read: nuxt.config.ts                        -> fonts, colorMode, ui.theme.colors
```

**If no design system exists**: run `nuxt-frontend-design-system` first.

The design guidelines file captures *why* decisions were made -- component rules (always/never constraints), things to avoid, and custom utilities to use. The code files capture the *what*. Read both.

Use the project's semantic tokens (`bg-muted`, `text-default`, `border-default`), fonts (`font-sans`, `font-display`), and component overrides -- never hardcode colors, shadows, or radii that bypass the design system.

## References

| Building... | Reference |
|-------------|-----------|
| Landing / marketing page | [pages/landing.md](references/pages/landing.md) -- Stripe-style landing with UPageHero, UPageSection, UPricingPlans |
| Dashboard / admin | [pages/dashboard.md](references/pages/dashboard.md) -- Linear-style dashboard with UDashboardSidebar, UTable |
| Forms | [components/forms.md](references/components/forms.md) -- UForm + Zod, validation UX, v4 component mapping |
| Data tables | [components/tables.md](references/components/tables.md) -- UTable, empty states, row actions, sorting |
| Navigation | [components/navigation.md](references/components/navigation.md) -- Header, sidebar, breadcrumbs, command palette, tabs |
| Feedback / overlays | [components/feedback.md](references/components/feedback.md) -- Toasts, modals, confirmations, dropdowns, UEmpty |

## Gotchas

- **v4 component renames** -- `ButtonGroup` -> `UFieldGroup`, `PageMarquee` -> `UMarquee`. Using old names silently renders nothing.
- **Missing design system** -- building pages without `app.config.ts` and `main.css` set up leads to inconsistent output. Run `nuxt-frontend-design-system` first if these don't exist.
- **`UPageHero` needs a parent section** -- it won't constrain width on its own. Wrap in `UPageSection` or a max-width container.
- **Form validation timing** -- `UForm` with Zod validates on blur by default. For inline validation, set `validate-on="input"`. Don't mix both without testing the UX.
- **`UTable` empty state** -- without an explicit `empty` slot or `empty-state` prop, an empty table shows nothing. Always handle the empty case.
- **Dark mode color assumptions** -- semantic tokens (`bg-muted`, `text-default`) adapt automatically. If you hardcode `bg-white` or `text-black`, dark mode breaks.

## Reka UI

For components not covered by Nuxt UI, or where Nuxt UI is too prescriptive, use [Reka UI](https://reka-ui.com/docs/overview/installation) -- unstyled, accessible Vue primitives you can style with Tailwind to match your design system.

## After Building

Verify the page is consistent with the design system:
- No hardcoded colors (`bg-slate-*`, `text-gray-*`) -- use semantic tokens
- No hardcoded shadows/radii that bypass `app.config.ts` component overrides
- Fonts use `font-sans` / `font-display` / `font-mono` from `@theme`, not inline font families
- Interactive elements use Nuxt UI components, not raw HTML
- No violations of the "Avoid" list from `design-guidelines.md`
- Custom utilities from `design-guidelines.md` used where applicable (not reinvented)
