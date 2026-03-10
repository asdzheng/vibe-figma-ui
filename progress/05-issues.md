# Issues And Risks

## Current Known Gaps

- The live plugin runtime still captures component instances with the default preserve behavior because policy rule injection is not wired into the runtime flow yet.
- The CLI `screenshot` command is intentionally a stub in the initial V2 pass; visual proof still requires manual Figma-side tooling.
- The active workspace has moved away from bridge and MCP, but the old `packages/ui-bridge` and `packages/mcp-server` directories still exist in-repo as deferred legacy code.
- Newer Figma desktop builds require manifest access declarations that were missing in the repo until the 2026-03-10 plugin manifest/runtime refresh; the remaining verification gap is a real desktop re-import check.

## Risks

- Real Figma Plugin API behavior may surface reconnect or session edge cases not covered by the current static refactor.
- Runtime extraction can still become noisy as more node families are added if deterministic shaping is not preserved.
- Leaving deferred legacy code in the repository for too long may create drift or confusion unless it is cleaned up later.
- Screenshot and richer visual verification remain a manual workflow gap for agent loops.

## Current Blocker

- No automated blocker is active in the workspace right now. The open blocker is manual Figma desktop verification of the refreshed plugin import path.
