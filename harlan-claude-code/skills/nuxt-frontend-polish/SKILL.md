---
description: Polish and refine existing Nuxt UI interfaces. Use when asked to improve, polish, refine, enhance, "make it feel better", "add motion", "fix the UX", "make it less boring", "looks generic", or when micro UX improvements are needed on existing pages or components.
user_invocable: true
argument-hint: "[area to polish: typography, motion, color, layout, interactions]"
---

# Nuxt UI Polish

Refine existing Nuxt UI interfaces by auditing against the project's own design system.

If `$ARGUMENTS` names a specific area, skip to that area's audit + reference.

## Step 0: Read the Foundation

Before touching anything, read the project's design system files:

```
Read: .claude/context/design-guidelines.md  → aesthetic intent, component rules, avoid list, custom utilities
Read: app/assets/css/main.css               → @theme tokens, --ui-* overrides, custom classes
Read: app.config.ts                         → colors, component theme overrides, defaultVariants
Read: nuxt.config.ts                        → fonts, colorMode, ui.theme.colors
```

The design guidelines file captures the *intent* — why colors were chosen, always/never component rules, patterns to avoid, and custom utilities. The code files capture the *implementation*. Both inform what "correct" means for this project. Every audit below is against **these files**, not generic best practices.

## Step 1: Audit Foundation Tokens

Check that the design system is complete — missing tokens cause inconsistency downstream.

| Token category | Where defined | What to check |
|----------------|---------------|---------------|
| Colors | `app.config.ts` `colors` | `primary` and `neutral` set? Additional theme colors registered in `nuxt.config.ts`? |
| Fonts | `@theme` `--font-*` | At least `--font-sans` defined? Display/mono if used? Registered in `nuxt.config.ts` `fonts.families`? |
| Semantic overrides | `:root` / `.dark` `--ui-*` | `--ui-bg`, `--ui-text`, `--ui-border` customized? Dark mode intentional or just inverted? `--ui-radius` set? |
| Component overrides | `app.config.ts` `ui.*` | Key components (card, button, modal, input) themed? `defaultVariants` set? |
| Unnecessary tokens | `@theme` | Custom `--shadow-*`, `--radius-*`, `--color-surface` etc. that duplicate Tailwind builtins (`shadow-md`, `rounded-xl`, `bg-default`)? Remove and use Tailwind/Nuxt UI equivalents. Only keep tokens truly unique to the design (glass effects, mesh gradients, etc.) |

**If tokens are missing**: fix them first — they cascade everywhere. Reference [design-system.md from nuxt-frontend-design-system](../nuxt-frontend-design-system/references/design-system.md) for setup patterns.

## Step 2: Audit Consistency

Scan `.vue` files for violations against the established tokens:

| Violation | Example | Fix |
|-----------|---------|-----|
| Hardcoded colors | `bg-slate-100`, `text-gray-900` | → `bg-muted`, `text-default` (Nuxt UI semantic tokens) |
| Tailwind shadows/radii used inconsistently | `shadow-lg` in one card, `shadow-md` in another | → pick one per component type, apply via `app.config.ts` |
| Banned fonts | Inter, Roboto, Arial, system-ui | → project's `--font-sans` / `--font-display` |
| Mixed spacing | Random `p-3`, `p-5`, `p-8` on same-level elements | → consistent rhythm |
| Inline styles | `style="background: #0a0a0a"` | → Tailwind class or semantic token |
| Raw HTML elements | `button`, `input`, `table` | → Nuxt UI components |
| Guideline violations | Patterns listed in design-guidelines.md "Avoid" section | → follow documented constraints |
| Missing custom utilities | Reinventing a pattern that exists in design-guidelines.md | → use the documented utility class |

## Step 3: Elevate

Only after foundation and consistency are solid. Read references based on what the UI needs:

| Symptom | Reference |
|---------|-----------|
| Feels flat/static | [interactions.md](references/interactions.md) — hover, focus, loading, spring CSS |
| No entrance animations | [motion.md](references/motion.md) — motion-v, scroll reveals, stagger, transitions |
| Typography feels generic | [typography.md](references/typography.md) — font pairing, weight extremes, scale |
| Layout cramped or boring | [spatial.md](references/spatial.md) — whitespace, grids, layering, backgrounds |
| Colors dull or inconsistent | [color.md](references/color.md) — dominant+accent, dark mode, glows |

Read ALL references when asked to "make it better" or "polish everything".

## Reka UI

For components not covered by Nuxt UI, or where Nuxt UI is too prescriptive, use [Reka UI](https://reka-ui.com/docs/overview/installation) — unstyled, accessible Vue primitives you can style with Tailwind to match your design system.

## Rules

- **Keep what works** — don't change what's already distinctive
- **"Same product, elevated execution"** — not "This is different"
- **No wholesale replacement** when refinement would work
- **No scope creep** — polish what's there, don't add features
