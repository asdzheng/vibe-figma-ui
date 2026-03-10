import { describe, expect, test } from "vitest";

import {
  DEFAULT_COMPANION_BASE_URL,
  DEFAULT_POLL_MS,
  DEFAULT_REPORT_PATH,
  DEFAULT_TIMEOUT_MS,
  parseFigmaE2eArgs,
  validateSmokeCapture,
  waitForConnectedSession
} from "./figma-e2e-smoke.mjs";

function createDocument(overrides = {}) {
  return {
    capture: {
      page: {
        id: "1:2",
        name: "Checkout"
      },
      pluginVersion: "0.8.0",
      selection: [{ id: "2:1", kind: "frame" }]
    },
    diagnostics: {
      warnings: []
    },
    roots: [{ id: "12:34", kind: "frame" }],
    schemaVersion: "0.1",
    ...overrides
  };
}

describe("parseFigmaE2eArgs", () => {
  test("returns the default smoke options", () => {
    expect(parseFigmaE2eArgs([])).toEqual({
      companionBaseUrl: DEFAULT_COMPANION_BASE_URL,
      maxDiagnostics: 0,
      minRoots: 1,
      minSelectionCount: 1,
      pollMs: DEFAULT_POLL_MS,
      reportPath: DEFAULT_REPORT_PATH,
      timeoutMs: DEFAULT_TIMEOUT_MS
    });
  });

  test("parses custom options and tolerates pnpm's double-dash separator", () => {
    expect(
      parseFigmaE2eArgs([
        "--",
        "--companion-url",
        "http://localhost:4010/",
        "--timeout-ms=9000",
        "--poll-ms",
        "500",
        "--min-roots",
        "2",
        "--min-selection=3",
        "--max-diagnostics",
        "1",
        "--expect-page-name",
        "Payments",
        "--report-file",
        "tmp/report.json"
      ])
    ).toEqual({
      companionBaseUrl: "http://localhost:4010",
      expectPageName: "Payments",
      maxDiagnostics: 1,
      minRoots: 2,
      minSelectionCount: 3,
      pollMs: 500,
      reportPath: "tmp/report.json",
      timeoutMs: 9000
    });
  });

  test("accepts the legacy bridge-url flag as a transitional alias", () => {
    expect(parseFigmaE2eArgs(["--bridge-url=http://localhost:4011/"])).toMatchObject({
      companionBaseUrl: "http://localhost:4011"
    });
  });
});

describe("validateSmokeCapture", () => {
  test("accepts a capture that satisfies the smoke assertions", () => {
    const result = validateSmokeCapture(createDocument(), {
      expectPageName: "Checkout",
      maxDiagnostics: 0,
      minRoots: 1,
      minSelectionCount: 1
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.summary).toMatchObject({
      diagnosticsCount: 0,
      pageName: "Checkout",
      pluginVersion: "0.8.0",
      rootCount: 1,
      selectionCount: 1
    });
  });

  test("returns actionable errors when the document does not match expectations", () => {
    const result = validateSmokeCapture(
      createDocument({
        capture: {
          page: {
            id: "1:2",
            name: "Canvas"
          },
          pluginVersion: "",
          selection: []
        },
        diagnostics: {
          warnings: ["Companion warning"]
        },
        roots: [],
        schemaVersion: ""
      }),
      {
        expectPageName: "Checkout",
        maxDiagnostics: 0,
        minRoots: 1,
        minSelectionCount: 1
      }
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      "Design document is missing schemaVersion.",
      "Design document is missing capture.pluginVersion.",
      "Expected at least 1 root node(s), received 0.",
      "Expected selectionCount >= 1, received 0.",
      "Expected diagnosticsCount <= 0, received 1.",
      'Expected page name "Checkout", received "Canvas".'
    ]);
  });
});

describe("waitForConnectedSession", () => {
  test("resolves once the companion reports a connected session", async () => {
    let currentTime = 0;
    const statuses = [
      { connected: false },
      { activeSessionId: "session-123", connected: true }
    ];

    const connectedStatus = await waitForConnectedSession({
      getStatus: async () => statuses.shift() ?? statuses.at(-1),
      now: () => currentTime,
      pollMs: 100,
      sleep: async (delayMs) => {
        currentTime += delayMs;
      },
      timeoutMs: 500
    });

    expect(connectedStatus).toMatchObject({
      activeSessionId: "session-123",
      connected: true
    });
  });

  test("fails when no live session arrives before the timeout", async () => {
    let currentTime = 0;

    await expect(
      waitForConnectedSession({
        getStatus: async () => ({ connected: false }),
        now: () => currentTime,
        pollMs: 100,
        sleep: async (delayMs) => {
          currentTime += delayMs;
        },
        timeoutMs: 300
      })
    ).rejects.toThrow(
      "Timed out after 300ms waiting for an active vibe-figma plugin session. Start the companion, run the plugin in Figma desktop, and keep the plugin window open until the smoke report is written."
    );
  });
});
