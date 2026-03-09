# In Progress

## Active Track

The next implementation track is bridge persistence and history beyond the
latest in-memory capture.

## Current Focus

- Keep the existing bridge-backed flow stable while adding persisted storage and history-aware retrieval.
- Preserve current package boundaries:
  - `plugin` extracts runtime data
  - `ui-bridge` transports and stores captures
  - `capture-core` normalizes and validates
  - `schema` validates

## Next Concrete Tasks

1. Add persistent local storage for captures instead of latest-only memory storage.
2. Expose bridge history endpoints so downstream clients can inspect more than the newest capture.
3. Add history-aware MCP retrieval once the bridge contract supports it.

## Exit Criteria

- The bridge survives process restarts without losing captures needed by downstream MCP clients.
- Downstream MCP clients can retrieve either the latest capture or a recent capture by history entry.
- The captured result validates against `designDocumentSchema`.
- Packaging and local-dev guidance stay aligned with the new storage behavior.
