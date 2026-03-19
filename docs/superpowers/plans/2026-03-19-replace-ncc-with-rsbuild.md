# Replace ncc with Rsbuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `@vercel/ncc` with `@rsbuild/core` for GitHub Action bundling while keeping the same external API.

**Architecture:** Swap the bundler implementation inside `BuildServiceLive` (specifically the `bundleEntry()` function). Simplify the config schema by removing ncc-specific options (`target`, `quiet`). The service interface, Layer composition, CLI, and public API are untouched.

**Tech Stack:** `@rsbuild/core`, Effect-TS, Vitest

**Spec:** `docs/superpowers/specs/2026-03-19-replace-ncc-with-rsbuild-design.md`

---

## File Map

| Action | File | Responsibility |
| ------ | ---- | -------------- |
| Modify | `package.json` | Swap `@vercel/ncc` for `@rsbuild/core`, update description/keywords |
| Modify | `src/schemas/config.ts` | Remove `target`, `quiet`, `EsTarget` from schema |
| Modify | `src/schemas/config.test.ts` | Update tests for removed fields |
| Modify | `src/index.ts` | Remove `EsTarget` type export, update module JSDoc |
| Modify | `src/index.test.ts` | Update defineConfig assertions |
| Modify | `src/services/build-live.ts` | Replace ncc with rsbuild in `bundleEntry()` |
| Modify | `src/services/build.ts` | Update JSDoc only |
| Modify | `src/errors.ts` | Update `BundleFailed` JSDoc only |
| Modify | `src/github-action.ts` | Update docstring examples and ncc references |
| Modify | `src/cli/commands/init.ts` | Update template config |

---

## Task 1: Swap dependencies

**Files:**

- Modify: `package.json:62-72`

- [ ] **Step 1: Remove @vercel/ncc and add @rsbuild/core**

```bash
pnpm remove @vercel/ncc && pnpm add @rsbuild/core
```

- [ ] **Step 2: Verify install succeeded**

```bash
pnpm ls @rsbuild/core
```

Expected: Shows `@rsbuild/core` with version in output.

- [ ] **Step 3: Update package.json description and keywords**

In `package.json`:

- Line 5: Update `description` — replace `@vercel/ncc` with `rsbuild`
- Lines 10-11: In `keywords` array, replace `"ncc"` and `"vercel-ncc"` with
  `"rsbuild"` and `"rspack"`

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat(deps): replace @vercel/ncc with @rsbuild/core

Signed-off-by: C. Spencer Beggs <spencer@savvyweb.systems>"
```

---

## Task 2: Simplify config schema

**Files:**

- Modify: `src/schemas/config.ts:47-81` (BuildOptionsSchema, EsTarget)
- Modify: `src/schemas/config.ts:161-192` (ConfigInputSchema)
- Modify: `src/schemas/config.ts:261-284` (defineConfig example)
- Modify: `src/index.ts:63-80` (remove EsTarget export)

- [ ] **Step 1: Write failing tests for new schema shape**

In `src/schemas/config.test.ts`, update the BuildOptions tests. The new defaults
should have only `minify`, `sourceMap`, and `externals` — no `target` or `quiet`.

Update the `"applies defaults when decoding empty object"` test (around line 50):
remove assertions for `target` and `quiet`, keep `minify`, `sourceMap`,
`externals`.

```typescript
it("applies defaults when decoding empty object", () => {
  const options = Schema.decodeUnknownSync(BuildOptionsSchema)({});
  expect(options.minify).toBe(true);
  expect(options.sourceMap).toBe(false);
  expect(options.externals).toEqual([]);
});
```

Update the `"accepts custom options"` test (around line 59): remove `target` and
`quiet` from input and assertions.

```typescript
it("accepts custom options", () => {
  const options = Schema.decodeUnknownSync(BuildOptionsSchema)({
    minify: false,
    sourceMap: true,
    externals: ["@aws-sdk/client-s3"],
  });
  expect(options.minify).toBe(false);
  expect(options.sourceMap).toBe(true);
  expect(options.externals).toEqual(["@aws-sdk/client-s3"]);
});
```

Update the `"decodes from plain object"` test (around line 74): remove the
`target` assertion at line 79.

Remove the entire `"EsTarget Literal"` describe block (around lines 123-137).

Update the `"ConfigInput Schema"` describe block (around lines 156-164): remove
`target: "es2023"` from the input object (line 159) and
`expect(decoded.build?.target).toBe("es2023")` assertion (line 163).

Update the `"merges partial config with defaults"` test in the `defineConfig`
describe block: remove `expect(config.build.target).toBe("es2022")` (around
line 207).

Update the `"handles all build options"` test (around line 223): remove `target`
and `quiet` from input and assertions.

```typescript
it("handles all build options", () => {
  const config = defineConfig({
    entries: { main: "src/action.ts", pre: "src/pre.ts", post: "src/post.ts" },
    build: {
      minify: false,
      sourceMap: true,
      externals: ["some-external"],
    },
    validation: { requireActionYml: false, maxBundleSize: "5mb", strict: true },
  });
  expect(config.build.minify).toBe(false);
  expect(config.build.sourceMap).toBe(true);
  expect(config.build.externals).toEqual(["some-external"]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/schemas/config.test.ts -v
```

Expected: Failures due to `target` and `quiet` still in schema.

- [ ] **Step 3: Update BuildOptionsSchema**

In `src/schemas/config.ts`, remove `EsTarget` (lines 47-59) and simplify
`BuildOptionsSchema` (lines 70-81):

```typescript
export const BuildOptionsSchema = Schema.Struct({
  /** Enable minification to reduce bundle size. Defaults to true. */
  minify: Schema.optionalWith(Schema.Boolean, { default: () => true }),
  /** Generate source maps for debugging. Defaults to false. */
  sourceMap: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  /** Packages to exclude from the bundle (in addition to node: builtins). Defaults to []. */
  externals: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
});
```

- [ ] **Step 4: Update ConfigInputSchema**

In `src/schemas/config.ts`, update the `build` field in `ConfigInputSchema`
(lines 169-177):

```typescript
build: Schema.optional(
  Schema.Struct({
    minify: Schema.optional(Schema.Boolean),
    sourceMap: Schema.optional(Schema.Boolean),
    externals: Schema.optional(Schema.Array(Schema.String)),
  }),
),
```

- [ ] **Step 5: Update defineConfig JSDoc example**

In `src/schemas/config.ts`, update the "Full configuration" `@example` (lines
261-284). Remove `target: "es2022"` from the build options in the example.

- [ ] **Step 6: Update src/index.ts exports and JSDoc**

In `src/index.ts`:

- Remove `EsTarget` from the type export block (line 68).
- Update module-level JSDoc: change `"vercel/ncc"` to `"rsbuild"` (line 10-11).
- Update the `@example` block: remove `target: "es2022"` from build options
  (around line 43-45).

- [ ] **Step 7: Run schema tests**

```bash
pnpm vitest run src/schemas/config.test.ts -v
```

Expected: All tests pass.

- [ ] **Step 8: Update index.test.ts**

In `src/index.test.ts`, remove assertions for `target`:

- Line 13: Remove `expect(config.build.target).toBe("es2022");`
- Line 26: Remove `target: "es2023",` from input
- Line 34: Remove `expect(config.build.target).toBe("es2023");`
- Line 44: Remove `expect(config.build.target).toBe("es2022");`

- [ ] **Step 9: Run all tests**

```bash
pnpm vitest run -v
```

Expected: All pass (build-live tests may fail due to ncc removal — that's
expected and fixed in Task 3).

- [ ] **Step 10: Commit**

```bash
git add src/schemas/config.ts src/schemas/config.test.ts src/index.ts src/index.test.ts
git commit -m "feat!: remove target and quiet from BuildOptions schema

BREAKING CHANGE: BuildOptions no longer accepts target or quiet fields.
Target is hardcoded to es2024 (Node 24). The EsTarget type export is removed.

Signed-off-by: C. Spencer Beggs <spencer@savvyweb.systems>"
```

---

## Task 3: Replace ncc with rsbuild in BuildServiceLive

**Files:**

- Modify: `src/services/build-live.ts:1-238`

- [ ] **Step 1: Replace imports and remove ncc types**

Replace the top of `build-live.ts` (lines 1-64). Remove `createRequire`, all
ncc types, and the ncc import. Add rsbuild and `statSync`:

```typescript
/* v8 ignore start - build service requires actual bundling for integration testing */
/**
 * BuildService Layer implementation.
 *
 */
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Effect, Layer } from "effect";

import { createRsbuild } from "@rsbuild/core";

import { BundleFailed, CleanError, WriteError } from "../errors.js";
import type { Config } from "../schemas/config.js";
import type { BuildResult, BuildRunnerOptions, BundleResult } from "./build.js";
import { BuildService } from "./build.js";
import type { DetectedEntry } from "./config.js";
import { ConfigService } from "./config.js";
```

- [ ] **Step 2: Remove old bundle function and getBundleSize**

Delete the `bundle()` function (lines 69-78) and `getBundleSize()` function
(lines 83-85). These are replaced by rsbuild's build API and `statSync`.

- [ ] **Step 3: Write new bundleEntry function**

Replace the `bundleEntry()` function (lines 178-238):

```typescript
/**
 * Bundle a single entry with rsbuild.
 */
/* v8 ignore start - bundling requires actual rsbuild execution */
function bundleEntry(
  entry: DetectedEntry,
  config: Config,
  cwd: string,
): Effect.Effect<BundleResult, BundleFailed | WriteError> {
  return Effect.gen(function* () {
    const startTime = Date.now();
    const outputDir = resolve(cwd, "dist");

    // createRsbuild is synchronous — use Effect.try, not Effect.tryPromise
    const rsbuild = yield* Effect.try({
      try: () =>
        createRsbuild({
          rsbuildConfig: {
            source: { entry: { [entry.type]: entry.path } },
            output: {
              target: "node",
              module: true,
              distPath: { root: outputDir },
              filename: { js: "[name].js" },
              externals: [/^node:/, ...config.build.externals],
              minify: config.build.minify,
              sourceMap: config.build.sourceMap
                ? { js: "source-map" as const }
                : false,
            },
            performance: {
              chunkSplit: { strategy: "all-in-one" },
            },
          },
        }),
      catch: (error) =>
        new BundleFailed({
          entry: entry.path,
          cause: error,
        }),
    });

    const buildResult = yield* Effect.tryPromise({
      try: () => rsbuild.build(),
      catch: (error) =>
        new BundleFailed({
          entry: entry.path,
          cause: error,
        }),
    });

    // Release rsbuild resources (file watchers, worker threads)
    yield* Effect.promise(() => buildResult.close());

    const outputPath = resolve(outputDir, `${entry.type}.js`);
    const size = statSync(outputPath).size;
    const duration = Date.now() - startTime;

    return {
      success: true,
      stats: {
        entry: entry.type,
        size,
        duration,
        outputPath: entry.output,
      },
    };
  });
}
/* v8 ignore stop */
```

- [ ] **Step 4: Update build method references**

In the `build()` method of `BuildServiceLive` (lines 258-311), no structural
changes needed — it already calls `bundleEntry()` and handles results correctly.
Just verify it compiles.

- [ ] **Step 5: Run typecheck**

```bash
pnpm run typecheck
```

Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/build-live.ts
git commit -m "feat: replace ncc with rsbuild in BuildServiceLive

Replace @vercel/ncc bundling with @rsbuild/core. Uses createRsbuild()
programmatic API with ESM output (output.module: true), single-file
bundling (all-in-one chunk strategy), and automatic node: externalization.

Signed-off-by: C. Spencer Beggs <spencer@savvyweb.systems>"
```

---

## Task 4: Update JSDoc and template strings

**Files:**

- Modify: `src/errors.ts:344-349` (BundleFailed JSDoc)
- Modify: `src/services/build.ts:108-110` (BuildService JSDoc)
- Modify: `src/github-action.ts:154,309` (docstring example + ncc reference)
- Modify: `src/cli/commands/init.ts:131-132` (template config)

- [ ] **Step 1: Update BundleFailed JSDoc**

In `src/errors.ts` line 344, change:

```typescript
/**
 * Error when bundling with ncc fails.
```

to:

```typescript
/**
 * Error when bundling with rsbuild fails.
```

- [ ] **Step 2: Update BuildService JSDoc**

In `src/services/build.ts` line 110, change:

```typescript
 * - Bundling TypeScript entries with vercel/ncc
```

to:

```typescript
 * - Bundling TypeScript entries with rsbuild
```

- [ ] **Step 3: Update GitHubAction docstring example**

In `src/github-action.ts` line 154, change:

```typescript
 *       build: { minify: true, target: "es2022" },
```

to:

```typescript
 *       build: { minify: true },
```

- [ ] **Step 4: Update GitHubAction ncc reference**

In `src/github-action.ts` line 309, change:

```typescript
 * 3. Bundles each entry point with vercel/ncc
```

to:

```typescript
 * 3. Bundles each entry point with rsbuild
```

- [ ] **Step 5: Update init template**

In `src/cli/commands/init.ts`, update the commented-out build options in the
template (around line 131). Remove the `target` line:

```typescript
 // Build options
 // build: {
 //   minify: true,
 //   sourceMap: false,
 // },
```

- [ ] **Step 6: Commit**

```bash
git add src/errors.ts src/services/build.ts src/github-action.ts src/cli/commands/init.ts
git commit -m "docs: update JSDoc and templates for ncc→rsbuild migration

Signed-off-by: C. Spencer Beggs <spencer@savvyweb.systems>"
```

---

## Task 5: Verify everything works end-to-end

- [ ] **Step 1: Run linting**

```bash
pnpm run lint:fix
```

Expected: Clean or auto-fixed.

- [ ] **Step 2: Run typecheck**

```bash
pnpm run typecheck
```

Expected: No errors.

- [ ] **Step 3: Run all tests**

```bash
pnpm run test
```

Expected: All pass. If build integration tests exist that invoke the actual
bundler, they should now exercise rsbuild instead of ncc.

- [ ] **Step 4: Run build**

```bash
pnpm run build
```

Expected: Package builds successfully (this builds the github-action-builder
package itself via rslib, not the action bundling).

- [ ] **Step 5: Fix any issues found**

Address any failures from the above steps. Common issues:

- Rsbuild config type mismatches (check `@rsbuild/core` types)
- Missing rsbuild peer deps
- Source map config format differences

- [ ] **Step 6: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: address issues from end-to-end verification

Signed-off-by: C. Spencer Beggs <spencer@savvyweb.systems>"
```
