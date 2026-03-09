import { describe, expect, test } from "vitest";

import {
  loadCaptureFixtureDocument,
  loadSampleCaptureDocument,
  loadSamplePolicyRules
} from "@vibe-figma/fixtures";
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

    const firstCapture = await bridgeClient.uploadCapture(document);
    const secondCapture = await bridgeClient.uploadCapture(document);

    await expect(
      tools.validateDesignDocument({ document })
    ).resolves.toMatchObject({
      valid: true
    });
    await expect(tools.getCaptureHistory({ limit: 1 })).resolves.toEqual({
      captures: [
        {
          id: secondCapture.id,
          receivedAt: secondCapture.receivedAt,
          rootCount: 1,
          schemaVersion: "0.1",
          selectionCount: 1,
          warningCount: 0
        }
      ],
      totalReturned: 1
    });
    await expect(
      tools.getCaptureDocumentById({ captureId: firstCapture.id })
    ).resolves.toMatchObject({
      captureId: firstCapture.id,
      document: {
        schemaVersion: "0.1"
      },
      summary: {
        rootCount: 1,
        selectionCount: 1,
        warningCount: 0
      }
    });
    await expect(tools.getLatestCapture()).resolves.toMatchObject({
      captureId: secondCapture.id,
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

  test("loads named capture fixtures through the MCP tool suite", async () => {
    const tools = createToolSuite();
    const helperIgnored = await loadCaptureFixtureDocument("helperIgnored");

    await expect(
      tools.loadFixtureCapture({
        fixtureName: "helperIgnored",
        includePolicyRules: true
      })
    ).resolves.toEqual({
      document: helperIgnored,
      fixtureName: "helperIgnored",
      policyRules: await loadSamplePolicyRules()
    });

    await expect(tools.loadFixtureCapture({})).resolves.toMatchObject({
      document: await loadSampleCaptureDocument(),
      fixtureName: "sample"
    });
  });
});
