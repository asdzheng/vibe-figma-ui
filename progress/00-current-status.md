# Current Status

Last updated: 2026-03-09

## Snapshot

- Repository scaffold is complete.
- Monorepo packages are in place for `schema`, `capture-core`, `plugin`, `ui-bridge`, `mcp-server`, and `fixtures`.
- Progress tracking docs and startup workflow are now in place.
- The plugin now captures the current selection from real Figma runtime nodes and merges style, variable, and component registries into the canonical document flow.
- The plugin UI now uploads the captured canonical document to the local bridge over the shared default transport contract.
- The bridge and MCP server now share the same default local bridge URL, while richer bridge-backed MCP tools still remain to be added.
- The current working branch is `codex/implements`.

## Latest Completed Milestone

- Implemented the RFC-aligned monorepo foundation.
- Added strict schema validation, component policy evaluation, plugin adapter skeleton, local bridge skeleton, MCP tool skeleton, fixtures, tests, and build tooling.
- Added a `progress/` execution-memory folder and linked startup/update rules in `AGENTS.md`.
- Implemented real plugin runtime extraction modules for nodes, text, paints, effects, styles, variables, and component registries.
- Wired the plugin runtime entrypoint to the real selection capture path and added runtime-backed tests for layout, variable modes, and design-system metadata.
- Wired the plugin UI message flow to upload canonical captures to the local bridge.
- Added default bridge constants, CORS support, and a `vibe-figma-bridge` CLI for running the bridge locally.
- Added repository-specific best practices to `AGENTS.md` for TypeScript optional fields, plugin UI transport boundaries, shared bridge constants, CORS, workspace bins, and release publishing.

## Recommended Next Focus

Expand the bridge-backed MCP surface and add broader fixtures plus live Figma
manual verification notes.

## Immediate Next Steps

1. Add richer MCP tools for latest-document retrieval, registry inspection, and diagnostics on top of the bridge.
2. Expand fixtures and manual verification notes for preserved instances, remote libraries, icons, and variable-heavy selections.
3. Add persistent storage and history support beyond the latest in-memory capture.

## Latest Verification

- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`

All passed on 2026-03-09.
