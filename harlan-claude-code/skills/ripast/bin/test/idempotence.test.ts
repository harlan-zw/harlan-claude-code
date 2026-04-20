import assert from 'node:assert/strict'
import { it } from 'vitest'
import { runMove } from '../move.ts'
import { runRename } from '../rename.ts'
import { scan } from '../scan.ts'
import { writeChanges } from '../util.ts'
import { makeFixture } from './helpers.ts'

// Idempotence contract:
// - a successful rename/move leaves the codebase in a state where the SAME op
//   would now be a no-op (throws "not found"). No silent drift on re-run.
// - completeness: after one rename, scan(oldName) returns 0 hits.

it('rename is complete: scan(oldName) is empty post-rename', async () => {
  const fx = makeFixture({
    'a.ts': 'export function foo() {}\n',
    'b.ts': 'import { foo } from \'./a.ts\'\nfoo()\nfoo()\n',
    'c.ts': 'export { foo as re } from \'./a.ts\'\n',
  })
  try {
    writeChanges((await runRename('foo', 'bar', { cwd: fx.dir, verify: false })).changes)
    const stray = scan('foo', { cwd: fx.dir })
    assert.equal(stray.length, 0, `expected 0 stray "foo" refs, got ${stray.length}: ${JSON.stringify(stray)}`)
  }
  finally { fx.cleanup() }
})

it('rename: second invocation throws (symbol no longer exists)', async () => {
  const fx = makeFixture({ 'a.ts': 'export function foo() {}\n' })
  try {
    writeChanges((await runRename('foo', 'bar', { cwd: fx.dir, verify: false })).changes)
    await assert.rejects(
      async () => runRename('foo', 'bar', { cwd: fx.dir, verify: false }),
      /no declaration of "foo" found/,
    )
  }
  finally { fx.cleanup() }
})

it('move is complete: fromFile no longer declares the symbol', async () => {
  const fx = makeFixture({
    'a.ts': 'export function helper() { return 1 }\nexport function other() { return 2 }\n',
    'b.ts': 'import { helper, other } from \'./a.ts\'\nexport const r = helper() + other()\n',
    'c.ts': '',
  })
  try {
    writeChanges((await runMove('helper', 'a.ts', 'c.ts', { cwd: fx.dir, verify: false })).changes)
    assert.doesNotMatch(fx.read('a.ts'), /export function helper/, 'helper removed from a.ts')
    assert.match(fx.read('c.ts'), /export function helper/, 'helper present in c.ts')
  }
  finally { fx.cleanup() }
})

it('move: second invocation throws (symbol no longer in source file)', async () => {
  const fx = makeFixture({
    'a.ts': 'export function helper() {}\n',
    'c.ts': '',
  })
  try {
    writeChanges((await runMove('helper', 'a.ts', 'c.ts', { cwd: fx.dir, verify: false })).changes)
    await assert.rejects(
      async () => runMove('helper', 'a.ts', 'c.ts', { cwd: fx.dir, verify: false }),
      /no top-level export named "helper"/,
    )
  }
  finally { fx.cleanup() }
})

it('move then reverse move: scan counts conserved', async () => {
  const fx = makeFixture({
    'a.ts': 'export function helper() {}\nexport function other() {}\n',
    'b.ts': 'import { helper, other } from \'./a.ts\'\nhelper(); other()\n',
    'c.ts': '',
  })
  try {
    const beforeHelper = scan('helper', { cwd: fx.dir }).length
    const beforeOther = scan('other', { cwd: fx.dir }).length

    writeChanges((await runMove('helper', 'a.ts', 'c.ts', { cwd: fx.dir, verify: false })).changes)
    writeChanges((await runMove('helper', 'c.ts', 'a.ts', { cwd: fx.dir, verify: false })).changes)

    assert.equal(scan('helper', { cwd: fx.dir }).length, beforeHelper, 'helper conserved')
    assert.equal(scan('other', { cwd: fx.dir }).length, beforeOther, 'other untouched')
  }
  finally { fx.cleanup() }
})
