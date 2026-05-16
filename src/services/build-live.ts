/* v8 ignore start - build service requires actual bundling for integration testing */
/**
 * BuildService Layer implementation.
 *
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRsbuild } from "@rsbuild/core";
import { Effect, Layer } from "effect";

import { BundleFailed, CleanError, WriteError } from "../errors.js";
import type { Config } from "../schemas/config.js";
import type { BuildResult, BuildRunnerOptions, BundleResult } from "./build.js";
import { BuildService } from "./build.js";
import type { DetectedEntry } from "./config.js";
import { ConfigService } from "./config.js";

/**
 * Source of the stub module that replaces packages listed in `build.ignore`.
 * It is bundled in place of the real module and throws if ever loaded.
 */
const IGNORE_STUB_SOURCE = `throw new Error("A module excluded via the build 'ignore' option was loaded at runtime.");\n`;

/**
 * Format bytes as a human-readable string.
 */
function formatBytes(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} B`;
	}
	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`;
	}
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// =============================================================================
// Formatting Helpers
// =============================================================================

/**
 * Format build result for terminal output.
 */
/* v8 ignore start - formatting function tested via integration */
function formatBuildResult(result: BuildResult): string {
	const lines: string[] = [];

	if (result.success) {
		lines.push("Build Summary:");
		for (const entry of result.entries) {
			if (entry.success && entry.stats) {
				const { entry: name, size, duration, outputPath } = entry.stats;
				lines.push(`  ✓ ${name}: ${formatBytes(size)} (${duration}ms) → ${outputPath}`);
			}
		}
		lines.push(`\nTotal time: ${result.duration}ms`);
	} else {
		lines.push("Build Failed:");
		for (const entry of result.entries) {
			if (!entry.success) {
				lines.push(`  ✗ ${entry.error}`);
			}
		}
	}

	return lines.join("\n");
}
/* v8 ignore stop */

// =============================================================================
// Build Helpers
// =============================================================================

/**
 * Clean output directory.
 */
function cleanDirectory(dir: string): Effect.Effect<void, CleanError> {
	return Effect.try({
		try: () => {
			if (existsSync(dir)) {
				rmSync(dir, { recursive: true, force: true });
			}
		},
		/* v8 ignore next 5 - error branch requires fs permission failures */
		catch: (error) =>
			new CleanError({
				directory: dir,
				cause: error,
			}),
	});
}

/**
 * Write file with directory creation.
 */
function writeFile(path: string, content: string): Effect.Effect<void, WriteError> {
	return Effect.try({
		try: () => {
			const dir = resolve(path, "..");
			mkdirSync(dir, { recursive: true });
			writeFileSync(path, content, "utf8");
		},
		/* v8 ignore next 5 - error branch requires fs permission failures */
		catch: (error) =>
			new WriteError({
				path,
				cause: error,
			}),
	});
}

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

		// Modules listed in `build.ignore` are aliased to a throwing stub so
		// they are neither bundled nor resolved against node_modules. The stub
		// lives in a private per-build temp directory created with mkdtemp, so
		// a predictable shared path cannot be pre-created or symlinked by
		// another process. See
		// docs/superpowers/specs/2026-05-15-build-ignore-option-design.md.
		const externalsSet = new Set(config.build.externals);
		const ignoreSet = new Set(config.build.ignore);
		const ignoreAlias: Record<string, string> = {};
		let stubDir: string | undefined;
		if (config.build.ignore.length > 0) {
			stubDir = yield* Effect.try({
				try: () => mkdtempSync(join(tmpdir(), "github-action-builder-")),
				catch: (error) => new WriteError({ path: tmpdir(), cause: error }),
			});
			const stubPath = resolve(stubDir, "ignore-stub.mjs");
			yield* writeFile(stubPath, IGNORE_STUB_SOURCE);
			for (const moduleName of config.build.ignore) {
				ignoreAlias[`${moduleName}$`] = stubPath;
			}
		}

		// createRsbuild returns a Promise<RsbuildInstance>
		const rsbuild = yield* Effect.tryPromise({
			try: () =>
				createRsbuild({
					rsbuildConfig: {
						source: { entry: { [entry.type]: entry.path } },
						resolve: { alias: ignoreAlias },
						output: {
							target: "node",
							module: true,
							distPath: { root: outputDir },
							filename: { js: "[name].js" },
							// A single function makes the whole externalization decision so
							// it never depends on rspack's array fall-through. Leading the
							// array with a function caused rspack to stop consulting trailing
							// string entries, so user-configured externals were bundled and
							// hard-failed to resolve instead of being externalized (#81).
							externals: (data: { request?: string }): string | false => {
								const request = data.request;
								if (!request) {
									return false;
								}
								// node: builtins are externalized with CommonJS require()
								// semantics. Output is ESM (output.module), so the default
								// "module" type makes require("node:*") inside bundled CJS deps
								// return an ESM namespace object. That breaks the TypeScript
								// __importDefault interop helper and throws "instanceof is not
								// callable" at runtime. "node-commonjs" preserves real
								// require() semantics. See issue #79.
								if (request.startsWith("node:")) {
									return `node-commonjs ${request}`;
								}
								// User-configured externals: not bundled, left as runtime
								// imports with the default external type.
								// `ignore` takes precedence over `externals`: a module in
								// both lists is stubbed via resolve.alias, not externalized.
								if (externalsSet.has(request) && !ignoreSet.has(request)) {
									return request;
								}
								return false;
							},
							cleanDistPath: false,
							minify: config.build.minify,
							sourceMap: config.build.sourceMap ? { js: "source-map" as const } : false,
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
		yield* Effect.tryPromise({
			try: () => buildResult.close(),
			catch: (error) =>
				new BundleFailed({
					entry: entry.path,
					cause: new Error(`rsbuild close() failed: ${error}`),
				}),
		});

		// Remove the private stub directory now the bundle has been written.
		if (stubDir !== undefined) {
			const dir = stubDir;
			yield* Effect.ignore(Effect.try(() => rmSync(dir, { recursive: true, force: true })));
		}

		const outputPath = resolve(outputDir, `${entry.type}.js`);
		const size = yield* Effect.try({
			try: () => statSync(outputPath).size,
			catch: (error) =>
				new BundleFailed({
					entry: entry.path,
					cause: error,
				}),
		});
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

// =============================================================================
// Layer Implementation
// =============================================================================

/**
 * Live implementation of BuildService.
 *
 * @remarks
 * Uses rsbuild for bundling.
 */
export const BuildServiceLive = Layer.effect(
	BuildService,
	Effect.gen(function* () {
		const configService = yield* ConfigService;

		return {
			/* v8 ignore start - build execution requires actual rsbuild bundling */
			build: (config: Config, options: BuildRunnerOptions = {}) =>
				Effect.gen(function* () {
					const cwd = options.cwd ?? process.cwd();
					const shouldClean = options.clean ?? true;
					const startTime = Date.now();

					// Detect entries
					const entriesConfig: { main?: string; pre?: string; post?: string } = {
						main: config.entries.main,
					};
					if (config.entries.pre) entriesConfig.pre = config.entries.pre;
					if (config.entries.post) entriesConfig.post = config.entries.post;
					const entriesResult = yield* configService.detectEntries(cwd, entriesConfig);

					// Clean output directory if requested
					if (shouldClean) {
						yield* cleanDirectory(resolve(cwd, "dist"));
					}

					// Build each entry
					const entryResults: BundleResult[] = [];
					for (const entry of entriesResult.entries) {
						const result = yield* Effect.either(bundleEntry(entry, config, cwd));
						if (result._tag === "Left") {
							const err = result.left;
							entryResults.push({
								success: false,
								error: err.cause instanceof Error ? err.cause.message : String(err.cause),
							});
						} else {
							entryResults.push(result.right);
						}
					}

					// Create dist/package.json for ESM compatibility
					yield* writeFile(resolve(cwd, "dist/package.json"), '{ "type": "module" }');

					const duration = Date.now() - startTime;
					const success = entryResults.every((r) => r.success);

					if (!success) {
						return {
							success,
							entries: entryResults,
							duration,
							error: "One or more entries failed to build",
						};
					}
					return {
						success,
						entries: entryResults,
						duration,
					};
				}),
			/* v8 ignore stop */

			bundle: (entry: DetectedEntry, config: Config) => bundleEntry(entry, config, process.cwd()),

			clean: (outputDir: string) => cleanDirectory(outputDir),

			formatResult: formatBuildResult,

			formatBytes,
		};
	}),
);
/* v8 ignore stop */
