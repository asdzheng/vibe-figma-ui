import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { loadSampleCaptureDocument } from "@vibe-figma/fixtures";
import {
  BRIDGE_CAPTURES_PATH,
  createFetchBridgeClient,
  createFileCaptureStore,
  createMemoryCaptureStore,
  getBridgeCapturePath,
  startBridgeHttpServer,
  type BridgeHttpServer
} from "@vibe-figma/ui-bridge";

describe("bridge HTTP server", () => {
  let bridgeServer: BridgeHttpServer | undefined;
  let temporaryDirectory: string | undefined;

  afterEach(async () => {
    if (bridgeServer) {
      await bridgeServer.close();
      bridgeServer = undefined;
    }

    if (temporaryDirectory) {
      await rm(temporaryDirectory, { force: true, recursive: true });
      temporaryDirectory = undefined;
    }
  });

  test("stores, lists, and reloads capture history from persistent storage", async () => {
    const document = await loadSampleCaptureDocument();
    temporaryDirectory = await mkdtemp(join(tmpdir(), "vibe-figma-bridge-"));
    const storePath = join(temporaryDirectory, "captures.json");

    bridgeServer = await startBridgeHttpServer({
      port: 0,
      store: createFileCaptureStore({ filePath: storePath })
    });

    const client = createFetchBridgeClient({
      baseUrl: bridgeServer.baseUrl
    });
    const firstCapture = await client.uploadCapture(document);
    const secondCapture = await client.uploadCapture(document);

    await expect(client.getLatestCapture()).resolves.toMatchObject({
      id: secondCapture.id
    });
    await expect(client.getCaptureById(firstCapture.id)).resolves.toMatchObject({
      id: firstCapture.id
    });
    await expect(client.listCaptures()).resolves.toEqual([
      {
        id: secondCapture.id,
        receivedAt: secondCapture.receivedAt,
        rootCount: document.roots.length,
        schemaVersion: document.schemaVersion,
        selectionCount: document.capture.selection.length,
        warningCount: document.diagnostics.warnings.length
      },
      {
        id: firstCapture.id,
        receivedAt: firstCapture.receivedAt,
        rootCount: document.roots.length,
        schemaVersion: document.schemaVersion,
        selectionCount: document.capture.selection.length,
        warningCount: document.diagnostics.warnings.length
      }
    ]);
    await expect(client.listCaptures({ limit: 1 })).resolves.toEqual([
      {
        id: secondCapture.id,
        receivedAt: secondCapture.receivedAt,
        rootCount: document.roots.length,
        schemaVersion: document.schemaVersion,
        selectionCount: document.capture.selection.length,
        warningCount: document.diagnostics.warnings.length
      }
    ]);

    await bridgeServer.close();
    bridgeServer = await startBridgeHttpServer({
      port: 0,
      store: createFileCaptureStore({ filePath: storePath })
    });

    const restartedClient = createFetchBridgeClient({
      baseUrl: bridgeServer.baseUrl
    });

    await expect(restartedClient.getLatestCapture()).resolves.toMatchObject({
      id: secondCapture.id
    });
    await expect(restartedClient.getCaptureById(firstCapture.id)).resolves.toMatchObject({
      id: firstCapture.id
    });
  });

  test("responds to history and capture-id routes over HTTP", async () => {
    const document = await loadSampleCaptureDocument();

    bridgeServer = await startBridgeHttpServer({
      port: 0,
      store: createMemoryCaptureStore()
    });

    const client = createFetchBridgeClient({
      baseUrl: bridgeServer.baseUrl
    });
    const storedCapture = await client.uploadCapture(document);
    const historyResponse = await fetch(
      `${bridgeServer.baseUrl}${BRIDGE_CAPTURES_PATH}?limit=1`
    );
    const captureResponse = await fetch(
      `${bridgeServer.baseUrl}${getBridgeCapturePath(storedCapture.id)}`
    );

    expect(historyResponse.status).toBe(200);
    await expect(historyResponse.json()).resolves.toEqual([
      {
        id: storedCapture.id,
        receivedAt: storedCapture.receivedAt,
        rootCount: document.roots.length,
        schemaVersion: document.schemaVersion,
        selectionCount: document.capture.selection.length,
        warningCount: document.diagnostics.warnings.length
      }
    ]);
    expect(captureResponse.status).toBe(200);
    await expect(captureResponse.json()).resolves.toMatchObject({
      id: storedCapture.id
    });
  });

  test("responds to CORS preflight requests for browser-based plugin UI uploads", async () => {
    bridgeServer = await startBridgeHttpServer({
      port: 0,
      store: createMemoryCaptureStore()
    });

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
