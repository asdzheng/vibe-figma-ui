import { describe, expect, test, vi } from "vitest";

import { DEFAULT_COMPANION_BASE_URL } from "@vibe-figma/cli/transport";
import {
  initializePluginRuntimeWithApi,
  PLUGIN_UI_SIZE,
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

describe("plugin runtime companion flow", () => {
  test("renders companion UI with a normalized default companion URL", () => {
    const html = renderPluginUiHtml({
      companionBaseUrl: `${DEFAULT_COMPANION_BASE_URL}/`
    });

    expect(html).toContain(`"companionBaseUrl":"${DEFAULT_COMPANION_BASE_URL}"`);
    expect(html).toContain('"commandTimeoutMs":65000');
    expect(html).toContain("Capture JSON");
    expect(html).toContain("Waiting for the local companion");
    expect(html).toContain("/plugin/sessions");
    expect(html).toContain("runtime:execute");
  });

  test("routes runtime commands through the plugin worker without closing the session", async () => {
    const pluginApi = createPluginApiMock();

    initializePluginRuntimeWithApi(pluginApi, {
      companionBaseUrl: "http://localhost:4010/"
    });

    expect(pluginApi.showUI).toHaveBeenCalledWith(
      expect.stringContaining('"companionBaseUrl":"http://localhost:4010"'),
      expect.objectContaining({
        height: PLUGIN_UI_SIZE.height,
        visible: true,
        width: PLUGIN_UI_SIZE.width
      })
    );
    expect(typeof pluginApi.ui.onmessage).toBe("function");

    pluginApi.ui.onmessage?.({
      payload: {
        id: "cmd-123",
        method: "status"
      },
      type: "runtime:execute"
    });

    await vi.waitFor(() => {
      expect(pluginApi.ui.postMessage).toHaveBeenCalledTimes(1);
    });

    const statusMessage = vi.mocked(pluginApi.ui.postMessage).mock.calls[0]?.[0] as
      | PluginMainToUiMessage
      | undefined;

    expect(statusMessage?.type).toBe("runtime:command-result");
    expect(statusMessage?.payload).toMatchObject({
      commandId: "cmd-123",
      method: "status",
      status: {
        page: {
          name: "Checkout"
        },
        pluginVersion: PLUGIN_VERSION,
        selectionCount: 1
      }
    });

    pluginApi.ui.onmessage?.({
      payload: {
        id: "cmd-456",
        method: "capture"
      },
      type: "runtime:execute"
    });

    await vi.waitFor(() => {
      expect(pluginApi.ui.postMessage).toHaveBeenCalledTimes(2);
    });

    const captureMessage = vi.mocked(pluginApi.ui.postMessage).mock.calls[1]?.[0] as
      | PluginMainToUiMessage
      | undefined;

    expect(captureMessage?.type).toBe("runtime:command-result");
    expect(captureMessage?.payload).toMatchObject({
      commandId: "cmd-456",
      method: "capture",
      document: {
        capture: {
          page: "Checkout"
        }
      }
    });
    expect(pluginApi.closePlugin).not.toHaveBeenCalled();
  });

  test("returns the debug document shape when the companion requests capture with debug profile", async () => {
    const pluginApi = createPluginApiMock();

    initializePluginRuntimeWithApi(pluginApi, {
      companionBaseUrl: "http://localhost:4010/"
    });

    pluginApi.ui.onmessage?.({
      payload: {
        id: "cmd-debug",
        method: "capture",
        profile: "debug"
      },
      type: "runtime:execute"
    });

    await vi.waitFor(() => {
      expect(pluginApi.ui.postMessage).toHaveBeenCalledTimes(1);
    });

    const captureMessage = vi.mocked(pluginApi.ui.postMessage).mock.calls[0]?.[0] as
      | PluginMainToUiMessage
      | undefined;

    expect(captureMessage?.type).toBe("runtime:command-result");
    expect(captureMessage?.payload).toMatchObject({
      commandId: "cmd-debug",
      method: "capture",
      document: {
        schemaVersion: "0.1"
      }
    });
  });

  test("applies the default component policy rules during live capture", async () => {
    const pluginApi = createPluginApiMock();
    pluginApi.currentPage.selection = [
      {
        height: 20,
        id: "2:9",
        mainComponent: {
          id: "20:1",
          key: "icon-search",
          name: "Icon/Search",
          parent: {
            key: "icons",
            name: "Icons",
            remote: true,
            type: "COMPONENT_SET"
          },
          remote: true
        },
        name: "Icon/Search",
        type: "INSTANCE",
        width: 20
      }
    ];

    initializePluginRuntimeWithApi(pluginApi, {
      companionBaseUrl: "http://localhost:4010/"
    });

    pluginApi.ui.onmessage?.({
      payload: {
        id: "cmd-policy",
        method: "capture",
        profile: "debug"
      },
      type: "runtime:execute"
    });

    await vi.waitFor(() => {
      expect(pluginApi.ui.postMessage).toHaveBeenCalledTimes(1);
    });

    const captureMessage = vi.mocked(pluginApi.ui.postMessage).mock.calls[0]?.[0] as
      | PluginMainToUiMessage
      | undefined;

    expect(captureMessage?.type).toBe("runtime:command-result");
    expect(captureMessage?.payload).toMatchObject({
      commandId: "cmd-policy",
      document: {
        roots: [
          {
            designSystem: {
              componentRef: "component:icon-search",
              policy: "icon"
            },
            kind: "icon",
            origin: {
              sourceComponentRef: "component:icon-search",
              transform: "normalized-icon"
            }
          }
        ],
        schemaVersion: "0.1"
      },
      method: "capture"
    });
  });

  test("returns a structured diagnostic error when capture is requested with an empty selection", async () => {
    const pluginApi = createPluginApiMock();
    pluginApi.currentPage.selection = [];

    initializePluginRuntimeWithApi(pluginApi, {
      companionBaseUrl: "http://localhost:4010/"
    });

    pluginApi.ui.onmessage?.({
      payload: {
        id: "cmd-empty",
        method: "capture"
      },
      type: "runtime:execute"
    });

    await vi.waitFor(() => {
      expect(pluginApi.ui.postMessage).toHaveBeenCalledTimes(1);
    });

    const captureMessage = vi.mocked(pluginApi.ui.postMessage).mock.calls[0]?.[0] as
      | PluginMainToUiMessage
      | undefined;

    expect(captureMessage?.type).toBe("runtime:command-result");
    expect(captureMessage?.payload).toMatchObject({
      commandId: "cmd-empty",
      details: {
        page: {
          name: "Checkout"
        },
        recoverable: true,
        scope: "plugin-worker",
        selectionCount: 0,
        suggestion:
          "Select at least one frame, group, or component in Figma and retry."
      },
      error: "Capture requires a non-empty Figma selection.",
      method: "capture"
    });
  });

  test("closes the plugin with a companion error message when the UI fails to connect", () => {
    const pluginApi = createPluginApiMock();

    initializePluginRuntimeWithApi(pluginApi);

    pluginApi.ui.onmessage?.({
      message: "Connection refused.",
      type: "runtime:error"
    });

    expect(pluginApi.closePlugin).toHaveBeenCalledWith(
      "Companion connection failed: Connection refused."
    );
  });
});
