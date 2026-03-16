import { afterEach, describe, expect, test } from "vitest";

import {
  createFetchCompanionClient,
  getCompanionSessionCommandsPath,
  getCompanionSessionEventsPath,
  pluginSessionEventSchema,
  sessionCommandPollResponseSchema,
  sessionRegistrationResponseSchema,
  startCompanionHttpServer
} from "@vibe-figma/cli";
import { loadSampleCaptureDocument } from "@vibe-figma/fixtures";

describe("CLI companion server", () => {
  let companionServer:
    | Awaited<ReturnType<typeof startCompanionHttpServer>>
    | undefined;

  afterEach(async () => {
    if (companionServer) {
      await companionServer.close();
      companionServer = undefined;
    }
  });

  test("routes live status and capture commands through a connected plugin session", async () => {
    const document = await loadSampleCaptureDocument();

    companionServer = await startCompanionHttpServer({
      port: 0,
      version: "0.9.0"
    });

    const client = createFetchCompanionClient({
      baseUrl: companionServer.baseUrl
    });
    const registerResponse = await fetch(
      `${companionServer.baseUrl}/plugin/sessions`,
      {
        body: JSON.stringify({
          pluginVersion: "0.9.0"
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      }
    );
    const { sessionId } = sessionRegistrationResponseSchema.parse(
      (await registerResponse.json()) as unknown
    );

    await fetch(
      `${companionServer.baseUrl}${getCompanionSessionEventsPath(sessionId)}`,
      {
        body: JSON.stringify(
          pluginSessionEventSchema.parse({
            payload: {
              page: {
                id: "1:2",
                name: "Checkout"
              },
              pluginVersion: "0.9.0",
              selectionCount: 1,
              selectionNodes: [
                {
                  id: "2:1",
                  name: "Screen",
                  type: "FRAME"
                }
              ],
              timestamp: "2026-03-10T08:00:00.000Z"
            },
            type: "session:ready"
          })
        ),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      }
    );

    await expect(client.getStatus()).resolves.toMatchObject({
      activeSessionId: sessionId,
      connected: true,
      sessions: [
        {
          id: sessionId,
          isActive: true,
          pageName: "Checkout",
          selectionCount: 1
        }
      ]
    });

    const statusPoll = fetch(
      `${companionServer.baseUrl}${getCompanionSessionCommandsPath(sessionId)}?waitMs=100`
    ).then(async (response) =>
      sessionCommandPollResponseSchema.parse((await response.json()) as unknown)
    );
    const statusRequest = client.requestStatus({ sessionId });
    const statusCommand = await statusPoll;

    expect(statusCommand.command).toMatchObject({
      id: expect.any(String),
      method: "status"
    });

    await fetch(
      `${companionServer.baseUrl}${getCompanionSessionEventsPath(sessionId)}`,
      {
        body: JSON.stringify({
          payload: {
            commandId: statusCommand.command?.id,
            method: "status",
            status: {
              page: {
                id: "1:2",
                name: "Checkout"
              },
              pluginVersion: "0.9.0",
              selectionCount: 2,
              selectionNodes: [
                {
                  id: "2:1",
                  name: "Screen",
                  type: "FRAME"
                },
                {
                  id: "2:2",
                  name: "Heading",
                  type: "TEXT"
                }
              ],
              timestamp: "2026-03-10T08:00:01.000Z"
            }
          },
          type: "command:result"
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      }
    );

    await expect(statusRequest).resolves.toMatchObject({
      sessionId,
      status: {
        selectionCount: 2
      }
    });

    const capturePoll = fetch(
      `${companionServer.baseUrl}${getCompanionSessionCommandsPath(sessionId)}?waitMs=100`
    ).then(async (response) =>
      sessionCommandPollResponseSchema.parse((await response.json()) as unknown)
    );
    const captureRequest = client.requestCapture({ sessionId });
    const captureCommand = await capturePoll;

    expect(captureCommand.command).toMatchObject({
      id: expect.any(String),
      method: "capture"
    });

    await fetch(
      `${companionServer.baseUrl}${getCompanionSessionEventsPath(sessionId)}`,
      {
        body: JSON.stringify({
          payload: {
            commandId: captureCommand.command?.id,
            document,
            method: "capture"
          },
          type: "command:result"
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      }
    );

    await expect(captureRequest).resolves.toMatchObject({
      document: {
        schemaVersion: document.schemaVersion
      },
      sessionId
    });
  });

  test("collects plugin and companion logs for doctor-style inspection", async () => {
    companionServer = await startCompanionHttpServer({
      port: 0,
      version: "0.9.0"
    });

    const client = createFetchCompanionClient({
      baseUrl: companionServer.baseUrl
    });
    const registerResponse = await fetch(
      `${companionServer.baseUrl}/plugin/sessions`,
      {
        body: JSON.stringify({
          pluginVersion: "0.9.0"
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      }
    );
    const { sessionId } = sessionRegistrationResponseSchema.parse(
      (await registerResponse.json()) as unknown
    );

    await fetch(
      `${companionServer.baseUrl}${getCompanionSessionEventsPath(sessionId)}`,
      {
        body: JSON.stringify({
          payload: {
            at: "2026-03-10T08:05:00.000Z",
            level: "warn",
            message: "Plugin UI lost the local companion once and retried.",
            scope: "plugin-ui"
          },
          type: "session:log"
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      }
    );

    await expect(client.getLogs({ limit: 5 })).resolves.toMatchObject({
      entries: expect.arrayContaining([
        expect.objectContaining({
          message: "Plugin UI lost the local companion once and retried.",
          sessionId
        }),
        expect.objectContaining({
          message: "Plugin session connected.",
          sessionId
        })
      ])
    });

    await expect(client.getDoctor()).resolves.toMatchObject({
      companionUrl: companionServer.baseUrl,
      issues: expect.arrayContaining([
        "No capture has been returned yet. Run `vibe-figma capture` or `vibe-figma export-json` from another terminal after the plugin connects."
      ]),
      sessions: [
        {
          id: sessionId
        }
      ]
    });
  });

  test("queues debug capture requests with the requested profile", async () => {
    const document = await loadSampleCaptureDocument();

    companionServer = await startCompanionHttpServer({
      port: 0,
      version: "0.9.0"
    });

    const client = createFetchCompanionClient({
      baseUrl: companionServer.baseUrl
    });
    const registerResponse = await fetch(
      `${companionServer.baseUrl}/plugin/sessions`,
      {
        body: JSON.stringify({
          pluginVersion: "0.9.0"
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      }
    );
    const { sessionId } = sessionRegistrationResponseSchema.parse(
      (await registerResponse.json()) as unknown
    );

    const capturePoll = fetch(
      `${companionServer.baseUrl}${getCompanionSessionCommandsPath(sessionId)}?waitMs=100`
    ).then(async (response) =>
      sessionCommandPollResponseSchema.parse((await response.json()) as unknown)
    );
    const captureRequest = client.requestCapture({
      profile: "debug",
      sessionId
    });
    const captureCommand = await capturePoll;

    expect(captureCommand.command).toMatchObject({
      id: expect.any(String),
      method: "capture",
      profile: "debug"
    });

    await fetch(
      `${companionServer.baseUrl}${getCompanionSessionEventsPath(sessionId)}`,
      {
        body: JSON.stringify({
          payload: {
            commandId: captureCommand.command?.id,
            document,
            method: "capture"
          },
          type: "command:result"
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      }
    );

    await expect(captureRequest).resolves.toMatchObject({
      document: {
        schemaVersion: "0.1"
      },
      sessionId
    });
  });

  test("surfaces plugin command failures back through the companion client", async () => {
    companionServer = await startCompanionHttpServer({
      port: 0,
      version: "0.9.0"
    });

    const client = createFetchCompanionClient({
      baseUrl: companionServer.baseUrl
    });
    const registerResponse = await fetch(
      `${companionServer.baseUrl}/plugin/sessions`,
      {
        body: JSON.stringify({
          pluginVersion: "0.9.0"
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      }
    );
    const { sessionId } = sessionRegistrationResponseSchema.parse(
      (await registerResponse.json()) as unknown
    );

    const capturePoll = fetch(
      `${companionServer.baseUrl}${getCompanionSessionCommandsPath(sessionId)}?waitMs=100`
    ).then(async (response) =>
      sessionCommandPollResponseSchema.parse((await response.json()) as unknown)
    );
    const captureRequest = client.requestCapture({ sessionId });
    const captureCommand = await capturePoll;

    await fetch(
      `${companionServer.baseUrl}${getCompanionSessionEventsPath(sessionId)}`,
      {
        body: JSON.stringify({
          payload: {
            commandId: captureCommand.command?.id,
            details: {
              recoverable: true,
              scope: "plugin-worker",
              selectionCount: 0,
              suggestion:
                "Select at least one frame, group, or component in Figma and retry."
            },
            error: "Capture failed in plugin worker.",
            method: "capture"
          },
          type: "command:result"
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      }
    );

    await expect(captureRequest).rejects.toThrow(
      "Capture failed in plugin worker. Select at least one frame, group, or component in Figma and retry."
    );
  });
});
