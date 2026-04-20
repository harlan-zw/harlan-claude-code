import assert from 'node:assert/strict'
import { it } from 'vitest'
import { scan } from '../scan.ts'
import { makeFixture } from './helpers.ts'

it('scan classifies identifier kinds', () => {
  const fx = makeFixture({
    'src/a.ts': 'export function target(n: number) { return n }\n',
    'src/b.ts': 'import { target } from \'./a.ts\'\nexport const y = target(1)\n',
    'src/c.ts': 'const o = { target: 1 }\nconsole.log(o.target)\n',
  }, false)
  try {
    const hits = scan('target', { cwd: fx.dir })
    const byKind = groupByKind(hits)
    assert.equal(byKind['identifier-binding'] ?? 0, 1, 'one binding in a.ts')
    assert.equal(byKind['import-specifier'] ?? 0, 1, 'one import in b.ts')
    assert.equal(byKind['identifier-reference'] ?? 0, 1, 'one call reference in b.ts')
    assert.ok((byKind.property ?? 0) >= 1, 'at least one property in c.ts')
    assert.ok((byKind['member-access'] ?? 0) >= 1, 'at least one member access in c.ts')
  }
  finally { fx.cleanup() }
})

it('scan --kind filters results', () => {
  const fx = makeFixture({
    'src/a.ts': 'export function target() {}\nimport { other } from \'./x.ts\'\ntarget()\n',
  }, false)
  try {
    const only = scan('target', { cwd: fx.dir, kinds: ['identifier-reference'] })
    assert.equal(only.length, 1)
    assert.equal(only[0].kind, 'identifier-reference')
  }
  finally { fx.cleanup() }
})

it('scan finds Vue SFC script-block AND template-block occurrences', () => {
  const fx = makeFixture({
    'src/comp.vue': `<template><div>{{ target() }}</div></template>\n<script setup lang="ts">\nimport { target } from './utils'\nconst x = target()\n</script>\n`,
    'src/utils.ts': 'export function target() { return 1 }\n',
  }, false)
  try {
    const hits = scan('target', { cwd: fx.dir })
    const vueHits = hits.filter(h => h.file.endsWith('.vue'))
    assert.ok(vueHits.some(h => h.kind === 'import-specifier'), 'import in script')
    assert.ok(vueHits.some(h => h.kind === 'identifier-reference' && h.line >= 2), 'call in script')
    assert.ok(vueHits.some(h => h.line === 1), 'template ref reported')
  }
  finally { fx.cleanup() }
})

it('scan finds Vue template directive expressions (v-if, v-for, :prop)', () => {
  const fx = makeFixture({
    'src/comp.vue': `<template>\n  <div v-if="visible">{{ count }}</div>\n  <span :title="label">x</span>\n  <ul><li v-for="item in items">{{ item }}</li></ul>\n</template>\n<script setup lang="ts">\nconst visible = true\nconst count = 1\nconst label = 'hi'\nconst items = [1,2,3]\n</script>\n`,
  }, false)
  try {
    const visibleHits = scan('visible', { cwd: fx.dir }).filter(h => h.file.endsWith('.vue'))
    assert.ok(visibleHits.some(h => h.line === 2), 'v-if expression captured')
    const labelHits = scan('label', { cwd: fx.dir }).filter(h => h.file.endsWith('.vue'))
    assert.ok(labelHits.some(h => h.line === 3), 'v-bind expression captured')
    const itemsHits = scan('items', { cwd: fx.dir }).filter(h => h.file.endsWith('.vue'))
    assert.ok(itemsHits.some(h => h.line === 4), 'v-for expression captured')
  }
  finally { fx.cleanup() }
})

it('scan dedupes ImportSpecifier imported/local pair for unaliased imports', () => {
  const fx = makeFixture({
    'src/a.ts': 'export function foo() {}\n',
    'src/b.ts': 'import { foo } from \'./a.ts\'\nfoo()\n',
  }, false)
  try {
    const hits = scan('foo', { cwd: fx.dir })
    const importHits = hits.filter(h => h.kind === 'import-specifier')
    assert.equal(importHits.length, 1, 'unaliased import counts once, not twice')
  }
  finally { fx.cleanup() }
})

function groupByKind(hits: { kind: string }[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const h of hits) out[h.kind] = (out[h.kind] ?? 0) + 1
  return out
}
