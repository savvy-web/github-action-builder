---
"@savvy-web/github-action-builder": minor
---

## Features

- Add `persistLocal` feature to automatically copy build output to `.github/actions/local/` for local testing with nektos/act
- Smart sync with hash-based comparison, stale file cleanup, and action.yml path validation
- Act template generation (`.actrc`, `act-test.yml`) for quick setup
- New `--no-persist` CLI flag to skip persist step
