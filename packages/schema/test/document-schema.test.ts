import { describe, expect, test } from "vitest";

import {
  captureFixtureNames,
  loadCaptureFixtureDocument,
  loadSampleCaptureDocument
} from "@vibe-figma/fixtures";
import { designDocumentSchema, isDesignDocumentV0_1 } from "@vibe-figma/schema";

describe("designDocumentSchema", () => {
  test.each(captureFixtureNames)(
    "accepts the checked-in %s capture fixture",
    async (fixtureName) => {
      const fixture = await loadCaptureFixtureDocument(fixtureName);

      expect(designDocumentSchema.parse(fixture)).toMatchObject({
        schemaVersion: "0.1"
      });
    }
  );

  test("accepts the checked-in sample capture", async () => {
    await expect(loadSampleCaptureDocument()).resolves.toMatchObject({
      schemaVersion: "0.1"
    });
  });

  test("rejects unknown top-level keys", async () => {
    const fixture = await loadSampleCaptureDocument();

    expect(() =>
      designDocumentSchema.parse({
        ...fixture,
        unexpected: true
      })
    ).toThrow();
  });

  test("rejects missing registry references", async () => {
    const fixture = await loadSampleCaptureDocument();

    if (!isDesignDocumentV0_1(fixture)) {
      throw new Error("Expected the sample capture fixture to stay on schema v0.1.");
    }

    const invalid = structuredClone(fixture);

    delete invalid.registries.components["component:button-primary"];

    expect(() => designDocumentSchema.parse(invalid)).toThrow(/componentRef/i);
  });
});
