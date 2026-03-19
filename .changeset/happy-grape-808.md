---
"@savvy-web/github-action-builder": minor
---

## Features

Replace `@vercel/ncc` with `@rsbuild/core` for GitHub Action bundling.

- Produces clean ESM output without `eval("require")` hacks that broke Node 24
- Supports tree-shaking via rspack
- Single-file output per entry point with `all-in-one` chunk strategy
- `node:*` builtins always externalized automatically

## Breaking Changes

`BuildOptions.target` and `BuildOptions.quiet` config fields removed.
Target is now hardcoded to ES2024 (Node 24). The `EsTarget` type export is removed.

## Other

Fixes #43
