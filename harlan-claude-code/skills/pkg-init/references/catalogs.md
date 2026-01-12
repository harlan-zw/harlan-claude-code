# pnpm Workspace Catalogs

Use named catalogs only (no default `catalog:`). Max 5 catalogs.

## pnpm-workspace.yaml

```yaml
packages:
  - playground
  # - packages/*  # for monorepos

catalogMode: prefer
shellEmulator: true
trustPolicy: no-downgrade

catalogs:
  # Runtime dependencies (usually peer deps)
  deps:
    defu: ^6.1.4
    pathe: ^2.0.3
    ufo: ^1.6.2
    ohash: ^2.0.11
    hookable: ^6.0.1

  # Linting
  dev-lint:
    '@antfu/eslint-config': ^6.7.3
    eslint: ^9.39.2

  # Testing
  dev-test:
    vitest: ^4.0.16

  # Build tooling
  dev-build:
    typescript: ^5.9.3
    unbuild: ^3.6.1
    bumpp: ^10.3.2
    '@arethetypeswrong/cli': ^0.18.2

onlyBuiltDependencies:
  - '@parcel/watcher'
  - esbuild
  - vue-demi
```

## Usage in package.json

```json
{
  "devDependencies": {
    "eslint": "catalog:dev-lint",
    "@antfu/eslint-config": "catalog:dev-lint",
    "vitest": "catalog:dev-test",
    "typescript": "catalog:dev-build"
  },
  "dependencies": {
    "defu": "catalog:deps"
  }
}
```

## Migration

1. Add catalog entries to pnpm-workspace.yaml
2. Replace versions in package.json with `catalog:name`
3. Run `pnpm install` to verify
