# Done

## 2026-03-10

- Implemented the first V2 CLI-first runtime pass from `docs/rfcs/v2-runtime-architecture.md` and `docs/rfcs/cli-first.md`.
- Added `packages/cli` with a thin local companion server, session routing, status/capture commands, logs, doctor output, and the `vibe-figma` bin wrapper.
- Refactored the plugin runtime so the plugin UI maintains a live companion session and forwards live commands to the worker instead of auto-uploading to a bridge.
- Made the plugin a visible Figma-side smoke panel that keeps retrying the companion connection, surfaces live page and selection state, and shows the latest capture summary instead of failing closed on first connect.
- Reworked the live smoke script so it waits for a live plugin session and requests capture through the new companion command path.
- Updated packaging to emit the plugin bundle plus CLI tarball as the active V2 artifact set.
- Rewrote README and progress docs around the CLI-first architecture and explicitly deferred MCP from the active V2 implementation.

## 2026-03-09

- Created the initial `pnpm` monorepo workspace.
- Added shared TypeScript, Vitest, and ESLint configuration.
- Implemented `packages/schema` with RFC-aligned `zod` schemas and registry ref validation.
- Implemented `packages/capture-core` with component policy evaluation and document building.
- Implemented `packages/plugin` with a minimal capture adapter and runtime bootstrap skeleton.
- Implemented `packages/ui-bridge` with local HTTP transport and in-memory capture storage.
- Implemented `packages/mcp-server` with basic validation, fixture, policy, and bridge tools.
- Added deterministic fixtures under `packages/fixtures`.
- Added tests covering schema validation, policy resolution, plugin adaptation, bridge transport, and MCP tools.
- Updated the root README with workspace usage and current capabilities.
- Added a `progress/` folder for current status, plan, in-progress work, backlog, done items, and issues.
- Updated `AGENTS.md` so future runs read `progress/` before starting work.
- Verified `lint`, `typecheck`, `test`, and `build`.
- Committed, pushed branch `codex/implements`, and published release `v0.1.0`.
- Verified the progress-tracking change with `corepack pnpm lint` and `corepack pnpm test`.
- Published release `v0.1.1` for the progress-tracking workflow update.
- Implemented plugin runtime extraction modules for real Figma nodes, text content, paints, effects, style registries, variable registries, and component metadata.
- Wired the plugin runtime entrypoint to capture the current real selection through the shared adapter and document builder.
- Added runtime-backed tests covering styles, variable modes, layout extraction, component refs, component property references, and preserved-instance metadata.
- Re-verified `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test`, and `corepack pnpm build`.
- Wired the plugin UI message flow to request a capture, upload it to the local bridge, and close after a successful bridge write.
- Added shared default bridge constants, CORS handling, and a `vibe-figma-bridge` CLI for running the bridge locally.
- Added plugin runtime bridge tests and bridge preflight tests for browser-based uploads.
- Expanded the MCP server with bridge-backed latest-document, registry-slice, and diagnostics tools.
- Captured repeated implementation pitfalls in `AGENTS.md` as repository best practices to avoid future regressions in transport, typing, packaging, and release workflow.
- Expanded `packages/fixtures` into a named regression fixture set covering remote-library preservation, icon normalization, helper inlining, ignored helpers, and variable modes.
- Updated the MCP fixture tool so downstream clients can load any checked-in fixture by name.
- Added `progress/06-manual-verification.md` with live Figma plugin, bridge, and MCP verification steps plus the current policy-injection boundary.
- Added persistent local storage for bridge captures with retained history across restarts.
- Added bridge history endpoints plus by-id capture retrieval and wired matching fetch-client helpers.
- Expanded the MCP server with capture-history and capture-by-id tools on top of the persisted bridge contract.
- Re-verified `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test`, and `corepack pnpm build` after the persisted history change.
- Added a repeatable `corepack pnpm package:artifacts` workflow that emits a Figma plugin bundle plus packed bridge and MCP tarballs under `artifacts/`.
- Added root convenience scripts for starting the bridge and MCP server during local development.
- Documented the local development and artifact packaging flow in `README.md`.
- Added new `AGENTS.md` lessons covering persisted-write safety, `pnpm` script argument parsing, strict Node-script linting, and build-before-package verification order.
- Reworked `README.md` into an open-source user guide covering plugin installation and MCP configuration for Codex CLI, Claude Code, and VS Code MCP clients.
- Updated the plugin manifest to declare both `figma` and `dev` editor types and the `inspect` capability so installation works from Design Mode and the Dev Mode handoff panel.
- Switched the plugin manifest and build output over to a bundled Figma runtime entry so opening the plugin does not execute raw ESM in Figma.
- Added a live `test:e2e:figma` smoke-verification script plus documentation for pairing it with `figma-console-mcp` Local Mode during plugin debugging.
