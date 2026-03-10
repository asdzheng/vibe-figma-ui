# In Progress

## Active Track

The current track is finishing verification and smoke-path hardening after the CLI-first V2 runtime migration.

## Current Focus

- Validate the visible plugin-to-companion session flow against a real Figma desktop session.
- Confirm the updated Figma window guidance and smoke steps are enough for a practical human-assisted verification loop.
- Keep the active architecture boundaries clean:
  - `plugin` is the Figma-side runtime endpoint
  - `cli` is the host-side control surface and local companion
  - `capture-core` and `schema` remain the product core

## Next Concrete Tasks

1. Execute the updated manual verification checklist in `progress/06-manual-verification.md`.
2. Re-run workspace verification in an environment that permits localhost listeners for the companion tests.
3. Resume capture-runtime hardening work on top of the new CLI-first path.

## Exit Criteria

- The V2 workspace installs cleanly again.
- `lint`, `typecheck`, `test`, and `build` are green on the active packages.
- Manual Figma verification confirms plugin launch, status, capture, reconnect, and smoke-loop behavior.
