import { afterEach, describe, expect, test } from "vitest";

import { loadSampleCaptureDocument } from "@vibe-figma/fixtures";
import {
  createFetchBridgeClient,
  startBridgeHttpServer,
  type BridgeHttpServer
} from "@vibe-figma/ui-bridge";

describe("bridge HTTP server", () => {
  let bridgeServer: BridgeHttpServer | undefined;

  afterEach(async () => {
    if (bridgeServer) {
      await bridgeServer.close();
      bridgeServer = undefined;
    }
  });

  test("stores and retrieves the latest capture", async () => {
    const document = await loadSampleCaptureDocument();

    bridgeServer = await startBridgeHttpServer();

    const client = createFetchBridgeClient({
      baseUrl: bridgeServer.baseUrl
    });
    const storedCapture = await client.uploadCapture(document);
    const latestCapture = await client.getLatestCapture();

    expect(storedCapture.document.schemaVersion).toBe("0.1");
    expect(latestCapture?.id).toBe(storedCapture.id);
  });
});
