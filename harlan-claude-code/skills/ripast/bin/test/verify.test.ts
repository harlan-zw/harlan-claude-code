import assert from 'node:assert/strict'
import { it } from 'vitest'
import { runMove } from '../move.ts'
import { runRename } from '../rename.ts'
import { writeChanges } from '../util.ts'
import { makeFixture } from './helpers.ts'

it('rename reports zero regressions on clean transforms', async () => {
  const fx = makeFixture({
    'a.ts': 'export function oldFn(n: number): number { return n + 1 }\n',
    'b.ts': 'import { oldFn } from \'./a.ts\'\nexport const r: number = oldFn(2)\n',
  })
  try {
    const result = await runRename('oldFn', 'newFn', { cwd: fx.dir })
    assert.equal(result.regressions.length, 0, `expected no regressions, got: ${JSON.stringify(result.regressions)}`)
    assert.equal(result.changes.length, 2)
  }
  finally { fx.cleanup() }
})

it('move reports zero regressions on clean transforms', async () => {
  const fx = makeFixture({
    'a.ts': 'export function helper(n: number): number { return n * 2 }\n',
    'b.ts': 'import { helper } from \'./a.ts\'\nexport const r: number = helper(3)\n',
    'c.ts': '',
  })
  try {
    const result = await runMove('helper', 'a.ts', 'c.ts', { cwd: fx.dir })
    assert.equal(result.regressions.length, 0, `expected no regressions, got: ${JSON.stringify(result.regressions)}`)
  }
  finally { fx.cleanup() }
})

it('pre-existing type errors are not flagged as regressions', async () => {
  const fx = makeFixture({
    'a.ts': 'export function oldFn(n: number): number { return n + 1 }\n',
    'b.ts': 'import { oldFn } from \'./a.ts\'\nexport const r: string = oldFn(2)\n',
  })
  try {
    const result = await runRename('oldFn', 'newFn', { cwd: fx.dir })
    assert.equal(result.regressions.length, 0, 'pre-existing errors should survive rename, not count as new')
  }
  finally { fx.cleanup() }
})

it('verify: false skips regression detection (faster)', async () => {
  const fx = makeFixture({
    'a.ts': 'export function x() {}\n',
    'b.ts': 'import { x } from \'./a.ts\'\nx()\n',
  })
  try {
    const result = await runRename('x', 'y', { cwd: fx.dir, verify: false })
    assert.equal(result.regressions.length, 0, 'verify=false produces empty regressions regardless')
    writeChanges(result.changes)
    assert.match(fx.read('b.ts'), /import \{ y \}/)
  }
  finally { fx.cleanup() }
})
