# Configuration Files

## .npmrc

```ini
shamefully-hoist=true
strict-peer-dependencies=false
ignore-workspace-root-check=true
```

## .editorconfig

```ini
root = true

[*]
indent_size = 2
indent_style = space
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

## .gitignore

```gitignore
# Dependencies
node_modules

# Build output
dist
.output

# IDE
.idea
.vscode
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log

# Test
coverage

# Local
.env
.env.*
!.env.example
```

## eslint.config.mjs

```js
import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib', // or 'app' for applications
  ignores: [
    'CLAUDE.md',
  ],
})
```

## vitest.config.ts

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    reporters: 'dot',
  },
})
```

For projects with unit + e2e separation:

```ts
import { defineConfig, defineProject } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    reporters: 'dot',
    projects: [
      defineProject({
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
        },
      }),
      defineProject({
        test: {
          name: 'e2e',
          include: ['test/e2e/**/*.test.ts'],
        },
      }),
    ],
  },
})
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "Preserve",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "noUnusedLocals": true,
    "noEmit": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

## build.config.ts

```ts
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: true,
  entries: [
    'src/index',
  ],
  externals: [
    // add runtime externals here
  ],
})
```
