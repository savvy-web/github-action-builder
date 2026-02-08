# Getting Started

This guide walks you through setting up your first GitHub Action with
`@savvy-web/github-action-builder`.

## Prerequisites

- **Node.js 24** or later
- **npm**, **pnpm**, or **yarn**
- A GitHub repository for your action

## Quick Start

Create a new GitHub Action project with a single command:

```bash
npx @savvy-web/github-action-builder init my-action
cd my-action
npm install
npm run build
```

This creates a complete, ready-to-build project. Edit `src/main.ts` with your
action logic and run `npm run build` again.

## Generated Project Structure

The `init` command creates this structure:

```text
my-action/
├── src/
│   ├── main.ts      # Main action entry point
│   ├── pre.ts       # Pre-action hook (runs before main)
│   └── post.ts      # Post-action cleanup (runs after main)
├── action.yml       # GitHub Action metadata
├── action.config.ts # Build configuration
├── package.json     # Dependencies and scripts
└── tsconfig.json    # TypeScript configuration
```

## Understanding the Generated Files

### action.config.ts

The build configuration file:

```typescript
import { GitHubAction } from "@savvy-web/github-action-builder";

export default GitHubAction.create({
  // Entry points are auto-detected from src/main.ts, src/pre.ts, src/post.ts
  // Uncomment to customize:
  // entries: {
  //   main: "src/main.ts",
  //   pre: "src/pre.ts",
  //   post: "src/post.ts",
  // },

  // Build options
  // build: {
  //   minify: true,
  //   sourceMap: false,
  //   target: "es2022",
  // },
});
```

### action.yml

The GitHub Action metadata. The `runs.using` field **must** be `node24`:

```yaml
name: "my-action"
description: "A GitHub Action built with @savvy-web/github-action-builder"

inputs:
  example-input:
    description: "An example input"
    required: false
    default: "hello"

outputs:
  example-output:
    description: "An example output"

runs:
  using: "node24"
  main: "dist/main.js"
  pre: "dist/pre.js"
  post: "dist/post.js"

branding:
  icon: "zap"
  color: "blue"
```

### src/main.ts

The main action entry point:

```typescript
import * as core from "@actions/core";

async function run(): Promise<void> {
  try {
    const input = core.getInput("example-input");
    core.info(`Running main action with input: ${input}`);

    // Your main action logic goes here

    core.setOutput("example-output", "success");
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("An unexpected error occurred");
    }
  }
}

run();
```

## Alternative Installation Methods

### Global Installation

Install globally to use the `github-action-builder` command anywhere:

```bash
npm install -g @savvy-web/github-action-builder
```

### Project Installation

Install as a dev dependency (already included in generated projects):

```bash
npm install --save-dev @savvy-web/github-action-builder
```

### Using npx

Run any command without installing:

```bash
npx @savvy-web/github-action-builder build
npx @savvy-web/github-action-builder validate
```

## Building Your Action

### First Build

Run the build command:

```bash
npm run build
```

You will see output like:

```text
Loading configuration...
  Found action.config.ts

Validating...
  All checks passed

Building...

Build Summary:
  ✓ main: 474.7 KB (909ms) → dist/main.js
  ✓ pre: 474.6 KB (632ms) → dist/pre.js
  ✓ post: 474.6 KB (561ms) → dist/post.js

Total time: 2102ms

Build completed successfully!
```

### Understanding the Output

After building, your `dist/` directory contains:

```text
dist/
├── main.js       # Bundled main action
├── pre.js        # Bundled pre-action hook
├── post.js       # Bundled post-action cleanup
└── package.json  # ESM module marker { "type": "module" }
```

Each bundled file:

- Contains all your code and dependencies in a single file
- Is minified by default for smaller size
- Runs on Node.js 24 in GitHub Actions

## Validation and Type Checking

### Validate Configuration

Check your `action.yml` and configuration without building:

```bash
npm run validate
```

This verifies:

- `action.yml` exists and is valid YAML
- `action.yml` schema matches GitHub's specification
- `runs.using` is set to `node24`
- Required entry points exist

### Type Check

Run TypeScript type checking:

```bash
npm run typecheck
```

### CI vs Local Behavior

The builder behaves differently based on environment:

**Local development:**

- Validation issues show as warnings
- Build continues even with warnings
- Faster feedback during development

**CI environment (GitHub Actions):**

- Validation issues become errors
- Build fails on any issue
- Ensures quality gates in CI pipelines

The CI environment is detected via `CI=true` or `GITHUB_ACTIONS=true` environment
variables.

## Using Your Action

### Commit the dist Directory

GitHub Actions runs the bundled code directly, so commit your `dist/` folder:

```bash
git add dist/
git commit -m "Build action"
git push
```

### Reference in Workflows

Use your action in a workflow:

```yaml
# .github/workflows/test.yml
name: Test Action

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Run my action
        uses: ./
        with:
          name: "GitHub Actions"
```

### Publish to Marketplace

To publish on the GitHub Marketplace:

1. Create a release tag (e.g., `v1.0.0`)
2. Ensure `action.yml` has `branding` configured
3. Follow GitHub's
   [publishing guide](https://docs.github.com/en/actions/creating-actions/publishing-actions-in-github-marketplace)

## Next Steps

- [Configuration](./configuration.md) - Customize build options
- [CLI Reference](./cli-reference.md) - All available commands
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
