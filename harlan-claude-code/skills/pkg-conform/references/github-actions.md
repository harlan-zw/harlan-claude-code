# GitHub Actions

## .github/workflows/test.yml

```yaml
name: Test

on:
  push:
    paths-ignore:
      - '**/README.md'
      - 'docs/**'

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
          cache: pnpm

      - run: pnpm i

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Build
        run: pnpm build

      - name: Test
        run: pnpm test --run
```

## .github/workflows/release.yml

### Single repo

```yaml
name: Release

permissions:
  contents: write
  id-token: write

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
          cache: pnpm
          registry-url: https://registry.npmjs.org

      - run: npx changelogithub
        env:
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}

      - run: pnpm i

      - run: pnpm build

      - run: pnpm publish --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}
```

### Monorepo

```yaml
name: Release

permissions:
  contents: write
  id-token: write

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
          cache: pnpm
          registry-url: https://registry.npmjs.org

      - run: npx changelogithub
        env:
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}

      - run: pnpm i

      - run: pnpm build

      - run: pnpm publish -r --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}
```

## .github/workflows/ci.yml (Site)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.event.number || github.sha }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  lint:
    runs-on: ubuntu-24.04-arm
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
          cache: pnpm
      - run: pnpm install --filter . --ignore-scripts
      - run: pnpm lint

  typecheck:
    runs-on: ubuntu-24.04-arm
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
          cache: pnpm
      - run: pnpm install
      - run: pnpm build
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-24.04-arm
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
          cache: pnpm
      - run: pnpm install
      - run: pnpm test:run
```

### Key site CI patterns

- **Concurrency control**: `cancel-in-progress: true` avoids wasting resources on superseded runs
- **ARM runners**: `ubuntu-24.04-arm` is more cost-effective than `ubuntu-latest`
- **Parallel jobs**: Separate lint/typecheck/test jobs run concurrently
- **Selective install**: Lint-only jobs use `pnpm install --filter . --ignore-scripts` to skip expensive hooks

## Action Versions (latest)

- `actions/checkout@v6`
- `actions/setup-node@v6`
- `pnpm/action-setup@v4`
