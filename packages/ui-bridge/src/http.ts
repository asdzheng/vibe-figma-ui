import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

import {
  captureHistorySchema,
  storedCaptureSchema,
  type CaptureBridgeClient,
  type CaptureStore
} from "./contracts.js";
import {
  BRIDGE_CAPTURES_PATH,
  BRIDGE_HEALTH_PATH,
  BRIDGE_LATEST_CAPTURE_PATH,
  DEFAULT_BRIDGE_HOST,
  DEFAULT_BRIDGE_PORT,
  getBridgeCapturePath
} from "./constants.js";
import { createFileCaptureStore } from "./store.js";

export type BridgeHttpServer = {
  baseUrl: string;
  close(): Promise<void>;
  server: ReturnType<typeof createServer>;
  store: CaptureStore;
};

export type StartBridgeHttpServerOptions = {
  host?: string;
  port?: number;
  store?: CaptureStore;
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

function parseCaptureListLimit(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`Invalid capture list limit: ${value}`);
  }

  return parsedValue;
}

export async function startBridgeHttpServer(
  options: StartBridgeHttpServerOptions = {}
): Promise<BridgeHttpServer> {
  const host = options.host ?? DEFAULT_BRIDGE_HOST;
  const store = options.store ?? createFileCaptureStore();
  const port = options.port ?? DEFAULT_BRIDGE_PORT;
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

      if (request.method === "GET" && requestUrl.pathname === BRIDGE_HEALTH_PATH) {
        sendJson(response, 200, { ok: true });
        return;
      }

      if (
        request.method === "GET" &&
        requestUrl.pathname === BRIDGE_LATEST_CAPTURE_PATH
      ) {
        const capture = await store.getLatest();

        if (!capture) {
          sendJson(response, 404, { error: "No capture available." });
          return;
        }

        sendJson(response, 200, capture);
        return;
      }

      if (request.method === "GET" && requestUrl.pathname === BRIDGE_CAPTURES_PATH) {
        const captureListLimit = requestUrl.searchParams.has("limit")
          ? parseCaptureListLimit(requestUrl.searchParams.get("limit"))
          : undefined;
        const captures = await store.list({
          ...(captureListLimit !== undefined ? { limit: captureListLimit } : {})
        });

        sendJson(response, 200, captures);
        return;
      }

      if (
        request.method === "GET" &&
        requestUrl.pathname.startsWith(`${BRIDGE_CAPTURES_PATH}/`)
      ) {
        const captureId = decodeURIComponent(
          requestUrl.pathname.slice(`${BRIDGE_CAPTURES_PATH}/`.length)
        );
        const capture = await store.getById(captureId);

        if (!capture) {
          sendJson(response, 404, { error: "Capture not found." });
          return;
        }

        sendJson(response, 200, capture);
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === BRIDGE_CAPTURES_PATH) {
        const rawBody = await readRequestBody(request);
        const payload = rawBody.length > 0 ? (JSON.parse(rawBody) as unknown) : {};
        const storedCapture = await store.save(payload);

        sendJson(response, 201, storedCapture);
        return;
      }

      sendJson(response, 404, { error: "Not found." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected bridge error.";
      sendJson(response, 400, { error: message });
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(port, host, resolve);
  });

  const address = server.address() as AddressInfo;

  return {
    baseUrl: `http://${host}:${address.port}`,
    close: async () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
    server,
    store
  };
}

export function createFetchBridgeClient(options: {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}): CaptureBridgeClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl.replace(/\/$/, "");

  return {
    async getCaptureById(captureId) {
      const response = await fetchImpl(`${baseUrl}${getBridgeCapturePath(captureId)}`);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Bridge request failed with ${response.status}.`);
      }

      return storedCaptureSchema.parse((await response.json()) as unknown);
    },
    async getLatestCapture() {
      const response = await fetchImpl(`${baseUrl}${BRIDGE_LATEST_CAPTURE_PATH}`);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Bridge request failed with ${response.status}.`);
      }

      return storedCaptureSchema.parse((await response.json()) as unknown);
    },
    async listCaptures(listOptions = {}) {
      const requestUrl = new URL(`${baseUrl}${BRIDGE_CAPTURES_PATH}`);

      if (listOptions.limit !== undefined) {
        requestUrl.searchParams.set("limit", String(listOptions.limit));
      }

      const response = await fetchImpl(requestUrl.toString());

      if (!response.ok) {
        throw new Error(`Bridge request failed with ${response.status}.`);
      }

      return captureHistorySchema.parse((await response.json()) as unknown);
    },
    async uploadCapture(document) {
      const response = await fetchImpl(`${baseUrl}${BRIDGE_CAPTURES_PATH}`, {
        body: JSON.stringify(document),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      });

      if (!response.ok) {
        throw new Error(`Bridge request failed with ${response.status}.`);
      }

      return storedCaptureSchema.parse((await response.json()) as unknown);
    }
  };
}
