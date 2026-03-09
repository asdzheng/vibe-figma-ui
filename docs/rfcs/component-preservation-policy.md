# Component Preservation Policy

Status: Draft

## Purpose

Define how the capture engine decides whether a Figma component instance should be:

- preserved as a component boundary
- expanded into layout primitives
- normalized into an icon reference
- ignored

This policy exists to keep the captured design aligned with the codebase's real design system.

## Default Rule

All `INSTANCE` nodes default to `preserve`.

Rationale:

- false positives are expensive
- flattening a real design-system component destroys semantics
- downstream code generation should prefer existing component libraries over raw layout recreation

## Policy Values

```ts
type ComponentCapturePolicy =
  | "preserve"
  | "inline"
  | "icon"
  | "ignore"
```

## Policy Semantics

### `preserve`

Keep the node as an instance boundary.

Capture:

- `componentRef`
- variant selections
- component properties
- text and boolean overrides
- instance swap targets
- token and style references on the instance itself

Do not recursively expand the component subtree into the main tree.

### `inline`

Resolve the instance into layout and visual nodes.

Use this only when the component is not meant to remain a reusable code component.

Capture requirements:

- preserve provenance in `origin.sourceComponentRef`
- expand the visible result into standard nodes
- keep resolved token and style refs if available

### `icon`

Treat the instance as an icon asset instead of a generic component.

Capture:

- `iconRef`
- icon name
- source component ref
- size and color bindings on the instance

Do not emit the icon's internal vector subtree in the main tree unless explicitly requested.

### `ignore`

Skip the instance from the primary output.

Use rarely. This is only appropriate for:

- known editor-only helpers
- annotation layers
- capture-noise wrappers that the team explicitly wants excluded

## Helper Components

A helper component is a component used mainly to simplify authoring inside Figma rather than represent a stable runtime component in code.

Common examples:

- `Spacer/16`
- `Inset/24`
- `Stack/H`
- `Grid Cell`
- `Content Wrapper`

Typical traits:

- layout-only
- little or no business meaning
- often used as spacing or alignment wrappers
- often absent from the real frontend component library

Helper components are the primary candidates for `inline`.

## Important Constraint

Do not inline based on heuristics alone by default.

Heuristics may suggest that a component looks helper-like, but the engine should still preserve it unless:

- it matches an explicit rule, or
- the user explicitly enables heuristic inlining

This keeps the default behavior safe for design-system-heavy files.

## Rule Model

Policy should be driven by an ordered rule table.

```ts
type ComponentPolicyRule = {
  id: string
  priority: number
  match: {
    componentKey?: string[]
    componentName?: string[]
    componentNameRegex?: string[]
    componentSetNameRegex?: string[]
    libraryNameRegex?: string[]
    folderPathRegex?: string[]
    remote?: boolean
  }
  policy: "preserve" | "inline" | "icon" | "ignore"
  reason?: string
}
```

Rule table sort order:

- lower `priority` value wins
- if priorities are equal, preserve source order

## Rule Evaluation Order

The first matching rule wins.

Recommended precedence:

1. Explicit `ignore`
2. Explicit `icon`
3. Explicit `inline`
4. Explicit `preserve`
5. Fallback default `preserve`

`ignore` should stay explicit and rare.

## Recommended Default Configuration

```json
[
  {
    "id": "icon-library",
    "priority": 100,
    "match": {
      "libraryNameRegex": ["(^|/)icons?$", "(^|/)system-icons?$"],
      "componentNameRegex": ["(^|/)(icon|ic)/"]
    },
    "policy": "icon",
    "reason": "normalize icon instances into icon refs"
  },
  {
    "id": "layout-helpers",
    "priority": 200,
    "match": {
      "componentNameRegex": [
        "(^|/)(spacer|gap|stack|inset|padding|grid cell|content wrapper)($|/)"
      ]
    },
    "policy": "inline",
    "reason": "treat layout helpers as resolved layout"
  }
]
```

Even with these examples, the shipped default should remain conservative.

## Preserve Capture Contract

When a node is preserved:

### Required fields

- `kind: "instance"`
- `designSystem.componentRef`
- `designSystem.policy: "preserve"`

### Recommended fields

- `designSystem.instance.variant`
- `designSystem.instance.properties`
- `designSystem.instance.overrides`
- `designSystem.instance.swapRef`
- `designSystem.componentPropertyReferences`

### Why this matters

If a button, input, tab bar, or card exists in the design system, the generated code should prefer the existing code component rather than rebuilding the layout from scratch.

## Inline Capture Contract

When a node is inlined:

### Required behavior

- expand to standard layout and content nodes
- preserve `origin.sourceComponentRef`
- preserve resolved styles and tokens where possible

### Required metadata

```json
{
  "origin": {
    "sourceComponentRef": "component:layout-wrapper",
    "transform": "inlined-instance"
  }
}
```

Inlining should remain explainable after the fact.

## Icon Capture Contract

When a node is normalized as an icon:

### Required fields

- `kind: "icon"`
- `content.icon.iconRef`
- `content.icon.name`
- `designSystem.policy: "icon"`

### Preferred registry metadata

- source component ref
- library name
- asset ref if export is needed

### Why icon normalization is separate

Icons are usually authored as components in Figma, but in code they often map to a dedicated icon system rather than a generic component tree.

## Excluded Components List

A plain excluded list is acceptable as a thin configuration layer, but it is not expressive enough as the primary model.

Reason:

- some components should inline
- some should normalize to icons
- some should preserve
- some should ignore

So an excluded list should be treated as shorthand for rule entries with `policy: "inline"` or `policy: "ignore"`, not as the full policy system.

## How To Detect Runtime-Relevant Components

Strong preserve signals:

- remote library component
- published component with stable key
- belongs to a known design-system library
- has meaningful variant properties
- has a direct runtime mapping in the target codebase

Strong inline signals:

- name strongly indicates layout helper behavior
- wrapper contains only layout structure with no semantic role
- component is a local authoring convenience not present in code

Strong icon signals:

- icon library naming
- icon component set
- instance swap property used as icon selector
- square vector-like asset behavior with color inheritance

## Heuristics Output

The engine may produce diagnostics such as:

- `suggest-inline`
- `suggest-icon`
- `unresolved-component`

Diagnostics can guide future config updates, but they must not change behavior unless the policy system says so.

## Recommended Team Workflow

1. Start with default `preserve`.
2. Capture real design files and inspect what remains as instances.
3. Add explicit `inline` rules only for confirmed helper components.
4. Add explicit `icon` rules for icon libraries.
5. Keep the rule table under version control with fixtures.

## Schema Integration

This policy document depends on the definitions in:

- `design-json-schema-v0.1.md`

Specifically:

- `designSystem.policy`
- `designSystem.componentRef`
- `origin.sourceComponentRef`
- `content.icon`

## Open Items

- whether heuristic suggestions should include confidence scores
- whether target-platform adapters can override policy at generation time
- whether helper components should support partial inline behavior in a future version
