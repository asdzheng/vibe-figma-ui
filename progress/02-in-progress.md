# In Progress

## Active Track

The current track is snapshot-path and capture-fidelity hardening after the CLI-first V2 runtime migration.

## Current Focus

- Validate the visible plugin-to-companion session flow against a real Figma desktop session.
- Confirm the new SVG snapshot output is a practical verification artifact alongside canonical JSON export.
- Keep the active architecture boundaries clean:
  - `plugin` is the Figma-side runtime endpoint
  - `cli` is the host-side control surface and local companion
  - `capture-core` and `schema` remain the product core

## Next Concrete Tasks

1. Execute the updated manual verification checklist in `progress/06-manual-verification.md`, including `vibe-figma screenshot`.
2. Re-run workspace verification in an environment that permits localhost listeners for the companion tests.
3. Resume capture-runtime hardening work on top of the new CLI-first path, prioritizing policy injection and richer preserved-instance semantics.

## Exit Criteria

- The V2 workspace installs cleanly again.
- `lint`, `typecheck`, `test`, and `build` are green on the active packages.
- Manual Figma verification confirms plugin launch, status, capture, reconnect, smoke-loop behavior, and SVG snapshot output.
