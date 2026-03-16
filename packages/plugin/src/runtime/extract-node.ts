import type {
  FigmaComponentLike,
  FigmaComponentPropertyDefinitionLike,
  FigmaComponentPropertyLike,
  FigmaEffectLike,
  FigmaGridTrackLike,
  FigmaNodeLike,
  FigmaPaintLike,
  FigmaTextSegmentLike
} from "../model.js";
import type { RuntimeRegistryCollector } from "./registry-collector.js";
import type {
  RuntimeComponentNode,
  RuntimeComponentProperty,
  RuntimeComponentPropertyDefinition,
  RuntimeComponentSetNode,
  RuntimePaint,
  RuntimeSceneNode,
  RuntimeVariableAlias
} from "./types.js";

function isPaintArray(
  paints: RuntimeSceneNode["fills"] | RuntimeSceneNode["strokes"]
): paints is readonly RuntimePaint[] {
  return Array.isArray(paints);
}

function mapScaleMode(
  scaleMode: RuntimePaint["scaleMode"]
): FigmaPaintLike["scaleMode"] | undefined {
  switch (scaleMode) {
    case "FILL":
      return "FILL";
    case "FIT":
      return "FIT";
    case "TILE":
      return "TILE";
    case "CROP":
      return "STRETCH";
    default:
      return undefined;
  }
}

function buildTokenRef(
  directAliases: Array<string | undefined>
): string | string[] | undefined {
  const refs = [...new Set(directAliases.filter((ref): ref is string => !!ref))];

  if (refs.length === 0) {
    return undefined;
  }

  return refs.length === 1 ? refs[0] : refs;
}

function buildPaintExtractionOptions(
  styleId: string | undefined,
  variableAliases: readonly RuntimeVariableAlias[] | undefined
): {
  styleId?: string;
  variableAliases?: readonly RuntimeVariableAlias[];
} {
  return {
    ...(styleId ? { styleId } : {}),
    ...(variableAliases ? { variableAliases } : {})
  };
}

function toOptionalFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toOptionalFiniteInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

function toOptionalNonNegativeInteger(value: unknown): number | undefined {
  const integer = toOptionalFiniteInteger(value);

  return integer !== undefined && integer >= 0 ? integer : undefined;
}

function toOptionalNullableFiniteInteger(value: unknown): number | null | undefined {
  if (value === null) {
    return null;
  }

  return toOptionalFiniteInteger(value);
}

function toOptionalPositiveInteger(value: unknown): number | undefined {
  const integer = toOptionalFiniteInteger(value);

  return integer !== undefined && integer > 0 ? integer : undefined;
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isComponentSetParent(
  parent: RuntimeComponentNode["parent"]
): parent is RuntimeComponentSetNode {
  return parent?.type === "COMPONENT_SET";
}

function extractPaint(
  paint: RuntimePaint,
  collector: RuntimeRegistryCollector,
  options: {
    defaultStyleRef?: string;
    nodeVariableRef?: string;
  } = {}
): FigmaPaintLike | undefined {
  const paintTokenRef = buildTokenRef([
    options.nodeVariableRef,
    collector.registerVariableAlias(paint.boundVariables?.color)
  ]);

  if (paint.type === "SOLID" && paint.color) {
    return {
      color: paint.color,
      ...(paint.opacity !== undefined ? { opacity: paint.opacity } : {}),
      ...(options.defaultStyleRef ? { styleRef: options.defaultStyleRef } : {}),
      ...(paintTokenRef ? { tokenRef: paintTokenRef } : {}),
      type: "SOLID"
    };
  }

  if (paint.type === "IMAGE") {
    const scaleMode = mapScaleMode(paint.scaleMode);

    return {
      ...(paint.imageHash ? { fallback: { imageHash: paint.imageHash } } : {}),
      ...(paint.opacity !== undefined ? { opacity: paint.opacity } : {}),
      ...(scaleMode ? { scaleMode } : {}),
      ...(options.defaultStyleRef ? { styleRef: options.defaultStyleRef } : {}),
      type: "IMAGE"
    };
  }

  if (paint.type.startsWith("GRADIENT")) {
    return {
      fallback: {
        gradientStops: paint.gradientStops,
        gradientType: paint.type
      },
      ...(paint.opacity !== undefined ? { opacity: paint.opacity } : {}),
      ...(options.defaultStyleRef ? { styleRef: options.defaultStyleRef } : {}),
      type: "GRADIENT"
    };
  }

  return undefined;
}

function extractPaints(
  paints: RuntimeSceneNode["fills"] | RuntimeSceneNode["strokes"],
  collector: RuntimeRegistryCollector,
  options: {
    styleId?: string;
    variableAliases?: readonly {
      id: string;
      type: "VARIABLE_ALIAS";
    }[];
  } = {}
): FigmaPaintLike[] | undefined {
  if (!isPaintArray(paints)) {
    return undefined;
  }

  const styleRef = collector.registerStyle(options.styleId);
  const extracted = paints
    .map((paint, index) => {
      const nodeVariableRef = options.variableAliases
        ? collector.registerVariableAlias(options.variableAliases[index])
        : undefined;

      return extractPaint(paint, collector, {
        ...(styleRef ? { defaultStyleRef: styleRef } : {}),
        ...(nodeVariableRef ? { nodeVariableRef } : {})
      });
    })
    .filter((paint): paint is FigmaPaintLike => paint !== undefined);

  return extracted.length > 0 ? extracted : undefined;
}

function extractEffects(
  node: RuntimeSceneNode,
  collector: RuntimeRegistryCollector
): FigmaEffectLike[] | undefined {
  if (!node.effects || node.effects.length === 0) {
    return undefined;
  }

  const styleRef = collector.registerStyle(node.effectStyleId);
  const effects = node.effects.map((effect, index) => ({
    fallback: {
      blendMode: effect.blendMode,
      color: effect.color,
      offset: effect.offset,
      radius: effect.radius,
      spread: effect.spread,
      visible: effect.visible
    },
    ...(styleRef ? { styleRef } : {}),
    ...(() => {
      const tokenRef = buildTokenRef([
        collector.registerVariableAlias(node.boundVariables?.effects?.[index]),
        ...Object.values(effect.boundVariables ?? {}).map((alias) =>
          collector.registerVariableAlias(alias)
        )
      ]);

      return tokenRef ? { tokenRef } : {};
    })(),
    type: effect.type
  }));

  return effects.length > 0 ? effects : undefined;
}

function mapComponentPropertyDefinition(
  property: RuntimeComponentPropertyDefinition,
  collector: RuntimeRegistryCollector
): FigmaComponentPropertyDefinitionLike {
  const variableRef = collector.registerVariableAlias(property.boundVariables?.value);

  return {
    ...(property.defaultValue !== undefined
      ? { defaultValue: property.defaultValue }
      : {}),
    ...(property.preferredValues
      ? { preferredValues: [...property.preferredValues] }
      : {}),
    type: property.type,
    ...(property.variantOptions ? { variantOptions: property.variantOptions } : {}),
    ...(variableRef ? { variableRef } : {})
  };
}

function mapComponentPropertyDefinitions(
  definitions: Record<string, RuntimeComponentPropertyDefinition> | undefined,
  collector: RuntimeRegistryCollector
): Record<string, FigmaComponentPropertyDefinitionLike> | undefined {
  if (!definitions) {
    return undefined;
  }

  const entries = Object.entries(definitions).map(([name, property]) => [
    name,
    mapComponentPropertyDefinition(property, collector)
  ] as const);

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function extractMainComponent(
  component: RuntimeComponentNode,
  collector: RuntimeRegistryCollector
): FigmaComponentLike {
  const componentSet = isComponentSetParent(component.parent)
    ? component.parent
    : undefined;
  const properties = mapComponentPropertyDefinitions(
    component.componentPropertyDefinitions,
    collector
  );
  const componentSetProperties = componentSet
    ? mapComponentPropertyDefinitions(
        componentSet.componentPropertyDefinitions,
        collector
      )
    : undefined;

  return {
    id: component.id,
    ...(component.key ? { key: component.key } : {}),
    name: component.name,
    ...(properties ? { properties } : {}),
    ...(component.remote !== undefined ? { remote: component.remote } : {}),
    ...(componentSet
      ? {
          componentSet: {
            ...(componentSet.key ? { key: componentSet.key } : {}),
            name: componentSet.name,
            ...(componentSetProperties ? { properties: componentSetProperties } : {}),
            ...(componentSet.remote !== undefined
              ? { remote: componentSet.remote }
              : {})
          }
        }
      : {})
  };
}

function mapInstanceProperty(
  propertyName: string,
  property: RuntimeComponentProperty,
  node: RuntimeSceneNode,
  collector: RuntimeRegistryCollector
): FigmaComponentPropertyLike {
  return {
    ...(property.preferredValues
      ? { preferredValues: [...property.preferredValues] }
      : {}),
    type: property.type,
    value: property.value,
    ...(() => {
      const variableRef = collector.registerVariableAlias(
        property.boundVariables?.value ??
          node.boundVariables?.componentProperties?.[propertyName]
      );

      return variableRef ? { variableRef } : {};
    })()
  };
}

function extractVariantProperties(
  node: RuntimeSceneNode
): Record<string, string> | undefined {
  if (node.componentProperties) {
    const variantProperties: Record<string, string> = {};

    for (const [name, property] of Object.entries(node.componentProperties)) {
      if (property.type === "VARIANT" && typeof property.value === "string") {
        variantProperties[name] = property.value;
      }
    }

    if (Object.keys(variantProperties).length > 0) {
      return variantProperties;
    }
  }

  return node.variantProperties ?? undefined;
}

function extractTextContent(
  node: RuntimeSceneNode,
  collector: RuntimeRegistryCollector
): Pick<
  FigmaNodeLike,
  | "characters"
  | "maxLines"
  | "textAlignHorizontal"
  | "textAlignVertical"
  | "textAutoResize"
  | "textSegments"
  | "textStyleRef"
> {
  const textStyleRef =
    typeof node.textStyleId === "string"
      ? collector.registerStyle(node.textStyleId)
      : undefined;
  const textSegments = node.textSegments
    ?.map((segment) => extractTextSegment(segment, collector))
    .filter((segment): segment is FigmaTextSegmentLike => segment !== undefined);

  return {
    ...(node.characters !== undefined ? { characters: node.characters } : {}),
    ...(toOptionalNullableFiniteInteger(node.maxLines) !== undefined
      ? { maxLines: toOptionalNullableFiniteInteger(node.maxLines) }
      : {}),
    ...(textSegments && textSegments.length > 0 ? { textSegments } : {}),
    ...(node.textAlignHorizontal
      ? { textAlignHorizontal: node.textAlignHorizontal }
      : {}),
    ...(node.textAlignVertical ? { textAlignVertical: node.textAlignVertical } : {}),
    ...(node.textAutoResize ? { textAutoResize: node.textAutoResize } : {}),
    ...(textStyleRef ? { textStyleRef } : {})
  };
}

function mapGridTrack(
  track: NonNullable<RuntimeSceneNode["gridColumnSizes"]>[number]
): FigmaGridTrackLike {
  return {
    type: track.type,
    ...(toOptionalFiniteNumber(track.value) !== undefined
      ? { value: toOptionalFiniteNumber(track.value) }
      : {})
  };
}

function extractTextSegment(
  segment: NonNullable<RuntimeSceneNode["textSegments"]>[number],
  collector: RuntimeRegistryCollector
): FigmaTextSegmentLike | undefined {
  const fill = extractPaints(
    segment.fills,
    collector,
    buildPaintExtractionOptions(segment.fillStyleId, undefined)
  );
  const textStyleRef =
    typeof segment.textStyleId === "string"
      ? collector.registerStyle(segment.textStyleId)
      : undefined;

  if (!fill && !textStyleRef) {
    return undefined;
  }

  return {
    characters: segment.characters,
    end: segment.end,
    ...(fill ? { fill } : {}),
    start: segment.start,
    ...(textStyleRef ? { textStyleRef } : {})
  };
}

export function extractNodeFromRuntime(
  node: RuntimeSceneNode,
  collector: RuntimeRegistryCollector
): FigmaNodeLike {
  const effectStyleId = toOptionalString(node.effectStyleId);
  const fillStyleId = toOptionalString(node.fillStyleId);
  const strokeStyleId = toOptionalString(node.strokeStyleId);
  const fills = extractPaints(
    node.fills,
    collector,
    buildPaintExtractionOptions(fillStyleId, node.boundVariables?.fills)
  );
  const strokes = extractPaints(
    node.strokes,
    collector,
    buildPaintExtractionOptions(strokeStyleId, node.boundVariables?.strokes)
  );
  const effects = extractEffects(node, collector);
  const children = node.children?.map((child) =>
    extractNodeFromRuntime(child, collector)
  );
  const componentProperties = node.componentProperties
    ? Object.fromEntries(
        Object.entries(node.componentProperties).map(([name, property]) => [
          name,
          mapInstanceProperty(name, property, node, collector)
        ])
      )
    : undefined;
  const effectStyleRef = effectStyleId
    ? collector.registerStyle(effectStyleId)
    : undefined;
  const fillStyleRef = fillStyleId
    ? collector.registerStyle(fillStyleId)
    : undefined;
  const mainComponent = node.mainComponent
    ? extractMainComponent(node.mainComponent, collector)
    : undefined;
  const strokeStyleRef = strokeStyleId
    ? collector.registerStyle(strokeStyleId)
    : undefined;
  const variantProperties = extractVariantProperties(node);
  const bottomLeftRadius = toOptionalFiniteNumber(node.bottomLeftRadius);
  const bottomRightRadius = toOptionalFiniteNumber(node.bottomRightRadius);
  const cornerRadius = toOptionalFiniteNumber(node.cornerRadius);
  const gridColumnAnchorIndex = toOptionalNonNegativeInteger(
    node.gridColumnAnchorIndex
  );
  const gridColumnCount = toOptionalPositiveInteger(node.gridColumnCount);
  const gridColumnGap = toOptionalFiniteNumber(node.gridColumnGap);
  const gridColumnSpan = toOptionalPositiveInteger(node.gridColumnSpan);
  const gridRowAnchorIndex = toOptionalNonNegativeInteger(node.gridRowAnchorIndex);
  const gridRowCount = toOptionalPositiveInteger(node.gridRowCount);
  const gridRowGap = toOptionalFiniteNumber(node.gridRowGap);
  const gridRowSpan = toOptionalPositiveInteger(node.gridRowSpan);
  const height = toOptionalFiniteNumber(node.height);
  const itemSpacing = toOptionalFiniteNumber(node.itemSpacing);
  const opacity = toOptionalFiniteNumber(node.opacity);
  const paddingBottom = toOptionalFiniteNumber(node.paddingBottom);
  const paddingLeft = toOptionalFiniteNumber(node.paddingLeft);
  const paddingRight = toOptionalFiniteNumber(node.paddingRight);
  const paddingTop = toOptionalFiniteNumber(node.paddingTop);
  const rotation = toOptionalFiniteNumber(node.rotation);
  const strokeWeight = toOptionalFiniteNumber(node.strokeWeight);
  const topLeftRadius = toOptionalFiniteNumber(node.topLeftRadius);
  const topRightRadius = toOptionalFiniteNumber(node.topRightRadius);
  const width = toOptionalFiniteNumber(node.width);
  const x = toOptionalFiniteNumber(node.x);
  const y = toOptionalFiniteNumber(node.y);

  return {
    ...(node.type === "TEXT" ? extractTextContent(node, collector) : {}),
    ...(children?.length ? { children } : {}),
    ...(node.clipsContent !== undefined ? { clipsContent: node.clipsContent } : {}),
    ...(componentProperties ? { componentProperties } : {}),
    ...(node.componentPropertyReferences
      ? { componentPropertyReferences: node.componentPropertyReferences }
      : {}),
    ...(node.constraints ? { constraints: node.constraints } : {}),
    ...(cornerRadius !== undefined ? { cornerRadius } : {}),
    ...(node.counterAxisAlignItems
      ? { counterAxisAlignItems: node.counterAxisAlignItems }
      : {}),
    ...(effectStyleRef ? { effectStyleRef } : {}),
    ...(effects ? { effects } : {}),
    ...(fillStyleRef ? { fillStyleRef } : {}),
    ...(fills ? { fills } : {}),
    ...(node.gridChildHorizontalAlign
      ? { gridChildHorizontalAlign: node.gridChildHorizontalAlign }
      : {}),
    ...(node.gridChildVerticalAlign
      ? { gridChildVerticalAlign: node.gridChildVerticalAlign }
      : {}),
    ...(gridColumnAnchorIndex !== undefined ? { gridColumnAnchorIndex } : {}),
    ...(gridColumnCount !== undefined ? { gridColumnCount } : {}),
    ...(gridColumnGap !== undefined ? { gridColumnGap } : {}),
    ...(node.gridColumnSizes?.length
      ? { gridColumnSizes: node.gridColumnSizes.map((track) => mapGridTrack(track)) }
      : {}),
    ...(gridColumnSpan !== undefined ? { gridColumnSpan } : {}),
    ...(gridRowAnchorIndex !== undefined ? { gridRowAnchorIndex } : {}),
    ...(gridRowCount !== undefined ? { gridRowCount } : {}),
    ...(gridRowGap !== undefined ? { gridRowGap } : {}),
    ...(node.gridRowSizes?.length
      ? { gridRowSizes: node.gridRowSizes.map((track) => mapGridTrack(track)) }
      : {}),
    ...(gridRowSpan !== undefined ? { gridRowSpan } : {}),
    ...(height !== undefined ? { height } : {}),
    id: node.id,
    ...(itemSpacing !== undefined ? { itemSpacing } : {}),
    ...(node.layoutMode ? { layoutMode: node.layoutMode } : {}),
    ...(node.layoutPositioning
      ? { layoutPositioning: node.layoutPositioning }
      : {}),
    ...(node.layoutSizingHorizontal
      ? { layoutSizingHorizontal: node.layoutSizingHorizontal }
      : {}),
    ...(node.layoutSizingVertical
      ? { layoutSizingVertical: node.layoutSizingVertical }
      : {}),
    ...(node.layoutWrap ? { layoutWrap: node.layoutWrap } : {}),
    ...(node.locked !== undefined ? { locked: node.locked } : {}),
    ...(mainComponent ? { mainComponent } : {}),
    name: node.name,
    ...(opacity !== undefined ? { opacity } : {}),
    ...(paddingBottom !== undefined ? { paddingBottom } : {}),
    ...(paddingLeft !== undefined ? { paddingLeft } : {}),
    ...(paddingRight !== undefined ? { paddingRight } : {}),
    ...(paddingTop !== undefined ? { paddingTop } : {}),
    ...(node.primaryAxisAlignItems
      ? { primaryAxisAlignItems: node.primaryAxisAlignItems }
      : {}),
    ...(node.resolvedVariableModes
      ? { resolvedVariableModes: node.resolvedVariableModes }
      : {}),
    ...(rotation !== undefined ? { rotation } : {}),
    ...(node.strokeAlign ? { strokeAlign: node.strokeAlign } : {}),
    ...(strokeStyleRef ? { strokeStyleRef } : {}),
    ...(strokeWeight !== undefined ? { strokeWeight } : {}),
    ...(strokes ? { strokes } : {}),
    ...(topLeftRadius !== undefined ? { topLeftRadius } : {}),
    ...(topRightRadius !== undefined ? { topRightRadius } : {}),
    ...(bottomRightRadius !== undefined ? { bottomRightRadius } : {}),
    ...(bottomLeftRadius !== undefined ? { bottomLeftRadius } : {}),
    type: node.type,
    ...(variantProperties ? { variantProperties } : {}),
    ...(node.visible !== undefined ? { visible: node.visible } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(x !== undefined ? { x } : {}),
    ...(y !== undefined ? { y } : {})
  };
}
