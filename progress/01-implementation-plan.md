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
- `[done]` Leave `screenshot` as an explicit unsupported command for now instead of pretending the path exists.

## Phase 3: Refactor The Plugin Runtime

- `[done]` Keep the plugin as the Figma-side runtime endpoint.
- `[done]` Replace one-shot bridge upload flow with a live command channel between plugin UI and worker.
- `[done]` Support live `status` and `capture` requests from the local companion.
- `[done]` Keep reconnect-oriented behavior in the plugin UI loop instead of immediately collapsing back to the old upload model.

## Phase 4: De-Emphasize V1 Bridge And MCP Paths

- `[done]` Remove bridge-heavy and MCP-first messaging from root scripts and README.
- `[done]` Exclude `packages/ui-bridge` and `packages/mcp-server` from the active workspace and test targets.
- `[done]` Rework packaging to ship the plugin plus CLI artifact path.

## Phase 5: Documentation And Manual Workflow

- `[done]` Rewrite README around the CLI-first runtime model.
- `[done]` Update progress docs to reflect the new architecture and next steps.
- `[done]` Rewrite live smoke and manual verification guidance around the companion workflow.

## Phase 6: Verification

- `[done]` Add a practical reverse-render validation artifact for the live exported JSON.
- `[done]` Implement a thin local SVG snapshot path behind `vibe-figma screenshot`.
- `[doing]` Re-run the full automated suite in an environment that permits localhost listeners.
- `[doing]` Run live Figma manual verification against the updated plugin, companion flow, and snapshot path.

## Phase 7: V3 JSON Minimization

- `[done]` Remove canonical payload defaults and redundant fields that do not materially change code generation output.
- `[doing]` Convert preserved-instance payloads from full property surfaces to sparse override diffs.
- `[doing]` Move variable mode context to top-level metadata and replace full variable mode matrices with active-slice registry entries in canonical output.
- `[doing]` Strip component, component-set, and style registries down to usage-driven semantic entries for canonical output.
- `[todo]` Add explicit output profiles so `canonical` stays small and `debug` carries the heavier inspection payload.
- `[todo]` Add size-budget tests for representative live exports and fail on canonical JSON growth beyond the agreed thresholds.
