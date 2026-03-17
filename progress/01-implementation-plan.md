# Implementation Plan

Status legend:

- `[done]` completed
- `[doing]` in progress or should be picked up next
- `[todo]` not started
- `[blocked]` waiting on a dependency or decision

## Phase 1: Preserve The Core Value

- `[done]` Keep `packages/schema` as the canonical JSON contract.
- `[done]` Keep `packages/capture-core` as the normalization and policy engine.
- `[done]` Keep `packages/fixtures` for deterministic regression coverage.

## Phase 2: Add The CLI Companion

- `[done]` Add `packages/cli` as the primary host-side entrypoint.
- `[done]` Add a thin local companion server for session routing, logs, and live commands.
- `[done]` Add CLI commands for `init`, `status`, `capture`, `export-json`, `logs`, and `doctor`.
- `[done]` Add `screenshot` as a supported CLI command that reverse-renders canonical JSON into a local SVG artifact.

## Phase 3: Refactor The Plugin Runtime

- `[done]` Keep the plugin as the Figma-side runtime endpoint.
- `[done]` Replace one-shot bridge upload flow with a live command channel between plugin UI and worker.
- `[done]` Support live `status` and `capture` requests from the local companion.
- `[done]` Keep reconnect-oriented behavior in the plugin UI loop instead of immediately collapsing back to the old upload model.
- `[done]` Expand runtime extraction so vectors, boolean operations, layout grids, and mixed-text segments flow through both live runtime capture and the shared adapter path.
- `[done]` Add richer structured diagnostics for capture failures that need more than a flat error string.

## Phase 4: De-Emphasize V1 Bridge And MCP Paths

- `[done]` Remove bridge-heavy and MCP-first messaging from root scripts and README.
- `[done]` Exclude `packages/ui-bridge` and `packages/mcp-server` from the active workspace and test targets.
- `[done]` Rework packaging to ship the plugin plus CLI artifact path.
- `[done]` Remove the old bridge env and smoke-script aliases from the active CLI-first path and mark the deferred V1 packages as archived/private in-repo.

## Phase 5: Documentation And Manual Workflow

- `[done]` Rewrite README around the CLI-first runtime model.
- `[done]` Update progress docs to reflect the new architecture and next steps.
- `[done]` Rewrite live smoke and manual verification guidance around the companion workflow.

## Phase 6: Verification

- `[done]` Add a practical reverse-render validation artifact for the live exported JSON.
- `[done]` Implement a thin local SVG snapshot path behind `vibe-figma screenshot`.
- `[done]` Add an HTML browser-preview mode behind `vibe-figma screenshot` for review workflows that want a wrapped artifact instead of raw SVG.
- `[done]` Add reconnect and failure-handling coverage around companion session routing and plugin command failures.
- `[done]` Add multi-session inspection ergonomics plus optional persisted companion state for routine local workflows.
- `[done]` Re-run the full automated suite in an environment that permits localhost listeners.
- `[done]` Run live Figma manual verification against the updated plugin, companion flow, and snapshot path.
- `[done]` Harden the live runtime and smoke verification against real desktop-only sentinel values discovered during manual verification.
- `[done]` Refresh the representative canonical-size regression fixture and thresholds so automated budgets match the newer 400-line-class outputs now checked in under `artifacts/manual/`.

## Phase 7: Schema v0.2 Minimal Canonical

- `[done]` Draft a new schema-first RFC at `docs/rfcs/design-json-schema-v0.2.md` for the minimal canonical payload.
- `[done]` Mark the old v0.1 canonical direction as legacy and point the repository source-of-truth toward v0.2.
- `[done]` Add schema v0.2 alongside v0.1 in `packages/schema`.
- `[done]` Rewrite default canonical emission so component usage, literal visual values, and layout intent are inlined directly on nodes without top-level registries.
- `[done]` Remove default fallback blobs, default radius and overflow payload, and repeated resolved geometry from the default canonical output.
- `[done]` Add a first size-budget regression test for representative live exports.
- `[done]` Keep the current v0.1-like payload available through internal `debug` profile handling in `capture-core` and runtime capture.
- `[done]` Expose `debug` as an explicit CLI/user-facing profile without changing the canonical default export.
- `[done]` Reduce the latest checked-in canonical samples into the 400-line range for the current representative manual exports.
- `[done]` Replace the older `artifacts/e2e/current-export.json` budget target with a fresher representative canonical regression fixture.
- `[done]` Inject the shared default component policy rules into the live runtime path so helper and icon-compatible instances no longer always default to preserve.
- `[done]` Add the next V3 shorthand compaction pass so simple component usage, literal visual values, and simple text payloads collapse to smaller inline forms without changing the default schema version.
- `[done]` Remove duplicate text `fill` output in favor of `textColor` and drop selected generic non-root wrapper names from canonical output.
- `[done]` Add a larger checked V3 optimization regression fixture and budget based on `artifacts/manual/p0-live-capture.debug.json`.
