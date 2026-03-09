import type { DesignDocument } from "@vibe-figma/schema";

import type { BuildSelectionCaptureInput } from "./model.js";
import { buildSelectionCaptureFromRuntime } from "./runtime/capture.js";
import type { RuntimePluginApi, RuntimeSceneNode } from "./runtime/types.js";
import {
  renderPluginUiHtml,
  type PluginUiToMainMessage
} from "./ui.js";

export const PLUGIN_VERSION = "0.3.1";

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
  bridgeBaseUrl?: string | undefined;
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
    case "capture:selection":
    case "capture:close":
      return true;
    case "capture:error":
      return typeof record.message === "string" && record.message.length > 0;
    case "capture:uploaded":
      return (
        "payload" in record &&
        typeof record.payload === "object" &&
        record.payload !== null &&
        "captureId" in record.payload &&
        typeof record.payload.captureId === "string" &&
        "receivedAt" in record.payload &&
        typeof record.payload.receivedAt === "string"
      );
    default:
      return false;
  }
}

function buildCurrentSelectionCapture(
  pluginApi: PluginRuntimeHost,
  options: InitializePluginRuntimeOptions = {}
): DesignDocument {
  return buildSelectionCaptureFromRuntime({
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

export function captureCurrentSelection(): DesignDocument {
  if (typeof figma === "undefined") {
    throw new Error("Figma runtime is not available.");
  }

  return buildCurrentSelectionCapture(toRuntimeHost(figma));
}

export function initializePluginRuntimeWithApi(
  pluginApi: PluginRuntimeHost,
  options: InitializePluginRuntimeOptions = {}
): void {
  pluginApi.showUI(renderPluginUiHtml(options.bridgeBaseUrl ? {
    bridgeBaseUrl: options.bridgeBaseUrl
  } : {}), {
    height: 420,
    visible: false,
    width: 360
  });

  pluginApi.ui.onmessage = (message: unknown) => {
    if (!isPluginUiToMainMessage(message)) {
      return;
    }

    if (message.type === "capture:selection") {
      try {
        const document = buildCurrentSelectionCapture(pluginApi, options);

        pluginApi.ui.postMessage({
          payload: document,
          type: "capture:result"
        });
      } catch (error) {
        pluginApi.closePlugin(toErrorMessage(error, "Capture failed."));
      }

      return;
    }

    if (message.type === "capture:uploaded") {
      pluginApi.closePlugin(
        `Capture uploaded to local bridge (${message.payload.captureId}).`
      );
      return;
    }

    if (message.type === "capture:error") {
      pluginApi.closePlugin(`Bridge upload failed: ${message.message}`);
      return;
    }

    if (message.type === "capture:close") {
      pluginApi.closePlugin();
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

if (typeof figma !== "undefined") {
  initializePluginRuntime();
}
