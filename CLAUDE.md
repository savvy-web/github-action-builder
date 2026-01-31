# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Status

**GitHub Action Builder** - CLI tool and library for building Node.js 24
GitHub Actions using `@vercel/ncc`. Validates `action.yml` against GitHub
schema and bundles TypeScript into production-ready JavaScript.

**For detailed architecture:**
-> `@./.claude/design/github-action-builder/architecture.md`

Load when working on service layer design, build pipeline implementation,
or making architectural decisions.

## Quick Reference

```bash
pnpm test        # Run tests
pnpm build       # Build all
pnpm lint:fix    # Fix lint issues
```

## Commands

### Development

```bash
pnpm run lint              # Check code with Biome
pnpm run lint:fix          # Auto-fix lint issues
pnpm run typecheck         # Type-check via Turbo
pnpm run test              # Run all tests
pnpm run test:watch        # Run tests in watch mode
pnpm run test:coverage     # Run tests with coverage report
```

### Building

```bash
pnpm run build             # Build all (dev + prod)
pnpm run build:dev         # Build development output only
pnpm run build:prod        # Build production/npm output only
```

### Running a Single Test

```bash
pnpm vitest run src/errors.test.ts      # Specific file
pnpm vitest run -t "defineConfig"       # Pattern match
```

## Architecture

### Project Structure

* **Package Manager**: pnpm
* **Build Orchestration**: Turbo for caching and task dependencies
* **Source Code**: Located in `src/` directory
* **Shared Configs**: Located in `lib/configs/`

### Service Layer (Effect-TS)

Uses ConfigService, ValidationService, and BuildService composed via AppLayer.

-> `@./.claude/design/github-action-builder/architecture.md#service-layer`

### Build Pipeline

Uses Rslib with dual output:

1. `dist/dev/` - Development build with source maps
2. `dist/npm/` - Production build for npm publishing

Turbo tasks define dependencies: `typecheck` depends on `build` completing first.

### Code Quality

* **Biome**: Unified linting and formatting (replaces ESLint + Prettier)
* **Commitlint**: Enforces conventional commits with DCO signoff
* **Husky Hooks**:
  * `pre-commit`: Runs lint-staged
  * `commit-msg`: Validates commit message format
  * `pre-push`: Runs tests for affected packages

### TypeScript Configuration

* Composite builds with project references
* Strict mode enabled
* ES2022/ES2023 targets
* Import extensions required (`.js` for ESM)

### Testing

* **Framework**: Vitest with v8 coverage
* **Pool**: Uses forks (not threads) for Effect-TS compatibility
* **Config**: `vitest.config.ts` supports project-based filtering

For Effect-TS testing patterns, see the architecture design doc.

## Conventions

### Imports

* Use `.js` extensions for relative imports (ESM requirement)
* Use `node:` protocol for Node.js built-ins
* Separate type imports: `import type { Foo } from './bar.js'`

### Commits

All commits require:

1. Conventional commit format (feat, fix, chore, etc.)
2. DCO signoff: `Signed-off-by: Name <email>`

### Publishing

Packages publish to both GitHub Packages and npm with provenance.
