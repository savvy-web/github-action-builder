# Configuration

This guide covers all configuration options for `@savvy-web/github-action-builder`.

## Configuration File

Create `action.config.ts` in your project root to customize the build process.
The file is optional - the builder uses sensible defaults without it.

```typescript
import { GitHubAction } from "@savvy-web/github-action-builder";

export default GitHubAction.create({
  entries: { /* ... */ },
  build: { /* ... */ },
  validation: { /* ... */ },
});
```

The `GitHubAction.create()` helper provides TypeScript autocomplete and validates
your configuration at build time.

## Configuration Sections

### entries

Configure entry point paths for your action.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `main` | `string` | `"src/main.ts"` | Main action entry point (required) |
| `pre` | `string` | `undefined` | Pre-action hook (runs before main) |
| `post` | `string` | `undefined` | Post-action hook (runs after main) |

#### Custom Entry Points

```typescript
import { GitHubAction } from "@savvy-web/github-action-builder";

export default GitHubAction.create({
  entries: {
    main: "src/action.ts",
    pre: "src/setup.ts",
    post: "src/cleanup.ts",
  },
});
```

#### Main Only (Default Behavior)

```typescript
import { GitHubAction } from "@savvy-web/github-action-builder";

export default GitHubAction.create({
  entries: {
    main: "src/main.ts",
    // pre and post are auto-detected if files exist
  },
});
```

#### Auto-Detection

If you do not specify `pre` or `post` in your config, the builder automatically
detects these files:

* `src/pre.ts` - included if exists
* `src/post.ts` - included if exists

The `main` entry point (`src/main.ts` by default) is always required.

### build

Configure how your action is bundled.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `minify` | `boolean` | `true` | Minify output for smaller bundles |
| `target` | `string` | `"es2022"` | ECMAScript target version |
| `sourceMap` | `boolean` | `false` | Generate source maps |
| `externals` | `string[]` | `[]` | Packages to exclude from bundle |
| `quiet` | `boolean` | `false` | Suppress build output |

#### Development Build with Source Maps

```typescript
import { GitHubAction } from "@savvy-web/github-action-builder";

export default GitHubAction.create({
  build: {
    minify: false,
    sourceMap: true,
  },
});
```

#### Exclude Packages from Bundle

```typescript
import { GitHubAction } from "@savvy-web/github-action-builder";

export default GitHubAction.create({
  build: {
    externals: ["@aws-sdk/client-s3"],
  },
});
```

#### Build Options Details

##### minify

When `true` (default), the bundled output is minified to reduce file size. This
removes whitespace, shortens variable names, and applies other optimizations.

Disable for easier debugging:

```typescript
build: {
  minify: false,
}
```

##### target

The ECMAScript target for the output. Valid values:

* `"es2020"`
* `"es2021"`
* `"es2022"` (default)
* `"es2023"`
* `"es2024"`

The target affects which JavaScript features are used in the output. Since
GitHub Actions runs Node.js 24, `es2022` or later is recommended.

##### sourceMap

When `true`, generates source map files alongside the bundled JavaScript. Source
maps help with debugging by mapping minified code back to your original
TypeScript source.

Source maps are **disabled by default** because:

* They increase bundle size
* GitHub Actions errors show the bundled line numbers anyway
* Most users do not need them for production actions

Enable for debugging:

```typescript
build: {
  sourceMap: true,
}
```

##### externals

An array of package names to exclude from the bundle. Use this when:

* A package cannot be bundled (native modules)
* You want to reduce bundle size for packages that will be installed separately
* Testing with mocked dependencies

```typescript
build: {
  externals: ["sharp", "@aws-sdk/client-s3"],
}
```

**Note:** External packages must be installed in the action's runtime
environment, which is not typical for GitHub Actions. Use sparingly.

##### quiet

When `true`, suppresses non-error build output. Useful in CI pipelines where
you only want to see errors.

```typescript
build: {
  quiet: true,
}
```

### validation

Configure validation behavior.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `requireActionYml` | `boolean` | `true` | Require action.yml to exist |
| `maxBundleSize` | `string` | `undefined` | Maximum bundle size (e.g., "5mb") |
| `strict` | `boolean` | `undefined` | Treat warnings as errors |

#### Set Bundle Size Limit

```typescript
import { GitHubAction } from "@savvy-web/github-action-builder";

export default GitHubAction.create({
  validation: {
    maxBundleSize: "10mb",
    strict: true,
  },
});
```

#### Skip action.yml Validation

```typescript
import { GitHubAction } from "@savvy-web/github-action-builder";

export default GitHubAction.create({
  validation: {
    requireActionYml: false,
  },
});
```

#### Validation Options Details

##### requireActionYml

When `true` (default), the build fails if `action.yml` is missing or invalid.

Set to `false` if you are building a library or testing without an action.yml:

```typescript
validation: {
  requireActionYml: false,
}
```

##### maxBundleSize

Set a maximum bundle size. If the bundle exceeds this limit, validation fails.
Useful for keeping actions fast to download.

Supported units:

* `"500kb"` - kilobytes
* `"5mb"` - megabytes

```typescript
validation: {
  maxBundleSize: "5mb",
}
```

##### strict

Controls whether warnings are treated as errors.

* `undefined` (default): Auto-detects from environment
  * In CI (`CI=true`): warnings become errors
  * Locally: warnings are shown but build continues
* `true`: Always treat warnings as errors
* `false`: Never treat warnings as errors

```typescript
validation: {
  strict: true, // Always fail on warnings
}
```

### persistLocal

Configure automatic persistence of build output to a local action directory
for testing with [nektos/act](https://github.com/nektos/act).

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Enable/disable persisting build output locally |
| `path` | `string` | `".github/actions/local"` | Output directory relative to project root |
| `actTemplate` | `boolean` | `true` | Generate act boilerplate files if they don't exist |

#### Default Behavior

With no configuration, `persistLocal` is enabled. After each build, the builder
copies `action.yml` and `dist/` to `.github/actions/local/` and generates act
template files (`.actrc` and `.github/workflows/act-test.yml`) if they do not
already exist.

#### Custom Output Path

```typescript
import { defineConfig } from "@savvy-web/github-action-builder";

export default defineConfig({
  persistLocal: {
    path: ".github/actions/my-action",
  },
});
```

#### Disable Persist Local

```typescript
import { defineConfig } from "@savvy-web/github-action-builder";

export default defineConfig({
  persistLocal: {
    enabled: false,
  },
});
```

#### Persist Local Options Details

##### enabled

When `true` (default), the builder copies `action.yml` and the `dist/`
directory to the local action path after every successful build. Uses hash-based
comparison to skip unchanged files and removes stale files from the destination.

Disable to skip local persistence entirely:

```typescript
persistLocal: {
  enabled: false,
}
```

You can also skip persistence for a single build using the `--no-persist` CLI
flag without changing your configuration.

##### path

The output directory for the local action, relative to the project root.
Defaults to `".github/actions/local"`.

The directory is created automatically if it does not exist.

```typescript
persistLocal: {
  path: ".github/actions/dev",
}
```

##### actTemplate

When `true` (default), the builder generates act boilerplate files if they do
not already exist:

* `.actrc` - Default act options
* `.github/workflows/act-test.yml` - Minimal workflow for local testing

Existing files are never overwritten. Set to `false` if you manage these files
yourself:

```typescript
persistLocal: {
  actTemplate: false,
}
```

For a detailed guide on local testing with act, see
[Local Testing](./local-testing.md).

## Full Configuration Example

```typescript
import { GitHubAction } from "@savvy-web/github-action-builder";

export default GitHubAction.create({
  // Entry points
  entries: {
    main: "src/main.ts",
    pre: "src/pre.ts",
    post: "src/post.ts",
  },

  // Build options
  build: {
    minify: true,
    target: "es2022",
    sourceMap: false,
    externals: [],
    quiet: false,
  },

  // Validation
  validation: {
    requireActionYml: true,
    maxBundleSize: "10mb",
    strict: undefined, // Auto-detect from CI
  },

  // Persist local
  persistLocal: {
    enabled: true,
    path: ".github/actions/local",
    actTemplate: true,
  },
});
```

## Zero Configuration

The builder works without any configuration file. These defaults are applied:

```typescript
{
  entries: {
    main: "src/main.ts",
    // pre/post auto-detected if files exist
  },
  build: {
    minify: true,
    target: "es2022",
    sourceMap: false,
    externals: [],
    quiet: false,
  },
  validation: {
    requireActionYml: true,
    strict: undefined, // CI-aware
  },
  persistLocal: {
    enabled: true,
    path: ".github/actions/local",
    actTemplate: true,
  },
}
```

## Config File Location

The builder looks for configuration in this order:

1. Path specified with `--config` flag
2. `action.config.ts` in the current directory

Only TypeScript configuration files are supported to ensure proper ESM and
Node.js 24 compatibility.

## Programmatic Configuration

When using the programmatic API, pass configuration directly:

```typescript
import { GitHubAction } from "@savvy-web/github-action-builder";

const action = GitHubAction.create({
  config: {
    build: {
      minify: false,
      sourceMap: true,
    },
  },
});

const result = await action.build();
```

Or reference a config file:

```typescript
const action = GitHubAction.create({
  config: "./custom.config.ts",
});
```

## Related Documentation

* [CLI Reference](./cli-reference.md) - Command-line options
* [Getting Started](./getting-started.md) - Project setup
* [Troubleshooting](./troubleshooting.md) - Common issues
