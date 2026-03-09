import type {
  FigmaComponentLike,
  FigmaComponentPropertyDefinitionLike,
  FigmaComponentPropertyLike,
  FigmaEffectLike,
  FigmaNodeLike,
  FigmaPaintLike
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
  | "textStyleRef"
> {
  const textStyleRef =
    typeof node.textStyleId === "string"
      ? collector.registerStyle(node.textStyleId)
      : undefined;

  return {
    ...(node.characters !== undefined ? { characters: node.characters } : {}),
    ...(node.maxLines !== undefined ? { maxLines: node.maxLines } : {}),
    ...(node.textAlignHorizontal
      ? { textAlignHorizontal: node.textAlignHorizontal }
      : {}),
    ...(node.textAlignVertical ? { textAlignVertical: node.textAlignVertical } : {}),
    ...(node.textAutoResize ? { textAutoResize: node.textAutoResize } : {}),
    ...(textStyleRef ? { textStyleRef } : {})
  };
}

export function extractNodeFromRuntime(
  node: RuntimeSceneNode,
  collector: RuntimeRegistryCollector
): FigmaNodeLike {
  const fills = extractPaints(
    node.fills,
    collector,
    buildPaintExtractionOptions(node.fillStyleId, node.boundVariables?.fills)
  );
  const strokes = extractPaints(
    node.strokes,
    collector,
    buildPaintExtractionOptions(node.strokeStyleId, node.boundVariables?.strokes)
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
  const effectStyleRef = node.effectStyleId
    ? collector.registerStyle(node.effectStyleId)
    : undefined;
  const fillStyleRef = node.fillStyleId
    ? collector.registerStyle(node.fillStyleId)
    : undefined;
  const mainComponent = node.mainComponent
    ? extractMainComponent(node.mainComponent, collector)
    : undefined;
  const strokeStyleRef = node.strokeStyleId
    ? collector.registerStyle(node.strokeStyleId)
    : undefined;
  const variantProperties = extractVariantProperties(node);

  return {
    ...(node.type === "TEXT" ? extractTextContent(node, collector) : {}),
    ...(children?.length ? { children } : {}),
    ...(node.clipsContent !== undefined ? { clipsContent: node.clipsContent } : {}),
    ...(componentProperties ? { componentProperties } : {}),
    ...(node.componentPropertyReferences
      ? { componentPropertyReferences: node.componentPropertyReferences }
      : {}),
    ...(node.constraints ? { constraints: node.constraints } : {}),
    ...(node.cornerRadius !== undefined ? { cornerRadius: node.cornerRadius } : {}),
    ...(node.counterAxisAlignItems
      ? { counterAxisAlignItems: node.counterAxisAlignItems }
      : {}),
    ...(effectStyleRef ? { effectStyleRef } : {}),
    ...(effects ? { effects } : {}),
    ...(fillStyleRef ? { fillStyleRef } : {}),
    ...(fills ? { fills } : {}),
    ...(node.height !== undefined ? { height: node.height } : {}),
    id: node.id,
    ...(node.itemSpacing !== undefined ? { itemSpacing: node.itemSpacing } : {}),
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
    ...(node.opacity !== undefined ? { opacity: node.opacity } : {}),
    ...(node.paddingBottom !== undefined ? { paddingBottom: node.paddingBottom } : {}),
    ...(node.paddingLeft !== undefined ? { paddingLeft: node.paddingLeft } : {}),
    ...(node.paddingRight !== undefined ? { paddingRight: node.paddingRight } : {}),
    ...(node.paddingTop !== undefined ? { paddingTop: node.paddingTop } : {}),
    ...(node.primaryAxisAlignItems
      ? { primaryAxisAlignItems: node.primaryAxisAlignItems }
      : {}),
    ...(node.resolvedVariableModes
      ? { resolvedVariableModes: node.resolvedVariableModes }
      : {}),
    ...(node.rotation !== undefined ? { rotation: node.rotation } : {}),
    ...(node.strokeAlign ? { strokeAlign: node.strokeAlign } : {}),
    ...(strokeStyleRef ? { strokeStyleRef } : {}),
    ...(node.strokeWeight !== undefined ? { strokeWeight: node.strokeWeight } : {}),
    ...(strokes ? { strokes } : {}),
    ...(node.topLeftRadius !== undefined ? { topLeftRadius: node.topLeftRadius } : {}),
    ...(node.topRightRadius !== undefined
      ? { topRightRadius: node.topRightRadius }
      : {}),
    ...(node.bottomRightRadius !== undefined
      ? { bottomRightRadius: node.bottomRightRadius }
      : {}),
    ...(node.bottomLeftRadius !== undefined
      ? { bottomLeftRadius: node.bottomLeftRadius }
      : {}),
    type: node.type,
    ...(variantProperties ? { variantProperties } : {}),
    ...(node.visible !== undefined ? { visible: node.visible } : {}),
    ...(node.width !== undefined ? { width: node.width } : {}),
    ...(node.x !== undefined ? { x: node.x } : {}),
    ...(node.y !== undefined ? { y: node.y } : {})
  };
}
