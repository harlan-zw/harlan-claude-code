import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'vitest'
import { runMove } from '../move.ts'
import { runRename } from '../rename.ts'
import { writeChanges } from '../util.ts'

const VUE_TSCONFIG = JSON.stringify({
  compilerOptions: {
    target: 'ES2022',
    module: 'ESNext',
    moduleResolution: 'bundler',
    strict: true,
    jsx: 'preserve',
    allowImportingTsExtensions: true,
    noEmit: true,
  },
  include: ['**/*.ts', '**/*.vue'],
}, null, 2)

interface VueFixture {
  dir: string
  read: (rel: string) => string
  cleanup: () => void
}

function makeVueFixture(files: Record<string, string>): VueFixture {
  const dir = mkdtempSync(join(tmpdir(), 'ripast-vue-test-'))
  const write = (rel: string, content: string) => {
    const abs = join(dir, rel)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content)
  }
  write('tsconfig.json', VUE_TSCONFIG)
  for (const [rel, content] of Object.entries(files)) write(rel, content)
  return {
    dir,
    read: rel => readFileSync(join(dir, rel), 'utf8'),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  }
}

describe('vue sfc rename', () => {
  it('rewrites identifier references inside <script setup>', async () => {
    const fx = makeVueFixture({
      'src/utils.ts': 'export function greet() { return \'hi\' }\n',
      'src/Comp.vue': `<script setup lang="ts">\nimport { greet } from './utils.ts'\nconst msg = greet()\n</script>\n<template><div>{{ msg }}</div></template>\n`,
    })
    try {
      const r = await runRename('greet', 'salute', { cwd: fx.dir, verify: false })
      writeChanges(r.changes)
      const vue = fx.read('src/Comp.vue')
      assert.match(vue, /import \{ salute \} from/, 'import rewritten')
      assert.match(vue, /const msg = salute\(\)/, 'call rewritten')
      assert.equal(fx.read('src/utils.ts'), 'export function salute() { return \'hi\' }\n')
    }
    finally { fx.cleanup() }
  })

  it('rewrites multiple references in <script setup>', async () => {
    const fx = makeVueFixture({
      'src/utils.ts': 'export function format(n: number) { return String(n) }\n',
      'src/Comp.vue': `<script setup lang="ts">\nimport { format } from './utils.ts'\nconst a = format(1)\nconst b = format(2)\n</script>\n<template><div>{{ a }} {{ b }}</div></template>\n`,
    })
    try {
      const r = await runRename('format', 'render', { cwd: fx.dir, verify: false })
      writeChanges(r.changes)
      const vue = fx.read('src/Comp.vue')
      assert.match(vue, /import \{ render \} from/, 'import rewritten')
      assert.match(vue, /const a = render\(1\)/, 'first script call rewritten')
      assert.match(vue, /const b = render\(2\)/, 'second script call rewritten')
    }
    finally { fx.cleanup() }
  })

  it('--no-vue (vue: false) skips Volar pass and leaves .vue untouched', async () => {
    const fx = makeVueFixture({
      'src/utils.ts': 'export function greet() { return \'hi\' }\n',
      'src/Comp.vue': `<script setup lang="ts">\nimport { greet } from './utils.ts'\nconst v = greet()\n</script>\n<template>{{ v }}</template>\n`,
    })
    try {
      const r = await runRename('greet', 'salute', { cwd: fx.dir, verify: false, vue: false })
      writeChanges(r.changes)
      assert.match(fx.read('src/utils.ts'), /export function salute/)
      assert.match(fx.read('src/Comp.vue'), /import \{ greet \} from/, 'vue untouched when --no-vue')
    }
    finally { fx.cleanup() }
  })

  it('skips ripast when no .vue files exist (regression: pure-ts unchanged)', async () => {
    const fx = makeVueFixture({
      'src/utils.ts': 'export function foo() { return 1 }\n',
      'src/main.ts': 'import { foo } from \'./utils.ts\'\nexport const r = foo()\n',
    })
    try {
      const r = await runRename('foo', 'bar', { cwd: fx.dir, verify: false })
      writeChanges(r.changes)
      assert.match(fx.read('src/utils.ts'), /export function bar/)
      assert.match(fx.read('src/main.ts'), /import \{ bar \}/)
    }
    finally { fx.cleanup() }
  })
})

describe('vue verify', () => {
  it('reports zero vue regressions on a clean cross-vue rename', async () => {
    const fx = makeVueFixture({
      'src/utils.ts': 'export function greet(name: string) { return `hi ${name}` }\n',
      'src/Comp.vue': `<script setup lang="ts">\nimport { greet } from './utils.ts'\nconst v = greet('alice')\n</script>\n<template>{{ v }}</template>\n`,
    })
    try {
      const r = await runRename('greet', 'salute', { cwd: fx.dir, verify: true })
      assert.equal(r.regressions.length, 0, `unexpected regressions: ${JSON.stringify(r.regressions)}`)
    }
    finally { fx.cleanup() }
  })

  it('does not flag pre-existing vue type errors as regressions', async () => {
    const fx = makeVueFixture({
      'src/utils.ts': 'export function greet() { return \'hi\' }\n',
      'src/Comp.vue': `<script setup lang="ts">\nimport { greet } from './utils.ts'\nconst v = greet('extra-arg-pre-existing-error')\n</script>\n<template>{{ v }}</template>\n`,
    })
    try {
      const r = await runRename('greet', 'salute', { cwd: fx.dir, verify: true })
      const newErrs = r.regressions.filter(reg => reg.file.endsWith('Comp.vue'))
      assert.equal(newErrs.length, 0, `pre-existing error flagged as new: ${JSON.stringify(newErrs)}`)
    }
    finally { fx.cleanup() }
  })
})

describe('vue sfc template post-pass', () => {
  it('rewrites <PascalCase> component tags in template after rename', async () => {
    const fx = makeVueFixture({
      'src/components.ts': 'export const MyButton = { name: \'MyButton\' }\n',
      'src/Page.vue': `<script setup lang="ts">\nimport { MyButton } from './components.ts'\n</script>\n<template><div><MyButton label="x" /><MyButton /></div></template>\n`,
    })
    try {
      const r = await runRename('MyButton', 'PrimaryButton', { cwd: fx.dir, verify: false })
      writeChanges(r.changes)
      const page = fx.read('src/Page.vue')
      assert.match(page, /import \{ PrimaryButton \} from/, 'import rewritten')
      assert.match(page, /<PrimaryButton label="x" \/>/, 'first PascalCase tag rewritten')
      assert.match(page, /<PrimaryButton \/>/, 'second PascalCase tag rewritten')
      assert.doesNotMatch(page, /<MyButton/, 'no leftover old tag')
    }
    finally { fx.cleanup() }
  })

  it('rewrites <kebab-case> component tags in template after rename', async () => {
    const fx = makeVueFixture({
      'src/components.ts': 'export const MyButton = { name: \'MyButton\' }\n',
      'src/Page.vue': `<script setup lang="ts">\nimport { MyButton } from './components.ts'\n</script>\n<template><div><my-button label="x"></my-button></div></template>\n`,
    })
    try {
      const r = await runRename('MyButton', 'PrimaryButton', { cwd: fx.dir, verify: false })
      writeChanges(r.changes)
      const page = fx.read('src/Page.vue')
      assert.match(page, /<primary-button label="x"><\/primary-button>/, 'kebab tag rewritten')
      assert.doesNotMatch(page, /my-button/, 'no leftover kebab tag')
    }
    finally { fx.cleanup() }
  })

  it('rewrites pure-template-only references in {{ interpolation }}', async () => {
    const fx = makeVueFixture({
      'src/utils.ts': 'export function format(n: number) { return String(n) }\n',
      'src/Comp.vue': `<script setup lang="ts">\nimport { format } from './utils.ts'\n</script>\n<template><div>{{ format(42) }}</div></template>\n`,
    })
    try {
      const r = await runRename('format', 'render', { cwd: fx.dir, verify: false })
      writeChanges(r.changes)
      const vue = fx.read('src/Comp.vue')
      assert.match(vue, /import \{ render \} from/, 'import rewritten')
      assert.match(vue, /\{\{ render\(42\) \}\}/, 'template interpolation rewritten')
      assert.doesNotMatch(vue, /format/, 'no leftover format ref')
    }
    finally { fx.cleanup() }
  })

  it('does not rewrite v-for shadowed identifier', async () => {
    const fx = makeVueFixture({
      'src/utils.ts': 'export const item = 1\n',
      'src/Comp.vue': `<script setup lang="ts">\nimport { item } from './utils.ts'\nconst items = [1, 2, 3]\nvoid item\n</script>\n<template><ul><li v-for="item in items" :key="item">{{ item }}</li></ul></template>\n`,
    })
    try {
      const r = await runRename('item', 'token', { cwd: fx.dir, verify: false })
      writeChanges(r.changes)
      const vue = fx.read('src/Comp.vue')
      assert.match(vue, /import \{ token \} from/, 'import rewritten')
      assert.match(vue, /v-for="item in items"/, 'v-for binding NOT rewritten (shadowed)')
      assert.match(vue, /:key="item"/, ':key uses shadowed item, NOT rewritten')
      assert.match(vue, /\{\{ item \}\}/, 'interpolation uses shadowed item, NOT rewritten')
    }
    finally { fx.cleanup() }
  })

  it('does not rewrite string literals containing the name', async () => {
    const fx = makeVueFixture({
      'src/utils.ts': 'export function format(n: number) { return String(n) }\n',
      'src/Comp.vue': `<script setup lang="ts">\nimport { format } from './utils.ts'\nconst label = 'format'\n</script>\n<template><div :title="'format me'">{{ format(1) }} {{ label }}</div></template>\n`,
    })
    try {
      const r = await runRename('format', 'render', { cwd: fx.dir, verify: false })
      writeChanges(r.changes)
      const vue = fx.read('src/Comp.vue')
      assert.match(vue, /:title="'format me'"/, 'string literal in template NOT rewritten')
      assert.match(vue, /\{\{ render\(1\) \}\}/, 'identifier in template rewritten')
    }
    finally { fx.cleanup() }
  })
})

describe('vue sfc move', () => {
  it('rewrites import specifiers in .vue consumers when a symbol moves', async () => {
    const fx = makeVueFixture({
      'src/a.ts': 'export function helper() { return 1 }\n',
      'src/b.ts': '',
      'src/Comp.vue': `<script setup lang="ts">\nimport { helper } from './a.ts'\nconst x = helper()\n</script>\n<template><div>{{ x }}</div></template>\n`,
    })
    try {
      const r = await runMove('helper', 'src/a.ts', 'src/b.ts', { cwd: fx.dir, verify: false })
      writeChanges(r.changes)
      const vue = fx.read('src/Comp.vue')
      assert.match(vue, /import \{ helper \} from ['"]\.\/b/, 'vue import rewritten to new path')
      assert.doesNotMatch(vue, /from ['"]\.\/a/, 'no leftover import from old path')
      assert.match(fx.read('src/b.ts'), /export function helper/)
    }
    finally { fx.cleanup() }
  })
})
