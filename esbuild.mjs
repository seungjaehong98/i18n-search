import * as esbuild from "esbuild";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  format: "cjs",
  minify: production,
  sourcemap: !production,
  sourcesContent: false,
  platform: "node",
  outfile: "dist/extension.js",
  external: ["vscode"],
  logLevel: "silent",
  plugins: [
    {
      name: "watch-log",
      setup(build) {
        let count = 0;
        build.onEnd((result) => {
          if (result.errors.length > 0) {
            console.error(`[esbuild] Build failed with ${result.errors.length} error(s)`);
          } else {
            console.log(`[esbuild] Build ${++count} succeeded`);
          }
        });
      },
    },
  ],
};

if (watch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log("[esbuild] Watching for changes...");
} else {
  await esbuild.build(buildOptions);
}
