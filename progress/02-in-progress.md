# In Progress

## Active Track

The next implementation track is the bridge-backed MCP surface and capture quality expansion.

## Current Focus

- Reuse the new runtime extraction layer and default bridge contract to expose richer capture retrieval through MCP.
- Preserve current package boundaries:
  - `plugin` extracts runtime data
  - `ui-bridge` transports and stores captures
  - `capture-core` normalizes and validates
  - `schema` validates

## Next Concrete Tasks

1. Add MCP tools that return the full latest document, registry slices, and capture diagnostics from the bridge.
2. Expand fixtures and regression coverage for remote libraries, icons, ignored helpers, and variable-heavy selections.
3. Write manual verification notes for live Figma plugin loading, bridge upload, and MCP retrieval.

## Exit Criteria

- The local bridge exposes enough bridge-backed data for downstream MCP clients without relying on fixture-only flows.
- The captured result validates against `designDocumentSchema`.
- Fixtures, tests, and manual notes cover the main preservation policy and runtime edge cases.
