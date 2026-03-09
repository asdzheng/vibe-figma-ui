import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@vibe-figma/capture-core": resolve(
        rootDir,
        "packages/capture-core/src/index.ts"
      ),
      "@vibe-figma/fixtures": resolve(rootDir, "packages/fixtures/src/index.ts"),
      "@vibe-figma/mcp-server": resolve(
        rootDir,
        "packages/mcp-server/src/index.ts"
      ),
      "@vibe-figma/plugin": resolve(rootDir, "packages/plugin/src/index.ts"),
      "@vibe-figma/schema": resolve(rootDir, "packages/schema/src/index.ts"),
      "@vibe-figma/ui-bridge": resolve(
        rootDir,
        "packages/ui-bridge/src/index.ts"
      )
    }
  },
  test: {
    include: ["packages/*/test/**/*.test.ts", "scripts/**/*.test.mjs"]
  }
});
