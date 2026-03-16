# Design JSON Schema v0.2

Status: Proposed

Supersedes the default canonical direction in:

- `docs/rfcs/design-json-schema-v0.1.md`
- `docs/rfcs/design-json-v3-optimization.md`

## Purpose

Define a new default canonical JSON format that is optimized for code generation from the currently selected page or frame, not for design-system inspection.

This version intentionally treats payload size as a product requirement.

## Core Decision

The default capture must stop behaving like a light Figma debug dump.

The default canonical export should instead be:

- page-first
- semantic-first
- sparse
- human-readable
- easy for an LLM to map to local code components

Detailed design-system catalogs, raw style references, and authoring metadata move out of the default path.

## Product Assumption

For the current product stage, the goal is:

- identify the page structure
- preserve the components used on the page
- preserve the semantic styling needed to render the page
- give downstream codegen enough information to map page elements to local code components

The goal is not:

- exporting full design-system component definitions
- exporting every variant of every referenced component
- preserving the full Figma authoring graph in the page capture

That should become a separate future feature, for example `component-export`, instead of bloating page capture.

## Problems In v0.1

The current schema is still structurally biased toward normalization and reverse lookup:

- too many opaque refs
- large `registries` payloads
- dual semantic plus fallback payloads on the same style values
- repeated default values
- repeated resolved sizes that are not author intent
- excessive explicit geometry on flow-layout nodes

Those are not implementation accidents anymore.
They are schema problems.

## v0.2 Principles

### 1. Default canonical is for page rendering intent only

Default output should answer:

- what is on this page
- how is it structured
- which components are used
- what semantic styling matters
- what layout intent matters

If a field does not materially improve code generation for the current page, it should not be in canonical output.

### 2. No top-level registries in canonical

`registries` are removed from default canonical output.

Rationale:

- they dominate payload size
- they push consumers toward lookup-heavy decoding
- the current product does not need full component, style, or variable catalogs to render a selected page

Registry-backed output may still exist in `debug` or future `component-export` flows.

### 3. Replace opaque refs with readable inline semantics

Canonical should prefer readable labels over hashed refs.

Examples:

- keep `component.name: "Carousel"` instead of `componentRef: "component:4ef73..."`
- keep `color.token: "M3/sys/light/on-surface"` instead of `tokenRef: "variable:d708..."`
- keep `textStyle: "M3/headline/medium-emphasized"` instead of `styleRef: "style:786d..."`

Opaque ids belong in `debug`, not in canonical.

### 4. Keep one fact once

Canonical must not encode the same fact in multiple places.

Examples:

- do not keep both `token` and `fallback` for the same color in canonical
- do not keep both component usage on the node and a large component registry elsewhere
- do not keep both resolved width and layout intent when layout intent is enough

### 5. Prefer authored intent over resolved output

Current capture over-emits final geometry.

That is wrong for code generation because:

- auto-layout children inherit size from context
- repeated instances often carry the same resolved width and height
- the code should be driven by layout rules, not by screenshot-like box measurements

Canonical should preserve:

- layout direction
- fill, hug, or fixed sizing intent
- non-zero gap
- non-zero padding
- explicit fixed dimensions when they are authored and meaningful

Canonical should avoid:

- resolved width and height for flow-layout children unless needed
- `x` and `y` for non-absolute nodes
- box metrics that can be derived from parent layout and component semantics

### 6. Defaults disappear

Omit defaults aggressively.

Examples to omit:

- `radius: 0`
- `overflow: hidden` when it is only editor noise and not a visible behavior
- zero padding edges
- zero gap
- `opacity: 1`
- `visible: true`
- `layout.position: "flow"`
- `layout.mode: "none"`

### 7. Page capture and component capture are different products

Page capture should only preserve component usage, not full component definitions.

Future full-component support should be a dedicated feature that exports:

- the selected component definition
- all variants
- slots and nested structure
- semantic styling within the component itself

That future need must not dictate the default page-capture schema.

## Canonical Top-Level Shape

```json
{
  "schemaVersion": "0.2",
  "profile": "canonical",
  "capture": {
    "scope": "selection",
    "page": "Page 2",
    "roots": ["1:9053"],
    "modes": {
      "sys": "light"
    }
  },
  "roots": []
}
```

## Top-Level Rules

### `schemaVersion`

Must be `"0.2"` for this contract.

### `profile`

Default canonical output is always `"canonical"`.

Future profiles:

- `debug`
- `component-export`

### `capture`

Keep only interpretation-critical metadata:

- `scope`
- `page`
- `roots`
- `modes` when active modes materially change token meaning

Move out of canonical:

- timestamp
- plugin version
- verbose selection node objects
- transport metadata
- diagnostics when empty

### `roots`

Root semantic nodes for the selected page or selection.

## Core Node Shape

```ts
type DesignNode = {
  id?: string
  kind: NodeKind
  name?: string
  component?: ComponentUse
  layout?: LayoutIntent
  size?: SizeIntent
  style?: StyleIntent
  text?: TextIntent
  image?: ImageIntent
  children?: DesignNode[]
}
```

## Node Field Rules

### `id`

Optional in canonical.

Keep `id` only when at least one is true:

- the node is a selected root
- another field needs to reference it
- later tooling needs a stable follow-up handle for that specific node

Do not emit ids on every child by default.

### `kind`

Keep a small semantic set:

- `frame`
- `instance`
- `text`
- `image`
- `shape`
- `icon`
- `group`
- `section`
- `vector`
- `unknown`

Do not keep raw `figmaType` in canonical unless `kind: "unknown"`.

### `name`

Keep only when it adds semantic value.

Rules:

- keep on roots
- keep on user-authored frames that communicate page meaning
- keep on text nodes only if needed for slot meaning
- omit on preserved instances when `component.name` already explains the node
- omit purely editor-noise labels

## Component Usage Model

```ts
type ComponentUse =
  | string
  | {
      name: string
      variant?: Record<string, string | boolean>
      props?: Record<string, string | boolean>
      library?: string
      status?: "mapped" | "unmapped"
    }
```

Rules:

- inline component usage directly on the node
- allow the bare string form when only the component name is needed
- do not reference a top-level component registry from canonical
- preserve only the variant and prop values actually used by the page
- do not include full component authoring catalogs

Example:

```json
{
  "kind": "instance",
  "component": "Carousel"
}
```

Expanded form when variants or props are needed:

```json
{
  "kind": "instance",
  "component": {
    "name": "Carousel",
    "variant": {
      "Context": "Mobile",
      "Layout": "Hero"
    }
  }
}
```

## Style Model

```ts
type StyleIntent = {
  textStyle?: string
  textColor?: TokenOrValue
  fill?: TokenOrValue | TokenOrValue[]
  stroke?: {
    color: TokenOrValue
    width?: number
  }
  radius?: number | [number, number] | [number, number, number, number]
  shadow?: ShadowIntent[]
  opacity?: number
}

type TokenOrValue =
  | string
  | { token: string }
  | { image: string }
```

Rules:

- choose one source of truth in canonical: token or final literal value
- allow bare string literals for the common final-value case
- never emit both `token` and `fallback` for the same visual fact
- keep `textStyle` as a readable style name, not a style ref id
- do not emit both `fill` and `textColor` on text nodes for the same color
- omit `radius` when it is zero
- omit `opacity` when it is one

Current verbose form:

```json
{
  "fill": [
    {
      "fallback": "#1d1b20ff",
      "kind": "solid",
      "styleRef": "style:a7788e6e250068d8b385890b7ff827644c40a131",
      "tokenRef": "variable:d708be20513001c4083ed24c1e58c2fdaca456b3"
    }
  ]
}
```

v0.2 canonical form:

```json
{
  "style": {
    "textColor": {
      "token": "M3/sys/light/on-surface"
    }
  }
}
```

Fallback when no semantic token exists:

```json
{
  "style": {
    "textColor": "#1d1b20ff"
  }
}
```

## Layout Model

```ts
type LayoutIntent = {
  flow?: "row" | "column"
  align?: "start" | "center" | "end" | "between"
  gap?: number
  pad?: number | [number, number] | [number, number, number, number]
  sizing?: {
    width?: "fixed" | "fill" | "hug"
    height?: "fixed" | "fill" | "hug"
  }
  absolute?: {
    x: number
    y: number
  }
  scroll?: "x" | "y" | "both"
}
```

Rules:

- do not emit `flow` when there is no layout behavior to preserve
- do not emit zero `gap`
- do not emit zero padding edges
- do not emit `overflow` unless it changes visible or scroll behavior
- use `absolute` only for actually absolute-positioned nodes

Current noisy form:

```json
{
  "layout": {
    "mode": "column",
    "overflow": {
      "x": "hidden",
      "y": "hidden"
    },
    "sizing": {
      "vertical": "hug"
    }
  }
}
```

v0.2 canonical form:

```json
{
  "layout": {
    "flow": "column",
    "sizing": {
      "height": "hug"
    }
  }
}
```

## Size Model

```ts
type SizeIntent = {
  width?: number
  height?: number
}
```

Rules:

- keep explicit fixed width or height on roots
- keep explicit fixed width or height on absolute nodes
- keep explicit width on wrapped text when it affects line breaks
- keep explicit image size when it materially affects rendering
- omit resolved width and height for flow-layout children when layout semantics already explain sizing
- omit repeated instance dimensions unless they represent a real resize override

This is a deliberate shift away from box-dump capture.

## Text Model

```ts
type TextIntent =
  | string
  | {
      value: string
      role?: string
      lines?: number
    }
```

Rules:

- default text is a single plain string
- use the object form only when extra metadata such as `lines` is needed
- rich text runs belong in `debug` unless mixed styling is essential to render correctly
- do not emit large text-segment arrays for simple nodes

## Explicit Non-Goals For v0.2 Canonical

Do not include in default canonical output:

- component registries
- component-set registries
- variable registries
- style registries
- asset registries
- icon registries
- raw Figma node types except for unsupported cases
- dual plugin and REST ids
- token plus fallback duplication
- exhaustive bounds on flow-layout nodes

## Debug And Future Export Modes

### `debug`

May include:

- plugin ids on all nodes
- raw Figma types
- timestamps and plugin version
- registry-backed refs
- detailed diagnostics
- rich text runs
- fallback style values next to semantic refs

### `component-export`

Future dedicated flow for full component implementation.

May include:

- selected component definition
- variant matrix
- slots
- nested semantic tree
- component-scoped styling and layout

This feature should be implemented separately from page capture.

## Success Criteria

For the current representative page capture, default canonical should target:

- pretty JSON <= 800 lines
- pretty JSON <= 30 KB
- minified JSON <= 18 KB

Stop/go rule:

- if the schema still needs registries, fallback blobs, or repeated resolved geometry to describe a simple page, the schema is still wrong

## Migration Plan

1. Add schema v0.2 beside v0.1 instead of mutating v0.1 in place.
2. Make `export-json` default to v0.2 canonical once capture-core can emit it.
3. Keep current v0.1-like output only as `debug` during migration.
4. Rewrite capture-core so default node emission is semantic-first and registry-free.
5. Add hard size-budget tests using the current live `Examples/Upcoming-Mobile` capture.
