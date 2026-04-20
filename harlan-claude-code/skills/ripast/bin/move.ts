import type { ImportDeclaration, Node, SourceFile } from 'ts-morph'
import type { FileChange } from './util.ts'
import type { Regression } from './verify.ts'
import { readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import process from 'node:process'
import { Project, SyntaxKind } from 'ts-morph'
import { findRegressions, snapshotDiagnostics } from './verify.ts'
import { applyVueImportRewrite, hasVueFilesContaining, vueRegressions } from './vue-bridge.ts'

export interface MoveOptions {
  cwd?: string
  tsconfig?: string
  verify?: boolean
  vue?: boolean
}

export interface MoveResult {
  changes: FileChange[]
  scanned: number
  regressions: Regression[]
}

const MOVABLE_KINDS = new Set<SyntaxKind>([
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.ClassDeclaration,
  SyntaxKind.InterfaceDeclaration,
  SyntaxKind.TypeAliasDeclaration,
  SyntaxKind.EnumDeclaration,
])

export async function runMove(symbol: string, fromPath: string, toPath: string, opts: MoveOptions = {}): Promise<MoveResult> {
  const cwd = opts.cwd ?? process.cwd()
  const tsconfigPath = opts.tsconfig ? resolve(cwd, opts.tsconfig) : findTsconfig(cwd)
  const project = tsconfigPath
    ? new Project({ tsConfigFilePath: tsconfigPath })
    : new Project({ compilerOptions: { allowJs: true } })

  const fromAbs = resolve(cwd, fromPath)
  const toAbs = resolve(cwd, toPath)

  let fromSF = project.getSourceFile(fromAbs)
  if (!fromSF)
    fromSF = project.addSourceFileAtPath(fromAbs)

  let toSF = project.getSourceFile(toAbs)
  if (!toSF)
    toSF = project.createSourceFile(toAbs, '', { overwrite: false })

  splitMultiDeclaratorIfNeeded(fromSF, symbol)

  const decl = findNamedExport(fromSF, symbol)
  if (!decl)
    throw new Error(`ripast move: no top-level export named "${symbol}" in ${fromPath} (supported: function, class, interface, type, enum, const with single declarator)`)

  const localDeps = findLocalSiblingDeps(decl, fromSF, symbol)
  if (localDeps.nonExported.length) {
    throw new Error(
      `ripast move: "${symbol}" depends on local non-exported symbol(s) [${localDeps.nonExported.join(', ')}] in ${fromPath}. `
      + `Export them first, or move them together.`,
    )
  }

  const originals = new Map<string, string>()
  for (const sf of project.getSourceFiles()) originals.set(sf.getFilePath(), sf.getFullText())

  const verify = opts.verify ?? true
  const baseline = verify ? snapshotDiagnostics(project) : null

  const usedImports = collectUsedImports(decl, fromSF, symbol)
  const declText = getDeclarationFullText(decl)
  const remainingReferences = countReferencesOutside(fromSF, symbol, decl)

  for (const { moduleSpecifier, namedImports, defaultImport, namespaceImport } of usedImports) {
    addOrMergeImport(toSF, moduleSpecifier, { namedImports, defaultImport, namespaceImport })
  }

  if (localDeps.exported.length) {
    const spec = computeSpecifier(toAbs, fromAbs, './placeholder.ts')
    addOrMergeImport(toSF, spec, { namedImports: localDeps.exported.map(name => ({ name })) })
  }

  toSF.insertStatements(toSF.getStatements().length, declText.trim())

  for (const sf of project.getSourceFiles()) {
    if (sf === fromSF || sf === toSF)
      continue
    rewriteImportSites(sf, fromAbs, toAbs, symbol)
  }

  ;(decl as any).remove?.()
  pruneUnusedImports(fromSF)

  if (remainingReferences > 0) {
    const newSpec = computeSpecifier(fromSF.getFilePath(), toAbs, './placeholder.ts')
    addOrMergeImport(fromSF, newSpec, { namedImports: [{ name: symbol }] })
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
  const fromBasename = fromPath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? ''
  if (vueEnabled && tsconfigPath && fromBasename && hasVueFilesContaining(cwd, fromBasename)) {
    const vueChanges = await applyVueImportRewrite(tsconfigPath, cwd, fromAbs, toAbs)
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

function findNamedExport(sf: SourceFile, symbol: string): Node | null {
  for (const stmt of sf.getStatements()) {
    const kind = stmt.getKind()
    if (kind === SyntaxKind.VariableStatement) {
      const vs = stmt.asKindOrThrow(SyntaxKind.VariableStatement)
      if (!vs.hasExportKeyword())
        continue
      const decls = vs.getDeclarationList().getDeclarations()
      if (decls.length !== 1)
        continue
      if (decls[0].getName() === symbol)
        return vs
      continue
    }
    if (!MOVABLE_KINDS.has(kind))
      continue
    const named = stmt as Node & { hasExportKeyword?: () => boolean, hasDefaultKeyword?: () => boolean, getName?: () => string | undefined }
    if (!named.hasExportKeyword?.())
      continue
    if (named.hasDefaultKeyword?.())
      continue
    if (named.getName?.() === symbol)
      return stmt
  }
  return null
}

function getDeclarationFullText(decl: Node): string {
  const leading = decl.getLeadingCommentRanges()
  if (!leading.length)
    return decl.getText()
  const start = leading[0].getPos()
  return decl.getSourceFile().getFullText().slice(start, decl.getEnd())
}

function countReferencesOutside(sf: SourceFile, symbol: string, decl: Node): number {
  const declStart = decl.getStart(true)
  const declEnd = decl.getEnd()
  let count = 0
  sf.forEachDescendant((n) => {
    if (n.getKind() !== SyntaxKind.Identifier)
      return
    if (n.getText() !== symbol)
      return
    const p = n.getParent()
    if (p?.getKind() === SyntaxKind.ImportSpecifier || p?.getKind() === SyntaxKind.ImportClause)
      return
    const pos = n.getStart()
    if (pos >= declStart && pos < declEnd)
      return
    count++
  })
  return count
}

interface CollectedImport {
  moduleSpecifier: string
  namedImports: { name: string, alias?: string }[]
  defaultImport?: string
  namespaceImport?: string
}

function collectUsedImports(decl: Node, fromSF: SourceFile, selfName: string): CollectedImport[] {
  const referenced = new Set<string>()
  decl.forEachDescendant((n) => {
    if (n.getKind() === SyntaxKind.Identifier) {
      const name = n.getText()
      if (name !== selfName)
        referenced.add(name)
    }
  })

  const result: CollectedImport[] = []
  for (const imp of fromSF.getImportDeclarations()) {
    const names: { name: string, alias?: string }[] = []
    for (const ni of imp.getNamedImports()) {
      const local = ni.getAliasNode()?.getText() ?? ni.getName()
      if (referenced.has(local))
        names.push({ name: ni.getName(), alias: ni.getAliasNode()?.getText() })
    }
    const defaultImport = imp.getDefaultImport()
    const defaultName = defaultImport && referenced.has(defaultImport.getText()) ? defaultImport.getText() : undefined
    const ns = imp.getNamespaceImport()
    const nsName = ns && referenced.has(ns.getText()) ? ns.getText() : undefined
    if (names.length || defaultName || nsName) {
      result.push({ moduleSpecifier: imp.getModuleSpecifierValue(), namedImports: names, defaultImport: defaultName, namespaceImport: nsName })
    }
  }
  return result
}

function addOrMergeImport(sf: SourceFile, moduleSpecifier: string, spec: { namedImports: { name: string, alias?: string }[], defaultImport?: string, namespaceImport?: string }) {
  const existing = sf.getImportDeclarations().find(i => i.getModuleSpecifierValue() === moduleSpecifier)
  if (existing) {
    const have = new Set(existing.getNamedImports().map(ni => ni.getName()))
    for (const ni of spec.namedImports) {
      if (!have.has(ni.name))
        existing.addNamedImport({ name: ni.name, alias: ni.alias })
    }
    if (spec.defaultImport && !existing.getDefaultImport())
      existing.setDefaultImport(spec.defaultImport)
    if (spec.namespaceImport && !existing.getNamespaceImport())
      existing.setNamespaceImport(spec.namespaceImport)
    return
  }
  sf.addImportDeclaration({
    moduleSpecifier,
    namedImports: spec.namedImports,
    defaultImport: spec.defaultImport,
    namespaceImport: spec.namespaceImport,
  })
}

function pruneUnusedImports(sf: SourceFile): void {
  const used = new Set<string>()
  sf.forEachDescendant((n) => {
    if (n.getKind() === SyntaxKind.Identifier) {
      const p = n.getParent()
      const pk = p?.getKind()
      if (pk === SyntaxKind.ImportSpecifier || pk === SyntaxKind.ImportClause || pk === SyntaxKind.NamespaceImport)
        return
      used.add(n.getText())
    }
  })
  for (const imp of sf.getImportDeclarations()) {
    for (const ni of imp.getNamedImports()) {
      const local = ni.getAliasNode()?.getText() ?? ni.getName()
      if (!used.has(local))
        ni.remove()
    }
    const def = imp.getDefaultImport()
    if (def && !used.has(def.getText()))
      imp.removeDefaultImport()
    const ns = imp.getNamespaceImport()
    if (ns && !used.has(ns.getText()))
      imp.removeNamespaceImport()
    if (imp.getNamedImports().length === 0 && !imp.getDefaultImport() && !imp.getNamespaceImport())
      imp.remove()
  }
}

function rewriteImportSites(sf: SourceFile, fromAbs: string, toAbs: string, symbol: string): void {
  const imports: ImportDeclaration[] = sf.getImportDeclarations()
  for (const imp of imports) {
    const resolved = imp.getModuleSpecifierSourceFile()
    if (!resolved || resolved.getFilePath() !== fromAbs)
      continue
    const namedImports = imp.getNamedImports()
    const match = namedImports.find(ni => ni.getName() === symbol)
    const def = imp.getDefaultImport()
    if (!match && def?.getText() !== symbol)
      continue
    const alias = match?.getAliasNode()?.getText()
    if (match)
      match.remove()
    if (!match && def?.getText() === symbol)
      imp.removeDefaultImport()
    const oldSpec = imp.getModuleSpecifierValue()
    const newSpec = computeSpecifier(sf.getFilePath(), toAbs, oldSpec)
    const existing = sf.getImportDeclarations().find(i => i.getModuleSpecifierValue() === newSpec && i !== imp)
    if (existing) {
      existing.addNamedImport({ name: symbol, alias })
    }
    else {
      sf.addImportDeclaration({ moduleSpecifier: newSpec, namedImports: [{ name: symbol, alias }] })
    }
    if (imp.getNamedImports().length === 0 && !imp.getDefaultImport() && !imp.getNamespaceImport())
      imp.remove()
  }
}

const MODULE_EXT_RE = /\.(?:tsx?|jsx?|mts|cts|mjs|cjs)$/
const WIN_SEP_RE = /\\/g

function computeSpecifier(fromFilePath: string, toFilePath: string, oldSpec: string): string {
  const hasExt = MODULE_EXT_RE.test(oldSpec)
  let rel = relative(dirname(fromFilePath), toFilePath).replace(WIN_SEP_RE, '/')
  if (!hasExt)
    rel = rel.replace(MODULE_EXT_RE, '')
  if (!rel.startsWith('.'))
    rel = `./${rel}`
  return rel
}

function splitMultiDeclaratorIfNeeded(sf: SourceFile, symbol: string): void {
  for (const vs of sf.getVariableStatements()) {
    if (!vs.hasExportKeyword())
      continue
    const decls = vs.getDeclarationList().getDeclarations()
    if (decls.length < 2)
      continue
    if (!decls.some(d => d.getName() === symbol))
      continue
    const kind = vs.getDeclarationList().getDeclarationKind()
    const lines = decls.map((d) => {
      const name = d.getName()
      const typeNode = d.getTypeNode()?.getText()
      const initializer = d.getInitializer()?.getText()
      const typeAnno = typeNode ? `: ${typeNode}` : ''
      const init = initializer !== undefined ? ` = ${initializer}` : ''
      return `export ${kind} ${name}${typeAnno}${init}`
    })
    const idx = vs.getChildIndex()
    vs.remove()
    sf.insertStatements(idx, lines)
    return
  }
}

interface LocalSiblingDeps {
  nonExported: string[]
  exported: string[]
}

function findLocalSiblingDeps(decl: Node, fromSF: SourceFile, selfName: string): LocalSiblingDeps {
  const nonExported: string[] = []
  const exported: string[] = []
  const seen = new Set<string>()
  decl.forEachDescendant((n) => {
    if (n.getKind() !== SyntaxKind.Identifier)
      return
    const name = n.getText()
    if (name === selfName || seen.has(name))
      return
    const parent = n.getParent()
    if (!parent)
      return
    const pk = parent.getKind()
    if (pk === SyntaxKind.ImportSpecifier || pk === SyntaxKind.ImportClause || pk === SyntaxKind.NamespaceImport)
      return
    if (pk === SyntaxKind.PropertyAssignment || pk === SyntaxKind.ShorthandPropertyAssignment || pk === SyntaxKind.PropertyDeclaration || pk === SyntaxKind.MethodDeclaration || pk === SyntaxKind.MethodSignature || pk === SyntaxKind.PropertySignature)
      return
    if (pk === SyntaxKind.PropertyAccessExpression) {
      const pa = parent as any
      if (pa.getNameNode?.() === n)
        return
    }
    if (pk === SyntaxKind.QualifiedName) {
      const qn = parent as any
      if (qn.getRight?.() === n)
        return
    }
    const sym = (n as any).getSymbol?.()
    if (!sym)
      return
    const declarations: Node[] = sym.getDeclarations?.() ?? []
    if (!declarations.length)
      return
    let siblingNonExported = false
    let siblingExported = false
    for (const d of declarations) {
      const dk = d.getKind()
      if (dk === SyntaxKind.ImportSpecifier || dk === SyntaxKind.ImportClause || dk === SyntaxKind.NamespaceImport || dk === SyntaxKind.NamedImports || dk === SyntaxKind.ImportEqualsDeclaration)
        return
      if (d.getSourceFile() !== fromSF)
        return
      let s: Node | undefined = d
      while (s && s.getParent() && s.getParent() !== fromSF) s = s.getParent()
      if (!s)
        return
      if (s === decl)
        return
      const hasExport = (s as any).hasExportKeyword?.() ?? false
      if (hasExport)
        siblingExported = true
      else
        siblingNonExported = true
    }
    if (siblingNonExported) {
      seen.add(name)
      nonExported.push(name)
    }
    else if (siblingExported) {
      seen.add(name)
      exported.push(name)
    }
  })
  return { nonExported, exported }
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
