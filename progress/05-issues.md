# Issues And Risks

## Current Known Gaps

- The new CLI `screenshot` command now produces materially stronger reverse-rendered SVG or HTML preview artifacts, but it is still not a native Figma raster screenshot, so exact visual parity still requires manual comparison in Figma.
- Even with better inferred sizing, typography, gradients, shadows, and component coverage, local-first snapshot output still cannot reproduce native Figma image fills, vector paths, or remote-instance internals that were never captured into the JSON payload.
- The larger live export class represented by `artifacts/manual/p0-live-capture.json` is materially smaller after the shorthand pass but is still much bigger than the smaller checked-in representative fixture, so any future optimization work should stay focused on schema structure rather than runtime feature plumbing.
- When the canonical transport schema changes, any already-running companion process must be restarted before live capture verification. A stale companion process will reject the new shorthand payload forms on `/events` even though the codebase and tests are correct.

## Risks

- Real Figma Plugin API behavior may still surface reconnect or session edge cases beyond the now-verified single-session desktop loop.
- Runtime extraction can still become noisy as more node families are added if deterministic shaping is not preserved.
- Preserved remote instances can still lose internal semantic detail in reverse-render snapshots unless the capture includes richer per-instance properties or optional visual assets.
- If V3 mixes debug payloads back into the default canonical profile, the project will keep paying payload cost without improving codegen usefulness.
- If v0.2 only renames fields but keeps registries, fallback blobs, and resolved geometry in place, the repository will absorb migration cost without fixing the real payload problem.
- The current v0.2 implementation still carries too many repeated leaf nodes and labels because the converter starts from a normalized tree instead of a schema-native semantic emitter.
- If reconnect-heavy desktop workflows become common, in-flight capture commands can still be awkward because command routing is bound to a specific plugin session at dispatch time.

## Current Blocker

- No code blocker is active in the workspace. The only release-time operational requirement is to restart the local companion before running live desktop verification so the active process uses the new transport/schema build.
