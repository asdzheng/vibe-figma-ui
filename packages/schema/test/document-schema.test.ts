import { describe, expect, test } from "vitest";

import { loadSampleCaptureDocument } from "@vibe-figma/fixtures";
import { designDocumentSchema } from "@vibe-figma/schema";

describe("designDocumentSchema", () => {
  test("accepts the checked-in sample capture", async () => {
    const fixture = await loadSampleCaptureDocument();

    expect(designDocumentSchema.parse(fixture)).toMatchObject({
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
    const invalid = structuredClone(fixture);

    delete invalid.registries.components["component:button-primary"];

    expect(() => designDocumentSchema.parse(invalid)).toThrow(/componentRef/i);
  });
});
