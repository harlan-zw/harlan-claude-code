import type { FileChange } from './util.ts'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { walk } from 'oxc-walker'
import { parseFile, rgFiles } from './util.ts'

export interface CssClassRenameOptions {
  cwd?: string
  glob?: string | string[]
}

export interface CssClassRenameResult {
  changes: FileChange[]
  scanned: number
  regressions: never[]
}

export type RenameMap = ReadonlyMap<string, string>

const DEFAULT_SPLIT_RE = /([\\:]?[\s'"`;{}]+)/g

const CSS_EXTS = ['.css', '.scss', '.sass', '.less', '.postcss', '.pcss']
const CODE_EXTS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']

export async function runCssClassRename(map: RenameMap, opts: CssClassRenameOptions = {}): Promise<CssClassRenameResult> {
  const cwd = opts.cwd ?? process.cwd()
  const glob = opts.glob ?? [...CODE_EXTS, '.vue', ...CSS_EXTS].map(e => `*${e}`)
  const fileSet = new Set<string>()
  for (const key of map.keys()) {
    for (const f of rgFiles(key, { cwd, glob, fixedStrings: true })) fileSet.add(f)
  }
  const files = [...fileSet]
  const changes: FileChange[] = []
  for (const abs of files) {
    const before = safeRead(abs)
    if (before == null)
      continue
    let after: string
    if (abs.endsWith('.vue'))
      after = rewriteVue(abs, before, map, cwd)
    else if (CSS_EXTS.some(e => abs.endsWith(e)))
      after = rewriteCss(before, map)
    else
      after = rewriteScript(abs, before, map, cwd)
    if (after !== before) {
      const rel = abs.slice(cwd.length + 1)
      changes.push({ path: abs, rel, before, after })
    }
  }
  return { changes, scanned: files.length, regressions: [] }
}

function safeRead(path: string): string | null {
  try {
    return readFileSync(path, 'utf8')
  }
  catch {
    return null
  }
}

function mapIncludesAny(input: string, map: RenameMap): boolean {
  for (const key of map.keys()) {
    if (input.includes(key))
      return true
  }
  return false
}

function rewriteScript(path: string, source: string, map: RenameMap, cwd: string): string {
  const file = parseFile(path, cwd)
  if (!file.program)
    return source
  return rewriteStringsInProgram(source, file.program, map, 0)
}

function rewriteStringsInProgram(source: string, program: any, map: RenameMap, offset: number): string {
  const edits: { start: number, end: number, replacement: string }[] = []
  walk(program, {
    enter(node: any) {
      if (node.type === 'Literal' && typeof node.value === 'string') {
        if (!mapIncludesAny(node.value, map))
          return
        const inner = node.value
        const rewritten = rewriteClassString(inner, map)
        if (rewritten === inner)
          return
        edits.push({ start: node.start + offset + 1, end: node.end + offset - 1, replacement: rewritten })
      }
      else if (node.type === 'TemplateElement' && typeof node.value?.raw === 'string') {
        const raw: string = node.value.raw
        if (!mapIncludesAny(raw, map))
          return
        const rewritten = rewriteClassString(raw, map)
        if (rewritten === raw)
          return
        edits.push({ start: node.start + offset, end: node.end + offset, replacement: rewritten })
      }
    },
  })
  return applyEdits(source, edits)
}

function applyEdits(source: string, edits: { start: number, end: number, replacement: string }[]): string {
  if (!edits.length)
    return source
  edits.sort((a, b) => a.start - b.start)
  let out = ''
  let cursor = 0
  for (const e of edits) {
    out += source.slice(cursor, e.start) + e.replacement
    cursor = e.end
  }
  out += source.slice(cursor)
  return out
}

function rewriteVue(path: string, source: string, map: RenameMap, cwd: string): string {
  let out = source
  const file = parseFile(path, cwd)
  if (file.program && mapIncludesAny(file.scriptSource, map))
    out = rewriteScriptWithin(out, file.scriptStart, file.scriptEnd, file.scriptSource, file.program, map)
  out = rewriteVueTemplateClassAttrs(out, map)
  out = rewriteVueStyleBlocks(out, map)
  return out
}

function rewriteScriptWithin(full: string, start: number, end: number, scriptSource: string, program: any, map: RenameMap): string {
  const rewritten = rewriteStringsInProgram(scriptSource, program, map, 0)
  if (rewritten === scriptSource)
    return full
  return full.slice(0, start) + rewritten + full.slice(end)
}

const TEMPLATE_BLOCK_RE = /<template(?:\s[^>]*)?>([\s\S]*?)<\/template>/gi
const CLASS_ATTR_RE = /\b(:?class)\s*=\s*(["'])([\s\S]*?)\2/g
const NESTED_STRING_RE = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g

function rewriteVueTemplateClassAttrs(source: string, map: RenameMap): string {
  return source.replace(TEMPLATE_BLOCK_RE, (full, body) => {
    const rewrittenBody = body.replace(CLASS_ATTR_RE, (m: string, name: string, quote: string, value: string) => {
      if (!mapIncludesAny(value, map))
        return m
      if (name === 'class') {
        const nv = rewriteClassString(value, map)
        return `${name}=${quote}${nv}${quote}`
      }
      const nv = rewriteDynamicClassExpr(value, map)
      return `${name}=${quote}${nv}${quote}`
    })
    return full.replace(body, rewrittenBody)
  })
}

function rewriteDynamicClassExpr(expr: string, map: RenameMap): string {
  return expr.replace(NESTED_STRING_RE, (m, q, inner) => {
    if (!mapIncludesAny(inner, map))
      return m
    return q + rewriteClassString(inner, map) + q
  })
}

const STYLE_BLOCK_RE = /<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi

function rewriteVueStyleBlocks(source: string, map: RenameMap): string {
  return source.replace(STYLE_BLOCK_RE, (full, body) => {
    if (!mapIncludesAny(body, map))
      return full
    return full.replace(body, rewriteCss(body, map))
  })
}

const APPLY_RE = /(@apply[ \t]+)(\S[^;}\n]*)/g

function rewriteCss(source: string, map: RenameMap): string {
  return source.replace(APPLY_RE, (_m, prefix, tokens) => prefix + rewriteClassString(tokens, map))
}

export function rewriteClassString(input: string, map: RenameMap): string {
  const parts = input.split(DEFAULT_SPLIT_RE)
  let changed = false
  for (let i = 0; i < parts.length; i++) {
    const tok = parts[i]
    if (!tok)
      continue
    const next = rewriteToken(tok, map)
    if (next !== tok) {
      parts[i] = next
      changed = true
    }
  }
  return changed ? parts.join('') : input
}

export function rewriteToken(token: string, map: RenameMap): string {
  let depth = 0
  let lastColon = -1
  for (let i = 0; i < token.length; i++) {
    const c = token[i]
    if (c === '[')
      depth++
    else if (c === ']')
      depth--
    else if (c === ':' && depth === 0)
      lastColon = i
  }
  const prefix = lastColon === -1 ? '' : token.slice(0, lastColon + 1)
  const tail = lastColon === -1 ? token : token.slice(lastColon + 1)
  const bang = tail.startsWith('!') ? '!' : ''
  const bare = bang ? tail.slice(1) : tail
  const replacement = map.get(bare)
  if (replacement === undefined)
    return token
  return prefix + bang + replacement
}
