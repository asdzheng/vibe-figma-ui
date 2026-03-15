# Issues And Risks

## Current Known Gaps

- The live plugin runtime still captures component instances with the default preserve behavior because policy rule injection is not wired into the runtime flow yet.
- The new CLI `screenshot` command produces a reverse-rendered SVG, not a native Figma raster screenshot, so exact visual parity still requires manual comparison in Figma.
- The active workspace has moved away from bridge and MCP, but the old `packages/ui-bridge` and `packages/mcp-server` directories still exist in-repo as deferred legacy code.
- Newer Figma desktop builds require manifest access declarations that were missing in the repo until the 2026-03-10 plugin manifest/runtime refresh; the remaining verification gap is a real desktop re-import check.
- Canonical output is no longer in the old `1,562`-line range on the latest checked-in manual samples, but the tracked regression budget and progress narrative still lag behind the current `386-417` line artifacts.
- The repository still relies on an older `artifacts/e2e/current-export.json` fixture and `<=1600` line budget test, so automated regression protection has not yet caught up with the newer smaller outputs.
- `debug` profile handling now exists internally in the document-building and runtime capture paths, but the CLI does not yet expose a supported profile selector, so there is still no explicit user-facing way to request debug output.

## Risks

- Real Figma Plugin API behavior may surface reconnect or session edge cases not covered by the current static refactor.
- Runtime extraction can still become noisy as more node families are added if deterministic shaping is not preserved.
- Leaving deferred legacy code in the repository for too long may create drift or confusion unless it is cleaned up later.
- Preserved remote instances can still lose internal semantic detail in reverse-render snapshots unless the capture includes richer per-instance properties or optional visual assets.
- If the refreshed smaller canonical outputs are not turned into the new enforced regression baseline, the repository can silently regress while the docs still claim the optimization is effectively done.
- If V3 mixes debug payloads back into the default canonical profile, the project will keep paying payload cost without improving codegen usefulness.
- If v0.2 only renames fields but keeps registries, fallback blobs, and resolved geometry in place, the repository will absorb migration cost without fixing the real payload problem.
- The current v0.2 implementation still carries too many repeated leaf nodes and labels because the converter starts from a normalized tree instead of a schema-native semantic emitter.

## Current Blocker

- No automated blocker is active in the workspace right now. The highest-priority documentation and verification blocker is refreshing the representative canonical fixture and regression budgets so they match the current smaller outputs.
