import { afterEach, describe, expect, test } from "vitest";

import { loadSampleCaptureDocument } from "@vibe-figma/fixtures";
import {
  createFetchBridgeClient,
  startBridgeHttpServer,
  BRIDGE_CAPTURES_PATH,
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

    bridgeServer = await startBridgeHttpServer({ port: 0 });

    const client = createFetchBridgeClient({
      baseUrl: bridgeServer.baseUrl
    });
    const storedCapture = await client.uploadCapture(document);
    const latestCapture = await client.getLatestCapture();

    expect(storedCapture.document.schemaVersion).toBe("0.1");
    expect(latestCapture?.id).toBe(storedCapture.id);
  });

  test("responds to CORS preflight requests for browser-based plugin UI uploads", async () => {
    bridgeServer = await startBridgeHttpServer({ port: 0 });

    const response = await fetch(`${bridgeServer.baseUrl}${BRIDGE_CAPTURES_PATH}`, {
      headers: {
        origin: "https://www.figma.com"
      },
      method: "OPTIONS"
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toContain("POST");
  });
});
