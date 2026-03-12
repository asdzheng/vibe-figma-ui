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
- A new schema-first RFC now exists at `docs/rfcs/design-json-schema-v0.2.md` and replaces the old registry-backed canonical direction with a minimal page-semantics contract for default exports.
- The default runtime export path now emits schema `0.2` canonical JSON, while the registry-backed `0.1` document remains available only as an internal debug-oriented path.

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
- Drafted the new v0.2 schema RFC that removes default canonical registries, replaces opaque refs with readable inline semantics, and treats authored layout intent as more important than resolved geometry.
- Implemented schema `0.2` in the active export path, updated snapshot rendering to accept both `0.1` and `0.2`, and added a first size-budget regression test for the checked-in representative export.

## Recommended Next Focus

Tighten the new v0.2 canonical output further. The architectural shift is complete, but the representative export is still too verbose in line count for a simple structured page.

## Immediate Next Steps

1. Remove more repeated leaf-node and label noise from v0.2 so simple structured pages stop expanding into long pretty-printed output.
2. Expose an explicit user-facing `debug` profile so the legacy `0.1` payload remains intentionally reachable.
3. Re-capture `Examples/Upcoming-Mobile` through the plugin and push the new default canonical output below the current `1,562`-line and `45,062`-byte baseline.

## Latest Verification

- Static code migration completed for the CLI-first runtime path.
- `corepack pnpm exec vitest run packages/cli/test/cli.test.ts packages/cli/test/snapshot.test.ts` passes.
- `corepack pnpm typecheck` passes in the current workspace state.
- `corepack pnpm build` passes in the current workspace state.
- Full `corepack pnpm test` is still blocked in this sandbox because localhost `listen()` calls are denied, which prevents the companion HTTP tests from binding a test server.
- A size audit of `artifacts/e2e/current-export.json` confirms the current canonical export is 4,996 lines, 156 KB pretty-printed, and 84,862 bytes minified.
- Re-running the old `artifacts/e2e/current-export.json` through the latest canonical compaction now drops it from 157,978 to 45,371 pretty bytes and from 84,862 to 25,609 minified bytes, a 71.28 percent and 69.82 percent reduction respectively.
- The new schema `0.2` conversion on the checked-in representative export currently lands at `1,562` lines, `45,062` pretty bytes, and `13,421` minified bytes, and that budget is now covered by a regression test.
