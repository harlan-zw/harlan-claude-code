#!/usr/bin/env -S node --experimental-strip-types --no-warnings
import { mkdirSync, readFileSync, renameSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { defineCommand, runMain } from 'citty'
import { runCssClassRename } from './css-class-rename.ts'
import { formatScanHits, runCssClassScan } from './css-class-scan.ts'
import { runMove } from './move.ts'
import { runRenameFile } from './rename-file.ts'
import { runRename } from './rename.ts'
import { formatHits, scan } from './scan.ts'
import { printDiffs, summarize, writeChanges } from './util.ts'
import { formatRegressions } from './verify.ts'

const globArg = { type: 'string' as const, description: 'File glob(s), comma-separated. Defaults to *.ts,*.tsx,*.vue,...  Respects .gitignore.' }
const applyArg = { type: 'boolean' as const, default: false, description: 'Write changes. Default prints a unified diff.' }
const verifyArg = { type: 'boolean' as const, default: true, description: 'Typecheck post-transform; refuse --apply on regression. Disable with --no-verify.' }
const vueArg = { type: 'boolean' as const, default: true, description: 'Enable Volar pass for .vue files. Disable with --no-vue to force pure ts-morph behavior.' }
const jsonArg = { type: 'boolean' as const, default: false, description: 'Emit machine-readable JSON (suppresses diff/summary text).' }

const scanCmd = defineCommand({
  meta: { name: 'scan', description: 'rg-prefilter + AST-classify occurrences of an identifier.' },
  args: {
    pattern: { type: 'positional', required: true },
    glob: globArg,
    kind: { type: 'string', description: 'Filter to kind(s), comma-separated. Kinds: identifier-reference, identifier-binding, import-specifier, member-access, property, jsx, string-literal.' },
    json: { type: 'boolean', default: false },
  },
  run({ args }) {
    const hits = scan(args.pattern as string, {
      glob: args.glob ? (args.glob as string).split(',') : undefined,
      kinds: args.kind ? (args.kind as string).split(',') : undefined,
    })
    process.stdout.write(`${formatHits(hits, args.json as boolean)}\n`)
  },
})

const renameCmd = defineCommand({
  meta: { name: 'rename', description: 'Scope-aware symbol rename via ts-morph (handles type-only imports, shadowing, JSX).' },
  args: {
    from: { type: 'positional', required: true },
    to: { type: 'positional', required: true },
    tsconfig: { type: 'string' },
    glob: globArg,
    apply: applyArg,
    verify: verifyArg,
    scope: { type: 'string', description: 'Restrict to a single file when multiple files declare the same name.' },
    all: { type: 'boolean', default: false, description: 'Rename declarations in every file that defines the name (bypasses ambiguity check).' },
    vue: vueArg,
    json: jsonArg,
  },
  async run({ args }) {
    const r = await runRename(args.from as string, args.to as string, {
      tsconfig: args.tsconfig as string | undefined,
      glob: args.glob ? (args.glob as string).split(',') : undefined,
      verify: args.verify as boolean,
      scope: args.scope as string | undefined,
      allowMultiple: args.all as boolean,
      vue: args.vue as boolean,
    })
    emitResult(r, !!args.apply, !!args.verify, !!args.json)
  },
})

const moveCmd = defineCommand({
  meta: { name: 'move', description: 'Move a top-level exported symbol between files; rewrites import sites project-wide.' },
  args: {
    symbol: { type: 'positional', required: true },
    from: { type: 'string', required: true, description: 'Source file path.' },
    to: { type: 'string', required: true, description: 'Target file path (created if missing).' },
    tsconfig: { type: 'string' },
    apply: applyArg,
    verify: verifyArg,
    vue: vueArg,
    json: jsonArg,
  },
  async run({ args }) {
    const r = await runMove(args.symbol as string, args.from as string, args.to as string, {
      tsconfig: args.tsconfig as string | undefined,
      verify: args.verify as boolean,
      vue: args.vue as boolean,
    })
    emitResult(r, !!args.apply, !!args.verify, !!args.json)
  },
})

interface MutatingResult {
  changes: { path: string, rel: string, before: string, after: string }[]
  scanned: number
  regressions: { file: string, line: number, col: number, code: number, message: string }[]
}

function emitResult(r: MutatingResult, apply: boolean, verify: boolean, json: boolean = false): void {
  const s = summarize(r.changes)
  if (json) {
    const blockedByRegression = verify && apply && r.regressions.length > 0
    const wrote = apply && !blockedByRegression
    if (wrote)
      writeChanges(r.changes)
    const payload = {
      applied: wrote,
      dryRun: !apply,
      blockedByRegression,
      scanned: r.scanned,
      summary: s,
      changes: r.changes.map(c => ({ path: c.rel, absolutePath: c.path, before: c.before, after: c.after })),
      regressions: r.regressions,
    }
    process.stdout.write(`${JSON.stringify(payload)}\n`)
    if (blockedByRegression)
      process.exit(1)
    return
  }
  if (!apply) {
    process.stdout.write(`${s.files} file${s.files === 1 ? '' : 's'}, +${s.linesAdded} -${s.linesRemoved} lines\n\n`)
    printDiffs(r.changes)
  }
  if (verify && r.regressions.length) {
    process.stderr.write(`\n${formatRegressions(r.regressions, process.cwd())}\n`)
    if (apply) {
      process.stderr.write(`\nripast: refusing to --apply; --no-verify to override.\n`)
      process.exit(1)
    }
  }
  if (apply) {
    writeChanges(r.changes)
    for (const c of r.changes) process.stdout.write(`wrote ${c.rel}\n`)
  }
  const suffix = apply ? '' : ' (dry run, pass --apply to write)'
  process.stdout.write(`\n${r.changes.length}/${r.scanned} files changed${suffix}\n`)
}

const renameFileCmd = defineCommand({
  meta: { name: 'rename-file', description: 'Rename a file and rewrite every import site (including .vue consumers and component-name refs).' },
  args: {
    old: { type: 'positional', required: true },
    new: { type: 'positional', required: true },
    tsconfig: { type: 'string' },
    apply: applyArg,
    verify: verifyArg,
    json: jsonArg,
  },
  async run({ args }) {
    const r = await runRenameFile(args.old as string, args.new as string, {
      tsconfig: args.tsconfig as string | undefined,
      verify: args.verify as boolean,
    })
    const apply = !!args.apply
    const verify = !!args.verify
    const json = !!args.json
    const s = summarize(r.changes)
    const blockedByRegression = verify && apply && r.regressions.length > 0
    const wrote = apply && !blockedByRegression

    if (wrote) {
      writeChanges(r.changes)
      mkdirSync(dirname(r.fileMove.to), { recursive: true })
      renameSync(r.fileMove.from, r.fileMove.to)
    }

    if (json) {
      process.stdout.write(`${JSON.stringify({
        applied: wrote,
        dryRun: !apply,
        blockedByRegression,
        scanned: r.scanned,
        summary: s,
        fileMove: r.fileMove,
        changes: r.changes.map(c => ({ path: c.rel, absolutePath: c.path, before: c.before, after: c.after })),
        regressions: r.regressions,
      })}\n`)
      if (blockedByRegression)
        process.exit(1)
      return
    }
    if (!apply) {
      process.stdout.write(`rename ${args.old} -> ${args.new}\n`)
      process.stdout.write(`${s.files} consumer file${s.files === 1 ? '' : 's'}, +${s.linesAdded} -${s.linesRemoved} lines\n\n`)
      printDiffs(r.changes)
    }
    if (verify && r.regressions.length) {
      process.stderr.write(`\n${formatRegressions(r.regressions, process.cwd())}\n`)
      if (apply) {
        process.stderr.write(`\nripast: refusing to --apply; --no-verify to override.\n`)
        process.exit(1)
      }
    }
    if (wrote) {
      for (const c of r.changes) process.stdout.write(`wrote ${c.rel}\n`)
      process.stdout.write(`renamed ${args.old} -> ${args.new}\n`)
    }
    const suffix = apply ? '' : ' (dry run, pass --apply to write)'
    process.stdout.write(`\n${r.changes.length} consumer file(s) updated${suffix}\n`)
  },
})

const cssClassRenameCmd = defineCommand({
  meta: { name: 'css-class-rename', description: 'Rename CSS utility class token(s) across strings, Vue templates, and @apply. Pass a single "from to" pair, or --map <file.json> for bulk. No typecheck verify.' },
  args: {
    from: { type: 'positional', required: false },
    to: { type: 'positional', required: false },
    map: { type: 'string', description: 'Path to a JSON file with { "from": "to", ... } flat object. Mutually exclusive with from/to positionals.' },
    glob: globArg,
    apply: applyArg,
    json: jsonArg,
  },
  async run({ args }) {
    const map = buildRenameMap(args.from as string | undefined, args.to as string | undefined, args.map as string | undefined)
    const r = await runCssClassRename(map, {
      glob: args.glob ? (args.glob as string).split(',') : undefined,
    })
    emitResult(r, !!args.apply, false, !!args.json)
  },
})

function buildRenameMap(from: string | undefined, to: string | undefined, mapPath: string | undefined): Map<string, string> {
  const hasPair = from != null && to != null
  const hasMap = !!mapPath
  if (hasPair && hasMap) {
    process.stderr.write(`ripast css-class-rename: pass either "from to" positionals OR --map, not both.\n`)
    process.exit(2)
  }
  if (!hasPair && !hasMap) {
    process.stderr.write(`ripast css-class-rename: missing input. Pass "from to" positionals or --map <file.json>.\n`)
    process.exit(2)
  }
  if (hasPair)
    return new Map([[from, to]])
  const raw = readFileSync(resolve(process.cwd(), mapPath!), 'utf8')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  }
  catch (err) {
    process.stderr.write(`ripast css-class-rename: --map file is not valid JSON (${(err as Error).message}).\n`)
    process.exit(2)
  }
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    process.stderr.write(`ripast css-class-rename: --map must be a flat JSON object, got ${Array.isArray(parsed) ? 'array' : typeof parsed}.\n`)
    process.exit(2)
  }
  const entries: [string, string][] = []
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof v !== 'string') {
      process.stderr.write(`ripast css-class-rename: --map value for "${k}" is not a string.\n`)
      process.exit(2)
    }
    if (!k) {
      process.stderr.write(`ripast css-class-rename: --map has an empty key.\n`)
      process.exit(2)
    }
    entries.push([k, v])
  }
  if (!entries.length) {
    process.stderr.write(`ripast css-class-rename: --map is empty.\n`)
    process.exit(2)
  }
  return new Map(entries)
}

const cssClassScanCmd = defineCommand({
  meta: { name: 'css-class-scan', description: 'Tokenize every class site (strings, Vue class attrs, @apply) and emit a frequency-sorted list. Feeds --map for css-class-rename.' },
  args: {
    pattern: { type: 'string', description: 'Comma-separated globs matched against the bare token (e.g. "bg-*,text-*"). Default: all tokens.' },
    glob: globArg,
    json: jsonArg,
  },
  run({ args }) {
    const hits = runCssClassScan({
      glob: args.glob ? (args.glob as string).split(',') : undefined,
      pattern: args.pattern ? (args.pattern as string).split(',') : undefined,
    })
    process.stdout.write(`${formatScanHits(hits, !!args.json)}\n`)
  },
})

runMain(defineCommand({
  meta: { name: 'ripast', description: 'AST-aware refactor primitives. ripgrep-prefiltered, dry-run by default.' },
  subCommands: {
    'scan': scanCmd,
    'rename': renameCmd,
    'rename-file': renameFileCmd,
    'move': moveCmd,
    'css-class-rename': cssClassRenameCmd,
    'css-class-scan': cssClassScanCmd,
  },
}))
