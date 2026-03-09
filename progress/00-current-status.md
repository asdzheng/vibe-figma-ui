# Current Status

Last updated: 2026-03-09

## Snapshot

- Repository scaffold is complete.
- Monorepo packages are in place for `schema`, `capture-core`, `plugin`, `ui-bridge`, `mcp-server`, and `fixtures`.
- Progress tracking docs and startup workflow are now in place.
- The plugin now captures the current selection from real Figma runtime nodes and merges style, variable, and component registries into the canonical document flow.
- The plugin UI now uploads the captured canonical document to the local bridge over the shared default transport contract.
- The bridge now persists recent captures to local disk, exposes capture history and by-id retrieval, and the MCP server can read both the latest and historical bridge-backed documents.
- The repository now has a repeatable artifact-packaging script that emits a Figma-importable plugin bundle plus packed bridge and MCP tarballs under `artifacts/`.
- The fixtures package now exposes named regression fixtures for preserved remote-library instances, icon normalization, helper inlining, ignored helpers, and variable-mode-heavy captures.
- The MCP fixture tool can now load any checked-in fixture by name, and live Figma verification steps are documented under `progress/06-manual-verification.md`.
- The current working branch is `codex/implements`.

## Latest Completed Milestone

- Implemented the RFC-aligned monorepo foundation.
- Added strict schema validation, component policy evaluation, plugin adapter skeleton, local bridge skeleton, MCP tool skeleton, fixtures, tests, and build tooling.
- Added a `progress/` execution-memory folder and linked startup/update rules in `AGENTS.md`.
- Implemented real plugin runtime extraction modules for nodes, text, paints, effects, styles, variables, and component registries.
- Wired the plugin runtime entrypoint to the real selection capture path and added runtime-backed tests for layout, variable modes, and design-system metadata.
- Wired the plugin UI message flow to upload canonical captures to the local bridge.
- Added default bridge constants, CORS support, and a `vibe-figma-bridge` CLI for running the bridge locally.
- Added richer bridge-backed MCP tools for latest-document retrieval, registry inspection, and diagnostics on top of the local bridge.
- Added persistent bridge storage, capture history endpoints, and history-aware MCP retrieval by capture ID.
- Added a repeatable `corepack pnpm package:artifacts` workflow and documented the local development flow for plugin, bridge, and MCP usage.
- Added repository-specific best practices to `AGENTS.md` for TypeScript optional fields, plugin UI transport boundaries, shared bridge constants, CORS, workspace bins, and release publishing.
- Expanded checked-in regression fixtures to cover remote libraries, icon normalization, helper inlining, ignored helpers, and variable modes.
- Added named fixture loading through `packages/fixtures` and `packages/mcp-server`.
- Wrote live plugin-to-bridge-to-MCP manual verification notes and documented the current policy-injection boundary.

## Recommended Next Focus

Expand live plugin runtime extraction coverage for additional Figma node families and mixed text edge cases.

## Immediate Next Steps

1. Expand runtime extraction coverage for vectors, boolean operations, layout grids, and mixed text cases.
2. Wire policy rule injection into the live plugin runtime so instance handling is not always default-preserve.
3. Add more large-selection and page-level fixtures once the runtime shape expands.

## Latest Verification

- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`
- `corepack pnpm package:artifacts -- --skip-build`

All passed on 2026-03-09.
