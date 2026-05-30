---
"@savvy-web/github-action-builder": patch
---

## Bug Fixes

- Action builds are now reproducible. When `build.ignore` was set, the ignore stub was written to a random `mkdtemp` directory whose absolute path rspack embedded in the bundle as a module id, so building the same source twice produced byte-different output and noisy diffs in committed action code. The stub now lives at a deterministic path under `node_modules/.cache`, so repeated builds are byte-identical.
- Bundled third-party license banners are kept inline instead of being extracted to `*.LICENSE.txt` sidecar files, removing the extra committed file from action output while preserving license attribution.
