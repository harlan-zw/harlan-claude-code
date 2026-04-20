import { parse as parseSfc } from '@vue/compiler-sfc'
import { parseSync } from 'oxc-parser'
import { walk } from 'oxc-walker'

export interface TemplateExpression {
  code: string
  offsetInSource: number
}

const NODE_INTERPOLATION = 5
const NODE_DIRECTIVE = 7
const NODE_ELEMENT = 1
const NODE_SIMPLE_EXPRESSION = 4
const NODE_COMPOUND_EXPRESSION = 8

function hyphenate(s: string): string {
  return s.replace(/\B([A-Z])/g, '-$1').toLowerCase()
}

interface Edit { start: number, end: number, replacement: string }

export function rewriteTemplateReferences(source: string, oldName: string, newName: string): string {
  let descriptor: any
  try { descriptor = parseSfc(source).descriptor }
  catch { return source }
  const tmpl = descriptor.template
  if (!tmpl?.ast)
    return source
  const isComponentName = /^[A-Z]/.test(oldName)
  const oldKebab = hyphenate(oldName)
  const newKebab = hyphenate(newName)
  const edits: Edit[] = []

  function rewriteTag(node: any, oldTag: string, newTag: string): void {
    const elStart = node.loc.start.offset
    const elSource = node.loc.source as string
    const openTagStart = elStart + 1
    const openTagEnd = openTagStart + oldTag.length
    if (source.slice(openTagStart, openTagEnd) === oldTag)
      edits.push({ start: openTagStart, end: openTagEnd, replacement: newTag })
    if (!node.isSelfClosing) {
      const closeMarker = `</${oldTag}`
      const closeIdx = elSource.lastIndexOf(closeMarker)
      if (closeIdx >= 0) {
        const after = elSource.charAt(closeIdx + closeMarker.length)
        if (after === '' || /[\s>]/.test(after)) {
          const closeStart = elStart + closeIdx + 2
          const closeEnd = closeStart + oldTag.length
          if (source.slice(closeStart, closeEnd) === oldTag)
            edits.push({ start: closeStart, end: closeEnd, replacement: newTag })
        }
      }
    }
  }

  function collectVForBindings(forParseResult: any, out: string[]): void {
    if (!forParseResult)
      return
    for (const key of ['value', 'key', 'index']) {
      const v = forParseResult[key]
      if (typeof v?.content !== 'string')
        continue
      const m = v.content.match(/[A-Z_$][\w$]*/gi)
      if (m) {
        for (const id of m) out.push(id)
      }
    }
  }

  function visitExpression(expr: any, scopes: string[][]): void {
    if (!expr)
      return
    if (expr.type === NODE_COMPOUND_EXPRESSION) {
      for (const c of expr.children ?? []) {
        if (c && typeof c === 'object')
          visitExpression(c, scopes)
      }
      return
    }
    if (expr.type !== NODE_SIMPLE_EXPRESSION)
      return
    if (typeof expr.content !== 'string' || !expr.content.includes(oldName))
      return
    const exprStartInSource = expr.loc?.start?.offset
    if (exprStartInSource === undefined)
      return
    let program: any
    try { program = parseSync('expr.ts', expr.content).program }
    catch { return }
    if (!program)
      return
    walk(program, {
      enter(n: any, parent: any) {
        if (n.type !== 'Identifier' || n.name !== oldName)
          return
        if (parent) {
          if (parent.type === 'MemberExpression' && !parent.computed && parent.property === n)
            return
          if ((parent.type === 'Property' || parent.type === 'ObjectProperty') && !parent.computed && parent.key === n && parent.value !== n)
            return
          if (parent.type === 'ImportSpecifier')
            return
        }
        if (scopes.some(s => s.includes(oldName)))
          return
        const start = exprStartInSource + n.start
        const end = exprStartInSource + n.end
        if (source.slice(start, end) !== oldName)
          return
        edits.push({ start, end, replacement: newName })
      },
    })
  }

  function visit(node: any, scopes: string[][]): void {
    if (!node || typeof node !== 'object')
      return
    if (node.type === NODE_ELEMENT) {
      const vfor = (node.props ?? []).find((p: any) => p.type === NODE_DIRECTIVE && p.name === 'for')
      const newScope: string[] = []
      if (vfor?.forParseResult)
        collectVForBindings(vfor.forParseResult, newScope)
      const innerScopes = newScope.length ? [...scopes, newScope] : scopes

      if (isComponentName) {
        if (node.tag === oldName)
          rewriteTag(node, oldName, newName)
        else if (oldKebab !== oldName && node.tag === oldKebab)
          rewriteTag(node, oldKebab, newKebab)
      }

      for (const prop of node.props ?? []) {
        if (prop === vfor) {
          if (vfor.forParseResult?.source)
            visitExpression(vfor.forParseResult.source, innerScopes)
          continue
        }
        visit(prop, innerScopes)
      }
      for (const c of node.children ?? []) visit(c, innerScopes)
      return
    }
    if (node.type === NODE_INTERPOLATION) {
      visitExpression(node.content, scopes)
      return
    }
    if (node.type === NODE_DIRECTIVE) {
      if (node.exp)
        visitExpression(node.exp, scopes)
      if (node.arg && node.arg.isStatic === false)
        visitExpression(node.arg, scopes)
      return
    }
    if (node.type === NODE_SIMPLE_EXPRESSION) {
      visitExpression(node, scopes)
      return
    }
    if (node.type === NODE_COMPOUND_EXPRESSION) {
      for (const c of node.children ?? []) visit(c, scopes)
      return
    }
    for (const c of node.children ?? []) visit(c, scopes)
  }

  visit(tmpl.ast, [])

  if (!edits.length)
    return source
  edits.sort((a, b) => a.start - b.start)
  let out = ''
  let cursor = 0
  for (const e of edits) {
    if (e.start < cursor)
      continue
    out += source.slice(cursor, e.start) + e.replacement
    cursor = e.end
  }
  out += source.slice(cursor)
  return out
}

export function extractTemplateExpressions(source: string): TemplateExpression[] {
  let descriptor: any
  try {
    descriptor = parseSfc(source).descriptor
  }
  catch {
    return []
  }
  const tmpl = descriptor.template
  if (!tmpl?.ast)
    return []
  const templateOffset = tmpl.loc.start.offset
  const out: TemplateExpression[] = []
  visit(tmpl.ast, out, templateOffset)
  return out
}

function visit(node: any, out: TemplateExpression[], templateOffset: number): void {
  if (!node || typeof node !== 'object')
    return
  if (node.type === NODE_SIMPLE_EXPRESSION) {
    if (typeof node.content === 'string' && node.content.trim() && node.loc?.start?.offset !== undefined) {
      out.push({ code: node.content, offsetInSource: templateOffset + node.loc.start.offset })
    }
    return
  }
  if (node.type === NODE_COMPOUND_EXPRESSION) {
    for (const c of node.children ?? []) visit(c, out, templateOffset)
    return
  }
  if (node.type === NODE_INTERPOLATION) {
    visit(node.content, out, templateOffset)
    return
  }
  if (node.type === NODE_DIRECTIVE) {
    if (node.exp)
      visit(node.exp, out, templateOffset)
    if (node.arg)
      visit(node.arg, out, templateOffset)
    return
  }
  if (node.type === NODE_ELEMENT) {
    for (const prop of node.props ?? []) visit(prop, out, templateOffset)
    for (const c of node.children ?? []) visit(c, out, templateOffset)
    return
  }
  for (const c of node.children ?? []) visit(c, out, templateOffset)
}
