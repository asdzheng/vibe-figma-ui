import type {
  AnyDesignNode,
  CanonicalTokenOrValue,
  ComponentPropertyValue,
  DesignDocument,
  DesignNodeV0_2,
  PaintValue,
  RadiusValue,
  StyleRegistryEntry
} from "@vibe-figma/schema";
import { isDesignDocumentV0_1 } from "@vibe-figma/schema";

type DesignNode = AnyDesignNode;

const SNAPSHOT_MARGIN = 24;
const SNAPSHOT_GAP = 24;
const DEFAULT_FONT_FAMILY = "Roboto, Arial, sans-serif";
const FALLBACK_SURFACE = "#f5efe7";
const FALLBACK_STROKE = "#cbc4d0";
const FALLBACK_TEXT = "#1d1b20";
const FALLBACK_MUTED_TEXT = "#49454f";
const FALLBACK_TINT = "#e8def8";
const FALLBACK_PRIMARY = "#6750a4";

export type SnapshotRenderStats = {
  fallbackInstanceCount: number;
  materializedInstanceCount: number;
  nodeCount: number;
  textNodeCount: number;
  instanceCount: number;
};

export type SnapshotRenderResult = {
  height: number;
  stats: SnapshotRenderStats;
  svg: string;
  width: number;
};

type RenderContext = {
  defs: string[];
  document: DesignDocument;
  nextDefId: number;
  stats: SnapshotRenderStats;
};

type NodeSize = {
  height: number;
  width: number;
};

type NodePosition = {
  x: number;
  y: number;
};

type InstanceMetadata = {
  componentName: string;
  componentSetName: string | null;
};

type SnapshotComponentProperties = Record<string, string | boolean>;

type SnapshotVariantValues = Record<string, string | boolean>;

type PaintFill = {
  opacity?: number;
  value: string;
};

type TextAlignment = {
  horizontal: "center" | "left" | "right";
  vertical: "bottom" | "center" | "top";
};

type TextMetrics = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  lineHeight: number;
};

type LabelTextOptions = {
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  textAnchor?: "end" | "middle" | "start";
};

function isV02Node(node: DesignNode): node is DesignNodeV0_2 {
  return !("pluginNodeId" in node);
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function sanitizeVariantLabel(value: string): string {
  return value.replace(/#.*$/, "").trim();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getNodeSize(node: DesignNode, document?: DesignDocument): NodeSize {
  const sizeHint = document ? getIntrinsicNodeSize(document, node) : null;
  const width = isV02Node(node)
    ? node.size?.width ?? sizeHint?.width ?? 320
    : node.bounds?.width ?? sizeHint?.width ?? 320;
  const height = isV02Node(node)
    ? node.size?.height ?? sizeHint?.height ?? 120
    : node.bounds?.height ?? sizeHint?.height ?? 120;

  return {
    height: Math.max(height, 1),
    width: Math.max(width, 1)
  };
}

function getNodePosition(node: DesignNode): { x: number; y: number } {
  if (isV02Node(node)) {
    return {
      x: node.layout?.absolute?.x ?? 0,
      y: node.layout?.absolute?.y ?? 0
    };
  }

  return {
    x: node.bounds?.x ?? 0,
    y: node.bounds?.y ?? 0
  };
}

function getPadding(
  node: DesignNode
): { bottom: number; left: number; right: number; top: number } {
  if (isV02Node(node)) {
    const pad = node.layout?.pad;

    if (typeof pad === "number") {
      return {
        bottom: pad,
        left: pad,
        right: pad,
        top: pad
      };
    }

    if (Array.isArray(pad) && pad.length === 2) {
      return {
        bottom: pad[0],
        left: pad[1],
        right: pad[1],
        top: pad[0]
      };
    }

    if (Array.isArray(pad) && pad.length === 4) {
      return {
        bottom: pad[2],
        left: pad[3],
        right: pad[1],
        top: pad[0]
      };
    }
  }

  return {
    bottom: isV02Node(node) ? 0 : node.layout?.padding?.bottom ?? 0,
    left: isV02Node(node) ? 0 : node.layout?.padding?.left ?? 0,
    right: isV02Node(node) ? 0 : node.layout?.padding?.right ?? 0,
    top: isV02Node(node) ? 0 : node.layout?.padding?.top ?? 0
  };
}

function hasExplicitPosition(node: DesignNode): boolean {
  return isV02Node(node)
    ? node.layout?.absolute !== undefined
    : node.bounds?.x !== undefined || node.bounds?.y !== undefined;
}

function getFlowChildSize(
  parent: DesignNode,
  child: DesignNode,
  document: DesignDocument
): NodeSize {
  const parentLayoutMode = isV02Node(parent) ? parent.layout?.flow : parent.layout?.mode;
  const parentSize = getNodeSize(parent, document);
  const padding = getPadding(parent);
  const availableCrossSize =
    parentLayoutMode === "row"
      ? Math.max(parentSize.height - padding.top - padding.bottom, 0)
      : Math.max(parentSize.width - padding.left - padding.right, 0);
  const size = getNodeSize(child, document);

  if (!isV02Node(child)) {
    return size;
  }

  if (
    parentLayoutMode === "column" &&
    child.layout?.sizing?.width === "fill"
  ) {
    return {
      ...size,
      width: availableCrossSize
    };
  }

  if (
    parentLayoutMode === "row" &&
    child.layout?.sizing?.height === "fill"
  ) {
    return {
      ...size,
      height: availableCrossSize
    };
  }

  return size;
}

function getFlowLayoutPositions(
  parent: DesignNode,
  document: DesignDocument
): Map<DesignNode, NodePosition> {
  const layoutMode = isV02Node(parent) ? parent.layout?.flow : parent.layout?.mode;

  if (layoutMode !== "row" && layoutMode !== "column") {
    return new Map<DesignNode, NodePosition>();
  }

  const positions = new Map<DesignNode, NodePosition>();
  const flowChildren = (parent.children ?? []).filter(
    (child) =>
      (isV02Node(child) ? child.layout?.absolute === undefined : child.layout?.position !== "absolute") &&
      !hasExplicitPosition(child)
  );

  if (flowChildren.length === 0) {
    return positions;
  }

  const parentSize = getNodeSize(parent, document);
  const padding = getPadding(parent);
  const justifyContent = isV02Node(parent)
    ? parent.layout?.align?.justify ?? "start"
    : parent.layout?.align?.justifyContent ?? "start";
  const alignItems = isV02Node(parent)
    ? parent.layout?.align?.items ?? "start"
    : parent.layout?.align?.alignItems ?? "start";
  const isRow = layoutMode === "row";
  const gap = parent.layout?.gap ?? 0;
  const childSizes = new Map(flowChildren.map((child) => [child, getFlowChildSize(parent, child, document)]));
  const totalMainSize = flowChildren.reduce((sum, child) => {
    const size = childSizes.get(child) ?? getNodeSize(child, document);

    return sum + (isRow ? size.width : size.height);
  }, 0);
  const availableMainSize = Math.max(
    (isRow
      ? parentSize.width - padding.left - padding.right
      : parentSize.height - padding.top - padding.bottom),
    0
  );
  const baseGapTotal = Math.max(flowChildren.length - 1, 0) * gap;
  const contentMainSize = totalMainSize + baseGapTotal;
  const dynamicGap =
    (justifyContent === "space-between" || justifyContent === "between") &&
    flowChildren.length > 1
      ? Math.max((availableMainSize - totalMainSize) / (flowChildren.length - 1), 0)
      : gap;
  const startMainOffset =
    justifyContent === "end"
      ? Math.max(availableMainSize - contentMainSize, 0)
      : justifyContent === "center"
        ? Math.max((availableMainSize - contentMainSize) / 2, 0)
        : 0;

  let cursor = (isRow ? padding.left : padding.top) + startMainOffset;

  for (const child of flowChildren) {
    const size = childSizes.get(child) ?? getNodeSize(child, document);
    const availableCrossSize = Math.max(
      (isRow
        ? parentSize.height - padding.top - padding.bottom
        : parentSize.width - padding.left - padding.right),
      0
    );
    const crossSize = isRow ? size.height : size.width;
    const crossOffset =
      alignItems === "end"
        ? Math.max(availableCrossSize - crossSize, 0)
        : alignItems === "center"
          ? Math.max((availableCrossSize - crossSize) / 2, 0)
          : 0;

    positions.set(child, {
      x: isRow ? cursor : padding.left + crossOffset,
      y: isRow ? padding.top + crossOffset : cursor
    });
    cursor += (isRow ? size.width : size.height) + dynamicGap;
  }

  return positions;
}

function getRadiusValue(node: DesignNode): number {
  if (isV02Node(node)) {
    const radius = node.style?.radius;

    if (radius === undefined) {
      return 0;
    }

    if (typeof radius === "number") {
      return radius;
    }

    return Math.max(...radius);
  }

  const radius = node.appearance?.radius as RadiusValue | undefined;

  if (!radius) {
    return 0;
  }

  if (radius.mode === "uniform") {
    return radius.value;
  }

  return Math.max(radius.topLeft, radius.topRight, radius.bottomRight, radius.bottomLeft);
}

function rgbaToHex(color: {
  a?: number;
  b: number;
  g: number;
  r: number;
}): string {
  const toHex = (value: number): string =>
    Math.round(value * 255)
      .toString(16)
      .padStart(2, "0");

  const alpha = color.a === undefined ? "" : toHex(clamp(color.a, 0, 1));

  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}${alpha}`;
}

function rgbToHex(color: {
  b: number;
  g: number;
  r: number;
}): string {
  return rgbaToHex(color);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getPaintHexFromFallback(
  fallback: unknown
): string | undefined {
  if (!isRecord(fallback) || !("color" in fallback) || !isRecord(fallback.color)) {
    return undefined;
  }

  const color = fallback.color;

  if (
    !("r" in color) ||
    !("g" in color) ||
    !("b" in color) ||
    typeof color.r !== "number" ||
    typeof color.g !== "number" ||
    typeof color.b !== "number"
  ) {
    return undefined;
  }

  const alpha =
    "a" in color && typeof color.a === "number"
      ? color.a
      : "opacity" in fallback && typeof fallback.opacity === "number"
        ? fallback.opacity
        : undefined;

  return rgbaToHex({
    ...(alpha !== undefined ? { a: alpha } : {}),
    b: color.b,
    g: color.g,
    r: color.r
  });
}

function normalizeStyleColor(style: StyleRegistryEntry | undefined): string | undefined {
  const fallback = style?.fallback;

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

  const alpha =
    "opacity" in firstPaint && typeof firstPaint.opacity === "number"
      ? Number(firstPaint.opacity)
      : undefined;

  return rgbaToHex({
    ...(alpha !== undefined ? { a: alpha } : {}),
    b: Number(color.b),
    g: Number(color.g),
    r: Number(color.r)
  });
}

function getCanonicalColor(
  value: CanonicalTokenOrValue | undefined
): string | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string" && value.startsWith("#")) {
    return value;
  }

  return undefined;
}

function getCanonicalComponentUse(
  node: DesignNodeV0_2
): Exclude<DesignNodeV0_2["component"], string | undefined> | undefined {
  return node.component && typeof node.component !== "string" ? node.component : undefined;
}

function getCanonicalComponentName(node: DesignNodeV0_2): string | undefined {
  return typeof node.component === "string"
    ? node.component
    : getCanonicalComponentUse(node)?.name;
}

function getCanonicalTextValue(node: DesignNodeV0_2): string | undefined {
  return typeof node.text === "string" ? node.text : node.text?.value;
}

function getPaintColor(document: DesignDocument, paint: PaintValue | undefined): string | undefined {
  if (!isDesignDocumentV0_1(document)) {
    return undefined;
  }

  if (!paint) {
    return undefined;
  }

  if (typeof paint.fallback === "string" && paint.fallback.startsWith("#")) {
    return paint.fallback;
  }

  const fallbackColor = getPaintHexFromFallback(paint.fallback);

  if (fallbackColor) {
    return fallbackColor;
  }

  if (paint.styleRef) {
    return normalizeStyleColor(document.registries.styles[paint.styleRef]);
  }

  return undefined;
}

function registerDefinition(
  context: RenderContext,
  prefix: string,
  renderDefinition: (id: string) => string
): string {
  const id = `snapshot-${prefix}-${context.nextDefId}`;

  context.nextDefId += 1;
  context.defs.push(renderDefinition(id));

  return id;
}

function resolveGradientFill(
  context: RenderContext,
  paint: PaintValue
): PaintFill | null {
  if (!isRecord(paint.fallback) || !Array.isArray(paint.fallback.gradientStops)) {
    return null;
  }

  const stops = paint.fallback.gradientStops
    .map((stop) => {
      if (
        !isRecord(stop) ||
        !("color" in stop) ||
        !isRecord(stop.color) ||
        !("position" in stop) ||
        typeof stop.position !== "number"
      ) {
        return null;
      }

      const color = stop.color;

      if (
        !("r" in color) ||
        !("g" in color) ||
        !("b" in color) ||
        typeof color.r !== "number" ||
        typeof color.g !== "number" ||
        typeof color.b !== "number"
      ) {
        return null;
      }

      const alpha = "a" in color && typeof color.a === "number" ? color.a : undefined;

      return {
        color: rgbaToHex({
          ...(alpha !== undefined ? { a: alpha } : {}),
          b: color.b,
          g: color.g,
          r: color.r
        }),
        position: clamp(stop.position, 0, 1)
      };
    })
    .filter((stop): stop is { color: string; position: number } => stop !== null);

  if (stops.length === 0) {
    return null;
  }

  const gradientType =
    "gradientType" in paint.fallback && typeof paint.fallback.gradientType === "string"
      ? paint.fallback.gradientType
      : "GRADIENT_LINEAR";
  const id = registerDefinition(context, "gradient", (definitionId) => {
    const stopMarkup = stops
      .map(
        (stop) =>
          `<stop offset="${formatNumber(stop.position * 100)}%" stop-color="${escapeXml(stop.color)}" />`
      )
      .join("");

    if (gradientType === "GRADIENT_RADIAL") {
      return `<radialGradient id="${definitionId}" cx="50%" cy="50%" r="70%">${stopMarkup}</radialGradient>`;
    }

    const axis =
      gradientType === "GRADIENT_ANGULAR"
        ? 'x1="0%" y1="100%" x2="100%" y2="0%"'
        : gradientType === "GRADIENT_DIAMOND"
          ? 'x1="50%" y1="0%" x2="50%" y2="100%"'
          : 'x1="0%" y1="0%" x2="0%" y2="100%"';

    return `<linearGradient id="${definitionId}" ${axis}>${stopMarkup}</linearGradient>`;
  });

  return {
    value: `url(#${id})`
  };
}

function resolvePaintFill(
  context: RenderContext,
  node: DesignNode,
  fallbackColor: string
): PaintFill {
  if (isV02Node(node)) {
    return {
      value: getPrimaryPaintColor(context.document, node.style?.fill, fallbackColor)
    };
  }

  const paints = node.appearance?.background;
  const [primaryPaint] = paints ?? [];

  if (primaryPaint?.kind === "gradient") {
    const gradientFill = resolveGradientFill(context, primaryPaint);

    if (gradientFill) {
      return gradientFill;
    }
  }

  return {
    value: getPrimaryPaintColor(context.document, paints, fallbackColor)
  };
}

function getPrimaryPaintColor(
  document: DesignDocument,
  paints:
    | readonly PaintValue[]
    | CanonicalTokenOrValue
    | CanonicalTokenOrValue[]
    | undefined,
  fallbackColor: string
): string {
  if (!isDesignDocumentV0_1(document)) {
    const values = Array.isArray(paints)
      ? (paints as CanonicalTokenOrValue[])
      : paints
        ? [paints as CanonicalTokenOrValue]
        : [];
    const color = values.map((value) => getCanonicalColor(value)).find(Boolean);

    return color ?? fallbackColor;
  }

  const color = (paints as readonly PaintValue[])
    ?.map((paint) => getPaintColor(document, paint))
    .find(Boolean);

  return color ?? fallbackColor;
}

function getStrokeAppearance(
  document: DesignDocument,
  node: DesignNode
): { color: string; width: number } | null {
  if (isV02Node(node)) {
    const stroke = node.style?.stroke;

    if (!stroke) {
      return null;
    }

    return {
      color: getPrimaryPaintColor(document, stroke.color, FALLBACK_STROKE),
      width: stroke.width ?? 1
    };
  }

  const stroke = node.appearance?.stroke?.[0];

  if (!stroke) {
    return null;
  }

  return {
    color: getPrimaryPaintColor(document, stroke.paints, FALLBACK_STROKE),
    width: stroke.width ?? 1
  };
}

function getTextStyleName(document: DesignDocument, node: DesignNode): string {
  if (isV02Node(node)) {
    return node.style?.textStyle?.toLowerCase() ?? "";
  }

  if (!isDesignDocumentV0_1(document)) {
    return "";
  }

  const textStyleRef = node.content?.text?.textStyleRef;

  if (!textStyleRef) {
    return "";
  }

  return document.registries.styles[textStyleRef]?.name?.toLowerCase() ?? "";
}

function resolveVariableValue(
  document: DesignDocument,
  variableRef: string,
  seen = new Set<string>()
): unknown {
  if (!isDesignDocumentV0_1(document) || seen.has(variableRef)) {
    return undefined;
  }

  seen.add(variableRef);
  const variable = document.registries.variables[variableRef];
  const value = variable?.modes[0]?.value;

  if (
    isRecord(value) &&
    value.type === "VARIABLE_ALIAS" &&
    typeof value.ref === "string"
  ) {
    return resolveVariableValue(document, value.ref, seen);
  }

  return value;
}

function getTextStyleEntry(
  document: DesignDocument,
  node: DesignNode
): StyleRegistryEntry | undefined {
  if (isV02Node(node) || !isDesignDocumentV0_1(document)) {
    return undefined;
  }

  const textStyleRef = node.content?.text?.textStyleRef;

  return textStyleRef ? document.registries.styles[textStyleRef] : undefined;
}

function getTextStyleMetric(
  document: DesignDocument,
  style: StyleRegistryEntry | undefined,
  metricName: string
): number | string | undefined {
  const variableRef = style?.boundVariables?.[metricName];

  if (typeof variableRef !== "string") {
    return undefined;
  }

  const value = resolveVariableValue(document, variableRef);

  return typeof value === "number" || typeof value === "string" ? value : undefined;
}

function resolveFontWeight(value: string | number | undefined): number {
  if (typeof value === "number") {
    return clamp(Math.round(value), 100, 900);
  }

  if (!value) {
    return 400;
  }

  const normalized = value.toLowerCase();

  if (normalized.includes("thin")) {
    return 100;
  }

  if (normalized.includes("light")) {
    return 300;
  }

  if (normalized.includes("medium")) {
    return 500;
  }

  if (normalized.includes("semi")) {
    return 600;
  }

  if (normalized.includes("bold")) {
    return 700;
  }

  if (normalized.includes("black")) {
    return 900;
  }

  return 400;
}

function getNamedTextMetrics(styleName: string): Omit<TextMetrics, "fontFamily"> | null {
  const normalizedStyle = styleName.toLowerCase();

  const materialMetrics: Array<{
    fontSize: number;
    fontWeight: number;
    lineHeight: number;
    matcher: string;
  }> = [
    { fontSize: 57, fontWeight: 400, lineHeight: 64, matcher: "display/large" },
    { fontSize: 45, fontWeight: 400, lineHeight: 52, matcher: "display/medium" },
    { fontSize: 36, fontWeight: 400, lineHeight: 44, matcher: "display/small" },
    { fontSize: 32, fontWeight: 400, lineHeight: 40, matcher: "headline/large" },
    { fontSize: 28, fontWeight: 400, lineHeight: 36, matcher: "headline/medium" },
    { fontSize: 24, fontWeight: 400, lineHeight: 32, matcher: "headline/small" },
    { fontSize: 22, fontWeight: 400, lineHeight: 28, matcher: "title/large" },
    { fontSize: 16, fontWeight: 500, lineHeight: 24, matcher: "title/medium" },
    { fontSize: 14, fontWeight: 500, lineHeight: 20, matcher: "title/small" },
    { fontSize: 16, fontWeight: 400, lineHeight: 24, matcher: "body/large" },
    { fontSize: 14, fontWeight: 400, lineHeight: 20, matcher: "body/medium" },
    { fontSize: 12, fontWeight: 400, lineHeight: 16, matcher: "body/small" },
    { fontSize: 14, fontWeight: 500, lineHeight: 20, matcher: "label/large" },
    { fontSize: 12, fontWeight: 500, lineHeight: 16, matcher: "label/medium" },
    { fontSize: 11, fontWeight: 500, lineHeight: 16, matcher: "label/small" }
  ];

  const matchedMetrics = materialMetrics.find(({ matcher }) =>
    normalizedStyle.includes(matcher)
  );

  return matchedMetrics
    ? {
        fontSize: matchedMetrics.fontSize,
        fontWeight: matchedMetrics.fontWeight,
        letterSpacing: normalizedStyle.includes("label/") ? 0.1 : 0,
        lineHeight: matchedMetrics.lineHeight
      }
    : null;
}

function resolveTextMetrics(document: DesignDocument, node: DesignNode): TextMetrics {
  const styleName = getTextStyleName(document, node);
  const styleEntry = getTextStyleEntry(document, node);
  const namedMetrics = getNamedTextMetrics(styleName);
  const fontSize = getTextStyleMetric(document, styleEntry, "fontSize");
  const lineHeight = getTextStyleMetric(document, styleEntry, "lineHeight");
  const letterSpacing = getTextStyleMetric(document, styleEntry, "letterSpacing");
  const fontWeight = getTextStyleMetric(document, styleEntry, "fontStyle");
  const fontFamily = getTextStyleMetric(document, styleEntry, "fontFamily");

  if (
    typeof fontSize === "number" &&
    typeof lineHeight === "number"
  ) {
    return {
      fontFamily: typeof fontFamily === "string" ? `${fontFamily}, Arial, sans-serif` : DEFAULT_FONT_FAMILY,
      fontSize,
      fontWeight: resolveFontWeight(fontWeight),
      letterSpacing: typeof letterSpacing === "number" ? letterSpacing : namedMetrics?.letterSpacing ?? 0,
      lineHeight
    };
  }

  if (namedMetrics) {
    return {
      fontFamily: DEFAULT_FONT_FAMILY,
      ...namedMetrics
    };
  }

  const explicitHeight = isV02Node(node) ? node.size?.height : node.bounds?.height;
  const inferredFontSize = clamp((explicitHeight ?? 18) * 0.72, 12, 20);

  return {
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize: inferredFontSize,
    fontWeight: 400,
    letterSpacing: 0,
    lineHeight: inferredFontSize * 1.35
  };
}

function estimateTextWidth(
  value: string,
  fontSize: number,
  letterSpacing = 0
): number {
  return Array.from(value).reduce((sum, character, index) => {
    const glyphWidth = character === " " ? fontSize * 0.34 : fontSize * 0.56;

    return sum + glyphWidth + (index < value.length - 1 ? letterSpacing : 0);
  }, 0);
}

function truncateTextToWidth(
  value: string,
  maxWidth: number,
  metrics: TextMetrics
): string {
  if (estimateTextWidth(value, metrics.fontSize, metrics.letterSpacing) <= maxWidth) {
    return value;
  }

  let truncated = value.trimEnd();

  while (
    truncated.length > 0 &&
    estimateTextWidth(`${truncated}\u2026`, metrics.fontSize, metrics.letterSpacing) > maxWidth
  ) {
    truncated = truncated.slice(0, -1).trimEnd();
  }

  return truncated.length > 0 ? `${truncated}\u2026` : "\u2026";
}

function wrapText(
  value: string,
  maxWidth: number,
  metrics: TextMetrics,
  maxLines?: number
): string[] {
  if (!value.trim()) {
    return [""];
  }

  const lines: string[] = [];
  const paragraphs = value.replaceAll("\r\n", "\n").split("\n");
  let wasTruncated = false;

  for (const paragraph of paragraphs) {
    if (maxLines !== undefined && lines.length >= maxLines) {
      wasTruncated = true;
      break;
    }

    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }

    const words = paragraph.split(/\s+/);
    let currentLine = "";

    for (const word of words) {
      const nextLine = currentLine ? `${currentLine} ${word}` : word;

      if (
        estimateTextWidth(nextLine, metrics.fontSize, metrics.letterSpacing) <= maxWidth ||
        !currentLine
      ) {
        currentLine = nextLine;
        continue;
      }

      lines.push(currentLine);

      if (maxLines !== undefined && lines.length >= maxLines) {
        wasTruncated = true;
        break;
      }

      currentLine = word;
    }

    if (maxLines !== undefined && lines.length >= maxLines) {
      if (paragraph !== paragraphs.at(-1)) {
        wasTruncated = true;
      }
      break;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  if (maxLines !== undefined && lines.length > maxLines) {
    lines.length = maxLines;
    wasTruncated = true;
  }

  if (wasTruncated && lines.length > 0) {
    const lastLineIndex = lines.length - 1;

    lines[lastLineIndex] = truncateTextToWidth(lines[lastLineIndex] ?? "", maxWidth, metrics);
  }

  return lines;
}

function renderLabelText(
  x: number,
  y: number,
  value: string,
  options: LabelTextOptions = {}
): string {
  const color = options.color ?? FALLBACK_TEXT;
  const fontFamily = options.fontFamily ?? DEFAULT_FONT_FAMILY;
  const fontSize = options.fontSize ?? 14;
  const fontWeight = options.fontWeight ?? 500;
  const letterSpacing = options.letterSpacing ?? 0;
  const textAnchor = options.textAnchor ?? "start";

  return `<text x="${formatNumber(x)}" y="${formatNumber(y)}" fill="${escapeXml(
    color
  )}" font-family="${escapeXml(
    fontFamily
  )}" font-size="${formatNumber(fontSize)}" font-weight="${fontWeight}" letter-spacing="${formatNumber(
    letterSpacing
  )}" dominant-baseline="hanging" text-anchor="${textAnchor}">${escapeXml(value)}</text>`;
}

function getChipWidth(value: string): number {
  return Math.max(46, estimateTextWidth(value, 11) + 18);
}

function renderChip(x: number, y: number, value: string): string {
  const chipWidth = getChipWidth(value);

  return [
    `<rect x="${formatNumber(x)}" y="${formatNumber(y)}" width="${formatNumber(
      chipWidth
    )}" height="22" rx="11" fill="${FALLBACK_TINT}" />`,
    renderLabelText(x + 9, y + 4, value, {
      color: FALLBACK_PRIMARY,
      fontSize: 11,
      fontWeight: 600
    })
  ].join("");
}

function getInstanceMetadata(
  document: DesignDocument,
  node: DesignNode
): InstanceMetadata | null {
  if (isV02Node(node)) {
    const componentName = getCanonicalComponentName(node);

    if (!componentName) {
      return null;
    }

    return {
      componentName,
      componentSetName: componentName
    };
  }

  if (!isDesignDocumentV0_1(document)) {
    return null;
  }

  const componentRef = node.designSystem?.componentRef;

  if (!componentRef) {
    return null;
  }

  const component = document.registries.components[componentRef];
  const componentSetName = component?.componentSetRef
    ? document.registries.componentSets[component.componentSetRef]?.name ?? null
    : null;

  return {
    componentName: component?.name ?? node.name,
    componentSetName
  };
}

function isSnapshotComponentProperties(
  properties: SnapshotComponentProperties | Record<string, ComponentPropertyValue>
): properties is SnapshotComponentProperties {
  return Object.values(properties).every(
    (value) => typeof value === "string" || typeof value === "boolean"
  );
}

function getInstanceProperties(
  node: DesignNode
): SnapshotComponentProperties | Record<string, ComponentPropertyValue> {
  if (isV02Node(node)) {
    return getCanonicalComponentUse(node)?.props ?? {};
  }

  return node.designSystem?.instance?.properties ?? {};
}

function getInstanceVariants(node: DesignNode): SnapshotVariantValues {
  if (isV02Node(node)) {
    return getCanonicalComponentUse(node)?.variant ?? {};
  }

  return node.designSystem?.instance?.variant ?? {};
}

function findPropertyValue(
  properties: SnapshotComponentProperties | Record<string, ComponentPropertyValue>,
  propertyName: string
): string | boolean | null {
  if (isSnapshotComponentProperties(properties)) {
    const matchedEntry = Object.entries(properties).find(
      ([key]) => sanitizeVariantLabel(key) === propertyName
    );

    return matchedEntry?.[1] ?? null;
  }

  const matchedEntry = Object.entries(properties).find(([key]) =>
    sanitizeVariantLabel(key) === propertyName
  );

  return matchedEntry?.[1].value ?? null;
}

function findTextProperty(
  properties: SnapshotComponentProperties | Record<string, ComponentPropertyValue>,
  propertyNames: readonly string[]
): string | null {
  for (const propertyName of propertyNames) {
    const value = findPropertyValue(properties, propertyName);

    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return null;
}

function findVariantValue(
  variants: SnapshotVariantValues,
  propertyName: string
): string | boolean | null {
  const matchedEntry = Object.entries(variants).find(
    ([key]) => sanitizeVariantLabel(key) === propertyName
  );

  return matchedEntry?.[1] ?? null;
}

function findFirstTextProperty(
  properties: SnapshotComponentProperties | Record<string, ComponentPropertyValue>
): string | null {
  if (isSnapshotComponentProperties(properties)) {
    const matchedEntry = Object.values(properties).find(
      (propertyValue) => typeof propertyValue === "string"
    );

    return typeof matchedEntry === "string" ? matchedEntry : null;
  }

  const matchedEntry = Object.values(properties).find(
    (propertyValue) => propertyValue.type === "TEXT" && typeof propertyValue.value === "string"
  );

  return typeof matchedEntry?.value === "string" ? matchedEntry.value : null;
}

function findOverrideText(
  node: DesignNode,
  propertyNames: readonly string[]
): string | null {
  if (isV02Node(node)) {
    return findTextProperty(getCanonicalComponentUse(node)?.props ?? {}, propertyNames);
  }

  const overrideEntries = Object.entries(node.designSystem?.instance?.overrides ?? {});

  for (const propertyName of propertyNames) {
    const matchedEntry = overrideEntries.find(
      ([key, overrideValue]) =>
        sanitizeVariantLabel(key) === propertyName &&
        overrideValue.type === "text" &&
        typeof overrideValue.value === "string"
    );

    if (matchedEntry && typeof matchedEntry[1].value === "string") {
      return matchedEntry[1].value;
    }
  }

  return null;
}

function getVariantLabels(node: DesignNode): string[] {
  const variantEntries = Object.entries(getInstanceVariants(node));

  return variantEntries
    .slice(0, 4)
    .map(([key, value]) => `${sanitizeVariantLabel(key)}: ${value}`);
}

function findInstanceValue(
  node: DesignNode,
  propertyName: string
): string | boolean | null {
  return (
    findPropertyValue(getInstanceProperties(node), propertyName) ??
    findVariantValue(getInstanceVariants(node), propertyName)
  );
}

function isFalseLike(value: string | boolean | null): boolean {
  return value === false || (typeof value === "string" && value.toLowerCase() === "false");
}

function getTextAlignment(node: DesignNode): TextAlignment {
  if (isV02Node(node)) {
    return {
      horizontal: "left",
      vertical: "top"
    };
  }

  const horizontal = node.content?.text?.alignment?.horizontal;
  const vertical = node.content?.text?.alignment?.vertical;

  return {
    horizontal:
      horizontal === "center"
        ? "center"
        : horizontal === "right"
          ? "right"
          : "left",
    vertical:
      vertical === "center"
        ? "center"
        : vertical === "bottom"
          ? "bottom"
          : "top"
  };
}

function getTextLineLimit(node: DesignNode, metrics: TextMetrics, document: DesignDocument): number | undefined {
  if (isV02Node(node) && typeof node.text === "object" && node.text.lines !== undefined) {
    return node.text.lines;
  }

  if (!isV02Node(node) && node.content?.text?.maxLines !== undefined) {
    return node.content.text.maxLines;
  }

  const { height } = getNodeSize(node, document);

  return height > 0 ? Math.max(Math.floor(height / metrics.lineHeight), 1) : undefined;
}

function getIntrinsicTextNodeSize(
  document: DesignDocument,
  node: DesignNode
): NodeSize | null {
  if (node.kind !== "text") {
    return null;
  }

  const textValue = isV02Node(node)
    ? getCanonicalTextValue(node) ?? node.name ?? ""
    : node.content?.text?.characters ?? node.name;
  const metrics = resolveTextMetrics(document, node);
  const lines = textValue.replaceAll("\r\n", "\n").split("\n");
  const longestLine = lines.reduce(
    (maxWidth, line) =>
      Math.max(maxWidth, estimateTextWidth(line, metrics.fontSize, metrics.letterSpacing)),
    0
  );

  return {
    height: Math.max(Math.ceil(lines.length * metrics.lineHeight), Math.ceil(metrics.lineHeight)),
    width: Math.max(Math.ceil(longestLine), 1)
  };
}

function getIntrinsicInstanceSize(
  document: DesignDocument,
  node: DesignNode
): NodeSize | null {
  if (node.kind !== "instance") {
    return null;
  }

  const metadata = getInstanceMetadata(document, node);
  const componentName =
    metadata?.componentName.toLowerCase() ?? (node.name ?? "instance").toLowerCase();
  const setName = metadata?.componentSetName?.toLowerCase() ?? componentName;

  if (componentName.includes("status-bar")) {
    return {
      height: 24,
      width: 360
    };
  }

  if (setName === "app bar") {
    const configuration = String(findVariantValue(getInstanceVariants(node), "Configuration") ?? "").toLowerCase();

    return {
      height: configuration.includes("medium") ? 112 : configuration.includes("large") ? 152 : 64,
      width: 360
    };
  }

  if (setName === "carousel") {
    return {
      height: 188,
      width: 360
    };
  }

  if (setName === "icon button - standard") {
    return {
      height: 40,
      width: 40
    };
  }

  if (componentName.includes("list item")) {
    const condition = String(findVariantValue(getInstanceVariants(node), "Condition") ?? "");

    return {
      height: condition.includes("3") ? 88 : condition.includes("2") ? 72 : 56,
      width: 360
    };
  }

  if (componentName.includes("navigation")) {
    return {
      height: 24,
      width: 360
    };
  }

  if (componentName.includes("divider")) {
    return {
      height: 1,
      width: 360
    };
  }

  if (componentName.includes("star")) {
    return {
      height: 20,
      width: 20
    };
  }

  if (componentName.includes("favorite")) {
    return {
      height: 24,
      width: 24
    };
  }

  if (componentName.includes("chip")) {
    const label =
      findOverrideText(node, ["Label", "Label text"]) ??
      findTextProperty(getInstanceProperties(node), ["Label", "Label text"]) ??
      "Chip";

    return {
      height: 32,
      width: Math.max(Math.ceil(estimateTextWidth(label, 14, 0.1) + 36), 72)
    };
  }

  if (componentName.includes("button")) {
    const label =
      findOverrideText(node, ["Label text", "Label", "Headline"]) ??
      findTextProperty(getInstanceProperties(node), ["Label text", "Label", "Headline"]) ??
      findFirstTextProperty(getInstanceProperties(node)) ??
      node.name ??
      "Button";

    return {
      height: 40,
      width: Math.max(Math.ceil(estimateTextWidth(label, 14) + 28), 72)
    };
  }

  return null;
}

function getIntrinsicNodeSize(
  document: DesignDocument,
  node: DesignNode
): NodeSize | null {
  return getIntrinsicTextNodeSize(document, node) ?? getIntrinsicInstanceSize(document, node);
}

function getNodeOpacity(node: DesignNode): number | undefined {
  return isV02Node(node) ? node.style?.opacity : node.appearance?.opacity;
}

function shouldClipNode(node: DesignNode): boolean {
  if (isV02Node(node)) {
    return node.layout?.scroll !== undefined;
  }

  if (
    node.layout?.overflow &&
    Object.values(node.layout.overflow).some(
      (value) => value === "hidden" || value === "scroll"
    )
  ) {
    return true;
  }

  return false;
}

function registerNodeClipPath(
  context: RenderContext,
  node: DesignNode,
  width: number,
  height: number
): string {
  const radius = getRadiusValue(node);

  return registerDefinition(
    context,
    "clip",
    (id) =>
      `<clipPath id="${id}"><rect width="${formatNumber(width)}" height="${formatNumber(
        height
      )}" rx="${formatNumber(radius)}" /></clipPath>`
  );
}

function getNodeShadowFilter(
  context: RenderContext,
  node: DesignNode
): string | null {
  if (isV02Node(node)) {
    return null;
  }

  const shadow = node.appearance?.effects?.find((effect) => effect.type === "DROP_SHADOW");

  if (!shadow || !isRecord(shadow.fallback) || !isRecord(shadow.fallback.color)) {
    return null;
  }

  const shadowFallback = shadow.fallback;
  const color = shadowFallback.color as Record<string, unknown>;

  if (
    typeof color.r !== "number" ||
    typeof color.g !== "number" ||
    typeof color.b !== "number"
  ) {
    return null;
  }

  const red = color.r;
  const green = color.g;
  const blue = color.b;
  const shadowOpacity = typeof color.a === "number" ? clamp(color.a, 0, 1) : 0.18;
  const offset = isRecord(shadowFallback.offset) ? shadowFallback.offset : {};
  const dx = typeof offset.x === "number" ? offset.x : 0;
  const dy = typeof offset.y === "number" ? offset.y : 1;
  const radius = typeof shadowFallback.radius === "number" ? shadowFallback.radius : 3;
  const id = registerDefinition(context, "shadow", (definitionId) => {
    const shadowColor = rgbToHex({
      b: blue,
      g: green,
      r: red
    });

    return `<filter id="${definitionId}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="${formatNumber(
      dx
    )}" dy="${formatNumber(dy)}" stdDeviation="${formatNumber(
      Math.max(radius / 2, 0.5)
    )}" flood-color="${shadowColor}" flood-opacity="${formatNumber(shadowOpacity)}" /></filter>`;
  });

  return `url(#${id})`;
}

function renderBackground(
  context: RenderContext,
  node: DesignNode,
  width: number,
  height: number,
  fallbackFill: string | null
): string {
  const fill = resolvePaintFill(context, node, fallbackFill ?? "transparent");
  const radius = getRadiusValue(node);
  const strokeAppearance = getStrokeAppearance(context.document, node);
  const inset = strokeAppearance?.width ? strokeAppearance.width / 2 : 0;
  const rectWidth = Math.max(width - inset * 2, 1);
  const rectHeight = Math.max(height - inset * 2, 1);

  return `<rect x="${formatNumber(inset)}" y="${formatNumber(
    inset
  )}" width="${formatNumber(rectWidth)}" height="${formatNumber(
    rectHeight
  )}" rx="${formatNumber(radius)}" fill="${escapeXml(fill.value)}"${
    fill.opacity !== undefined ? ` fill-opacity="${formatNumber(fill.opacity)}"` : ""
  }${
    strokeAppearance
      ? ` stroke="${escapeXml(strokeAppearance.color)}" stroke-width="${formatNumber(
          strokeAppearance.width
        )}"`
      : ""
  } />`;
}

function renderTextNode(node: DesignNode, context: RenderContext): string {
  context.stats.textNodeCount += 1;
  const { height, width } = getNodeSize(node, context.document);

  const textValue = isV02Node(node)
    ? getCanonicalTextValue(node) ?? node.name ?? ""
    : node.content?.text?.characters ?? node.name;
  const textColor = isV02Node(node)
    ? getPrimaryPaintColor(
        context.document,
        node.style?.textColor ?? node.style?.fill,
        FALLBACK_TEXT
      )
    : getPrimaryPaintColor(
        context.document,
        node.content?.text?.fill ?? node.appearance?.background,
        FALLBACK_TEXT
      );
  const metrics = resolveTextMetrics(context.document, node);
  const alignment = getTextAlignment(node);
  const maxLines = getTextLineLimit(node, metrics, context.document);
  const wrappedLines = wrapText(textValue, Math.max(width, metrics.fontSize), metrics, maxLines);
  const totalTextHeight = wrappedLines.length * metrics.lineHeight;
  const textAnchor =
    alignment.horizontal === "center"
      ? "middle"
      : alignment.horizontal === "right"
        ? "end"
        : "start";
  const textX =
    alignment.horizontal === "center"
      ? width / 2
      : alignment.horizontal === "right"
        ? width
        : 0;
  const startY =
    alignment.vertical === "center"
      ? Math.max((height - totalTextHeight) / 2, 0)
      : alignment.vertical === "bottom"
        ? Math.max(height - totalTextHeight, 0)
        : 0;

  return wrappedLines
    .map((line, index) =>
      renderLabelText(textX, startY + index * metrics.lineHeight, line, {
        color: textColor,
        fontFamily: metrics.fontFamily,
        fontSize: metrics.fontSize,
        fontWeight: metrics.fontWeight,
        letterSpacing: metrics.letterSpacing,
        textAnchor
      })
    )
    .join("");
}

function renderStatusBar(width: number): string {
  return [
    renderLabelText(24, 12, "9:41", {
      color: FALLBACK_TEXT,
      fontSize: 15,
      fontWeight: 600
    }),
    `<rect x="${formatNumber(width - 88)}" y="16" width="18" height="9" rx="2" fill="none" stroke="${FALLBACK_TEXT}" stroke-width="1.2" />`,
    `<rect x="${formatNumber(width - 68)}" y="18" width="3" height="5" rx="1" fill="${FALLBACK_TEXT}" />`,
    `<path d="M ${formatNumber(width - 124)} 24 a 6 6 0 0 1 12 0" fill="none" stroke="${FALLBACK_TEXT}" stroke-width="1.6" />`,
    `<path d="M ${formatNumber(width - 144)} 24 a 4 4 0 0 1 8 0" fill="none" stroke="${FALLBACK_TEXT}" stroke-width="1.6" />`
  ].join("");
}

function renderAppBar(width: number, height: number, node: DesignNode): string {
  const showFirst = !isFalseLike(findInstanceValue(node, "Show 1st trailing action"));
  const showSecond = !isFalseLike(findInstanceValue(node, "Show 2nd trailing action"));
  const showThird = !isFalseLike(findInstanceValue(node, "Show 3rd trailing action"));
  const labels = ["App bar", ...getVariantLabels(node).slice(0, 2)];
  const actionCenters = [width - 36, width - 84, width - 132];
  const visibleActions = [showFirst, showSecond, showThird];
  const labelY = height >= 100 ? 58 : 30;
  const firstChipWidth = labels[1] ? getChipWidth(labels[1]) : 0;
  const secondChipX = 20 + firstChipWidth + 12;

  return [
    renderLabelText(20, labelY, labels[0] ?? node.name ?? "App bar", {
      fontSize: height >= 100 ? 28 : 20,
      fontWeight: 500
    }),
    labels[1] ? renderChip(20, labelY + 40, labels[1]) : "",
    labels[2] ? renderChip(secondChipX, labelY + 40, labels[2]) : "",
    `<path d="M 28 ${formatNumber(labelY + 16)} L 16 ${formatNumber(
      labelY + 8
    )} L 28 ${formatNumber(labelY)}" fill="none" stroke="${FALLBACK_TEXT}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />`,
    ...actionCenters.map((centerX, index) =>
      visibleActions[index]
        ? `<circle cx="${formatNumber(centerX)}" cy="${formatNumber(
            labelY + 14
          )}" r="13" fill="none" stroke="${FALLBACK_TEXT}" stroke-width="1.5" />`
        : ""
    )
  ].join("");
}

function renderCarousel(width: number, height: number): string {
  const cardWidth = Math.max(Math.min(width * 0.7, 290), 180);
  const cardHeight = Math.max(height - 20, 120);
  const secondaryWidth = Math.max(Math.min(cardWidth * 0.72, width - 32), 120);
  const thirdWidth = Math.max(Math.min(cardWidth * 0.45, width - 32), 90);

  return [
    `<rect x="0" y="0" width="${formatNumber(cardWidth)}" height="${formatNumber(
      cardHeight
    )}" rx="28" fill="#d7c4b2" />`,
    `<rect x="16" y="${formatNumber(cardHeight - 78)}" width="${formatNumber(
      cardWidth - 32
    )}" height="46" rx="14" fill="#ffffffcc" />`,
    renderLabelText(32, cardHeight - 67, "Featured", {
      fontSize: 12,
      fontWeight: 600,
      color: FALLBACK_MUTED_TEXT
    }),
    renderLabelText(32, cardHeight - 45, "Material card", {
      fontSize: 18,
      fontWeight: 500
    }),
    `<rect x="${formatNumber(cardWidth + 8)}" y="6" width="${formatNumber(
      secondaryWidth
    )}" height="${formatNumber(cardHeight - 12)}" rx="24" fill="#ece6f0" opacity="0.92" />`,
    `<rect x="${formatNumber(cardWidth + secondaryWidth + 16)}" y="12" width="${formatNumber(
      thirdWidth
    )}" height="${formatNumber(cardHeight - 24)}" rx="20" fill="#d0c7dc" opacity="0.85" />`
  ].join("");
}

function renderTextButton(width: number, height: number, node: DesignNode): string {
  const properties = getInstanceProperties(node);
  const label =
    findOverrideText(node, ["Label text", "Label", "Headline"]) ??
    findTextProperty(properties, ["Label text", "Label", "Headline"]) ??
    findFirstTextProperty(properties) ??
    node.name ??
    "Button";

  return [
    `<rect x="0.5" y="0.5" width="${formatNumber(width - 1)}" height="${formatNumber(
      height - 1
    )}" rx="${formatNumber(Math.min(height / 2, 20))}" fill="transparent" />`,
    renderLabelText(width / 2, Math.max((height - 20) / 2, 0), label, {
      color: FALLBACK_PRIMARY,
      fontSize: 14,
      fontWeight: 600,
      textAnchor: "middle"
    })
  ].join("");
}

function mapIconNameToGlyph(value: string | null): string {
  if (!value) {
    return "•";
  }

  const normalized = value.toLowerCase();

  if (normalized.includes("arrow_back")) {
    return "←";
  }

  if (normalized.includes("arrow_forward") || normalized.includes("chevron_right")) {
    return "→";
  }

  if (normalized.includes("attach_file")) {
    return "⌘";
  }

  if (normalized.includes("today")) {
    return "◫";
  }

  if (normalized.includes("more_vert")) {
    return "⋮";
  }

  if (normalized.includes("favorite")) {
    return "♥";
  }

  if (normalized.includes("star")) {
    return "★";
  }

  if (normalized.includes("search")) {
    return "⌕";
  }

  return "•";
}

function renderIconButton(width: number, height: number, node: DesignNode): string {
  const properties = getInstanceProperties(node);
  const glyph = mapIconNameToGlyph(
    findTextProperty(properties, ["Icon"]) ?? String(findPropertyValue(properties, "Icon") ?? "")
  );
  const radius = Math.min(width, height) / 2;

  return [
    `<circle cx="${formatNumber(width / 2)}" cy="${formatNumber(height / 2)}" r="${formatNumber(
      radius - 0.75
    )}" fill="transparent" stroke="${FALLBACK_MUTED_TEXT}" stroke-width="1.5" />`,
    renderLabelText(width / 2 - 7, height / 2 - 10, glyph, {
      fontSize: 22,
      fontWeight: 500
    })
  ].join("");
}

function renderListItem(width: number, height: number, node: DesignNode): string {
  const properties = getInstanceProperties(node);
  const headline = findTextProperty(properties, ["Headline", "Label"]) ?? "List item";
  const supporting =
    findTextProperty(properties, ["Supporting text"]) ?? "Supporting line text";
  const overline = findTextProperty(properties, ["Overline"]);
  const trailingText = findTextProperty(properties, ["Trailing supporting text"]);
  const leadingVariant = findInstanceValue(node, "Leading");
  const trailingVariant = findInstanceValue(node, "Trailing");
  const showDivider = !isFalseLike(findInstanceValue(node, "Show divider"));
  const textLeft = leadingVariant === "Image" ? 88 : 24;
  const titleY = overline ? 28 : 22;

  return [
    `<rect x="0" y="0" width="${formatNumber(width)}" height="${formatNumber(
      height
    )}" rx="0" fill="${FALLBACK_SURFACE}" />`,
    leadingVariant === "Image"
      ? `<rect x="16" y="${formatNumber(Math.max((height - 56) / 2, 12))}" width="56" height="56" rx="16" fill="#d7c4b2" />`
      : "",
    overline
      ? renderLabelText(textLeft, 12, overline, {
          color: FALLBACK_MUTED_TEXT,
          fontSize: 12,
          fontWeight: 500
        })
      : "",
    renderLabelText(textLeft, titleY, headline, {
      fontSize: 16,
      fontWeight: 500
    }),
    renderLabelText(textLeft, titleY + 24, supporting, {
      color: FALLBACK_MUTED_TEXT,
      fontSize: 14,
      fontWeight: 400
    }),
    trailingText
      ? renderLabelText(width - Math.min(trailingText.length * 8 + 32, 90), 28, trailingText, {
          color: FALLBACK_MUTED_TEXT,
          fontSize: 14,
          fontWeight: 500
        })
      : "",
    trailingVariant === "Icon"
      ? renderLabelText(width - 34, Math.max(height / 2 - 12, 12), "→", {
          fontSize: 20,
          fontWeight: 500
        })
      : "",
    showDivider
      ? `<line x1="16" y1="${formatNumber(height - 0.5)}" x2="${formatNumber(
          width - 16
        )}" y2="${formatNumber(height - 0.5)}" stroke="${FALLBACK_STROKE}" stroke-width="1" />`
      : ""
  ].join("");
}

function renderDivider(width: number, height: number): string {
  const y = Math.max(height / 2, 0.5);

  return `<line x1="0" y1="${formatNumber(y)}" x2="${formatNumber(width)}" y2="${formatNumber(
    y
  )}" stroke="${FALLBACK_STROKE}" stroke-width="1" />`;
}

function renderSymbolIcon(
  width: number,
  height: number,
  glyph: string,
  color = FALLBACK_TEXT
): string {
  const glyphSize = clamp(Math.min(width, height) * 0.9, 14, 22);

  return renderLabelText(width / 2, Math.max((height - glyphSize) / 2, 0), glyph, {
    color,
    fontSize: glyphSize,
    fontWeight: 500,
    textAnchor: "middle"
  });
}

function renderAssistiveChip(width: number, height: number, node: DesignNode): string {
  const label =
    findOverrideText(node, ["Label", "Label text"]) ??
    findTextProperty(getInstanceProperties(node), ["Label", "Label text"]) ??
    (node.name ?? "Chip").replace(/\s+\d+$/, "");

  return [
    `<rect x="0.5" y="0.5" width="${formatNumber(width - 1)}" height="${formatNumber(
      height - 1
    )}" rx="${formatNumber(height / 2)}" fill="#f7f2fa" stroke="${FALLBACK_STROKE}" stroke-width="1" />`,
    renderLabelText(16, Math.max((height - 16) / 2, 0), label, {
      color: FALLBACK_TEXT,
      fontSize: 14,
      fontWeight: 500
    })
  ].join("");
}

function renderGestureBar(width: number, height: number): string {
  const barWidth = Math.min(Math.max(width * 0.24, 92), 132);

  return `<rect x="${formatNumber((width - barWidth) / 2)}" y="${formatNumber(
    Math.max(height / 2 - 2, 0)
  )}" width="${formatNumber(barWidth)}" height="4" rx="2" fill="${FALLBACK_TEXT}" opacity="0.72" />`;
}

function renderFallbackInstance(width: number, height: number, node: DesignNode): string {
  const label = node.name ?? "Instance";
  const variantLabels = getVariantLabels(node);
  const chips = variantLabels
    .slice(0, 2)
    .map((value, index) => renderChip(16 + index * 110, height - 34, value))
    .join("");

  return [
    `<rect x="0.5" y="0.5" width="${formatNumber(width - 1)}" height="${formatNumber(
      height - 1
    )}" rx="20" fill="#f7f2fa" stroke="${FALLBACK_STROKE}" stroke-width="1" />`,
    renderLabelText(16, 16, label, {
      fontSize: 15,
      fontWeight: 600
    }),
    renderLabelText(16, 40, "Preserved instance", {
      color: FALLBACK_MUTED_TEXT,
      fontSize: 12,
      fontWeight: 500,
      letterSpacing: 0.2
    }),
    chips
  ].join("");
}

function renderInstanceNode(node: DesignNode, context: RenderContext): string {
  context.stats.instanceCount += 1;
  const { width, height } = getNodeSize(node, context.document);
  const metadata = getInstanceMetadata(context.document, node);
  const setName = metadata?.componentSetName?.toLowerCase() ?? "";
  const fallbackName = node.name ?? "instance";
  const componentName = metadata?.componentName.toLowerCase() ?? fallbackName.toLowerCase();
  const { markup, materialized } = (() => {
    if (componentName.includes("status-bar")) {
      return { markup: renderStatusBar(width), materialized: true };
    }

    if (setName === "app bar") {
      return { markup: renderAppBar(width, height, node), materialized: true };
    }

    if (setName === "carousel") {
      return { markup: renderCarousel(width, height), materialized: true };
    }

    if (setName === "icon button - standard") {
      return { markup: renderIconButton(width, height, node), materialized: true };
    }

    if (componentName.includes("favorite")) {
      return {
        markup: renderSymbolIcon(width, height, "♥", "#b3261e"),
        materialized: true
      };
    }

    if (componentName.includes("star")) {
      return {
        markup: renderSymbolIcon(width, height, "★", "#f59f00"),
        materialized: true
      };
    }

    if (componentName.includes("divider")) {
      return { markup: renderDivider(width, height), materialized: true };
    }

    if (setName.includes("chip") || componentName.includes("chip")) {
      return { markup: renderAssistiveChip(width, height, node), materialized: true };
    }

    if (componentName.includes("button") || fallbackName.toLowerCase().includes("button")) {
      return { markup: renderTextButton(width, height, node), materialized: true };
    }

    if (componentName.includes("navigation")) {
      return { markup: renderGestureBar(width, height), materialized: true };
    }

    if (componentName.includes("list item") || setName.includes("list item")) {
      return { markup: renderListItem(width, height, node), materialized: true };
    }

    return {
      markup: renderFallbackInstance(width, height, node),
      materialized: false
    };
  })();

  if (materialized) {
    context.stats.materializedInstanceCount += 1;
  } else {
    context.stats.fallbackInstanceCount += 1;
  }

  return [
    renderBackground(context, node, width, height, materialized ? null : "#f7f2fa"),
    markup
  ].join("");
}

function renderChildren(node: DesignNode, context: RenderContext): string {
  const inferredPositions = getFlowLayoutPositions(node, context.document);

  return (node.children ?? [])
    .map((child) => {
      const inferredPosition = inferredPositions.get(child);

      return renderNode(child, context, inferredPosition ? { position: inferredPosition } : {});
    })
    .join("");
}

function renderNode(
  node: DesignNode,
  context: RenderContext,
  options: { ignorePosition?: boolean; position?: NodePosition } = {}
): string {
  context.stats.nodeCount += 1;
  const { x, y } = options.ignorePosition
    ? { x: 0, y: 0 }
    : options.position ?? getNodePosition(node);
  const { width, height } = getNodeSize(node, context.document);
  const opacity = getNodeOpacity(node);
  const shadowFilter = getNodeShadowFilter(context, node);
  const content =
    node.kind === "text"
      ? renderTextNode(node, context)
      : node.kind === "instance"
        ? renderInstanceNode(node, context)
        : (() => {
            const children = renderChildren(node, context);
            const clipId = shouldClipNode(node)
              ? registerNodeClipPath(context, node, width, height)
              : null;

            return `${renderBackground(
              context,
              node,
              width,
              height,
              node.kind === "frame" ? FALLBACK_SURFACE : null
            )}${clipId ? `<g clip-path="url(#${clipId})">${children}</g>` : children}`;
          })();
  const attributes = [
    `transform="translate(${formatNumber(x)}, ${formatNumber(y)})"`,
    opacity !== undefined ? `opacity="${formatNumber(opacity)}"` : "",
    shadowFilter ? `filter="${shadowFilter}"` : ""
  ]
    .filter(Boolean)
    .join(" ");

  return `<g ${attributes}>${content}</g>`;
}

function getDocumentPageLabel(document: DesignDocument): string {
  return isDesignDocumentV0_1(document)
    ? document.capture.page.name
    : document.capture.page;
}

export function renderDesignDocumentSnapshot(document: DesignDocument): SnapshotRenderResult {
  const context: RenderContext = {
    defs: [],
    document,
    nextDefId: 0,
    stats: {
      fallbackInstanceCount: 0,
      materializedInstanceCount: 0,
      instanceCount: 0,
      nodeCount: 0,
      textNodeCount: 0
    }
  };
  const rootSizes = document.roots.map((root) => getNodeSize(root, document));
  const widestRoot = rootSizes.reduce((current, rootSize) => Math.max(current, rootSize.width), 0);
  const totalRootHeight =
    rootSizes.reduce((current, rootSize) => current + rootSize.height, 0) +
    Math.max(document.roots.length - 1, 0) * SNAPSHOT_GAP;
  const width = Math.ceil(widestRoot + SNAPSHOT_MARGIN * 2);
  const height = Math.ceil(totalRootHeight + SNAPSHOT_MARGIN * 2);
  let currentYOffset = SNAPSHOT_MARGIN;

  const rootMarkup = document.roots
    .map((root, index) => {
      const rootSize = rootSizes[index];
      const rootBody = renderNode(root, context, { ignorePosition: true });
      const markup = `<g transform="translate(${SNAPSHOT_MARGIN}, ${formatNumber(
        currentYOffset
      )})">${rootBody}</g>`;

      currentYOffset += (rootSize?.height ?? 0) + SNAPSHOT_GAP;

      return markup;
    })
    .join("");

  return {
    height,
    stats: context.stats,
    svg: [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${formatNumber(
        width
      )}" height="${formatNumber(height)}" viewBox="0 0 ${formatNumber(
        width
      )} ${formatNumber(height)}" fill="none">`,
      context.defs.length > 0 ? `<defs>${context.defs.join("")}</defs>` : "",
      `<rect width="${formatNumber(width)}" height="${formatNumber(
        height
      )}" fill="#f3edf7" />`,
      rootMarkup,
      "</svg>"
    ].join(""),
    width
  };
}

export function renderDesignDocumentSnapshotHtml(
  document: DesignDocument,
  renderResult = renderDesignDocumentSnapshot(document)
): string {
  const pageLabel = escapeXml(getDocumentPageLabel(document));

  return [
    "<!doctype html>",
    '<html lang="en">',
    "  <head>",
    '    <meta charset="utf-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `    <title>${pageLabel} Snapshot</title>`,
    "    <style>",
    "      :root {",
    "        color-scheme: light;",
    "        font-family: Inter, 'SF Pro Display', 'Segoe UI', sans-serif;",
    "      }",
    "      * { box-sizing: border-box; }",
    "      body {",
    "        margin: 0;",
    "        min-height: 100vh;",
    "        background: linear-gradient(180deg, #f7f1e9 0%, #ece4d8 100%);",
    "        color: #1b1d18;",
    "      }",
    "      main {",
    "        max-width: 1200px;",
    "        margin: 0 auto;",
    "        padding: 32px 24px 48px;",
    "      }",
    "      .header {",
    "        display: flex;",
    "        justify-content: space-between;",
    "        align-items: flex-end;",
    "        gap: 16px;",
    "        margin-bottom: 24px;",
    "      }",
    "      h1 {",
    "        margin: 0;",
    "        font-size: 28px;",
    "        line-height: 1.05;",
    "      }",
    "      .meta {",
    "        display: flex;",
    "        gap: 12px;",
    "        flex-wrap: wrap;",
    "        color: #5d6158;",
    "        font-size: 13px;",
    "      }",
    "      .chip {",
    "        padding: 8px 12px;",
    "        border-radius: 999px;",
    "        background: rgba(255,255,255,0.75);",
    "        border: 1px solid rgba(27, 29, 24, 0.08);",
    "      }",
    "      .canvas {",
    "        overflow: auto;",
    "        padding: 20px;",
    "        border-radius: 20px;",
    "        background: rgba(255,255,255,0.6);",
    "        border: 1px solid rgba(27, 29, 24, 0.08);",
    "        box-shadow: 0 18px 48px rgba(64, 52, 40, 0.12);",
    "      }",
    "      .canvas svg {",
    "        display: block;",
    "        max-width: 100%;",
    "        height: auto;",
    "      }",
    "    </style>",
    "  </head>",
    "  <body>",
    "    <main>",
    '      <div class="header">',
    `        <div><h1>${pageLabel}</h1></div>`,
    '        <div class="meta">',
    `          <div class="chip">${renderResult.stats.nodeCount} nodes</div>`,
    `          <div class="chip">${renderResult.stats.instanceCount} instances</div>`,
    `          <div class="chip">${renderResult.width} x ${renderResult.height}</div>`,
    "        </div>",
    "      </div>",
    '      <div class="canvas">',
    renderResult.svg,
    "      </div>",
    "    </main>",
    "  </body>",
    "</html>"
  ].join("\n");
}
