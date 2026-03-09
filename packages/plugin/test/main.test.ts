import { describe, expect, test, vi } from "vitest";

import {
  DEFAULT_BRIDGE_BASE_URL
} from "@vibe-figma/ui-bridge";
import {
  initializePluginRuntimeWithApi,
  PLUGIN_VERSION,
  renderPluginUiHtml,
  type PluginMainToUiMessage
} from "@vibe-figma/plugin";

function createPluginApiMock(): Parameters<
  typeof initializePluginRuntimeWithApi
>[0] {
  return {
    closePlugin: vi.fn(),
    currentPage: {
      id: "1:2",
      name: "Checkout",
      selection: [
        {
          children: [
            {
              characters: "Checkout",
              height: 24,
              id: "2:2",
              name: "Heading",
              type: "TEXT",
              width: 180
            }
          ],
          height: 844,
          id: "2:1",
          name: "Screen",
          type: "FRAME",
          width: 390
        }
      ]
    },
    getStyleById() {
      return null;
    },
    showUI: vi.fn(),
    ui: {
      onmessage: undefined,
      postMessage: vi.fn()
    },
    variables: {
      getVariableById() {
        return null;
      },
      getVariableCollectionById() {
        return null;
      }
    }
  };
}

describe("plugin runtime bridge flow", () => {
  test("renders bridge upload UI with a normalized default bridge URL", () => {
    const html = renderPluginUiHtml({
      bridgeBaseUrl: `${DEFAULT_BRIDGE_BASE_URL}/`
    });

    expect(html).toContain(`"bridgeBaseUrl":"${DEFAULT_BRIDGE_BASE_URL}"`);
    expect(html).toContain("capture:selection");
    expect(html).toContain("capture:uploaded");
  });

  test("captures the selection and closes after the UI reports bridge upload", () => {
    const pluginApi = createPluginApiMock();

    initializePluginRuntimeWithApi(pluginApi, {
      bridgeBaseUrl: "http://127.0.0.1:4010/"
    });

    expect(pluginApi.showUI).toHaveBeenCalledWith(
      expect.stringContaining('"bridgeBaseUrl":"http://127.0.0.1:4010"'),
      expect.objectContaining({
        height: 420,
        visible: false,
        width: 360
      })
    );
    expect(typeof pluginApi.ui.onmessage).toBe("function");

    pluginApi.ui.onmessage?.({ type: "capture:selection" });

    expect(pluginApi.ui.postMessage).toHaveBeenCalledTimes(1);

    const captureMessage = vi.mocked(pluginApi.ui.postMessage).mock.calls[0]?.[0] as
      | PluginMainToUiMessage
      | undefined;

    expect(captureMessage?.type).toBe("capture:result");
    expect(captureMessage?.payload.capture.pluginVersion).toBe(PLUGIN_VERSION);
    expect(captureMessage?.payload.capture.page.name).toBe("Checkout");

    pluginApi.ui.onmessage?.({
      payload: {
        captureId: "capture-123",
        receivedAt: "2026-03-09T10:00:00.000Z"
      },
      type: "capture:uploaded"
    });

    expect(pluginApi.closePlugin).toHaveBeenCalledWith(
      "Capture uploaded to local bridge (capture-123)."
    );
  });

  test("closes the plugin with a bridge error message when upload fails", () => {
    const pluginApi = createPluginApiMock();

    initializePluginRuntimeWithApi(pluginApi);

    pluginApi.ui.onmessage?.({
      message: "CORS preflight failed.",
      type: "capture:error"
    });

    expect(pluginApi.closePlugin).toHaveBeenCalledWith(
      "Bridge upload failed: CORS preflight failed."
    );
  });
});
