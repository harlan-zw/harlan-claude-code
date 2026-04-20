import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { runMove } from '../move.ts'
import { runRename } from '../rename.ts'
import { scan } from '../scan.ts'
import { writeChanges } from '../util.ts'
import { makeFixture } from './helpers.ts'

describe('rename patterns', () => {
  it('type-only import: import type { Foo }', async () => {
    const fx = makeFixture({
      'a.ts': 'export type Foo = { x: number }\n',
      'b.ts': 'import type { Foo } from \'./a.ts\'\nexport const v: Foo = { x: 1 }\n',
    })
    try {
      writeChanges((await runRename('Foo', 'Bar', { cwd: fx.dir, verify: false })).changes)
      assert.match(fx.read('a.ts'), /export type Bar/)
      assert.match(fx.read('b.ts'), /import type \{ Bar \}/)
      assert.match(fx.read('b.ts'), /: Bar =/)
    }
    finally { fx.cleanup() }
  })

  it('inline type import: import { type Foo }', async () => {
    const fx = makeFixture({
      'a.ts': 'export type Foo = number\n',
      'b.ts': 'import { type Foo } from \'./a.ts\'\nexport const v: Foo = 1\n',
    })
    try {
      writeChanges((await runRename('Foo', 'Bar', { cwd: fx.dir, verify: false })).changes)
      assert.match(fx.read('b.ts'), /import \{ type Bar \}/)
      assert.match(fx.read('b.ts'), /: Bar =/)
    }
    finally { fx.cleanup() }
  })

  it('export * barrel: rename propagates through wildcard re-export', async () => {
    const fx = makeFixture({
      'a.ts': 'export function foo() {}\n',
      'index.ts': 'export * from \'./a.ts\'\n',
      'b.ts': 'import { foo } from \'./index.ts\'\nfoo()\n',
    })
    try {
      writeChanges((await runRename('foo', 'bar', { cwd: fx.dir, verify: false })).changes)
      assert.match(fx.read('a.ts'), /export function bar/)
      assert.match(fx.read('b.ts'), /import \{ bar \}/)
      assert.match(fx.read('b.ts'), /bar\(\)/)
    }
    finally { fx.cleanup() }
  })

  it('export * barrel: move rewrites consumer import paths through wildcard re-export', async () => {
    const fx = makeFixture({
      'a.ts': 'export function helper() { return 1 }\n',
      'index.ts': 'export * from \'./a.ts\'\n',
      'b.ts': 'import { helper } from \'./a.ts\'\nexport const r = helper()\n',
      'c.ts': '',
    })
    try {
      writeChanges((await runMove('helper', 'a.ts', 'c.ts', { cwd: fx.dir, verify: false })).changes)
      assert.match(fx.read('c.ts'), /export function helper/)
      assert.match(fx.read('b.ts'), /['"]\.\/c\.ts['"]/)
    }
    finally { fx.cleanup() }
  })

  it('re-export: export { foo } from \'./a\'', async () => {
    const fx = makeFixture({
      'a.ts': 'export function foo() {}\n',
      'index.ts': 'export { foo } from \'./a.ts\'\n',
      'b.ts': 'import { foo } from \'./index.ts\'\nfoo()\n',
    })
    try {
      writeChanges((await runRename('foo', 'bar', { cwd: fx.dir, verify: false })).changes)
      assert.match(fx.read('a.ts'), /export function bar/)
      assert.match(fx.read('index.ts'), /export \{ bar \}/)
      assert.match(fx.read('b.ts'), /import \{ bar \}/)
      assert.match(fx.read('b.ts'), /bar\(\)/)
    }
    finally { fx.cleanup() }
  })

  it('jsx-component-reference', async () => {
    const fx = makeFixture({
      'Widget.tsx': 'export function Widget() { return null }\n',
      'App.tsx': 'import { Widget } from \'./Widget.tsx\'\nexport const App = () => <Widget />\n',
    })
    try {
      writeChanges((await runRename('Widget', 'Panel', { cwd: fx.dir, verify: false })).changes)
      assert.match(fx.read('Widget.tsx'), /export function Panel/)
      assert.match(fx.read('App.tsx'), /import \{ Panel \}/)
      assert.match(fx.read('App.tsx'), /<Panel \/>/)
    }
    finally { fx.cleanup() }
  })

  it('shadowing: inner scope same-named variable is untouched', async () => {
    const fx = makeFixture({
      'a.ts': 'export function foo() { return 1 }\n',
      'b.ts': 'import { foo } from \'./a.ts\'\nexport function outer() { const foo = 2; return foo }\nexport const r = foo()\n',
    })
    try {
      writeChanges((await runRename('foo', 'bar', { cwd: fx.dir, verify: false })).changes)
      const b = fx.read('b.ts')
      assert.match(b, /import \{ bar \} from '\.\/a\.ts'/)
      assert.match(b, /bar\(\)/, 'top-level call renamed')
      assert.match(b, /const foo = 2; return foo/, 'inner shadow untouched')
    }
    finally { fx.cleanup() }
  })

  it('destructured alias: rename source, alias preserved', async () => {
    const fx = makeFixture({
      'a.ts': 'export const foo = { n: 1 }\n',
      'b.ts': 'import { foo as local } from \'./a.ts\'\nexport const r = local.n\n',
    })
    try {
      writeChanges((await runRename('foo', 'bar', { cwd: fx.dir, verify: false })).changes)
      assert.match(fx.read('a.ts'), /export const bar/)
      assert.match(fx.read('b.ts'), /import \{ bar as local \}/)
      assert.match(fx.read('b.ts'), /local\.n/)
    }
    finally { fx.cleanup() }
  })

  it('namespace import: ns.foo is a member-access, not renamed by rename foo', async () => {
    const fx = makeFixture({
      'a.ts': 'export function foo() {}\nexport function bar() {}\n',
      'b.ts': 'import * as ns from \'./a.ts\'\nns.foo(); ns.bar()\n',
    })
    try {
      writeChanges((await runRename('foo', 'foo2', { cwd: fx.dir, verify: false })).changes)
      assert.match(fx.read('a.ts'), /export function foo2/)
      assert.match(fx.read('b.ts'), /ns\.foo2\(\)/, 'member access on namespace is renamed (same symbol)')
      assert.match(fx.read('b.ts'), /ns\.bar\(\)/, 'unrelated namespace member untouched')
    }
    finally { fx.cleanup() }
  })

  it('computed property key is a reference, not a property', async () => {
    const fx = makeFixture({
      'a.ts': 'export const KEY = \'k\'\nexport const o = { [KEY]: 1 }\n',
    }, false)
    try {
      const hits = scan('KEY', { cwd: fx.dir })
      const byKind = groupByKind(hits)
      assert.ok((byKind['identifier-reference'] ?? 0) >= 1, 'computed key is a reference')
      assert.equal(byKind.property ?? 0, 0, 'not classified as property')
    }
    finally { fx.cleanup() }
  })
})

describe('move patterns', () => {
  it('moves const (single declarator)', async () => {
    const fx = makeFixture({
      'a.ts': 'export const val = 42\n',
      'b.ts': 'import { val } from \'./a.ts\'\nexport const double = val * 2\n',
      'c.ts': '',
    })
    try {
      writeChanges((await runMove('val', 'a.ts', 'c.ts', { cwd: fx.dir, verify: false })).changes)
      assert.match(fx.read('c.ts'), /export const val = 42/)
      assert.match(fx.read('b.ts'), /['"]\.\/c\.ts['"]/)
    }
    finally { fx.cleanup() }
  })

  it('splits multi-declarator const and moves the targeted binding', async () => {
    const fx = makeFixture({
      'a.ts': 'export const a = 1, b = 2\n',
      'use.ts': 'import { a, b } from \'./a.ts\'\nexport const sum = a + b\n',
      'c.ts': '',
    })
    try {
      const result = await runMove('a', 'a.ts', 'c.ts', { cwd: fx.dir, verify: false })
      writeChanges(result.changes)
      assert.match(fx.read('c.ts'), /export const a = 1/)
      assert.match(fx.read('a.ts'), /export const b = 2/)
      assert.doesNotMatch(fx.read('a.ts'), /export const a = 1/)
      const use = fx.read('use.ts')
      assert.match(use, /import \{ b \} from ['"]\.\/a\.ts['"]/)
      assert.match(use, /import \{ a \} from ['"]\.\/c\.ts['"]/)
    }
    finally { fx.cleanup() }
  })

  it('refuses to move a declaration that calls a local non-exported helper', async () => {
    const fx = makeFixture({
      'a.ts': 'function helper() { return 1 }\nexport function foo() { return helper() }\n',
      'c.ts': '',
    })
    try {
      await assert.rejects(
        async () => runMove('foo', 'a.ts', 'c.ts', { cwd: fx.dir, verify: false }),
        /local non-exported symbol\(s\) \[helper\]/,
      )
    }
    finally { fx.cleanup() }
  })

  it('imports exported sibling at destination when moved decl references it', async () => {
    const fx = makeFixture({
      'a.ts': 'export function helper() { return 1 }\nexport function foo() { return helper() }\n',
      'c.ts': '',
    })
    try {
      const result = await runMove('foo', 'a.ts', 'c.ts', { cwd: fx.dir, verify: false })
      writeChanges(result.changes)
      const c = fx.read('c.ts')
      assert.match(c, /import \{ helper \} from ['"]\.\/a\.ts['"]/, 'exported sibling imported at destination')
      assert.match(c, /export function foo/)
      assert.match(fx.read('a.ts'), /export function helper/, 'helper stays in source')
    }
    finally { fx.cleanup() }
  })

  it('allows moving when dep is locally bound inside the moved decl', async () => {
    const fx = makeFixture({
      'a.ts': 'export function foo(x: number) { const y = x + 1; return y }\n',
      'c.ts': '',
    })
    try {
      await assert.doesNotReject(async () => runMove('foo', 'a.ts', 'c.ts', { cwd: fx.dir, verify: false }))
    }
    finally { fx.cleanup() }
  })

  it('rejects default export with clear error', async () => {
    const fx = makeFixture({
      'a.ts': 'export default function foo() {}\n',
      'c.ts': '',
    })
    try {
      await assert.rejects(
        async () => runMove('foo', 'a.ts', 'c.ts', { cwd: fx.dir, verify: false }),
        /no top-level export named "foo"/,
      )
    }
    finally { fx.cleanup() }
  })

  it('preserves import aliases when moving', async () => {
    const fx = makeFixture({
      'a.ts': 'export function helper() {}\n',
      'b.ts': 'import { helper as h } from \'./a.ts\'\nh()\n',
      'c.ts': '',
    })
    try {
      writeChanges((await runMove('helper', 'a.ts', 'c.ts', { cwd: fx.dir, verify: false })).changes)
      const b = fx.read('b.ts')
      assert.match(b, /import \{ helper as h \}/)
      assert.match(b, /['"]\.\/c\.ts['"]/)
      assert.match(b, /\bh\(\)/, 'local alias still used')
    }
    finally { fx.cleanup() }
  })

  it('moves enum with used values', async () => {
    const fx = makeFixture({
      'a.ts': 'export enum Color { Red, Blue }\n',
      'b.ts': 'import { Color } from \'./a.ts\'\nexport const c = Color.Red\n',
      'c.ts': '',
    })
    try {
      writeChanges((await runMove('Color', 'a.ts', 'c.ts', { cwd: fx.dir, verify: false })).changes)
      assert.match(fx.read('c.ts'), /export enum Color/)
      assert.match(fx.read('b.ts'), /['"]\.\/c\.ts['"]/)
    }
    finally { fx.cleanup() }
  })

  it('moves class declaration with decorators intact', async () => {
    const fx = makeFixture({
      'a.ts': '/* eslint-disable */\nexport function dec(t: any) { return t }\n@dec\nexport class Widget { x = 1 }\n',
      'b.ts': 'import { Widget } from \'./a.ts\'\nexport const w = new Widget()\n',
      'c.ts': '',
    })
    try {
      writeChanges((await runMove('Widget', 'a.ts', 'c.ts', { cwd: fx.dir, verify: false })).changes)
      const c = fx.read('c.ts')
      assert.match(c, /@dec/, 'decorator preserved')
      assert.match(c, /export class Widget/)
    }
    finally { fx.cleanup() }
  })
})

function groupByKind(hits: { kind: string }[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const h of hits) out[h.kind] = (out[h.kind] ?? 0) + 1
  return out
}
