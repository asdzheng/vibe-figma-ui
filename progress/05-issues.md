# Issues and Risks

## Current Known Gaps

- The bridge currently stores only the latest capture in memory.
- Live Figma manual verification notes are not written yet beyond the structural runtime tests.

## Risks

- Real Figma Plugin API usage will still surface node-type variance and edge cases not covered by the current runtime tests.
- Variable, style, and instance-override extraction can become noisy if not kept deterministic as more node families are added.
- If plugin, bridge, and MCP boundaries blur during integration, logic duplication may creep in across layers.
- Localhost access from the Figma UI runtime depends on the local environment allowing loopback HTTP requests; browser-like runtime constraints still need manual validation.

## No Current Blockers

- Node, `pnpm`, git remote, and `gh` authentication are working.
- Workspace verification is currently green after the runtime capture milestone.
