---
description: Setup or scaffold a Nuxt UI design system from scratch — themes, fonts, app.config.ts, CSS tokens, color palettes, component theme overrides. Use when creating a new site, applying a theme, choosing fonts, configuring design tokens, or establishing the visual foundation before building pages.
user_invocable: true
argument-hint: "[theme-name]"
---

# Nuxt UI Design System

Establish the visual foundation for a Nuxt UI v4+ project. This skill is about **setup and tokens**, not page building.

If `$ARGUMENTS` is a theme name, read that theme file directly.

## What This Covers

1. **Color palette** — primary, neutral, accent via `app.config.ts`
2. **Typography** — font selection, registration via Nuxt Fonts, `--font-*` in `@theme`
3. **Icon system** — icon collection that matches the theme aesthetic via `@nuxt/icon`
4. **Semantic overrides** — `--ui-bg`, `--ui-text`, `--ui-radius`, etc. for light/dark
5. **Component theming** — global overrides via `app.config.ts` slots/variants
6. **Extended colors** — registering custom theme colors in `nuxt.config.ts`

**Principle**: Use existing Tailwind (`shadow-md`, `rounded-xl`) and Nuxt UI (`bg-muted`, `text-default`) tokens. Only create custom `@theme` tokens for things truly unique to the design (glass effects, mesh gradients, etc.).

## Design Philosophy

Commit to a BOLD aesthetic direction before coding. Avoid "AI slop" — generic fonts, purple gradients, white backgrounds.

Every interface must be: **Distinctive, Memorable, Cohesive, Production-grade, Intentional.**

## Reka UI

For components not covered by Nuxt UI, or where Nuxt UI is too prescriptive, use [Reka UI](https://reka-ui.com/docs/overview/installation) — unstyled, accessible Vue primitives you can style with Tailwind to match your design system.

## Gotchas

- **Banned fonts**: NEVER Inter, Roboto, Arial, system-ui. Avoid Space Grotesk, Geist, DM Sans. These are overused defaults that scream "AI generated."
- **Button visibility**: Buttons MUST have visible backgrounds. Set `colors.primary` + `button.defaultVariants.variant: 'solid'` in `app.config.ts` or you get white text on nothing.
- **v4 renames**: `ButtonGroup` → `UFieldGroup`, `PageMarquee` → `UMarquee`, `nullify` modifier → `nullable`
- **v4 forms**: Nested forms need `nested` prop + `name` prop on inner `UForm`
- **v4 inputs**: Use `UFileUpload`, `UInputDate`, `UInputNumber`, `UInputTags`, `UPinInput` — not raw HTML inputs
- **Semantic tokens over hardcoded colors**: `bg-muted` not `bg-slate-100`, `text-default` not `text-slate-900`
- **No fake UI**: If it looks interactive, make it work. Use real avatar URLs, not initials.

## Available Themes

| Theme | Aesthetic | Mode |
|-------|-----------|------|
| `frost` | Glassmorphism, frosted glass | Dark |
| `clay` | Claymorphism, soft pastels, playful | Light |
| `blueprint` | Neo-brutalism, thick borders, offset shadows | Light |
| `nebula` | Aurora gradients, cosmic depth | Dark |
| `zen` | Japanese minimalism, earth tones | Light |
| `neon` | Cyberpunk, glowing accents | Dark |
| `teenage-engineering` | Industrial hardware, mechanical | Light |
| `kinetic-paper` | Tactile paper, craft, letterpress | Light |
| `flow` | Liquid organic, ocean curves | Light |
| `devtool` | Schematic, dashed borders, TUI | Light |

Each theme file is self-contained with `nuxt.config.ts` fonts, CSS `@theme` tokens, and `app.config.ts` overrides.

## References

- [design-system.md](references/design-system.md) — Full setup guide: app.config, CSS tokens, fonts, project structure, component overrides
- [themes/{name}.md](references/themes/) — Complete theme: fonts + tokens + component overrides

## Related Skills

- `nuxt-frontend-pages` — Page building patterns (landing, dashboard, forms, tables, navigation)
- `nuxt-frontend-polish` — Refine an existing design system (motion, typography, color, spatial)
