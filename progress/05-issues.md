# Issues And Risks

## Current Known Gaps

- The live plugin runtime still captures component instances with the default preserve behavior because policy rule injection is not wired into the runtime flow yet.
- The new CLI `screenshot` command produces a reverse-rendered SVG, not a native Figma raster screenshot, so exact visual parity still requires manual comparison in Figma.
- The active workspace has moved away from bridge and MCP, but the old `packages/ui-bridge` and `packages/mcp-server` directories still exist in-repo as deferred legacy code.
- Newer Figma desktop builds require manifest access declarations that were missing in the repo until the 2026-03-10 plugin manifest/runtime refresh; the remaining verification gap is a real desktop re-import check.
- The current canonical export is too large to be product-viable for AI consumers: `artifacts/e2e/current-export.json` is 4,996 lines, 156 KB pretty-printed, and 84,862 bytes minified for a moderate single-page capture.
- The largest known JSON bloat sources are full variable mode matrices, component authoring property catalogs, repeated instance property payloads, node-level resolved variable modes, and default layout or bounds fields that should be inferred instead.
- The deeper root problem is now explicit: schema v0.1 still assumes a registry-backed normalized document, which is structurally misaligned with the product goal of extremely small page-level codegen payloads.
- The new default v0.2 path fixes the worst structural problem and cuts the representative export to `1,562` lines and `13,421` minified bytes, but the pretty-printed output is still too long for a simple structured page.

## Risks

- Real Figma Plugin API behavior may surface reconnect or session edge cases not covered by the current static refactor.
- Runtime extraction can still become noisy as more node families are added if deterministic shaping is not preserved.
- Leaving deferred legacy code in the repository for too long may create drift or confusion unless it is cleaned up later.
- Preserved remote instances can still lose internal semantic detail in reverse-render snapshots unless the capture includes richer per-instance properties or optional visual assets.
- If canonical JSON minimization is not treated as a hard budgeted requirement, the repository can continue adding fidelity while silently making downstream code generation worse.
- If V3 mixes debug payloads back into the default canonical profile, the project will keep paying payload cost without improving codegen usefulness.
- If v0.2 only renames fields but keeps registries, fallback blobs, and resolved geometry in place, the repository will absorb migration cost without fixing the real payload problem.
- The current v0.2 implementation still carries too many repeated leaf nodes and labels because the converter starts from a normalized tree instead of a schema-native semantic emitter.

## Current Blocker

- No automated blocker is active in the workspace right now. The highest-priority blocker is replacing the current conversion-based v0.2 emitter with a more schema-native semantic emitter that can cut line count further.
