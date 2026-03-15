import type {
  RuntimeCommand,
  RuntimeCommandResult,
  RuntimeStatus
} from "@vibe-figma/cli/transport";
import type { DesignDocument } from "@vibe-figma/schema";

import type { BuildSelectionCaptureInput } from "./model.js";
import { buildSelectionCaptureFromRuntimeAsync } from "./runtime/capture.js";
import type { RuntimePluginApi, RuntimeSceneNode } from "./runtime/types.js";
import {
  renderPluginUiHtml,
  type PluginUiToMainMessage
} from "./ui.js";

export const PLUGIN_VERSION = "0.8.0";
export const PLUGIN_UI_SIZE = {
  height: 520,
  width: 420
} as const;

type PluginUiChannel = {
  onmessage: ((message: unknown) => void) | undefined;
  postMessage(message: unknown, options?: { origin?: string }): void;
};

type PluginRuntimeHost = RuntimePluginApi & {
  closePlugin(message?: string): void;
  currentPage: {
    id: string;
    name: string;
    selection: readonly RuntimeSceneNode[];
  };
  showUI(
    html: string,
    options?: {
      height?: number;
      visible?: boolean;
      width?: number;
    }
  ): void;
  ui: PluginUiChannel;
};

export type InitializePluginRuntimeOptions = Omit<
  BuildSelectionCaptureInput,
  "page" | "pluginVersion" | "registries" | "selection"
> & {
  companionBaseUrl?: string | undefined;
};

function toRuntimeHost(pluginApi: PluginAPI): PluginRuntimeHost {
  return pluginApi as unknown as PluginRuntimeHost;
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function isPluginUiToMainMessage(message: unknown): message is PluginUiToMainMessage {
  if (typeof message !== "object" || message === null || !("type" in message)) {
    return false;
  }

  const record = message as Record<string, unknown>;

  switch (record.type) {
    case "runtime:error":
      return typeof record.message === "string" && record.message.length > 0;
    case "runtime:execute":
      return (
        "payload" in record &&
        typeof record.payload === "object" &&
        record.payload !== null &&
        "id" in record.payload &&
        typeof record.payload.id === "string" &&
        "method" in record.payload &&
        typeof record.payload.method === "string"
      );
    default:
      return false;
  }
}

async function buildCurrentSelectionCapture(
  pluginApi: PluginRuntimeHost,
  options: InitializePluginRuntimeOptions = {}
): Promise<DesignDocument> {
  return buildSelectionCaptureFromRuntimeAsync({
    page: {
      id: pluginApi.currentPage.id,
      name: pluginApi.currentPage.name
    },
    pluginApi,
    pluginVersion: PLUGIN_VERSION,
    selection: pluginApi.currentPage.selection,
    ...(options.sourceFileKey ? { sourceFileKey: options.sourceFileKey } : {}),
    ...(options.timestamp ? { timestamp: options.timestamp } : {})
  });
}

export function captureCurrentSelection(): Promise<DesignDocument> {
  if (typeof figma === "undefined") {
    throw new Error("Figma runtime is not available.");
  }

  return buildCurrentSelectionCapture(toRuntimeHost(figma));
}

function buildRuntimeStatus(pluginApi: PluginRuntimeHost): RuntimeStatus {
  return {
    designSystems: [
      {
        description: "The official design system, providing components and tokens.",
        name: "Vibe Design System",
        url: "https://vibe.monday.com/"
      }
    ],
    page: {
      id: pluginApi.currentPage.id,
      name: pluginApi.currentPage.name
    },
    pluginVersion: PLUGIN_VERSION,
    selectionCount: pluginApi.currentPage.selection.length,
    selectionNodes: pluginApi.currentPage.selection.slice(0, 10).map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type
    })),
    timestamp: new Date().toISOString()
  };
}

async function executeRuntimeCommand(
  pluginApi: PluginRuntimeHost,
  command: RuntimeCommand,
  options: InitializePluginRuntimeOptions
): Promise<RuntimeCommandResult> {
  try {
    if (command.method === "status") {
      return {
        commandId: command.id,
        method: command.method,
        status: buildRuntimeStatus(pluginApi)
      };
    }

    return {
      commandId: command.id,
      document: await buildCurrentSelectionCapture(pluginApi, options),
      method: command.method
    };
  } catch (error) {
    return {
      commandId: command.id,
      error: toErrorMessage(error, "Plugin command failed."),
      method: command.method
    };
  }
}

export function initializePluginRuntimeWithApi(
  pluginApi: PluginRuntimeHost,
  options: InitializePluginRuntimeOptions = {}
): void {
  pluginApi.showUI(renderPluginUiHtml({
    ...(options.companionBaseUrl
      ? { companionBaseUrl: options.companionBaseUrl }
      : {}),
    pluginVersion: PLUGIN_VERSION
  }), {
    height: PLUGIN_UI_SIZE.height,
    visible: true,
    width: PLUGIN_UI_SIZE.width
  });

  pluginApi.ui.onmessage = (message: unknown) => {
    if (!isPluginUiToMainMessage(message)) {
      return;
    }

    if (message.type === "runtime:execute") {
      void executeRuntimeCommand(pluginApi, message.payload, options).then(
        (payload) => {
          pluginApi.ui.postMessage({
            payload,
            type: "runtime:command-result"
          });
        }
      );
      return;
    }

    if (message.type === "runtime:error") {
      pluginApi.closePlugin(`Companion connection failed: ${message.message}`);
    }
  };
}

export function initializePluginRuntime(
  options?: InitializePluginRuntimeOptions
): void {
  if (typeof figma === "undefined") {
    return;
  }

  initializePluginRuntimeWithApi(toRuntimeHost(figma), options);
}
