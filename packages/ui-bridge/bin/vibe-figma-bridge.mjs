#!/usr/bin/env node

import process from "node:process";

import("../dist/cli.js").catch((error) => {
  const message =
    error instanceof Error ? error.message : "Unknown bridge startup error.";

  globalThis.console.error(
    "vibe-figma-bridge is not built yet. Run `corepack pnpm build` first."
  );
  globalThis.console.error(message);
  process.exit(1);
});
