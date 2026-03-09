# In Progress

## Active Track

The next implementation track is capture quality expansion and live verification notes.

## Current Focus

- Expand fixtures and regression coverage now that the bridge-backed MCP surface can consume real latest-capture data.
- Preserve current package boundaries:
  - `plugin` extracts runtime data
  - `ui-bridge` transports and stores captures
  - `capture-core` normalizes and validates
  - `schema` validates

## Next Concrete Tasks

1. Expand fixtures and regression coverage for remote libraries, icons, ignored helpers, and variable-heavy selections.
2. Write manual verification notes for live Figma plugin loading, bridge upload, and MCP retrieval.
3. Plan the next bridge storage step so MCP tools can evolve from latest-only reads to history-aware retrieval.

## Exit Criteria

- The local bridge exposes enough bridge-backed data for downstream MCP clients without relying on fixture-only flows.
- The captured result validates against `designDocumentSchema`.
- Fixtures, tests, and manual notes cover the main preservation policy and runtime edge cases.
