# In Progress

## Active Track

The current track is post-compaction cleanup on top of the CLI-first V2 runtime migration.

## Current Focus

- Keep the default canonical path small and representative now that the latest checked-in manual samples are in the `386-417` line range.
- Refresh regression fixtures and docs so tracked budgets match the current output instead of the older `1,562`-line baseline.
- Decide whether `debug` should stay internal or become an explicit CLI-visible export profile.
- Keep the active architecture boundaries clean:
  - `plugin` is the Figma-side runtime endpoint
  - `cli` is the host-side control surface and local companion
  - `capture-core` and `schema` remain the product core

## Next Concrete Tasks

1. Replace the stale canonical-size baseline in `progress/`, tests, and supporting notes with a current representative fixture that reflects the checked-in `386-417` line outputs.
2. Decide whether to expose CLI profile selection for `debug`, or explicitly document that `debug` remains an internal API-only path.
3. Re-run live Figma verification for plugin launch, reconnect, capture, smoke-loop behavior, and SVG snapshot output.
4. Continue runtime extraction and policy-injection work where the live runtime still lags behind the policy engine and fixture coverage.

## Exit Criteria

- The checked-in representative canonical samples remain in the current `386-417` line range and stay materially below the older `1,562`-line budget still referenced by legacy notes.
- `lint`, `typecheck`, `test`, and `build` are green on the active packages.
- Manual Figma verification still confirms plugin launch, status, capture, reconnect, smoke-loop behavior, and SVG snapshot output after the schema rewrite.
