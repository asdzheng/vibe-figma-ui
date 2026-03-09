# Issues and Risks

## Current Known Gaps

- The plugin now extracts from real Figma runtime nodes, but the plugin UI is not yet connected to the local bridge end to end.
- The bridge currently stores only the latest capture in memory.
- The MCP server currently exposes a minimal first tool set and not the full capture-management surface.
- Live Figma manual verification notes are not written yet beyond the structural runtime tests.

## Risks

- Real Figma Plugin API usage will still surface node-type variance and edge cases not covered by the current runtime tests.
- Variable, style, and instance-override extraction can become noisy if not kept deterministic as more node families are added.
- If plugin, bridge, and MCP boundaries blur during integration, logic duplication may creep in across layers.

## No Current Blockers

- Node, `pnpm`, git remote, and `gh` authentication are working.
- Workspace verification is currently green after the runtime capture milestone.
