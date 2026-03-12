import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { renderDesignDocumentSnapshot } from "@vibe-figma/cli";
import { loadSampleCaptureDocument } from "@vibe-figma/fixtures";
import { designDocumentSchema } from "@vibe-figma/schema";

async function loadCurrentExportDocument() {
  return designDocumentSchema.parse(
    JSON.parse(
      await readFile(resolve("artifacts/e2e/current-export.json"), "utf8")
    ) as unknown
  );
}

describe("renderDesignDocumentSnapshot", () => {
  test("renders the sample capture into a self-contained SVG", async () => {
    const document = await loadSampleCaptureDocument();
    const rendered = renderDesignDocumentSnapshot(document);

    expect(rendered.svg).toContain("<svg");
    expect(rendered.svg).toContain("Checkout");
    expect(rendered.svg).toContain("Pay now");
    expect(rendered.stats.nodeCount).toBeGreaterThanOrEqual(3);
    expect(rendered.stats.instanceCount).toBeGreaterThanOrEqual(1);
  });

  test("reverse-renders the live current export with materialized Material 3 instances", async () => {
    const document = await loadCurrentExportDocument();
    const rendered = renderDesignDocumentSnapshot(document);

    expect(rendered.svg).toContain("App bar");
    expect(rendered.svg).toContain("Navigation Bar: Vertical items");
    expect(rendered.svg).toContain("Button - text");
    expect(rendered.stats.instanceCount).toBeGreaterThanOrEqual(10);
    expect(rendered.stats.materializedInstanceCount).toBeGreaterThanOrEqual(4);
    expect(rendered.width).toBeGreaterThan(400);
    expect(rendered.height).toBeGreaterThan(900);
  });
});
