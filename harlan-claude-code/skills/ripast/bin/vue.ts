import type { LanguageService, LanguageServiceEnvironment, ProjectContext } from '@volar/language-service'
import type { TypeScriptProjectHost } from '@volar/typescript'
import type { WorkspaceEdit } from 'vscode-languageserver-protocol'
import type { FileChange } from './util.ts'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { createLanguage, createLanguageService, createUriMap, FileType } from '@volar/language-service'
import { createLanguageServiceHost, resolveFileLanguageId } from '@volar/typescript'
import { createParsedCommandLine, createVueLanguagePlugin, getAllExtensions } from '@vue/language-core'
import { createVueLanguageServicePlugins } from '@vue/language-service'
import ts from 'typescript'
import { create as createTypeScriptServicePlugins } from 'volar-service-typescript'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'

export interface VueService {
  service: LanguageService
  fileToUri: (fileName: string) => URI
  uriToFile: (uri: URI) => string
  read: (fileName: string) => string | undefined
  setSnapshot: (fileName: string, text: string) => void
  dispose: () => void
}

export function createVueService(tsconfigPath: string, cwd: string): VueService {
  const commandLine = createParsedCommandLine(ts, ts.sys, tsconfigPath)
  // createParsedCommandLine doesn't add .vue files because it doesn't pass extraFileExtensions.
  // Reparse with the right extensions so commandLine.fileNames includes .vue.
  const vueExts = getAllExtensions(commandLine.vueOptions).map((ext) => {
    const cleanExt = ext.startsWith('.') ? ext.slice(1) : ext
    return { extension: cleanExt, isMixedContent: true, scriptKind: ts.ScriptKind.Deferred }
  })
  const reparsed = ts.parseJsonSourceFileConfigFileContent(
    ts.readJsonConfigFile(tsconfigPath, ts.sys.readFile),
    ts.sys,
    resolve(tsconfigPath, '..'),
    undefined,
    tsconfigPath,
    undefined,
    vueExts,
  )
  commandLine.fileNames = reparsed.fileNames
  if (commandLine.options.allowNonTsExtensions === undefined)
    commandLine.options.allowNonTsExtensions = true

  const fileToUri = (fileName: string): URI => URI.file(resolve(cwd, fileName))
  const uriToFile = (uri: URI): string => uri.fsPath

  const language = createLanguage<URI>(
    [
      createVueLanguagePlugin<URI>(
        ts,
        commandLine.options,
        commandLine.vueOptions,
        uri => uriToFile(uri),
      ),
      { getLanguageId: uri => resolveFileLanguageId(uri.path) },
    ],
    createUriMap(ts.sys.useCaseSensitiveFileNames),
    (uri, includeFsFiles) => {
      if (!includeFsFiles)
        return
      const fileName = uriToFile(uri)
      if (existsSync(fileName) && statSync(fileName).isFile()) {
        const text = readFileSync(fileName, 'utf8')
        language.scripts.set(uri, ts.ScriptSnapshot.fromString(text))
      }
      else {
        language.scripts.delete(uri)
      }
    },
  )

  let projectVersion = 0
  const projectHost: TypeScriptProjectHost = {
    getCurrentDirectory: () => cwd,
    getCompilationSettings: () => commandLine.options,
    getProjectReferences: () => commandLine.projectReferences,
    getScriptFileNames: () => commandLine.fileNames.map(f => resolve(cwd, f)),
    getProjectVersion: () => String(projectVersion),
  }

  const env: LanguageServiceEnvironment = {
    workspaceFolders: [URI.file(cwd)],
    fs: {
      stat(uri) {
        if (uri.scheme !== 'file')
          return undefined
        try {
          const s = statSync(uri.fsPath)
          return {
            type: s.isFile() ? FileType.File : s.isDirectory() ? FileType.Directory : s.isSymbolicLink() ? FileType.SymbolicLink : FileType.Unknown,
            ctime: s.ctimeMs,
            mtime: s.mtimeMs,
            size: s.size,
          }
        }
        catch {
          return undefined
        }
      },
      readFile(uri) {
        if (uri.scheme !== 'file')
          return undefined
        try { return readFileSync(uri.fsPath, 'utf8') }
        catch { return undefined }
      },
      readDirectory() { return [] },
    },
    console: { log() {}, warn() {}, error: process.stderr.write.bind(process.stderr), info() {} } as any,
  }

  const project: ProjectContext = {
    typescript: {
      configFileName: tsconfigPath,
      sys: ts.sys,
      uriConverter: { asFileName: uriToFile, asUri: fileToUri },
      ...createLanguageServiceHost(ts, ts.sys, language, fileToUri, projectHost),
    },
  }

  const plugins = [
    ...createTypeScriptServicePlugins(ts),
    ...createVueLanguageServicePlugins(ts),
  ]
  const service = createLanguageService(language, plugins, env, project)

  return {
    service,
    fileToUri,
    uriToFile,
    read: (fileName: string) => {
      try { return readFileSync(fileName, 'utf8') }
      catch { return undefined }
    },
    setSnapshot: (fileName: string, text: string) => {
      language.scripts.set(URI.file(resolve(cwd, fileName)), ts.ScriptSnapshot.fromString(text))
      projectVersion++
    },
    dispose: () => service.dispose(),
  }
}

export function workspaceEditToChanges(
  edit: WorkspaceEdit,
  vue: VueService,
  cwd: string,
  filter?: (fileName: string) => boolean,
): FileChange[] {
  const out: FileChange[] = []
  const seen = new Set<string>()
  const apply = (uriStr: string, edits: { range: { start: { line: number, character: number }, end: { line: number, character: number } }, newText: string }[]) => {
    const uri = URI.parse(uriStr)
    const fileName = uri.fsPath
    if (filter && !filter(fileName))
      return
    if (seen.has(fileName))
      return
    seen.add(fileName)
    const before = vue.read(fileName)
    if (before === undefined)
      return
    const doc = TextDocument.create(uriStr, 'plaintext', 0, before)
    const after = TextDocument.applyEdits(doc, edits as any)
    if (after === before)
      return
    out.push({
      path: fileName,
      rel: relPath(fileName, cwd),
      before,
      after,
    })
  }
  if (edit.changes) {
    for (const [uriStr, edits] of Object.entries(edit.changes)) {
      apply(uriStr, edits as any)
    }
  }
  if (edit.documentChanges) {
    for (const change of edit.documentChanges) {
      if ('textDocument' in change && 'edits' in change) {
        apply(change.textDocument.uri, change.edits as any)
      }
    }
  }
  return out
}

function relPath(fileName: string, cwd: string): string {
  return fileName.startsWith(cwd) ? fileName.slice(cwd.length).replace(/^[/\\]/, '') : fileName
}
