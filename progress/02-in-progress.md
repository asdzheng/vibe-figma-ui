# In Progress

## Active Track

The next implementation track is expanding live plugin runtime extraction
coverage for additional Figma node families and mixed text edge cases.

## Current Focus

- Keep the new packaging and local development workflow stable while extending
  runtime capture shape.
- Preserve current package boundaries:
  - `plugin` captures runtime data
  - `ui-bridge` transports and stores captures
  - `capture-core` normalizes and validates
  - `schema` validates
  - `mcp-server` exposes downstream tools

## Next Concrete Tasks

1. Add runtime extraction coverage for vectors, boolean operations, and layout grids.
2. Handle mixed-text edge cases without regressing deterministic capture output.
3. Add fixtures and tests for larger selections or page-level captures once those node families are supported.

## Exit Criteria

- Live plugin capture handles the additional node families without schema regressions.
- New runtime output stays deterministic in tests and fixtures.
- Bridge and MCP consumers continue to accept the expanded capture shape without duplicate logic.
