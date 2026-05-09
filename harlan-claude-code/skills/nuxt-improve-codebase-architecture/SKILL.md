---
name: nuxt-improve-codebase-architecture
description: Find deepening opportunities in a Nuxt codebase, leaning on Nuxt-native seams (hooks, modules, layers, plugins, composables, server routes, nitro, runtime config). Use when the user wants to improve architecture, find refactoring opportunities, consolidate tightly-coupled modules, or make a Nuxt app/module more testable and AI-navigable.
---

# Improve Nuxt Codebase Architecture

Surface architectural friction in a Nuxt codebase and propose **deepening opportunities** — refactors that turn shallow modules into deep ones, using Nuxt's own extension points as seams. The aim is testability and AI-navigability.

## Glossary

Use these terms exactly in every suggestion. Consistent language is the point — don't drift into "component," "service," "API," or "boundary." Full definitions in [LANGUAGE.md](LANGUAGE.md).

- **Module** — anything with an interface and an implementation (function, class, package, slice, Nuxt module, layer).
- **Interface** — everything a caller must know to use the module: types, invariants, error modes, ordering, config. Not just the type signature.
- **Implementation** — the code inside.
- **Depth** — leverage at the interface: a lot of behaviour behind a small interface. **Deep** = high leverage. **Shallow** = interface nearly as complex as the implementation.
- **Seam** — where an interface lives; a place behaviour can be altered without editing in place. (Use this, not "boundary.")
- **Adapter** — a concrete thing satisfying an interface at a seam.
- **Leverage** — what callers get from depth.
- **Locality** — what maintainers get from depth: change, bugs, knowledge concentrated in one place.

Key principles (see [LANGUAGE.md](LANGUAGE.md) for the full list):

- **Deletion test**: imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.**
- **One adapter = hypothetical seam. Two adapters = real seam.**
- **Prefer Nuxt-native seams** over hand-rolled equivalents (custom DI containers, ad-hoc singletons, parallel hook systems).

This skill is _informed_ by the project's domain model. The domain language gives names to good seams; ADRs record decisions the skill should not re-litigate.

## Companion files

- [LANGUAGE.md](LANGUAGE.md) — full vocabulary and principles.
- [DEEPENING.md](DEEPENING.md) — dependency categories, seam ladder (`shared/` → `packages/*` → Nuxt module/layer), testing strategy.
- [NUXT-SEAMS.md](NUXT-SEAMS.md) — catalogue of Nuxt's framework-native seams and the scope boundaries between nitro / nuxt server / nuxt client.
- [NITRO-CONVENTIONS.md](NITRO-CONVENTIONS.md) — server-side conventions Nitro doesn't ship (validators, policies, presenters, error handling, service providers, event/listener registry, tasks, job dispatch, per-layer schema + migrations).
- [VUE-CONVENTIONS.md](VUE-CONVENTIONS.md) — framework-agnostic Vue patterns (service composables as factory + `provide` + `use`, component thinness).
- [NUXT-APP-CONVENTIONS.md](NUXT-APP-CONVENTIONS.md) — Nuxt-specific app layer (`$fetch` as port, async resource composables, `useState` for SSR-safe app-wide state, client policy mirror).
- [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md) — design-it-twice with parallel sub-agents for chosen candidates.

## Process

### 1. Explore

Read the project's domain glossary and any ADRs in the area you're touching first. Then orient on the Nuxt shape of the project:

- Is this a Nuxt **app**, a Nuxt **module**, or a workspace with **layers**?
- Which Nuxt extension points are already in use: `modules/`, `layers/`, `plugins/`, `composables/`, `server/api`, `server/middleware`, `nitro` plugins, `runtimeConfig`, `app:*`/`nitro:*`/`build:*` hooks, `addImports`, `addServerHandler`, `addComponent`, `addPlugin`?
- Where does the project hand-roll its own seam (a singleton, a custom plugin pattern, a global registry) instead of using one Nuxt provides?

Then use the Agent tool with `subagent_type=Explore` to walk the codebase. Don't follow rigid heuristics — explore organically and note where you experience friction:

- Where does understanding one feature require bouncing between a `composables/` file, a `plugins/` file, a `server/api` route, and a piece of `runtimeConfig`?
- Where are modules **shallow** — a composable that just wraps a single `useState`, a plugin that only `provide`s one untyped value, a server util that's a one-line passthrough to `$fetch`?
- Where have pure functions been extracted just for testability, but the real bugs hide in how Nuxt wires them (no **locality** — e.g. plugin order, hook timing, SSR vs client divergence)?
- Where does cross-cutting logic (auth, logging, feature flags, telemetry) leak across `app/`, `server/`, `nitro`, instead of sitting behind one hook or one module?
- Where Must a **Nuxt module** or **layer** swallow a cluster of plugins + composables + server handlers and present a small interface (a config object + 2-3 hooks)?
- Which parts of the codebase are untested, or hard to test through their current interface? (Composables that touch `useNuxtApp()` deep inside, server handlers with embedded business logic, etc.)
- Walk the convention files for missing seams: [NITRO-CONVENTIONS.md](NITRO-CONVENTIONS.md) on the server side; [VUE-CONVENTIONS.md](VUE-CONVENTIONS.md) + [NUXT-APP-CONVENTIONS.md](NUXT-APP-CONVENTIONS.md) on the app side. Each section's "Gap" entry is a friction signal — if it's present in the codebase, that's a candidate.

Apply the **deletion test** to anything you suspect is shallow: would deleting it concentrate complexity, or just move it? A "yes, concentrates" is the signal you want.

Lean on [NUXT-SEAMS.md](NUXT-SEAMS.md) when classifying friction — it maps common shallow patterns to the Nuxt-native deep equivalents.

### 2. Present candidates

Present a numbered list of deepening opportunities. For each candidate:

- **Files** — which files/modules are involved (include the Nuxt-flavoured paths: `modules/foo.ts`, `layers/billing/`, `server/api/x.post.ts`, `plugins/auth.client.ts`, `composables/useBar.ts`, `nuxt.config.ts`)
- **Problem** — why the current architecture is causing friction
- **Solution** — plain English description of what would change, named in Nuxt terms (e.g. *"collapse these three plugins and two composables into a single Nuxt module that registers `addImports` for the public composables and an `app:created` hook for the singleton wiring"*)
- **Benefits** — explained in terms of locality and leverage, and also in how tests would improve (e.g. *"the module can be tested with `@nuxt/test-utils` against a fixture; today the plugin's behaviour can only be observed through a full app boot"*)

**Use CONTEXT.md for the domain, [LANGUAGE.md](LANGUAGE.md) for the architecture, [NUXT-SEAMS.md](NUXT-SEAMS.md) for the framework seam, and the relevant convention file + section number when the candidate is a convention gap.** Example phrasings: *"the Order intake module exposed as a Nuxt layer"*, *"establish NITRO-CONVENTIONS.md §1 for the Order create handler"* — not *"the FooBarHandler"*, not *"the Order service"*.

**ADR conflicts**: if a candidate contradicts an existing ADR, only surface it when the friction is real enough to warrant revisiting the ADR. Mark it clearly (e.g. _"contradicts ADR-0007 — but worth reopening because…"_). Don't list every theoretical refactor an ADR forbids.

Do NOT propose interfaces yet. Ask the user: "Which of these would you like to explore?"

### 3. Grilling loop

Once the user picks a candidate, drop into a grilling conversation. Walk the design tree with them — constraints, dependencies, the shape of the deepened module, what sits behind the seam, what tests survive. For Nuxt candidates, also walk: which Nuxt hook fires when, SSR vs client behaviour, build-time vs runtime, where `runtimeConfig` ends and component state begins.

Side effects happen inline as decisions crystallize:

- **Naming a deepened module after a concept not in `CONTEXT.md`?** Add the term to `CONTEXT.md` — same discipline as `/grill-with-docs` (see [CONTEXT-FORMAT.md](../grill-with-docs/CONTEXT-FORMAT.md)). Create the file lazily if it doesn't exist.
- **Sharpening a fuzzy term during the conversation?** Update `CONTEXT.md` right there.
- **User rejects the candidate with a load-bearing reason?** Offer an ADR, framed as: _"Want me to record this as an ADR so future architecture reviews don't re-suggest it?"_ Only offer when the reason would actually be needed by a future explorer to avoid re-suggesting the same thing — skip ephemeral reasons ("not worth it right now") and self-evident ones. See [ADR-FORMAT.md](../grill-with-docs/ADR-FORMAT.md).
- **Want to explore alternative interfaces for the deepened module?** See [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md). Sub-agents are pre-seeded with Nuxt-native shapes (module + hooks, layer, plugin + composable, nitro plugin) so the design space is grounded in what Nuxt already offers.
