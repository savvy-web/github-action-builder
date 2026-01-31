/**
 * Tests for Effect Schema structs.
 */
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
	BuildOptionsSchema,
	ConfigInputSchema,
	ConfigSchema,
	EntriesSchema,
	EsTarget,
	ValidationOptionsSchema,
	defineConfig,
} from "./config.js";

describe("Entries Schema", () => {
	it("applies defaults when decoding empty object", () => {
		const entries = Schema.decodeUnknownSync(EntriesSchema)({});
		expect(entries.main).toBe("src/main.ts");
		expect(entries.pre).toBeUndefined();
		expect(entries.post).toBeUndefined();
	});

	it("accepts custom main entry", () => {
		const entries = Schema.decodeUnknownSync(EntriesSchema)({ main: "src/action.ts" });
		expect(entries.main).toBe("src/action.ts");
	});

	it("accepts all entry types", () => {
		const entries = Schema.decodeUnknownSync(EntriesSchema)({
			main: "src/main.ts",
			pre: "src/pre.ts",
			post: "src/post.ts",
		});
		expect(entries.main).toBe("src/main.ts");
		expect(entries.pre).toBe("src/pre.ts");
		expect(entries.post).toBe("src/post.ts");
	});

	it("decodes from plain object", () => {
		const decoded = Schema.decodeUnknownSync(EntriesSchema)({
			main: "src/custom.ts",
		});
		expect(decoded.main).toBe("src/custom.ts");
	});
});

describe("BuildOptions Schema", () => {
	it("applies defaults when decoding empty object", () => {
		const options = Schema.decodeUnknownSync(BuildOptionsSchema)({});
		expect(options.minify).toBe(true);
		expect(options.target).toBe("es2022");
		expect(options.sourceMap).toBe(false);
		expect(options.externals).toEqual([]);
		expect(options.quiet).toBe(false);
	});

	it("accepts custom options", () => {
		const options = Schema.decodeUnknownSync(BuildOptionsSchema)({
			minify: false,
			target: "es2023",
			sourceMap: false,
			externals: ["@aws-sdk/client-s3"],
			quiet: true,
		});
		expect(options.minify).toBe(false);
		expect(options.target).toBe("es2023");
		expect(options.sourceMap).toBe(false);
		expect(options.externals).toEqual(["@aws-sdk/client-s3"]);
		expect(options.quiet).toBe(true);
	});

	it("decodes from plain object", () => {
		const decoded = Schema.decodeUnknownSync(BuildOptionsSchema)({
			minify: false,
		});
		expect(decoded.minify).toBe(false);
		expect(decoded.target).toBe("es2022"); // default applied
	});
});

describe("ValidationOptions Schema", () => {
	it("applies defaults when decoding empty object", () => {
		const options = Schema.decodeUnknownSync(ValidationOptionsSchema)({});
		expect(options.requireActionYml).toBe(true);
		expect(options.maxBundleSize).toBeUndefined();
		expect(options.strict).toBeUndefined();
	});

	it("accepts custom options", () => {
		const options = Schema.decodeUnknownSync(ValidationOptionsSchema)({
			requireActionYml: false,
			maxBundleSize: "5mb",
			strict: true,
		});
		expect(options.requireActionYml).toBe(false);
		expect(options.maxBundleSize).toBe("5mb");
		expect(options.strict).toBe(true);
	});
});

describe("EsTarget Literal", () => {
	it("validates correct targets", () => {
		expect(() => Schema.decodeUnknownSync(EsTarget)("es2020")).not.toThrow();
		expect(() => Schema.decodeUnknownSync(EsTarget)("es2021")).not.toThrow();
		expect(() => Schema.decodeUnknownSync(EsTarget)("es2022")).not.toThrow();
		expect(() => Schema.decodeUnknownSync(EsTarget)("es2023")).not.toThrow();
		expect(() => Schema.decodeUnknownSync(EsTarget)("es2024")).not.toThrow();
	});

	it("rejects invalid targets", () => {
		expect(() => Schema.decodeUnknownSync(EsTarget)("es2015")).toThrow();
		expect(() => Schema.decodeUnknownSync(EsTarget)("es5")).toThrow();
		expect(() => Schema.decodeUnknownSync(EsTarget)("invalid")).toThrow();
	});
});

describe("ConfigInput Schema", () => {
	it("accepts empty object with all optional fields", () => {
		const input = Schema.decodeUnknownSync(ConfigInputSchema)({});
		expect(input.entries).toBeUndefined();
		expect(input.build).toBeUndefined();
		expect(input.validation).toBeUndefined();
	});

	it("accepts partial configuration", () => {
		const input = Schema.decodeUnknownSync(ConfigInputSchema)({
			entries: { main: "src/action.ts" },
			build: { minify: false },
		});
		expect(input.entries?.main).toBe("src/action.ts");
		expect(input.build?.minify).toBe(false);
	});

	it("decodes from plain object", () => {
		const decoded = Schema.decodeUnknownSync(ConfigInputSchema)({
			entries: { main: "custom.ts", pre: "pre.ts" },
			build: { target: "es2023" },
		});
		expect(decoded.entries?.main).toBe("custom.ts");
		expect(decoded.entries?.pre).toBe("pre.ts");
		expect(decoded.build?.target).toBe("es2023");
	});
});

describe("Config Schema", () => {
	it("decodes with nested schemas applying defaults", () => {
		const config = Schema.decodeUnknownSync(ConfigSchema)({
			entries: {},
			build: {},
			validation: {},
		});
		expect(config.entries.main).toBe("src/main.ts");
		expect(config.build.minify).toBe(true);
		expect(config.validation.requireActionYml).toBe(true);
	});
});

describe("defineConfig", () => {
	it("returns fully resolved config with defaults", () => {
		const config = defineConfig({});
		expect(config.entries).toBeDefined();
		expect(config.build).toBeDefined();
		expect(config.validation).toBeDefined();
		expect(config.entries.main).toBe("src/main.ts");
		expect(config.build.minify).toBe(true);
		expect(config.validation.requireActionYml).toBe(true);
	});

	it("merges partial config with defaults", () => {
		const config = defineConfig({
			entries: { main: "src/action.ts" },
			build: { minify: false },
		});
		expect(config.entries.main).toBe("src/action.ts");
		expect(config.entries.pre).toBeUndefined();
		expect(config.build.minify).toBe(false);
		expect(config.build.target).toBe("es2022"); // default
	});

	it("handles all entry types", () => {
		const config = defineConfig({
			entries: {
				main: "src/main.ts",
				pre: "src/setup.ts",
				post: "src/cleanup.ts",
			},
		});
		expect(config.entries.main).toBe("src/main.ts");
		expect(config.entries.pre).toBe("src/setup.ts");
		expect(config.entries.post).toBe("src/cleanup.ts");
	});

	it("handles all build options", () => {
		const config = defineConfig({
			build: {
				minify: true,
				target: "es2023",
				sourceMap: false,
				externals: ["pkg1", "pkg2"],
				quiet: true,
			},
		});
		expect(config.build.minify).toBe(true);
		expect(config.build.target).toBe("es2023");
		expect(config.build.sourceMap).toBe(false);
		expect(config.build.externals).toEqual(["pkg1", "pkg2"]);
		expect(config.build.quiet).toBe(true);
	});

	it("handles all validation options", () => {
		const config = defineConfig({
			validation: {
				requireActionYml: false,
				maxBundleSize: "10mb",
				strict: true,
			},
		});
		expect(config.validation.requireActionYml).toBe(false);
		expect(config.validation.maxBundleSize).toBe("10mb");
		expect(config.validation.strict).toBe(true);
	});
});
