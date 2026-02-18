# @savvy-web/github-action-builder

## 0.1.4

### Bug Fixes

* [`fcaa948`](https://github.com/savvy-web/github-action-builder/commit/fcaa948da09dc3bebc02b636bdb2b6398dded0a7) Supports @savvy-web/vitest
* Fixes circular dependencies issue

## 0.1.3

### Patch Changes

* e410c8a: Update dependencies:

  **Dependencies:**

  * @savvy-web/rslib-builder: ^0.12.2 → ^0.14.1

* 2af2b96: ## Features
  * Support for @savvy-web/changesets

* 289f0a6: Update dependencies:

  **Dependencies:**

  * @savvy-web/commitlint: ^0.3.1 → ^0.3.2
  * @savvy-web/lint-staged: ^0.3.2 → ^0.4.0
  * @savvy-web/rslib-builder: ^0.12.1 → ^0.12.2

## 0.1.2

### Patch Changes

* 6e927d4: Update dependencies:

  **Dependencies:**

  * @savvy-web/commitlint: ^0.3.0 → ^0.3.1
  * @savvy-web/lint-staged: ^0.3.1 → ^0.3.2
  * @savvy-web/rslib-builder: ^0.12.0 → ^0.12.1

* e9784b1: Specifies TypeScript and Node.js types as peer dependencies for easy installation

## 0.1.1

### Patch Changes

* 870addd: Standardizes dependencies with @savvy-web/pnpm-plugin-silk

## 0.1.0

### Minor Changes

* 416dafb: Initial release of @savvy-web/github-action-builder - a zero-config build tool
  for creating GitHub Actions from TypeScript source code.

  ## Features

  ### Zero-Config Project Scaffolding

  Create a complete GitHub Action project with a single command:

  ```bash
  npx @savvy-web/github-action-builder init my-action
  ```

  Generates a ready-to-build project with:

  * `package.json` with build scripts and dependencies
  * `tsconfig.json` configured for Node.js 24 ESM
  * `action.yml` with GitHub Action metadata
  * `action.config.ts` build configuration
  * `src/main.ts`, `src/pre.ts`, `src/post.ts` entry points

  ### Modern Node.js 24 Actions

  Build ESM-native GitHub Actions for the latest runtime:

  * Targets Node.js 24 with ES2022+ features
  * Validates `action.yml` requires `runs.using: "node24"`
  * Outputs flat bundle structure: `dist/main.js`, `dist/pre.js`, `dist/post.js`

  ### Single-File Bundles with @vercel/ncc

  All dependencies inlined into self-contained bundles:

  * No `node_modules` required at runtime
  * Minified by default for smaller bundles
  * Supports external packages for native modules

  ### GitHub Action Schema Validation

  Validates `action.yml` against GitHub's official metadata specification:

  * Checks required fields (name, description, runs)
  * Validates inputs, outputs, and branding configuration
  * Ensures `runs.using` is set to `node24`

  ### CI-Aware Strict Mode

  Automatically adapts validation behavior:

  * **Local development**: Warnings shown, build continues
  * **CI environments**: Warnings become errors, build fails

  ### Programmatic API

  Use the builder in scripts with full TypeScript support:

  ```typescript
  import { GitHubAction } from "@savvy-web/github-action-builder";

  const action = GitHubAction.create({
    build: { minify: true },
  });

  const result = await action.build();
  ```

  ### CLI Commands

  * `init <action-name>` - Create a new GitHub Action project
  * `build` - Bundle entry points into production-ready JavaScript
  * `validate` - Check configuration and action.yml without building
