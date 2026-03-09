# Manual Verification

Last updated: 2026-03-09

These steps cover the parts of the plugin-to-bridge flow that are still best
verified against a real Figma runtime.

## Preflight

1. Run `corepack pnpm build`.
2. Optionally run `corepack pnpm package:artifacts` if you want to verify the packaged plugin bundle under `artifacts/plugin/`.
3. Optionally set `VIBE_FIGMA_BRIDGE_STORE_PATH` if you want the bridge to persist somewhere other than `~/.vibe-figma-ui/captures.json`.
4. Start the bridge with `corepack pnpm dev:bridge`.
5. Confirm the bridge startup log prints the storage path it is using.
6. Optionally start the MCP server with `corepack pnpm dev:mcp`.
7. In Figma desktop, import the development plugin from `packages/plugin/manifest.json`, or import `artifacts/plugin/manifest.json` if you are verifying the packaged bundle.

## Scenario 1: Preserved Remote Library Instance

1. Open a Figma file that uses a published remote library component.
2. Select a remote instance such as `Button / Primary`.
3. Run the plugin.
4. Confirm the plugin closes with a success message containing a bridge capture ID.
5. Fetch `http://127.0.0.1:3845/captures/latest`.

Expected result:

- `roots[0].kind` stays `instance`.
- `roots[0].designSystem.componentRef` is present.
- `registries.components[*].remote` is `true`.
- `registries.components[*].library.name` is populated.

## Scenario 2: Variable-Heavy Selection

1. Select a frame that uses both style-bound and directly bound variables.
2. Include at least two variable collections or modes if available.
3. Run the plugin and fetch the latest bridge capture.

Expected result:

- `registries.variables` contains the referenced variables and their mode tables.
- `registries.styles[*].boundVariables` points at the captured variable refs.
- `roots[*].designSystem.resolvedVariableModes` is populated when the runtime exposes it.

## Scenario 3: Bridge History And MCP Retrieval

1. After a successful plugin upload, call the MCP tools `get_latest_capture`, `get_latest_capture_document`, and `get_latest_capture_registries`.
2. Upload at least one more selection so the bridge has history.
3. Fetch `http://127.0.0.1:3845/captures`, `http://127.0.0.1:3845/captures/latest`, and `http://127.0.0.1:3845/captures/<captureId>` for one of the history entries.
4. Call the MCP tools `get_capture_history` and `get_capture_document_by_id` for one of those capture IDs.
5. Restart the local bridge process and repeat the history fetches.

Expected result:

- MCP reads the same latest capture that the bridge stored.
- Bridge history remains available after the bridge process restarts.
- `get_capture_history` returns the same recent IDs as `GET /captures`.
- `get_capture_document_by_id` returns the same document as `GET /captures/<captureId>`.
- Registry counts match between MCP summary output and the bridge document body.

## Current Boundary

- Icon normalization, helper inlining, and ignored-helper outputs are currently
  covered by named regression fixtures in `packages/fixtures/data`.
- The live plugin runtime does not inject component policy rule tables yet, so
  real Figma uploads should currently be expected to preserve instances unless a
  later integration step wires policy input into the runtime capture flow.
