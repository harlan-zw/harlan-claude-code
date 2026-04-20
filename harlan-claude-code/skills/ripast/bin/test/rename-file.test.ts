import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'vitest'
import { runRenameFile } from '../rename-file.ts'
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

function makeFx(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'ripast-renamefile-'))
  const write = (rel: string, content: string) => {
    const abs = join(dir, rel)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content)
  }
  write('tsconfig.json', VUE_TSCONFIG)
  for (const [r, c] of Object.entries(files)) write(r, c)
  return {
    dir,
    read: (r: string) => readFileSync(join(dir, r), 'utf8'),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  }
}

describe('rename-file', () => {
  it('rewrites .ts and .vue import sites and moves the file', async () => {
    const fx = makeFx({
      'src/utils.ts': 'export function helper() { return 1 }\n',
      'src/main.ts': 'import { helper } from \'./utils.ts\'\nexport const r = helper()\n',
      'src/Comp.vue': `<script setup lang="ts">\nimport { helper } from './utils.ts'\nconst v = helper()\n</script>\n<template>{{ v }}</template>\n`,
    })
    try {
      const r = await runRenameFile('src/utils.ts', 'src/lib/helpers.ts', { cwd: fx.dir })
      writeChanges(r.changes)
      mkdirSync(dirname(r.fileMove.to), { recursive: true })
      renameSync(r.fileMove.from, r.fileMove.to)

      assert.ok(existsSync(join(fx.dir, 'src/lib/helpers.ts')), 'file moved')
      assert.ok(!existsSync(join(fx.dir, 'src/utils.ts')), 'old file removed')
      assert.match(fx.read('src/main.ts'), /from ['"]\.\/lib\/helpers/, 'ts import rewritten')
      assert.match(fx.read('src/Comp.vue'), /from ['"]\.\/lib\/helpers/, 'vue import rewritten')
    }
    finally { fx.cleanup() }
  })

  it('infers target extension from source when missing', async () => {
    const fx = makeFx({
      'src/utils.ts': 'export function foo() { return 1 }\n',
      'src/main.ts': 'import { foo } from \'./utils.ts\'\nexport const r = foo()\n',
    })
    try {
      const r = await runRenameFile('src/utils.ts', 'src/lib/helpers', { cwd: fx.dir })
      assert.match(r.fileMove.to, /helpers\.ts$/, 'inferred .ts extension')
      writeChanges(r.changes)
      mkdirSync(dirname(r.fileMove.to), { recursive: true })
      renameSync(r.fileMove.from, r.fileMove.to)
      assert.ok(existsSync(join(fx.dir, 'src/lib/helpers.ts')))
    }
    finally { fx.cleanup() }
  })

  it('throws if target already exists', async () => {
    const fx = makeFx({
      'src/a.ts': 'export const x = 1\n',
      'src/b.ts': 'export const y = 2\n',
    })
    try {
      await assert.rejects(
        async () => runRenameFile('src/a.ts', 'src/b.ts', { cwd: fx.dir }),
        /target "src\/b\.ts" already exists/,
      )
    }
    finally { fx.cleanup() }
  })

  it('throws if source does not exist', async () => {
    const fx = makeFx({
      'src/a.ts': 'export const x = 1\n',
    })
    try {
      await assert.rejects(
        async () => runRenameFile('src/missing.ts', 'src/b.ts', { cwd: fx.dir }),
        /source "src\/missing\.ts" does not exist/,
      )
    }
    finally { fx.cleanup() }
  })
})
