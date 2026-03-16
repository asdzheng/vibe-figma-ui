import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import {
  designDocumentV0_1Schema,
  type DesignNodeV0_2
} from "@vibe-figma/schema";

import { convertDesignDocumentToV0_2 } from "../src/canonical-v0-2.js";

function visitNodes(
  nodes: readonly DesignNodeV0_2[],
  visitor: (node: DesignNodeV0_2) => void
): void {
  for (const node of nodes) {
    visitor(node);

    if (node.children) {
      visitNodes(node.children, visitor);
    }
  }
}

describe("convertDesignDocumentToV0_2", () => {
  test("keeps the representative manual export within the current v0.2 size budget", async () => {
    const v01 = designDocumentV0_1Schema.parse(
      JSON.parse(
        await readFile(resolve("artifacts/manual/current-selection.json"), "utf8")
      ) as unknown
    );
    const v02 = convertDesignDocumentToV0_2(v01);
    const pretty = JSON.stringify(v02, null, 2);
    const minified = JSON.stringify(v02);

    expect(pretty.split("\n").length).toBeLessThanOrEqual(370);
    expect(Buffer.byteLength(pretty)).toBeLessThanOrEqual(9_250);
    expect(Buffer.byteLength(minified)).toBeLessThanOrEqual(3_600);
  });

  test("uses shorthand literal, component, and text forms in the canonical output", async () => {
    const v01 = designDocumentV0_1Schema.parse(
      JSON.parse(
        await readFile(resolve("artifacts/manual/current-selection.json"), "utf8")
      ) as unknown
    );
    const v02 = convertDesignDocumentToV0_2(v01);
    let shorthandComponentCount = 0;
    let shorthandTextCount = 0;

    visitNodes(v02.roots, (node) => {
      if (typeof node.component === "string") {
        shorthandComponentCount += 1;
      }

      if (typeof node.text === "string") {
        shorthandTextCount += 1;
      }

      expect(node.kind === "text" ? node.style?.fill : undefined).toBeUndefined();
      expect(
        typeof node.style?.fill === "object" &&
          !Array.isArray(node.style.fill) &&
          "value" in node.style.fill
      ).toBe(false);
      expect(
        typeof node.style?.textColor === "object" &&
          node.style.textColor !== null &&
          "value" in node.style.textColor
      ).toBe(false);
      expect(
        typeof node.style?.stroke?.color === "object" &&
          node.style.stroke.color !== null &&
          "value" in node.style.stroke.color
      ).toBe(false);
    });

    expect(shorthandComponentCount).toBeGreaterThan(0);
    expect(shorthandTextCount).toBeGreaterThan(0);
  });

  test("keeps the larger live manual export within the current v3 large-selection budget", async () => {
    const v01 = designDocumentV0_1Schema.parse(
      JSON.parse(
        await readFile(resolve("artifacts/manual/p0-live-capture.debug.json"), "utf8")
      ) as unknown
    );
    const v02 = convertDesignDocumentToV0_2(v01);
    const pretty = JSON.stringify(v02, null, 2);
    const minified = JSON.stringify(v02);

    expect(pretty.split("\n").length).toBeLessThanOrEqual(1_200);
    expect(Buffer.byteLength(pretty)).toBeLessThanOrEqual(38_000);
    expect(Buffer.byteLength(minified)).toBeLessThanOrEqual(11_500);
  });
});
