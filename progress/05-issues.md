# Issues and Risks

## Current Known Gaps

- The plugin package still relies on a Figma-like adapter model and does not yet fully extract from real Plugin API node data.
- The bridge currently stores only the latest capture in memory.
- The MCP server currently exposes a minimal first tool set and not the full capture-management surface.

## Risks

- Real Figma Plugin API extraction will surface node-type variance and edge cases not covered by the current sample fixture.
- Variable, style, and instance-override extraction can become noisy if not kept deterministic.
- If plugin runtime and capture-core boundaries blur, logic duplication may creep in across layers.

## No Current Blockers

- Node, `pnpm`, git remote, and `gh` authentication are working.
- The repository is currently in a clean post-release state.
