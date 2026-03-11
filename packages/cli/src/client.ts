import {
  COMPANION_DOCTOR_PATH,
  COMPANION_HEALTH_PATH,
  COMPANION_LOGS_PATH,
  COMPANION_STATUS_PATH,
  commandCaptureResponseSchema,
  commandStatusResponseSchema,
  companionDoctorSchema,
  companionHealthSchema,
  companionLogsSchema,
  companionStatusSchema,
  getCompanionCommandPath,
  normalizeCompanionBaseUrl,
  type CommandCaptureResponse,
  type CommandStatusResponse,
  type CompanionDoctor,
  type CompanionHealth,
  type CompanionLogs,
  type CompanionStatus
} from "./transport.js";
import { readCompanionError } from "./server.js";

export interface CompanionClient {
  getDoctor(): Promise<CompanionDoctor>;
  getHealth(): Promise<CompanionHealth>;
  getLogs(options?: { limit?: number; sessionId?: string }): Promise<CompanionLogs>;
  getStatus(): Promise<CompanionStatus>;
  requestCapture(options?: {
    sessionId?: string;
  }): Promise<CommandCaptureResponse>;
  requestStatus(options?: {
    sessionId?: string;
  }): Promise<CommandStatusResponse>;
}

async function parseJsonResponse<T>(
  response: Response,
  parser: {
    parse(value: unknown): T;
  }
): Promise<T> {
  if (!response.ok) {
    throw await readCompanionError(response);
  }

  return parser.parse((await response.json()) as unknown);
}

export function createFetchCompanionClient(options: {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}): CompanionClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = normalizeCompanionBaseUrl(options.baseUrl);

  return {
    async getDoctor() {
      return parseJsonResponse(
        await fetchImpl(`${baseUrl}${COMPANION_DOCTOR_PATH}`),
        companionDoctorSchema
      );
    },
    async getHealth() {
      return parseJsonResponse(
        await fetchImpl(`${baseUrl}${COMPANION_HEALTH_PATH}`),
        companionHealthSchema
      );
    },
    async getLogs(logOptions = {}) {
      const requestUrl = new URL(`${baseUrl}${COMPANION_LOGS_PATH}`);

      if (logOptions.limit !== undefined) {
        requestUrl.searchParams.set("limit", String(logOptions.limit));
      }

      if (logOptions.sessionId) {
        requestUrl.searchParams.set("sessionId", logOptions.sessionId);
      }

      return parseJsonResponse(
        await fetchImpl(requestUrl.toString()),
        companionLogsSchema
      );
    },
    async getStatus() {
      return parseJsonResponse(
        await fetchImpl(`${baseUrl}${COMPANION_STATUS_PATH}`),
        companionStatusSchema
      );
    },
    async requestCapture(commandOptions = {}) {
      return parseJsonResponse(
        await fetchImpl(`${baseUrl}${getCompanionCommandPath("capture")}`, {
          body: JSON.stringify(commandOptions),
          headers: {
            "content-type": "application/json"
          },
          method: "POST"
        }),
        commandCaptureResponseSchema
      );
    },
    async requestStatus(commandOptions = {}) {
      return parseJsonResponse(
        await fetchImpl(`${baseUrl}${getCompanionCommandPath("status")}`, {
          body: JSON.stringify(commandOptions),
          headers: {
            "content-type": "application/json"
          },
          method: "POST"
        }),
        commandStatusResponseSchema
      );
    }
  };
}
