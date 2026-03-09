import {
  BRIDGE_CAPTURES_PATH,
  DEFAULT_BRIDGE_BASE_URL
} from "@vibe-figma/ui-bridge";

import type { DesignDocument } from "@vibe-figma/schema";

export type PluginMainToUiMessage = {
  payload: DesignDocument;
  type: "capture:result";
};

export type PluginUiToMainMessage =
  | {
      type: "capture:close";
    }
  | {
      type: "capture:error";
      message: string;
    }
  | {
      type: "capture:selection";
    }
  | {
      payload: {
        captureId: string;
        receivedAt: string;
      };
      type: "capture:uploaded";
    };

export function normalizeBridgeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

export function renderPluginUiHtml(options: {
  bridgeBaseUrl?: string | undefined;
} = {}): string {
  const config = JSON.stringify({
    bridgeBaseUrl: normalizeBridgeBaseUrl(
      options.bridgeBaseUrl ?? DEFAULT_BRIDGE_BASE_URL
    ),
    capturesPath: BRIDGE_CAPTURES_PATH
  });

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Vibe Figma UI</title>
  </head>
  <body>
    <script>
      const config = ${config};
      const postPluginMessage = (message) => {
        parent.postMessage({ pluginMessage: message }, "*");
      };
      const toErrorMessage = (error) => {
        if (error instanceof Error) {
          return error.message;
        }

        return "Unexpected bridge upload error.";
      };
      const uploadCapture = async (document) => {
        const response = await fetch(\`\${config.bridgeBaseUrl}\${config.capturesPath}\`, {
          body: JSON.stringify(document),
          headers: {
            "content-type": "application/json"
          },
          method: "POST"
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          const message =
            payload &&
            typeof payload === "object" &&
            "error" in payload &&
            typeof payload.error === "string"
              ? payload.error
              : \`Bridge request failed with \${response.status}.\`;
          throw new Error(message);
        }

        return payload;
      };

      window.addEventListener("message", async (event) => {
        const message = event.data?.pluginMessage;

        if (!message || typeof message !== "object") {
          return;
        }

        if (message.type === "capture:result") {
          try {
            const storedCapture = await uploadCapture(message.payload);

            postPluginMessage({
              payload: {
                captureId: storedCapture.id,
                receivedAt: storedCapture.receivedAt
              },
              type: "capture:uploaded"
            });
          } catch (error) {
            postPluginMessage({
              message: toErrorMessage(error),
              type: "capture:error"
            });
          }
        }
      });

      postPluginMessage({ type: "capture:selection" });
    </script>
  </body>
</html>`;
}
