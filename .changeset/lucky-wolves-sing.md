---
"@savvy-web/github-action-builder": minor
---

## Bug Fixes

- Fixed `TypeError: Unknown file extension ".ts"` when loading `action.config.ts` in CI environments. Native `import()` cannot load TypeScript files without a registered loader. Config files with a `.ts` extension are now loaded via `jiti`; `.js` and `.mjs` configs continue to use native import.

## Features

- Added a shared `tsconfig.json` for GitHub Action consumer projects, exported at `@savvy-web/github-action-builder/tsconfig/action.json`. The config provides ES2022 target, strict mode, bundler module resolution, and standard include patterns for action source trees.
