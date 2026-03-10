# Current Status

Last updated: 2026-03-10

## Snapshot

- The active V2 workspace now centers on `schema`, `capture-core`, `plugin`, `cli`, and `fixtures`.
- `packages/cli` now provides the new `vibe-figma` CLI plus a thin local companion server for agent workflows.
- The plugin no longer auto-uploads a capture to a heavy bridge. It now keeps a live session open and answers `status` and `capture` commands from the companion.
- The plugin window is now a visible Figma-side smoke panel that shows connection state, current page/selection status, and the latest capture summary while it retries the companion connection automatically.
- Root scripts, packaging, and the live smoke script now point at the CLI-first runtime path.
- `README.md` now documents the CLI-first workflow and explicitly defers MCP in V2.
- `packages/ui-bridge` and `packages/mcp-server` are no longer part of the active workspace or test targets.
- The current working branch is `codex/implements`.

## Latest Completed Milestone

- Implemented the first V2 CLI-first architecture pass from the new runtime RFCs.
- Added `packages/cli` with a local companion HTTP server, session routing, logs, status, capture commands, and the `vibe-figma` bin wrapper.
- Refactored `packages/plugin` into a command-driven Figma runtime endpoint that keeps a live companion session instead of doing one-shot bridge uploads.
- Added a thin visible Figma plugin panel for the smoke loop so the human can see connection state and keep the plugin alive while the companion comes up or reconnects.
- Reworked the live smoke script to wait for a live plugin session and request capture through the companion command path.
- Updated packaging to ship the plugin bundle plus CLI artifact rather than bridge and MCP tarballs.
- Rewrote repository documentation and progress tracking around the CLI-first V2 model.

## Recommended Next Focus

Execute the refreshed live Figma verification checklist, then use the stabilized smoke loop to harden policy injection and additional runtime node-family coverage.

## Immediate Next Steps

1. Execute the updated manual Figma verification checklist for plugin launch, companion connectivity, live capture, reconnect, and smoke flow behavior.
2. Re-run the full automated suite in an environment that permits localhost listeners so the companion HTTP tests can execute.
3. Wire component policy rule injection into the live plugin runtime so preserved instances are not always the default.

## Latest Verification

- Static code migration completed for the CLI-first runtime path.
- `corepack pnpm typecheck` now passes in the current workspace state.
- Full `corepack pnpm test` is still blocked in this sandbox because localhost `listen()` calls are denied, which prevents the companion HTTP tests from binding a test server.
