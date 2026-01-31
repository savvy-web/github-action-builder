# @savvy-web/github-action-builder

A zero-config build tool for creating GitHub Actions from TypeScript source
code. Bundles your action with [@vercel/ncc](https://github.com/vercel/ncc),
validates `action.yml` against GitHub's official schema, and outputs
production-ready Node.js 24 actions.

## Features

- **Zero-config** - Auto-detects entry points from `src/main.ts`, `src/pre.ts`,
  `src/post.ts`
- **Node.js 24** - Builds modern ESM actions for the latest GitHub Actions
  runtime
- **Schema validation** - Validates `action.yml` against GitHub's official
  metadata specification
- **Single-file bundles** - All dependencies inlined using @vercel/ncc
- **CI-aware** - Strict validation in CI, warnings-only locally

## Quick Start

Create a new GitHub Action project with a single command:

```bash
npx @savvy-web/github-action-builder init my-action
cd my-action
npm install
npm run build
```

That's it! Your action is built and ready. The `init` command generates a
complete project:

```text
my-action/
├── src/
│   ├── main.ts      # Main action entry point
│   ├── pre.ts       # Pre-action hook
│   └── post.ts      # Post-action cleanup
├── action.yml       # GitHub Action metadata
├── action.config.ts # Build configuration
├── package.json     # Dependencies and scripts
└── tsconfig.json    # TypeScript configuration
```

Edit `src/main.ts` with your action logic, then rebuild with `npm run build`.
Your bundled action is in `dist/main.js`, ready to commit and use.

## Basic Usage

### Initialize

Create a new GitHub Action project:

```bash
npx @savvy-web/github-action-builder init my-action
```

### Build

Bundle all entry points into `dist/`:

```bash
npm run build
# or directly:
npx @savvy-web/github-action-builder build
```

### Validate

Check your `action.yml` and configuration without building:

```bash
npm run validate
# or directly:
npx @savvy-web/github-action-builder validate
```

## Project Structure

The builder expects this structure:

```text
my-action/
├── src/
│   ├── main.ts     # Required - main action entry point
│   ├── pre.ts      # Optional - runs before main
│   └── post.ts     # Optional - runs after main (cleanup)
├── action.yml      # GitHub Action metadata (runs.using: "node24")
├── action.config.ts # Optional configuration
└── package.json
```

## Configuration

Customize `action.config.ts` for your project:

```typescript
import { GitHubAction } from "@savvy-web/github-action-builder";

export default GitHubAction.create({
  entries: {
    main: "src/main.ts",
    post: "src/cleanup.ts",
  },
  build: {
    minify: true,
    sourceMap: false,
  },
});
```

## action.yml Requirements

Your `action.yml` must use Node.js 24:

```yaml
name: "My Action"
description: "Does something useful"
runs:
  using: "node24"
  main: "dist/main.js"
  post: "dist/post.js" # Optional
```

## Documentation

- [Getting Started](./docs/getting-started.md) - Installation and first build
- [Configuration](./docs/configuration.md) - All configuration options
- [CLI Reference](./docs/cli-reference.md) - Complete command reference
- [Architecture](./docs/architecture.md) - How it works internally
- [Troubleshooting](./docs/troubleshooting.md) - Common issues and solutions

## Programmatic API

Use the builder programmatically in your scripts:

```typescript
import { GitHubAction } from "@savvy-web/github-action-builder";

const action = GitHubAction.create();
const result = await action.build();

if (result.success) {
  console.log(`Built ${result.build?.entries.length} entry points`);
}
```

## Requirements

- Node.js 24+
- TypeScript source files
- `action.yml` with `runs.using: "node24"`

## License

MIT
