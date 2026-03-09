#!/usr/bin/env node

import { startStdioServer } from "./server.js";

await startStdioServer({
  ...(process.env.VIBE_FIGMA_BRIDGE_URL
    ? { bridgeBaseUrl: process.env.VIBE_FIGMA_BRIDGE_URL }
    : {})
});
