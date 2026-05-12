---
name: improve-ts-pkg-architecture
description: Find deepening opportunities in a TypeScript package, leaning on TS-package-native seams (package.json `exports`, subpath/conditional exports, workspace `packages/*`, factories + hooks, plugin shapes, citty/hookable/unbuild conventions). Use when the user wants to improve architecture, find refactoring opportunities, consolidate tightly-coupled modules, or make a TS library/CLI/monorepo more testable and AI-navigable. Works on single-repo packages and pnpm monorepos.
---

# Improve TS Package Architecture

Surface architectural friction in a TypeScript package (library, CLI, or pnpm monorepo) and propose **deepening opportunities** — refactors that turn shallow modules into deep ones, using the package's own publishable surface as the seam. The aim is testability and AI-navigability.

## Glossary

Use these terms exactly in every suggestion. Consistent language is the point — don't drift into "component," "service," "API," or "boundary." Full definitions in [LANGUAGE.md](LANGUAGE.md).

- **Module** — anything with an interface and an implementation (function, file, subpath export, workspace package).
- **Interface** — everything a caller must know to use the module: types, invariants, error modes, ordering, config, runtime conditions. Not just the type signature.
- **Implementation** — the code inside.
- **Depth** — leverage at the interface: a lot of behaviour behind a small interface. **Deep** = high leverage. **Shallow** = interface nearly as complex as the implementation.
- **Seam** — where an interface lives; a place behaviour can be altered without editing in place.
- **Adapter** — a concrete thing satisfying an interface at a seam.
- **Leverage** — what callers get from depth.
- **Locality** — what maintainers get from depth: change, bugs, knowledge concentrated in one place.

Key principles (see [LANGUAGE.md](LANGUAGE.md) for the full list):

- **Deletion test**: imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.**
- **One adapter = hypothetical seam. Two adapters = real seam.**
- **No import-time side effects.** A published package's top level must declare and export, never *do*. No listeners, env reads, singleton construction, network calls, or `console.*` at module scope — they fire eagerly in every consumer, break treeshaking, break `sideEffects: false`, and break SSR/edge consumers. Side effects live inside exported functions the caller invokes.
- **Functional over class-based.** Factories (`createX(opts)`) and plain functions over classes. Classes only when truly stateful with multiple coordinated methods and a lifecycle the caller can't model as `{ run, stop }`.
- **The published `exports` map IS the interface.** Anything reachable through a subpath is contract. Anything outside it is private and may move.
- **Treeshaking, bundle size, and cold-start speed are part of depth.** A factory that pulls a 200KB SDK into every consumer because of one top-level `import` isn't deep — it's expensive. Named exports only; `sideEffects: false` honoured for real; heavy deps gated behind the subpath / conditional / hook that actually needs them. Bundle size and import-time cost are non-functional invariants of the interface — measure them, defend them.
- **Prefer UnJS primitives.** They're the seams: `hookable` for plugin systems and cross-module extension (different seams talk to each other through a typed hook map, not through imports); `unplugin` for build-tool integrations; `citty` for CLIs; `c12` for config loading; `defu` for option merging; `pathe` for paths; `ofetch` for HTTP; `consola` for logging; `unstorage` for storage; `pkg-types` for `package.json` reads; `mlly`/`pkg-types` for module resolution; `unbuild`/`obuild` for builds. They're ESM-only, treeshake-friendly, universal across runtimes (node/browser/edge/workerd/bun), and zero-dependency where possible. Hand-rolled equivalents are always a reject.

This skill is _informed_ by the project's domain model. The domain language gives names to good seams; ADRs record decisions the skill should not re-litigate.

## Companion files

- [LANGUAGE.md](LANGUAGE.md) — full vocabulary and principles.
- [DEEPENING.md](DEEPENING.md) — dependency categories, seam ladder (file → subpath export → `packages/*`), testing strategy.
- [TS-PKG-SEAMS.md](TS-PKG-SEAMS.md) — catalogue of TS-package-native seams (`exports`, conditional exports, `packages/*`, catalogs, `bin`, hookable, unplugin, citty).
- [PKG-CONVENTIONS.md](PKG-CONVENTIONS.md) — package conventions (factory shape, options + hooks, error modes, CLI shape, treeshake invariants, fixture layout, runtime portability).
- [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md) — design-it-twice with parallel sub-agents for chosen candidates.

## Process

### 1. Explore

**Always run ripast first.** Every claim about depth, caller counts, locality, or cross-package leaks must be backed by a ripast invocation; text search misses shadowed identifiers, type-only imports, and re-exports through a subpath. If you cannot cite ripast output, drop the claim.

Use the package's tsconfig (root `tsconfig.json` or per-package `tsconfig.json` in a monorepo) so subpath aliases and workspace references resolve:

```
--tsconfig tsconfig.json
```

For `scan` (rg-driven) and for trimming when `tree` is noisy, pass `--glob` to scope to source code:

```
--glob 'src/**,packages/*/src/**,test/**'
```

Trim per project: drop `packages/*` on single-repo, drop `test/**` if not relevant, add `bin/**` and `scripts/**` for CLIs and tooling, add `playground/**` for module playgrounds.

Opening pass — run before forming any candidate:

| Command | What it surfaces |
| --- | --- |
| `npx -y @ripast/cli unused --tsconfig tsconfig.json --exports local` | Top-level declarations with zero project references → deletion-test slam-dunks |
| `npx -y @ripast/cli tree --exports exported --tsconfig tsconfig.json` | Public surface per file → shallow modules + leaks (anything exported that isn't in the `exports` map is a confessed private leak) |
| `npx -y @ripast/cli tree --exports local --tsconfig tsconfig.json` | Internals per file → locality opportunities |

Per-candidate, before listing (`scan` is rg-driven — use `--glob` here):

| Command | What it surfaces |
| --- | --- |
| `npx -y @ripast/cli scan <symbol> --glob ...` | Caller count + kind classification → drives deletion test + §2 thresholds |
| `npx -y @ripast/cli scan <symbol> --kind identifier-reference,import-specifier --glob ...` | Same, minus string-literal noise |
| `npx -y @ripast/cli scan <symbol> --graph mermaid --glob ...` | Importer graph → cross-package leaks (graph spanning `packages/a/src/` + `packages/b/src/` via deep import) |

`unused --exports local` is the most direct deletion-test signal: a top-level declaration with no callers either earns a delete or is a confessed shallow seam waiting to be deepened. Cite numbers when presenting.

**Read the package's published surface first**: open `package.json` and note the `exports` map, `bin`, `peerDependencies`, `sideEffects`, and `engines`. The `exports` map is the contract. Then read any domain glossary (`CONTEXT.md`) and ADRs (`docs/adr/`).

Orient on the package shape:

- Is this a **single-repo library**, a **CLI** (`bin` field), a **plugin** (peer-dep on rollup/vite/eslint/etc.), or a **pnpm monorepo** with `packages/*`?
- Which TS-package-native seams are already used: subpath exports, conditional exports (`types`/`import`/`node`/`browser`/`workerd`), `packages/*`, `catalog:` versions, `hookable` hooks, `unplugin`/factory shape, `citty` subcommands, `c12` config loading?
- Where does the package hand-roll its own seam (a singleton in a top-level file, a global `EventEmitter`, a custom plugin registry, ad-hoc env reads) instead of using one the ecosystem provides?

Then use the Agent tool with `subagent_type=Explore` to walk the codebase. Don't follow rigid heuristics — explore organically and note where you experience friction:

- Where does understanding one feature require bouncing between five files in `src/`, a util in `src/utils/`, and a re-export at `src/index.ts`? `npx -y @ripast/cli scan <symbol> --graph mermaid` spanning three or more directories with no central seam.
- Where are modules **shallow** — a file that just re-exports one function, a util that wraps a single one-liner, a factory that just news up a class with no defaults? Spot via `npx -y @ripast/cli tree --exports exported`.
- Where have pure functions been extracted just for testability, but the real bugs hide in how they're composed (no **locality** — e.g. orchestration order, error-recovery ordering, cache invalidation)?
- Where does cross-cutting logic (logging, config loading, error mapping, telemetry) leak across 10+ files instead of sitting behind one factory or one hook bus?
- Where must a **subpath export** or **workspace package** swallow a cluster of files and present a small interface (a factory + 2–3 options + a hook bus)?
- Which parts of the codebase are untested, or hard to test through their current interface? (Functions that read `process.env` deep inside, modules that construct singletons at import, etc.)
- Walk [PKG-CONVENTIONS.md](PKG-CONVENTIONS.md) for missing conventions — each section's "Gap" entry is a friction signal — if it's present in the codebase, that's a candidate.
- **Cross-package leaks** (monorepo). A `packages/a/src/foo` imported from `packages/b/src/bar` via a relative path or deep workspace import (not via `packages/a`'s `exports` map) is a smuggle. Detect with `npx -y @ripast/cli scan <symbol> --graph mermaid`: importer set straddling two workspace packages = leak by definition. See [TS-PKG-SEAMS.md](TS-PKG-SEAMS.md) `Workspace packages` and `exports map`.
- **Import-time side effects.** Top-level `console.*`, listener registration, singleton construction, env reads, top-level `await` for IO, network calls at module scope. These eagerly fire in every consumer (and break treeshaking, `sideEffects: false`, edge/SSR consumers, and tests). Move behind an exported function or into the right lifecycle (factory body, CLI command handler, plugin hook).
- **`exports` map leaks.** Anything imported through a deep path (`pkg/dist/internal/foo`) instead of a declared subpath = consumer reached past the seam. Either expose it via a subpath if it's stable, or stop the leak (in most cases a sign the public seam isn't deep enough).
- **Classes that should be factories.** A `class` with one public method and a constructor — replace with `createX(opts)` returning the method. A `class` with multiple methods that don't share mutable state — split into functions.
- **Reaching for Node builtins where a small UnJS dep would generalize across runtimes** (browser/edge/workerd): `node:path` vs `pathe`, `node:fs` vs `unstorage`, `console.log` vs `consola`, `EventEmitter` vs `hookable`, `fetch` vs `ofetch`, ad-hoc CLI vs `citty`. The seam isn't the dep — it's that the package now works in one runtime only.
- **Cross-module coupling that should flow through a hook bus.** Two modules that import each other to coordinate (or three modules that all reach into a fourth) are missing a seam. `hookable` is the answer: each module emits/listens on a typed hook map, none of them import each other. The hook map is the contract; the modules become independently testable. Detect via `npx -y @ripast/cli scan <symbol> --graph mermaid` showing two-way edges or fan-in to a "coordinator" module.
- **Treeshake / bundle-size signals.** A heavy SDK or large dep statically imported at module top level when only one code path uses it — moves the cost onto every consumer. Move the import inside the function that needs it (or behind a conditional export). Run `npx -y publint && npx -y @arethetypeswrong/cli --pack .` on the built package; a flat `dist/` with one entry that pulls in everything is a depth failure. Confirm with bundler analysis (`npx -y rollup-plugin-visualizer` output if available, or `du -sh dist/`).
- **Repeated import-time work** (regex compilation, schema construction, table generation) that runs whether or not the module is used. Move into a memoised getter inside the factory; the cost pays once on first use, not on every import.

Apply the **deletion test** to anything you suspect is shallow: would deleting it concentrate complexity, or just move it? A "yes, concentrates" is the signal you want.

Lean on [TS-PKG-SEAMS.md](TS-PKG-SEAMS.md) when classifying friction — it maps common shallow patterns to the TS-package-native deep equivalents.

### 2. Present candidates

Present a numbered list of deepening opportunities. For each candidate:

- **Files** — which files/modules are involved (include flavour paths: `src/index.ts`, `src/cli.ts`, `packages/core/src/foo.ts`, `package.json` `exports`, `pnpm-workspace.yaml`)
- **Problem** — why the current architecture is causing friction
- **Solution** — plain English description of what would change, named in TS-pkg terms (e.g. *"collapse these five files into a single `createPipeline(opts)` factory exported from a new `./pipeline` subpath; the existing files become private implementation under `src/pipeline/`, and the factory exposes a `hookable` hook bus for the three current extension points"*)
- **Benefits** — explained in terms of locality and leverage, and also in how tests would improve (e.g. *"the factory can be tested directly with vitest; today the three hooks fire from three different files and the only way to observe them is to import each privately"*)

**Use CONTEXT.md for the domain, [LANGUAGE.md](LANGUAGE.md) for the architecture, [TS-PKG-SEAMS.md](TS-PKG-SEAMS.md) for the framework seam, and the relevant convention section from [PKG-CONVENTIONS.md](PKG-CONVENTIONS.md) when the candidate is a convention gap.** Example phrasings: *"the Order intake module exposed as a `./intake` subpath"*, *"establish PKG-CONVENTIONS.md §Hook bus for the build pipeline"* — not *"the FooBarHandler"*, not *"the Order service"*.

**Reject before listing.** Drop any candidate that fails one of these. Bias hard toward fewer, sharper candidates. Validate every caller-count threshold with `npx -y @ripast/cli scan <symbol> --kind identifier-reference,import-specifier`; no guesswork.

- **Deletion test fails.** If deleting the proposed module just inlines 1–2 lines into each caller, skip. Thresholds: single caller = one adapter, not a seam; a new subpath export needs ≥3 consumers or a distinct public concept; a workspace `packages/*` needs ≥2 independent consumers (apps, CLI, worker, public packages) AND zero coupling back to the host; a factory earns its keep at ≥2 callers OR real branching/options; a pure value/type mapping (no branching, just destructure/rename) needs ≥4 callers.
- **No locality win.** "Now testable in isolation" or "future-proof" without bugs/changes/knowledge concentrating in one place is relocation, not depth. Covers: pure-function extraction with no consolidation, speculative seams ("will need someday"), and defensive re-validation of invariants the caller's zod schema or type already enforces. Validate at system boundaries; trust internal types.
- **Renames or file reshuffles dressed up as architecture.** "Move these files" or "rename this concept" is a refactor task, not a deepening candidate. Note separately or skip.
- **Smuggles import-time side effects.** If the deepened module runs anything at top level on import (listeners, singletons, env reads, network), reshape so the side effect lives inside an exported function or a lifecycle the caller drives (factory body, CLI command, plugin hook).
- **Already conventional.** If the code already matches a PKG-CONVENTIONS.md convention, don't re-propose it.
- **Class for a single-method behaviour.** Reject any deepening that proposes a `class` to host one public method. Use a function or a factory.
- **Single-consumer "future reuse" workspace package.** Premature; pay the toolchain cost (separate `tsconfig`, `vitest.config`, build output, version) when the second consumer arrives. Until then a subpath export suffices.
- **Subpath export read in exactly one place.** Confirm with `npx -y @ripast/cli scan <import-specifier> --kind import-specifier`; one hit = fails. Either it's actually private (move it out of the `exports` map) or it's premature surface.
- **Config threaded through ≥3 layers unchanged.** Created at A, passed through B and C untouched, consumed at D = missing seam. Consume at the creation layer or place an adapter at the deepest meaningful seam.
- **Hand-rolled plugin system.** If the candidate would build a custom `register(fn)` / global plugin registry, reject — use `hookable`'s `createHooks` or the `unplugin` shape. See [TS-PKG-SEAMS.md](TS-PKG-SEAMS.md) `Hooks`.
- **Hand-rolled CLI argument parsing.** Reject in favour of `citty`'s `defineCommand`. See [TS-PKG-SEAMS.md](TS-PKG-SEAMS.md) `CLI`.
- **Hand-rolled config loading.** Reject in favour of `c12`'s `loadConfig`.
- **Contradicts a current ADR without a load-bearing reason.** See ADR conflicts below.

**Forbidden patterns.** Always flag, never propose. Full list in [PKG-CONVENTIONS.md](PKG-CONVENTIONS.md) §"Forbidden patterns". Headline rules: **no `default` exports from package entry points** (named exports only — tree-shakes cleanly, refactors cleanly, doesn't fight `verbatimModuleSyntax`); **no top-level `await`** in published source (breaks CJS interop and lazy import); **no `process.env` reads outside a single config loader**; **no relative imports across workspace packages** (always go through the package's `exports`).

**ADR conflicts**: if a candidate contradicts an existing ADR, only surface it when the friction is real enough to warrant revisiting the ADR. Mark it clearly (e.g. _"contradicts ADR-0007 — but worth reopening because…"_). Don't list every theoretical refactor an ADR forbids.

Do NOT propose interfaces yet. Ask the user: "Which of these would you like to explore?"

### 3. Grilling loop

Once the user picks a candidate, drop into a grilling conversation. Walk the design tree with them — constraints, dependencies, the shape of the deepened module, what sits behind the seam, what tests survive. For TS-pkg candidates, also walk: which runtimes it must work in (node / browser / workerd / edge / bun), whether it appears in the `exports` map (and at which subpath / conditional), whether it lives in `src/` or a workspace `packages/*`, what the treeshake / `sideEffects` story is.

Side effects happen inline as decisions crystallize:

- **Naming a deepened module after a concept not in `CONTEXT.md`?** Add the term to `CONTEXT.md` — same discipline as `/grill-with-docs` (see [CONTEXT-FORMAT.md](../grill-with-docs/CONTEXT-FORMAT.md)). Create the file lazily if it doesn't exist.
- **Sharpening a fuzzy term during the conversation?** Update `CONTEXT.md` right there.
- **User rejects the candidate with a load-bearing reason?** Offer an ADR, framed as: _"Want me to record this as an ADR so future architecture reviews don't re-suggest it?"_ Only offer when the reason would actually be needed by a future explorer to avoid re-suggesting the same thing — skip ephemeral reasons ("not worth it right now") and self-evident ones. See [ADR-FORMAT.md](../grill-with-docs/ADR-FORMAT.md).
- **Want to explore alternative interfaces for the deepened module?** See [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md). Sub-agents are pre-seeded with TS-pkg-native shapes (single factory, factory + hook bus, subpath-exposed surface, ports & adapters) so the design space is grounded in what the ecosystem already offers.
- **Need to know the true blast radius of a rename/move before committing?** `npx -y @ripast/cli scan <symbol>` (counts) or `npx -y @ripast/cli scan <symbol> --graph mermaid` (importer graph). Quote numbers before promising scope.
- **Decision crystallized into a concrete refactor?** Execute through ripast, not Edit. Pick the primitive:

  Pass `--tsconfig tsconfig.json` (or the per-package one) on `rename`, `move`, and `rename-file` so all callers are rewritten.

  | Refactor | Command |
  | --- | --- |
  | Rename a symbol across files | `npx -y @ripast/cli rename <from> <to> --tsconfig tsconfig.json --apply` (add `--scope <file>` if multi-declared) |
  | Move an exported declaration | `npx -y @ripast/cli move <symbol> --from <a> --to <b> --tsconfig tsconfig.json --apply` |
  | Move a file (e.g. `src/utils/foo.ts` → `src/pipeline/foo.ts` to close a leak) | `npx -y @ripast/cli rename-file <old> <new> --tsconfig tsconfig.json --apply` |

  All mutating commands default to dry-run — preview the diff, then `--apply`. `--verify` (default on for `rename`/`move`) blocks the apply on new type diagnostics; fix them, never `--no-verify` past them. Edit is only correct for single-file or <5-match changes. ripast carries out the move; it does not justify the deepening.

- **The refactor changes the `exports` map?** Update `package.json` `exports` in the same pass. If a subpath is added or removed, the change is a SemVer-visible event — note it for the next release.
