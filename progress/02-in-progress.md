# In Progress

## Active Track

The next implementation track is the end-to-end plugin-to-bridge capture flow.

## Current Focus

- Reuse the new runtime extraction layer to power plugin UI capture requests and bridge delivery.
- Preserve current package boundaries:
  - `plugin` extracts runtime data
  - `ui-bridge` transports and stores captures
  - `capture-core` normalizes and validates
  - `schema` validates

## Next Concrete Tasks

1. Implement the plugin UI handshake that requests capture, posts the canonical document, and closes cleanly.
2. Connect the plugin output to the local bridge storage and retrieval path.
3. Add broader fixtures and manual verification notes for live Figma runtime edge cases before broadening MCP features.

## Exit Criteria

- A plugin capture request can travel from the real Figma runtime through the local bridge and back out through the MCP surface.
- The captured result validates against `designDocumentSchema`.
- Fixtures, tests, and manual notes cover the main preservation policy and runtime edge cases.
