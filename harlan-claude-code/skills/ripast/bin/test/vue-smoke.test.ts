import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { it } from 'vitest'
import { URI } from 'vscode-uri'
import { createVueService, workspaceEditToChanges } from '../vue.ts'
import { makeFixture } from './helpers.ts'

it('volar service can rename a symbol used in a vue file', async () => {
  const fx = makeFixture({
    'tsconfig.json': JSON.stringify({
      compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', strict: true, jsx: 'preserve', allowImportingTsExtensions: true, noEmit: true },
      include: ['**/*.ts', '**/*.vue'],
    }, null, 2),
    'src/utils.ts': 'export function greet() { return \'hi\' }\n',
    'src/Comp.vue': `<script setup lang="ts">\nimport { greet } from './utils.ts'\nconst msg = greet()\n</script>\n<template><div>{{ msg }}</div></template>\n`,
  }, false)
  try {
    const vue = createVueService(resolve(fx.dir, 'tsconfig.json'), fx.dir)
    try {
      const utilsUri = URI.file(resolve(fx.dir, 'src/utils.ts'))
      const greetCol = 'export function '.length
      const edits = await vue.service.getRenameEdits(utilsUri, { line: 0, character: greetCol }, 'salute')
      assert.ok(edits, 'volar returned edits')
      const changes = workspaceEditToChanges(edits, vue, fx.dir)
      const vueChange = changes.find(c => c.path.endsWith('Comp.vue'))
      assert.ok(vueChange, `expected .vue change, got: ${changes.map(c => c.rel).join(', ')}`)
      assert.ok(vueChange.after.includes('import { salute } from'), 'import rewritten')
      assert.ok(vueChange.after.includes('const msg = salute()'), 'call rewritten')
    }
    finally { vue.dispose() }
  }
  finally { fx.cleanup() }
})
