import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { it } from 'vitest'
import { runMove } from '../move.ts'
import { runRename } from '../rename.ts'
import { writeChanges } from '../util.ts'

function makeMonorepo(): { dir: string, read: (rel: string) => string, cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'ripast-monorepo-'))
  const write = (rel: string, content: string): void => {
    const abs = join(dir, rel)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content)
  }
  const rootTsconfig = {
    references: [{ path: './packages/core' }, { path: './packages/app' }],
    files: [],
  }
  const coreTsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      allowImportingTsExtensions: true,
      noEmit: true,
      composite: true,
      rootDir: './src',
    },
    include: ['src/**/*.ts'],
  }
  const appTsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      allowImportingTsExtensions: true,
      noEmit: true,
      composite: true,
      rootDir: './src',
    },
    include: ['src/**/*.ts'],
    references: [{ path: '../core' }],
  }
  write('tsconfig.json', JSON.stringify(rootTsconfig, null, 2))
  write('pnpm-workspace.yaml', 'packages:\n  - \'packages/*\'\n')
  write('packages/core/tsconfig.json', JSON.stringify(coreTsconfig, null, 2))
  write('packages/app/tsconfig.json', JSON.stringify(appTsconfig, null, 2))
  write('packages/core/src/log.ts', 'export function log(msg: string) { return msg }\n')
  write('packages/app/src/main.ts', 'import { log } from \'../../core/src/log.ts\'\nexport const out = log(\'hi\')\n')
  return {
    dir,
    read: (rel: string) => readFileSync(join(dir, rel), 'utf8'),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  }
}

it('rename crosses package boundaries in a pnpm-workspace monorepo', async () => {
  const fx = makeMonorepo()
  try {
    const r = await runRename('log', 'writeLog', {
      cwd: fx.dir,
      tsconfig: 'packages/app/tsconfig.json',
      verify: false,
      allowMultiple: true,
    })
    writeChanges(r.changes)
    assert.match(fx.read('packages/core/src/log.ts'), /export function writeLog/)
    assert.match(fx.read('packages/app/src/main.ts'), /import \{ writeLog \}/)
    assert.match(fx.read('packages/app/src/main.ts'), /writeLog\(['"]hi['"]\)/)
  }
  finally { fx.cleanup() }
})

it('move relocates a symbol across packages in a pnpm-workspace monorepo', async () => {
  const fx = makeMonorepo()
  try {
    const r = await runMove('log', 'packages/core/src/log.ts', 'packages/core/src/logger.ts', {
      cwd: fx.dir,
      tsconfig: 'packages/app/tsconfig.json',
      verify: false,
    })
    writeChanges(r.changes)
    assert.match(fx.read('packages/core/src/logger.ts'), /export function log/)
    assert.match(fx.read('packages/app/src/main.ts'), /logger/, 'consumer import rewritten to new path')
  }
  finally { fx.cleanup() }
})
