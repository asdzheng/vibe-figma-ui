import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterAll, afterEach, describe, expect, test, vi } from "vitest";

import { fixturePaths } from "@vibe-figma/fixtures";

import { runCli } from "../src/cli.js";

describe("runCli screenshot", () => {
  const stdoutWrite = vi.spyOn(process.stdout, "write");

  afterEach(() => {
    stdoutWrite.mockReset();
  });

  afterAll(() => {
    stdoutWrite.mockRestore();
  });

  test("renders an SVG artifact from a canonical JSON file input", async () => {
    stdoutWrite.mockImplementation(() => true);
    const outputDir = await mkdtemp(join(tmpdir(), "vibe-figma-cli-"));
    const outputPath = join(outputDir, "capture.snapshot.svg");

    await runCli([
      "screenshot",
      "--input",
      fixturePaths.sampleCapture,
      "--output",
      outputPath
    ]);

    const printedOutput = stdoutWrite.mock.calls
      .map(([chunk]) => String(chunk))
      .join("");
    const summary = JSON.parse(printedOutput) as {
      outputPath: string;
      pageName: string;
      source: string;
    };
    const snapshotContents = await readFile(outputPath, "utf8");

    expect(summary).toMatchObject({
      outputPath,
      pageName: "Checkout",
      source: "file"
    });
    expect(snapshotContents).toContain("<svg");
    expect(snapshotContents).toContain("Checkout");
  });

  test("accepts the pnpm run -- separator before the command", async () => {
    stdoutWrite.mockImplementation(() => true);
    const outputDir = await mkdtemp(join(tmpdir(), "vibe-figma-cli-"));
    const outputPath = join(outputDir, "capture.snapshot.svg");

    await runCli([
      "--",
      "screenshot",
      "--input",
      fixturePaths.sampleCapture,
      "--output",
      outputPath
    ]);

    const printedOutput = stdoutWrite.mock.calls
      .map(([chunk]) => String(chunk))
      .join("");
    const summary = JSON.parse(printedOutput) as {
      outputPath: string;
      source: string;
    };

    expect(summary).toMatchObject({
      outputPath,
      source: "file"
    });
  });
});
