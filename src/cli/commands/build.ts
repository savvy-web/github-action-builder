/* v8 ignore start - CLI commands require integration testing */
/**
 * Build command for GitHub Action Builder CLI.
 */
import { Command, Options } from "@effect/cli";
import { Console, Effect, Option } from "effect";

import { BuildService } from "../../services/build.js";
import { ConfigService } from "../../services/config.js";
import { ValidationService } from "../../services/validation.js";

/**
 * Config file option - shared across commands.
 */
export const configOption = Options.file("config").pipe(
	Options.withAlias("c"),
	Options.withDescription("Path to configuration file"),
	Options.optional,
);

/**
 * Quiet mode option - suppress non-error output.
 */
export const quietOption = Options.boolean("quiet").pipe(
	Options.withAlias("q"),
	Options.withDescription("Suppress non-error output"),
	Options.withDefault(false),
);

/**
 * Skip validation option.
 */
export const noValidateOption = Options.boolean("no-validate").pipe(
	Options.withDescription("Skip validation step"),
	Options.withDefault(false),
);

/**
 * Build command handler using Effect services.
 */
const buildHandler = ({
	config,
	quiet,
	noValidate,
}: {
	config: Option.Option<string>;
	quiet: boolean;
	noValidate: boolean;
}) =>
	Effect.gen(function* () {
		const configService = yield* ConfigService;
		const validationService = yield* ValidationService;
		const buildService = yield* BuildService;

		const cwd = process.cwd();

		// Load configuration
		if (!quiet) {
			yield* Console.log("Loading configuration...");
		}

		const loadOptions = Option.isSome(config) ? { cwd, configPath: config.value } : { cwd };
		const configResult = yield* configService.load(loadOptions);

		if (!quiet) {
			if (configResult.usingDefaults) {
				yield* Console.log("  Using default configuration");
			} else {
				yield* Console.log(`  Found ${configResult.configPath}`);
			}
		}

		// Validate (unless skipped)
		if (!noValidate) {
			if (!quiet) {
				yield* Console.log("\nValidating...");
			}

			const validationResult = yield* validationService.validate(configResult.config, { cwd });

			if (!validationResult.valid) {
				yield* Console.error(`\n${validationService.formatResult(validationResult)}`);
				return yield* Effect.fail(new Error("Validation failed"));
			}

			if (!quiet && validationResult.warnings.length > 0) {
				yield* Console.log(validationService.formatResult(validationResult));
			} else if (!quiet) {
				yield* Console.log("  All checks passed");
			}
		}

		// Build
		if (!quiet) {
			yield* Console.log("\nBuilding...");
		}

		const buildResult = yield* buildService.build(configResult.config, { cwd });

		if (!buildResult.success) {
			yield* Console.error(`\nBuild failed: ${buildResult.error}`);
			return yield* Effect.fail(new Error("Build failed"));
		}

		if (!quiet) {
			yield* Console.log(`\n${buildService.formatResult(buildResult)}`);
			yield* Console.log("\nBuild completed successfully!");
		}
	});

/**
 * Build command - bundles GitHub Action entry points.
 */
export const buildCommand = Command.make(
	"build",
	{
		config: configOption,
		quiet: quietOption,
		noValidate: noValidateOption,
	},
	buildHandler,
);
