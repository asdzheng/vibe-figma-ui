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
- `packages/mcp-server`: MCP server exposing validation, fixture, policy, and bridge tools
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
- Figma-like node adapter that builds capture documents from selection input
- Local bridge that accepts `POST /captures` and serves `GET /captures/latest`
- MCP tools for:
  - validating a design document
  - loading the sample fixture capture
  - evaluating component policy rules
  - fetching the latest bridge capture

## Notes

- Fixtures live under `packages/fixtures/data` and are validated in tests.
- Build output is emitted to each package's `dist/` directory.
- The plugin package currently provides a minimal manifest, runtime bootstrap,
  and adapter layer; full Figma production wiring can be layered on top of the
  existing module boundaries.
