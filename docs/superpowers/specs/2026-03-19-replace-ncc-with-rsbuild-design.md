# Replace @vercel/ncc with Rsbuild for Action Bundling

**Date:** 2026-03-19
**Issue:** [#43](https://github.com/savvy-web/github-action-builder/issues/43)
**Branch:** `feat/use-rsbuild`
**Status:** Design approved

## Problem

`@vercel/ncc` (webpack 4-based) generates `eval("require")` in ESM output, which
Node 24 rejects with `ERR_AMBIGUOUS_MODULE_SYNTAX` when combined with top-level
`await`. This blocks all actions using `node24` with transitive CJS dependencies
(virtually all `@actions/*` packages via `undici`/`ws`).

ncc is effectively unmaintained and its webpack 4 runtime cannot properly bundle
CJS modules into ESM output.

## Solution

Replace `@vercel/ncc` with `@rsbuild/core` for programmatic bundling. Rsbuild
sits at the right abstraction level: clean JS API for bundling without RSLib's
library-publishing opinions (dts, dual format) or raw Rspack's verbosity.

### Why Rsbuild over alternatives

- **RSLib** is designed for library publishing (dual CJS/ESM, dts generation,
  package.json transforms). We're bundling an app for deployment, not publishing
  a package. Square peg, round hole.
- **Rspack directly** is verbose webpack-style config. We'd reimplement what
  Rsbuild already provides. Overkill for "bundle TS into single JS file."
- **Rsbuild** gives us `createRsbuild()` + `.build()` with clean defaults for
  Node targets, proper CJS/ESM interop, and no unnecessary abstractions.

## Design

### 1. Config schema changes

**Remove from `BuildOptionsSchema`:**

- `target` -- hardcode `es2024` internally. Node 24 (V8 12.x) fully supports
  ES2024, and the action.yml schema already enforces `using: node24`.
- `quiet` -- was ncc-specific. CLI `--quiet` flag (which controls console output)
  is unrelated and stays.

**Remove `EsTarget` schema entirely.** No consumer needs to pick a target.

**Keep unchanged:**

- `minify` (boolean, default `true`)
- `sourceMap` (boolean, default `false`)
- `externals` (string[], default `[]`) -- user-specified extras only

**Externals behavior:** `node:*` builtins are always externalized automatically.
User-provided `externals` are additive. `@actions/*` and all other npm packages
are bundled (no `node_modules` at runtime in GitHub Actions).

**Impact:** Breaking change to `BuildOptions` type. Consumers who set `target` or
`quiet` in `action.config.ts` will get a type error. This is intentional
simplification.

### 2. BuildServiceLive implementation

**File:** `src/services/build-live.ts`

**Remove entirely:**

- `createRequire` / ncc import hack (CJS interop no longer needed)
- All ncc types (`NccOptions`, `NccAsset`, `NccResult`, `NccFunction`)
- `bundle()` wrapper function
- Asset/chunk writing loop (rsbuild with code splitting disabled produces no
  chunks)

**Replace `bundleEntry()` with rsbuild:**

```typescript
import { createRsbuild } from "@rsbuild/core";

function bundleEntry(entry, config, cwd) {
  return Effect.gen(function* () {
    const startTime = Date.now();
    const outputDir = resolve(cwd, "dist");
    const outputFilename = `${entry.type}.js`;

    const rsbuild = await createRsbuild({
      rsbuildConfig: {
        source: { entry: { [entry.type]: entry.path } },
        output: {
          target: "node",
          module: true,  // Required: emit ESM, not CJS (experimental flag)
          distPath: { root: outputDir },
          filename: { js: "[name].js" },
          externals: [/^node:/, ...config.build.externals],
          minify: config.build.minify,
          sourceMap: config.build.sourceMap
            ? { js: "source-map" }
            : false,
        },
        performance: {
          chunkSplit: { strategy: "all-in-one" },
        },
      },
    });

    const buildResult = yield* Effect.tryPromise({
      try: () => rsbuild.build(),
      catch: (error) => new BundleFailed({ entry: entry.path, cause: error }),
    });

    // Release rsbuild resources (file watchers, worker threads)
    yield* Effect.promise(() => buildResult.close());

    // Read output file size (rsbuild writes to disk directly)
    const outputPath = resolve(outputDir, `${entry.type}.js`);
    const size = statSync(outputPath).size;
    const duration = Date.now() - startTime;

    return {
      success: true,
      stats: { entry: entry.type, size, duration, outputPath: entry.output },
    };
  });
}
```

**Key difference from ncc:** ncc returned code as a string and we wrote it to
disk. Rsbuild writes to disk directly. `bundleEntry()` reads the output file to
get size stats rather than measuring a string.

**Note on `output.module`:** This flag is marked experimental in rsbuild. It is
required to emit ESM instead of CJS. Without it, `output.target: "node"` defaults
to CJS, which would defeat the purpose of the migration. The `node:*` regex in
externals is a defensive safety net — rsbuild auto-externalizes Node builtins
when `target: "node"`, but the explicit regex ensures the `node:` protocol prefix
form is covered.

**What stays unchanged:**

- `cleanDirectory()`, `writeFile()`, `formatBytes()`, `formatBuildResult()`
- `getBundleSize()` is removed -- replaced by `statSync(outputPath).size` since
  rsbuild writes to disk directly (no in-memory string to measure)
- `build()` orchestration (sequential entry bundling, `dist/package.json` write,
  result collection)
- All Effect patterns, error types, Layer composition
- Explicit `dist/package.json` with `{ "type": "module" }` (we write this
  ourselves, not left to rsbuild)

### 3. BuildService interface

**File:** `src/services/build.ts`

**No changes.** The interface, schemas (`BuildResult`, `BundleResult`,
`BundleStats`, `BuildRunnerOptions`), and `Context.Tag` are untouched. This is
purely an implementation swap behind a stable interface.

### 4. CLI and template changes

**CLI commands** (`src/cli/commands/`):

- `--quiet` flag on `build` and `validate` -- stays as-is (controls console
  output, not bundler)
- No `--target` CLI flag exists, nothing to remove

**Init command template** (`src/cli/commands/init.ts`):

- Remove `target: "es2022"` from the generated `action.config.ts` example

**GitHubAction class** (`src/github-action.ts`):

- Update docstring examples that show `target: "es2022"` in config

**Docstring updates across codebase:**

- `defineConfig()` in `config.ts` -- remove `target: "es2022"` from `@example`
- `BundleFailed` in `errors.ts` -- update JSDoc from "ncc" to "rsbuild"
- `BuildService` in `build.ts` -- update JSDoc from "vercel/ncc" to "rsbuild"

### 5. Dependency changes

**Remove:**

- `@vercel/ncc` (`^0.38.4`)

**Add:**

- `@rsbuild/core` (programmatic bundling API; brings Rspack as transitive dep)

### 6. Error handling

**No changes to error types.** Existing errors in `src/errors.ts` all still
apply:

- `BundleFailed` -- wraps rsbuild failures instead of ncc (same shape)
- `WriteError` -- still used for `dist/package.json`
- `CleanError` -- unchanged

### 7. Test updates

- `config.test.ts` -- remove assertions for `target` and `quiet` defaults
- `index.test.ts` -- remove assertions referencing `target`
- Build integration tests may need updating for rsbuild output format
  differences (if any)

## Output guarantees

The bundled output for consumer actions must satisfy:

1. **Single file per entry point** (`dist/main.js`, `dist/pre.js`, `dist/post.js`)
2. **All npm dependencies inlined** (no `node_modules` at runtime)
3. **Node builtins external** (`node:fs`, `node:path`, etc.)
4. **ESM format** with `dist/package.json` containing `{ "type": "module" }`
5. **No `eval("require")`** or CJS/ESM mixing hacks
6. **Source maps optional** (written by rsbuild when enabled)

## What does NOT change

- `defineConfig()` function signature (consumers just lose two options)
- `GitHubAction` class public API
- CLI commands and flags
- Service interfaces (`BuildService`, `ConfigService`, `ValidationService`)
- Layer composition (`AppLayer`, `BuildLayer`, etc.)
- Error types and handling patterns
- Entry point detection (`src/main.ts`, `src/pre.ts`, `src/post.ts`)
- Output directory structure (`dist/`)
- Validation pipeline (action.yml schema, entry file checks)
- `PersistLocalService` behavior
