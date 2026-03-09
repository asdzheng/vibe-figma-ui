# In Progress

## Active Track

The next implementation track is packaging and local development guidance for
the plugin, bridge, and MCP server artifacts.

## Current Focus

- Keep the new persisted bridge history flow stable while documenting how it is
  packaged, configured, and run locally.
- Preserve current package boundaries:
  - `plugin` captures runtime data
  - `ui-bridge` transports and stores captures
  - `capture-core` normalizes and validates
  - `schema` validates
  - `mcp-server` exposes downstream tools

## Next Concrete Tasks

1. Add repeatable packaging steps for plugin, bridge, and MCP deliverables.
2. Document the local development flow for running plugin, bridge, and MCP together.
3. Decide whether the bridge CLI needs extra config flags beyond the current environment-variable controls.

## Exit Criteria

- A contributor can build and run the plugin, bridge, and MCP server locally from documented steps.
- Packaging instructions stay aligned with the committed bin wrappers and persisted bridge storage behavior.
- The documented flow includes where captures are stored and how to override local bridge settings.
