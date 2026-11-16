import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    cli: "src/cli.ts"
  },
  format: ["esm"],
  target: "node20",
  clean: true,
  dts: true,
  splitting: false,
  sourcemap: true,
  banner: ({ entry }) => {
    if (entry === "cli") {
      return { js: "#!/usr/bin/env node" };
    }
    return {};
  }
});
