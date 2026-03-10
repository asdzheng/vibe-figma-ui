#!/usr/bin/env node

import process from "node:process";

import { runCli } from "../dist/cli.js";

runCli(process.argv.slice(2)).catch((error) => {
  const message =
    error instanceof Error ? error.message : "Unknown vibe-figma CLI error.";
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
