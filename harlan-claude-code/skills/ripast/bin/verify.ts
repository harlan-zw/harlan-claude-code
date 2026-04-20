import type { Diagnostic, Project } from 'ts-morph'
import { relative } from 'node:path'

export interface Regression {
  file: string
  line: number
  col: number
  code: number
  message: string
}

export interface DiagnosticSnapshot {
  counts: Map<string, number>
}

export function snapshotDiagnostics(project: Project): DiagnosticSnapshot {
  const counts = new Map<string, number>()
  for (const d of project.getPreEmitDiagnostics()) {
    const k = diagnosticKey(d)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return { counts }
}

export function findRegressions(before: DiagnosticSnapshot, project: Project): Regression[] {
  const current = project.getPreEmitDiagnostics()
  const seen = new Map<string, number>()
  const out: Regression[] = []
  for (const d of current) {
    const k = diagnosticKey(d)
    const beforeN = before.counts.get(k) ?? 0
    const curN = (seen.get(k) ?? 0) + 1
    seen.set(k, curN)
    if (curN <= beforeN)
      continue
    const sf = d.getSourceFile()
    if (!sf)
      continue
    const { line, column } = sf.getLineAndColumnAtPos(d.getStart() ?? 0)
    out.push({
      file: sf.getFilePath(),
      line,
      col: column,
      code: d.getCode(),
      message: flattenMessage(d.getMessageText()),
    })
  }
  return out
}

function diagnosticKey(d: Diagnostic): string {
  const sf = d.getSourceFile()
  const file = sf ? sf.getFilePath() : '<no-file>'
  return `${file}::${d.getCode()}::${flattenMessage(d.getMessageText())}`
}

function flattenMessage(msg: any): string {
  if (typeof msg === 'string')
    return msg
  if (msg == null)
    return ''
  const chain = typeof msg.getMessageText === 'function' ? msg : null
  if (chain) {
    const parts: string[] = [chain.getMessageText()]
    const next = chain.getNext?.() ?? []
    for (const c of Array.isArray(next) ? next : [next]) {
      parts.push(flattenMessage(c))
    }
    return parts.filter(Boolean).join(' | ')
  }
  return String(msg)
}

export function formatRegressions(regressions: Regression[], cwd: string): string {
  const lines = [`${regressions.length} new type diagnostic${regressions.length === 1 ? '' : 's'} introduced:`]
  for (const r of regressions) {
    lines.push(`  ${relative(cwd, r.file)}:${r.line}:${r.col} TS${r.code} ${r.message}`)
  }
  return lines.join('\n')
}
