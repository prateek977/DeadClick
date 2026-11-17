import { defineConfig } from "tsup";
import fs from "node:fs/promises";
import path from "node:path";

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
  },
  onSuccess: async () => {
    try {
      const cliPath = path.resolve("dist/cli.js");
      await fs.chmod(cliPath, 0o755);
    } catch {
      // Ignore if file doesn't exist yet
    }
  }
});
