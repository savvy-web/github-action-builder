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
