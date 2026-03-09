import type { DesignDocument } from "@vibe-figma/schema";

import {
  buildSelectionCapture,
  type BuildSelectionCaptureInput,
  type FigmaNodeLike
} from "./adapter.js";

export const PLUGIN_VERSION = "0.1.0";

export function captureCurrentSelection(): DesignDocument {
  if (typeof figma === "undefined") {
    throw new Error("Figma runtime is not available.");
  }

  return buildSelectionCapture({
    page: {
      id: figma.currentPage.id,
      name: figma.currentPage.name
    },
    pluginVersion: PLUGIN_VERSION,
    selection: figma.currentPage.selection as unknown as readonly FigmaNodeLike[]
  });
}

export function initializePluginRuntime(
  buildInput?: Omit<BuildSelectionCaptureInput, "page" | "pluginVersion" | "selection">
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
      const document = buildSelectionCapture({
        page: {
          id: figma.currentPage.id,
          name: figma.currentPage.name
        },
        pluginVersion: PLUGIN_VERSION,
        selection: figma.currentPage.selection as unknown as readonly FigmaNodeLike[],
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
