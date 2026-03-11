import {
  COMPANION_PLUGIN_SESSIONS_PATH,
  DEFAULT_COMPANION_BASE_URL,
  DEFAULT_LONG_POLL_MS,
  type RuntimeCommand,
  type RuntimeCommandResult
} from "@vibe-figma/cli/transport";

export type PluginMainToUiMessage = {
  payload: RuntimeCommandResult;
  type: "runtime:command-result";
};

export type PluginUiToMainMessage =
  | {
      type: "runtime:error";
      message: string;
    }
  | {
      payload: RuntimeCommand;
      type: "runtime:execute";
    };

export function normalizeCompanionBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

export function renderPluginUiHtml(options: {
  companionBaseUrl?: string | undefined;
  pluginVersion?: string | undefined;
} = {}): string {
  const config = JSON.stringify({
    companionBaseUrl: normalizeCompanionBaseUrl(
      options.companionBaseUrl ?? DEFAULT_COMPANION_BASE_URL
    ),
    longPollMs: DEFAULT_LONG_POLL_MS,
    pluginSessionsPath: COMPANION_PLUGIN_SESSIONS_PATH,
    pluginVersion: options.pluginVersion ?? "0.8.0"
  });

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Vibe Figma UI</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background:
          radial-gradient(circle at top right, rgba(255, 214, 153, 0.35), transparent 36%),
          linear-gradient(180deg, #f8f5ef 0%, #f1eee7 100%);
        color: #1f2722;
      }

      .shell {
        min-height: 100vh;
        padding: 18px;
      }

      .stack {
        display: grid;
        gap: 12px;
      }

      .card {
        border: 1px solid rgba(31, 39, 34, 0.08);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.88);
        box-shadow: 0 10px 30px rgba(77, 61, 36, 0.08);
        padding: 14px;
      }

      .eyebrow {
        margin: 0 0 6px;
        color: #6b746c;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h1,
      h2,
      p {
        margin: 0;
      }

      h1 {
        font-size: 22px;
        line-height: 1.1;
      }

      h2 {
        font-size: 13px;
      }

      .lede {
        margin-top: 8px;
        color: #4c5750;
        font-size: 13px;
        line-height: 1.45;
      }

      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        justify-content: space-between;
      }

      .badge {
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 104px;
        padding: 6px 10px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      .badge[data-state="waiting"] {
        background: #f3eee3;
        color: #6b5a34;
      }

      .badge[data-state="connecting"],
      .badge[data-state="reconnecting"] {
        background: #e9f0ff;
        color: #2550a6;
      }

      .badge[data-state="connected"] {
        background: #e7f4e8;
        color: #1d6b32;
      }

      .facts {
        display: grid;
        gap: 10px;
        margin-top: 12px;
      }

      .facts-row {
        display: grid;
        gap: 3px;
      }

      dt {
        color: #6b746c;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      dd {
        margin: 0;
        font-size: 13px;
        line-height: 1.4;
        overflow-wrap: anywhere;
      }

      .message {
        margin-top: 12px;
        color: #364039;
        font-size: 13px;
        line-height: 1.45;
      }

      .error {
        margin-top: 10px;
        border-radius: 10px;
        background: #fff1ef;
        color: #8a2d24;
        font-size: 12px;
        line-height: 1.45;
        padding: 10px 12px;
      }

      .error:empty {
        display: none;
      }

      .steps {
        margin: 10px 0 0;
        padding-left: 18px;
        color: #364039;
        font-size: 13px;
        line-height: 1.5;
      }

      .steps li + li {
        margin-top: 6px;
      }

      code {
        background: #f3f0e7;
        border-radius: 6px;
        font-family: "IBM Plex Mono", "SFMono-Regular", monospace;
        font-size: 12px;
        padding: 2px 5px;
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <div class="stack">
        <section class="card">
          <p class="eyebrow">V2 Smoke Loop</p>
          <h1>vibe-figma-ui</h1>
          <p class="lede">
            Keep this plugin window open while the local companion and CLI
            commands run. The plugin will keep retrying until the companion is
            reachable.
          </p>
        </section>

        <section class="card">
          <div class="row">
            <div>
              <p class="eyebrow">Connection</p>
              <h2>Local Companion Session</h2>
            </div>
            <span class="badge" data-state="waiting" id="connection-badge">Waiting</span>
          </div>

          <dl class="facts">
            <div class="facts-row">
              <dt>Companion URL</dt>
              <dd id="fact-companion">-</dd>
            </div>
            <div class="facts-row">
              <dt>Session</dt>
              <dd id="fact-session">Not connected</dd>
            </div>
            <div class="facts-row">
              <dt>Page</dt>
              <dd id="fact-page">Waiting for runtime status.</dd>
            </div>
            <div class="facts-row">
              <dt>Selection</dt>
              <dd id="fact-selection">Unknown</dd>
            </div>
            <div class="facts-row">
              <dt>Latest Capture</dt>
              <dd id="fact-capture">No capture yet.</dd>
            </div>
          </dl>

          <p class="message" id="connection-message">
            Waiting for the local companion to accept connections.
          </p>
          <p class="error" id="connection-error"></p>
        </section>

        <section class="card">
          <p class="eyebrow">What To Do</p>
          <h2>Manual Figma Steps</h2>
          <ol class="steps">
            <li>Run <code>corepack pnpm dev:cli</code> in a terminal.</li>
            <li>Leave this plugin window open in Figma desktop.</li>
            <li>Use <code>corepack pnpm cli -- status</code> and <code>corepack pnpm cli -- capture</code>.</li>
            <li>Use <code>corepack pnpm cli -- export-json --output artifacts/manual/capture.json</code> for the canonical export.</li>
            <li>Run <code>corepack pnpm test:e2e:figma</code> for the assisted smoke loop.</li>
          </ol>
        </section>
      </div>
    </main>
    <script>
      const config = ${config};
      const commandResolvers = new Map();
      const state = {
        connectionMessage: "Waiting for the local companion to accept connections.",
        connectionState: "waiting",
        lastCapture: "No capture yet.",
        lastError: "",
        pageName: "Waiting for runtime status.",
        selectionCount: null,
        sessionId: null
      };
      const elements = {
        badge: document.getElementById("connection-badge"),
        capture: document.getElementById("fact-capture"),
        companion: document.getElementById("fact-companion"),
        error: document.getElementById("connection-error"),
        message: document.getElementById("connection-message"),
        page: document.getElementById("fact-page"),
        selection: document.getElementById("fact-selection"),
        session: document.getElementById("fact-session")
      };
      const badgeLabels = {
        connected: "Connected",
        connecting: "Connecting",
        reconnecting: "Reconnecting",
        waiting: "Waiting"
      };
      const postPluginMessage = (message) => {
        parent.postMessage({ pluginMessage: message }, "*");
      };
      const sleep = (delayMs) =>
        new Promise((resolve) => {
          setTimeout(resolve, delayMs);
        });
      const renderState = () => {
        if (elements.badge) {
          elements.badge.dataset.state = state.connectionState;
          elements.badge.textContent = badgeLabels[state.connectionState] || "Waiting";
        }

        if (elements.capture) {
          elements.capture.textContent = state.lastCapture;
        }

        if (elements.companion) {
          elements.companion.textContent = config.companionBaseUrl;
        }

        if (elements.error) {
          elements.error.textContent = state.lastError;
        }

        if (elements.message) {
          elements.message.textContent = state.connectionMessage;
        }

        if (elements.page) {
          elements.page.textContent = state.pageName;
        }

        if (elements.selection) {
          elements.selection.textContent =
            state.selectionCount === null ? "Unknown" : String(state.selectionCount);
        }

        if (elements.session) {
          elements.session.textContent = state.sessionId || "Not connected";
        }
      };
      const createCommandId = () => {
        if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
          return globalThis.crypto.randomUUID();
        }

        return \`cmd-\${Date.now()}-\${Math.random().toString(16).slice(2)}\`;
      };
      const toErrorMessage = (error, fallback = "Unexpected companion runtime error.") => {
        if (error instanceof Error) {
          return error.message;
        }

        return fallback;
      };
      const fetchJson = async (url, options = {}) => {
        const response = await fetch(url, options);
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          const message =
            payload &&
            typeof payload === "object" &&
            "error" in payload &&
            typeof payload.error === "string"
              ? payload.error
              : \`Companion request failed with \${response.status}.\`;
          throw new Error(message);
        }

        return payload;
      };
      const setConnectionState = (connectionState, message, errorMessage = "") => {
        state.connectionState = connectionState;
        state.connectionMessage = message;
        state.lastError = errorMessage;
        renderState();
      };
      const summarizeCapture = (document) => {
        const capture = document && typeof document === "object" ? document.capture : null;
        const diagnostics =
          document && typeof document === "object" ? document.diagnostics : null;
        const roots =
          document && typeof document === "object" && Array.isArray(document.roots)
            ? document.roots
            : [];
        const warnings =
          diagnostics && typeof diagnostics === "object" && Array.isArray(diagnostics.warnings)
            ? diagnostics.warnings
            : [];
        const selection =
          capture && typeof capture === "object" && Array.isArray(capture.selection)
            ? capture.selection
            : [];
        const page =
          capture && typeof capture === "object" && capture.page && typeof capture.page === "object"
            ? capture.page
            : null;

        if (page && typeof page.name === "string" && page.name.length > 0) {
          state.pageName = page.name;
        }

        state.selectionCount = selection.length;

        return (
          String(roots.length) +
          " root(s), " +
          String(warnings.length) +
          " warning(s) at " +
          new Date().toLocaleTimeString()
        );
      };
      const updateRuntimeStatus = (status) => {
        state.pageName = status.page.name;
        state.selectionCount = status.selectionCount;
        renderState();
      };
      const getSessionCommandsUrl = (sessionId) =>
        \`\${config.companionBaseUrl}\${config.pluginSessionsPath}/\${encodeURIComponent(sessionId)}/commands\`;
      const getSessionEventsUrl = (sessionId) =>
        \`\${config.companionBaseUrl}\${config.pluginSessionsPath}/\${encodeURIComponent(sessionId)}/events\`;
      let sessionId = null;
      let hasConnected = false;
      let bootstrapCommandId = null;
      renderState();
      const postEvent = async (event) => {
        if (!sessionId) {
          throw new Error("No companion session is available.");
        }

        await fetchJson(getSessionEventsUrl(sessionId), {
          body: JSON.stringify(event),
          headers: {
            "content-type": "application/json"
          },
          method: "POST"
        });
      };
      const runPluginCommand = async (command) => {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            commandResolvers.delete(command.id);
            reject(
              new Error(\`Timed out waiting for plugin worker result for \${command.method}.\`)
            );
          }, 30000);

          commandResolvers.set(command.id, {
            reject: (error) => {
              clearTimeout(timer);
              reject(error);
            },
            resolve: () => {
              clearTimeout(timer);
              resolve();
            }
          });
          postPluginMessage({
            payload: command,
            type: "runtime:execute"
          });
        });
      };
      const handlePluginResult = async (payload) => {
        if (bootstrapCommandId && payload.commandId === bootstrapCommandId) {
          if ("status" in payload) {
            await postEvent({
              payload: payload.status,
              type: "session:ready"
            });
            updateRuntimeStatus(payload.status);
            hasConnected = true;
            setConnectionState(
              "connected",
              "Connected. Leave this window open and drive status, capture, or export-json from the CLI."
            );
          } else if ("error" in payload) {
            hasConnected = true;
            setConnectionState(
              "connected",
              "Connected, but the initial runtime status failed. You can still retry from the CLI.",
              payload.error
            );
          } else {
            throw new Error(
              "Failed to collect the initial plugin runtime status."
            );
          }
        } else {
          await postEvent({
            payload,
            type: "command:result"
          });

          if ("status" in payload) {
            updateRuntimeStatus(payload.status);
            setConnectionState(
              "connected",
              "Connected. Leave this window open and drive status, capture, or export-json from the CLI."
            );
          } else if ("document" in payload) {
            state.lastCapture = summarizeCapture(payload.document);
            setConnectionState(
              "connected",
              "Latest capture completed successfully. You can now run export-json or the smoke script."
            );
          } else if ("error" in payload) {
            setConnectionState(
              "connected",
              "The plugin session is still connected, but the last command failed.",
              payload.error
            );
          }
        }

        const pending = commandResolvers.get(payload.commandId);

        if (!pending) {
          return;
        }

        commandResolvers.delete(payload.commandId);
        pending.resolve();
      };
      window.addEventListener("message", async (event) => {
        const message = event.data?.pluginMessage;

        if (!message || typeof message !== "object") {
          return;
        }

        if (message.type === "runtime:command-result") {
          try {
            await handlePluginResult(message.payload);
          } catch (error) {
            const pending = commandResolvers.get(message.payload.commandId);

            if (pending) {
              commandResolvers.delete(message.payload.commandId);
              pending.reject(error);
            }

            if (!hasConnected) {
              postPluginMessage({
                message: toErrorMessage(error),
                type: "runtime:error"
              });
            } else {
              sessionId = null;
              state.sessionId = null;
              setConnectionState(
                "reconnecting",
                "The local companion dropped. Retrying automatically.",
                toErrorMessage(error, "Lost the local companion connection.")
              );
            }
          }
        }
      });
      const connectSession = async () => {
        setConnectionState(
          hasConnected ? "reconnecting" : "connecting",
          hasConnected
            ? "Reconnecting to the local companion."
            : "Connecting to the local companion."
        );
        const session = await fetchJson(
          \`\${config.companionBaseUrl}\${config.pluginSessionsPath}\`,
          {
            body: JSON.stringify({
              pluginVersion: config.pluginVersion
            }),
            headers: {
              "content-type": "application/json"
            },
            method: "POST"
          }
        );
        sessionId = session.sessionId;
        state.sessionId = sessionId;
        renderState();
        bootstrapCommandId = createCommandId();
        await postEvent({
          payload: {
            at: new Date().toISOString(),
            level: "info",
            message: hasConnected
              ? "Plugin UI reconnected to the local companion."
              : "Plugin UI connected to the local companion.",
            scope: "plugin-ui"
          },
          type: "session:log"
        });
        await runPluginCommand({
          id: bootstrapCommandId,
          method: "status"
        });
        bootstrapCommandId = null;
      };
      const pollCommands = async () => {
        while (sessionId) {
          const payload = await fetchJson(
            \`\${getSessionCommandsUrl(sessionId)}?waitMs=\${config.longPollMs}\`
          );

          if (!payload.command) {
            continue;
          }

          await runPluginCommand(payload.command);
        }
      };
      const start = async () => {
        while (true) {
          try {
            if (!sessionId) {
              await connectSession();
            }

            await pollCommands();
          } catch (error) {
            sessionId = null;
            state.sessionId = null;
            setConnectionState(
              hasConnected ? "reconnecting" : "waiting",
              hasConnected
                ? "The local companion is unavailable. Retrying automatically."
                : "Waiting for the local companion to accept connections. Start corepack pnpm dev:cli if it is not running.",
              toErrorMessage(
                error,
                "Unable to connect to the vibe-figma local companion."
              )
            );
            await sleep(1500);
          }
        }
      };

      void start();
    </script>
  </body>
</html>`;
}
