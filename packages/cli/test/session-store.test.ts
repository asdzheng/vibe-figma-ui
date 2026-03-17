import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, test } from "vitest";

import {
  CompanionSessionManager,
  SESSION_STALE_AFTER_MS,
  type PluginSessionEvent
} from "@vibe-figma/cli";
import { loadSampleCaptureDocument } from "@vibe-figma/fixtures";

function createReadyEvent(
  pageName: string,
  selectionCount: number
): Extract<PluginSessionEvent, { type: "session:ready" }> {
  return {
    payload: {
      page: {
        id: "1:2",
        name: pageName
      },
      pluginVersion: "0.9.0",
      selectionCount,
      selectionNodes: [
        {
          id: "2:1",
          name: "Selection",
          type: "FRAME"
        }
      ],
      timestamp: "2026-03-15T00:00:00.000Z"
    },
    type: "session:ready"
  };
}

describe("CompanionSessionManager", () => {
  test("marks stale sessions inactive and promotes a newer reconnecting session", () => {
    let nowMs = Date.parse("2026-03-15T00:00:00.000Z");
    const manager = new CompanionSessionManager({
      now: () => new Date(nowMs),
      serverVersion: "0.9.0"
    });

    const staleSessionId = manager.registerSession("0.9.0");
    manager.recordEvent(staleSessionId, createReadyEvent("Checkout", 1));

    nowMs += SESSION_STALE_AFTER_MS + 1;

    expect(manager.getStatus()).toMatchObject({
      connected: false,
      sessions: [
        {
          id: staleSessionId,
          isActive: false,
          pageName: "Checkout"
        }
      ]
    });
    expect(manager.getDoctor("http://localhost:3845").issues).toContain(
      "A previous plugin session exists but is stale. Re-run the Figma plugin to reconnect."
    );

    const reconnectedSessionId = manager.registerSession("0.9.0");
    manager.recordEvent(reconnectedSessionId, createReadyEvent("Checkout", 2));

    expect(manager.getStatus()).toMatchObject({
      activeSessionId: reconnectedSessionId,
      connected: true,
      sessions: [
        {
          id: reconnectedSessionId,
          isActive: true,
          pageName: "Checkout",
          selectionCount: 2
        },
        {
          id: staleSessionId,
          isActive: false
        }
      ]
    });
  });

  test("propagates plugin command failures back to the caller and stores an error log", async () => {
    const manager = new CompanionSessionManager({
      serverVersion: "0.9.0"
    });
    const sessionId = manager.registerSession("0.9.0");
    const pollPromise = manager.waitForCommand(sessionId, 100);
    const dispatchPromise = manager.dispatchCommand("capture", sessionId);
    const command = await pollPromise;

    expect(command).toMatchObject({
      id: expect.any(String),
      method: "capture"
    });

    manager.recordEvent(sessionId, {
      payload: {
        commandId: command?.id ?? "missing",
        error: "Capture failed in plugin worker.",
        method: "capture"
      },
      type: "command:result"
    });

    await expect(dispatchPromise).resolves.toMatchObject({
      result: {
        commandId: command?.id,
        error: "Capture failed in plugin worker.",
        method: "capture"
      },
      sessionId
    });
    expect(manager.getLogs({ limit: 5, sessionId })).toMatchObject({
      entries: expect.arrayContaining([
        expect.objectContaining({
          level: "error",
          message: "Capture failed in plugin worker.",
          sessionId
        })
      ])
    });
  });

  test("times out unanswered commands with a session-specific error", async () => {
    const manager = new CompanionSessionManager({
      commandTimeoutMs: 10,
      serverVersion: "0.9.0"
    });
    const sessionId = manager.registerSession("0.9.0");

    await expect(
      manager.dispatchCommand("capture", sessionId, undefined, 10)
    ).rejects.toThrow(
      new RegExp(`Timed out after 10ms waiting for capture from session ${sessionId}`)
    );
  });

  test("adds doctor guidance when multiple active sessions are connected", () => {
    const manager = new CompanionSessionManager({
      serverVersion: "0.9.0"
    });
    const firstSessionId = manager.registerSession("0.9.0");
    const secondSessionId = manager.registerSession("0.9.0");

    manager.recordEvent(firstSessionId, createReadyEvent("Checkout", 1));
    manager.recordEvent(secondSessionId, createReadyEvent("Marketing", 2));

    expect(manager.getDoctor("http://localhost:3845")).toMatchObject({
      issues: expect.arrayContaining([
        "Multiple active plugin sessions are connected. Run `vibe-figma sessions` and pass `--session <id>` to target a specific window."
      ])
    });
  });

  test("persists session status, logs, and captures when state persistence is enabled", async () => {
    const stateDir = await mkdtemp(join(tmpdir(), "vibe-figma-state-"));
    const stateFilePath = join(stateDir, "companion-state.json");
    const document = await loadSampleCaptureDocument();
    const now = new Date("2026-03-15T09:30:00.000Z");
    const manager = new CompanionSessionManager({
      now: () => now,
      serverVersion: "0.9.0",
      stateFilePath
    });
    const sessionId = manager.registerSession("0.9.0");
    const pollPromise = manager.waitForCommand(sessionId, 100);
    const dispatchPromise = manager.dispatchCommand("capture", sessionId);
    const command = await pollPromise;

    manager.recordEvent(sessionId, createReadyEvent("Checkout", 2));
    manager.recordEvent(sessionId, {
      payload: {
        commandId: command?.id ?? "missing",
        document,
        method: "capture"
      },
      type: "command:result"
    });

    await dispatchPromise;
    await manager.flushPersistence();

    const persistedState = JSON.parse(
      await readFile(stateFilePath, "utf8")
    ) as {
      sessions: Array<{
        id: string;
        lastCapture: {
          schemaVersion: string;
        } | null;
      }>;
    };

    expect(persistedState.sessions).toEqual([
      expect.objectContaining({
        id: sessionId,
        lastCapture: expect.objectContaining({
          schemaVersion: "0.1"
        })
      })
    ]);

    const restoredManager = new CompanionSessionManager({
      now: () => now,
      serverVersion: "0.9.0",
      stateFilePath
    });

    expect(restoredManager.getStatus()).toMatchObject({
      activeSessionId: sessionId,
      connected: true,
      latestCaptureAvailable: true,
      sessions: [
        {
          hasCapture: true,
          id: sessionId,
          isActive: true,
          pageName: "Checkout",
          selectionCount: 2
        }
      ]
    });
    expect(restoredManager.getLogs({ limit: 5, sessionId })).toMatchObject({
      entries: expect.arrayContaining([
        expect.objectContaining({
          message: "Plugin runtime reported ready status.",
          sessionId
        })
      ])
    });
  });
});
