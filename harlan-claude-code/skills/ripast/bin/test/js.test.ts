import assert from 'node:assert/strict'
import { it } from 'vitest'
import { runMove } from '../move.ts'
import { runRename } from '../rename.ts'
import { scan } from '../scan.ts'
import { writeChanges } from '../util.ts'
import { makeJsFixture } from './helpers.ts'

it('scan works against .js files with allowJs', async () => {
  const fx = makeJsFixture({
    'a.js': 'export function tool() { return 1 }\n',
    'b.js': 'import { tool } from \'./a.js\'\nexport const r = tool()\n',
  })
  try {
    const hits = scan('tool', { cwd: fx.dir })
    assert.ok(hits.length >= 2, `expected hits in both files, got ${hits.length}`)
  }
  finally { fx.cleanup() }
})

it('rename updates .js declaration and cross-file .js imports', async () => {
  const fx = makeJsFixture({
    'a.js': 'export function tool() { return 1 }\n',
    'b.js': 'import { tool } from \'./a.js\'\nexport const r = tool()\n',
  })
  try {
    const result = await runRename('tool', 'gadget', { cwd: fx.dir, verify: false })
    writeChanges(result.changes)
    assert.match(fx.read('a.js'), /export function gadget/)
    assert.doesNotMatch(fx.read('a.js'), /export function tool/)
    assert.match(fx.read('b.js'), /import \{ gadget \} from ['"]\.\/a\.js['"]/)
    assert.match(fx.read('b.js'), /gadget\(\)/)
  }
  finally { fx.cleanup() }
})

it('move relocates a .js function and rewrites import sites', async () => {
  const fx = makeJsFixture({
    'a.js': 'export function tool() { return 1 }\n',
    'b.js': 'import { tool } from \'./a.js\'\nexport const r = tool()\n',
    'c.js': '',
  })
  try {
    const result = await runMove('tool', 'a.js', 'c.js', { cwd: fx.dir, verify: false })
    writeChanges(result.changes)
    assert.match(fx.read('c.js'), /export function tool/)
    assert.doesNotMatch(fx.read('a.js'), /export function tool/)
    assert.match(fx.read('b.js'), /['"]\.\/c\.js['"]/)
  }
  finally { fx.cleanup() }
})
