import { describe, expect, test } from "vitest";

import {
  captureFixtureNames,
  fixturePaths,
  loadAllCaptureFixtureDocuments,
  loadCaptureFixtureDocument,
  loadSampleCaptureDocument,
  loadSamplePolicyRules
} from "@vibe-figma/fixtures";

describe("fixture loaders", () => {
  test("exposes the checked-in fixture paths", () => {
    expect(fixturePaths.sampleCapture.endsWith("sample-capture.json")).toBe(true);
    expect(fixturePaths.captures.iconNormalized.endsWith("icon-normalized-capture.json")).toBe(
      true
    );
    expect(
      fixturePaths.captures.helperInlined.endsWith("helper-inlined-capture.json")
    ).toBe(true);
    expect(
      fixturePaths.captures.helperIgnored.endsWith("helper-ignored-capture.json")
    ).toBe(true);
    expect(
      fixturePaths.captures.remoteLibrary.endsWith("remote-library-capture.json")
    ).toBe(true);
    expect(
      fixturePaths.captures.variableModes.endsWith("variable-modes-capture.json")
    ).toBe(true);
    expect(fixturePaths.samplePolicyRules.endsWith("sample-policy-rules.json")).toBe(
      true
    );
  });

  test("loads the checked-in capture fixtures by name", async () => {
    const fixtures = await loadAllCaptureFixtureDocuments();

    expect(Object.keys(fixtures)).toEqual([...captureFixtureNames]);
    await expect(loadCaptureFixtureDocument("iconNormalized")).resolves.toMatchObject({
      roots: [{ kind: "icon" }]
    });
    await expect(loadCaptureFixtureDocument("helperInlined")).resolves.toMatchObject({
      roots: [
        {
          designSystem: {
            policy: "inline"
          },
          origin: {
            transform: "inlined-instance"
          }
        }
      ]
    });
    await expect(loadCaptureFixtureDocument("helperIgnored")).resolves.toMatchObject({
      diagnostics: {
        warnings: expect.any(Array)
      },
      roots: []
    });
    await expect(loadCaptureFixtureDocument("remoteLibrary")).resolves.toMatchObject({
      registries: {
        components: {
          "component:button-primary": {
            library: {
              name: "Orbit DS"
            },
            remote: true
          }
        }
      }
    });
    await expect(loadCaptureFixtureDocument("variableModes")).resolves.toMatchObject({
      capture: {
        modeContext: {
          "VariableCollectionId:theme": "mode-dark"
        }
      },
      registries: {
        variables: {
          "variable:surface-background": {
            modes: [
              expect.objectContaining({
                modeId: "mode-dark"
              })
            ]
          }
        }
      }
    });
  });

  test("loads the sample JSON fixtures", async () => {
    await expect(loadSampleCaptureDocument()).resolves.toMatchObject({
      schemaVersion: "0.1"
    });
    await expect(loadSamplePolicyRules()).resolves.toHaveLength(2);
  });
});
