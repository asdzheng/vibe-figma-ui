#!/usr/bin/env node

import {
  DEFAULT_BRIDGE_HOST,
  DEFAULT_BRIDGE_MAX_STORED_CAPTURES,
  DEFAULT_BRIDGE_PORT,
  DEFAULT_BRIDGE_STORAGE_PATH,
  createFileCaptureStore,
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

function parsePositiveInteger(
  value: string | undefined,
  fallbackValue: number,
  label: string
): number {
  if (!value) {
    return fallbackValue;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`Invalid ${label}: ${value}`);
  }

  return parsedValue;
}

const server = await startBridgeHttpServer({
  host: process.env.VIBE_FIGMA_BRIDGE_HOST ?? DEFAULT_BRIDGE_HOST,
  port: parsePort(process.env.VIBE_FIGMA_BRIDGE_PORT ?? process.env.PORT),
  store: createFileCaptureStore({
    filePath:
      process.env.VIBE_FIGMA_BRIDGE_STORE_PATH ?? DEFAULT_BRIDGE_STORAGE_PATH,
    maxEntries: parsePositiveInteger(
      process.env.VIBE_FIGMA_BRIDGE_MAX_CAPTURES,
      DEFAULT_BRIDGE_MAX_STORED_CAPTURES,
      "bridge max captures"
    )
  })
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

console.error(
  `vibe-figma-ui bridge listening on ${server.baseUrl} using ${process.env.VIBE_FIGMA_BRIDGE_STORE_PATH ?? DEFAULT_BRIDGE_STORAGE_PATH}`
);

await new Promise(() => {
  // Keep the bridge process alive until it receives a termination signal.
});
