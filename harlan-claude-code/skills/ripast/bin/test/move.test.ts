import assert from 'node:assert/strict'
import { it } from 'vitest'
import { runMove } from '../move.ts'
import { writeChanges } from '../util.ts'
import { makeFixture } from './helpers.ts'

it('move splits multi-named import at call sites', async () => {
  const fx = makeFixture({
    'a.ts': 'export function helper() { return 1 }\nexport function other() { return 2 }\n',
    'b.ts': 'import { helper, other } from \'./a.ts\'\nexport const r = helper() + other()\n',
    'c.ts': '',
  })
  try {
    const result = await runMove('helper', 'a.ts', 'c.ts', { cwd: fx.dir })
    writeChanges(result.changes)
    assert.doesNotMatch(fx.read('a.ts'), /export function helper/)
    assert.match(fx.read('a.ts'), /export function other/)
    assert.match(fx.read('c.ts'), /export function helper/)
    const b = fx.read('b.ts')
    assert.match(b, /import \{ other \} from '\.\/a\.ts'/)
    assert.match(b, /import \{ helper \}/)
    assert.match(b, /['"]\.\/c\.ts['"]/)
  }
  finally { fx.cleanup() }
})

it('move auto-adds import in source file if remaining siblings reference the moved symbol', async () => {
  const fx = makeFixture({
    'a.ts': 'export function helper() { return 1 }\nexport function other() { return helper() + 1 }\n',
    'c.ts': '',
  })
  try {
    const result = await runMove('helper', 'a.ts', 'c.ts', { cwd: fx.dir })
    writeChanges(result.changes)
    assert.match(fx.read('a.ts'), /import \{ helper \}/, 'source auto-imports moved symbol')
    assert.match(fx.read('a.ts'), /['"]\.\/c\.ts['"]/)
    assert.match(fx.read('c.ts'), /export function helper/)
  }
  finally { fx.cleanup() }
})

it('move copies used imports from source to target', async () => {
  const fx = makeFixture({
    'utils.ts': 'export function log(s: string) { return s }\n',
    'a.ts': 'import { log } from \'./utils.ts\'\nexport function helper(s: string) { return log(s) }\n',
    'c.ts': '',
  })
  try {
    const result = await runMove('helper', 'a.ts', 'c.ts', { cwd: fx.dir })
    writeChanges(result.changes)
    const c = fx.read('c.ts')
    assert.match(c, /import \{ log \}/, 'used import copied to target')
    assert.match(c, /export function helper/)
  }
  finally { fx.cleanup() }
})

it('move removes now-unused imports from source', async () => {
  const fx = makeFixture({
    'utils.ts': 'export function log(s: string) { return s }\n',
    'a.ts': 'import { log } from \'./utils.ts\'\nexport function helper(s: string) { return log(s) }\n',
    'c.ts': '',
  })
  try {
    const result = await runMove('helper', 'a.ts', 'c.ts', { cwd: fx.dir })
    writeChanges(result.changes)
    assert.doesNotMatch(fx.read('a.ts'), /import \{ log \}/, 'unused import pruned')
  }
  finally { fx.cleanup() }
})

it('move supports interface and type declarations', async () => {
  const fx = makeFixture({
    'a.ts': 'export interface MyType { x: number }\nexport type OtherType = string\n',
    'b.ts': 'import type { MyType } from \'./a.ts\'\nexport const v: MyType = { x: 1 }\n',
    'c.ts': '',
  })
  try {
    const result = await runMove('MyType', 'a.ts', 'c.ts', { cwd: fx.dir })
    writeChanges(result.changes)
    assert.match(fx.read('c.ts'), /export interface MyType/)
    assert.doesNotMatch(fx.read('a.ts'), /export interface MyType/)
    assert.match(fx.read('b.ts'), /['"]\.\/c\.ts['"]/, 'import site updated')
  }
  finally { fx.cleanup() }
})

it('move throws on missing symbol', async () => {
  const fx = makeFixture({
    'a.ts': 'export function foo() {}\n',
    'c.ts': '',
  })
  try {
    await assert.rejects(
      async () => runMove('missing', 'a.ts', 'c.ts', { cwd: fx.dir }),
      /no top-level export named "missing"/,
    )
  }
  finally { fx.cleanup() }
})
