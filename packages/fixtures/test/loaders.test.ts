import { describe, expect, test } from "vitest";

import {
  fixturePaths,
  loadSampleCaptureDocument,
  loadSamplePolicyRules
} from "@vibe-figma/fixtures";

describe("fixture loaders", () => {
  test("exposes the checked-in fixture paths", () => {
    expect(fixturePaths.sampleCapture.endsWith("sample-capture.json")).toBe(true);
    expect(fixturePaths.samplePolicyRules.endsWith("sample-policy-rules.json")).toBe(
      true
    );
  });

  test("loads the sample JSON fixtures", async () => {
    await expect(loadSampleCaptureDocument()).resolves.toMatchObject({
      schemaVersion: "0.1"
    });
    await expect(loadSamplePolicyRules()).resolves.toHaveLength(2);
  });
});
