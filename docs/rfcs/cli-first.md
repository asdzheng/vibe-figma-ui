# CLI-First Runtime Strategy

Status: Draft

## Summary

This RFC defines the runtime strategy for `vibe-figma-ui` V2:

- the primary integration surface is a local CLI
- OpenClaw-style skill integration should build on top of that CLI
- MCP is explicitly out of scope for the initial V2 implementation
- the Figma plugin remains the Figma-side runtime endpoint
- a lightweight local companion process may exist behind the CLI when needed

The purpose of this decision is to keep the product simple, focused, and agent-friendly.

---

## Decision

`vibe-figma-ui` V2 will be **CLI-first**.

This means:

1. users install the Figma plugin
2. users install the `vibe-figma` CLI
3. local usage, automation, and AI integration should go through the CLI
4. skill integrations should call the CLI or its local companion runtime
5. MCP will **not** be part of the initial V2 delivery

MCP may be added later as an optional adapter if a real compatibility need emerges.

---

## Why this decision exists

The project does not need a protocol-first architecture.

It needs a focused way to:

- connect AI to Figma
- extract design context
- normalize design data
- produce canonical JSON
- support a fast local debugging loop for coding agents

A CLI is the most direct fit for those needs.

---

## Problems with an MCP-first approach

### 1. Too much complexity too early

MCP introduces additional moving parts:

- server bootstrapping
- client configuration
- tool schemas
- compatibility handling across clients
- more installation and debugging steps

For a focused product like `vibe-figma-ui`, that complexity is not justified at the start.

### 2. MCP distorts the product boundary

When MCP becomes the primary runtime model, the project starts optimizing for:

- generic tool exposure
- protocol packaging
- universal compatibility

instead of optimizing for:

- canonical design extraction
- stable output contracts
- local developer and agent workflow

That is the wrong center of gravity.

### 3. Context overhead in AI environments

Large MCP tool surfaces come with context cost:

- more tool descriptions
- larger schemas
- more prompt overhead
- more ambiguity for agents

A CLI-based integration lets the project keep a narrow, intentional interface.

### 4. Installation becomes harder than necessary

A user should not have to understand a full protocol stack just to let an agent capture design context from Figma.

CLI-first is easier to explain, easier to debug, and easier to support.

---

## Why CLI-first is the right default

### 1. Simpler mental model

Users only need to understand:

- there is a Figma plugin
- there is a local CLI
- the CLI talks to the plugin

That is much easier than explaining:

- plugin
- bridge
- MCP server
- client config
- server transport
- tool exposure

### 2. Better for coding agents

Coding agents work well with command-oriented workflows.

A CLI gives them a stable, low-ceremony interface such as:

- `vibe-figma status`
- `vibe-figma capture`
- `vibe-figma export-json`
- `vibe-figma logs`
- `vibe-figma screenshot`

That is easier to reason about than a large tool catalog.

### 3. Easier debugging

CLI output is straightforward to inspect, log, retry, and script.

When something breaks, the user or agent can run:

- `vibe-figma doctor`
- `vibe-figma status`
- `vibe-figma logs`

without involving an MCP client or protocol debugger.

### 4. Easier long-term evolution

CLI-first keeps the core runtime independent.

That means the project can later add:

- an OpenClaw skill
- a thin MCP adapter
- IDE integrations
- shell scripts

without changing the product core.

---

## Runtime model

The V2 runtime is intentionally simple.

```text
AI / User / Skill
        ↓
   vibe-figma CLI
        ↓
 local companion layer
        ↓
   Figma plugin UI
        ↓
 Figma plugin worker
        ↓
      Figma API
```

### Roles

#### CLI

The CLI is the main control surface.

It is responsible for:

- user-facing commands
- script-friendly automation
- agent-friendly entrypoints
- delegating to the local runtime bridge

#### Local companion layer

This layer may be embedded in the CLI or run as a small background service.

It is responsible for:

- plugin discovery
- request routing
- connection management
- status and diagnostics
- optional persistent dev session behavior

#### Plugin UI

This is the bridge client inside Figma.

It is responsible for:

- maintaining the host-side connection
- forwarding commands to the worker
- emitting status and development events

#### Plugin worker

This is the Figma API execution environment.

It is responsible for:

- reading current page / selection / file context
- extracting variables, styles, components, metadata
- running capture logic
- returning runtime results

---

## Scope of the initial CLI

The first CLI version should stay small.

Suggested commands:

### `vibe-figma init`

Purpose:

- verify plugin availability expectations
- verify local runtime setup
- prepare default configuration if needed

### `vibe-figma status`

Purpose:

- report whether the plugin is connected
- show current file/page/selection context when available
- show whether dev bridge mode is active

### `vibe-figma capture`

Purpose:

- perform a live capture from the current selection or current page
- return normalized internal output

### `vibe-figma export-json`

Purpose:

- produce validated canonical JSON output
- this is the main codegen-facing command

### `vibe-figma logs`

Purpose:

- show recent plugin/runtime logs
- support debugging and agent feedback loops

### `vibe-figma screenshot`

Purpose:

- support visual verification in development workflows
- exact implementation may vary by what the plugin/runtime can support

### `vibe-figma doctor`

Purpose:

- diagnose common environment problems
- plugin not running
- version mismatch
- no active connection
- invalid config

---

## Product boundary

CLI-first also clarifies what the product is.

`vibe-figma-ui` is:

- a design-context extraction product
- a canonical JSON producer for AI code generation
- a local development toolchain for Figma-aware agent workflows

It is not:

- a universal Figma automation platform
- an MCP-first platform product
- a generic remote integration layer

---

## Relationship to skills

In environments like OpenClaw, the preferred higher-level integration should be a skill on top of the CLI.

That means:

- the CLI remains the source of truth
- the skill offers a narrower, more ergonomic action surface
- the skill does not need to reinvent connection logic

This keeps the architecture clean:

- product core = CLI + plugin + core packages
- AI convenience layer = skill

---

## Why MCP is deferred

MCP is not rejected forever.

It is deferred because it is not currently the shortest path to product value.

MCP should only be added when there is a concrete need such as:

- a target client requires MCP and cannot use CLI/skill integration
- there is strong evidence that a thin adapter materially expands adoption
- the CLI/runtime contract has stabilized enough that wrapping it is low risk

Until then, MCP would mostly introduce cost without enough return.

---

## Compatibility strategy

Deferring MCP now does not block MCP later.

In fact, CLI-first makes a later MCP adapter easier.

Future direction if needed:

```text
MCP Client
    ↓
Thin MCP Adapter
    ↓
vibe-figma CLI / local companion
    ↓
Plugin runtime
```

That way:

- MCP remains optional
- the CLI remains the core API surface
- protocol churn does not leak into the core product design

---

## Benefits of CLI-first

### Product benefits

- simpler installation story
- clearer product boundary
- less architecture bloat
- easier documentation

### Engineering benefits

- easier local debugging
- easier scripting and automation
- less protocol overhead
- cleaner package design

### Agent workflow benefits

- better closed-loop development
- simpler control surface
- lower context overhead
- easier deterministic command execution

---

## Tradeoffs

CLI-first is not free.

Tradeoffs include:

- some external clients prefer MCP out of the box
- the project must define and maintain a strong CLI UX
- a later MCP adapter may still be needed for some ecosystems

These are acceptable tradeoffs because they preserve simplicity and control in the initial system design.

---

## Recommended package direction

### Keep

- `packages/schema`
- `packages/capture-core`
- `packages/fixtures`

### Refactor

- `packages/plugin` into a stronger Figma-side runtime

### Add

- `packages/cli`

### De-emphasize or remove

- heavy local bridge responsibilities
- MCP-first runtime assumptions

---

## Example user flow

### Basic usage

```text
1. User installs the Figma plugin
2. User installs the vibe-figma CLI
3. User runs vibe-figma init
4. User runs the plugin in Figma
5. User or agent runs vibe-figma status
6. User or agent runs vibe-figma export-json
```

### Agent debugging loop

```text
1. Agent modifies runtime or capture code
2. Agent runs vibe-figma status
3. Agent runs vibe-figma capture
4. If something looks wrong, agent runs vibe-figma logs
5. If visual verification is needed, agent runs vibe-figma screenshot
6. Agent iterates
```

---

## Final Position

The initial V2 implementation should be CLI-first.

This gives the project:

- the simplest useful runtime shape
- the best agent workflow
- the least product distortion
- the strongest control over future evolution

MCP can be added later if needed.

It should not be used as the foundation of the system now.
