# Manual Verification

Last updated: 2026-03-11

These steps cover the parts of the CLI-first runtime that still need a real Figma desktop session.

## Preflight

1. Run `corepack pnpm build` so the plugin bundle and CLI dist output exist.
2. Optionally run `corepack pnpm package:artifacts` if you want to verify the packaged plugin bundle and CLI tarball under `artifacts/`.
3. Start the local companion with `corepack pnpm dev:cli`.
4. In Figma desktop, import the development plugin from `packages/plugin/manifest.json`, or import `artifacts/plugin/manifest.json` if you are verifying the packaged bundle.
5. Keep another terminal ready for CLI commands such as `corepack pnpm cli -- status`.

## Scenario 1: Plugin Launch And Waiting State

1. Open any Figma file.
2. Run the `Vibe Figma UI` plugin before or after starting the companion.
3. Leave the plugin window open.

Expected result:

- The plugin opens a visible status window instead of running invisibly.
- If the companion is not ready yet, the plugin stays open and shows a waiting or reconnecting state instead of closing immediately.
- The window shows the default companion URL, the latest page name, selection count, and latest capture summary placeholders.

## Scenario 2: Companion Connectivity And Live Status

1. Open a Figma file with a non-empty selection.
2. Run the plugin in Figma desktop.
3. Run `corepack pnpm cli -- status`.

Expected result:

- The CLI reports `connected: true`.
- `current.status.page.name` matches the open Figma page.
- `current.status.selectionCount` matches the live selection.
- The plugin window switches to a connected state and shows the same page and selection summary.
- No bridge upload or MCP configuration is required for the status check.

## Scenario 3: Live Capture And Canonical Export

1. Select a component instance or frame that exercises registry extraction.
2. Run `corepack pnpm cli -- capture`.
3. Run `corepack pnpm cli -- export-json --output artifacts/manual/capture.json`.
4. Open `artifacts/manual/capture.json`.

Expected result:

- `capture` prints a summary with page name, selection count, root count, and warning count.
- `export-json` prints canonical JSON to stdout and writes the same document to disk.
- The plugin window updates its latest capture summary after the capture command completes.
- The exported JSON now defaults to schema `0.2`, contains inline component usage and literal visual values, and does not include top-level registries.

## Scenario 4: Reconnect And Log Inspection

1. Leave the plugin running in Figma desktop.
2. Stop the companion process and start it again with `corepack pnpm dev:cli`.
3. Run `corepack pnpm cli -- status` again.
4. Run `corepack pnpm cli -- logs --limit 100`.

Expected result:

- The plugin reconnects without falling back to the old bridge upload model.
- The plugin window transitions through reconnecting back to connected without needing to be manually reopened.
- `status` returns to `connected: true` after the companion restarts.
- `logs` include session-connect and plugin UI log entries from the reconnect cycle.

## Scenario 5: SVG Snapshot Output

1. Open a Figma file with a non-empty selection and keep the plugin running.
2. Run `corepack pnpm cli -- screenshot --output artifacts/manual/live-screenshot.svg`.
3. Open `artifacts/manual/live-screenshot.svg`.

Expected result:

- The CLI captures live canonical JSON first, then writes a local SVG snapshot.
- The printed summary includes the output path plus SVG width and height.
- The SVG preserves the captured screen hierarchy and Material 3 component intent closely enough for code review or codegen validation.
- The artifact is clearly a reverse-rendered verification view, not a native Figma bitmap screenshot.

## Scenario 6: Assisted Smoke Loop

1. Start the companion with `corepack pnpm dev:cli`.
2. Run `corepack pnpm test:e2e:figma`.
3. While the script waits, run the plugin in Figma desktop on a non-empty selection.
4. Open `artifacts/e2e/figma-smoke-report.json`.

Expected result:

- The script waits for a live plugin session rather than polling a stored bridge capture.
- The script requests a live capture through the new companion command path.
- The report includes session ID, capture time, page name, root count, selection count, and diagnostics count.
- The plugin window can remain open for the whole smoke loop; the only required human actions are in Figma desktop.

## Current Boundary

- Icon normalization, helper inlining, ignored helpers, remote-library preservation, and variable-mode shaping still rely on the same core normalization and checked-in fixtures.
- Live runtime policy injection is still missing, so real Figma runs should still be expected to default to preserved instances unless policy input is wired in later.
- `vibe-figma screenshot` now produces a practical SVG verification artifact, but exact visual parity still requires manual comparison against the live Figma canvas.
- The practical manual boundary is now: import the plugin, run it in Figma desktop, keep the window open, and compare the reverse-rendered SVG to Figma when exact fidelity matters.
