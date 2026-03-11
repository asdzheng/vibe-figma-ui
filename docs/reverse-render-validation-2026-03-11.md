# Reverse-Render Validation

Date: 2026-03-11

Artifact under review:

- `artifacts/e2e/current-export.json`

Validation command:

```bash
corepack pnpm cli -- screenshot --input artifacts/e2e/current-export.json --output artifacts/e2e/current-export.snapshot.svg
```

Validation artifact:

- `artifacts/e2e/current-export.snapshot.svg`

## Experiment

The validation path uses the same new CLI `screenshot` implementation that now ships in V2.
It consumes canonical `design-json-schema-v0.1` JSON and reverse-renders a local SVG snapshot without going back through Figma or MCP.

For the current live export, the renderer reconstructed:

- 1 selected root frame
- 5 frame containers
- 11 preserved instances
- 1 explicit text node

The current export rendered with 11 Material 3 instance heuristics and 0 generic instance fallbacks.

## Verdict

The current canonical JSON is sufficient to reconstruct the selected Material Design 3 mobile UI with reasonable codegen-oriented fidelity.

It is not sufficient for pixel-perfect replay.

## What Reconstructs Well

- Root frame size, rounded device shell, outer stroke, and surface color.
- The vertical screen structure from bounds plus frame children.
- Material 3 color intent from preserved style refs and fallback colors.
- Explicit text nodes such as `Section title`.
- Preserved-instance content when the instance exposes useful properties or overrides:
  - text button label `Show all`
  - list item headline, supporting text, overline, and trailing text
  - list-item structural variants such as leading image and trailing icon
- Material 3 component intent for app bar, carousel, icon button, and gesture bar when inferred from component and component-set refs.

## What Does Not Reconstruct Yet

- Exact internals of preserved remote instances when the canonical JSON only keeps the boundary.
  - The current app bar variant does not expose its real internal headline text.
  - The carousel preserves item swaps and layout intent, but not the internal content of each swapped card.
- Exact icon glyphs when an instance swap only captures an opaque node ID and not a semantic icon ref.
- Real image payloads or raster previews. The schema intentionally avoids embedding large binary assets in canonical JSON.
- Exact typography metrics, clipping, and effect rendering. The JSON is good enough for structure and tokens, not full Figma paint replay.

## Why

These gaps are mostly a direct result of deliberate V2 choices:

- `policy: preserve` keeps design-system boundaries instead of expanding remote components into full child trees.
- the canonical schema stores semantic refs plus fallback values, not full rendered component snapshots
- the current runtime still has no Figma-native screenshot endpoint

## Practical Conclusion

For code generation, the current schema already carries enough information to recover:

- screen hierarchy
- major spacing and sizing
- Material 3 token usage
- a meaningful amount of preserved component semantics

For exact visual replay, the next meaningful improvements would be:

- richer instance-level semantic extraction for common preserved components
- semantic icon refs for swap targets
- optional visual asset capture alongside canonical JSON
