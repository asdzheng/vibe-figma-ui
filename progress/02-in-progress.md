# In Progress

## Active Track

The current track is V3 canonical JSON minimization on top of the CLI-first V2 runtime migration.

## Current Focus

- Reduce the default canonical JSON until it is meaningfully small for AI code generation.
- Separate default semantic payload from debug or audit payloads.
- Keep the active architecture boundaries clean:
  - `plugin` is the Figma-side runtime endpoint
  - `cli` is the host-side control surface and local companion
  - `capture-core` and `schema` remain the product core

## Next Concrete Tasks

1. Implement the low-risk canonical cuts from `docs/rfcs/design-json-v3-optimization.md`: redundant ids, raw types, default booleans, flow-layout coordinates, and float rounding.
2. Replace full instance property payloads with sparse override diffs and remove duplicate leaf-component-plus-variant serialization.
3. Replace full variable mode matrices in canonical output with top-level mode context plus active-slice token values.
4. Add size-budget verification for `artifacts/e2e/current-export.json` and new slim-canonical fixtures.

## Exit Criteria

- The representative canonical export is within the agreed V3 size budget.
- `lint`, `typecheck`, `test`, and `build` are green on the active packages.
- Manual Figma verification still confirms plugin launch, status, capture, reconnect, smoke-loop behavior, and SVG snapshot output after the schema cuts.
