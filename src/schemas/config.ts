/**
 * Configuration schemas for GitHub Action Builder using Effect Schema.
 *
 * @remarks
 * This module defines the schemas for validating configuration
 * and provides the {@link defineConfig} helper for type-safe configuration files.
 *
 * @internal
 */
import { Schema } from "effect";

// =============================================================================
// Entry Point Schema
// =============================================================================

/**
 * Schema for entry point paths.
 *
 * @remarks
 * GitHub Actions support three entry points:
 * - `main`: The primary action entry point (required)
 * - `pre`: Runs before the main action (optional)
 * - `post`: Runs after the main action for cleanup (optional)
 *
 * @internal
 */
export const EntriesSchema = Schema.Struct({
	/** Path to the main action entry point. Defaults to "src/main.ts". */
	main: Schema.optionalWith(Schema.String, { default: () => "src/main.ts" }),
	/** Path to the pre-action hook entry point. */
	pre: Schema.optional(Schema.String),
	/** Path to the post-action hook entry point. */
	post: Schema.optional(Schema.String),
});

/**
 * Entry point paths configuration.
 *
 * @public
 */
export type Entries = typeof EntriesSchema.Type;

// =============================================================================
// Build Options Schema
// =============================================================================

/**
 * ECMAScript target versions supported by the bundler.
 *
 * @internal
 */
export const EsTarget = Schema.Literal("es2020", "es2021", "es2022", "es2023", "es2024");

/**
 * Type for ECMAScript target.
 *
 * @public
 */
export type EsTarget = typeof EsTarget.Type;

/**
 * Schema for build options.
 *
 * @remarks
 * Build options control how the TypeScript source is bundled using `@vercel/ncc`.
 * The bundler creates a single JavaScript file with all dependencies inlined.
 *
 * @internal
 */
export const BuildOptionsSchema = Schema.Struct({
	/** Enable minification to reduce bundle size. Defaults to true. */
	minify: Schema.optionalWith(Schema.Boolean, { default: () => true }),
	/** ECMAScript target version for the output. Defaults to "es2022". */
	target: Schema.optionalWith(EsTarget, { default: () => "es2022" as const }),
	/** Generate source maps for debugging. Defaults to false. */
	sourceMap: Schema.optionalWith(Schema.Boolean, { default: () => false }),
	/** Packages to exclude from the bundle. Defaults to []. */
	externals: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
	/** Suppress build output. Defaults to false. */
	quiet: Schema.optionalWith(Schema.Boolean, { default: () => false }),
});

/**
 * Build options for the bundler.
 *
 * @public
 */
export type BuildOptions = typeof BuildOptionsSchema.Type;

// =============================================================================
// Validation Options Schema
// =============================================================================

/**
 * Schema for validation options.
 *
 * @remarks
 * Validation options control how strictly the build process validates
 * the project structure and configuration before building.
 *
 * @internal
 */
export const ValidationOptionsSchema = Schema.Struct({
	/** Require action.yml to exist and be valid. Defaults to true. */
	requireActionYml: Schema.optionalWith(Schema.Boolean, { default: () => true }),
	/** Maximum bundle size before warning/error (e.g., "5mb", "500kb"). */
	maxBundleSize: Schema.optional(Schema.String),
	/** Treat warnings as errors. Auto-detects from CI when undefined. */
	strict: Schema.optional(Schema.Boolean),
});

/**
 * Validation options for the build process.
 *
 * @public
 */
export type ValidationOptions = typeof ValidationOptionsSchema.Type;

// =============================================================================
// Config Input Schema (User-provided, all optional)
// =============================================================================

/**
 * User-provided configuration input (all fields optional).
 *
 * @remarks
 * This schema is used for parsing user-provided configuration.
 * All sections are optional; defaults are applied via {@link defineConfig}.
 *
 * @internal
 */
export const ConfigInputSchema = Schema.Struct({
	entries: Schema.optional(
		Schema.Struct({
			main: Schema.optional(Schema.String),
			pre: Schema.optional(Schema.String),
			post: Schema.optional(Schema.String),
		}),
	),
	build: Schema.optional(
		Schema.Struct({
			minify: Schema.optional(Schema.Boolean),
			target: Schema.optional(EsTarget),
			sourceMap: Schema.optional(Schema.Boolean),
			externals: Schema.optional(Schema.Array(Schema.String)),
			quiet: Schema.optional(Schema.Boolean),
		}),
	),
	validation: Schema.optional(
		Schema.Struct({
			requireActionYml: Schema.optional(Schema.Boolean),
			maxBundleSize: Schema.optional(Schema.String),
			strict: Schema.optional(Schema.Boolean),
		}),
	),
});

/**
 * User-provided configuration input (all fields optional).
 *
 * @remarks
 * Use this type when accepting configuration from users.
 * All fields are optional and will be merged with defaults.
 *
 * @public
 */
export type ConfigInput = typeof ConfigInputSchema.Type;

// =============================================================================
// Config Schema (Fully resolved)
// =============================================================================

/**
 * Fully resolved configuration with all defaults applied.
 *
 * @internal
 */
export const ConfigSchema = Schema.Struct({
	entries: EntriesSchema,
	build: BuildOptionsSchema,
	validation: ValidationOptionsSchema,
});

/**
 * Fully resolved configuration with all defaults applied.
 *
 * @remarks
 * This type represents the final configuration after all defaults
 * have been applied. It is the result of calling {@link defineConfig}.
 *
 * @public
 */
export type Config = typeof ConfigSchema.Type;

// =============================================================================
// defineConfig Helper
// =============================================================================

/**
 * Define a configuration with full TypeScript support.
 *
 * @remarks
 * This function validates the configuration and applies all defaults.
 * Use it in your `action.config.ts` file for autocomplete and type checking.
 *
 * @param config - Partial configuration object
 * @returns Fully resolved configuration with defaults applied
 *
 * @example Basic configuration file
 * ```typescript
 * // action.config.ts
 * import { defineConfig } from "@savvy-web/github-action-builder";
 *
 * export default defineConfig({
 *   entries: {
 *     main: "src/main.ts",
 *   },
 *   build: {
 *     minify: true,
 *   },
 * });
 * ```
 *
 * @example Full configuration with all options
 * ```typescript
 * // action.config.ts
 * import { defineConfig } from "@savvy-web/github-action-builder";
 *
 * export default defineConfig({
 *   entries: {
 *     main: "src/action.ts",
 *     pre: "src/setup.ts",
 *     post: "src/cleanup.ts",
 *   },
 *   build: {
 *     minify: true,
 *     target: "es2022",
 *     sourceMap: true,
 *     externals: ["@aws-sdk/client-s3"],
 *   },
 *   validation: {
 *     requireActionYml: true,
 *     maxBundleSize: "10mb",
 *     strict: true,
 *   },
 * });
 * ```
 *
 * @public
 */
export function defineConfig(config: Partial<ConfigInput> = {}): Config {
	// Use Schema.decodeUnknownSync to apply defaults from the schema
	return Schema.decodeUnknownSync(ConfigSchema)({
		entries: config.entries ?? {},
		build: config.build ?? {},
		validation: config.validation ?? {},
	});
}
