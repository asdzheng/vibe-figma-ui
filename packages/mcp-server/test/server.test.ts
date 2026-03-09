import { describe, expect, test } from "vitest";

import { loadSampleCaptureDocument, loadSamplePolicyRules } from "@vibe-figma/fixtures";
import { createToolSuite } from "@vibe-figma/mcp-server";
import {
  createMemoryCaptureStore,
  createStoreBackedBridgeClient
} from "@vibe-figma/ui-bridge";

describe("MCP tool suite", () => {
  test("validates documents and exposes bridge-backed capture tools", async () => {
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
    await expect(tools.getLatestCaptureDocument()).resolves.toMatchObject({
      document: {
        schemaVersion: "0.1"
      },
      summary: {
        registryCounts: {
          components: 1,
          variables: 1
        },
        rootCount: 1,
        selectionCount: 1,
        warningCount: 0
      }
    });
    await expect(
      tools.getLatestCaptureRegistries({
        registries: ["components", "variables"]
      })
    ).resolves.toMatchObject({
      registries: {
        components: {
          "component:button-primary": {
            ref: "component:button-primary"
          }
        },
        variables: {
          "variable:color-action-primary": {
            ref: "variable:color-action-primary"
          }
        }
      },
      requestedRegistries: ["components", "variables"]
    });
    await expect(tools.getLatestCaptureDiagnostics()).resolves.toMatchObject({
      diagnostics: {
        warnings: []
      },
      summary: {
        registryCounts: {
          componentSets: 1,
          styles: 1
        },
        warningCount: 0
      }
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
