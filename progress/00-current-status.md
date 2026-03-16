# Current Status

Last updated: 2026-03-16

## Snapshot

- The active V2 workspace now centers on `schema`, `capture-core`, `plugin`, `cli`, and `fixtures`.
- `packages/cli` now provides the new `vibe-figma` CLI plus a thin local companion server for agent workflows.
- The plugin no longer auto-uploads a capture to a heavy bridge. It now keeps a live session open and answers `status` and `capture` commands from the companion.
- The plugin window is now a visible Figma-side smoke panel that shows connection state, current page/selection status, and the latest capture summary while it retries the companion connection automatically.
- `vibe-figma screenshot` now produces either a local SVG artifact or an HTML browser preview by reverse-rendering canonical JSON from either a live capture or an exported file.
- The local screenshot renderer now infers hug/fill sizing more accurately, uses stronger text metrics, applies captured gradient and drop-shadow hints from debug exports, clips scrollable containers, and materially reduces generic placeholder instance cards in the checked snapshot fixtures.
- The default export path still emits schema `0.2` canonical JSON in code, but the latest checked-in representative manual exports are now down to `359-392` lines instead of the older `1,562`-line baseline tracked earlier.
- The CLI now exposes `--profile canonical|debug`, so the older `0.1`-style debug payload is available as an explicit user-facing path when needed.
- Runtime extraction now covers vectors, boolean operations, layout grids, and mixed-text segment payloads in both the direct adapter path and the live runtime capture path.
- The companion now supports richer command diagnostics, a `sessions` command for multi-window inspection, and optional persisted session state through `VIBE_FIGMA_STATE_PATH`.
- The live runtime now injects the shared default component policy rules, so helper components and icon-compatible component-set matches no longer always default to preserve in the companion-driven capture path.
- The latest V3 shorthand compaction pass is now implemented under schema `0.2`: name-only component usage compacts to bare strings, simple text compacts to bare strings, literal visual values can stay as bare strings, duplicate text `fill` is removed in favor of `textColor`, and generic wrapper names are dropped from selected non-root nodes.
- The representative canonical size regression now targets `artifacts/manual/current-selection.json` and enforces the current `<=370` line, `<=9.25 KB` pretty, and `<=3.6 KB` minified class of outputs.
- A larger checked optimization regression now converts `artifacts/manual/p0-live-capture.debug.json` and enforces the current `<=1,200` line, `<=38 KB` pretty, and `<=11.5 KB` minified class of outputs.
- Reverse-render validation now includes a checked experiment against `artifacts/e2e/current-export.json` plus a generated SVG artifact under `artifacts/e2e/current-export.snapshot.svg`.
- Root scripts, packaging, and the live smoke script now point at the CLI-first runtime path.
- `README.md` now documents the CLI-first workflow and explicitly defers MCP in V2.
- `packages/ui-bridge` and `packages/mcp-server` are no longer part of the active workspace or test targets, and the active CLI/smoke path no longer accepts the old bridge env names or `--bridge-url` flag.
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
- Strengthened the reverse-render snapshot path with better inferred sizing, text layout, captured gradients/shadows, clip-path handling, and broader Material instance coverage so checked local artifacts are visibly closer to the Figma source without using a native screenshot API.
- Implemented the first production compaction pass for canonical JSON without dropping hierarchy, ordering, component refs, or token refs.
- Drafted the new v0.2 schema RFC that removes default canonical registries, replaces opaque refs with readable inline semantics, and treats authored layout intent as more important than resolved geometry.
- Implemented schema `0.2` in the active export path, updated snapshot rendering to accept both `0.1` and `0.2`, and added a first size-budget regression test for the checked-in representative export.
- Landed additional canonical reduction beyond the original v0.2 baseline: the latest checked-in manual exports under `artifacts/manual/` now land at `359` and `392` lines with roughly `3.5-4.1 KB` minified payloads.
- Exposed `debug` profile selection through the CLI, expanded runtime extraction coverage for vectors/booleans/grid/mixed text, added richer runtime diagnostics, added multi-session inspection and optional persisted session state, added HTML preview output for `screenshot`, wired default component policy rules into the live runtime path, refreshed the canonical regression baseline, fixed the live capture timeout mismatch between companion and plugin UI, and archived the remaining V1 bridge/MCP entrypoints in the active path.
- Landed the next V3 canonical compaction pass under schema `0.2`, including shorthand `component` / `text` / literal visual values, duplicate text-color cleanup, generic wrapper-name pruning, refreshed manual artifacts, and a new large-selection regression budget.

## Recommended Next Focus

Start the next structural reduction pass only if larger real-world selections still need it after the shorthand release. The immediate follow-up questions are whether page-level captures need a schema-native emitter beyond the current converter and whether reconnect-safe in-flight command handoff is worth hardening beyond the existing `--session` targeting path.

## Immediate Next Steps

1. Re-run one live desktop export on the current release build after restarting the companion process so the transport schema and plugin session agree on the new shorthand payload forms.
2. Decide whether the next optimization step should be a schema-native emitter for larger page-level captures or a thinner transport-only export on top of the current shorthand schema.
3. Decide whether reconnect-safe in-flight capture handoff is worth hardening beyond the current `--session` selection path for multi-window or reconnect-heavy local workflows.

## Latest Verification

- Static code migration completed for the CLI-first runtime path.
- `corepack pnpm exec vitest run packages/cli/test/cli.test.ts packages/cli/test/snapshot.test.ts` passes.
- `corepack pnpm exec vitest run packages/plugin/test/runtime-capture.test.ts packages/plugin/test/adapter.test.ts packages/schema/test/document-schema.test.ts` passes.
- `corepack pnpm exec vitest run packages/plugin/test/main.test.ts packages/cli/test/server.test.ts packages/cli/test/session-store.test.ts` passes.
- `corepack pnpm exec vitest run packages/capture-core/test/policy-engine.test.ts packages/capture-core/test/canonical-v0-2.test.ts packages/fixtures/test/loaders.test.ts` passes.
- `corepack pnpm exec vitest run scripts/figma-e2e-smoke.test.mjs` passes.
- `corepack pnpm exec vitest run packages/schema/test/document-schema.test.ts packages/capture-core/test/canonical-v0-2.test.ts packages/cli/test/snapshot.test.ts packages/plugin/test/adapter.test.ts scripts/figma-e2e-smoke.test.mjs` passes.
- `corepack pnpm lint` passes in the current unrestricted workspace state.
- `corepack pnpm test` passes in the current unrestricted workspace state.
- `corepack pnpm typecheck` passes in the current workspace state.
- `corepack pnpm build` passes in the current workspace state.
- The strengthened local snapshot path is now covered by additional CLI and renderer assertions:
  - the shorthand canonical sample now renders with `11` materialized instances and `0` placeholders through the built `vibe-figma screenshot` command
  - the checked debug live export now renders with `25` materialized instances and `4` placeholders through the built `vibe-figma screenshot` command
  - `packages/cli/test/snapshot.test.ts` now asserts canonical list-item materialization and debug gradient/shadow defs
- A real Figma desktop session answered `vibe-figma status` and `vibe-figma sessions` on `2026-03-16`, confirming the rebuilt companion process had a fresh live plugin session attached.
- The first live rerun on `2026-03-16` exposed two real desktop-only shaping bugs that were then fixed in code:
  - mixed Figma `Symbol` sentinels still leaked into async style lookup and numeric runtime fields
  - grid sentinel values such as `0` and `-1` still leaked into canonical layout payloads and failed schema validation
- After those fixes landed, the same desktop rerun completed successfully:
  - `corepack pnpm cli -- capture`
  - `corepack pnpm cli -- export-json --output artifacts/manual/p0-live-capture.json`
  - `corepack pnpm cli -- screenshot --output artifacts/manual/p0-live-screenshot.svg`
  - `corepack pnpm cli -- screenshot --output artifacts/manual/p0-live-preview.html`
  - `corepack pnpm test:e2e:figma -- --timeout-ms=10000 --poll-ms=500`
- The checked large-selection optimization artifact is now materially smaller than the earlier live export baseline:
  - `artifacts/manual/p0-live-capture.json`: `1,182` lines, `37,186` pretty bytes, `11,072` minified bytes.
- The current live verification artifacts also include:
  - `artifacts/manual/p0-live-screenshot.svg`
  - `artifacts/manual/p0-live-preview.html`
  - `artifacts/e2e/figma-smoke-report.json`
- The currently checked-in legacy debug export at `artifacts/e2e/current-export.json` is `3,875` lines.
- The newer checked-in canonical samples are much smaller:
  - `artifacts/manual/current-selection-v0.2.json`: `359` lines, `8,926` pretty bytes, `3,507` minified bytes.
  - `artifacts/manual/current-selection-v0.2.live.json`: `392` lines, `10,173` pretty bytes, `4,100` minified bytes.
  - `artifacts/manual/p0-live-capture.json`: `1,182` lines, `37,186` pretty bytes, `11,072` minified bytes.
- The refreshed regression tests in `packages/capture-core/test/canonical-v0-2.test.ts` now enforce:
  - `artifacts/manual/current-selection.json`: `<=370` lines, `<=9.25 KB` pretty, `<=3.6 KB` minified
  - `artifacts/manual/p0-live-capture.debug.json`: `<=1,200` lines, `<=38 KB` pretty, `<=11.5 KB` minified after conversion
