# V2 Runtime Architecture

Status: Draft

## Summary

This RFC proposes a V2 runtime architecture for `vibe-figma-ui`.

The goal is to simplify the current system, improve AI-agent debugging loops,
and keep full product control inside this repository.

The key shift is:

- move away from a bridge-heavy, MCP-first runtime
- keep the core value in `schema + capture-core + canonical JSON`
- introduce a lightweight local CLI companion as the primary host-side entrypoint
- treat MCP as an optional compatibility adapter rather than the system core

In short:

> Plugin connects to Figma. CLI/skill connects to AI. Core packages produce value.

---

## Problem Statement

The current architecture is directionally correct, but it has several practical problems.

### 1. Too much runtime plumbing for the amount of product value

The current structure introduces multiple layers:

- Figma plugin
- local bridge
- MCP server
- AI client

This makes the system harder to reason about than necessary.

A large amount of code and setup is spent on:

- transport
- persistence
- local bridge wiring
- MCP exposure

instead of the actual product value:

- extracting Figma context
- normalizing it
- preserving design-system semantics
- producing canonical JSON for AI code generation

### 2. Codex and similar agents cannot fully close the loop

Today, the development loop is still too human-assisted.

Typical pain points:

- agent changes code
- human manually runs the plugin
- human checks console or output
- human reports the result back
- agent changes code again

This breaks the main promise of agentic iteration.

What the agent actually needs is:

- runtime status
- logs
- capture output
- screenshot or other visual proof
- a stable local command surface

### 3. MCP is doing too much architectural work

MCP is useful as a compatibility protocol, but it should not define the entire product shape.

In the current direction, MCP tends to become:

- the main runtime surface
- the main installation story
- the main abstraction boundary

This creates several problems:

- more setup complexity for users
- more context overhead in AI clients
- pressure to design a generic tool surface instead of a focused product surface
- harder long-term maintainability

### 4. The plugin is not the right place to be the host-side server

A Figma plugin is the correct place to access the Figma API.
It is not the ideal place to act as the main local AI-facing server.

Reason:

- plugin worker is not a normal Node.js server runtime
- plugin UI is browser-like, not a durable localhost service host
- plugin lifecycle is controlled by Figma
- host-side routing, discovery, and multi-instance control fit better in a local companion process

So the plugin should be treated as a Figma-side runtime endpoint, not as the entire host-side product runtime.

---

## Goals

- Reduce architectural layers and user-facing setup complexity.
- Keep the project focused on canonical design-context extraction.
- Improve the local debugging and verification loop for coding agents.
- Preserve full control over runtime behavior and repository direction.
- Support a simple primary path for OpenClaw-style skill/CLI usage.
- Keep MCP support possible, but optional and thin.

---

## Non-goals

- Rebuild all of `figma-console-mcp`.
- Become a general-purpose Figma automation platform.
- Expose a large universal Figma tool catalog.
- Make MCP the primary architecture driver.
- Preserve the existing local bridge/history design at all costs.

---

## Design Principles

### 1. Core value first

The enduring value of this project is:

- `schema`
- `capture-core`
- normalization
- policy evaluation
- canonical JSON output

Everything else should support those assets, not overshadow them.

### 2. Plugin as runtime endpoint, not primary host server

The plugin should:

- access Figma APIs
- extract runtime data
- execute capture-related logic
- stream events and diagnostics in dev mode

The plugin should not be the main host-side service abstraction.

### 3. CLI-first, skill-first, MCP-optional

The primary user and agent entrypoint should be a local CLI companion.

That CLI can then be used by:

- local humans
- scripts
- OpenClaw skills
- a thin MCP adapter when needed

### 4. Separate development runtime from production capture

V2 should explicitly support two modes:

- **Capture Mode**: one-shot extraction and canonical export
- **Dev Bridge Mode**: persistent connection, logs, status, diagnostics, screenshots, agent loop support

### 5. Real-time RPC for development, stable snapshots for output

Debugging needs real-time transport.
Code generation needs stable, versioned output.

These are related, but they should not be modeled as the same concern.

---

## Reference Implementations

This proposal is informed by two sources.

### A. This repository's existing core packages

The following remain the core product assets:

- `packages/schema`
- `packages/capture-core`
- current normalization/adaptation logic
- current RFCs around schema and component preservation

### B. `southleft/figma-console-mcp`

This RFC does **not** propose taking a runtime dependency on that project.

It is used purely as a reference implementation for several proven patterns:

- plugin UI / worker separation
- UI-to-worker `postMessage` routing
- WebSocket bridge between host-side runtime and plugin UI
- request/response envelopes like:
  - `{ id, method, params }`
  - `{ id, result }`
  - `{ id, error }`
- multi-port scanning and reconnect behavior
- persistent development bridge model
- runtime observability: logs, status, screenshots, active diagnostics

What we should borrow is the **runtime communication pattern**, not the full product direction.

---

## Proposed Architecture

## High-level model

V2 introduces a three-part runtime model:

1. **Plugin runtime** inside Figma
2. **Local CLI companion** on the host machine
3. **Skill-first / optional MCP adapter** for AI integration

### High-level diagram

```text
┌──────────────────────────────┐
│ AI Client / OpenClaw / Codex │
└──────────────┬───────────────┘
               │
               │ primary entry
               ▼
┌──────────────────────────────┐
│      vibe-figma CLI / Skill  │
│  - capture                   │
│  - export-json               │
│  - status                    │
│  - logs                      │
│  - screenshot                │
└──────────────┬───────────────┘
               │
               │ local RPC / command calls
               ▼
┌──────────────────────────────┐
│   Local Companion Service    │
│  - session routing           │
│  - plugin discovery          │
│  - reconnect                 │
│  - multi-instance support    │
│  - dev diagnostics           │
└──────────────┬───────────────┘
               │ WebSocket
               ▼
┌──────────────────────────────┐
│       Figma Plugin UI        │
│  - bridge client             │
│  - event forwarding          │
│  - debug/status channel      │
└──────────────┬───────────────┘
               │ postMessage
               ▼
┌──────────────────────────────┐
│     Figma Plugin Worker      │
│  - Figma API access          │
│  - extraction                │
│  - capture runtime           │
│  - component/variable reads  │
│  - runtime diagnostics       │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│          Figma API           │
└──────────────────────────────┘
```

---

## Core package topology

```text
          ┌────────────────────┐
          │   schema package   │
          │ canonical contract │
          └─────────┬──────────┘
                    │
                    ▼
          ┌────────────────────┐
          │  capture-core      │
          │ normalize/policy   │
          └─────────┬──────────┘
                    │
                    ▼
          ┌────────────────────┐
          │ plugin runtime     │
          │ extract figma data │
          └─────────┬──────────┘
                    │
                    ▼
          ┌────────────────────┐
          │ CLI / skill output │
          │ json/status/debug  │
          └────────────────────┘
```

---

## Runtime Responsibilities

### 1. Plugin runtime

The plugin becomes a focused Figma-side runtime endpoint.

Responsibilities:

- access Figma APIs
- read selection/page/document state
- read components, styles, variables, and metadata
- run capture extraction
- emit runtime diagnostics in dev mode
- support persistent bridge mode when needed

The plugin supports two modes.

#### A. Capture Mode

Used for one-shot export flows.

Responsibilities:

- gather current runtime input
- produce normalized data
- return or stream canonical output

#### B. Dev Bridge Mode

Used for persistent debugging and iteration.

Responsibilities:

- remain connected
- answer status requests
- stream logs/events
- expose current context for agents
- support screenshot / visual verification hooks where feasible

---

### 2. Local companion service

This is the main host-side runtime addition in V2.

It is intentionally small.

Responsibilities:

- accept local commands or RPC calls
- discover active plugin sessions
- manage request routing
- handle reconnects and multi-instance conditions
- provide a stable command surface for CLI and skills
- optionally expose a thin MCP adapter layer

This service is where host-side lifecycle concerns belong.

It is a better fit than putting all of that logic into the plugin itself.

---

### 3. CLI

The CLI is the primary control surface.

Suggested commands:

- `vibe-figma init`
- `vibe-figma status`
- `vibe-figma capture`
- `vibe-figma export-json`
- `vibe-figma logs`
- `vibe-figma screenshot`
- `vibe-figma doctor`

The exact command names can change, but the design goal is stable:

- simple for humans
- scriptable for automation
- minimal cognitive overhead for agents

---

### 4. Skill integration

For environments like OpenClaw, the preferred integration path should be a skill layered on top of the CLI.

That keeps the AI-facing interface narrow and context-efficient.

Instead of exposing many generic tools, the skill can expose a few focused actions such as:

- get current status
- export current canonical JSON
- fetch recent logs
- run a dev verification pass

---

### 5. Optional MCP adapter

MCP remains useful as a compatibility adapter for clients that require it.

However, in V2 it should be:

- optional
- thin
- implemented on top of the CLI or local companion service

That means MCP no longer owns:

- the main runtime model
- the main installation story
- the internal architectural boundaries

It becomes just another adapter.

---

## Package Plan

### Keep

#### `packages/schema`

Keep as the canonical data contract package.

#### `packages/capture-core`

Keep as the normalization and policy engine package.

#### `packages/fixtures`

Keep for deterministic tests and golden snapshots.

---

### Refactor

#### `packages/plugin`

Refactor into a true Figma runtime package with two operating modes:

- capture mode
- dev bridge mode

Suggested internal responsibilities:

- runtime extraction
- worker/UI transport contract
- command handling
- dev diagnostics channel

#### `packages/mcp-server`

Downgrade from core architecture component to optional adapter.

It should only wrap a very small number of focused capabilities.

---

### Add

#### `packages/cli`

Add as the primary host-side entrypoint.

This package should own:

- companion process boot logic
- local command handling
- plugin routing
- status/log/screenshot/capture commands

---

### Remove or shrink aggressively

#### `packages/ui-bridge`

The current bridge layer should either be removed or reduced to a much smaller transport abstraction.

V1's bridge design is too heavy relative to the product's actual needs.

The new model should avoid a store-heavy, bridge-heavy architecture unless a later requirement clearly justifies it.

---

## Key Interaction Flows

## 1. Installation flow

### V1 user burden

A user has to understand too many moving parts:

- plugin
- bridge
- MCP server
- bridge URL
- local server startup
- tool integration

### V2 installation flow

A simpler target flow is:

1. install the Figma plugin
2. install `vibe-figma` CLI
3. run `vibe-figma init`
4. use either:
   - native CLI / skill path
   - optional MCP adapter path

This is simpler both mentally and operationally.

---

## 2. Capture flow

```text
AI / Skill
   ↓
vibe-figma capture
   ↓
Local Companion
   ↓
Plugin UI (WebSocket)
   ↓
Plugin Worker
   ↓
Figma API
   ↓
raw figma runtime data
   ↓
capture-core normalize
   ↓
schema validate
   ↓
canonical design JSON
   ↓
return to AI / Skill / CLI
```

---

## 3. Agent debugging loop

```text
Agent changes code
   ↓
vibe-figma status
   ↓
confirm plugin connection
   ↓
vibe-figma capture / export-json
   ↓
if failure: vibe-figma logs
   ↓
if visual check needed: vibe-figma screenshot
   ↓
agent revises code based on logs/output
   ↓
repeat
```

This is the main V2 productivity win.

The system becomes much more suitable for autonomous or semi-autonomous coding agents.

---

## Why this is better

### 1. The system becomes thinner

V2 reduces emphasis on:

- bridge persistence
- runtime plumbing layers
- heavy MCP ownership

and puts the emphasis back on:

- extraction
- normalization
- policy
- canonical output

### 2. Product control stays local

By borrowing patterns rather than depending on an external runtime project, V2 keeps control over:

- transport decisions
- output shape
- debug surface
- installation experience
- repository direction

### 3. The agent loop becomes realistic

A CLI-first, dev-bridge-aware design is much better for Codex-style iteration than a pure capture-and-upload model.

### 4. MCP stops distorting the architecture

MCP remains supported where useful, but it no longer drives the shape of the whole product.

That is important for keeping the project focused and maintainable.

---

## Tradeoffs

V2 introduces a local companion layer, which means the system still has host-side runtime code.

That is a deliberate tradeoff.

It is better to have:

- a small, explicit, host-side companion

than to force either:

- the plugin to do server-like work it is poorly suited for, or
- MCP to carry too much architectural responsibility

---

## Migration Direction

This RFC does not define implementation details, but the migration direction should be:

### Phase 1

- preserve `schema`, `capture-core`, and fixtures
- define the CLI companion package boundary
- redefine plugin runtime responsibilities

### Phase 2

- implement dev bridge transport
- add status/log/capture flows
- verify the local debugging loop

### Phase 3

- move canonical export onto the new path
- ensure stable contract output and regression coverage

### Phase 4

- reduce or remove the old bridge-heavy flow
- keep MCP only as a thin optional adapter

---

## Final Position

V2 is not about changing technology for the sake of novelty.

It is about restoring architectural clarity.

The new boundary is:

- **plugin** connects to Figma
- **CLI/skill** connects to AI
- **core packages** define and produce the value
- **MCP** is optional compatibility, not the foundation

That makes the system:

- simpler
- more controllable
- more agent-friendly
- better aligned with the real product goal

---

## Appendix: V1 vs V2

### V1

```text
Figma Plugin
   ↓
Local HTTP Bridge + Store
   ↓
MCP Server
   ↓
AI Client
```

### V2

```text
Figma Plugin Runtime
   ↓
Local CLI Companion
   ↓
Skill / CLI / Optional MCP Adapter
   ↓
AI Client
```

### Architectural effect

- V1 emphasizes transport layers
- V2 emphasizes product value layers

That is the core reason for this proposal.
