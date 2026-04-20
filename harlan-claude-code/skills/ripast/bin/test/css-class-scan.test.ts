import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { runCssClassScan } from '../css-class-scan.ts'
import { makeFixture } from './helpers.ts'

describe('runCssClassScan', () => {
  it('counts bare tokens from string literals', async () => {
    const fx = makeFixture({
      'src/a.ts': `export const cls = 'bg-gray-500 text-white bg-gray-500'\n`,
    }, false)
    try {
      const hits = runCssClassScan({ cwd: fx.dir })
      const bg = hits.find(h => h.token === 'bg-gray-500')
      assert.ok(bg, 'bg-gray-500 present')
      assert.equal(bg!.count, 2)
      assert.deepEqual(bg!.files, ['src/a.ts'])
    }
    finally { fx.cleanup() }
  })

  it('strips variants and counts bare form', async () => {
    const fx = makeFixture({
      'src/a.ts': `export const cls = 'bg-gray-500 hover:bg-gray-500 dark:md:bg-gray-500'\n`,
    }, false)
    try {
      const hits = runCssClassScan({ cwd: fx.dir })
      const bg = hits.find(h => h.token === 'bg-gray-500')
      assert.equal(bg!.count, 3)
    }
    finally { fx.cleanup() }
  })

  it('strips important (!) prefix', async () => {
    const fx = makeFixture({
      'src/a.ts': `export const cls = 'bg-gray-500 hover:!bg-gray-500'\n`,
    }, false)
    try {
      const hits = runCssClassScan({ cwd: fx.dir })
      const bg = hits.find(h => h.token === 'bg-gray-500')
      assert.equal(bg!.count, 2)
    }
    finally { fx.cleanup() }
  })

  it('aggregates across files', async () => {
    const fx = makeFixture({
      'src/a.ts': `export const a = 'bg-gray-500'\n`,
      'src/b.ts': `export const b = 'bg-gray-500 text-white'\n`,
    }, false)
    try {
      const hits = runCssClassScan({ cwd: fx.dir })
      const bg = hits.find(h => h.token === 'bg-gray-500')
      assert.equal(bg!.count, 2)
      assert.deepEqual(bg!.files, ['src/a.ts', 'src/b.ts'])
    }
    finally { fx.cleanup() }
  })

  it('filters with --pattern glob on bare token', async () => {
    const fx = makeFixture({
      'src/a.ts': `export const cls = 'bg-gray-500 text-white border-gray-200'\n`,
    }, false)
    try {
      const hits = runCssClassScan({ cwd: fx.dir, pattern: ['bg-*'] })
      assert.equal(hits.length, 1)
      assert.equal(hits[0].token, 'bg-gray-500')
    }
    finally { fx.cleanup() }
  })

  it('picks up Vue template class attrs', async () => {
    const fx = makeFixture({
      'src/c.vue': `<template><div class="bg-gray-500 hover:text-white">x</div></template>\n`,
    }, false)
    try {
      const hits = runCssClassScan({ cwd: fx.dir })
      assert.ok(hits.find(h => h.token === 'bg-gray-500'))
      assert.ok(hits.find(h => h.token === 'text-white'))
    }
    finally { fx.cleanup() }
  })

  it('picks up @apply in .css files', async () => {
    const fx = makeFixture({
      'src/x.css': `.btn { @apply bg-gray-500 hover:text-white; }\n`,
    }, false)
    try {
      const hits = runCssClassScan({ cwd: fx.dir })
      assert.ok(hits.find(h => h.token === 'bg-gray-500'))
      assert.ok(hits.find(h => h.token === 'text-white'))
    }
    finally { fx.cleanup() }
  })

  it('sorts by count desc then token asc', async () => {
    const fx = makeFixture({
      'src/a.ts': `export const cls = 'flex flex flex items-center'\n`,
    }, false)
    try {
      const hits = runCssClassScan({ cwd: fx.dir })
      assert.equal(hits[0].token, 'flex')
      assert.equal(hits[0].count, 3)
      assert.equal(hits[1].token, 'items-center')
    }
    finally { fx.cleanup() }
  })

  it('does not emit numbers or other non-class tokens', async () => {
    const fx = makeFixture({
      'src/a.ts': `export const x = 42\nexport const s = 'hello world 123'\nexport const cls = 'bg-gray-500'\n`,
    }, false)
    try {
      const hits = runCssClassScan({ cwd: fx.dir })
      assert.ok(!hits.some(h => h.token === '42'))
      assert.ok(!hits.some(h => h.token === '123'))
      assert.ok(hits.find(h => h.token === 'bg-gray-500'))
    }
    finally { fx.cleanup() }
  })

  it('accepts arbitrary-value tokens', async () => {
    const fx = makeFixture({
      'src/a.ts': `export const cls = 'bg-[#ff0000] text-[14px]'\n`,
    }, false)
    try {
      const hits = runCssClassScan({ cwd: fx.dir })
      assert.ok(hits.find(h => h.token === 'bg-[#ff0000]'))
      assert.ok(hits.find(h => h.token === 'text-[14px]'))
    }
    finally { fx.cleanup() }
  })

  it('empty repo returns empty list', async () => {
    const fx = makeFixture({
      'src/a.ts': `export const x = 1\n`,
    }, false)
    try {
      const hits = runCssClassScan({ cwd: fx.dir })
      assert.equal(hits.length, 0)
    }
    finally { fx.cleanup() }
  })
})
