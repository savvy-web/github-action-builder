import { NodeLibraryBuilder } from "@savvy-web/rslib-builder";

export default NodeLibraryBuilder.create({
	tsdocLint: true,
	apiModel: {
		tsdoc: {
			tagDefinitions: [
				{ tagName: "@schema", syntaxKind: "modifier" },
				{ tagName: "@layer", syntaxKind: "modifier" },
				{ tagName: "@service", syntaxKind: "modifier" },
				{ tagName: "@error", syntaxKind: "modifier" },
			],
		},
	},
	transform({ pkg }) {
		delete pkg.devDependencies;
		delete pkg.bundleDependencies;
		delete pkg.scripts;
		delete pkg.publishConfig;
		delete pkg.devEngines;
		return pkg;
	},
});
