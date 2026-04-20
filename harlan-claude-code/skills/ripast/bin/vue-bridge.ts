import type { FileChange } from './util.ts'
import type { Regression } from './verify.ts'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { URI } from 'vscode-uri'
import { posToLineCol } from './util.ts'
import { rewriteTemplateReferences } from './vue-template.ts'
import { createVueService, workspaceEditToChanges } from './vue.ts'

export function hasVueFiles(cwd: string): boolean {
  const r = spawnSync('rg', ['--files', '--hidden', '--no-messages', '-g', '*.vue', '.'], { cwd, encoding: 'utf8' })
  return !!r.stdout.trim()
}

export function hasVueFilesContaining(cwd: string, pattern: string): boolean {
  const r = spawnSync('rg', ['--files-with-matches', '--hidden', '--no-messages', '--fixed-strings', '-g', '*.vue', pattern, '.'], { cwd, encoding: 'utf8' })
  return !!r.stdout.trim()
}

export interface RenameSite {
  filePath: string
  source: string
  pos: number
}

export async function applyVueRename(
  tsconfigPath: string,
  cwd: string,
  from: string,
  to: string,
  sites: RenameSite[],
): Promise<FileChange[]> {
  const vue = createVueService(tsconfigPath, cwd)
  try {
    const byPath = new Map<string, FileChange>()
    for (const site of sites) {
      const uri = URI.file(resolve(cwd, site.filePath))
      const { line, col } = posToLineCol(site.source, site.pos)
      const edits = await vue.service.getRenameEdits(uri, { line: line - 1, character: col - 1 }, to)
      if (!edits)
        continue
      const vueChanges = workspaceEditToChanges(edits, vue, cwd, fileName => fileName.endsWith('.vue'))
      for (const c of vueChanges) {
        if (byPath.has(c.path))
          continue
        byPath.set(c.path, c)
      }
    }
    // Volar misses Vue template references: component tag usage and pure-template-only
    // identifier refs (used in {{ }} but not in script). Sweep .vue consumers that
    // mention `from` and apply a template-AST post-pass.
    const consumerPaths = new Set<string>(byPath.keys())
    for (const p of listVueFilesContaining(cwd, from)) consumerPaths.add(p)
    for (const path of consumerPaths) {
      const existing = byPath.get(path)
      const before = existing?.before ?? safeReadFile(path)
      if (before === undefined)
        continue
      const baseAfter = existing?.after ?? before
      const rewritten = rewriteTemplateReferences(baseAfter, from, to)
      if (rewritten === baseAfter)
        continue
      byPath.set(path, {
        path,
        rel: existing?.rel ?? relPath(path, cwd),
        before,
        after: rewritten,
      })
    }
    return [...byPath.values()]
  }
  finally { vue.dispose() }
}

function listVueFilesContaining(cwd: string, pattern: string): string[] {
  const r = spawnSync('rg', ['--files-with-matches', '--hidden', '--no-messages', '--fixed-strings', '-g', '*.vue', pattern, '.'], { cwd, encoding: 'utf8' })
  return r.stdout.split('\n').filter(Boolean).map(p => resolve(cwd, p))
}

function safeReadFile(path: string): string | undefined {
  try {
    return readFileSync(path, 'utf8')
  }
  catch {
    return undefined
  }
}

function relPath(fileName: string, cwd: string): string {
  return fileName.startsWith(cwd) ? fileName.slice(cwd.length).replace(/^[/\\]/, '') : fileName
}

export async function applyVueImportRewrite(
  tsconfigPath: string,
  cwd: string,
  fromAbs: string,
  toAbs: string,
): Promise<FileChange[]> {
  const vue = createVueService(tsconfigPath, cwd)
  try {
    const oldUri = URI.file(fromAbs)
    const newUri = URI.file(toAbs)
    const edits = await vue.service.getFileRenameEdits(oldUri, newUri)
    if (!edits)
      return []
    return workspaceEditToChanges(edits, vue, cwd, fileName => fileName.endsWith('.vue'))
  }
  finally { vue.dispose() }
}

export async function vueRegressions(
  tsconfigPath: string,
  cwd: string,
  pendingChanges: FileChange[],
): Promise<Regression[]> {
  const vueFiles = listVueFiles(cwd)
  if (!vueFiles.length)
    return []
  const vue = createVueService(tsconfigPath, cwd)
  try {
    const baselinePairs = await Promise.all(
      vueFiles.map(async file => [file, await collectDiagKeys(vue, file)] as const),
    )
    const baseline = new Map(baselinePairs)
    for (const c of pendingChanges) {
      vue.setSnapshot(c.path, c.after)
    }
    const checkSet = [...new Set<string>([...vueFiles, ...pendingChanges.filter(c => c.path.endsWith('.vue')).map(c => c.path)])]
    const postPairs = await Promise.all(
      checkSet.map(async file => [file, await getDiags(vue, file)] as const),
    )
    const out: Regression[] = []
    for (const [file, post] of postPairs) {
      const before = baseline.get(file) ?? new Set()
      for (const d of post) {
        const key = diagKey(d)
        if (before.has(key))
          continue
        if (d.severity !== 1)
          continue
        out.push({
          file,
          line: d.range.start.line + 1,
          col: d.range.start.character + 1,
          code: typeof d.code === 'number' ? d.code : 0,
          message: typeof d.message === 'string' ? d.message : String(d.message),
        })
      }
    }
    return out
  }
  finally { vue.dispose() }
}

async function collectDiagKeys(vue: ReturnType<typeof createVueService>, fileName: string): Promise<Set<string>> {
  const diags = await getDiags(vue, fileName)
  return new Set(diags.map(diagKey))
}

async function getDiags(vue: ReturnType<typeof createVueService>, fileName: string): Promise<{ range: { start: { line: number, character: number } }, severity?: number, code?: string | number, message: string }[]> {
  const uri = URI.file(fileName)
  return await vue.service.getDiagnostics(uri) as any
}

function diagKey(d: { range: { start: { line: number, character: number } }, code?: string | number, message: string }): string {
  return `${d.range.start.line}:${d.range.start.character}:${d.code ?? ''}:${d.message}`
}

function listVueFiles(cwd: string): string[] {
  const r = spawnSync('rg', ['--files', '--hidden', '--no-messages', '-g', '*.vue', '.'], { cwd, encoding: 'utf8' })
  return r.stdout.split('\n').filter(Boolean).map(p => resolve(cwd, p))
}
