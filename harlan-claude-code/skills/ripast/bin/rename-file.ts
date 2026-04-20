import type { FileChange } from './util.ts'
import type { Regression } from './verify.ts'
import { existsSync, readFileSync } from 'node:fs'
import { extname, relative, resolve } from 'node:path'
import process from 'node:process'
import { URI } from 'vscode-uri'
import { vueRegressions } from './vue-bridge.ts'
import { createVueService, workspaceEditToChanges } from './vue.ts'

export interface RenameFileOptions {
  cwd?: string
  tsconfig?: string
  verify?: boolean
}

export interface RenameFileResult {
  changes: FileChange[]
  fileMove: { from: string, to: string }
  scanned: number
  regressions: Regression[]
}

export async function runRenameFile(oldPath: string, newPath: string, opts: RenameFileOptions = {}): Promise<RenameFileResult> {
  const cwd = opts.cwd ?? process.cwd()
  const oldAbs = resolve(cwd, oldPath)
  const inferredNewPath = extname(newPath) ? newPath : `${newPath}${extname(oldPath)}`
  const newAbs = resolve(cwd, inferredNewPath)

  if (!existsSync(oldAbs))
    throw new Error(`ripast rename-file: source "${oldPath}" does not exist`)
  if (existsSync(newAbs))
    throw new Error(`ripast rename-file: target "${newPath}" already exists`)

  const tsconfigPath = opts.tsconfig ? resolve(cwd, opts.tsconfig) : findTsconfig(cwd)
  if (!tsconfigPath)
    throw new Error('ripast rename-file: no tsconfig.json found; required for cross-file import rewriting')

  const vue = createVueService(tsconfigPath, cwd)
  let consumerNoSelf: FileChange[]
  try {
    const edits = await vue.service.getFileRenameEdits(URI.file(oldAbs), URI.file(newAbs))
    const consumerChanges = edits ? workspaceEditToChanges(edits, vue, cwd) : []
    consumerNoSelf = consumerChanges.filter(c => c.path !== oldAbs && c.path !== newAbs)
  }
  finally { vue.dispose() }

  const verify = opts.verify ?? true
  const regressions = verify && consumerNoSelf.some(c => c.path.endsWith('.vue'))
    ? await vueRegressions(tsconfigPath, cwd, consumerNoSelf)
    : []

  return {
    changes: consumerNoSelf,
    fileMove: { from: oldAbs, to: newAbs },
    scanned: consumerNoSelf.length + 1,
    regressions,
  }
}

function findTsconfig(cwd: string): string | null {
  const tries = ['tsconfig.json', 'tsconfig.build.json']
  for (const t of tries) {
    try {
      readFileSync(resolve(cwd, t))
      return resolve(cwd, t)
    }
    catch {}
  }
  return null
}
