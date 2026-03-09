import { describe, expect, test } from "vitest";

import { loadSampleCaptureDocument, loadSamplePolicyRules } from "@vibe-figma/fixtures";
import { createToolSuite } from "@vibe-figma/mcp-server";
import {
  createMemoryCaptureStore,
  createStoreBackedBridgeClient
} from "@vibe-figma/ui-bridge";

describe("MCP tool suite", () => {
  test("validates documents and reads latest captures from the bridge", async () => {
    const document = await loadSampleCaptureDocument();
    const store = createMemoryCaptureStore();
    const bridgeClient = createStoreBackedBridgeClient(store);
    const tools = createToolSuite({ bridgeClient });

    await bridgeClient.uploadCapture(document);

    await expect(
      tools.validateDesignDocument({ document })
    ).resolves.toMatchObject({
      valid: true
    });
    await expect(tools.getLatestCapture()).resolves.toMatchObject({
      schemaVersion: "0.1"
    });
  });

  test("evaluates component policy with the sample rule table", async () => {
    const rules = await loadSamplePolicyRules();
    const tools = createToolSuite();

    await expect(
      tools.evaluateComponentPolicy({
        context: {
          componentName: "Icon/Search",
          libraryName: "system-icons"
        },
        rules
      })
    ).resolves.toEqual({
      matchedRuleId: "icon-library",
      policy: "icon"
    });
  });
});
