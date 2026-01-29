import { NodeLibraryBuilder } from "@savvy-web/rslib-builder";

const config: ReturnType<typeof NodeLibraryBuilder.create> = NodeLibraryBuilder.create({
	tsdocLint: true,
	// Externalize typescript - it uses __filename which doesn't work when bundled in ESM
	// Also externalize source-map-support which is an optional typescript dependency
	externals: [],
	transform({ pkg }) {
		delete pkg.devDependencies;
		delete pkg.scripts;
		delete pkg.publishConfig;
		return pkg;
	},
});

export default config;
