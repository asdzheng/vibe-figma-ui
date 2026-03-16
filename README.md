# vibe-figma-ui

CLI-first Figma context capture for AI code generation.

V2 centers the product on:

- a Figma plugin as the Figma-side runtime endpoint
- a local `vibe-figma` CLI companion for human and agent workflows
- shared `schema`, `capture-core`, canonical JSON, and policy logic

MCP is explicitly deferred in V2 and is not part of the active workspace path.

## Source Of Truth

Architecture and runtime direction:

- [docs/rfcs/v2-runtime-architecture.md](docs/rfcs/v2-runtime-architecture.md)
- [docs/rfcs/cli-first.md](docs/rfcs/cli-first.md)

Canonical JSON and component behavior:

- [docs/rfcs/design-json-schema-v0.2.md](docs/rfcs/design-json-schema-v0.2.md)
- [docs/rfcs/component-preservation-policy.md](docs/rfcs/component-preservation-policy.md)

## What V2 Does

- captures the current Figma selection into canonical JSON
- emits a default schema `0.2` canonical document that is page-semantic, sparse, and registry-free
- preserves the component usage and styling signals needed for page-level code generation
- gives agents a narrow local command surface: `status`, `capture`, `export-json`, `screenshot`, `logs`, `doctor`
- keeps the runtime shape simple: plugin in Figma, CLI on the host

## Prerequisites

- Node.js 22+
- `corepack`
- Figma desktop

## Install From Source

```bash
git clone https://github.com/asdzheng/vibe-figma-ui.git
cd vibe-figma-ui
corepack pnpm install
corepack pnpm build
```

If you want packaged artifacts for the plugin and CLI:

```bash
corepack pnpm package:artifacts
```

That writes:

- `artifacts/plugin/`: importable Figma plugin bundle
- `artifacts/npm/`: packed CLI tarball
- `artifacts/package-artifacts.json`: artifact manifest

## Start The Local Companion

Run the local companion in one terminal:

```bash
corepack pnpm dev:cli
```

Or call the CLI directly from the workspace:

```bash
corepack pnpm cli -- status
```

Default companion URL:

```text
http://localhost:3845
```

Supported environment variables:

- `VIBE_FIGMA_COMPANION_URL`
- `VIBE_FIGMA_COMPANION_HOST`
- `VIBE_FIGMA_COMPANION_PORT`
- `VIBE_FIGMA_STATE_PATH`

Legacy `VIBE_FIGMA_BRIDGE_*` names are no longer accepted. Rename them to the matching `VIBE_FIGMA_COMPANION_*` variables.

## Install The Figma Plugin

Build first, then import:

```text
packages/plugin/manifest.json
```

If you packaged artifacts first, you can import:

```text
artifacts/plugin/manifest.json
```

In Figma desktop use `Plugins > Development > Import plugin from manifest...` and select the file itself.
Do not select the containing folder.

The manifest points at the bundled `dist/plugin.js` runtime entry and supports both Design Mode and Dev Mode install flows.
In Figma, the plugin appears as `Vibe Figma UI`.
The checked-in manifest currently whitelists the default local companion URL `http://localhost:3845`.
If you move the companion to a different port, update `devAllowedDomains` in the manifest before re-importing.

## CLI Workflow

Initialize and inspect the local setup:

```bash
corepack pnpm cli -- init
corepack pnpm cli -- doctor
```

Once the companion is running and the plugin is open in Figma:

```bash
corepack pnpm cli -- status
corepack pnpm cli -- sessions
corepack pnpm cli -- capture
corepack pnpm cli -- capture --profile debug
corepack pnpm cli -- export-json --output artifacts/manual/capture.json
corepack pnpm cli -- export-json --session <id> --output artifacts/manual/capture.json
corepack pnpm cli -- screenshot --output artifacts/manual/live-screenshot.svg
corepack pnpm cli -- screenshot --output artifacts/manual/live-preview.html
corepack pnpm cli -- logs --limit 100
```

`export-json` always prints the default schema `0.2` canonical JSON document to stdout. `--output` also writes the same JSON to disk.

Pass `--profile debug` when you need the older `0.1`-style audit payload instead of the default canonical export.

The default canonical output no longer includes top-level registries. It inlines readable component names, variant usage, literal visual values, and authored layout intent directly on nodes.

Simple canonical leaf values now use shorthand forms to keep larger captures smaller:

- name-only component usage becomes `"component": "Button"`
- literal colors and image refs can stay as bare strings instead of `{ "value": ... }`
- plain text nodes can stay as `"text": "Section title"` unless extra metadata such as `lines` is needed
- text nodes no longer duplicate the same fact in both `style.fill` and `style.textColor`

The current checked representative samples under `artifacts/manual/` are in the `359-392` line range, and the larger checked optimization fixture `artifacts/manual/p0-live-capture.json` is currently `1,182` lines / `37,186` pretty bytes / `11,072` minified bytes.

When multiple plugin windows are connected, use `vibe-figma sessions` and pass `--session <id>` to target a specific one.

`screenshot` now renders a stronger local reverse-render artifact from canonical JSON. The renderer uses better inferred sizing for hug/fill nodes, improved text metrics, broader Material component materialization, and captured gradient/shadow hints from debug exports where available. Use an `.svg` output path for the raw SVG or an `.html` output path for a browser preview wrapper. Without `--input`, it captures live from the connected plugin first. With `--input`, it reverse-renders an existing exported JSON file.

## Typical Local Flow

1. Run `corepack pnpm dev:cli`.
2. Import `packages/plugin/manifest.json` into Figma desktop.
3. Open a Figma file and run the `Vibe Figma UI` plugin.
4. Leave the plugin window open. It now shows connection state, page name, selection count, and the latest capture summary while it retries the companion connection automatically.
5. Use `corepack pnpm cli -- status` to confirm the live session.
6. Use `corepack pnpm cli -- capture` or `corepack pnpm cli -- export-json`.
7. Use `corepack pnpm cli -- screenshot --output artifacts/manual/live-screenshot.svg` when you need a local visual artifact for review.

## Live Figma Smoke Loop

The repository includes a live smoke script for the CLI-first path:

```bash
corepack pnpm test:e2e:figma
```

The script:

- waits for the companion to report a live plugin session
- requests a capture through the new command path
- validates the canonical JSON shape
- writes `artifacts/e2e/figma-smoke-report.json`

The script still requires a human to import and run the plugin in Figma desktop, then keep the plugin window open until the report is written.

## Reverse-Render Validation

The current live export reverse-render validation is documented in:

- [docs/reverse-render-validation-2026-03-11.md](docs/reverse-render-validation-2026-03-11.md)

The checked validation artifact is:

- `artifacts/e2e/current-export.snapshot.svg`

## Automated Vs Manual

Automated in V2:

- local companion startup with `corepack pnpm dev:cli`
- live CLI commands: `status`, `capture`, `export-json`, `logs`, `doctor`
- reverse-rendered SVG snapshots through `vibe-figma screenshot`
- assisted smoke validation with `corepack pnpm test:e2e:figma`
- canonical JSON generation and report writing

Still manual in Figma:

- importing the plugin manifest into Figma desktop
- opening a Figma file with a real selection
- running the `Vibe Figma UI` plugin and keeping its window open during the smoke loop
- visually comparing the reverse-rendered SVG against Figma when exact pixel output matters, especially for native image/vector details that are not available in the local-first capture

## Package Layout

Active V2 packages:

- `packages/schema`: canonical data contract
- `packages/capture-core`: normalization and policy engine
- `packages/plugin`: Figma runtime endpoint
- `packages/cli`: local companion server and CLI entrypoint
- `packages/fixtures`: deterministic regression fixtures

Archived legacy packages:

- `packages/ui-bridge`
- `packages/mcp-server`

They remain in the repository only as archived V1-era references, are marked private, and are excluded from the active workspace and verification path.
