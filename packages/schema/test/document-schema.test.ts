import { describe, expect, test } from "vitest";

import {
  captureFixtureNames,
  loadCaptureFixtureDocument,
  loadSampleCaptureDocument
} from "@vibe-figma/fixtures";
import {
  designDocumentSchema,
  designDocumentV0_2Schema,
  isDesignDocumentV0_1
} from "@vibe-figma/schema";

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

  test("accepts canonical v0.2 shorthand forms for literal values, components, and text", () => {
    expect(() =>
      designDocumentV0_2Schema.parse({
        capture: {
          page: "Checkout",
          roots: ["2:1"],
          scope: "selection"
        },
        profile: "canonical",
        roots: [
          {
            component: "Button / Primary",
            id: "2:1",
            kind: "instance",
            style: {
              fill: "#0f62fe"
            }
          },
          {
            kind: "text",
            style: {
              textColor: "#1d1b20ff",
              textStyle: "M3/title/large"
            },
            text: "Checkout"
          }
        ],
        schemaVersion: "0.2"
      })
    ).not.toThrow();
  });
});
