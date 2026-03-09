import type { DesignDocument } from "@vibe-figma/schema";

import type { BuildSelectionCaptureInput } from "./model.js";
import { buildSelectionCaptureFromRuntime } from "./runtime/capture.js";
import type { RuntimePluginApi, RuntimeSceneNode } from "./runtime/types.js";

export const PLUGIN_VERSION = "0.2.0";

export function captureCurrentSelection(): DesignDocument {
  if (typeof figma === "undefined") {
    throw new Error("Figma runtime is not available.");
  }

  return buildSelectionCaptureFromRuntime({
    page: {
      id: figma.currentPage.id,
      name: figma.currentPage.name
    },
    pluginApi: figma as unknown as RuntimePluginApi,
    pluginVersion: PLUGIN_VERSION,
    selection: figma.currentPage.selection as unknown as readonly RuntimeSceneNode[]
  });
}

export function initializePluginRuntime(
  buildInput?: Omit<
    BuildSelectionCaptureInput,
    "page" | "pluginVersion" | "registries" | "selection"
  >
): void {
  if (typeof figma === "undefined") {
    return;
  }

  figma.showUI("<html><body></body></html>", {
    height: 420,
    visible: false,
    width: 360
  });

  figma.ui.onmessage = (message: unknown) => {
    if (
      typeof message === "object" &&
      message !== null &&
      "type" in message &&
      message.type === "capture:selection"
    ) {
      const document = buildSelectionCaptureFromRuntime({
        page: {
          id: figma.currentPage.id,
          name: figma.currentPage.name
        },
        pluginApi: figma as unknown as RuntimePluginApi,
        pluginVersion: PLUGIN_VERSION,
        selection:
          figma.currentPage.selection as unknown as readonly RuntimeSceneNode[],
        ...buildInput
      });

      figma.ui.postMessage({
        payload: document,
        type: "capture:result"
      });
    }

    if (
      typeof message === "object" &&
      message !== null &&
      "type" in message &&
      message.type === "capture:close"
    ) {
      figma.closePlugin();
    }
  };
}

if (typeof figma !== "undefined") {
  initializePluginRuntime();
}
