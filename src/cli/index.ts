#!/usr/bin/env node
/* v8 ignore start - CLI entry point requires integration testing */
/**
 * GitHub Action Builder CLI entry point.
 */
import { Command } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect, Layer } from "effect";

import { AppLayer } from "../layers/app.js";
import { buildCommand, initCommand, validateCommand } from "./commands/index.js";

/**
 * Root command for the CLI.
 */
const rootCommand = Command.make("github-action-builder").pipe(
	Command.withSubcommands([buildCommand, validateCommand, initCommand]),
);

/**
 * CLI application configuration.
 */
const cli = Command.run(rootCommand, {
	name: "github-action-builder",
	version: process.env.__PACKAGE_VERSION__,
});

/**
 * Combined layer: AppLayer + NodeContext for CLI.
 */
const CliLayer = Layer.merge(AppLayer, NodeContext.layer);

/**
 * Run the CLI.
 */
const main = Effect.suspend(() => cli(process.argv)).pipe(Effect.provide(CliLayer));

NodeRuntime.runMain(main);
