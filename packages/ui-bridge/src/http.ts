import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

import { storedCaptureSchema, type CaptureBridgeClient, type CaptureStore } from "./contracts.js";
import { createMemoryCaptureStore } from "./store.js";

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
    "content-type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
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

export async function startBridgeHttpServer(
  options: StartBridgeHttpServerOptions = {}
): Promise<BridgeHttpServer> {
  const host = options.host ?? "127.0.0.1";
  const store = options.store ?? createMemoryCaptureStore();
  const server = createServer(async (request, response) => {
    const requestUrl = new URL(
      request.url ?? "/",
      `http://${request.headers.host ?? `${host}:${options.port ?? 0}`}`
    );

    try {
      if (request.method === "GET" && requestUrl.pathname === "/health") {
        sendJson(response, 200, { ok: true });
        return;
      }

      if (request.method === "GET" && requestUrl.pathname === "/captures/latest") {
        const capture = await store.getLatest();

        if (!capture) {
          sendJson(response, 404, { error: "No capture available." });
          return;
        }

        sendJson(response, 200, capture);
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/captures") {
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
    server.listen(options.port ?? 0, host, resolve);
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
    async getLatestCapture() {
      const response = await fetchImpl(`${baseUrl}/captures/latest`);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Bridge request failed with ${response.status}.`);
      }

      return storedCaptureSchema.parse((await response.json()) as unknown);
    },
    async uploadCapture(document) {
      const response = await fetchImpl(`${baseUrl}/captures`, {
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
