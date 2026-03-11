import { createDesignDocument } from "@vibe-figma/capture-core";
import {
  createEmptyRegistries,
  createRegistryRef,
  type ComponentPropertyValue,
  type DesignDocument,
  type DesignNode,
  type DesignRegistries,
  type PaintValue
} from "@vibe-figma/schema";

import type {
  BuildSelectionCaptureInput,
  FigmaComponentLike,
  FigmaComponentPropertyDefinitionLike,
  FigmaComponentPropertyLike,
  FigmaEffectLike,
  FigmaNodeLike,
  FigmaPaintLike
} from "./model.js";

type LayoutAlignItems = "start" | "end" | "center" | "stretch" | "baseline";
type LayoutJustifyContent = "start" | "end" | "center" | "space-between";
type LayoutSizingMode = "fixed" | "fill" | "hug";
type TextAutoResizeMode = "fixed" | "height" | "width-and-height";

function mapNodeKind(type: string): DesignNode["kind"] {
  switch (type) {
    case "FRAME":
      return "frame";
    case "GROUP":
      return "group";
    case "SECTION":
      return "section";
    case "INSTANCE":
      return "instance";
    case "COMPONENT":
    case "COMPONENT_SET":
      return "component";
    case "TEXT":
      return "text";
    case "RECTANGLE":
    case "ELLIPSE":
    case "POLYGON":
    case "STAR":
    case "LINE":
      return "shape";
    case "VECTOR":
      return "vector";
    case "BOOLEAN_OPERATION":
      return "boolean-operation";
    default:
      return "unknown";
  }
}

function colorToHex(
  color: NonNullable<FigmaPaintLike["color"]>,
  opacity?: number
): string {
  const channel = (value: number) =>
    Math.round(Math.max(0, Math.min(value, 1)) * 255)
      .toString(16)
      .padStart(2, "0");
  const alpha =
    opacity === undefined ? "" : channel(Math.max(0, Math.min(opacity, 1)));

  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}${alpha}`;
}

function mapPaint(paint: FigmaPaintLike): PaintValue {
  if (paint.type === "SOLID") {
    return {
      fallback: paint.fallback ?? (paint.color ? colorToHex(paint.color, paint.opacity) : undefined),
      kind: "solid",
      ...(paint.styleRef ? { styleRef: paint.styleRef } : {}),
      ...(paint.tokenRef ? { tokenRef: paint.tokenRef } : {})
    };
  }

  if (paint.type === "IMAGE") {
    return {
      fallback:
        paint.fallback ??
        {
          ...(paint.assetRef ? { assetRef: paint.assetRef } : {}),
          ...(paint.scaleMode ? { scaleMode: paint.scaleMode } : {})
        },
      kind: "image",
      ...(paint.styleRef ? { styleRef: paint.styleRef } : {}),
      ...(paint.tokenRef ? { tokenRef: paint.tokenRef } : {})
    };
  }

  return {
    fallback: paint.fallback,
    kind: "gradient",
    ...(paint.styleRef ? { styleRef: paint.styleRef } : {}),
    ...(paint.tokenRef ? { tokenRef: paint.tokenRef } : {})
  };
}

function mapEffect(effect: FigmaEffectLike) {
  return {
    fallback: effect.fallback,
    ...(effect.styleRef ? { styleRef: effect.styleRef } : {}),
    ...(effect.tokenRef ? { tokenRef: effect.tokenRef } : {}),
    type: effect.type
  };
}

function mapComponentPropertyValue(
  property: FigmaComponentPropertyLike
): ComponentPropertyValue {
  return {
    type: property.type,
    value: property.value,
    ...(property.variableRef ? { variableRef: property.variableRef } : {})
  };
}

function roundGeometryValue(value: number): number {
  const rounded = Math.round(value * 100) / 100;

  return Object.is(rounded, -0) ? 0 : rounded;
}

function normalizeOptionalNumber(value: number | undefined): number | undefined {
  return value === undefined ? undefined : roundGeometryValue(value);
}

function hasNonDefaultObjectValue(value: Record<string, number | undefined>): boolean {
  return Object.values(value).some((entry) => entry !== undefined && entry !== 0);
}

function mergeComponentPropertyDefinitions(
  node: FigmaNodeLike
): Record<string, FigmaComponentPropertyDefinitionLike> {
  return {
    ...(node.mainComponent?.componentSet?.properties ?? {}),
    ...(node.mainComponent?.properties ?? {})
  };
}

function isPropertyDefaultValue(
  property: FigmaComponentPropertyLike,
  definition: FigmaComponentPropertyDefinitionLike | undefined
): boolean {
  return definition?.defaultValue === property.value;
}

function buildSparseInstanceBinding(node: FigmaNodeLike): {
  properties?: Record<string, ComponentPropertyValue>;
  variant?: Record<string, string>;
} | undefined {
  const definitions = mergeComponentPropertyDefinitions(node);
  const componentProperties = node.componentProperties ?? {};
  const properties = Object.fromEntries(
    Object.entries(componentProperties)
      .filter(([name, property]) => {
        if (property.type === "VARIANT") {
          return false;
        }

        return (
          property.variableRef !== undefined ||
          !isPropertyDefaultValue(property, definitions[name])
        );
      })
      .map(([name, property]) => [name, mapComponentPropertyValue(property)])
  );
  const variant = Object.fromEntries(
    Object.entries(componentProperties)
      .filter(
        ([name, property]) =>
          property.type === "VARIANT" &&
          typeof property.value === "string" &&
          !isPropertyDefaultValue(property, definitions[name])
      )
      .map(([name, property]) => [name, property.value as string] as const)
  );
  const fallbackVariant =
    Object.keys(componentProperties).length === 0
    ? node.variantProperties
    : undefined;

  return Object.keys(properties).length > 0 || Object.keys(variant).length > 0
    ? {
        ...(Object.keys(properties).length > 0 ? { properties } : {}),
        ...(Object.keys(variant).length > 0 ? { variant } : {})
      }
    : fallbackVariant && Object.keys(fallbackVariant).length > 0
      ? { variant: fallbackVariant }
    : undefined;
}

function resolveComponentRef(mainComponent: FigmaComponentLike): string {
  return createRegistryRef(
    "component",
    mainComponent.key ?? mainComponent.id ?? mainComponent.name
  );
}

function resolveComponentSetRef(
  mainComponent: FigmaComponentLike
): string | undefined {
  const componentSet = mainComponent.componentSet;

  if (!componentSet) {
    return undefined;
  }

  return createRegistryRef("component-set", componentSet.key ?? componentSet.name);
}

function mergeRegistries(
  left: DesignRegistries,
  right?: Partial<DesignRegistries>
): DesignRegistries {
  return {
    assets: { ...left.assets, ...(right?.assets ?? {}) },
    componentSets: { ...left.componentSets, ...(right?.componentSets ?? {}) },
    components: { ...left.components, ...(right?.components ?? {}) },
    icons: { ...left.icons, ...(right?.icons ?? {}) },
    styles: { ...left.styles, ...(right?.styles ?? {}) },
    variables: { ...left.variables, ...(right?.variables ?? {}) }
  };
}

function buildRegistries(selection: readonly FigmaNodeLike[]): DesignRegistries {
  const registries = createEmptyRegistries();

  const visit = (node: FigmaNodeLike) => {
    if (node.mainComponent) {
      const componentRef = resolveComponentRef(node.mainComponent);
      const componentSetRef = resolveComponentSetRef(node.mainComponent);

      registries.components[componentRef] = {
        ...(componentSetRef ? { componentSetRef } : {}),
        ...(node.mainComponent.key ? { key: node.mainComponent.key } : {}),
        ...(node.mainComponent.libraryName
          ? { library: { name: node.mainComponent.libraryName } }
          : {}),
        name: node.mainComponent.name,
        ref: componentRef,
        ...(node.mainComponent.remote !== undefined
          ? { remote: node.mainComponent.remote }
          : {})
      };

      if (node.mainComponent.componentSet && componentSetRef) {
        registries.componentSets[componentSetRef] = {
          ...(node.mainComponent.componentSet.key
            ? { key: node.mainComponent.componentSet.key }
            : {}),
          name: node.mainComponent.componentSet.name,
          ref: componentSetRef,
          ...(node.mainComponent.componentSet.remote !== undefined
            ? { remote: node.mainComponent.componentSet.remote }
            : {})
        };
      }
    }

    node.children?.forEach(visit);
  };

  selection.forEach(visit);

  return registries;
}

function mapJustifyContent(
  value: FigmaNodeLike["primaryAxisAlignItems"]
): LayoutJustifyContent | undefined {
  switch (value) {
    case "MIN":
      return "start";
    case "MAX":
      return "end";
    case "CENTER":
      return "center";
    case "SPACE_BETWEEN":
      return "space-between";
    default:
      return undefined;
  }
}

function mapAlignItems(
  value: FigmaNodeLike["counterAxisAlignItems"]
): LayoutAlignItems | undefined {
  switch (value) {
    case "MIN":
      return "start";
    case "MAX":
      return "end";
    case "CENTER":
      return "center";
    case "BASELINE":
      return "baseline";
    default:
      return undefined;
  }
}

function mapSizing(
  value: FigmaNodeLike["layoutSizingHorizontal"] | FigmaNodeLike["layoutSizingVertical"]
): LayoutSizingMode | undefined {
  switch (value) {
    case "FIXED":
      return "fixed";
    case "FILL":
      return "fill";
    case "HUG":
      return "hug";
    default:
      return undefined;
  }
}

function mapTextAutoResize(
  value: FigmaNodeLike["textAutoResize"]
): TextAutoResizeMode | undefined {
  switch (value) {
    case "HEIGHT":
      return "height";
    case "WIDTH_AND_HEIGHT":
      return "width-and-height";
    case "NONE":
    case "TRUNCATE":
      return "fixed";
    default:
      return undefined;
  }
}

function buildDesignSystemBinding(node: FigmaNodeLike) {
  const baseBinding = {
    ...(node.componentPropertyReferences
      ? { componentPropertyReferences: node.componentPropertyReferences }
      : {}),
    ...(node.resolvedVariableModes
      ? { resolvedVariableModes: node.resolvedVariableModes }
      : {})
  };
  if (node.type !== "INSTANCE" || !node.mainComponent) {
    return Object.keys(baseBinding).length > 0 ? baseBinding : undefined;
  }

  const sparseInstanceBinding = buildSparseInstanceBinding(node);

  return {
    ...baseBinding,
    componentRef: resolveComponentRef(node.mainComponent),
    ...(sparseInstanceBinding ? { instance: sparseInstanceBinding } : {})
  };
}

export function adaptFigmaNode(node: FigmaNodeLike): DesignNode {
  const designSystem = buildDesignSystemBinding(node);
  const fills = node.fills?.map((paint) => mapPaint(paint));
  const strokes = node.strokes?.map((paint) => mapPaint(paint));
  const kind = mapNodeKind(node.type);
  const padding = {
    ...(normalizeOptionalNumber(node.paddingBottom) &&
    normalizeOptionalNumber(node.paddingBottom) !== 0
      ? { bottom: normalizeOptionalNumber(node.paddingBottom) }
      : {}),
    ...(normalizeOptionalNumber(node.paddingLeft) &&
    normalizeOptionalNumber(node.paddingLeft) !== 0
      ? { left: normalizeOptionalNumber(node.paddingLeft) }
      : {}),
    ...(normalizeOptionalNumber(node.paddingRight) &&
    normalizeOptionalNumber(node.paddingRight) !== 0
      ? { right: normalizeOptionalNumber(node.paddingRight) }
      : {}),
    ...(normalizeOptionalNumber(node.paddingTop) &&
    normalizeOptionalNumber(node.paddingTop) !== 0
      ? { top: normalizeOptionalNumber(node.paddingTop) }
      : {})
  };
  const isUnknownType = kind === "unknown";

  return {
    ...(node.width !== undefined ||
    node.height !== undefined ||
    node.x !== undefined ||
    node.y !== undefined ||
    node.rotation !== undefined
      ? {
          bounds: {
            ...(node.height !== undefined
              ? { height: roundGeometryValue(node.height) }
              : {}),
            ...(node.rotation !== undefined && node.rotation !== 0
              ? { rotation: roundGeometryValue(node.rotation) }
              : {}),
            ...(node.width !== undefined
              ? { width: roundGeometryValue(node.width) }
              : {}),
            ...(node.x !== undefined ? { x: roundGeometryValue(node.x) } : {}),
            ...(node.y !== undefined ? { y: roundGeometryValue(node.y) } : {})
          }
        }
      : {}),
    ...(node.children?.length
      ? { children: node.children.map((child) => adaptFigmaNode(child)) }
      : {}),
    ...(node.type === "TEXT" && node.characters !== undefined
      ? {
          content: {
            text: {
              ...(node.fills?.length
                ? { fill: node.fills.map((paint) => mapPaint(paint)) }
                : {}),
              alignment: {
                ...(node.textAlignHorizontal
                  ? {
                      horizontal: node.textAlignHorizontal.toLowerCase() as
                        | "left"
                        | "center"
                        | "right"
                        | "justified"
                    }
                  : {}),
                ...(node.textAlignVertical
                  ? {
                      vertical: node.textAlignVertical.toLowerCase() as
                        | "top"
                        | "center"
                        | "bottom"
                    }
                  : {})
              },
              ...(mapTextAutoResize(node.textAutoResize)
                ? { autoResize: mapTextAutoResize(node.textAutoResize) }
                : {}),
              characters: node.characters,
              ...(node.maxLines !== null && node.maxLines !== undefined
                ? { maxLines: node.maxLines }
                : {}),
              ...(node.textStyleRef ? { textStyleRef: node.textStyleRef } : {})
            }
          }
        }
      : {}),
    ...(designSystem ? { designSystem } : {}),
    ...(fills?.length ||
    strokes?.length ||
    node.cornerRadius !== undefined ||
    node.topLeftRadius !== undefined ||
    node.topRightRadius !== undefined ||
    node.bottomRightRadius !== undefined ||
    node.bottomLeftRadius !== undefined ||
    node.effects?.length ||
    node.opacity !== undefined
      ? {
          appearance: {
            ...(fills?.length ? { background: fills } : {}),
            ...(node.effects?.length
              ? { effects: node.effects.map((effect) => mapEffect(effect)) }
              : {}),
            ...(node.opacity !== undefined ? { opacity: node.opacity } : {}),
            ...(node.cornerRadius !== undefined
              ? {
                  radius: {
                    mode: "uniform",
                    value: roundGeometryValue(node.cornerRadius)
                  }
                }
              : node.topLeftRadius !== undefined ||
                  node.topRightRadius !== undefined ||
                  node.bottomRightRadius !== undefined ||
                  node.bottomLeftRadius !== undefined
                ? {
                    radius: {
                      bottomLeft: roundGeometryValue(node.bottomLeftRadius ?? 0),
                      bottomRight: roundGeometryValue(node.bottomRightRadius ?? 0),
                      mode: "corners",
                      topLeft: roundGeometryValue(node.topLeftRadius ?? 0),
                      topRight: roundGeometryValue(node.topRightRadius ?? 0)
                    }
                  }
                : {}),
            ...(strokes?.length
              ? {
                  stroke: [
                    {
                      ...(node.strokeAlign
                        ? {
                            align: node.strokeAlign.toLowerCase() as
                              | "inside"
                              | "center"
                              | "outside"
                          }
                        : {}),
                      paints: strokes,
                      ...(node.strokeWeight !== undefined
                        ? { width: roundGeometryValue(node.strokeWeight) }
                        : {})
                    }
                  ]
                }
              : {})
          }
        }
      : {}),
    ...(isUnknownType ? { figmaType: node.type } : {}),
    kind,
    ...(node.layoutMode ||
    node.layoutPositioning ||
    node.itemSpacing !== undefined ||
    node.paddingTop !== undefined ||
    node.paddingRight !== undefined ||
    node.paddingBottom !== undefined ||
    node.paddingLeft !== undefined ||
    node.primaryAxisAlignItems ||
    node.counterAxisAlignItems ||
    node.layoutSizingHorizontal ||
    node.layoutSizingVertical ||
    node.layoutWrap ||
    node.constraints ||
    node.clipsContent
      ? {
          layout: {
            ...((mapJustifyContent(node.primaryAxisAlignItems) ||
            mapAlignItems(node.counterAxisAlignItems))
              ? {
                  align: {
                    ...(mapAlignItems(node.counterAxisAlignItems)
                      ? { alignItems: mapAlignItems(node.counterAxisAlignItems) }
                      : {}),
                    ...(mapJustifyContent(node.primaryAxisAlignItems)
                      ? {
                          justifyContent: mapJustifyContent(
                            node.primaryAxisAlignItems
                          )
                        }
                      : {})
                  }
                }
              : {}),
            ...(node.constraints ? { constraints: node.constraints } : {}),
            ...(node.itemSpacing !== undefined && node.itemSpacing !== 0
              ? { gap: roundGeometryValue(node.itemSpacing) }
              : {}),
            ...(node.layoutMode
              ? {
                  mode:
                    node.layoutMode === "HORIZONTAL"
                      ? "row"
                      : node.layoutMode === "VERTICAL"
                        ? "column"
                        : "none"
                }
              : {}),
            ...((mapSizing(node.layoutSizingHorizontal) ||
            mapSizing(node.layoutSizingVertical))
              ? {
                  sizing: {
                    ...(mapSizing(node.layoutSizingHorizontal)
                      ? {
                          horizontal: mapSizing(node.layoutSizingHorizontal)
                        }
                      : {}),
                    ...(mapSizing(node.layoutSizingVertical)
                      ? { vertical: mapSizing(node.layoutSizingVertical) }
                      : {})
                  }
                }
              : {}),
            ...(node.layoutPositioning === "ABSOLUTE"
              ? { position: "absolute" as const }
              : {}),
            ...(hasNonDefaultObjectValue(padding) ? { padding } : {}),
            ...(node.layoutWrap === "WRAP" ? { wrap: true } : {}),
            ...(node.clipsContent
              ? {
                  overflow: {
                    x: "hidden",
                    y: "hidden"
                  }
                }
              : {})
          }
        }
      : {}),
    ...(node.locked ? { locked: true } : {}),
    name: node.name,
    pluginNodeId: node.id,
    ...(node.visible !== undefined ? { visible: node.visible } : {})
  };
}

export function buildSelectionCapture(
  input: BuildSelectionCaptureInput
): DesignDocument {
  const roots = input.selection.map((node) => adaptFigmaNode(node));
  const extractedRegistries = buildRegistries(input.selection);

  return createDesignDocument({
    capture: {
      editorType: "figma",
      options: {
        captureScope: "selection",
        expandInstances: false
      },
      page: input.page,
      pluginVersion: input.pluginVersion,
      selection: input.selection.map((node) => ({
        id: node.id,
        name: node.name,
        type: node.type
      })),
      ...(input.sourceFileKey ? { sourceFileKey: input.sourceFileKey } : {}),
      timestamp: input.timestamp ?? new Date().toISOString()
    },
    registries: mergeRegistries(extractedRegistries, input.registries),
    roots
  });
}
