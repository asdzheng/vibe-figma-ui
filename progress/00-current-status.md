# Current Status

Last updated: 2026-03-15

## Snapshot

- The active V2 workspace now centers on `schema`, `capture-core`, `plugin`, `cli`, and `fixtures`.
- `packages/cli` now provides the new `vibe-figma` CLI plus a thin local companion server for agent workflows.
- The plugin no longer auto-uploads a capture to a heavy bridge. It now keeps a live session open and answers `status` and `capture` commands from the companion.
- The plugin window is now a visible Figma-side smoke panel that shows connection state, current page/selection status, and the latest capture summary while it retries the companion connection automatically.
- `vibe-figma screenshot` now produces a local SVG snapshot by reverse-rendering canonical JSON from either a live capture or an exported file.
- The default export path still emits schema `0.2` canonical JSON in code, but the latest checked-in representative manual exports are now down to `386-417` lines instead of the older `1,562`-line baseline tracked earlier.
- Internal `debug` profile handling now exists in the shared document-building path and runtime capture path, but the CLI still exports only the canonical default profile.
- Reverse-render validation now includes a checked experiment against `artifacts/e2e/current-export.json` plus a generated SVG artifact under `artifacts/e2e/current-export.snapshot.svg`.
- Root scripts, packaging, and the live smoke script now point at the CLI-first runtime path.
- `README.md` now documents the CLI-first workflow and explicitly defers MCP in V2.
- `packages/ui-bridge` and `packages/mcp-server` are no longer part of the active workspace or test targets.
- The current working branch is `codex/implements`.
- A new V3 planning RFC now exists at `docs/rfcs/design-json-v3-optimization.md` and makes default canonical JSON reduction the highest-priority product task.
- The first low-risk canonical compaction pass is now implemented: redundant node ids and raw types are stripped from default output, flow-layout children can omit `x/y`, instance payloads are sparse diffs, component authoring catalogs are removed from default registries, and variable mode context is promoted and pruned.
- A new schema-first RFC now exists at `docs/rfcs/design-json-schema-v0.2.md` and replaces the old registry-backed canonical direction with a minimal page-semantics contract for default exports.
- The default runtime export path still emits schema `0.2` canonical JSON, while the registry-backed `0.1` document remains available through internal debug-oriented paths.

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
- Landed additional canonical reduction beyond the original v0.2 baseline: the latest checked-in manual exports under `artifacts/manual/` now land at `386` and `417` lines with roughly `3.7-4.2 KB` minified payloads.
- Wired internal `debug` profile handling into `capture-core` and runtime capture entrypoints, while keeping the CLI on the canonical default path.

## Recommended Next Focus

Refresh the tracked regression baselines and finish the runtime-facing gaps. Canonical output is now materially smaller on the latest representative manual samples, but the checked-in progress notes and some budget tests still point at older exports.

## Immediate Next Steps

1. Replace the old `artifacts/e2e/current-export.json`-based size narrative with a current representative fixture and budget that reflects the `386-417` line canonical outputs now checked in under `artifacts/manual/`.
2. Decide whether `debug` should stay as an internal capture API only or be exposed as an explicit CLI profile flag.
3. Re-run live Figma verification for plugin launch, reconnect, capture, smoke-loop behavior, and SVG snapshot output after the recent canonical reductions.

## Latest Verification

- Static code migration completed for the CLI-first runtime path.
- `corepack pnpm exec vitest run packages/cli/test/cli.test.ts packages/cli/test/snapshot.test.ts` passes.
- `corepack pnpm typecheck` passes in the current workspace state.
- `corepack pnpm build` passes in the current workspace state.
- Full `corepack pnpm test` is still blocked in this sandbox because localhost `listen()` calls are denied, which prevents the companion HTTP tests from binding a test server.
- The currently checked-in legacy debug export at `artifacts/e2e/current-export.json` is `3,875` lines.
- The newer checked-in canonical samples are much smaller:
  - `artifacts/manual/current-selection-v0.2.json`: `386` lines, `9,511` pretty bytes, `3,653` minified bytes.
  - `artifacts/manual/current-selection-v0.2.live.json`: `417` lines, `10,716` pretty bytes, `4,237` minified bytes.
- The existing regression test in `packages/capture-core/test/canonical-v0-2.test.ts` still enforces the older `<=1600` line, `<=46 KB` pretty, and `<=14 KB` minified budget against the older checked-in export, so regression protection has not yet been tightened to the newer 400-line class of outputs.
