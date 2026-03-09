# Done

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
