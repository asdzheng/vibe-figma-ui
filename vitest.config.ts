import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@vibe-figma/capture-core",
        replacement: resolve(rootDir, "packages/capture-core/src/index.ts")
      },
      {
        find: "@vibe-figma/cli/transport",
        replacement: resolve(rootDir, "packages/cli/src/transport.ts")
      },
      {
        find: /^@vibe-figma\/cli$/,
        replacement: resolve(rootDir, "packages/cli/src/index.ts")
      },
      {
        find: "@vibe-figma/fixtures",
        replacement: resolve(rootDir, "packages/fixtures/src/index.ts")
      },
      {
        find: "@vibe-figma/plugin",
        replacement: resolve(rootDir, "packages/plugin/src/index.ts")
      },
      {
        find: "@vibe-figma/schema",
        replacement: resolve(rootDir, "packages/schema/src/index.ts")
      }
    ]
  },
  test: {
    include: [
      "packages/capture-core/test/**/*.test.ts",
      "packages/cli/test/**/*.test.ts",
      "packages/fixtures/test/**/*.test.ts",
      "packages/plugin/test/**/*.test.ts",
      "packages/schema/test/**/*.test.ts",
      "scripts/**/*.test.mjs"
    ]
  }
});
