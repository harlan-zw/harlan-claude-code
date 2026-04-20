import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { rewriteClassString, rewriteToken, runCssClassRename } from '../css-class-rename.ts'
import { makeFixture } from './helpers.ts'

function map(pairs: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(pairs))
}

describe('rewriteToken', () => {
  it('rewrites bare token', () => {
    assert.equal(rewriteToken('bg-gray-500', map({ 'bg-gray-500': 'bg-neutral-500' })), 'bg-neutral-500')
  })
  it('preserves single variant', () => {
    assert.equal(rewriteToken('hover:bg-gray-500', map({ 'bg-gray-500': 'bg-neutral-500' })), 'hover:bg-neutral-500')
  })
  it('preserves stacked variants', () => {
    assert.equal(rewriteToken('dark:md:bg-gray-500', map({ 'bg-gray-500': 'bg-neutral-500' })), 'dark:md:bg-neutral-500')
  })
  it('preserves important prefix', () => {
    assert.equal(rewriteToken('hover:!bg-gray-500', map({ 'bg-gray-500': 'bg-neutral-500' })), 'hover:!bg-neutral-500')
  })
  it('does not match substring', () => {
    assert.equal(rewriteToken('bg-gray-5000', map({ 'bg-gray-500': 'bg-neutral-500' })), 'bg-gray-5000')
  })
  it('ignores colons inside arbitrary values', () => {
    assert.equal(rewriteToken('bg-[url(a:b)]', map({ 'bg-[url(a:b)]': 'bg-x' })), 'bg-x')
  })
  it('leaves non-matching tokens alone', () => {
    assert.equal(rewriteToken('text-blue-500', map({ 'bg-gray-500': 'bg-neutral-500' })), 'text-blue-500')
  })
  it('no-chaining: A→B + B→C keeps A→B result as B (one hop)', () => {
    const m = map({ 'bg-gray-500': 'bg-neutral-500', 'bg-neutral-500': 'bg-surface' })
    assert.equal(rewriteToken('bg-gray-500', m), 'bg-neutral-500')
    assert.equal(rewriteToken('bg-neutral-500', m), 'bg-surface')
  })
})

describe('rewriteClassString', () => {
  it('rewrites within a multi-token string, preserving spacing', () => {
    assert.equal(
      rewriteClassString('bg-gray-500 text-white hover:bg-gray-500', map({ 'bg-gray-500': 'bg-neutral-500' })),
      'bg-neutral-500 text-white hover:bg-neutral-500',
    )
  })
  it('rewrites multiple distinct tokens in one pass', () => {
    assert.equal(
      rewriteClassString('bg-gray-500 text-gray-900 border-gray-200', map({
        'bg-gray-500': 'bg-neutral-500',
        'text-gray-900': 'text-fg',
        'border-gray-200': 'border-muted',
      })),
      'bg-neutral-500 text-fg border-muted',
    )
  })
  it('preserves newlines and multiple spaces', () => {
    assert.equal(
      rewriteClassString('bg-gray-500\n  text-white', map({ 'bg-gray-500': 'bg-neutral-500' })),
      'bg-neutral-500\n  text-white',
    )
  })
  it('no change when no map keys match', () => {
    const s = 'flex items-center gap-2'
    assert.equal(rewriteClassString(s, map({ 'bg-gray-500': 'bg-neutral-500' })), s)
  })
  it('no-chaining across tokens in one string', () => {
    assert.equal(
      rewriteClassString('bg-gray-500 bg-neutral-500', map({
        'bg-gray-500': 'bg-neutral-500',
        'bg-neutral-500': 'bg-surface',
      })),
      'bg-neutral-500 bg-surface',
    )
  })
})

describe('runCssClassRename', () => {
  it('rewrites string literals in .ts files', async () => {
    const fx = makeFixture({
      'src/a.ts': `export const cls = 'bg-gray-500 text-white'\nexport const other = 'unrelated'\n`,
    }, false)
    try {
      const r = await runCssClassRename(map({ 'bg-gray-500': 'bg-neutral-500' }), { cwd: fx.dir })
      assert.equal(r.changes.length, 1)
      assert.ok(r.changes[0].after.includes('bg-neutral-500'))
      assert.ok(!r.changes[0].after.includes('bg-gray-500'))
      assert.ok(r.changes[0].after.includes('unrelated'))
    }
    finally { fx.cleanup() }
  })

  it('rewrites template literal quasis', async () => {
    const fx = makeFixture({
      // eslint-disable-next-line no-template-curly-in-string
      'src/a.ts': 'export const cls = `bg-gray-500 ${cond}`\n',
    }, false)
    try {
      const r = await runCssClassRename(map({ 'bg-gray-500': 'bg-neutral-500' }), { cwd: fx.dir })
      assert.equal(r.changes.length, 1)
      assert.ok(r.changes[0].after.includes('bg-neutral-500'))
    }
    finally { fx.cleanup() }
  })

  it('rewrites Vue template static class attrs', async () => {
    const fx = makeFixture({
      'src/c.vue': `<template><div class="bg-gray-500 hover:bg-gray-500">x</div></template>\n`,
    }, false)
    try {
      const r = await runCssClassRename(map({ 'bg-gray-500': 'bg-neutral-500' }), { cwd: fx.dir })
      assert.equal(r.changes.length, 1)
      assert.ok(r.changes[0].after.includes('bg-neutral-500 hover:bg-neutral-500'))
    }
    finally { fx.cleanup() }
  })

  it('rewrites Vue template dynamic :class string literals', async () => {
    const fx = makeFixture({
      'src/c.vue': `<template><div :class="active ? 'bg-gray-500' : 'text-white'">x</div></template>\n`,
    }, false)
    try {
      const r = await runCssClassRename(map({ 'bg-gray-500': 'bg-neutral-500' }), { cwd: fx.dir })
      assert.equal(r.changes.length, 1)
      assert.ok(r.changes[0].after.includes(`'bg-neutral-500'`))
    }
    finally { fx.cleanup() }
  })

  it('rewrites Vue script string literals too', async () => {
    const fx = makeFixture({
      'src/c.vue': `<script setup lang="ts">\nconst cls = 'bg-gray-500'\n</script>\n<template><div :class="cls" /></template>\n`,
    }, false)
    try {
      const r = await runCssClassRename(map({ 'bg-gray-500': 'bg-neutral-500' }), { cwd: fx.dir })
      assert.equal(r.changes.length, 1)
      assert.ok(r.changes[0].after.includes(`const cls = 'bg-neutral-500'`))
    }
    finally { fx.cleanup() }
  })

  it('rewrites @apply in Vue <style> blocks', async () => {
    const fx = makeFixture({
      'src/c.vue': `<style>\n.btn { @apply bg-gray-500 text-white; }\n</style>\n`,
    }, false)
    try {
      const r = await runCssClassRename(map({ 'bg-gray-500': 'bg-neutral-500' }), { cwd: fx.dir })
      assert.equal(r.changes.length, 1)
      assert.ok(r.changes[0].after.includes('@apply bg-neutral-500 text-white'))
    }
    finally { fx.cleanup() }
  })

  it('rewrites @apply in .css files', async () => {
    const fx = makeFixture({
      'src/x.css': `.btn { @apply hover:bg-gray-500; }\n`,
    }, false)
    try {
      const r = await runCssClassRename(map({ 'bg-gray-500': 'bg-neutral-500' }), { cwd: fx.dir })
      assert.equal(r.changes.length, 1)
      assert.ok(r.changes[0].after.includes('@apply hover:bg-neutral-500'))
    }
    finally { fx.cleanup() }
  })

  it('does not match substrings', async () => {
    const fx = makeFixture({
      'src/a.ts': `export const cls = 'bg-gray-5000'\n`,
    }, false)
    try {
      const r = await runCssClassRename(map({ 'bg-gray-500': 'bg-neutral-500' }), { cwd: fx.dir })
      assert.equal(r.changes.length, 0)
    }
    finally { fx.cleanup() }
  })

  it('does not rewrite unrelated string content', async () => {
    const fx = makeFixture({
      'src/a.ts': `export const msg = 'please pass bg-gray-500 carefully'\nexport const cls = 'bg-gray-500'\n`,
    }, false)
    try {
      const r = await runCssClassRename(map({ 'bg-gray-500': 'bg-neutral-500' }), { cwd: fx.dir })
      assert.equal(r.changes.length, 1)
      assert.ok(r.changes[0].after.includes('bg-neutral-500 carefully'))
      assert.ok(r.changes[0].after.includes(`const cls = 'bg-neutral-500'`))
    }
    finally { fx.cleanup() }
  })

  it('applies multi-pair map across one file', async () => {
    const fx = makeFixture({
      'src/a.ts': `export const cls = 'bg-gray-500 text-gray-900 border-gray-200 flex'\n`,
    }, false)
    try {
      const r = await runCssClassRename(map({
        'bg-gray-500': 'bg-neutral-500',
        'text-gray-900': 'text-fg',
        'border-gray-200': 'border-muted',
      }), { cwd: fx.dir })
      assert.equal(r.changes.length, 1)
      const after = r.changes[0].after
      assert.ok(after.includes('bg-neutral-500'))
      assert.ok(after.includes('text-fg'))
      assert.ok(after.includes('border-muted'))
      assert.ok(after.includes('flex'))
      assert.ok(!after.includes('bg-gray-500'))
    }
    finally { fx.cleanup() }
  })

  it('applies multi-pair map across multiple files', async () => {
    const fx = makeFixture({
      'src/a.ts': `export const a = 'bg-gray-500'\n`,
      'src/b.ts': `export const b = 'text-gray-900'\n`,
      'src/c.ts': `export const c = 'unrelated'\n`,
    }, false)
    try {
      const r = await runCssClassRename(map({
        'bg-gray-500': 'bg-neutral-500',
        'text-gray-900': 'text-fg',
      }), { cwd: fx.dir })
      assert.equal(r.changes.length, 2)
      const rels = r.changes.map(c => c.rel).sort()
      assert.deepEqual(rels, ['src/a.ts', 'src/b.ts'])
    }
    finally { fx.cleanup() }
  })

  it('no chaining: A→B then B→C gives one-hop per token', async () => {
    const fx = makeFixture({
      'src/a.ts': `export const cls = 'bg-gray-500 bg-neutral-500'\n`,
    }, false)
    try {
      const r = await runCssClassRename(map({
        'bg-gray-500': 'bg-neutral-500',
        'bg-neutral-500': 'bg-surface',
      }), { cwd: fx.dir })
      assert.equal(r.changes.length, 1)
      assert.ok(r.changes[0].after.includes(`'bg-neutral-500 bg-surface'`))
    }
    finally { fx.cleanup() }
  })

  it('preserves variants across multi-pair map', async () => {
    const fx = makeFixture({
      'src/a.ts': `export const cls = 'hover:bg-gray-500 dark:md:text-gray-900'\n`,
    }, false)
    try {
      const r = await runCssClassRename(map({
        'bg-gray-500': 'bg-neutral-500',
        'text-gray-900': 'text-fg',
      }), { cwd: fx.dir })
      assert.equal(r.changes.length, 1)
      assert.ok(r.changes[0].after.includes('hover:bg-neutral-500 dark:md:text-fg'))
    }
    finally { fx.cleanup() }
  })
})
