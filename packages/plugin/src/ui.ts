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
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

      :root {
        --color-bg-start: #fdfbf7;
        --color-bg-end: #f4f0e6;
        --color-text-main: #1a1d1a;
        --color-text-muted: #647067;
        --color-primary: #3b82f6;
        --color-primary-hover: #2563eb;
        --color-border: rgba(31, 39, 34, 0.08);
        --color-card-bg: rgba(255, 255, 255, 0.75);
        --shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.03);
        --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.06);
        --radius-lg: 16px;
        --radius-md: 12px;
        --radius-sm: 8px;
        --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: 'Inter', sans-serif;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        background: radial-gradient(circle at top right, rgba(255, 214, 153, 0.25), transparent 40%),
                    linear-gradient(180deg, var(--color-bg-start) 0%, var(--color-bg-end) 100%);
        color: var(--color-text-main);
        min-height: 100vh;
        overflow-x: hidden;
        -webkit-font-smoothing: antialiased;
      }

      .app-container {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-width: 100%;
      }

      /* Header & Status */
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }

      h1 {
        font-size: 20px;
        font-weight: 700;
        margin: 0;
        letter-spacing: -0.02em;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.02em;
        transition: var(--transition);
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }

      .status-badge[data-state="waiting"] {
        background: #f3eee3; color: #6b5a34;
      }
      .status-badge[data-state="waiting"] .status-dot { background: #d4b46c; }

      .status-badge[data-state="connecting"], .status-badge[data-state="reconnecting"] {
        background: #e9f0ff; color: #2550a6;
      }
      .status-badge[data-state="connecting"] .status-dot, .status-badge[data-state="reconnecting"] .status-dot { background: #3b82f6; animation: pulse 1.5s infinite; }

      .status-badge[data-state="connected"] {
        background: #e7f4e8; color: #1d6b32;
      }
      .status-badge[data-state="connected"] .status-dot { background: #22c55e; }

      @keyframes pulse {
        0% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(0.8); }
        100% { opacity: 1; transform: scale(1); }
      }

      /* Cards (Glassmorphism) */
      .card {
        background: var(--color-card-bg);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        padding: 16px;
        box-shadow: var(--shadow-sm);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        transition: var(--transition);
      }
      .card:hover { box-shadow: var(--shadow-md); }

      .section-title {
        font-size: 12px;
        font-weight: 700;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0 0 12px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      /* Context Grid */
      .context-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .context-item {
        background: rgba(255,255,255,0.5);
        border: 1px solid rgba(0,0,0,0.04);
        padding: 10px 12px;
        border-radius: var(--radius-sm);
      }
      .context-item-label {
        font-size: 11px;
        color: var(--color-text-muted);
        margin-bottom: 4px;
      }
      .context-item-value {
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text-main);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Design Systems List */
      .ds-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 140px;
        overflow-y: auto;
        padding-right: 4px;
      }
      .ds-list::-webkit-scrollbar { width: 4px; }
      .ds-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }

      .ds-card {
        background: #ffffff;
        border: 1px solid rgba(0,0,0,0.05);
        border-radius: var(--radius-sm);
        padding: 12px;
        transition: var(--transition);
      }
      .ds-card:hover { transform: translateY(-1px); box-shadow: var(--shadow-sm); }
      .ds-card h3 {
        margin: 0 0 4px 0;
        font-size: 13px;
        font-weight: 600;
      }
      .ds-card p {
        margin: 0 0 8px 0;
        font-size: 12px;
        color: var(--color-text-muted);
        line-height: 1.4;
      }
      .ds-card a {
        font-size: 11px;
        font-weight: 600;
        color: var(--color-primary);
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .ds-card a:hover { color: var(--color-primary-hover); text-decoration: underline; }

      /* Buttons & Actions */
      .actions-container {
        display: flex;
        gap: 10px;
        margin-top: 4px;
      }
      .btn {
        flex: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 16px;
        border-radius: var(--radius-md);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: var(--transition);
        font-family: inherit;
      }
      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .btn-primary {
        background: var(--color-primary);
        color: white;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
      }
      .btn-primary:not(:disabled):hover {
        background: var(--color-primary-hover);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
      }
      .btn-secondary {
        background: rgba(0,0,0,0.04);
        color: var(--color-text-main);
        flex: 0 1 auto;
      }
      .btn-secondary:not(:disabled):hover {
        background: rgba(0,0,0,0.08);
      }

      /* Errors & Msgs */
      .message {
        font-size: 12px;
        color: var(--color-text-muted);
        margin: 0;
        line-height: 1.4;
      }
      .error-box {
        margin-top: 8px;
        border-radius: var(--radius-sm);
        background: #fff1ef;
        color: #b91c1c;
        font-size: 12px;
        padding: 8px 12px;
        display: none;
        border: 1px solid #fecaca;
      }
      .error-box.show { display: block; }
      .empty-state {
        font-size: 12px;
        color: var(--color-text-muted);
        text-align: center;
        padding: 12px;
        font-style: italic;
      }
    </style>
  </head>
  <body>
    <div class="app-container">
      
      <header class="header">
        <h1>Vibe UI</h1>
        <div class="status-badge" data-state="waiting" id="connection-badge">
          <div class="status-dot"></div>
          <span id="connection-label">Waiting</span>
        </div>
      </header>

      <div class="card">
        <h2 class="section-title">Current Context</h2>
        <div class="context-grid">
          <div class="context-item">
            <div class="context-item-label">Active Page</div>
            <div class="context-item-value" id="fact-page">Loading...</div>
          </div>
          <div class="context-item">
            <div class="context-item-label">Selection</div>
            <div class="context-item-value" id="fact-selection">0 nodes</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="section-title">Design Systems</h2>
        <div class="ds-list" id="design-systems-list">
          <div class="empty-state">Loading libraries...</div>
        </div>
      </div>

      <div class="card">
        <h2 class="section-title">Capture & Sync</h2>
        <p class="message" id="connection-message">Waiting for the local companion to accept connections.</p>
        <div class="error-box" id="connection-error"></div>
        
        <div class="actions-container">
          <button class="btn btn-primary" id="action-capture">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Capture JSON
          </button>
          <button class="btn btn-secondary" id="action-reconnect" title="Reconnect to CLI">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21L21.5 8"></path></svg>
          </button>
        </div>
      </div>

    </div>

    <script>
      const config = ${config};
      const commandResolvers = new Map();
      const state = {
        connectionMessage: "Waiting for the local companion to accept connections.",
        connectionState: "waiting",
        lastError: "",
        pageName: "Waiting for runtime status.",
        selectionCount: null,
        sessionId: null,
        designSystems: []
      };
      
      const elements = {
        badge: document.getElementById("connection-badge"),
        badgeLabel: document.getElementById("connection-label"),
        error: document.getElementById("connection-error"),
        message: document.getElementById("connection-message"),
        page: document.getElementById("fact-page"),
        selection: document.getElementById("fact-selection"),
        dsList: document.getElementById("design-systems-list")
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

      const sleep = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

      const renderState = () => {
        if (elements.badge) {
          elements.badge.dataset.state = state.connectionState;
          if (elements.badgeLabel) {
            elements.badgeLabel.textContent = badgeLabels[state.connectionState] || "Waiting";
          }
        }

        if (elements.error) {
          elements.error.textContent = state.lastError;
          if (state.lastError) {
            elements.error.classList.add('show');
          } else {
            elements.error.classList.remove('show');
          }
        }

        if (elements.message) {
          elements.message.textContent = state.connectionMessage;
        }

        if (elements.page) {
          elements.page.textContent = state.pageName;
          elements.page.title = state.pageName;
        }

        if (elements.selection) {
          elements.selection.textContent =
            state.selectionCount === null ? "Unknown" : \`\${state.selectionCount} nodes\`;
        }

        if (elements.dsList) {
          if (state.designSystems && state.designSystems.length > 0) {
            elements.dsList.innerHTML = state.designSystems.map(ds => \`
              <div class="ds-card">
                <h3>\${ds.name}</h3>
                <p>\${ds.description}</p>
                \${ds.url ? \`<a href="\${ds.url}" target="_blank">View Library →</a>\` : ''}
              </div>
            \`).join("");
          } else {
            elements.dsList.innerHTML = '<div class="empty-state">No design systems active.</div>';
          }
        }
      };

      const createCommandId = () => {
        if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
          return globalThis.crypto.randomUUID();
        }
        return \`cmd-\${Date.now()}-\${Math.random().toString(16).slice(2)}\`;
      };

      const toErrorMessage = (error, fallback = "Unexpected companion runtime error.") => {
        if (error instanceof Error) return error.message;
        return fallback;
      };

      const fetchJson = async (url, options = {}) => {
        const response = await fetch(url, options);
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          const message =
            payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
              ? payload.error : \`Companion request failed with \${response.status}.\`;
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

      const updateRuntimeStatus = (status) => {
        state.pageName = status.page.name;
        state.selectionCount = status.selectionCount;
        state.designSystems = status.designSystems || [];
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
        if (!sessionId) throw new Error("No companion session is available.");
        await fetchJson(getSessionEventsUrl(sessionId), {
          body: JSON.stringify(event),
          headers: { "content-type": "application/json" },
          method: "POST"
        });
      };

      const runPluginCommand = async (command) => {
        return await new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            commandResolvers.delete(command.id);
            reject(new Error(\`Timed out waiting for plugin worker result for \${command.method}.\`));
          }, 60000);

          commandResolvers.set(command.id, {
            reject: (error) => {
              clearTimeout(timer);
              reject(error);
            },
            resolve: (payload) => {
              clearTimeout(timer);
              resolve(payload);
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
            await postEvent({ payload: payload.status, type: "session:ready" });
            updateRuntimeStatus(payload.status);
            hasConnected = true;
            setConnectionState("connected", "Connected to local companion.");
          } else if ("error" in payload) {
            hasConnected = true;
            setConnectionState("connected", "Connected, but initial status failed.", payload.error);
          }
        } else {
          // Send back to companion if coming from polling commands
          if (!payload.fromManualCapture) {
            await postEvent({ payload, type: "command:result" });
          }

          if ("status" in payload) {
            updateRuntimeStatus(payload.status);
            setConnectionState("connected", "Connected to local companion.");
          } else if ("error" in payload) {
            setConnectionState("connected", "Last command failed.", payload.error);
          }
        }

        const pending = commandResolvers.get(payload.commandId);
        if (!pending) return;

        commandResolvers.delete(payload.commandId);
        pending.resolve(payload);
      };

      window.addEventListener("message", async (event) => {
        const message = event.data?.pluginMessage;
        if (!message || typeof message !== "object") return;

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
              postPluginMessage({ message: toErrorMessage(error), type: "runtime:error" });
            } else {
              sessionId = null;
              state.sessionId = null;
              setConnectionState("reconnecting", "Local companion dropped. Retrying.", toErrorMessage(error, "Lost connection."));
            }
          }
        }
      });

      const connectSession = async () => {
        setConnectionState(hasConnected ? "reconnecting" : "connecting", hasConnected ? "Reconnecting..." : "Connecting...");
        const session = await fetchJson(\`\${config.companionBaseUrl}\${config.pluginSessionsPath}\`, {
          body: JSON.stringify({ pluginVersion: config.pluginVersion }),
          headers: { "content-type": "application/json" },
          method: "POST"
        });
        sessionId = session.sessionId;
        state.sessionId = sessionId;
        renderState();
        bootstrapCommandId = createCommandId();
        await runPluginCommand({ id: bootstrapCommandId, method: "status" });
        bootstrapCommandId = null;
      };

      const pollCommands = async () => {
        while (sessionId) {
          const payload = await fetchJson(\`\${getSessionCommandsUrl(sessionId)}?waitMs=\${config.longPollMs}\`);
          if (!payload.command) continue;
          await runPluginCommand(payload.command);
        }
      };

      const start = async () => {
        while (true) {
          try {
            if (!sessionId) await connectSession();
            await pollCommands();
          } catch (error) {
            sessionId = null;
            state.sessionId = null;
            setConnectionState(hasConnected ? "reconnecting" : "waiting", 
              hasConnected ? "Companion unavailable. Retrying." : "Waiting for companion. Run pnpm dev:cli",
              toErrorMessage(error, "Connection failed.")
            );
            await sleep(1500);
          }
        }
      };

      // Actions
      const captureBtn = document.getElementById("action-capture");
      if (captureBtn) {
        captureBtn.addEventListener("click", async () => {
          if (captureBtn.disabled) return;
          captureBtn.disabled = true;
          const originalHTML = captureBtn.innerHTML;
          captureBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: pulse 1s infinite;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Capturing...';
          
          try {
            const commandId = createCommandId();
            const result = await runPluginCommand({ id: commandId, method: "capture" });
            
            if (result.document) {
              const blob = new Blob([JSON.stringify(result.document, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              const dateTag = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
              a.download = \`vibe-capture-\${dateTag}.json\`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            } else if (result.error) {
              setConnectionState(state.connectionState, "Manual capture failed.", result.error);
            }
          } catch (e) {
            setConnectionState(state.connectionState, "Manual capture failed.", e.message);
          } finally {
            captureBtn.disabled = false;
            captureBtn.innerHTML = originalHTML;
          }
        });
      }

      const reconnectBtn = document.getElementById("action-reconnect");
      if (reconnectBtn) {
        reconnectBtn.addEventListener("click", () => {
          if (state.connectionState === "connecting" || state.connectionState === "reconnecting") return;
          sessionId = null;
          state.sessionId = null;
        });
      }

      void start();
    </script>
  </body>
</html>`;
}
