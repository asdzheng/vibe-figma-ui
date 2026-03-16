import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterAll, afterEach, describe, expect, test, vi } from "vitest";

import { fixturePaths, loadSampleCaptureDocument } from "@vibe-figma/fixtures";

import { runCli } from "../src/cli.js";

describe("runCli screenshot", () => {
  const stdoutWrite = vi.spyOn(process.stdout, "write");
  const fetchMock = vi.fn<typeof fetch>();

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
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

  test("renders an HTML preview artifact when the screenshot output ends in html", async () => {
    stdoutWrite.mockImplementation(() => true);
    const outputDir = await mkdtemp(join(tmpdir(), "vibe-figma-cli-"));
    const outputPath = join(outputDir, "capture.preview.html");

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
      format: string;
      outputPath: string;
    };
    const previewContents = await readFile(outputPath, "utf8");

    expect(summary).toMatchObject({
      format: "html-preview",
      outputPath
    });
    expect(previewContents).toContain("<!doctype html>");
    expect(previewContents).toContain("<svg");
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

  test("forwards debug profile requests to live export-json", async () => {
    stdoutWrite.mockImplementation(() => true);
    const document = await loadSampleCaptureDocument();

    fetchMock.mockImplementation(async (_input, init) => {
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toMatchObject({
        profile: "debug"
      });

      return new Response(
        JSON.stringify({
          capturedAt: "2026-03-15T08:00:00.000Z",
          document,
          sessionId: "session-123"
        }),
        {
          headers: {
            "content-type": "application/json"
          },
          status: 200
        }
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    await runCli([
      "export-json",
      "--profile",
      "debug",
      "--companion-url",
      "http://localhost:3845"
    ]);

    const printedOutput = stdoutWrite.mock.calls
      .map(([chunk]) => String(chunk))
      .join("");
    const exported = JSON.parse(printedOutput) as {
      schemaVersion: string;
    };

    expect(exported).toMatchObject({
      schemaVersion: "0.1"
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("prints session summaries for multi-window workflows", async () => {
    stdoutWrite.mockImplementation(() => true);

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          activeSessionId: "session-2",
          connected: true,
          latestCaptureAvailable: true,
          serverVersion: "0.9.0",
          sessions: [
            {
              connectedAt: "2026-03-15T09:00:00.000Z",
              hasCapture: true,
              id: "session-2",
              isActive: true,
              lastSeenAt: "2026-03-15T09:00:02.000Z",
              logCount: 3,
              pageName: "Checkout",
              pluginVersion: "0.9.0",
              selectionCount: 2
            },
            {
              connectedAt: "2026-03-15T08:59:00.000Z",
              hasCapture: false,
              id: "session-1",
              isActive: true,
              lastSeenAt: "2026-03-15T09:00:01.000Z",
              logCount: 1,
              pageName: "Marketing",
              pluginVersion: "0.9.0",
              selectionCount: 1
            }
          ]
        }),
        {
          headers: {
            "content-type": "application/json"
          },
          status: 200
        }
      )
    );

    vi.stubGlobal("fetch", fetchMock);

    await runCli([
      "sessions",
      "--companion-url",
      "http://localhost:3845"
    ]);

    const printedOutput = stdoutWrite.mock.calls
      .map(([chunk]) => String(chunk))
      .join("");
    const sessionsPayload = JSON.parse(printedOutput) as {
      activeSessionId: string | null;
      totalSessions: number;
    };

    expect(sessionsPayload).toMatchObject({
      activeSessionId: "session-2",
      totalSessions: 2
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("rejects removed bridge environment variable aliases", async () => {
    await expect(
      runCli(["init"], {
        VIBE_FIGMA_BRIDGE_URL: "http://localhost:4011"
      })
    ).rejects.toThrow(
      "Legacy bridge environment variables are no longer supported. Rename VIBE_FIGMA_BRIDGE_URL -> VIBE_FIGMA_COMPANION_URL."
    );
  });
});
