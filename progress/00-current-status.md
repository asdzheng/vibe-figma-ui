# Current Status

Last updated: 2026-03-09

## Snapshot

- Repository scaffold is complete.
- Monorepo packages are in place for `schema`, `capture-core`, `plugin`, `ui-bridge`, `mcp-server`, and `fixtures`.
- Progress tracking docs and startup workflow are now in place.
- The plugin now captures the current selection from real Figma runtime nodes and merges style, variable, and component registries into the canonical document flow.
- The local bridge and MCP server remain foundational, but the end-to-end plugin-to-bridge capture flow is not wired yet.
- The current working branch is `codex/implements`.

## Latest Completed Milestone

- Implemented the RFC-aligned monorepo foundation.
- Added strict schema validation, component policy evaluation, plugin adapter skeleton, local bridge skeleton, MCP tool skeleton, fixtures, tests, and build tooling.
- Added a `progress/` execution-memory folder and linked startup/update rules in `AGENTS.md`.
- Implemented real plugin runtime extraction modules for nodes, text, paints, effects, styles, variables, and component registries.
- Wired the plugin runtime entrypoint to the real selection capture path and added runtime-backed tests for layout, variable modes, and design-system metadata.

## Recommended Next Focus

Connect the plugin UI capture flow to the local bridge transport and then expose
that bridge-backed capture cleanly through the MCP server.

## Immediate Next Steps

1. Wire the plugin UI message flow to the local bridge request and storage contract.
2. Expand fixtures and manual verification notes for preserved instances, remote libraries, icons, and variable-heavy selections.
3. Add richer MCP tools for latest-document retrieval, registry inspection, and diagnostics on top of the bridge.

## Latest Verification

- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`

All passed on 2026-03-09.
