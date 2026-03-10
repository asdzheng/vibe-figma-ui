import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

import {
  COMPANION_COMMANDS_PATH,
  COMPANION_DOCTOR_PATH,
  COMPANION_HEALTH_PATH,
  COMPANION_LOGS_PATH,
  COMPANION_PLUGIN_SESSIONS_PATH,
  COMPANION_STATUS_PATH,
  DEFAULT_COMPANION_HOST,
  DEFAULT_COMPANION_PORT,
  DEFAULT_LONG_POLL_MS,
  commandCaptureResponseSchema,
  commandRequestSchema,
  commandStatusResponseSchema,
  companionDoctorSchema,
  companionHealthSchema,
  companionLogsSchema,
  companionStatusSchema,
  pluginSessionEventSchema,
  runtimeCommandMethodSchema,
  sessionCommandPollResponseSchema,
  sessionRegistrationRequestSchema,
  sessionRegistrationResponseSchema
} from "./transport.js";
import {
  CompanionSessionManager,
  type CompanionSessionManagerOptions
} from "./session-store.js";

export type CompanionHttpServer = {
  baseUrl: string;
  close(): Promise<void>;
  manager: CompanionSessionManager;
  server: ReturnType<typeof createServer>;
};

export type StartCompanionHttpServerOptions = {
  host?: string;
  manager?: CompanionSessionManager;
  managerOptions?: Omit<CompanionSessionManagerOptions, "serverVersion">;
  port?: number;
  version: string;
};

function sendJson(
  response: ServerResponse,
  statusCode: number,
  payload: unknown
): void {
  response.writeHead(statusCode, {
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-origin": "*",
    "content-type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function sendNoContent(response: ServerResponse, statusCode: number): void {
  response.writeHead(statusCode, {
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-origin": "*"
  });
  response.end();
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      buffer += chunk;
    });
    request.on("end", () => resolve(buffer));
    request.on("error", reject);
  });
}

function readJsonBody(rawBody: string): unknown {
  if (!rawBody) {
    return {};
  }

  return JSON.parse(rawBody) as unknown;
}

function parsePositiveInteger(
  label: string,
  rawValue: string | null,
  fallbackValue: number
): number {
  if (!rawValue) {
    return fallbackValue;
  }

  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}: ${rawValue}`);
  }

  return parsed;
}

function extractSessionId(pathname: string, suffix: "/commands" | "/events"): string | null {
  const pathPrefix = `${COMPANION_PLUGIN_SESSIONS_PATH}/`;

  if (!pathname.startsWith(pathPrefix) || !pathname.endsWith(suffix)) {
    return null;
  }

  return decodeURIComponent(
    pathname.slice(pathPrefix.length, pathname.length - suffix.length)
  );
}

async function toErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as unknown;

    if (
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
    ) {
      return payload.error;
    }
  } catch {
    return `Companion request failed with ${response.status}.`;
  }

  return `Companion request failed with ${response.status}.`;
}

export async function startCompanionHttpServer(
  options: StartCompanionHttpServerOptions
): Promise<CompanionHttpServer> {
  const host = options.host ?? DEFAULT_COMPANION_HOST;
  const port = options.port ?? DEFAULT_COMPANION_PORT;
  const manager =
    options.manager ??
    new CompanionSessionManager({
      ...options.managerOptions,
      serverVersion: options.version
    });
  let baseUrl = `http://${host}:${port}`;
  const server = createServer(async (request, response) => {
    const requestUrl = new URL(
      request.url ?? "/",
      `http://${request.headers.host ?? `${host}:${port}`}`
    );

    try {
      if (request.method === "OPTIONS") {
        sendNoContent(response, 204);
        return;
      }

      if (request.method === "GET" && requestUrl.pathname === COMPANION_HEALTH_PATH) {
        sendJson(response, 200, companionHealthSchema.parse({ ok: true }));
        return;
      }

      if (request.method === "GET" && requestUrl.pathname === COMPANION_STATUS_PATH) {
        sendJson(response, 200, companionStatusSchema.parse(manager.getStatus()));
        return;
      }

      if (request.method === "GET" && requestUrl.pathname === COMPANION_DOCTOR_PATH) {
        sendJson(
          response,
          200,
          companionDoctorSchema.parse(manager.getDoctor(baseUrl))
        );
        return;
      }

      if (request.method === "GET" && requestUrl.pathname === COMPANION_LOGS_PATH) {
        const limit = parsePositiveInteger(
          "log limit",
          requestUrl.searchParams.get("limit"),
          50
        );
        const sessionId = requestUrl.searchParams.get("sessionId") ?? undefined;
        const logs = manager.getLogs({
          limit,
          ...(sessionId ? { sessionId } : {})
        });

        sendJson(response, 200, companionLogsSchema.parse(logs));
        return;
      }

      if (
        request.method === "POST" &&
        requestUrl.pathname === COMPANION_PLUGIN_SESSIONS_PATH
      ) {
        const payload = sessionRegistrationRequestSchema.parse(
          readJsonBody(await readRequestBody(request))
        );
        const sessionId = manager.registerSession(payload.pluginVersion);

        sendJson(
          response,
          201,
          sessionRegistrationResponseSchema.parse({ sessionId })
        );
        return;
      }

      if (request.method === "GET") {
        const sessionId = extractSessionId(requestUrl.pathname, "/commands");

        if (sessionId) {
          const waitMs = parsePositiveInteger(
            "command wait time",
            requestUrl.searchParams.get("waitMs"),
            DEFAULT_LONG_POLL_MS
          );
          const command = await manager.waitForCommand(sessionId, waitMs);

          sendJson(
            response,
            200,
            sessionCommandPollResponseSchema.parse({
              command
            })
          );
          return;
        }
      }

      if (request.method === "POST") {
        const sessionId = extractSessionId(requestUrl.pathname, "/events");

        if (sessionId) {
          const event = pluginSessionEventSchema.parse(
            readJsonBody(await readRequestBody(request))
          );

          manager.recordEvent(sessionId, event);
          sendNoContent(response, 204);
          return;
        }
      }

      if (
        request.method === "POST" &&
        requestUrl.pathname.startsWith(`${COMPANION_COMMANDS_PATH}/`)
      ) {
        const method = runtimeCommandMethodSchema.parse(
          decodeURIComponent(
            requestUrl.pathname.slice(`${COMPANION_COMMANDS_PATH}/`.length)
          )
        );
        const payload = commandRequestSchema.parse(
          readJsonBody(await readRequestBody(request))
        );
        const { result, sessionId } = await manager.dispatchCommand(
          method,
          payload.sessionId
        );

        if ("error" in result) {
          sendJson(response, 409, { error: result.error });
          return;
        }

        if ("status" in result) {
          sendJson(
            response,
            200,
            commandStatusResponseSchema.parse({
              sessionId,
              status: result.status
            })
          );
          return;
        }

        const capturedAt = new Date().toISOString();

        sendJson(
          response,
          200,
          commandCaptureResponseSchema.parse({
            capturedAt,
            document: result.document,
            sessionId
          })
        );
        return;
      }

      sendJson(response, 404, { error: "Not found." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected companion error.";
      sendJson(response, 400, { error: message });
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(port, host, resolve);
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://${host}:${address.port}`;

  return {
    baseUrl,
    close: async () =>
      new Promise<void>((resolve, reject) => {
        manager.dispose();
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
    manager,
    server
  };
}

export async function readCompanionError(response: Response): Promise<Error> {
  return new Error(await toErrorMessage(response));
}
