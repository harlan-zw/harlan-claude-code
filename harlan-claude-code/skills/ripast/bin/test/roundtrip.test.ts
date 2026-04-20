import assert from 'node:assert/strict'
import { it } from 'vitest'
import { runMove } from '../move.ts'
import { runRename } from '../rename.ts'
import { scan } from '../scan.ts'
import { writeChanges } from '../util.ts'
import { makeFixture } from './helpers.ts'

const RENAME_FIXTURES: Record<string, Record<string, string>> = {
  'simple cross-file': {
    'a.ts': 'export function foo(n: number) { return n + 1 }\n',
    'b.ts': 'import { foo } from \'./a.ts\'\nexport const r = foo(2)\n',
  },
  'type alias': {
    'a.ts': 'export type MyType = { x: number }\n',
    'b.ts': 'import type { MyType } from \'./a.ts\'\nexport const v: MyType = { x: 1 }\n',
  },
  'multiple references': {
    'a.ts': 'export function tgt() { return 1 }\n',
    'b.ts': 'import { tgt } from \'./a.ts\'\nexport const a = tgt()\nexport const b = tgt() + tgt()\n',
  },
  'aliased import': {
    'a.ts': 'export function foo() { return 1 }\n',
    'b.ts': 'import { foo as local } from \'./a.ts\'\nexport const r = local()\n',
  },
}

for (const [label, files] of Object.entries(RENAME_FIXTURES)) {
  it(`rename roundtrip is identity: ${label}`, async () => {
    const fx = makeFixture(files)
    try {
      const originals: Record<string, string> = {}
      for (const f of Object.keys(files)) originals[f] = fx.read(f)

      const forward = await runRename('foo' in usedNames(files) ? 'foo' : 'tgt' in usedNames(files) ? 'tgt' : 'MyType', '__tmp_renamed__', { cwd: fx.dir, verify: false })
      writeChanges(forward.changes)

      const originalName = Object.keys(originals).some(f => originals[f].includes('foo'))
        ? 'foo'
        : Object.keys(originals).some(f => originals[f].includes('tgt')) ? 'tgt' : 'MyType'

      const back = await runRename('__tmp_renamed__', originalName, { cwd: fx.dir, verify: false })
      writeChanges(back.changes)

      for (const f of Object.keys(files)) {
        assert.equal(fx.read(f), originals[f], `${f} should be byte-identical after roundtrip`)
      }
    }
    finally { fx.cleanup() }
  })
}

it('scan count is conserved across rename', async () => {
  const fx = makeFixture({
    'a.ts': 'export function foo() { return 1 }\n',
    'b.ts': 'import { foo } from \'./a.ts\'\nexport const r = foo() + foo()\n',
    'c.ts': 'import { foo } from \'./a.ts\'\nexport default foo\n',
  })
  try {
    const beforeHits = scan('foo', { cwd: fx.dir }).length
    const r = await runRename('foo', 'bar', { cwd: fx.dir, verify: false })
    writeChanges(r.changes)
    const afterHits = scan('bar', { cwd: fx.dir }).length
    assert.equal(afterHits, beforeHits, 'total occurrence count must be conserved')
    assert.equal(scan('foo', { cwd: fx.dir }).length, 0, 'old name has zero occurrences post-rename')
  }
  finally { fx.cleanup() }
})

it('move roundtrip is identity: simple function', async () => {
  const fx = makeFixture({
    'a.ts': 'export function helper() { return 1 }\n',
    'b.ts': 'import { helper } from \'./a.ts\'\nexport const r = helper()\n',
    'c.ts': '',
  })
  try {
    const originals = { a: fx.read('a.ts'), b: fx.read('b.ts') }

    const forward = await runMove('helper', 'a.ts', 'c.ts', { cwd: fx.dir, verify: false })
    writeChanges(forward.changes)

    const back = await runMove('helper', 'c.ts', 'a.ts', { cwd: fx.dir, verify: false })
    writeChanges(back.changes)

    assertSimilarish(fx.read('a.ts'), originals.a, 'a.ts roundtrip')
    assertSimilarish(fx.read('b.ts'), originals.b, 'b.ts roundtrip')
  }
  finally { fx.cleanup() }
})

it('move roundtrip preserves import sites', async () => {
  const fx = makeFixture({
    'a.ts': 'export function helper() { return 1 }\nexport function other() { return 2 }\n',
    'b.ts': 'import { helper, other } from \'./a.ts\'\nexport const r = helper() + other()\n',
    'c.ts': '',
  })
  try {
    const beforeHelper = scan('helper', { cwd: fx.dir }).length
    const beforeOther = scan('other', { cwd: fx.dir }).length

    writeChanges((await runMove('helper', 'a.ts', 'c.ts', { cwd: fx.dir, verify: false })).changes)
    writeChanges((await runMove('helper', 'c.ts', 'a.ts', { cwd: fx.dir, verify: false })).changes)

    assert.equal(scan('helper', { cwd: fx.dir }).length, beforeHelper, 'helper count conserved')
    assert.equal(scan('other', { cwd: fx.dir }).length, beforeOther, 'other count conserved (unrelated)')
  }
  finally { fx.cleanup() }
})

function usedNames(files: Record<string, string>): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  const joined = Object.values(files).join('\n')
  for (const name of ['foo', 'tgt', 'MyType']) {
    if (joined.includes(name))
      out[name] = true
  }
  return out
}

function assertSimilarish(actual: string, expected: string, label: string) {
  const normalise = (s: string) => s.replace(/\s+/g, ' ').replace(/['"]/g, '\'').replace(/;/g, '').trim()
  assert.equal(normalise(actual), normalise(expected), `${label} should roundtrip (whitespace/quote/semicolon insensitive)`)
}
