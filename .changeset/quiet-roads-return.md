---
"@savvy-web/github-action-builder": minor
---

## Bug Fixes

Fixed user-configured `build.externals` entries not being honored after the v0.6.4 `node:` interop fix. A change to the rspack externals config structure had caused the trailing string entries to be silently ignored, so configured package names were bundled and hard-failed to resolve instead of being externalized.

## Features

Added `build.ignore` — a `string[]` option listing modules to exclude from the bundle and replace with a throwing stub. Use it for optional transitive dependencies the action never exercises (for example, native modules pulled in as optional plugins by a dependency). Unlike `build.externals` (packages excluded because they are available at runtime), `build.ignore` packages are absent at runtime; code that wraps their `require()` calls in `try/catch` correctly detects them as unavailable.
