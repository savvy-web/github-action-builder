/* v8 ignore start - build service requires actual ncc bundling for integration testing */
/**
 * BuildService Layer implementation.
 *
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { Effect, Layer } from "effect";

import { BundleFailed, CleanError, WriteError } from "../errors.js";
import type { Config } from "../schemas/config.js";
import type { BuildResult, BuildRunnerOptions, BundleResult } from "./build.js";
import { BuildService } from "./build.js";
import type { DetectedEntry } from "./config.js";
import { ConfigService } from "./config.js";

// =============================================================================
// NCC Bundler Types and Functions
// =============================================================================

const require: NodeJS.Require = createRequire(import.meta.url);

/**
 * Options for ncc bundling.
 */
interface NccOptions {
	cache?: string | false;
	externals?: readonly string[];
	filterAssetBase?: string;
	minify?: boolean;
	sourceMap?: boolean;
	assetBuilds?: boolean;
	sourceMapBasePrefix?: string;
	sourceMapRegister?: boolean;
	watch?: boolean;
	license?: string;
	target?: string;
	v8cache?: boolean;
	quiet?: boolean;
	debugLog?: boolean;
}

/**
 * Asset data from ncc bundling.
 */
interface NccAsset {
	source: Buffer | string;
	permissions?: number;
	symlinks?: string[];
}

/**
 * Result of ncc bundling.
 */
interface NccResult {
	code: string;
	map: string | undefined;
	assets: Record<string, NccAsset>;
}

type NccFunction = (input: string, options?: NccOptions) => Promise<NccResult>;

const ncc: NccFunction = require("@vercel/ncc");

/**
 * Bundle a TypeScript/JavaScript file using ncc.
 */
async function bundle(entryPath: string, options: NccOptions = {}): Promise<NccResult> {
	return ncc(entryPath, {
		minify: options.minify ?? true,
		sourceMap: options.sourceMap ?? false,
		target: options.target ?? "es2022",
		quiet: options.quiet ?? true,
		externals: options.externals ?? [],
		...options,
	});
}

/**
 * Get the size of bundled code in bytes.
 */
function getBundleSize(code: string): number {
	return Buffer.byteLength(code, "utf8");
}

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
				cause: error instanceof Error ? error.message : String(error),
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
				cause: error instanceof Error ? error.message : String(error),
			}),
	});
}

/**
 * Bundle a single entry with ncc.
 */
/* v8 ignore start - bundling requires actual ncc execution */
function bundleEntry(
	entry: DetectedEntry,
	config: Config,
	cwd: string,
): Effect.Effect<BundleResult, BundleFailed | WriteError> {
	return Effect.gen(function* () {
		const startTime = Date.now();

		// Bundle with ncc
		const nccResult: NccResult = yield* Effect.tryPromise({
			try: () =>
				bundle(entry.path, {
					minify: config.build.minify,
					sourceMap: config.build.sourceMap,
					target: config.build.target,
					externals: [...config.build.externals],
					quiet: config.build.quiet,
				}),
			catch: (error) =>
				new BundleFailed({
					entry: entry.path,
					cause: error instanceof Error ? error.message : String(error),
				}),
		});

		// Write output
		const outputPath = resolve(cwd, entry.output);

		// Write main bundle
		yield* writeFile(outputPath, nccResult.code);

		// Write source map only if enabled in config
		if (config.build.sourceMap && nccResult.map) {
			yield* writeFile(`${outputPath}.map`, nccResult.map);
		}

		// Write assets (dynamic chunks, etc.)
		if (nccResult.assets) {
			const outputDir = resolve(outputPath, "..");
			for (const [assetName, assetData] of Object.entries(nccResult.assets)) {
				const assetPath = resolve(outputDir, assetName);
				const content = typeof assetData.source === "string" ? assetData.source : assetData.source.toString("utf8");
				yield* writeFile(assetPath, content);
			}
		}

		const duration = Date.now() - startTime;
		const size = getBundleSize(nccResult.code);

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
 * Uses the existing ncc wrapper for bundling.
 */
export const BuildServiceLive = Layer.effect(
	BuildService,
	Effect.gen(function* () {
		const configService = yield* ConfigService;

		return {
			/* v8 ignore start - build execution requires actual ncc bundling */
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
							entryResults.push({
								success: false,
								error: result.left.cause,
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
