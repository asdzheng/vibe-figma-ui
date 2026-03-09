# vibe-figma-ui

Open-source Figma plugin, local bridge, and MCP server for capturing the current
design context as a canonical JSON document for downstream AI code generation.

The canonical payload shape and component-preservation behavior are defined in:

- [docs/rfcs/design-json-schema-v0.1.md](docs/rfcs/design-json-schema-v0.1.md)
- [docs/rfcs/component-preservation-policy.md](docs/rfcs/component-preservation-policy.md)

## Workspace

This repository is a `pnpm` monorepo with six packages:

- `packages/schema`: strict `zod` schemas and shared types for the canonical JSON
- `packages/capture-core`: pure normalization and component-policy evaluation
- `packages/plugin`: Figma runtime adapter and capture entrypoints
- `packages/ui-bridge`: local HTTP bridge and in-memory capture store
- `packages/mcp-server`: MCP server exposing validation, fixture, policy, and bridge-backed retrieval tools
- `packages/fixtures`: checked-in golden JSON fixtures for deterministic tests

## Requirements

- Node.js 22+
- `corepack` enabled

## Getting Started

```bash
corepack pnpm install
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

## Current Capabilities

- Canonical design JSON schema v0.1 with registry ref validation
- Ordered component preservation policy engine with conservative defaults
- Real plugin runtime capture path that extracts selection nodes, text, paints, effects, component metadata, styles, and variables from Figma-like runtime objects into the canonical document flow
- Shared adapter that builds capture documents from normalized selection input
- Plugin UI bridge flow that uploads canonical captures to the local HTTP bridge and closes cleanly after upload
- Local bridge with default address `http://127.0.0.1:3845`, browser-safe CORS headers, `POST /captures`, and `GET /captures/latest`
- MCP tools for:
  - validating a design document
  - loading the sample fixture capture
  - evaluating component policy rules
  - fetching latest bridge-backed capture metadata, the full document, registry slices, and diagnostics from the default local bridge URL

## Notes

- Fixtures live under `packages/fixtures/data` and are validated in tests.
- Build output is emitted to each package's `dist/` directory.
- The plugin package now includes runtime extraction modules plus a bootstrap path for capturing the active Figma selection.
- Start the local bridge with `corepack pnpm --filter @vibe-figma/ui-bridge exec vibe-figma-bridge`.
- Start the MCP server with `corepack pnpm --filter @vibe-figma/mcp-server exec vibe-figma-mcp`.
- The next integration steps are broader fixtures and manual Figma verification notes, followed by persistent bridge history beyond the in-memory latest capture.
