# In Progress

## Active Track

The current track is schema v0.2 redesign on top of the CLI-first V2 runtime migration.

## Current Focus

- Replace the registry-backed canonical contract with a minimal page-semantics contract.
- Reduce the default canonical JSON until it describes the page, not the authoring system behind the page.
- Separate default semantic payload from debug or component-export payloads.
- Keep the active architecture boundaries clean:
  - `plugin` is the Figma-side runtime endpoint
  - `cli` is the host-side control surface and local companion
  - `capture-core` and `schema` remain the product core

## Next Concrete Tasks

1. Expose an explicit user-facing `debug` profile so the legacy `0.1` payload is available on purpose instead of only through internal calls.
2. Remove more repeated leaf-node and label noise from v0.2 so simple structured pages do not expand into long pretty-printed trees.
3. Move more of the v0.2 emitter from conversion logic toward schema-native semantic emission where the current converter still mirrors too much normalized structure.
4. Re-capture `Examples/Upcoming-Mobile` and push the current `1,562`-line baseline downward.

## Exit Criteria

- The representative canonical export is materially smaller than the current `1,562`-line and `45,062`-byte v0.2 baseline and trends toward the stricter RFC target.
- `lint`, `typecheck`, `test`, and `build` are green on the active packages.
- Manual Figma verification still confirms plugin launch, status, capture, reconnect, smoke-loop behavior, and SVG snapshot output after the schema rewrite.
