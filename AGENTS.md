# AGENTS.md

## Scope

This file defines how agents should build this repository.

Product behavior, capture schema, and component-policy details live in the RFCs and should not be duplicated here.

Source-of-truth RFCs:

- [docs/rfcs/design-json-schema-v0.1.md](docs/rfcs/design-json-schema-v0.1.md)
- [docs/rfcs/component-preservation-policy.md](docs/rfcs/component-preservation-policy.md)

If implementation and RFC conflict, follow the RFC and update code accordingly unless the user explicitly changes the design.

## Project Goal

Build an open-source Figma plugin plus local bridge plus MCP server that captures the current Figma design context and exposes a canonical JSON representation for downstream AI code generation.

## Default Stack

Use these defaults unless the repo already establishes a different standard:

- Package manager: `pnpm`
- Runtime: Node.js 22 LTS
- Language: TypeScript with strict mode
- Validation: `zod`
- Testing: `vitest`
- MCP: `@modelcontextprotocol/sdk`

Preferred workspace layout:

- `packages/schema`
- `packages/capture-core`
- `packages/plugin`
- `packages/ui-bridge`
- `packages/mcp-server`
- `packages/fixtures`

## Architecture Rules

### Build by modules

Develop features as small, composable modules.

Rules:

- Each feature should be split into the smallest reasonable module boundary.
- Modules should communicate through explicit APIs, not hidden shared state.
- Shared logic belongs in reusable packages, not copied across plugin, bridge, and MCP layers.
- Avoid tightly coupled feature code. If a feature can be split, split it.
- Keep pure normalization logic outside runtime-specific layers whenever possible.

### Separation of responsibilities

- `schema`: shared types, refs, `zod` schemas
- `capture-core`: canonical normalization logic
- `plugin`: Figma runtime integration
- `ui-bridge`: local transport from plugin UI iframe
- `mcp-server`: tools for external AI clients

Do not make one layer re-implement another layer's job.

## Implementation Rules

- Follow the RFCs for capture shape and component handling.
- Keep the open-source path working without private-only Figma APIs.
- Prefer deterministic output over clever abstractions.
- Do not silently flatten or discard design-system semantics.
- Do not put large binary payloads into canonical JSON.

## Testing Rules

A feature is not complete until the relevant tests pass.

Minimum expectation for each feature:

- add or update tests with the feature
- run the relevant test suite
- run typechecking
- fix failing checks before calling the feature done

Expected root scripts once the workspace is scaffolded:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

Testing guidance:

- prefer deterministic fixtures over live Figma calls
- keep golden JSON fixtures under version control
- update snapshots intentionally, never blindly
- if something cannot be automated, document the manual verification steps

## Delivery Workflow

After each completed feature:

1. Ensure implementation is finished.
2. Ensure relevant tests pass.
3. Commit the feature cleanly.
4. Push the branch or commit to GitHub.
5. Publish a new GitHub release with the `gh` CLI.

Release versioning rules:

- use semantic versioning
- use `major` for breaking changes
- use `minor` for meaningful new features
- use `patch` for small fixes, refactors, or non-breaking internal improvements

Release rules:

- tag format should be `vX.Y.Z`
- release notes should summarize the feature or fix clearly
- do not publish a release for incomplete or failing work

If push or release is blocked by missing auth, remote setup, or CI state, report the blocker clearly instead of pretending the step is complete.

## Documentation Rules

- If implementation changes public behavior, update the RFC or README in the same feature.
- Do not create a second competing spec for the same behavior.
- Keep AGENTS focused on process and engineering rules; keep product design in RFCs.

## What Not To Do

- Do not build large monolithic features when smaller modules are possible.
- Do not mark work complete before tests pass.
- Do not skip push or release steps for completed features unless blocked.
- Do not duplicate schema rules here when they already exist in the RFCs.

