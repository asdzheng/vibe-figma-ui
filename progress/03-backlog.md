# Backlog

## Plugin Runtime

- Expand runtime extraction coverage for additional live node families such as vectors, boolean operations, grids, and mixed text cases.
- Document manual verification steps for remote library components, variables, and mixed binding edge cases.
- Add asset and image registry population once the plugin-to-bridge path defines where binary-adjacent metadata should live.

## Bridge

- Add persistent local storage instead of memory-only storage.
- Add capture history endpoints, not only latest capture.
- Add basic authentication or local trust boundary notes if needed.
- Add optional CLI flags or config file support beyond the default host and port env vars.

## MCP Server

- Add a tool to return the full latest canonical document, not only metadata.
- Add tools for diagnostics, registry inspection, and policy explanation.
- Add prompt or resource endpoints if downstream clients benefit.

## Fixtures and Testing

- Add golden fixtures for large selections and page-level capture.
- Add regression tests for omitted defaults, compact output, and runtime extraction edge cases.
- Add manual test notes for live plugin loading in Figma.

## Packaging

- Add plugin packaging instructions.
- Add a documented local dev flow for plugin plus bridge plus MCP server.
- Add release automation for package artifacts if needed later.
