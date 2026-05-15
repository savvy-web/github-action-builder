# `build.ignore` Config Option Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `build.ignore` config option that replaces excluded modules with a throwing stub so optional transitive dependencies the action never exercises do not have to be bundled or resolved.

**Architecture:** A new `string[]` field on the build config schema. In the build service, when `ignore` is non-empty, the builder writes a tiny ESM stub to the OS temp dir and adds a `resolve.alias` entry mapping each ignored specifier to that stub. rspack bundles the stub in place of the real module; any load of an ignored module throws. `ignore` takes precedence over `externals`.

**Tech Stack:** TypeScript, Effect (Schema + Layer), `@rsbuild/core` (rspack), Vitest.

**Spec:** `docs/superpowers/specs/2026-05-15-build-ignore-option-design.md`

---

## File Structure

- `src/schemas/config.ts` — add `ignore` to `BuildOptionsSchema` and `ConfigInputSchema.build`; update the `defineConfig` docstring example.
- `src/schemas/config.test.ts` — unit tests for the `ignore` schema field.
- `src/services/build-live.ts` — write the throwing stub, add `resolve.alias`, add the `ignore`-over-`externals` precedence guard.
- `__test__/integration/fixtures/ignore-modules/` — new integration fixture (`action.yml`, `src/main.ts`, `vendor/optional-loader.cjs`, `vendor/optional-loader.d.cts`).
- `__test__/integration/ignore-modules.int.test.ts` — new end-to-end regression test.

---

## Task 1: Commit the pending #81 regression fix

The branch already contains the completed, verified #81 string-externals regression fix (in `src/services/build-live.ts`) and its `string-externals` integration test, all uncommitted. Commit it as its own change before starting feature work so the feature commits stay clean.

**Files:**

- Modify: `src/services/build-live.ts` (already changed — the regression fix)
- Test: `__test__/integration/string-externals.int.test.ts` (already created)
- Plus the fixture under `__test__/integration/fixtures/string-externals/`

- [ ] **Step 1: Confirm the working tree state**

Run: `git status --short`
Expected: `src/services/build-live.ts` shown as modified (`M`), and `__test__/integration/string-externals.int.test.ts` plus `__test__/integration/fixtures/string-externals/` shown as untracked (`??`).

- [ ] **Step 2: Confirm the regression fix works**

Run: `pnpm vitest run __test__/integration/string-externals.int.test.ts`
Expected: PASS — 1 test passes ("externalizes node: builtins and configured string externals").

- [ ] **Step 3: Stage and commit**

```bash
git add src/services/build-live.ts __test__/integration/string-externals.int.test.ts __test__/integration/fixtures/string-externals
git commit -m "$(cat <<'EOF'
fix(build): honor configured string externals alongside node: builtins

0.6.4 regressed user-configured string externals: leading the externals
array with a function stopped rspack from consulting the trailing string
entries, so configured externals were bundled and hard-failed to resolve.
Fold the whole externalization decision into a single function. Adds a
regression integration test.

Signed-off-by: C. Spencer Beggs <spencer@beggs.codes>
EOF
)"
```

Expected: commit succeeds (pre-commit lint-staged and commit-msg hooks pass).

---

## Task 2: Add `ignore` to the config schema

**Files:**

- Modify: `src/schemas/config.ts`
- Test: `src/schemas/config.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/schemas/config.test.ts`, inside the `describe("BuildOptions Schema", ...)` block, add these two tests immediately after the existing `it("decodes from plain object", ...)` test (before that block's closing `});`):

```ts
 it("defaults ignore to an empty array", () => {
  const options = Schema.decodeUnknownSync(BuildOptionsSchema)({});
  expect(options.ignore).toEqual([]);
 });

 it("accepts an ignore list", () => {
  const options = Schema.decodeUnknownSync(BuildOptionsSchema)({
   ignore: ["libxmljs2"],
  });
  expect(options.ignore).toEqual(["libxmljs2"]);
 });
```

In the same file, inside the `describe("ConfigInput Schema", ...)` block, add this test immediately after the existing `it("decodes from plain object", ...)` test (before that block's closing `});`):

```ts
 it("accepts build.ignore", () => {
  const input = Schema.decodeUnknownSync(ConfigInputSchema)({
   build: { ignore: ["libxmljs2"] },
  });
  expect(input.build?.ignore).toEqual(["libxmljs2"]);
 });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/schemas/config.test.ts`
Expected: FAIL — the two `ignore` assertions fail because `options.ignore` / `input.build?.ignore` are `undefined` (the schema has no `ignore` field yet).

- [ ] **Step 3: Add `ignore` to `BuildOptionsSchema`**

In `src/schemas/config.ts`, in `BuildOptionsSchema`, add the `ignore` field immediately after the `externals` field:

```ts
export const BuildOptionsSchema = Schema.Struct({
 /** Enable minification to reduce bundle size. Defaults to true. */
 minify: Schema.optionalWith(Schema.Boolean, { default: () => true }),
 /** Generate source maps for debugging. Defaults to false. */
 sourceMap: Schema.optionalWith(Schema.Boolean, { default: () => false }),
 /** Packages to exclude from the bundle (in addition to node: builtins). Defaults to []. */
 externals: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
 /** Packages to exclude from the bundle and replace with a stub that throws if loaded at runtime. Use for optional transitive dependencies the action never exercises (e.g. native modules). Defaults to []. */
 ignore: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
});
```

- [ ] **Step 4: Add `ignore` to `ConfigInputSchema`**

In `src/schemas/config.ts`, in `ConfigInputSchema`, add `ignore` to the inline `build` struct immediately after its `externals` field:

```ts
 build: Schema.optional(
  Schema.Struct({
   minify: Schema.optional(Schema.Boolean),
   sourceMap: Schema.optional(Schema.Boolean),
   externals: Schema.optional(Schema.Array(Schema.String)),
   ignore: Schema.optional(Schema.Array(Schema.String)),
  }),
 ),
```

- [ ] **Step 5: Update the `defineConfig` docstring example**

In `src/schemas/config.ts`, in the `defineConfig` JSDoc "Full configuration with all options" example, add an `ignore` line immediately after the `externals` line:

```ts
 *   build: {
 *     minify: true,
 *     sourceMap: true,
 *     externals: ["@aws-sdk/client-s3"],
 *     ignore: ["libxmljs2"],
 *   },
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm vitest run src/schemas/config.test.ts`
Expected: PASS — all `BuildOptions Schema` and `ConfigInput Schema` tests pass.

- [ ] **Step 7: Run the full unit suite and type check**

Run: `pnpm vitest run && pnpm run typecheck`
Expected: all unit tests pass; type check reports no errors.

- [ ] **Step 8: Commit**

```bash
git add src/schemas/config.ts src/schemas/config.test.ts
git commit -m "$(cat <<'EOF'
feat(config): add build.ignore option to the config schema

build.ignore lists modules to exclude from the bundle and replace with
a throwing stub, for optional transitive dependencies the action never
exercises. This commit adds the schema field only; the build service
wiring follows.

Signed-off-by: C. Spencer Beggs <spencer@beggs.codes>
EOF
)"
```

Expected: commit succeeds.

---

## Task 3: Implement `ignore` handling in the build service

This task creates the integration fixture and test, confirms the test fails, then implements the bundler wiring and confirms it passes.

**Files:**

- Create: `__test__/integration/fixtures/ignore-modules/action.yml`
- Create: `__test__/integration/fixtures/ignore-modules/vendor/optional-loader.cjs`
- Create: `__test__/integration/fixtures/ignore-modules/vendor/optional-loader.d.cts`
- Create: `__test__/integration/fixtures/ignore-modules/src/main.ts`
- Create: `__test__/integration/ignore-modules.int.test.ts`
- Modify: `src/services/build-live.ts`

- [ ] **Step 1: Create the fixture manifest**

Create `__test__/integration/fixtures/ignore-modules/action.yml`:

```yaml
name: ignore-modules
description: Integration fixture for the build.ignore option (issue #81).
runs:
  using: node24
  main: dist/main.js
```

- [ ] **Step 2: Create the optional-dependency loader**

Create `__test__/integration/fixtures/ignore-modules/vendor/optional-loader.cjs`:

```js
"use strict";
// Mirrors the optional-dependency pattern used by packages such as cyclonedx:
// an optional native module is required inside a try/catch, so an absent
// module is treated as "feature unavailable" rather than crashing the action.
// "excluded-native-dep" is intentionally NOT present in node_modules.
Object.defineProperty(exports, "__esModule", { value: true });
let available;
try {
 require("excluded-native-dep");
 available = true;
} catch {
 available = false;
}
exports.xmlAvailable = available;
```

- [ ] **Step 3: Create the loader's type declaration**

Create `__test__/integration/fixtures/ignore-modules/vendor/optional-loader.d.cts`:

```ts
export declare const xmlAvailable: boolean;
```

- [ ] **Step 4: Create the fixture entry point**

Create `__test__/integration/fixtures/ignore-modules/src/main.ts`:

```ts
import { xmlAvailable } from "../vendor/optional-loader.cjs";

process.stdout.write(`xmlAvailable=${xmlAvailable}\n`);
```

- [ ] **Step 5: Create the integration test**

Create `__test__/integration/ignore-modules.int.test.ts`:

```ts
/**
 * Integration test for the build.ignore option (issue #81 design).
 *
 * A module listed in build.ignore must be replaced with a stub that throws if
 * loaded, so the build succeeds even when the module is absent from
 * node_modules and a try/catch-guarded require treats it as unavailable.
 */
import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { GitHubAction } from "../../src/index.js";

const fixtureDir = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures/ignore-modules");
const mainJs = join(fixtureDir, "dist", "main.js");

describe("issue #81: build.ignore option", () => {
 it("stubs ignored modules so the build succeeds and the stub throws at runtime", async () => {
  rmSync(join(fixtureDir, "dist"), { recursive: true, force: true });
  const action = GitHubAction.create({
   cwd: fixtureDir,
   skipValidation: true,
   config: {
    build: { minify: false, ignore: ["excluded-native-dep"] },
    persistLocal: { enabled: false },
   },
  });
  const result = await action.build();

  // The build succeeds even though "excluded-native-dep" is absent from
  // node_modules — build.ignore replaces it with a throwing stub.
  expect(result.success).toBe(true);
  expect(existsSync(mainJs)).toBe(true);

  // At runtime the stubbed require throws; the fixture's try/catch catches
  // it and reports the optional dependency as unavailable.
  const output = execFileSync("node", [mainJs], {
   encoding: "utf8",
   stdio: ["ignore", "pipe", "pipe"],
  });
  expect(output.trim()).toBe("xmlAvailable=false");
 }, 120_000);
});
```

- [ ] **Step 6: Run the integration test to verify it fails**

Run: `pnpm vitest run __test__/integration/ignore-modules.int.test.ts`
Expected: FAIL — `expect(result.success).toBe(true)` fails (received `false`). The build hard-fails because rspack cannot resolve the string-literal `require("excluded-native-dep")` and `ignore` is not yet wired into the build service.

- [ ] **Step 7: Add the `node:os` import and the stub source constant**

In `src/services/build-live.ts`, add the `node:os` import between the existing `node:fs` and `node:path` imports:

```ts
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
```

Then, immediately after the import block (after the line `import { ConfigService } from "./config.js";`), add the stub source constant:

```ts
/**
 * Source of the stub module that replaces packages listed in `build.ignore`.
 * It is bundled in place of the real module and throws if ever loaded.
 */
const IGNORE_STUB_SOURCE = `throw new Error("A module excluded via the build 'ignore' option was loaded at runtime.");\n`;
```

- [ ] **Step 8: Write the stub and build the alias map in `bundleEntry`**

In `src/services/build-live.ts`, in the `bundleEntry` function, insert the stub-write and alias-map logic immediately after the `const outputDir = resolve(cwd, "dist");` line:

```ts
 return Effect.gen(function* () {
  const startTime = Date.now();
  const outputDir = resolve(cwd, "dist");

  // Modules listed in `build.ignore` are aliased to a throwing stub so
  // they are neither bundled nor resolved against node_modules. See
  // docs/superpowers/specs/2026-05-15-build-ignore-option-design.md.
  const stubPath = resolve(tmpdir(), "github-action-builder-ignore-stub.mjs");
  const ignoreAlias: Record<string, string> = {};
  for (const moduleName of config.build.ignore) {
   ignoreAlias[`${moduleName}$`] = stubPath;
  }
  if (config.build.ignore.length > 0) {
   yield* writeFile(stubPath, IGNORE_STUB_SOURCE);
  }

  // createRsbuild returns a Promise<RsbuildInstance>
```

- [ ] **Step 9: Add `resolve.alias` to the rsbuild config**

In `src/services/build-live.ts`, in the `rsbuildConfig` object passed to `createRsbuild`, add a `resolve` key immediately after the `source` key:

```ts
     rsbuildConfig: {
      source: { entry: { [entry.type]: entry.path } },
      resolve: { alias: ignoreAlias },
      output: {
```

- [ ] **Step 10: Add the `ignore`-over-`externals` precedence guard**

In `src/services/build-live.ts`, in the `externals` decision function, replace the existing externals check:

```ts
        if (config.build.externals.includes(request)) {
         return request;
        }
```

with the guarded version:

```ts
        // `ignore` takes precedence over `externals`: a module in
        // both lists is stubbed via resolve.alias, not externalized.
        if (
         config.build.externals.includes(request) &&
         !config.build.ignore.includes(request)
        ) {
         return request;
        }
```

- [ ] **Step 11: Run the integration test to verify it passes**

Run: `pnpm vitest run __test__/integration/ignore-modules.int.test.ts`
Expected: PASS — the build succeeds and the bundled action prints `xmlAvailable=false`.

- [ ] **Step 12: Run the full suite, lint, and type check**

Run: `pnpm vitest run && pnpm run lint && pnpm run typecheck`
Expected: all unit and integration tests pass; lint reports no errors; type check reports no errors.

- [ ] **Step 13: Commit**

```bash
git add src/services/build-live.ts __test__/integration/ignore-modules.int.test.ts __test__/integration/fixtures/ignore-modules
git commit -m "$(cat <<'EOF'
feat(build): stub modules listed in build.ignore

When build.ignore is non-empty, the builder writes a throwing ESM stub to
the OS temp dir and aliases each ignored specifier to it, so the module is
neither bundled nor resolved. ignore takes precedence over externals. Adds
an end-to-end integration test.

Signed-off-by: C. Spencer Beggs <spencer@beggs.codes>
EOF
)"
```

Expected: commit succeeds.

---

## Self-Review

**Spec coverage:**

- Config API (`BuildOptionsSchema` + `ConfigInputSchema` + `defineConfig` docstring) — Task 2.
- Bundler mechanism (temp `.mjs` throwing stub + `resolve.alias`) — Task 3, Steps 7-9.
- Exact-specifier matching (`${moduleName}$` alias key) — Task 3, Step 8.
- Precedence (`ignore` over `externals`) — Task 3, Step 10.
- Error handling (stub write via existing `writeFile`/`WriteError`; empty `ignore` ⇒ no stub, empty alias) — Task 3, Step 8 (`writeFile` returns `Effect<void, WriteError>`, already in `bundleEntry`'s error union; the `if (config.build.ignore.length > 0)` guard skips IO when empty).
- Testing (unit + integration) — Tasks 2 and 3.
- Documentation: docstrings done in Task 2; the design doc and README are updated by the documentation agents at finalize time (recorded in the spec, out of scope for these tasks).
- The #81 regression fix relationship — Task 1 commits it independently.

**Placeholder scan:** No TBD/TODO/placeholder steps; every code step shows complete code.

**Type consistency:** `IGNORE_STUB_SOURCE` (string const) is defined in Step 7 and used in Step 8. `ignoreAlias` (`Record<string, string>`) is defined in Step 8 and used in Step 9. `stubPath` is defined and used within Step 8. `config.build.ignore` (`readonly string[]`, from the Task 2 schema field) is read in Steps 8 and 10. `writeFile` is the existing helper in `build-live.ts`.
