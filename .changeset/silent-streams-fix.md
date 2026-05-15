---
"@savvy-web/github-action-builder": patch
---

## Bug Fixes

Fixed a runtime crash when bundling CommonJS dependencies that use TypeScript's `__importDefault(require("node:*"))` interop helper. The builder previously externalized `node:` builtins as ESM namespace imports in ESM-output mode, causing downstream `instanceof` checks to throw `TypeError: Right-hand side of 'instanceof' is not callable`. The fix externalizes `node:` builtins with `node-commonjs` type so bundled CJS deps receive real CommonJS `require()` semantics. A regression integration test is included.
