# Current Status

Last updated: 2026-03-11

## Snapshot

- The active V2 workspace now centers on `schema`, `capture-core`, `plugin`, `cli`, and `fixtures`.
- `packages/cli` now provides the new `vibe-figma` CLI plus a thin local companion server for agent workflows.
- The plugin no longer auto-uploads a capture to a heavy bridge. It now keeps a live session open and answers `status` and `capture` commands from the companion.
- The plugin window is now a visible Figma-side smoke panel that shows connection state, current page/selection status, and the latest capture summary while it retries the companion connection automatically.
- `vibe-figma screenshot` now produces a local SVG snapshot by reverse-rendering canonical JSON from either a live capture or an exported file.
- Reverse-render validation now includes a checked experiment against `artifacts/e2e/current-export.json` plus a generated SVG artifact under `artifacts/e2e/current-export.snapshot.svg`.
- Root scripts, packaging, and the live smoke script now point at the CLI-first runtime path.
- `README.md` now documents the CLI-first workflow and explicitly defers MCP in V2.
- `packages/ui-bridge` and `packages/mcp-server` are no longer part of the active workspace or test targets.
- The current working branch is `codex/implements`.
- A new V3 planning RFC now exists at `docs/rfcs/design-json-v3-optimization.md` and makes default canonical JSON reduction the highest-priority product task.
- The first low-risk canonical compaction pass is now implemented: redundant node ids and raw types are stripped from default output, flow-layout children can omit `x/y`, instance payloads are sparse diffs, component authoring catalogs are removed from default registries, and variable mode context is promoted and pruned.

## Latest Completed Milestone

- Implemented the first V2 CLI-first architecture pass from the new runtime RFCs.
- Added the first practical V2 snapshot feature as a thin local SVG renderer behind the existing `screenshot` CLI command.
- Validated the current canonical JSON against a reverse-render experiment for the live Material 3 mobile export.
- Added `packages/cli` with a local companion HTTP server, session routing, logs, status, capture commands, and the `vibe-figma` bin wrapper.
- Refactored `packages/plugin` into a command-driven Figma runtime endpoint that keeps a live companion session instead of doing one-shot bridge uploads.
- Added a thin visible Figma plugin panel for the smoke loop so the human can see connection state and keep the plugin alive while the companion comes up or reconnects.
- Reworked the live smoke script to wait for a live plugin session and request capture through the companion command path.
- Updated packaging to ship the plugin bundle plus CLI artifact rather than bridge and MCP tarballs.
- Rewrote repository documentation and progress tracking around the CLI-first V2 model.
- Implemented the first production compaction pass for canonical JSON without dropping hierarchy, ordering, component refs, or token refs.

## Recommended Next Focus

Execute the V3 JSON-minimization plan before expanding capture scope further. The current representative export is too large for the product goal and needs structural reduction in the canonical payload.

## Immediate Next Steps

1. Continue Phase 2 and Phase 3 of the V3 plan: remove more default layout noise, finish active-slice registries, and reduce remaining repeated instance metadata.
2. Add hard size-budget tests against `artifacts/e2e/current-export.json` so canonical JSON size regressions fail quickly.
3. Re-capture the representative live export through the plugin and compare the new canonical artifact against the current 4,996-line baseline.

## Latest Verification

- Static code migration completed for the CLI-first runtime path.
- `corepack pnpm exec vitest run packages/cli/test/cli.test.ts packages/cli/test/snapshot.test.ts` passes.
- `corepack pnpm typecheck` passes in the current workspace state.
- `corepack pnpm build` passes in the current workspace state.
- Full `corepack pnpm test` is still blocked in this sandbox because localhost `listen()` calls are denied, which prevents the companion HTTP tests from binding a test server.
- A size audit of `artifacts/e2e/current-export.json` confirms the current canonical export is 4,996 lines, 156 KB pretty-printed, and 84,862 bytes minified.
- Re-running the old `artifacts/e2e/current-export.json` through the latest canonical compaction now drops it from 157,978 to 45,371 pretty bytes and from 84,862 to 25,609 minified bytes, a 71.28 percent and 69.82 percent reduction respectively.
