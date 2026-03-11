# Design JSON V3 Optimization Plan

Status: Proposed

## Objective

Make the default design JSON small enough to be the real product, not a debugging artifact.

V3 should treat JSON size as a product requirement, not a cleanup task.

The default export must be:

- semantic-first
- sparse
- deterministic
- optimized for AI consumption
- free of design-time raw payloads unless explicitly requested

## Why V3 Is Necessary

The current live export in `artifacts/e2e/current-export.json` is already past the acceptable limit for a single moderate page:

- pretty-printed size: 156 KB
- minified size: 84,862 bytes
- line count: 4,996
- root count: 1
- node count: 17

That ratio is not viable for downstream code generation.

Measured bloat from the current export:

- `registries`: 59,806 bytes
- `roots`: 24,706 bytes
- variable registry alone: 41,509 bytes across 35 variables
- component-set registry: 6,892 bytes across 6 sets
- style registry: 4,080 bytes across 11 styles
- instance property payloads inside nodes: 7,640 bytes
- per-node `resolvedVariableModes`: 4,069 bytes

Measured structural waste in the same export:

- all 17 nodes include `restNodeId`
- all 17 nodes include `figmaType`
- all 17 nodes include `locked: false`
- all 17 nodes include `x` and `y`
- all 17 nodes include `layout.position: "flow"`
- 16 nodes include `layout.wrap: false`

The current format still behaves too much like a normalized design-debug dump.
That is the core problem.

## Success Criteria

For the same representative export in `artifacts/e2e/current-export.json`, V3 default canonical output should hit all of these:

- pretty JSON <= 1,200 lines
- pretty JSON <= 45 KB
- minified JSON <= 25 KB
- no full variable mode matrices in default output
- no component authoring catalogs in default output
- no repeated default instance properties in default output

Stretch target:

- pretty JSON <= 800 lines
- pretty JSON <= 30 KB
- minified JSON <= 18 KB

Stop/go rule:

- if Phase 1 and Phase 2 together cannot reduce the representative export by at least 60 percent, expansion of adjacent features should pause and the product direction should be re-evaluated before more capture scope is added

## V3 Principles

### 1. One payload, one job

The default canonical JSON is for code generation.
It is not the place for debug payloads, full token matrices, or Figma authoring catalogs.

### 2. Semantic payload first, debug payload opt-in

Anything that exists mainly for inspection, tracing, or reverse lookup moves to an explicit debug or audit profile.

### 3. Sparse by default

If a value is default, inferable, duplicated elsewhere, or only useful for editor round-trips, omit it.

### 4. Store diffs, not catalogs

For instances, variables, and styles, keep only what the selected design actually uses.
Do not embed the full menu of what Figma could have provided.

### 5. Preserve meaning, not raw shape

The goal is to preserve semantic intent needed for code generation, not the exact authoring surface of the Figma API.

### 6. No duplicate facts

The same fact must not appear in both node payloads and registries unless there is a clear consumer need.

### 7. Readable canonical, compact transport

The canonical schema should remain readable by humans and LLMs.
Do not rescue a bloated schema by turning field names into cryptic one-letter keys.
If more compaction is needed for transport, derive a transport format from the canonical format instead of degrading the canonical format itself.

## V3 Output Profiles

V3 should formally split output into profiles.

### `canonical`

Default.
Smallest AI-ready semantic document.

### `debug`

Adds identifiers, registry detail, and trace information needed for diagnostics and inspection.

### `audit`

Explicitly opt-in.
Carries raw or near-raw authoring data that helps with capture correctness investigations.

Rule:

- `export-json` should default to `canonical`
- current V2-like detail level belongs in `debug`, not in `canonical`

## V3 Schema Direction

### 1. Top-level metadata must shrink

Default capture metadata should keep only what materially affects interpretation:

- schema version
- capture scope
- page identity
- selected root ids
- active mode context

Candidates to remove from default canonical output:

- verbose `selection` objects with repeated `name` and `type`
- empty diagnostics blocks
- transport-oriented metadata that does not change codegen

Recommended rule:

- keep `pluginVersion`, timestamps, and detailed selection metadata in `debug`

### 2. Keep one node id in canonical

Current schema preserves both `pluginNodeId` and `restNodeId`.
That is useful for tooling, but it should not be in the default canonical payload.

V3 canonical rule:

- keep one id only
- prefer plugin/runtime node id in canonical
- move `restNodeId` to `debug`

### 3. Drop `figmaType` unless it adds information

If normalized `kind` is enough, `figmaType` is redundant.

V3 canonical rule:

- keep `kind`
- include raw `figmaType` only for `unknown`, mixed, or unsupported cases

### 4. Make node names conditional

Many node names repeat the same meaning already preserved elsewhere.

V3 canonical rule:

- keep `name` on roots
- keep `name` on user-authored semantic frames or unknown nodes
- omit `name` for preserved instances when the component registry already carries the same label
- omit purely editor-noise names

### 5. Bounds must be contextual, not absolute by default

Current output includes `x` and `y` on every node, including flow-layout children.
That is unnecessary for most code generation.

V3 canonical rule:

- always keep `width` and `height` when needed
- keep `x` and `y` only for:
  - absolute-positioned nodes
  - root placement when multiple roots are exported
  - overlap-sensitive cases
- omit `rotation` when zero
- round float noise aggressively:
  - integers stay integers
  - non-integers round to at most 2 decimals

Example:

- `356.000244140625` becomes `356`

### 6. Layout must encode only non-default intent

Current layout payload carries a large amount of default information.

V3 canonical rule:

- omit `position: "flow"`
- omit `wrap: false`
- omit zero `gap`
- omit zero padding edges
- omit default alignment values
- omit default constraints for non-absolute nodes
- omit `mode: "none"`
- omit sizing fields that do not change interpretation

Optional compact encoding for canonical readability:

- allow short tuple forms for repeated numeric groups such as padding and corner radii

Examples:

- symmetric padding can become `[16]`
- vertical-horizontal padding can become `[8,16]`
- fully expanded edges only when asymmetric

This should only be used where the reduction is large and decoding remains obvious.

### 7. Appearance must never carry both semantic refs and large fallback blobs unless necessary

Current schema allows style refs, token refs, and fallback payloads to coexist.
That is correct for resilience, but too expensive when used everywhere.

V3 canonical rule:

- if a node is semantically bound and the semantic binding is enough for code generation, omit large resolved fallback objects
- keep fallback values only when:
  - no semantic ref exists
  - the consumer would otherwise lose required visual meaning
  - the style reference alone is too weak

Specific cuts:

- omit text `fill` when it is fully captured by text style plus token refs
- omit empty or default paint/effect details
- keep only one source of truth for image scale mode and asset identity

### 8. Text payload must stay simple and avoid rich-text inflation

V3 canonical rule:

- default text node stores a single plain string plus only the style semantics actually needed
- rich text runs are opt-in and emitted only when the node is truly mixed
- do not pre-allocate segment arrays for simple text

### 9. Preserved instances must become sparse semantic diffs

This is one of the biggest wins.

Current output stores full `componentProperties` payloads on instances, including many default values.
On the representative export, five repeated list items each carry the same 1,351-byte instance payload.

V3 canonical rule:

- preserve instance boundary
- keep `componentRef`
- keep only non-default overrides
- keep only meaningful swaps
- keep only user-relevant text or boolean changes
- do not keep the full property surface of the component on every instance

Important structural rule:

- canonical instance payload should be an override diff against the referenced component, not a replay of the component definition

### 10. Do not store both leaf component identity and variant map unless needed

Current output often stores:

- a leaf `componentRef` that already points to a specific variant component
- a `variant` map that repeats the same information

V3 canonical rule:

- choose one of these representations by default:
  - leaf component ref only
  - component-set ref plus sparse variant map
- do not emit both in canonical unless the consumer explicitly needs both

Recommended default:

- prefer leaf `componentRef` in canonical
- move full variant maps to `debug`, unless an override changed variant selection relative to the leaf ref

### 11. Remove per-node `resolvedVariableModes`

This field is expensive and mostly duplicates higher-level context.

V3 canonical rule:

- move active mode context to the top level
- emit node-local mode overrides only when a node deviates from the top-level mode context

### 12. Component registries must be minimal and usage-driven

Current component and component-set entries still contain authoring metadata.

Default canonical registry should keep only what downstream mapping needs:

- stable ref
- display name
- optional library/source label
- optional parent set ref if materially useful

Move out of default canonical output:

- property definitions
- `preferredValues`
- `variantOptions`
- `defaultValue`
- raw component keys unless needed for mapping
- separate component-set registry when the same meaning can live on the component entry

Recommended direction:

- collapse `components` and `componentSets` into one lighter semantic registry, or keep both only if that clearly simplifies consumers

### 13. Variable registry must change from full matrix to active slice

This is the largest single reduction opportunity.

Current issue:

- six M3 scheme variables each carry 32 modes
- variable registry alone is 41,509 bytes in the representative export

V3 canonical rule:

- keep only the active value for the active mode context
- keep collection name and active mode name once at the top level
- omit the full `modes[]` matrix from canonical
- omit empty `codeSyntax`
- omit raw internal ids unless explicitly needed

Optional `debug` additions:

- full mode matrix
- alias chain detail
- platform syntax

### 14. Style registry should preserve semantics, not resolved authoring data

Default canonical style entries should be small:

- ref
- name
- type
- bound token refs only if they materially help code generation

Move to `debug`:

- large fallback paint/effect structures
- raw bound-variable matrices that duplicate node-level intent

### 15. Registry inclusion must be demand-driven

Only include registry entries that are actually referenced by the canonical tree after compaction.

This sounds obvious, but it must be enforced after all V3 transformations, not before them.

### 16. Add repeated-value interning only after simple wins land

If the payload is still too large after the primary cuts, V3 may add a second-level compaction mechanism for repeated instance configs or repeated style bundles.

Examples:

- repeated identical instance override payloads
- repeated layout fragments
- repeated token bundles

This is a fallback optimization, not the first move.
The first move must be schema simplification.

## Proposed V3 Canonical Shape

This is directional, not final syntax:

```json
{
  "schemaVersion": "3.0",
  "meta": {
    "scope": "selection",
    "page": { "id": "1:2", "name": "Page 2" },
    "roots": ["1:9053"],
    "modeContext": {
      "M3": "Light",
      "Typescale": "Baseline",
      "Font theme": "Baseline"
    }
  },
  "roots": [
    {
      "id": "1:9053",
      "kind": "frame",
      "name": "Examples/Upcoming-Mobile",
      "box": { "w": 412, "h": 983 },
      "layout": { "mode": "column" },
      "children": [
        {
          "id": "1:9055",
          "kind": "instance",
          "ref": "component:app-bar",
          "box": { "h": 112 },
          "overrides": {
            "Image": "component:image-hero",
            "Show 3rd trailing action": true
          }
        }
      ]
    }
  ],
  "refs": {
    "components": {
      "component:app-bar": {
        "name": "App bar",
        "library": "Material 3"
      }
    },
    "tokens": {
      "variable:surface": {
        "name": "Schemes/Surface",
        "type": "COLOR",
        "value": "#fef7ff"
      }
    }
  }
}
```

The shape above is intentionally missing all debug-only detail.
That is the point.

## Estimated Reduction By Category

These are directional estimates for the current representative export.

### High-confidence cuts

- variable mode matrices and empty code syntax removal: 25 to 35 percent
- component-set property catalogs removal: 8 to 15 percent
- sparse instance property diffs: 10 to 20 percent
- per-node mode context removal: 4 to 8 percent
- default layout and bounds cleanup: 5 to 10 percent

### Secondary cuts

- dropping duplicate ids and raw types: 1 to 3 percent
- dropping empty diagnostics and verbose selection metadata: 1 to 2 percent
- compact serialization instead of pretty-by-default: 15 to 25 percent transport win, but this must not be counted as the main schema win

Combined structural reduction target:

- 70 to 85 percent smaller than current pretty output on representative captures

## Rollout Plan

### Phase 0. Baseline and budget locking

- add a size-report script for any exported document
- record current size budgets from the representative export
- add a regression fixture specifically for size optimization work

### Phase 1. Safe structural cuts

- remove `restNodeId` from canonical
- remove redundant `figmaType`
- remove `locked: false`
- remove `position: "flow"`
- remove `wrap: false`
- remove `x` and `y` for flow children
- round float noise
- omit empty diagnostics
- stop exporting full selection metadata in canonical

Expected result:

- fast reduction with low semantic risk

### Phase 2. Semantic compaction

- convert instance payloads to sparse override diffs
- stop emitting both leaf component refs and full variant maps
- move node-level mode context to top-level mode context
- strip default instance values

Expected result:

- largest tree-side reduction

### Phase 3. Registry collapse

- replace variable full-mode registries with active-value registries
- strip component property catalogs from default registries
- slim style registry
- prune unreferenced registry entries after all transforms

Expected result:

- largest registry-side reduction

### Phase 4. Profile split

- add `canonical`, `debug`, and `audit` output profiles
- keep current detail level available behind `debug`
- make CLI default to `canonical`

Expected result:

- clean separation between product output and engineering diagnostics

### Phase 5. Quality validation

- verify reverse-render still works against canonical where expected
- verify preserved-component codegen quality does not regress
- verify token semantics still survive for downstream consumers

## Test and Verification Requirements

V3 is not complete until these exist:

- fixture-based schema validation for the new canonical shape
- size-budget tests for representative captures
- regression tests that assert default omission behavior
- tests that ensure instance payloads only include non-default diffs
- tests that ensure variable registries only include active-mode values in canonical
- CLI tests for profile selection

Recommended hard gates:

- fail CI when representative canonical output exceeds the agreed byte budget
- fail CI when a single field addition increases canonical size by more than a configured threshold without an explicit fixture update

## Non-goals

V3 should not:

- preserve all Figma authoring metadata in canonical
- keep full token mode matrices in canonical
- keep complete component property definitions in canonical
- solve size problems only with gzip or minified keys
- treat debug convenience as a reason to bloat the default payload

## Decision Summary

The correct V3 strategy is not minor trimming.

The correct V3 strategy is:

1. redefine canonical JSON as a semantic codegen payload
2. move debug and authoring detail out of the default payload
3. make registries active-slice and usage-driven
4. make instances sparse diffs instead of property catalogs
5. enforce hard size budgets in CI

If V3 does not aggressively separate semantic output from design-debug data, the project will continue exporting JSON that is too large to be the product.
