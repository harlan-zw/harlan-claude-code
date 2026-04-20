import assert from 'node:assert/strict'
import { it } from 'vitest'
import { runRename } from '../rename.ts'
import { writeChanges } from '../util.ts'
import { makeFixture } from './helpers.ts'

it('rename updates declaration + cross-file imports + call sites', async () => {
  const fx = makeFixture({
    'a.ts': 'export function oldFn(n: number) { return n + 1 }\n',
    'b.ts': 'import { oldFn } from \'./a.ts\'\nexport const r = oldFn(2)\n',
  })
  try {
    const result = await runRename('oldFn', 'newFn', { cwd: fx.dir })
    writeChanges(result.changes)
    assert.match(fx.read('a.ts'), /newFn/)
    assert.doesNotMatch(fx.read('a.ts'), /oldFn/)
    assert.match(fx.read('b.ts'), /import \{ newFn \} from '\.\/a\.ts'/)
    assert.match(fx.read('b.ts'), /newFn\(2\)/)
    assert.equal(result.changes.length, 2)
  }
  finally { fx.cleanup() }
})

it('rename does not touch unrelated same-named identifiers in property position', async () => {
  const fx = makeFixture({
    'a.ts': 'export function target() { return 1 }\n',
    'b.ts': 'import { target } from \'./a.ts\'\nconst o = { target: 2 }\nexport const r = target() + o.target\n',
  })
  try {
    const result = await runRename('target', 'renamed', { cwd: fx.dir })
    writeChanges(result.changes)
    const b = fx.read('b.ts')
    assert.match(b, /import \{ renamed \} from '\.\/a\.ts'/)
    assert.match(b, /renamed\(\) \+ o\.target/)
    assert.match(b, /\{ target: 2 \}/, 'object key should not be renamed')
  }
  finally { fx.cleanup() }
})

it('rename preserves aliased imports correctly', async () => {
  const fx = makeFixture({
    'a.ts': 'export function foo() {}\n',
    'b.ts': 'import { foo as bar } from \'./a.ts\'\nbar()\n',
  })
  try {
    const result = await runRename('foo', 'foo2', { cwd: fx.dir })
    writeChanges(result.changes)
    const b = fx.read('b.ts')
    assert.match(b, /import \{ foo2 as bar \} from '\.\/a\.ts'/)
    assert.match(b, /bar\(\)/, 'local alias unchanged')
  }
  finally { fx.cleanup() }
})
