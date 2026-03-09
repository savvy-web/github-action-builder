---
"@savvy-web/github-action-builder": minor
---

## Features

### Preserve error stack traces with Effect Cause integration

Widen cause field from string to unknown on 5 error classes
(ConfigLoadFailed, BundleFailed, WriteError, CleanError,
PersistLocalError) to preserve original Error objects with stack traces.

Service layers now pass raw errors instead of extracting .message.
CLI renders full error chains via Effect.sandbox + Cause.pretty.
Programmatic API exposes cause field on GitHubActionBuildResult.