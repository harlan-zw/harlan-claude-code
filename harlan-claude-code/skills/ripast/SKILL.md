---
name: ripast
description: AST refactor for TS/JS/Vue SFCs incl. `<template>`. Rename symbols or Vue components across files, move declarations, find usages, migrate tailwind classes. Use for "rename X to Y", "rename across the repo", "move X to <file>", "find usages of X", "rename tailwind class". Skip single-file edits.
user_invocable: true
---

Surgical Edits are slow and miss things (shadowed identifiers, type-only imports, JSX refs). `ripast` parses only the files ripgrep says contain the token, then uses the AST to decide what to change. Six primitives; each gated by tests, and mutating primitives include a post-transform typecheck safety net (except `css-class-rename`, which targets CSS tokens and has no typecheck signal). Vue SFCs supported via Volar: rename + move propagate into `<script>` blocks; scan covers `<template>` interpolations and directive expressions; verify catches new diagnostics in `.vue` consumers.

## When to reach for this vs Edit

| Situation | Tool |
| --- | --- |
| Single site, or <5 matches in one file | Edit |
| "Where is X used?" | `ripast scan` |
| Rename a symbol across the repo | `ripast rename` |
| Move a declaration to another file (update all imports) | `ripast move` |
| Rename a file and update every import site | `ripast rename-file` |
| Rename a tailwind/CSS utility class across the repo | `ripast css-class-rename` |
| List every class token in the repo (seeds a rename map) | `ripast css-class-scan` |
| Pattern is only meaningful inside strings/comments | plain `rg` + Edit |

When in doubt, start with `scan` — it's cheap, and its output tells you which of rename/move/Edit fits. Gate: if `rg -c 'PATTERN' | awk '{s+=$1}END{print s}'` is <10 and single-file, just Edit.

## Invocation

First use per install (idempotent, skips if deps already present):

```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/ripast/bin/install.sh"
```

Then alias once per session:

```bash
alias ripast="${CLAUDE_PLUGIN_ROOT}/skills/ripast/bin/cli.ts"
```

Requires `rg` on PATH. Node 22+ strips TypeScript on the fly.

All mutating commands default to **dry-run** (print a unified diff with a `N files, +A -R lines` header). Pass `--apply` to write. `--verify` (on by default for rename/move) runs a ts-morph post-transform typecheck and refuses `--apply` if new diagnostics appear; pass `--no-verify` to skip. Pass `--json` on rename/move for machine-readable output (`{ applied, dryRun, blockedByRegression, scanned, summary, changes[], regressions[] }`).

## Commands

Four primitives, each shipping with clear failure modes.

### `ripast scan <pattern> [--glob g1,g2] [--kind k1,k2] [--json]`

Classify every occurrence (including Vue SFC `<template>` interpolations and directive expressions like `v-if`, `v-for`, `:prop`). Kinds: `identifier-reference`, `identifier-binding`, `import-specifier`, `member-access`, `property`, `jsx`, `string-literal`.

Use this first to decide which tool is next:
- all `identifier-*` / `import-specifier` → safe to `rename`
- mixed with `string-literal` or `property` on unrelated objects → narrow with `--kind` or use `--scope` on rename
- single file with a handful of hits → just Edit

```bash
ripast scan useStore
ripast scan useStore --kind identifier-reference,import-specifier
```

### `ripast rename <from> <to> [--scope file] [--all] [--tsconfig path] [--apply] [--no-verify] [--json]`

Scope-aware rename via ts-morph. Finds the declaration, TypeScript propagates to every reference (imports, JSX, type positions, aliased imports). Object property keys with the same spelling are NOT touched unless they genuinely reference the same symbol.

```bash
ripast rename useStore useAppStore --apply
```

**Ambiguity handling.** If the name is declared in more than one file, ripast refuses and asks for:
- `--scope <file>` to target one declaration, or
- `--all` to rename every declaration (plus all references) across files.

### `ripast move <symbol> --from <source> --to <target> [--tsconfig path] [--apply] [--no-verify] [--json]`

Move a top-level exported declaration and rewrite every import site. Supported: `function`, `class`, `interface`, `type`, `enum`, `const` (single declarator; multi-declarator is auto-split before moving). Default exports are rejected with a clear error.

Behaviour:
- Splits multi-named imports: `import { helper, other } from './a'` becomes `import { other } from './a'` + `import { helper } from './b'`
- Auto-splits `export const a = 1, b = 2` before moving `a`, leaving `export const b = 2` intact in the source
- Refuses to move a declaration that depends on a local non-exported helper (would silently break). Export the helper first, or move both.
- Merges into an existing import from the target when one exists
- Copies transitive imports used by the moved declaration
- Prunes now-unused imports in the source
- If siblings in the source still reference the moved symbol, adds an import pointing to the new location (source stays valid)
- Preserves import aliases

```bash
ripast move helper --from src/utils/a.ts --to src/utils/helpers.ts --apply
```

Target file is created if missing.

### `ripast rename-file <old> <new> [--tsconfig path] [--apply] [--json]`

Rename a file and rewrite every import site (including `.vue` consumers and component-name refs). Volar-driven, so cross-`.vue` imports get correct relative paths and PascalCase↔kebab-case mapping for component renames.

```bash
ripast rename-file src/utils.ts src/lib/helpers.ts --apply
```

Refuses if the source doesn't exist or the target already exists. Requires a `tsconfig.json`.

### `ripast css-class-rename <from> <to> | --map <file.json> [--glob g1,g2] [--apply] [--json]`

Rename CSS utility class token(s) (tailwind, UnoCSS, etc.) across the repo. Tokenizes every string literal, Vue template `class` / `:class` attribute, and `@apply` directive body, then rewrites tokens whose non-variant tail matches a map key. Variant prefixes (`hover:`, `dark:md:`), `!` important markers, and arbitrary values (`bg-[url(a:b)]`) are preserved. Colons inside `[...]` are not treated as variant separators.

Single-pair form:

```bash
ripast css-class-rename bg-gray-500 bg-neutral-500 --apply
```

Bulk form (design-token migrations):

```bash
ripast css-class-rename --map tokens.json --apply
```

`tokens.json` is a flat object mapping old → new:

```json
{
  "bg-gray-500": "bg-neutral-500",
  "text-gray-900": "text-fg",
  "border-gray-200": "border-muted"
}
```

Pass **either** the `from`/`to` positionals **or** `--map`, not both.

Covers `.ts`/`.tsx`/`.js`/`.jsx`/`.vue` (script + template) and `.css`/`.scss`/`.sass`/`.less`/`.postcss`/`.pcss` (via `@apply`). Substring matches are ignored (`bg-gray-5000` is not touched when renaming `bg-gray-500`).

Semantics:
- **No chaining.** If the map has `A → B` and `B → C`, a token `A` becomes `B` (one hop); a token `B` becomes `C`. Rewritten tokens are not re-looked-up in the same pass.
- **No typecheck verify** — classes aren't typed. Primary safety nets are the dry-run diff and your project's existing Tailwind/UnoCSS lint.
- **No variant-group expansion in v0** (e.g., `hover:(bg-gray-500 text-white)` — the inner tokens aren't rewritten under the outer group).

### `ripast css-class-scan [--pattern globs] [--glob g1,g2] [--json]`

Tokenize every class site (string literals, Vue `class`/`:class` attrs, `@apply` bodies) and emit a frequency-sorted list of unique bare tokens. Variants and `!` important are stripped for counting, so `hover:bg-gray-500` contributes to the `bg-gray-500` count. Designed to seed `--map` files for `css-class-rename` — what scan reports is exactly what rename will match.

```bash
ripast css-class-scan
ripast css-class-scan --pattern 'bg-*,text-*,border-*'
ripast css-class-scan --json > tokens.raw.json
```

Output format (text): `<token>  <count>  (N files)`, sorted by count desc then token asc.

Pattern filter is a trivial comma-separated glob (`*` wildcards only) matched against the bare token. Useful for narrowing to a palette (`bg-gray-*`) or a family of utilities. No pattern = all tokens.

Heuristic token filter rejects obvious non-classes: pure numbers, tokens with unusual shapes, anything not matching `word-chars (optional [...]) (optional /opacity)`. False positives are OK (user edits the output into a map); false negatives would silently drop real tokens, so the shape regex is generous.

Not a replacement for `rg` when you want exact positions — this is an aggregation tool. For positions, use `ripast scan <token>` after identifying candidates.

## Workflow

1. **Scan first.** Get a count + kind breakdown. `scan` is cheap; run it freely.
2. **Dry-run.** Read the summary (`N files, +A -R lines`) and the diff. Sanity-check at least two files.
3. **Apply with verify on.** Re-run with `--apply`. If `--verify` reports new type errors, ripast refuses the write and shows the diagnostics — investigate rather than `--no-verify`.
4. **Final check.** `pnpm typecheck && pnpm test` catches anything ripast's verify missed.

## Tests

118 tests in `bin/test/` (scan, rename, rename-file, move, verify, roundtrip, idempotence, patterns, strict, smoke, atomic, vue). Run with:

```bash
pnpm --dir "${CLAUDE_PLUGIN_ROOT}/skills/ripast/bin" test
```

Coverage spans: kind classification, Vue SFC script-block extraction, import dedupe, cross-file rename, property-vs-reference disambiguation, shadowing, aliased-import preservation, JSX components, type-only imports (both forms), re-exports, namespace imports, multi-named import splitting, transitive import copy, unused import pruning, decorator preservation, ambiguity detection with `--scope` / `--all`, idempotence (second run throws, no silent drift), roundtrip identity (rename A→B→A, move x a→b→a), typecheck regression detection, and a realistic multi-file smoke test.

## Gotchas

- **Vue SFC** — `scan` covers script + template (interpolations, `v-if`/`v-for`/`:prop` expressions). `rename` and `move` propagate into `<script>` blocks via Volar, then a template-AST post-pass sweeps remaining template references: component tag usage (`<MyButton>` and `<my-button>`, casing preserved) and pure-template-only identifier refs (used in `{{ }}` or `:prop` but never in script). The post-pass respects `v-for` shadowing and skips string literals, member-access keys, and object-property keys. `<style>` references are out of scope. Pass `--no-vue` to force pure ts-morph behavior if Volar misbehaves.
- **Svelte** — not supported.
- **`move` auto-splits multi-declarators** — `export const a = 1, b = 2` with `move a` splits the statement first. The leftover `b` stays put.
- **`move` refuses on local non-exported deps** — if the moved symbol depends on a non-exported helper in the same file, `move` aborts with an actionable error. Export the helper first, or move both.
- **ts-morph on large monorepos** — loads the full TS project; expect 2-3 s startup for `rename`/`move`. `--no-verify` halves the time.
- **Always commit before `--apply`** — rollback is `git checkout .`.

## What this skill is NOT for

- One-shot fixes in a file you're already reading — Edit is faster.
- Pattern matches that are conceptually text, not code (e.g., copy strings). Use `rg` + Edit.
- Renames across Svelte markup. (Vue `<template>` IS supported via Volar + a template-AST post-pass.)
- Arbitrary codemods. Custom AST transforms are out of scope for the stable surface.
