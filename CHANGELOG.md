# @savvy-web/github-action-builder

## 0.5.1

### Features

* [`aeb5218`](https://github.com/savvy-web/github-action-builder/commit/aeb521873e712fa4826643fb3896c3d8ec06f9de) Upgrades to new `@savvy-web/vitest` standard setup

## 0.5.0

### Breaking Changes

* [`f0710f9`](https://github.com/savvy-web/github-action-builder/commit/f0710f9f5e1fb178ccd565e42e3444a04f3a7291) `BuildOptions.target` and `BuildOptions.quiet` config fields removed.
  Target is now hardcoded to ES2024 (Node 24). The `EsTarget` type export is removed.

### Features

* [`f0710f9`](https://github.com/savvy-web/github-action-builder/commit/f0710f9f5e1fb178ccd565e42e3444a04f3a7291) Replace `@vercel/ncc` with `@rsbuild/core` for GitHub Action bundling.

- Produces clean ESM output without `eval("require")` hacks that broke Node 24
- Supports tree-shaking via rspack
- Single-file output per entry point with `all-in-one` chunk strategy
- `node:*` builtins always externalized automatically

### Other

* [`f0710f9`](https://github.com/savvy-web/github-action-builder/commit/f0710f9f5e1fb178ccd565e42e3444a04f3a7291) Fixes #43

## 0.4.0

### Features

* [`cf95494`](https://github.com/savvy-web/github-action-builder/commit/cf954940cbb7889afad8c790a7cc237552923b37) Migrate Effect dependencies to catalog:silk and replace yaml with yaml-effect for Effect-native YAML parsing. Closes #37.

### Dependencies

* | [`4320227`](https://github.com/savvy-web/github-action-builder/commit/43202276c726ab55988280d44412b30d6658c75f) | Dependency | Type    | Action  | From    | To |
  | :-------------------------------------------------------------------------------------------------------------- | :--------- | :------ | :------ | :------ | -- |
  | @savvy-web/changesets                                                                                           | dependency | updated | ^0.4.1  | ^0.5.3  |    |
  | @savvy-web/commitlint                                                                                           | dependency | updated | ^0.4.0  | ^0.4.2  |    |
  | @savvy-web/lint-staged                                                                                          | dependency | updated | ^0.5.0  | ^0.6.1  |    |
  | @savvy-web/rslib-builder                                                                                        | dependency | updated | ^0.16.0 | ^0.18.2 |    |
  | @savvy-web/vitest                                                                                               | dependency | updated | ^0.2.0  | ^0.2.1  |    |

## 0.3.0

### Features

* [`5820156`](https://github.com/savvy-web/github-action-builder/commit/58201563df086a3deaaf3640e01fe4cc2c632b97) ### Preserve error stack traces with Effect Cause integration

Widen cause field from string to unknown on 5 error classes
(ConfigLoadFailed, BundleFailed, WriteError, CleanError,
PersistLocalError) to preserve original Error objects with stack traces.

Service layers now pass raw errors instead of extracting .message.
CLI renders full error chains via Effect.sandbox + Cause.pretty.
Programmatic API exposes cause field on GitHubActionBuildResult.

## 0.2.1

### Dependencies

* [`d9d434e`](https://github.com/savvy-web/github-action-builder/commit/d9d434eaa1d104d02b3dfe517138463efceb8219) @savvy-web/changesets: ^0.3.0 → ^0.4.1
* @savvy-web/commitlint: ^0.3.4 → ^0.4.0
* @savvy-web/lint-staged: ^0.4.6 → ^0.5.0
* @savvy-web/rslib-builder: ^0.15.0 → ^0.16.0
* @savvy-web/vitest: ^0.1.0 → ^0.2.0

## 0.2.0

### Features

* [`c9947b0`](https://github.com/savvy-web/github-action-builder/commit/c9947b08e7c3559b1cfc150dda3c0af995dabafa) Add `persistLocal` feature to automatically copy build output to `.github/actions/local/` for local testing with nektos/act
* Smart sync with hash-based comparison, stale file cleanup, and action.yml path validation
* Act template generation (`.actrc`, `act-test.yml`) for quick setup
* New `--no-persist` CLI flag to skip persist step

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
