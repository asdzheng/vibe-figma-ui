import {
  designDocumentV0_2Schema,
  type CanonicalTokenOrValue,
  type DesignDocumentV0_1,
  type DesignDocumentV0_2,
  type DesignNode,
  type DesignNodeV0_2,
  type PaintValue,
  type RadiusValue
} from "@vibe-figma/schema";

const CANONICAL_NOISE_NAMES = new Set([
  "assistive chips",
  "content",
  "details",
  "headline and reviews",
  "image",
  "leading element",
  "reviews stars",
  "state-layer",
  "supporting text",
  "title & subtitle",
  "trailing element"
]);

function stripPropertySuffix(value: string): string {
  return value.replace(/#.*$/, "").trim();
}

function rgbToHex(color: {
  b: number;
  g: number;
  r: number;
}): string {
  const toHex = (value: number): string =>
    Math.round(value * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

function extractFallbackHex(fallback: unknown): string | undefined {
  if (typeof fallback === "string" && fallback.startsWith("#")) {
    return fallback;
  }

  if (!fallback || typeof fallback !== "object" || !("paints" in fallback)) {
    return undefined;
  }

  const paints = fallback.paints;

  if (!Array.isArray(paints) || paints.length === 0) {
    return undefined;
  }

  const [firstPaint] = paints;

  if (
    !firstPaint ||
    typeof firstPaint !== "object" ||
    !("type" in firstPaint) ||
    firstPaint.type !== "SOLID" ||
    !("color" in firstPaint) ||
    !firstPaint.color ||
    typeof firstPaint.color !== "object"
  ) {
    return undefined;
  }

  const color = firstPaint.color;

  if (!("r" in color) || !("g" in color) || !("b" in color)) {
    return undefined;
  }

  return rgbToHex({
    b: Number(color.b),
    g: Number(color.g),
    r: Number(color.r)
  });
}

function resolvePaintValue(
  document: DesignDocumentV0_1,
  paint: PaintValue
): CanonicalTokenOrValue | undefined {
  const directFallback = extractFallbackHex(paint.fallback);

  if (directFallback) {
    return directFallback;
  }

  if (paint.styleRef) {
    const style = document.registries.styles[paint.styleRef];
    const styleFallback = extractFallbackHex(style?.fallback);

    if (styleFallback) {
      return styleFallback;
    }
  }

  return undefined;
}

function resolvePaintGroup(
  document: DesignDocumentV0_1,
  paints: readonly PaintValue[] | undefined
): CanonicalTokenOrValue | CanonicalTokenOrValue[] | undefined {
  const values = paints
    ?.map((paint) => resolvePaintValue(document, paint))
    .filter((value): value is CanonicalTokenOrValue => value !== undefined);

  if (!values || values.length === 0) {
    return undefined;
  }

  return values.length === 1 ? values[0] : values;
}

function compressRadius(
  radius: RadiusValue | undefined
): number | [number, number] | [number, number, number, number] | undefined {
  if (!radius) {
    return undefined;
  }

  if (radius.mode === "uniform") {
    return radius.value > 0 ? radius.value : undefined;
  }

  const corners = [
    radius.topLeft,
    radius.topRight,
    radius.bottomRight,
    radius.bottomLeft
  ] as const;

  if (corners.every((value) => value === 0)) {
    return undefined;
  }

  if (corners.every((value) => value === corners[0])) {
    return corners[0];
  }

  if (
    radius.topLeft === radius.bottomRight &&
    radius.topRight === radius.bottomLeft
  ) {
    return [radius.topLeft, radius.topRight];
  }

  return [
    radius.topLeft,
    radius.topRight,
    radius.bottomRight,
    radius.bottomLeft
  ];
}

function compressPadding(
  padding:
    | {
        bottom?: number | undefined;
        left?: number | undefined;
        right?: number | undefined;
        top?: number | undefined;
      }
    | undefined
): number | [number, number] | [number, number, number, number] | undefined {
  if (!padding) {
    return undefined;
  }

  const top = padding.top ?? 0;
  const right = padding.right ?? 0;
  const bottom = padding.bottom ?? 0;
  const left = padding.left ?? 0;

  if ([top, right, bottom, left].every((value) => value === 0)) {
    return undefined;
  }

  if (top === right && right === bottom && bottom === left) {
    return top;
  }

  if (top === bottom && right === left) {
    return [top, right];
  }

  return [top, right, bottom, left];
}

function resolveScroll(
  overflow:
    | {
        x?: "visible" | "scroll" | "hidden" | undefined;
        y?: "visible" | "scroll" | "hidden" | undefined;
      }
    | undefined
): "x" | "y" | "both" | undefined {
  const scrollX = overflow?.x === "scroll";
  const scrollY = overflow?.y === "scroll";

  if (scrollX && scrollY) {
    return "both";
  }

  if (scrollX) {
    return "x";
  }

  if (scrollY) {
    return "y";
  }

  return undefined;
}

function shouldKeepSize(node: DesignNode, isRoot: boolean): boolean {
  if (isRoot) {
    return true;
  }

  if (node.layout?.position === "absolute") {
    return true;
  }

  if (node.kind === "image" || node.kind === "icon" || node.kind === "shape") {
    return true;
  }

  if (node.kind === "text" && node.content?.text?.autoResize === "fixed") {
    return true;
  }

  return false;
}

function resolveSize(
  node: DesignNode,
  isRoot: boolean
): DesignNodeV0_2["size"] | undefined {
  if (!node.bounds || !shouldKeepSize(node, isRoot)) {
    return undefined;
  }

  return {
    ...(node.bounds.width !== undefined ? { width: node.bounds.width } : {}),
    ...(node.bounds.height !== undefined ? { height: node.bounds.height } : {})
  };
}

function resolveLayout(node: DesignNode): DesignNodeV0_2["layout"] | undefined {
  const flow =
    node.layout?.mode === "row" || node.layout?.mode === "column"
      ? node.layout.mode
      : undefined;
  const justifyContent = node.layout?.align?.justifyContent;
  const padding = compressPadding(node.layout?.padding);
  const scroll = resolveScroll(node.layout?.overflow);
  const justify =
    justifyContent === "space-between"
      ? "between"
      : justifyContent === "start" ||
          justifyContent === "end" ||
          justifyContent === "center"
        ? justifyContent
        : undefined;
  const align: NonNullable<DesignNodeV0_2["layout"]>["align"] = {
    ...(node.layout?.align?.alignItems &&
    node.layout.align.alignItems !== "start"
      ? { items: node.layout.align.alignItems }
      : {}),
    ...(justify && justify !== "start" ? { justify } : {})
  };

  return {
    ...(flow ? { flow } : {}),
    ...(Object.keys(align).length > 0 ? { align } : {}),
    ...(node.layout?.gap && node.layout.gap > 0 ? { gap: node.layout.gap } : {}),
    ...(padding ? { pad: padding } : {}),
    ...(node.layout?.sizing
      ? {
          sizing: {
            ...(node.layout.sizing.horizontal
              ? { width: node.layout.sizing.horizontal }
              : {}),
            ...(node.layout.sizing.vertical
              ? { height: node.layout.sizing.vertical }
              : {})
          }
        }
      : {}),
    ...(node.layout?.position === "absolute" &&
    (node.bounds?.x !== undefined || node.bounds?.y !== undefined)
      ? {
          absolute: {
            x: node.bounds?.x ?? 0,
            y: node.bounds?.y ?? 0
          }
        }
      : {}),
    ...(scroll ? { scroll } : {})
  };
}

function resolveStyle(
  document: DesignDocumentV0_1,
  node: DesignNode
): DesignNodeV0_2["style"] | undefined {
  const fill =
    node.kind === "text"
      ? undefined
      : resolvePaintGroup(document, node.appearance?.background);
  const stroke = node.appearance?.stroke?.[0];
  const strokeColor = stroke
    ? resolvePaintGroup(document, stroke.paints)
    : undefined;
  const textColor =
    node.kind === "text"
      ? (resolvePaintGroup(
          document,
          node.content?.text?.fill
        ) as CanonicalTokenOrValue | undefined)
      : undefined;
  const textStyle =
    node.content?.text?.textStyleRef
      ? document.registries.styles[node.content.text.textStyleRef]?.name
      : undefined;

  return {
    ...(fill ? { fill } : {}),
    ...(textColor ? { textColor } : {}),
    ...(strokeColor && !Array.isArray(strokeColor)
      ? {
          stroke: {
            color: strokeColor,
            ...(stroke?.width !== undefined && stroke.width !== 1
              ? { width: stroke.width }
              : {})
          }
        }
      : {}),
    ...(compressRadius(node.appearance?.radius)
      ? { radius: compressRadius(node.appearance?.radius) }
      : {}),
    ...(node.appearance?.opacity !== undefined && node.appearance.opacity !== 1
      ? { opacity: node.appearance.opacity }
      : {}),
    ...(textStyle ? { textStyle } : {})
  };
}

function resolveComponentUse(
  document: DesignDocumentV0_1,
  node: DesignNode
): DesignNodeV0_2["component"] | undefined {
  const componentRef = node.designSystem?.componentRef;

  if (!componentRef) {
    return undefined;
  }

  const component = document.registries.components[componentRef];
  const componentSet = component?.componentSetRef
    ? document.registries.componentSets[component.componentSetRef]
    : undefined;
  const props = Object.fromEntries(
    [
      ...Object.entries(node.designSystem?.instance?.properties ?? {}).map(
        ([name, value]) => [stripPropertySuffix(name), value.value] as const
      ),
      ...Object.entries(node.designSystem?.instance?.overrides ?? {}).map(
        ([name, value]) => [stripPropertySuffix(name), value.value] as const
      )
    ].filter(([, value]) => value !== undefined)
  );
  const variant = Object.fromEntries(
    Object.entries(node.designSystem?.instance?.variant ?? {}).map(([name, value]) => [
      stripPropertySuffix(name),
      value
    ])
  );

  const componentUse: Exclude<DesignNodeV0_2["component"], string | undefined> = {
    ...(component?.library?.name ? { library: component.library.name } : {}),
    name: componentSet?.name ?? component?.name ?? node.name,
    ...(Object.keys(props).length > 0 ? { props } : {}),
    ...(!component ? { status: "unmapped" as const } : {}),
    ...(Object.keys(variant).length > 0 ? { variant } : {})
  };

  const compactKeys = Object.keys(componentUse);

  return compactKeys.length === 1 && "name" in componentUse
    ? componentUse.name
    : componentUse;
}

function resolveText(node: DesignNode): DesignNodeV0_2["text"] | undefined {
  if (!node.content?.text) {
    return undefined;
  }

  return node.content.text.maxLines
    ? {
        lines: node.content.text.maxLines,
        value: node.content.text.characters
      }
    : node.content.text.characters;
}

function isCanonicalNoiseName(name: string): boolean {
  return CANONICAL_NOISE_NAMES.has(name.trim().toLowerCase());
}

function shouldKeepName(node: DesignNode, isRoot: boolean): boolean {
  if (isRoot) {
    return true;
  }

  if (node.kind === "instance" && node.designSystem?.componentRef) {
    return false;
  }

  if (
    (node.kind === "frame" ||
      node.kind === "group" ||
      node.kind === "image" ||
      node.kind === "shape") &&
    isCanonicalNoiseName(node.name)
  ) {
    return false;
  }

  return node.kind !== "text";
}

function convertNode(
  document: DesignDocumentV0_1,
  node: DesignNode,
  isRoot: boolean
): DesignNodeV0_2 {
  const component = resolveComponentUse(document, node);
  const layout = resolveLayout(node);
  const size = resolveSize(node, isRoot);
  const style = resolveStyle(document, node);
  const text = resolveText(node);

  return {
    ...(isRoot ? { id: node.pluginNodeId } : {}),
    kind: node.kind,
    ...(shouldKeepName(node, isRoot) ? { name: node.name } : {}),
    ...(component ? { component } : {}),
    ...(layout && Object.keys(layout).length > 0 ? { layout } : {}),
    ...(size ? { size } : {}),
    ...(style && Object.keys(style).length > 0 ? { style } : {}),
    ...(text ? { text } : {}),
    ...(node.content?.image
      ? {
          image: {
            ...(node.content.image.scaleMode ? { fit: node.content.image.scaleMode } : {}),
            ...(node.content.image.assetRef
              ? { source: node.content.image.assetRef }
              : {})
          }
        }
      : {}),
    ...(node.children?.length
      ? {
          children: node.children.map((child) =>
            convertNode(document, child, false)
          )
        }
      : {})
  };
}

export function convertDesignDocumentToV0_2(
  document: DesignDocumentV0_1
): DesignDocumentV0_2 {
  return designDocumentV0_2Schema.parse({
    capture: {
      page: document.capture.page.name,
      roots: document.capture.selection.map((entry) => entry.id),
      scope: document.capture.options.captureScope
    },
    profile: "canonical",
    roots: document.roots.map((root) => convertNode(document, root, true)),
    schemaVersion: "0.2",
    ...(document.diagnostics.warnings.length > 0
      ? {
          warnings: document.diagnostics.warnings.map((warning) =>
            typeof warning === "string" ? warning : warning.message
          )
        }
      : {})
  });
}
