import assert from 'node:assert/strict'
import { it } from 'vitest'
import { runRename } from '../rename.ts'
import { writeChanges } from '../util.ts'
import { makeFixture } from './helpers.ts'

it('rename throws on ambiguity across multiple files', async () => {
  const fx = makeFixture({
    'a.ts': 'export function helper() { return 1 }\n',
    'b.ts': 'export function helper() { return 2 }\n',
  })
  try {
    await assert.rejects(
      async () => runRename('helper', 'newHelper', { cwd: fx.dir, verify: false }),
      /declared in multiple files/,
    )
  }
  finally { fx.cleanup() }
})

it('rename --scope resolves ambiguity', async () => {
  const fx = makeFixture({
    'a.ts': 'export function helper() { return 1 }\nexport const aVal = helper()\n',
    'b.ts': 'export function helper() { return 2 }\nexport const bVal = helper()\n',
  })
  try {
    const r = await runRename('helper', 'newHelper', { cwd: fx.dir, verify: false, scope: 'a.ts' })
    writeChanges(r.changes)
    assert.match(fx.read('a.ts'), /export function newHelper/)
    assert.match(fx.read('a.ts'), /aVal = newHelper\(\)/)
    assert.match(fx.read('b.ts'), /export function helper/, 'b.ts untouched')
  }
  finally { fx.cleanup() }
})

it('rename --all renames every declaration in every file', async () => {
  const fx = makeFixture({
    'a.ts': 'export function helper() {}\n',
    'b.ts': 'export function helper() {}\n',
  })
  try {
    const r = await runRename('helper', 'newHelper', { cwd: fx.dir, verify: false, allowMultiple: true })
    writeChanges(r.changes)
    assert.match(fx.read('a.ts'), /export function newHelper/)
    assert.match(fx.read('b.ts'), /export function newHelper/)
  }
  finally { fx.cleanup() }
})

it('rename --scope with no matching declaration gives a scope-specific error', async () => {
  const fx = makeFixture({
    'a.ts': 'export function helper() {}\n',
    'b.ts': 'export function other() {}\n',
  })
  try {
    await assert.rejects(
      async () => runRename('helper', 'newHelper', { cwd: fx.dir, verify: false, scope: 'b.ts' }),
      /no declaration of "helper" in b\.ts/,
    )
  }
  finally { fx.cleanup() }
})
