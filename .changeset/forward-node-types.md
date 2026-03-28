---
"@savvy-web/github-action-builder": patch
---

## Bug Fixes

- Added explicit `"types": ["node"]` to the exported `tsconfig/action.json` so that `tsgo` correctly resolves `@types/node` in pnpm's symlinked `node_modules`.
