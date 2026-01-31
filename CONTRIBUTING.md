# Contributing to @savvy-web/github-action-builder

Thank you for your interest in contributing! This guide will help you set up
your development environment and understand our workflow.

## Development Environment

### Prerequisites

* **Node.js 24** or later
* **pnpm 10.28.1** (managed via corepack)
* **Git**

### Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/savvy-web/github-action-builder.git
   cd github-action-builder
   ```

2. **Enable corepack for pnpm:**

   ```bash
   corepack enable
   corepack prepare pnpm@10.28.1 --activate
   ```

3. **Install dependencies:**

   ```bash
   pnpm install
   ```

4. **Verify setup:**

   ```bash
   pnpm run test
   pnpm run typecheck
   ```

## Development Commands

### Testing

```bash
# Run all tests
pnpm run test

# Run tests in watch mode (during development)
pnpm run test:watch

# Run tests with coverage report
pnpm run test:coverage
```

### Linting

```bash
# Check code with Biome
pnpm run lint

# Auto-fix lint issues
pnpm run lint:fix

# Lint markdown files
pnpm run lint:md
```

### Type Checking

```bash
# Type-check all code
pnpm run typecheck
```

### Building

```bash
# Build all outputs
pnpm run build

# Build development output only
pnpm run build:dev

# Build production/npm output only
pnpm run build:prod
```

## Code Style

### TypeScript Conventions

This project uses Effect-TS patterns. Key conventions:

**Services:**

```typescript
// Define service interface
export interface MyService {
  readonly doSomething: () => Effect<Result, MyError>;
}

// Create service tag
export const MyService = Context.GenericTag<MyService>("MyService");
```

**Error handling:**

```typescript
// Use Data.TaggedError for typed errors
export class MyError extends Data.TaggedError("MyError")<{
  readonly message: string;
}> {}

// Handle with catchTags
Effect.catchTags({
  MyError: (e) => Effect.fail(e),
});
```

**Layers:**

```typescript
// Implement services as Layers
export const MyServiceLive = Layer.succeed(MyService, {
  doSomething: () => Effect.succeed(result),
});
```

### Import Conventions

```typescript
// Use .js extensions for relative imports (ESM requirement)
import { foo } from "./utils.js";

// Use node: protocol for Node.js built-ins
import { readFile } from "node:fs/promises";

// Separate type imports
import type { Config } from "./schemas/config.js";
```

### File Organization

```text
src/
+-- index.ts          # Public exports only
+-- errors.ts         # Typed error classes
+-- schemas/          # @effect/schema definitions
+-- services/         # Service interfaces (*-live.ts for implementations)
+-- layers/           # Layer composition
+-- cli/              # CLI commands
```

## Test Framework

### About Vitest

We use Vitest with v8 coverage. Tests are located alongside source files:

```text
src/
+-- errors.ts
+-- errors.test.ts    # Test file next to source
+-- schemas/
    +-- config.ts
    +-- config.test.ts
```

### Writing Tests

```typescript
import { describe, expect, it } from "vitest";
import { Effect } from "effect";

describe("MyService", () => {
  it("should do something", async () => {
    const program = Effect.gen(function* () {
      const service = yield* MyService;
      return yield* service.doSomething();
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MyServiceLive))
    );

    expect(result).toEqual(expected);
  });
});
```

### Test Configuration

Vitest uses the `forks` pool for Effect-TS compatibility:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    pool: "forks",
  },
});
```

## Pull Request Process

### 1. Create a Branch

```bash
git checkout -b feat/my-feature
# or
git checkout -b fix/my-bugfix
```

Use conventional branch naming:

* `feat/` - New features
* `fix/` - Bug fixes
* `docs/` - Documentation changes
* `refactor/` - Code refactoring
* `test/` - Test additions/changes
* `chore/` - Maintenance tasks

### 2. Make Changes

* Write code following the style guide
* Add or update tests
* Update documentation if needed
* Ensure all checks pass:

  ```bash
  pnpm run lint
  pnpm run typecheck
  pnpm run test
  ```

### 3. Commit

We use conventional commits with DCO signoff.

**Format:**

```text
type(scope): description

Body explaining what and why (optional)

Signed-off-by: Your Name <your.email@example.com>
```

**Types:**

* `feat` - New feature
* `fix` - Bug fix
* `docs` - Documentation
* `refactor` - Code refactoring
* `test` - Tests
* `chore` - Maintenance

**Example:**

```bash
git commit -m "feat(build): add source map support

Adds optional source map generation for debugging bundled actions.

Signed-off-by: Your Name <your.email@example.com>"
```

### 4. DCO Signoff Requirement

All commits must include a DCO (Developer Certificate of Origin) signoff.
This certifies that you have the right to submit the code.

Add the signoff automatically:

```bash
git commit -s -m "feat: my feature"
```

Or configure git to always sign:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 5. Push and Create PR

```bash
git push origin feat/my-feature
```

Then create a Pull Request on GitHub with:

* Clear title following conventional commit format
* Description of changes
* Link to any related issues
* Screenshots if applicable (for UI changes)

### 6. Review Process

* Maintainers will review your PR
* Address any feedback
* Ensure CI checks pass
* Once approved, maintainers will merge

## Pre-commit Hooks

The repository uses Husky for Git hooks:

* **pre-commit**: Runs lint-staged (formats and lints staged files)
* **commit-msg**: Validates conventional commit format and DCO signoff
* **pre-push**: Runs tests for affected packages

These hooks run automatically. If you need to bypass:

```bash
git commit --no-verify  # Skip hooks (not recommended)
```

## Project Structure

```text
github-action-builder/
+-- src/                    # Source code
|   +-- cli/                # CLI implementation
|   +-- layers/             # Effect Layers
|   +-- schemas/            # Effect Schema definitions
|   +-- services/           # Effect Services
|   +-- errors.ts           # Error types
|   +-- github-action.ts    # Programmatic API
|   +-- index.ts            # Public exports
+-- docs/                   # Documentation
+-- .claude/                # AI assistant configuration
+-- lib/                    # Shared configurations
+-- dist/                   # Build output (generated)
```

## Getting Help

* **Questions**: Open a GitHub Discussion
* **Bugs**: Open a GitHub Issue
* **Security**: Email <security@savvyweb.systems>

## License

By contributing, you agree that your contributions will be licensed under the
MIT License.
