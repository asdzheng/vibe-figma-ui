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

export type FigmaPaintLike = {
  assetRef?: string;
  color?: {
    b: number;
    g: number;
    r: number;
  };
  opacity?: number;
  styleRef?: string;
  tokenRef?: string | string[];
  type: "SOLID" | "GRADIENT" | "IMAGE";
};

export type FigmaComponentLike = {
  componentSet?: {
    key?: string;
    name: string;
    remote?: boolean;
  };
  id?: string;
  key?: string;
  libraryName?: string;
  name: string;
  remote?: boolean;
};

export type FigmaComponentPropertyLike = {
  type: ComponentPropertyValue["type"];
  value: string | boolean;
  variableRef?: string;
};

export type FigmaNodeLike = {
  characters?: string;
  children?: readonly FigmaNodeLike[];
  componentProperties?: Record<string, FigmaComponentPropertyLike>;
  cornerRadius?: number;
  fills?: readonly FigmaPaintLike[];
  height?: number;
  id: string;
  itemSpacing?: number;
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
  layoutPositioning?: "AUTO" | "ABSOLUTE";
  locked?: boolean;
  mainComponent?: FigmaComponentLike;
  name: string;
  opacity?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  rotation?: number;
  strokes?: readonly FigmaPaintLike[];
  strokeAlign?: "INSIDE" | "CENTER" | "OUTSIDE";
  strokeWeight?: number;
  textAlignHorizontal?: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";
  textAlignVertical?: "TOP" | "CENTER" | "BOTTOM";
  textStyleRef?: string;
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomLeftRadius?: number;
  bottomRightRadius?: number;
  type: string;
  variantProperties?: Record<string, string>;
  visible?: boolean;
  width?: number;
  x?: number;
  y?: number;
};

export type BuildSelectionCaptureInput = {
  page: {
    id: string;
    name: string;
  };
  pluginVersion: string;
  selection: readonly FigmaNodeLike[];
  sourceFileKey?: string;
  timestamp?: string;
};

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
      ...(paint.styleRef ? { styleRef: paint.styleRef } : {}),
      ...(paint.tokenRef ? { tokenRef: paint.tokenRef } : {}),
      fallback: paint.color ? colorToHex(paint.color, paint.opacity) : undefined,
      kind: "solid"
    };
  }

  if (paint.type === "IMAGE") {
    return {
      ...(paint.assetRef ? { fallback: { assetRef: paint.assetRef } } : {}),
      kind: "image"
    };
  }

  return {
    kind: "gradient"
  };
}

function mapComponentPropertyValue(
  property: FigmaComponentPropertyLike
): ComponentPropertyValue {
  return {
    type: property.type,
    value: property.value,
    variableRef: property.variableRef
  };
}

function resolveComponentRef(mainComponent: FigmaComponentLike): string {
  return createRegistryRef(
    "component",
    mainComponent.key ?? mainComponent.id ?? mainComponent.name
  );
}

function resolveComponentSetRef(mainComponent: FigmaComponentLike): string | undefined {
  const componentSet = mainComponent.componentSet;

  if (!componentSet) {
    return undefined;
  }

  return createRegistryRef("component-set", componentSet.key ?? componentSet.name);
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
        remote: node.mainComponent.remote
      };

      if (node.mainComponent.componentSet && componentSetRef) {
        registries.componentSets[componentSetRef] = {
          ...(node.mainComponent.componentSet.key
            ? { key: node.mainComponent.componentSet.key }
            : {}),
          name: node.mainComponent.componentSet.name,
          ref: componentSetRef,
          remote: node.mainComponent.componentSet.remote
        };
      }
    }

    node.children?.forEach(visit);
  };

  selection.forEach(visit);

  return registries;
}

export function adaptFigmaNode(node: FigmaNodeLike): DesignNode {
  const designSystem =
    node.type === "INSTANCE" && node.mainComponent
      ? {
          componentRef: resolveComponentRef(node.mainComponent),
          instance: {
            ...(node.componentProperties
              ? {
                  properties: Object.fromEntries(
                    Object.entries(node.componentProperties).map(
                      ([key, value]) => [key, mapComponentPropertyValue(value)]
                    )
                  )
                }
              : {}),
            ...(node.variantProperties ? { variant: node.variantProperties } : {})
          }
        }
      : undefined;

  return {
    ...(node.opacity !== undefined ? { appearance: { opacity: node.opacity } } : {}),
    ...(node.width !== undefined || node.height !== undefined || node.x !== undefined || node.y !== undefined
      ? {
          bounds: {
            ...(node.height !== undefined ? { height: node.height } : {}),
            ...(node.rotation ? { rotation: node.rotation } : {}),
            ...(node.width !== undefined ? { width: node.width } : {}),
            ...(node.x !== undefined ? { x: node.x } : {}),
            ...(node.y !== undefined ? { y: node.y } : {})
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
              ...(node.textStyleRef ? { textStyleRef: node.textStyleRef } : {}),
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
              characters: node.characters
            }
          }
        }
      : {}),
    ...(designSystem ? { designSystem } : {}),
    ...(node.fills?.length || node.strokes?.length || node.cornerRadius !== undefined
      ? {
          appearance: {
            ...(node.opacity !== undefined ? { opacity: node.opacity } : {}),
            ...(node.fills?.length
              ? { background: node.fills.map((paint) => mapPaint(paint)) }
              : {}),
            ...(node.strokes?.length
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
                      ...(node.strokeWeight !== undefined
                        ? { width: node.strokeWeight }
                        : {}),
                      paints: node.strokes.map((paint) => mapPaint(paint))
                    }
                  ]
                }
              : {}),
            ...(node.cornerRadius !== undefined
              ? {
                  radius: {
                    mode: "uniform",
                    value: node.cornerRadius
                  }
                }
              : node.topLeftRadius !== undefined ||
                  node.topRightRadius !== undefined ||
                  node.bottomRightRadius !== undefined ||
                  node.bottomLeftRadius !== undefined
                ? {
                    radius: {
                      bottomLeft: node.bottomLeftRadius ?? 0,
                      bottomRight: node.bottomRightRadius ?? 0,
                      mode: "corners",
                      topLeft: node.topLeftRadius ?? 0,
                      topRight: node.topRightRadius ?? 0
                    }
                  }
                : {})
          }
        }
      : {}),
    figmaType: node.type,
    kind: mapNodeKind(node.type),
    ...(node.layoutMode || node.layoutPositioning || node.itemSpacing !== undefined
      ? {
          layout: {
            ...(node.itemSpacing !== undefined ? { gap: node.itemSpacing } : {}),
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
            ...(node.layoutPositioning
              ? {
                  position:
                    node.layoutPositioning === "ABSOLUTE" ? "absolute" : "flow"
                }
              : {}),
            ...(node.paddingTop !== undefined ||
            node.paddingRight !== undefined ||
            node.paddingBottom !== undefined ||
            node.paddingLeft !== undefined
              ? {
                  padding: {
                    ...(node.paddingBottom !== undefined
                      ? { bottom: node.paddingBottom }
                      : {}),
                    ...(node.paddingLeft !== undefined
                      ? { left: node.paddingLeft }
                      : {}),
                    ...(node.paddingRight !== undefined
                      ? { right: node.paddingRight }
                      : {}),
                    ...(node.paddingTop !== undefined ? { top: node.paddingTop } : {})
                  }
                }
              : {})
          }
        }
      : {}),
    ...(node.locked !== undefined ? { locked: node.locked } : {}),
    name: node.name,
    pluginNodeId: node.id,
    restNodeId: node.id,
    ...(node.visible !== undefined ? { visible: node.visible } : {})
  };
}

export function buildSelectionCapture(
  input: BuildSelectionCaptureInput
): DesignDocument {
  const roots = input.selection.map((node) => adaptFigmaNode(node));

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
    registries: buildRegistries(input.selection),
    roots
  });
}
