# Implementation Plan

Status legend:

- `[done]` completed
- `[doing]` in progress or should be picked up next
- `[todo]` not started
- `[blocked]` waiting on a dependency or decision

## Phase 1: Monorepo Foundation

- `[done]` Create root workspace, package manifests, shared TypeScript config, Vitest config, and ESLint config.
- `[done]` Create package boundaries for `schema`, `capture-core`, `plugin`, `ui-bridge`, `mcp-server`, and `fixtures`.
- `[done]` Add root scripts for `lint`, `typecheck`, `test`, and `build`.

## Phase 2: Shared Schema and Policy

- `[done]` Implement canonical JSON schema v0.1 with strict `zod` validation.
- `[done]` Implement registry ref helpers and cross-registry validation.
- `[done]` Implement component preservation policy schema and ordered evaluation.

## Phase 3: Capture Core

- `[done]` Implement document builder and normalization pipeline.
- `[done]` Support preserve, inline, icon, and ignore policy outcomes.
- `[done]` Add deterministic tests for policy behavior and capture shaping.

## Phase 4: Runtime Adapters

- `[done]` Build real Figma Plugin API capture service on top of the current plugin adapter structure.
- `[done]` Add plugin-side extraction for bounds, layout, styles, variables, component refs, and overrides from actual Figma nodes.
- `[doing]` Wire plugin UI messaging to an end-to-end capture request/response flow.

## Phase 5: Bridge and MCP Integration

- `[doing]` Keep the local HTTP bridge as the transport contract to target.
- `[doing]` Connect plugin UI output to the local bridge.
- `[todo]` Add richer MCP tools around bridge-backed capture retrieval and diagnostics.

## Phase 6: Fixtures and Quality

- `[doing]` Expand fixtures beyond the initial sample capture.
- `[done]` Add runtime extraction tests for styles, variables, layout, and design-system metadata.
- `[todo]` Add fixtures for icon normalization, helper-component inlining, ignored components, remote libraries, and variable modes.
- `[todo]` Add manual verification notes for plugin runtime behavior where automation is limited.

## Phase 7: Packaging and Release Flow

- `[done]` Establish commit, push, and release workflow.
- `[todo]` Add repeatable packaging or distribution steps for the plugin and MCP server artifacts.
