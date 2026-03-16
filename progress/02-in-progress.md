# In Progress

## Active Track

The current track is closing out the V3 shorthand release now that the next canonical compaction pass is implemented and the automated suite is green.

## Current Focus

- The live runtime closeout is now complete:
  - live runtime policy injection is wired in
  - the representative canonical size regression uses the current manual sample
  - `lint`, `typecheck`, `test`, and `build` are green
  - real desktop verification now covers `status`, `sessions`, `capture`, `export-json`, SVG/HTML snapshot output, and `test:e2e:figma`
- The next V3-size pass is now in code:
  - simple `component`, `text`, and literal visual values emit shorthand forms
  - duplicate text `fill` output is removed in favor of `textColor`
  - generic wrapper names are pruned on selected non-root nodes
  - the smaller representative fixture is now `359-392` lines
  - the larger checked optimization fixture is now `1,182` lines / `37,186` pretty bytes / `11,072` minified bytes
- The remaining closeout work is release-oriented:
  - make sure the live companion process is restarted on the new transport/schema build before the next desktop rerun
  - publish the V3 shorthand pass as the next tagged release

## Next Concrete Tasks

1. Restart the companion process on the current build, then rerun one live desktop `export-json` check so the new shorthand transport shape is verified end to end.
2. Publish the current V3 shorthand pass as the next release once the final release checks are green.
3. After release, decide whether the next follow-up should target larger page-level compaction or reconnect-safe in-flight capture handoff.

## Exit Criteria

- The checked-in representative canonical samples remain in the current `359-392` line range and stay materially below the older `1,562`-line budget still referenced by legacy notes.
- The live runtime applies component policy decisions instead of always preserving instances by default.
- `lint`, `typecheck`, `test`, and `build` are green on the active packages.
- Manual Figma verification remains green on the current release build after the companion is restarted onto the new transport/schema output.
- Larger live exports such as `artifacts/manual/p0-live-capture.json` become materially smaller without regressing the smaller representative fixture or breaking the smoke loop.
