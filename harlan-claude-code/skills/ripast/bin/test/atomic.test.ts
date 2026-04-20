import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { it } from 'vitest'
import { writeChanges } from '../util.ts'
import { makeFixture } from './helpers.ts'

it('writeChanges leaves no partial state when a write fails mid-batch', () => {
  const fx = makeFixture({
    'a.ts': 'original-a\n',
    'b.ts': 'original-b\n',
  }, false)
  try {
    const changes = [
      { path: join(fx.dir, 'a.ts'), rel: 'a.ts', before: 'original-a\n', after: 'new-a\n' },
      { path: join(fx.dir, 'missing-dir/b.ts'), rel: 'missing-dir/b.ts', before: '', after: 'new-b\n' },
    ]
    assert.throws(() => writeChanges(changes))
    assert.equal(readFileSync(join(fx.dir, 'a.ts'), 'utf8'), 'original-a\n', 'a.ts unchanged after failure')
    assert.ok(!existsSync(join(fx.dir, 'missing-dir')), 'target dir was never created')
    const leftover = readdirSync(fx.dir).filter(f => f.includes('ripast-tmp'))
    assert.equal(leftover.length, 0, `no tmp files leaked: ${leftover.join(', ')}`)
  }
  finally { fx.cleanup() }
})

it('writeChanges applies all changes successfully when every target is writable', () => {
  const fx = makeFixture({
    'a.ts': 'original-a\n',
    'b.ts': 'original-b\n',
  }, false)
  try {
    writeChanges([
      { path: join(fx.dir, 'a.ts'), rel: 'a.ts', before: 'original-a\n', after: 'new-a\n' },
      { path: join(fx.dir, 'b.ts'), rel: 'b.ts', before: 'original-b\n', after: 'new-b\n' },
    ])
    assert.equal(fx.read('a.ts'), 'new-a\n')
    assert.equal(fx.read('b.ts'), 'new-b\n')
    const leftover = readdirSync(fx.dir).filter(f => f.includes('ripast-tmp'))
    assert.equal(leftover.length, 0, 'no tmp files left after success')
  }
  finally { fx.cleanup() }
})
