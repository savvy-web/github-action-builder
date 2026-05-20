---
"@savvy-web/github-action-builder": patch
---

## Bug Fixes

Fix `__dirname` and `__filename` being undefined in ESM action bundles by injecting CJS compatibility shims, and ensure each action entry produces a single predictable output file by disabling async chunks.
