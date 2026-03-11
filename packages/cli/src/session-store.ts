import { randomUUID } from "node:crypto";
import { clearTimeout, setTimeout } from "node:timers";

import type { DesignDocument } from "@vibe-figma/schema";

import {
  DEFAULT_COMMAND_TIMEOUT_MS,
  DEFAULT_LOG_LIMIT,
  MAX_LOG_ENTRIES,
  SESSION_STALE_AFTER_MS,
  type CompanionDoctor,
  type CompanionLogEntry,
  type CompanionSessionSummary,
  type CompanionStatus,
  type PluginSessionEvent,
  type RuntimeCommand,
  type RuntimeCommandMethod,
  type RuntimeCommandResult,
  type RuntimeStatus,
  runtimeCommandSchema
} from "./transport.js";

type PendingCommand = {
  reject: (error: Error) => void;
  resolve: (result: RuntimeCommandResult) => void;
  timer: ReturnType<typeof setTimeout>;
};

type PendingPoll = {
  resolve: (command: RuntimeCommand | null) => void;
  timer: ReturnType<typeof setTimeout>;
};

type SessionRecord = {
  commandQueue: RuntimeCommand[];
  connectedAt: string;
  id: string;
  lastCapture: DesignDocument | null;
  lastSeenAt: string;
  lastStatus: RuntimeStatus | null;
  logs: CompanionLogEntry[];
  pendingCommands: Map<string, PendingCommand>;
  pendingPolls: PendingPoll[];
  pluginVersion: string;
};

export type CompanionSessionManagerOptions = {
  commandTimeoutMs?: number;
  now?: () => Date;
  serverVersion: string;
};

function createError(message: string): Error {
  return new Error(message);
}

export class CompanionSessionManager {
  private readonly commandTimeoutMs: number;
  private readonly now: () => Date;
  private readonly serverVersion: string;
  private readonly serverLogs: CompanionLogEntry[] = [];
  private readonly sessions = new Map<string, SessionRecord>();

  public constructor(options: CompanionSessionManagerOptions) {
    this.commandTimeoutMs =
      options.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    this.now = options.now ?? (() => new Date());
    this.serverVersion = options.serverVersion;
  }

  public dispose(): void {
    for (const session of this.sessions.values()) {
      for (const pendingPoll of session.pendingPolls) {
        clearTimeout(pendingPoll.timer);
        pendingPoll.resolve(null);
      }

      for (const pendingCommand of session.pendingCommands.values()) {
        clearTimeout(pendingCommand.timer);
        pendingCommand.reject(
          createError("Companion server stopped before the command completed.")
        );
      }
    }
  }

  public registerSession(pluginVersion: string): string {
    const sessionId = randomUUID();
    const nowIso = this.toTimestamp();

    this.sessions.set(sessionId, {
      commandQueue: [],
      connectedAt: nowIso,
      id: sessionId,
      lastCapture: null,
      lastSeenAt: nowIso,
      lastStatus: null,
      logs: [],
      pendingCommands: new Map(),
      pendingPolls: [],
      pluginVersion,
    });

    this.appendServerLog("info", "Plugin session connected.", sessionId);

    return sessionId;
  }

  public async waitForCommand(
    sessionId: string,
    waitMs: number
  ): Promise<RuntimeCommand | null> {
    const session = this.requireSession(sessionId);

    this.touchSession(session);

    const queuedCommand = session.commandQueue.shift();

    if (queuedCommand) {
      return queuedCommand;
    }

    return new Promise<RuntimeCommand | null>((resolve) => {
      const pendingPoll: PendingPoll = {
        resolve: (command) => {
          clearTimeout(pendingPoll.timer);
          resolve(command);
        },
        timer: setTimeout(() => {
          session.pendingPolls = session.pendingPolls.filter(
            (entry) => entry !== pendingPoll
          );
          resolve(null);
        }, waitMs)
      };

      session.pendingPolls.push(pendingPoll);
    });
  }

  public recordEvent(sessionId: string, event: PluginSessionEvent): void {
    const session = this.requireSession(sessionId);

    this.touchSession(session);

    if (event.type === "session:ready") {
      session.lastStatus = event.payload;
      this.appendLog(session, {
        at: this.toTimestamp(),
        level: "info",
        message: "Plugin runtime reported ready status.",
        scope: "plugin-ui",
        sessionId
      });
      return;
    }

    if (event.type === "session:log") {
      this.appendLog(session, {
        ...event.payload,
        sessionId
      });
      return;
    }

    if ("status" in event.payload) {
      session.lastStatus = event.payload.status;
    }

    if ("document" in event.payload) {
      session.lastCapture = event.payload.document;
    }

    if ("error" in event.payload) {
      this.appendLog(session, {
        at: this.toTimestamp(),
        level: "error",
        message: event.payload.error,
        scope: "plugin-worker",
        sessionId
      });
    }

    const pendingCommand = session.pendingCommands.get(event.payload.commandId);

    if (!pendingCommand) {
      return;
    }

    clearTimeout(pendingCommand.timer);
    session.pendingCommands.delete(event.payload.commandId);
    pendingCommand.resolve(event.payload);
  }

  public async dispatchCommand(
    method: RuntimeCommandMethod,
    requestedSessionId?: string,
    timeoutMs = this.commandTimeoutMs
  ): Promise<{
    result: RuntimeCommandResult;
    sessionId: string;
  }> {
    const session = this.selectSession(requestedSessionId);
    const command = runtimeCommandSchema.parse({
      id: randomUUID(),
      method
    });

    this.appendServerLog("info", `Queued ${method} command.`, session.id);

    const result = await new Promise<RuntimeCommandResult>((resolve, reject) => {
      const pendingCommand: PendingCommand = {
        reject,
        resolve,
        timer: setTimeout(() => {
          session.pendingCommands.delete(command.id);
          reject(
            createError(
              `Timed out after ${timeoutMs}ms waiting for ${method} from session ${session.id}.`
            )
          );
        }, timeoutMs)
      };

      session.pendingCommands.set(command.id, pendingCommand);

      const pendingPoll = session.pendingPolls.shift();

      if (pendingPoll) {
        pendingPoll.resolve(command);
        return;
      }

      session.commandQueue.push(command);
    });

    return {
      result,
      sessionId: session.id
    };
  }

  public getStatus(): CompanionStatus {
    const sessions = this.listSessionSummaries();
    const activeSession = sessions.find((session) => session.isActive);

    return {
      ...(activeSession ? { activeSessionId: activeSession.id } : {}),
      connected: activeSession !== undefined,
      latestCaptureAvailable: [...this.sessions.values()].some(
        (session) => session.lastCapture !== null
      ),
      serverVersion: this.serverVersion,
      sessions
    };
  }

  public getDoctor(companionUrl: string): CompanionDoctor {
    const status = this.getStatus();
    const issues: string[] = [];

    if (status.sessions.length === 0) {
      issues.push(
        "No plugin session is connected. Start `vibe-figma dev`, then run the Figma plugin in desktop and keep the plugin window open."
      );
    } else if (!status.connected) {
      issues.push(
        "A previous plugin session exists but is stale. Re-run the Figma plugin to reconnect."
      );
    }

    if (!status.latestCaptureAvailable) {
      issues.push(
        "No capture has been returned yet. Run `vibe-figma capture` or `vibe-figma export-json` from another terminal after the plugin connects."
      );
    }

    return {
      ...status,
      companionUrl,
      issues
    };
  }

  public getLogs(options: {
    limit?: number;
    sessionId?: string;
  } = {}): {
    entries: CompanionLogEntry[];
    totalReturned: number;
  } {
    const limit = options.limit ?? DEFAULT_LOG_LIMIT;

    if (options.sessionId) {
      const session = this.requireSession(options.sessionId);
      const entries = [...session.logs]
        .sort((left, right) => right.at.localeCompare(left.at))
        .slice(0, limit);

      return {
        entries,
        totalReturned: entries.length
      };
    }

    const entries = [
      ...this.serverLogs,
      ...[...this.sessions.values()].flatMap((session) => session.logs)
    ]
      .sort((left, right) => right.at.localeCompare(left.at))
      .slice(0, limit);

    return {
      entries,
      totalReturned: entries.length
    };
  }

  private appendLog(session: SessionRecord, entry: CompanionLogEntry): void {
    session.logs.push(entry);
    this.trimLogs(session.logs);
  }

  private appendServerLog(
    level: CompanionLogEntry["level"],
    message: string,
    sessionId?: string
  ): void {
    this.serverLogs.push({
      at: this.toTimestamp(),
      level,
      message,
      scope: "companion",
      ...(sessionId ? { sessionId } : {})
    });
    this.trimLogs(this.serverLogs);
  }

  private isSessionActive(session: SessionRecord): boolean {
    const lastSeenAt = Date.parse(session.lastSeenAt);

    return (
      Number.isFinite(lastSeenAt) &&
      this.now().getTime() - lastSeenAt <= SESSION_STALE_AFTER_MS
    );
  }

  private listSessionSummaries(): CompanionSessionSummary[] {
    return [...this.sessions.values()]
      .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt))
      .map((session) => ({
        connectedAt: session.connectedAt,
        hasCapture: session.lastCapture !== null,
        id: session.id,
        isActive: this.isSessionActive(session),
        lastSeenAt: session.lastSeenAt,
        logCount: session.logs.length,
        ...(session.lastStatus
          ? {
              pageName: session.lastStatus.page.name,
              selectionCount: session.lastStatus.selectionCount
            }
          : {}),
        pluginVersion: session.pluginVersion
      }));
  }

  private requireSession(sessionId: string): SessionRecord {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw createError(`Unknown plugin session: ${sessionId}.`);
    }

    return session;
  }

  private selectSession(requestedSessionId?: string): SessionRecord {
    if (requestedSessionId) {
      const session = this.requireSession(requestedSessionId);

      if (!this.isSessionActive(session)) {
        throw createError(`Plugin session ${requestedSessionId} is not active.`);
      }

      return session;
    }

    const activeSession = [...this.sessions.values()]
      .filter((session) => this.isSessionActive(session))
      .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt))[0];

    if (!activeSession) {
      throw createError(
        "No active plugin session is connected. Run the Figma plugin first."
      );
    }

    return activeSession;
  }

  private toTimestamp(): string {
    return this.now().toISOString();
  }

  private touchSession(session: SessionRecord): void {
    session.lastSeenAt = this.toTimestamp();
  }

  private trimLogs(logs: CompanionLogEntry[]): void {
    if (logs.length <= MAX_LOG_ENTRIES) {
      return;
    }

    logs.splice(0, logs.length - MAX_LOG_ENTRIES);
  }
}
