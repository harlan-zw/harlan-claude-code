import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { it } from 'vitest'
import { runMove } from '../move.ts'
import { runRename } from '../rename.ts'
import { scan } from '../scan.ts'
import { writeChanges } from '../util.ts'
import { makeFixture } from './helpers.ts'

const REAL_PROJECT = '/home/harlan/pkg/skilld'

const MINI_PROJECT: Record<string, string> = {
  'src/core/config.ts': `
import type { AppConfig } from '../types.ts'
import { readSettings } from './settings.ts'

export function loadConfig(): AppConfig {
  return readSettings()
}

export function validateConfig(cfg: AppConfig): boolean {
  return cfg.version > 0
}
`.trimStart(),
  'src/core/settings.ts': `
import type { AppConfig } from '../types.ts'

export function readSettings(): AppConfig {
  return { version: 1, name: 'default' }
}
`.trimStart(),
  'src/types.ts': `
export interface AppConfig {
  version: number
  name: string
}
export type ConfigKey = keyof AppConfig
`.trimStart(),
  'src/index.ts': `
import { loadConfig, validateConfig } from './core/config.ts'
import type { AppConfig, ConfigKey } from './types.ts'

export function main(): AppConfig | null {
  const cfg = loadConfig()
  return validateConfig(cfg) ? cfg : null
}

export function key(k: ConfigKey): string {
  return String(k)
}
`.trimStart(),
  'src/utils/format.ts': `
import type { AppConfig } from '../types.ts'

export function formatConfig(cfg: AppConfig): string {
  return \`\${cfg.name}@\${cfg.version}\`
}
`.trimStart(),
}

it('smoke: scan over a realistic multi-file project', async () => {
  const fx = makeFixture(MINI_PROJECT)
  try {
    const hits = scan('AppConfig', { cwd: fx.dir })
    const kinds = new Set(hits.map(h => h.kind))
    assert.ok(hits.length >= 8, `expected several AppConfig refs, got ${hits.length}`)
    assert.ok(kinds.has('identifier-binding'), 'AppConfig has a binding (interface)')
    assert.ok(kinds.has('import-specifier'), 'AppConfig is imported')
    assert.ok(kinds.has('identifier-reference'), 'AppConfig is referenced as type')
  }
  finally { fx.cleanup() }
})

it('smoke: rename across the whole project with --verify passes', async () => {
  const fx = makeFixture(MINI_PROJECT)
  try {
    const r = await runRename('AppConfig', 'AppSettings', { cwd: fx.dir })
    assert.equal(r.regressions.length, 0, `no regressions expected, got: ${JSON.stringify(r.regressions)}`)
    writeChanges(r.changes)
    for (const f of Object.keys(MINI_PROJECT)) {
      assert.doesNotMatch(fx.read(f), /\bAppConfig\b/, `${f} should not reference old name`)
    }
    assert.match(fx.read('src/types.ts'), /export interface AppSettings/)
    assert.match(fx.read('src/index.ts'), /AppSettings/)
  }
  finally { fx.cleanup() }
})

it('smoke: move a function with transitive deps with --verify passes', async () => {
  const fx = makeFixture(MINI_PROJECT)
  try {
    const r = await runMove('validateConfig', 'src/core/config.ts', 'src/core/validate.ts', { cwd: fx.dir })
    assert.equal(r.regressions.length, 0, `no regressions expected, got: ${JSON.stringify(r.regressions)}`)
    writeChanges(r.changes)
    assert.match(fx.read('src/core/validate.ts'), /export function validateConfig/)
    assert.doesNotMatch(fx.read('src/core/config.ts'), /export function validateConfig/)
    assert.match(fx.read('src/index.ts'), /core\/validate/, 'index.ts import updated')
  }
  finally { fx.cleanup() }
})

it.skipIf(!existsSync(REAL_PROJECT))('smoke: scan against real skilld repo (read-only)', () => {
  const hits = scan('yamlEscape', { cwd: REAL_PROJECT, glob: ['src/**/*.ts'] })
  assert.ok(hits.length > 0, 'should find yamlEscape in skilld')
  const kinds = new Set(hits.map(h => h.kind))
  assert.ok(kinds.has('identifier-binding'), 'has the declaration')
  assert.ok(kinds.has('identifier-reference') || kinds.has('import-specifier'), 'has references or imports')
})
