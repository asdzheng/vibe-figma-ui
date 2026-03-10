import { designDocumentSchema } from "@vibe-figma/schema";
import { z } from "zod";

export const DEFAULT_COMPANION_HOST = "localhost";
export const DEFAULT_COMPANION_PORT = 3845;
export const DEFAULT_COMPANION_BASE_URL = `http://${DEFAULT_COMPANION_HOST}:${DEFAULT_COMPANION_PORT}`;

export const COMPANION_HEALTH_PATH = "/health";
export const COMPANION_STATUS_PATH = "/status";
export const COMPANION_DOCTOR_PATH = "/doctor";
export const COMPANION_LOGS_PATH = "/logs";
export const COMPANION_PLUGIN_SESSIONS_PATH = "/plugin/sessions";
export const COMPANION_COMMANDS_PATH = "/commands";

export const DEFAULT_COMMAND_TIMEOUT_MS = 15_000;
export const DEFAULT_LOG_LIMIT = 50;
export const DEFAULT_LONG_POLL_MS = 25_000;
export const MAX_LOG_ENTRIES = 200;
export const SESSION_STALE_AFTER_MS = 45_000;

const timestampSchema = z.string().datetime();

export function normalizeCompanionBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

export function getCompanionCommandPath(method: RuntimeCommandMethod): string {
  return `${COMPANION_COMMANDS_PATH}/${method}`;
}

export function getCompanionSessionCommandsPath(sessionId: string): string {
  return `${COMPANION_PLUGIN_SESSIONS_PATH}/${encodeURIComponent(sessionId)}/commands`;
}

export function getCompanionSessionEventsPath(sessionId: string): string {
  return `${COMPANION_PLUGIN_SESSIONS_PATH}/${encodeURIComponent(sessionId)}/events`;
}

export const runtimeSelectionNodeSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    type: z.string().min(1)
  })
  .strict();

export type RuntimeSelectionNode = z.infer<typeof runtimeSelectionNodeSchema>;

export const runtimeStatusSchema = z
  .object({
    page: z
      .object({
        id: z.string().min(1),
        name: z.string().min(1)
      })
      .strict(),
    pluginVersion: z.string().min(1),
    selectionCount: z.number().int().nonnegative(),
    selectionNodes: z.array(runtimeSelectionNodeSchema),
    timestamp: timestampSchema
  })
  .strict();

export type RuntimeStatus = z.infer<typeof runtimeStatusSchema>;

export const runtimeCommandMethodSchema = z.enum(["status", "capture"]);

export type RuntimeCommandMethod = z.infer<typeof runtimeCommandMethodSchema>;

export const runtimeCommandSchema = z.discriminatedUnion("method", [
  z
    .object({
      id: z.string().min(1),
      method: z.literal("status")
    })
    .strict(),
  z
    .object({
      id: z.string().min(1),
      method: z.literal("capture")
    })
    .strict()
]);

export type RuntimeCommand = z.infer<typeof runtimeCommandSchema>;

export const runtimeCommandErrorSchema = z
  .object({
    commandId: z.string().min(1),
    error: z.string().min(1),
    method: runtimeCommandMethodSchema
  })
  .strict();

export const runtimeCommandResultSchema = z.union([
  z
    .object({
      commandId: z.string().min(1),
      method: z.literal("status"),
      status: runtimeStatusSchema
    })
    .strict(),
  z
    .object({
      commandId: z.string().min(1),
      document: designDocumentSchema,
      method: z.literal("capture")
    })
    .strict(),
  runtimeCommandErrorSchema
]);

export type RuntimeCommandResult = z.infer<typeof runtimeCommandResultSchema>;

export const pluginLogEntrySchema = z
  .object({
    at: timestampSchema,
    level: z.enum(["info", "warn", "error"]),
    message: z.string().min(1),
    scope: z.string().min(1)
  })
  .strict();

export type PluginLogEntry = z.infer<typeof pluginLogEntrySchema>;

export const companionLogEntrySchema = pluginLogEntrySchema
  .extend({
    sessionId: z.string().min(1).optional()
  })
  .strict();

export type CompanionLogEntry = z.infer<typeof companionLogEntrySchema>;

export const pluginSessionEventSchema = z.discriminatedUnion("type", [
  z
    .object({
      payload: runtimeStatusSchema,
      type: z.literal("session:ready")
    })
    .strict(),
  z
    .object({
      payload: pluginLogEntrySchema,
      type: z.literal("session:log")
    })
    .strict(),
  z
    .object({
      payload: runtimeCommandResultSchema,
      type: z.literal("command:result")
    })
    .strict()
]);

export type PluginSessionEvent = z.infer<typeof pluginSessionEventSchema>;

export const companionHealthSchema = z
  .object({
    ok: z.literal(true)
  })
  .strict();

export type CompanionHealth = z.infer<typeof companionHealthSchema>;

export const companionSessionSummarySchema = z
  .object({
    connectedAt: timestampSchema,
    hasCapture: z.boolean(),
    id: z.string().min(1),
    isActive: z.boolean(),
    lastSeenAt: timestampSchema,
    logCount: z.number().int().nonnegative(),
    pageName: z.string().min(1).optional(),
    pluginVersion: z.string().min(1),
    selectionCount: z.number().int().nonnegative().optional()
  })
  .strict();

export type CompanionSessionSummary = z.infer<
  typeof companionSessionSummarySchema
>;

export const companionStatusSchema = z
  .object({
    activeSessionId: z.string().min(1).optional(),
    connected: z.boolean(),
    latestCaptureAvailable: z.boolean(),
    serverVersion: z.string().min(1),
    sessions: z.array(companionSessionSummarySchema)
  })
  .strict();

export type CompanionStatus = z.infer<typeof companionStatusSchema>;

export const companionDoctorSchema = companionStatusSchema
  .extend({
    companionUrl: z.string().min(1),
    issues: z.array(z.string())
  })
  .strict();

export type CompanionDoctor = z.infer<typeof companionDoctorSchema>;

export const companionLogsSchema = z
  .object({
    entries: z.array(companionLogEntrySchema),
    totalReturned: z.number().int().nonnegative()
  })
  .strict();

export type CompanionLogs = z.infer<typeof companionLogsSchema>;

export const sessionRegistrationRequestSchema = z
  .object({
    pluginVersion: z.string().min(1)
  })
  .strict();

export const sessionRegistrationResponseSchema = z
  .object({
    sessionId: z.string().min(1)
  })
  .strict();

export const sessionCommandPollResponseSchema = z
  .object({
    command: runtimeCommandSchema.nullable()
  })
  .strict();

export const commandRequestSchema = z
  .object({
    sessionId: z.string().min(1).optional()
  })
  .strict();

export type CommandRequest = z.infer<typeof commandRequestSchema>;

export const commandStatusResponseSchema = z
  .object({
    sessionId: z.string().min(1),
    status: runtimeStatusSchema
  })
  .strict();

export type CommandStatusResponse = z.infer<typeof commandStatusResponseSchema>;

export const commandCaptureResponseSchema = z
  .object({
    capturedAt: timestampSchema,
    document: designDocumentSchema,
    sessionId: z.string().min(1)
  })
  .strict();

export type CommandCaptureResponse = z.infer<
  typeof commandCaptureResponseSchema
>;
