#!/usr/bin/env node

import {
  DEFAULT_BRIDGE_HOST,
  DEFAULT_BRIDGE_PORT,
  startBridgeHttpServer
} from "./index.js";

function parsePort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_BRIDGE_PORT;
  }

  const parsedPort = Number(value);

  if (!Number.isInteger(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
    throw new Error(`Invalid bridge port: ${value}`);
  }

  return parsedPort;
}

const server = await startBridgeHttpServer({
  host: process.env.VIBE_FIGMA_BRIDGE_HOST ?? DEFAULT_BRIDGE_HOST,
  port: parsePort(process.env.VIBE_FIGMA_BRIDGE_PORT ?? process.env.PORT)
});

const shutdown = async () => {
  await server.close();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});

console.error(`vibe-figma-ui bridge listening on ${server.baseUrl}`);

await new Promise(() => {
  // Keep the bridge process alive until it receives a termination signal.
});
