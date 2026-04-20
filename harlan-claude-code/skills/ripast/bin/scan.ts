import { readFileSync } from 'node:fs'
import process from 'node:process'
import { parseSync } from 'oxc-parser'
import { walk } from 'oxc-walker'
import { parseFile, posToLineCol, rgFiles } from './util.ts'
import { extractTemplateExpressions } from './vue-template.ts'

export interface ScanHit {
  file: string
  line: number
  col: number
  kind: string
  snippet: string
}

export interface ScanOptions {
  cwd?: string
  glob?: string | string[]
  kinds?: string[]
}

export function scan(pattern: string, opts: ScanOptions = {}): ScanHit[] {
  const cwd = opts.cwd ?? process.cwd()
  const files = rgFiles(pattern, { cwd, glob: opts.glob })
  const hits: ScanHit[] = []
  for (const f of files) {
    const file = parseFile(f, cwd)
    const seen = new Set<string>()
    if (file.program) {
      walk(file.program as any, {
        enter(node: any, parent: any) {
          const kind = classify(node, parent, pattern)
          if (!kind)
            return
          if (opts.kinds && !opts.kinds.includes(kind))
            return
          const abs = node.start + file.scriptStart
          const key = `${abs}:${node.end + file.scriptStart}:${kind}`
          if (seen.has(key))
            return
          seen.add(key)
          pushHit(hits, file.rel, file.fullSource, abs, kind)
        },
      })
    }
    if (file.isSfc)
      scanTemplate(f, file.rel, file.fullSource, pattern, opts.kinds, hits, seen)
  }
  return hits
}

function scanTemplate(
  absPath: string,
  rel: string,
  fullSource: string,
  pattern: string,
  kinds: string[] | undefined,
  hits: ScanHit[],
  seen: Set<string>,
): void {
  const source = fullSource || (() => {
    try { return readFileSync(absPath, 'utf8') }
    catch { return '' }
  })()
  if (!source.includes(pattern))
    return
  const exprs = extractTemplateExpressions(source)
  for (const expr of exprs) {
    if (!expr.code.includes(pattern))
      continue
    let program: any
    try { program = parseSync(`${absPath}.expr.ts`, expr.code).program }
    catch { continue }
    if (!program)
      continue
    walk(program, {
      enter(node: any, parent: any) {
        const kind = classify(node, parent, pattern)
        if (!kind)
          return
        if (kinds && !kinds.includes(kind))
          return
        const abs = expr.offsetInSource + node.start
        const key = `${abs}:${expr.offsetInSource + node.end}:${kind}`
        if (seen.has(key))
          return
        seen.add(key)
        pushHit(hits, rel, source, abs, kind)
      },
    })
  }
}

function pushHit(hits: ScanHit[], rel: string, fullSource: string, abs: number, kind: string): void {
  const { line, col } = posToLineCol(fullSource, abs)
  const nl = fullSource.indexOf('\n', abs)
  const snippetEnd = nl === -1 ? fullSource.length : nl
  const lineStart = fullSource.lastIndexOf('\n', abs - 1) + 1
  hits.push({
    file: rel,
    line,
    col,
    kind,
    snippet: fullSource.slice(lineStart, snippetEnd).trim().slice(0, 120),
  })
}

function classify(node: any, parent: any, pattern: string): string | null {
  if (!node)
    return null
  if (node.type === 'Identifier' && node.name === pattern) {
    if (!parent)
      return 'identifier-reference'
    switch (parent.type) {
      case 'ImportSpecifier':
      case 'ImportDefaultSpecifier':
      case 'ImportNamespaceSpecifier':
      case 'ExportSpecifier':
        return 'import-specifier'
      case 'VariableDeclarator':
        return parent.id === node ? 'identifier-binding' : 'identifier-reference'
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ClassDeclaration':
      case 'ClassExpression':
      case 'TSInterfaceDeclaration':
      case 'TSTypeAliasDeclaration':
      case 'TSEnumDeclaration':
        return parent.id === node ? 'identifier-binding' : 'identifier-reference'
      case 'MemberExpression':
      case 'TSQualifiedName':
        if (!parent.computed && parent.property === node)
          return 'member-access'
        return 'identifier-reference'
      case 'Property':
      case 'ObjectProperty':
        if (!parent.computed && parent.key === node && parent.value !== node)
          return 'property'
        return 'identifier-reference'
      case 'LabeledStatement':
      case 'BreakStatement':
      case 'ContinueStatement':
        return 'label'
      default:
        return 'identifier-reference'
    }
  }
  if (node.type === 'JSXIdentifier' && node.name === pattern)
    return 'jsx'
  if (node.type === 'Literal' && typeof node.value === 'string' && node.value.includes(pattern))
    return 'string-literal'
  return null
}

export function formatHits(hits: ScanHit[], json: boolean): string {
  if (json)
    return JSON.stringify(hits, null, 2)
  const byKind: Record<string, number> = {}
  const lines: string[] = []
  for (const h of hits) {
    byKind[h.kind] = (byKind[h.kind] ?? 0) + 1
    lines.push(`${h.file}:${h.line}:${h.col}  ${h.kind.padEnd(22)} ${h.snippet}`)
  }
  lines.push('')
  lines.push(`${hits.length} hits across ${new Set(hits.map(h => h.file)).size} files`)
  for (const [k, n] of Object.entries(byKind).sort((a, b) => b[1] - a[1]))
    lines.push(`  ${k.padEnd(22)} ${n}`)
  return lines.join('\n')
}
