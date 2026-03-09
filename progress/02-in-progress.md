# In Progress

## Active Track

The next implementation track is the real plugin capture path.

## Current Focus

- Build a plugin-side extraction layer that reads actual Figma Plugin API nodes and maps them into the canonical `schema` package types.
- Preserve current package boundaries:
  - `plugin` extracts runtime data
  - `capture-core` normalizes
  - `schema` validates

## Next Concrete Tasks

1. Introduce plugin capture modules for:
   - node traversal
   - bounds/layout extraction
   - appearance extraction
   - text extraction
   - component and component set registry extraction
2. Decide where plugin-only raw data types stop and canonical normalization begins.
3. Add fixtures and tests for real capture edge cases before broadening MCP features.

## Exit Criteria

- The plugin can capture the current selection from real Figma runtime nodes.
- The result validates against `designDocumentSchema`.
- Fixtures and tests cover the main preservation policy paths.
