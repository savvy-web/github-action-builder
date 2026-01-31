import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for monorepo
 * @see https://vitest.dev/config/
 */
export default defineConfig({
	test: {
		// Global settings applied to all projects
		globals: true,
		environment: "node",

		// Test file patterns
		include: ["src/**/*.{test,spec}.{ts,tsx}"],
		exclude: ["**/node_modules/**", "**/dist/**"],

		// Coverage configuration
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html", "lcov"],
			exclude: [
				"**/node_modules/**",
				"**/dist/**",
				"**/coverage/**",
				"**/*.config.{ts,js,mjs}",
				"**/.{turbo,cache}/**",
				"**/lib/configs/**",
				"**/*.d.ts",
				"**/*.test.{ts,tsx}",
				"**/*.spec.{ts,tsx}",
				// Exclude barrel file (re-exports only)
				"src/index.ts",
				// Exclude CLI (requires integration testing)
				"src/cli/**",
				// Exclude build service (requires actual ncc bundling)
				"src/services/build-live.ts",
			],
			include: ["src/**/*.{ts,tsx}"],
			clean: true,
			// Coverage thresholds (adjust as needed)
			thresholds: {
				lines: 85,
				functions: 85,
				branches: 85,
				statements: 85,
			},
			reportOnFailure: true,
		},

		// Timeouts
		testTimeout: 10000,
		hookTimeout: 10000,

		// Use forks pool for better compatibility with Effect-TS
		pool: "forks",
	},
});
