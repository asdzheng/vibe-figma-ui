import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { designDocumentV0_1Schema } from "@vibe-figma/schema";

import { convertDesignDocumentToV0_2 } from "../src/canonical-v0-2.js";

describe("convertDesignDocumentToV0_2", () => {
  test("keeps the checked-in live export within the current v0.2 size budget", async () => {
    const v01 = designDocumentV0_1Schema.parse(
      JSON.parse(
        await readFile(resolve("artifacts/e2e/current-export.json"), "utf8")
      ) as unknown
    );
    const v02 = convertDesignDocumentToV0_2(v01);
    const pretty = JSON.stringify(v02, null, 2);
    const minified = JSON.stringify(v02);

    expect(pretty.split("\n").length).toBeLessThanOrEqual(1600);
    expect(Buffer.byteLength(pretty)).toBeLessThanOrEqual(46_000);
    expect(Buffer.byteLength(minified)).toBeLessThanOrEqual(14_000);
  });
});
