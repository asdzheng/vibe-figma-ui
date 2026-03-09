# Design JSON Schema v0.1

Status: Draft

## Purpose

Define the canonical JSON format produced by the Figma plugin when capturing the current selection or page for downstream AI consumers.

This schema is optimized for:

- LLM readability
- deterministic code generation
- preservation of design-system semantics
- transport over MCP or local bridge protocols

It is not a raw Figma dump.

## Goals

- Preserve the visual and layout information needed for code generation.
- Preserve the tree structure of the design so an AI can understand hierarchy.
- Preserve component, style, variable, and icon references instead of flattening them into raw values whenever possible.
- Minimize redundant or low-signal fields.
- Be stable enough to version and validate with `zod`.

## Non-goals

- Lossless serialization of the full Figma document.
- Storage of vector path geometry in the main tree.
- Representation of every Figma-only editing feature.
- Exact 1:1 mirroring of the REST API or Plugin API.

## Design Principles

### 1. Tree first, registry backed

The main body of the document must remain a tree because that is the easiest shape for an LLM to read.

Reusable resources must live in registries:

- components
- componentSets
- styles
- variables
- icons
- assets

Nodes reference these registries instead of embedding duplicate definitions.

### 2. Preserve design-system boundaries

If a node is an `INSTANCE`, the default behavior is to preserve it as an instance boundary rather than expand it into layout primitives.

### 3. Keep dual node identifiers

Each node should preserve both:

- `pluginNodeId`
- `restNodeId`

Reason:

- `JSON_REST_V1` is useful for fast structural export.
- Plugin API identifiers are still the safest source of truth for follow-up plugin operations.

### 4. Omit defaults

Default or low-value properties should be omitted:

- `visible: true`
- `opacity: 1`
- empty arrays
- empty objects
- default alignment values unless needed for clarity

### 5. Prefer semantic refs with fallback values

Whenever a style or token is preserved, the node should include:

- a semantic ref
- a fallback raw value

This makes the payload usable both with and without the corresponding design-system library.

## Top-level Shape

```json
{
  "schemaVersion": "0.1",
  "capture": {
    "timestamp": "2026-03-09T08:00:00.000Z",
    "pluginVersion": "0.1.0",
    "editorType": "figma",
    "page": {
      "id": "1:2",
      "name": "Checkout"
    },
    "selection": [
      {
        "pluginNodeId": "12:34",
        "name": "Checkout Screen",
        "type": "FRAME"
      }
    ],
    "options": {
      "captureScope": "selection",
      "expandInstances": false
    }
  },
  "roots": [],
  "registries": {
    "components": {},
    "componentSets": {},
    "styles": {},
    "variables": {},
    "icons": {},
    "assets": {}
  },
  "diagnostics": {
    "warnings": []
  }
}
```

## Top-level Fields

### `schemaVersion`

String version for schema evolution. Breaking changes require a new minor or major schema version.

### `capture`

Metadata about the capture session.

Recommended fields:

- `timestamp`
- `pluginVersion`
- `editorType`
- `page`
- `selection`
- `options`

Optional fields:

- `sourceFileKey` if available
- `mode` if the plugin is running in Dev Mode or another special context

### `roots`

Array of root `DesignNode` objects.

For `captureScope = selection`, roots are the selected nodes.

For `captureScope = page`, roots are the page children or a synthetic page root.

### `registries`

Holds reusable definitions that should not be duplicated on every node.

### `diagnostics`

Non-fatal warnings and quality signals, for example:

- unresolved remote component
- missing style metadata
- variable alias could not be resolved
- instance was inlined by rule

## Core Node Model

```ts
type DesignNode = {
  pluginNodeId: string
  restNodeId?: string
  figmaType: string
  kind: NodeKind
  name: string
  path?: string[]
  visible?: boolean
  locked?: boolean
  bounds?: Bounds
  layout?: LayoutInfo
  appearance?: AppearanceInfo
  content?: ContentInfo
  designSystem?: DesignSystemBinding
  origin?: OriginInfo
  children?: DesignNode[]
}
```

Supporting value types:

```ts
type ComponentPropertyValue = {
  type: "BOOLEAN" | "TEXT" | "INSTANCE_SWAP" | "VARIANT"
  value: string | boolean
  variableRef?: string
}

type OverrideValue = {
  type: "text" | "boolean" | "instance-swap" | "visibility"
  value: string | boolean
  sourceNodeId?: string
  sourceProperty?: string
}
```

## `kind`

`kind` is the normalized semantic category. `figmaType` remains the original Figma node type.

Initial `kind` values:

- `page`
- `frame`
- `group`
- `section`
- `instance`
- `component`
- `text`
- `shape`
- `image`
- `icon`
- `vector`
- `boolean-operation`
- `unknown`

`kind` exists so AI tools do not need to memorize every Figma-specific node type.

## Bounds

```ts
type Bounds = {
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
}
```

Rules:

- `width` and `height` should be preserved whenever relevant for code generation.
- `x` and `y` should be preserved only when absolute positioning matters.
- `rotation` should be omitted when `0`.

## Layout

```ts
type LayoutInfo = {
  position?: "flow" | "absolute"
  mode?: "none" | "row" | "column"
  sizing?: {
    horizontal?: "fixed" | "fill" | "hug"
    vertical?: "fixed" | "fill" | "hug"
  }
  align?: {
    justifyContent?: "start" | "end" | "center" | "space-between"
    alignItems?: "start" | "end" | "center" | "stretch" | "baseline"
    alignSelf?: "start" | "end" | "center" | "stretch"
  }
  wrap?: boolean
  gap?: number
  padding?: {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }
  constraints?: {
    horizontal?: string
    vertical?: string
  }
  overflow?: {
    x?: "visible" | "scroll" | "hidden"
    y?: "visible" | "scroll" | "hidden"
  }
}
```

Rules:

- Preserve actual auto-layout semantics.
- Do not infer layout that does not exist in the source unless inference is explicitly enabled in a future schema version.
- Keep padding expanded by side, not shorthand, because side-specific access is easier for AI.

## Appearance

```ts
type AppearanceInfo = {
  background?: PaintValue[]
  stroke?: StrokeValue[]
  radius?: RadiusValue
  opacity?: number
  effects?: EffectValue[]
}
```

### Paint value

```ts
type PaintValue = {
  kind: "solid" | "gradient" | "image" | "pattern"
  styleRef?: string
  tokenRef?: string | string[]
  fallback?: unknown
}
```

Examples:

- color style with a preserved variable binding
- image fill with an asset ref
- gradient with raw stops as fallback

### Stroke value

```ts
type StrokeValue = {
  paints: PaintValue[]
  width?: number
  align?: "inside" | "center" | "outside"
  dash?: number[]
}
```

### Radius value

```ts
type RadiusValue =
  | { mode: "uniform", value: number }
  | { mode: "corners", topLeft: number, topRight: number, bottomRight: number, bottomLeft: number }
```

## Content

```ts
type ContentInfo = {
  text?: TextContent
  image?: ImageContent
  icon?: IconContent
}
```

### Text content

```ts
type TextContent = {
  characters: string
  textStyleRef?: string
  fill?: PaintValue[]
  alignment?: {
    horizontal?: "left" | "center" | "right" | "justified"
    vertical?: "top" | "center" | "bottom"
  }
  autoResize?: "fixed" | "height" | "width-and-height"
  maxLines?: number
}
```

### Image content

```ts
type ImageContent = {
  assetRef?: string
  scaleMode?: "fill" | "fit" | "tile" | "stretch"
}
```

### Icon content

```ts
type IconContent = {
  iconRef: string
  name: string
  size?: {
    width?: number
    height?: number
  }
}
```

## Design-system Binding

```ts
type DesignSystemBinding = {
  componentRef?: string
  policy?: "preserve" | "inline" | "icon" | "ignore"
  instance?: {
    variant?: Record<string, string>
    properties?: Record<string, ComponentPropertyValue>
    overrides?: Record<string, OverrideValue>
    swapRef?: string
  }
  componentPropertyReferences?: Record<string, string>
  resolvedVariableModes?: Record<string, string>
}
```

### Why `resolvedVariableModes` matters

The same token alias can resolve differently depending on the node's active collection mode. The capture must retain the mode selection context for downstream code generation.

## Origin

`origin` is used when a node was transformed during capture.

Example cases:

- an instance was inlined by policy
- an icon instance was normalized to `kind: "icon"`
- a vector-heavy subtree was collapsed into an asset

```ts
type OriginInfo = {
  sourceComponentRef?: string
  sourcePluginNodeId?: string
  sourceFigmaType?: string
  transform?: "inlined-instance" | "normalized-icon" | "collapsed-asset"
}
```

## Registries

## `registries.components`

```ts
type ComponentRegistryEntry = {
  ref: string
  key?: string
  name: string
  remote?: boolean
  componentSetRef?: string
  library?: {
    name?: string
  }
  properties?: Record<string, {
    type: "BOOLEAN" | "TEXT" | "INSTANCE_SWAP" | "VARIANT"
    defaultValue?: string | boolean
    preferredValues?: Array<{ type: "COMPONENT" | "COMPONENT_SET", key: string }>
    variantOptions?: string[]
  }>
}
```

## `registries.componentSets`

```ts
type ComponentSetRegistryEntry = {
  ref: string
  key?: string
  name: string
  remote?: boolean
  properties?: Record<string, {
    type: "BOOLEAN" | "TEXT" | "INSTANCE_SWAP" | "VARIANT"
    defaultValue?: string | boolean
    variantOptions?: string[]
  }>
}
```

## `registries.styles`

```ts
type StyleRegistryEntry = {
  ref: string
  key?: string
  name: string
  styleType: "PAINT" | "TEXT" | "EFFECT" | "GRID"
  remote?: boolean
  fallback?: unknown
  boundVariables?: Record<string, string | string[]>
}
```

## `registries.variables`

```ts
type VariableRegistryEntry = {
  ref: string
  id?: string
  key?: string
  name: string
  remote?: boolean
  resolvedType: "BOOLEAN" | "COLOR" | "FLOAT" | "STRING"
  collection: {
    id: string
    key?: string
    name: string
  }
  modes: Array<{
    modeId: string
    name: string
    value?: unknown
  }>
  codeSyntax?: {
    WEB?: string
    ANDROID?: string
    iOS?: string
  }
}
```

Rules:

- Preserve alias relationships if possible.
- Do not replace tokens with final raw values only.
- Include raw values per mode when available for fallback.

## `registries.icons`

```ts
type IconRegistryEntry = {
  ref: string
  name: string
  componentRef?: string
  assetRef?: string
  library?: {
    name?: string
  }
}
```

## `registries.assets`

```ts
type AssetRegistryEntry = {
  ref: string
  kind: "svg" | "png" | "jpg" | "pdf"
  hash?: string
  sourcePluginNodeId?: string
  sourceComponentRef?: string
}
```

Asset payload bytes should not be embedded in this schema. Transport and download are separate concerns.

## Normalization Rules

### Preserve

- width and height
- padding
- background and stroke information
- alignment
- instance boundaries
- variable bindings
- style references

### Strip

- temporary editor-only fields
- plugin-internal caches
- redundant default values
- raw vector geometry from the main node tree
- duplicate component definitions on every instance

### Collapse

Vector-heavy decorative subtrees may be collapsed into an asset reference if:

- they are not part of a preserved design-system icon
- they add little layout signal
- they would significantly inflate payload size

## Example

```json
{
  "pluginNodeId": "12:99",
  "restNodeId": "12:99",
  "figmaType": "INSTANCE",
  "kind": "instance",
  "name": "Button / Primary",
  "bounds": {
    "width": 160,
    "height": 48
  },
  "layout": {
    "position": "flow",
    "sizing": {
      "horizontal": "fixed",
      "vertical": "fixed"
    }
  },
  "designSystem": {
    "componentRef": "component:button-primary",
    "policy": "preserve",
    "instance": {
      "variant": {
        "Size": "L",
        "Tone": "Primary"
      },
      "overrides": {
        "Label": {
          "type": "text",
          "value": "Pay now"
        }
      }
    }
  }
}
```

## Validation Notes

Implementation should ship:

- a runtime `zod` schema
- sample fixtures
- golden snapshot tests

The schema should reject:

- missing `pluginNodeId`
- unknown top-level keys in strict mode
- invalid registry refs

## Open Items For v0.2

- optional inferred auto-layout layer
- explicit responsive breakpoint metadata
- richer text range styling
- richer interaction and prototype metadata
- optional subtree hashes for incremental sync
