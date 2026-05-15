# Design: `build.ignore` config option

**Date:** 2026-05-15
**Branch:** `bug/bundling`
**Related:** issue #81 (design question section), issue #79 (the `node:` interop fix that this builds on)

## Overview

Add a `build.ignore` configuration option to `@savvy-web/github-action-builder`.
It lists module specifiers that should be neither bundled nor externalized, but
replaced with a stub that throws when the module is required or imported at
runtime.

## Motivation

The builder already has `build.externals` — modules that are not bundled because
they *are* available at runtime (`node:` builtins, genuine peer dependencies).

There is no tool for the opposite case: an optional transitive dependency that
the action never exercises and that will *not* be present at runtime. The
deployed action ships only `dist/main.js` with no `node_modules`.

Today consumers misuse `externals` for this. Example: a dependency pulls in
`libxmljs2` (a native module that cannot be bundled at all), `xmlbuilder2`, and
`ajv-formats-draft2019` as optional plugins. Listing them in `externals` "works"
only because the consuming library wraps each optional `require` in its own
`try/catch` — the externalized reference throws at runtime and the `try/catch`
treats the dependency as absent.

`ignore` makes that intent explicit and correct: a module that is excluded from
the bundle and is known not to be available at runtime.

## Config API

A new field on `BuildOptionsSchema`, symmetric with `externals`:

```ts
build: {
  externals: ["@aws-sdk/client-s3"],   // not bundled — IS available at runtime
  ignore:    ["libxmljs2"],             // not bundled — NOT available; stubbed
}
```

Schema changes:

- `BuildOptionsSchema` (resolved config) gains:
  `ignore: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] })`
- `ConfigInputSchema.build` (user input) gains:
  `ignore: Schema.optional(Schema.Array(Schema.String))`

Matching is **exact specifier match** — the same rule `externals` uses (a bare
string array element matches the request exactly). `ignore: ["libxmljs2"]`
matches `import "libxmljs2"` / `require("libxmljs2")` but not a deep import such
as `libxmljs2/lib/foo`. Subpath matching is out of scope for this version.

When `ignore` is empty (the default), the build behaves exactly as before — no
`resolve.alias`, no stub written.

## Bundler mechanism

Implemented in `src/services/build-live.ts`, where the rsbuild config is
constructed.

When `config.build.ignore` is non-empty:

1. The builder writes a small static **ESM throwing stub** to the OS temp
   directory. The file uses a `.mjs` extension so rspack parses it
   unambiguously as `javascript/esm`. Its body is a single statement:

   ```js
   throw new Error("A module excluded via the build 'ignore' option was loaded at runtime.");
   ```

2. The rsbuild config gains a `resolve.alias` entry mapping each ignored
   specifier to the stub's absolute path.

3. rspack resolves the alias to that real local file and bundles the stub in
   place of the real module. Any `require()` / `import` of an ignored module
   evaluates the stub, which throws.

Notes:

- The stub file is bundled by rspack and never loaded directly by Node, so
  Node's module-type rules do not apply to it. The `.mjs` extension is purely
  to make rspack's parse unambiguous and to stay consistent with the builder's
  ESM-everywhere output. CJS vs ESM is functionally equivalent for a
  no-exports throw-only module; ESM is chosen for pipeline consistency.
- The stub message is generic (it does not name the specific module) because a
  single shared stub file backs every ignored specifier. The consuming
  `try/catch` does not depend on the message; the message only aids the
  unguarded-failure case.

### Runtime behavior

- A `try/catch`-guarded optional `require` (the cyclonedx pattern) catches the
  thrown error and correctly treats the dependency as unavailable.
- An unguarded `import` of an ignored module fails loudly at action startup
  with a clear, build-origin error message — preferred over a confusing
  downstream `undefined`.

## Precedence

`ignore` takes precedence over `externals`. The externals decision function in
`build-live.ts` gains one guard: it will not externalize a request that is also
present in `config.build.ignore`, so a module listed in both is always stubbed.

Documented guidance: do not list a module in both; `ignore` wins.

## Error handling

- Invalid config (non-string-array) is rejected by Effect Schema validation, as
  with every other config field.
- A failure writing the stub file surfaces through the existing
  `BundleFailed` / `WriteError` error types.
- Empty `ignore` ⇒ no `resolve.alias`, no stub written, no behavior change.

## Testing

### Unit

- `BuildOptionsSchema` accepts `build.ignore` and defaults it to `[]`.
- `ConfigInputSchema` accepts an optional `build.ignore`.

### Integration

New fixture `__test__/integration/fixtures/ignore-modules/`, auto-discovered by
`@savvy-web/vitest` as part of the `:int` project:

- `action.yml` — minimal node24 manifest.
- `vendor/optional-loader.cjs` — a bundled CommonJS module that does
  `try { require("excluded-native-dep") } catch { /* unavailable */ }` and
  exports an availability flag. `excluded-native-dep` is deliberately absent
  from `node_modules`.
- `vendor/optional-loader.d.cts` — declaration for the `.cjs` import.
- `src/main.ts` — imports the loader and prints the availability flag.

Test `__test__/integration/ignore-modules.int.test.ts`:

1. Build the fixture with `config.build.ignore: ["excluded-native-dep"]`.
2. Assert `result.success === true` — the build succeeds even though
   `excluded-native-dep` is not installed, because it is stubbed rather than
   resolved.
3. Run `dist/main.js` with node and assert it reports the dependency as
   unavailable — proving the stub throws and the `try/catch` catches it
   end-to-end.

## Documentation

To be updated (by the documentation agents at finalize time; recorded here so
nothing is missed):

- `BuildOptionsSchema` / `ConfigInputSchema` docstrings in `src/schemas/config.ts`.
- The `defineConfig` example in the `config.ts` module docstring — add `ignore`.
- `.claude/design/github-action-builder/architecture.md` — config table and
  bundler configuration section.
- `README.md` — externals / ignore configuration docs.

## Out of scope

- Subpath / glob matching for `ignore` entries (exact match only for now).
- Per-module configurable behavior (empty module vs throwing stub). The single
  throwing-stub behavior covers the known use case; a mode flag can be added
  later as a non-breaking change if an unguarded-top-level-require case ever
  arises.
- Changes to `externals` semantics beyond the precedence guard.

## Relationship to the #81 regression fix

This feature ships on the same `bug/bundling` branch as the issue #81 string
externals regression fix. The regression fix is independent and already
complete; this feature is additive.
