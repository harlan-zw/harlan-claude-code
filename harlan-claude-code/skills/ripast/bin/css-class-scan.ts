import { readFileSync } from 'node:fs'
import process from 'node:process'
import { walk } from 'oxc-walker'
import { parseFile, rgFiles } from './util.ts'

export interface CssClassScanOptions {
  cwd?: string
  glob?: string | string[]
  pattern?: string[]
}

export interface CssClassScanHit {
  token: string
  count: number
  files: string[]
}

const DEFAULT_SPLIT_RE = /([\\:]?[\s'"`;{}]+)/g
const CSS_EXTS = ['.css', '.scss', '.sass', '.less', '.postcss', '.pcss']
const CODE_EXTS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']

export function runCssClassScan(opts: CssClassScanOptions = {}): CssClassScanHit[] {
  const cwd = opts.cwd ?? process.cwd()
  const glob = opts.glob ?? [...CODE_EXTS, '.vue', ...CSS_EXTS].map(e => `*${e}`)
  const match = compileGlobs(opts.pattern)
  const files = rgFiles('', { cwd, glob, fixedStrings: false, listAll: true })
  const counts = new Map<string, { count: number, files: Set<string> }>()
  for (const abs of files) {
    const source = safeRead(abs)
    if (source == null)
      continue
    const rel = abs.slice(cwd.length + 1)
    const seen = new Map<string, number>()
    const onToken = (bare: string): void => {
      if (!match(bare))
        return
      seen.set(bare, (seen.get(bare) ?? 0) + 1)
    }
    if (abs.endsWith('.vue'))
      collectVue(abs, source, cwd, onToken)
    else if (CSS_EXTS.some(e => abs.endsWith(e)))
      collectCss(source, onToken)
    else
      collectScript(abs, source, cwd, onToken)
    for (const [tok, n] of seen) {
      const entry = counts.get(tok) ?? { count: 0, files: new Set<string>() }
      entry.count += n
      entry.files.add(rel)
      counts.set(tok, entry)
    }
  }
  const hits: CssClassScanHit[] = Array.from(counts, ([token, v]) => ({
    token,
    count: v.count,
    files: [...v.files].sort(),
  }))
  hits.sort((a, b) => b.count - a.count || (a.token < b.token ? -1 : 1))
  return hits
}

function safeRead(path: string): string | null {
  try {
    return readFileSync(path, 'utf8')
  }
  catch {
    return null
  }
}

function compileGlobs(patterns: string[] | undefined): (s: string) => boolean {
  if (!patterns || !patterns.length)
    return () => true
  const matchers = patterns.map((p) => {
    if (!p.includes('*'))
      return (s: string) => s === p
    const re = new RegExp(`^${p.split('*').map(escapeRe).join('.*')}$`)
    return (s: string) => re.test(s)
  })
  return s => matchers.some(m => m(s))
}

const RE_META_RE = /[.+?^${}()|[\]\\]/g

function escapeRe(s: string): string {
  return s.replace(RE_META_RE, '\\$&')
}

const NUMERIC_RE = /^[\d.-]+$/
const TOKEN_SHAPE_RE = /^[\w-]+(?:\[[^\]]*\])?(?:\/[\w.-]+)?$/

function collectScript(path: string, source: string, cwd: string, onToken: (bare: string) => void): void {
  const file = parseFile(path, cwd)
  if (!file.program)
    return
  visitProgramStrings(file.program, (text) => {
    tokenizeAndEmit(text, onToken)
  })
}

function visitProgramStrings(program: any, visit: (text: string) => void): void {
  walk(program, {
    enter(node: any) {
      if (node.type === 'Literal' && typeof node.value === 'string')
        visit(node.value)
      else if (node.type === 'TemplateElement' && typeof node.value?.raw === 'string')
        visit(node.value.raw)
    },
  })
}

function collectVue(path: string, source: string, cwd: string, onToken: (bare: string) => void): void {
  const file = parseFile(path, cwd)
  if (file.program)
    visitProgramStrings(file.program, text => tokenizeAndEmit(text, onToken))
  visitVueTemplateClassAttrs(source, text => tokenizeAndEmit(text, onToken))
  visitVueStyleBlocks(source, body => collectCss(body, onToken))
}

const TEMPLATE_BLOCK_RE = /<template(?:\s[^>]*)?>([\s\S]*?)<\/template>/gi
const CLASS_ATTR_RE = /\b(:?class)\s*=\s*(["'])([\s\S]*?)\2/g
const NESTED_STRING_RE = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g
const STYLE_BLOCK_RE = /<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi
const APPLY_RE = /@apply[ \t]+(\S[^;}\n]*)/g

function visitVueTemplateClassAttrs(source: string, visit: (text: string) => void): void {
  for (const tmpl of source.matchAll(TEMPLATE_BLOCK_RE)) {
    const body = tmpl[1]
    for (const m of body.matchAll(CLASS_ATTR_RE)) {
      const name = m[1]
      const value = m[3]
      if (name === 'class') {
        visit(value)
      }
      else {
        for (const s of value.matchAll(NESTED_STRING_RE))
          visit(s[2])
      }
    }
  }
}

function visitVueStyleBlocks(source: string, visit: (body: string) => void): void {
  for (const m of source.matchAll(STYLE_BLOCK_RE)) visit(m[1])
}

function collectCss(source: string, onToken: (bare: string) => void): void {
  for (const m of source.matchAll(APPLY_RE)) tokenizeAndEmit(m[1], onToken)
}

function tokenizeAndEmit(text: string, onToken: (bare: string) => void): void {
  const parts = text.split(DEFAULT_SPLIT_RE)
  for (let i = 0; i < parts.length; i += 2) {
    const tok = parts[i]
    if (!tok)
      continue
    const bare = bareToken(tok)
    if (bare)
      onToken(bare)
  }
}

function bareToken(token: string): string | null {
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
  const tail = lastColon === -1 ? token : token.slice(lastColon + 1)
  const bare = tail.startsWith('!') ? tail.slice(1) : tail
  if (!bare || NUMERIC_RE.test(bare))
    return null
  if (!TOKEN_SHAPE_RE.test(bare))
    return null
  return bare
}

export function formatScanHits(hits: CssClassScanHit[], json: boolean): string {
  if (json)
    return JSON.stringify(hits, null, 2)
  if (!hits.length)
    return 'no class tokens found'
  const width = Math.max(...hits.map(h => h.token.length))
  const lines: string[] = []
  for (const h of hits)
    lines.push(`${h.token.padEnd(width)}  ${String(h.count).padStart(5)}  (${h.files.length} file${h.files.length === 1 ? '' : 's'})`)
  lines.push('')
  lines.push(`${hits.length} unique tokens across ${new Set(hits.flatMap(h => h.files)).size} files`)
  return lines.join('\n')
}
