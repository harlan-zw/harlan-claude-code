import type { Identifier, Node } from 'ts-morph'
import type { FileChange } from './util.ts'
import type { Regression } from './verify.ts'
import { readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import process from 'node:process'
import { Project, SyntaxKind } from 'ts-morph'
import { rgFiles } from './util.ts'
import { findRegressions, snapshotDiagnostics } from './verify.ts'
import { applyVueRename, hasVueFilesContaining, vueRegressions } from './vue-bridge.ts'

export interface RenameOptions {
  cwd?: string
  tsconfig?: string
  glob?: string | string[]
  verify?: boolean
  scope?: string
  allowMultiple?: boolean
  vue?: boolean
}

export interface RenameResult {
  changes: FileChange[]
  scanned: number
  regressions: Regression[]
}

const DECLARATION_KINDS = new Set<SyntaxKind>([
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.ClassDeclaration,
  SyntaxKind.InterfaceDeclaration,
  SyntaxKind.TypeAliasDeclaration,
  SyntaxKind.EnumDeclaration,
  SyntaxKind.VariableDeclaration,
])

export async function runRename(from: string, to: string, opts: RenameOptions = {}): Promise<RenameResult> {
  const cwd = opts.cwd ?? process.cwd()
  const tsconfigPath = opts.tsconfig ? resolve(cwd, opts.tsconfig) : findTsconfig(cwd)
  const project = tsconfigPath
    ? new Project({ tsConfigFilePath: tsconfigPath })
    : new Project({ compilerOptions: { allowJs: true } })

  if (!tsconfigPath) {
    const candidateFiles = rgFiles(from, { cwd, glob: opts.glob })
    for (const f of candidateFiles) project.addSourceFileAtPath(f)
  }

  const originals = new Map<string, string>()
  for (const sf of project.getSourceFiles()) originals.set(sf.getFilePath(), sf.getFullText())

  const allDeclarations = findDeclarations(project, from)
  const declarations = opts.scope
    ? allDeclarations.filter(d => d.getSourceFile().getFilePath() === resolve(cwd, opts.scope!))
    : allDeclarations

  if (!declarations.length) {
    if (opts.scope)
      throw new Error(`ripast rename: no declaration of "${from}" in ${opts.scope}`)
    throw new Error(`ripast rename: no declaration of "${from}" found in project`)
  }

  const uniqueFiles = new Set(declarations.map(d => relative(cwd, d.getSourceFile().getFilePath())))
  if (uniqueFiles.size > 1 && !opts.allowMultiple) {
    throw new Error(`ripast rename: "${from}" is declared in multiple files (${[...uniqueFiles].join(', ')}). Pass --scope <file> to pick one, or --all to rename every occurrence.`)
  }

  const verify = opts.verify ?? true
  const baseline = verify ? snapshotDiagnostics(project) : null

  const renameSites = declarations.map((decl) => {
    const sf = decl.getSourceFile()
    return { filePath: sf.getFilePath(), source: sf.getFullText(), pos: decl.getStart() }
  })

  for (const decl of declarations) {
    try {
      (decl as any).rename?.(to)
    }
    catch {}
  }

  const changes: FileChange[] = []
  for (const sf of project.getSourceFiles()) {
    const before = originals.get(sf.getFilePath()) ?? ''
    const after = sf.getFullText()
    if (after !== before) {
      changes.push({
        path: sf.getFilePath(),
        rel: relative(cwd, sf.getFilePath()),
        before,
        after,
      })
    }
  }

  const vueEnabled = opts.vue ?? true
  if (vueEnabled && tsconfigPath && hasVueFilesContaining(cwd, from)) {
    const vueChanges = await applyVueRename(tsconfigPath, cwd, from, to, renameSites)
    for (const vc of vueChanges) {
      if (!changes.some(c => c.path === vc.path))
        changes.push(vc)
    }
  }

  const regressions = baseline ? findRegressions(baseline, project) : []

  if (vueEnabled && verify && tsconfigPath && changes.some(c => c.path.endsWith('.vue'))) {
    const vueRegs = await vueRegressions(tsconfigPath, cwd, changes)
    regressions.push(...vueRegs)
  }

  return { changes, scanned: project.getSourceFiles().length, regressions }
}

function findDeclarations(project: Project, name: string): Identifier[] {
  const out: Identifier[] = []
  const seenSymbols = new Set<unknown>()
  for (const sf of project.getSourceFiles()) {
    for (const id of sf.getDescendantsOfKind(SyntaxKind.Identifier)) {
      if (id.getText() !== name)
        continue
      if (!isDeclarationNameOf(id, id.getParent()))
        continue
      if (!isTopLevelDeclaration(id))
        continue
      const sym = id.getSymbol()
      if (sym && seenSymbols.has(sym))
        continue
      if (sym)
        seenSymbols.add(sym)
      out.push(id)
    }
  }
  return out
}

function isDeclarationNameOf(id: Identifier, parent: Node | undefined): boolean {
  if (!parent)
    return false
  if (!DECLARATION_KINDS.has(parent.getKind()))
    return false
  const nameNode = (parent as any).getNameNode?.() ?? (parent as any).getName?.()
  if (typeof nameNode === 'string')
    return nameNode === id.getText()
  return nameNode === id
}

const NESTED_SCOPE_KINDS = new Set<SyntaxKind>([
  SyntaxKind.Block,
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.FunctionExpression,
  SyntaxKind.ArrowFunction,
  SyntaxKind.MethodDeclaration,
  SyntaxKind.Constructor,
  SyntaxKind.GetAccessor,
  SyntaxKind.SetAccessor,
])

function isTopLevelDeclaration(id: Identifier): boolean {
  const declNode = id.getParent()
  if (!declNode)
    return false
  let n: Node | undefined = declNode.getParent()
  while (n) {
    const k = n.getKind()
    if (k === SyntaxKind.SourceFile)
      return true
    if (NESTED_SCOPE_KINDS.has(k))
      return false
    n = n.getParent()
  }
  return false
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
