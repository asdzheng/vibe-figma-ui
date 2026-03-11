import type {
  ComponentPropertyValue,
  DesignDocument,
  DesignNode,
  PaintValue,
  RadiusValue,
  StyleRegistryEntry
} from "@vibe-figma/schema";

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
  document: DesignDocument;
  stats: SnapshotRenderStats;
};

type NodeSize = {
  height: number;
  width: number;
};

type InstanceMetadata = {
  componentName: string;
  componentSetName: string | null;
};

type LabelTextOptions = {
  color?: string;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
};

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

function getNodeSize(node: DesignNode): NodeSize {
  const width = node.bounds?.width ?? 320;
  const height = node.bounds?.height ?? 120;

  return {
    height: Math.max(height, 1),
    width: Math.max(width, 1)
  };
}

function getNodePosition(node: DesignNode): { x: number; y: number } {
  return {
    x: node.bounds?.x ?? 0,
    y: node.bounds?.y ?? 0
  };
}

function getRadiusValue(radius: RadiusValue | undefined): number {
  if (!radius) {
    return 0;
  }

  if (radius.mode === "uniform") {
    return radius.value;
  }

  return Math.max(radius.topLeft, radius.topRight, radius.bottomRight, radius.bottomLeft);
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

  return rgbToHex({
    b: Number(color.b),
    g: Number(color.g),
    r: Number(color.r)
  });
}

function getPaintColor(document: DesignDocument, paint: PaintValue | undefined): string | undefined {
  if (!paint) {
    return undefined;
  }

  if (typeof paint.fallback === "string" && paint.fallback.startsWith("#")) {
    return paint.fallback;
  }

  if (paint.styleRef) {
    return normalizeStyleColor(document.registries.styles[paint.styleRef]);
  }

  return undefined;
}

function getPrimaryPaintColor(
  document: DesignDocument,
  paints: readonly PaintValue[] | undefined,
  fallbackColor: string
): string {
  const color = paints?.map((paint) => getPaintColor(document, paint)).find(Boolean);

  return color ?? fallbackColor;
}

function getStrokeAppearance(
  document: DesignDocument,
  node: DesignNode
): { color: string; width: number } | null {
  const [stroke] = node.appearance?.stroke ?? [];

  if (!stroke) {
    return null;
  }

  return {
    color: getPrimaryPaintColor(document, stroke.paints, FALLBACK_STROKE),
    width: stroke.width ?? 1
  };
}

function getTextStyleName(document: DesignDocument, node: DesignNode): string {
  const textStyleRef = node.content?.text?.textStyleRef;

  if (!textStyleRef) {
    return "";
  }

  return document.registries.styles[textStyleRef]?.name?.toLowerCase() ?? "";
}

function resolveTextMetrics(document: DesignDocument, node: DesignNode): {
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
} {
  const styleName = getTextStyleName(document, node);

  if (styleName.includes("headline/medium")) {
    return {
      fontSize: 28,
      fontWeight: 500,
      lineHeight: 36
    };
  }

  if (styleName.includes("title/large")) {
    return {
      fontSize: 22,
      fontWeight: 400,
      lineHeight: 28
    };
  }

  if (styleName.includes("label/large")) {
    return {
      fontSize: 14,
      fontWeight: 500,
      lineHeight: 20
    };
  }

  if (styleName.includes("body/large")) {
    return {
      fontSize: 16,
      fontWeight: 400,
      lineHeight: 24
    };
  }

  if (styleName.includes("body/medium")) {
    return {
      fontSize: 14,
      fontWeight: 400,
      lineHeight: 20
    };
  }

  const { height } = getNodeSize(node);
  const fontSize = Math.max(Math.min(height * 0.72, 20), 12);

  return {
    fontSize,
    fontWeight: 400,
    lineHeight: fontSize * 1.35
  };
}

function wrapText(value: string, maxCharsPerLine: number): string[] {
  if (!value.trim()) {
    return [""];
  }

  const words = value.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length <= maxCharsPerLine || !currentLine) {
      currentLine = nextLine;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
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
  const fontSize = options.fontSize ?? 14;
  const fontWeight = options.fontWeight ?? 500;
  const letterSpacing = options.letterSpacing ?? 0;

  return `<text x="${formatNumber(x)}" y="${formatNumber(y)}" fill="${escapeXml(
    color
  )}" font-family="${escapeXml(
    DEFAULT_FONT_FAMILY
  )}" font-size="${formatNumber(fontSize)}" font-weight="${fontWeight}" letter-spacing="${formatNumber(
    letterSpacing
  )}" dominant-baseline="hanging">${escapeXml(value)}</text>`;
}

function renderChip(x: number, y: number, value: string): string {
  const chipWidth = Math.max(46, value.length * 7.2 + 18);

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

function getInstanceProperties(node: DesignNode): Record<string, ComponentPropertyValue> {
  return node.designSystem?.instance?.properties ?? {};
}

function findPropertyValue(
  properties: Record<string, ComponentPropertyValue>,
  propertyName: string
): string | boolean | null {
  const matchedEntry = Object.entries(properties).find(([key]) =>
    sanitizeVariantLabel(key) === propertyName
  );

  return matchedEntry?.[1].value ?? null;
}

function findTextProperty(
  properties: Record<string, ComponentPropertyValue>,
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

function findFirstTextProperty(
  properties: Record<string, ComponentPropertyValue>
): string | null {
  const matchedEntry = Object.values(properties).find(
    (propertyValue) => propertyValue.type === "TEXT" && typeof propertyValue.value === "string"
  );

  return typeof matchedEntry?.value === "string" ? matchedEntry.value : null;
}

function findOverrideText(
  node: DesignNode,
  propertyNames: readonly string[]
): string | null {
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
  const variantEntries = Object.entries(node.designSystem?.instance?.variant ?? {});

  return variantEntries
    .slice(0, 4)
    .map(([key, value]) => `${sanitizeVariantLabel(key)}: ${value}`);
}

function renderBackground(
  document: DesignDocument,
  node: DesignNode,
  width: number,
  height: number,
  fallbackFill: string | null
): string {
  const fill =
    getPrimaryPaintColor(document, node.appearance?.background, fallbackFill ?? "transparent");
  const radius = getRadiusValue(node.appearance?.radius);
  const strokeAppearance = getStrokeAppearance(document, node);
  const inset = strokeAppearance?.width ? strokeAppearance.width / 2 : 0;
  const rectWidth = Math.max(width - inset * 2, 1);
  const rectHeight = Math.max(height - inset * 2, 1);

  return `<rect x="${formatNumber(inset)}" y="${formatNumber(
    inset
  )}" width="${formatNumber(rectWidth)}" height="${formatNumber(
    rectHeight
  )}" rx="${formatNumber(radius)}" fill="${escapeXml(fill)}"${
    strokeAppearance
      ? ` stroke="${escapeXml(strokeAppearance.color)}" stroke-width="${formatNumber(
          strokeAppearance.width
        )}"`
      : ""
  } />`;
}

function renderTextNode(node: DesignNode, context: RenderContext): string {
  context.stats.textNodeCount += 1;
  const { width } = getNodeSize(node);
  const textContent = node.content?.text;
  const textValue = textContent?.characters ?? node.name;
  const textColor = getPrimaryPaintColor(
    context.document,
    textContent?.fill ?? node.appearance?.background,
    FALLBACK_TEXT
  );
  const metrics = resolveTextMetrics(context.document, node);
  const wrappedLines = wrapText(
    textValue,
    Math.max(Math.floor(width / (metrics.fontSize * 0.35)), 1)
  );

  return wrappedLines
    .map((line, index) =>
      renderLabelText(0, index * metrics.lineHeight, line, {
        color: textColor,
        fontSize: metrics.fontSize,
        fontWeight: metrics.fontWeight
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
  const showFirst = findPropertyValue(getInstanceProperties(node), "Show 1st trailing action") !== false;
  const showSecond =
    findPropertyValue(getInstanceProperties(node), "Show 2nd trailing action") !== false;
  const showThird = findPropertyValue(getInstanceProperties(node), "Show 3rd trailing action") !== false;
  const labels = ["App bar", ...getVariantLabels(node).slice(0, 2)];
  const actionCenters = [width - 36, width - 84, width - 132];
  const visibleActions = [showFirst, showSecond, showThird];
  const labelY = height >= 100 ? 58 : 30;

  return [
    renderLabelText(20, labelY, labels[0] ?? node.name, {
      fontSize: height >= 100 ? 28 : 20,
      fontWeight: 500
    }),
    labels[1] ? renderChip(20, labelY + 40, labels[1]) : "",
    labels[2] ? renderChip(120, labelY + 40, labels[2]) : "",
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
    node.name;

  return [
    `<rect x="0.5" y="0.5" width="${formatNumber(width - 1)}" height="${formatNumber(
      height - 1
    )}" rx="${formatNumber(Math.min(height / 2, 20))}" fill="transparent" />`,
    renderLabelText(Math.max(width - label.length * 8.4 - 6, 4), Math.max((height - 20) / 2, 0), label, {
      color: FALLBACK_PRIMARY,
      fontSize: 14,
      fontWeight: 600
    })
  ].join("");
}

function mapIconNameToGlyph(value: string | null): string {
  if (!value) {
    return "•";
  }

  if (value.includes("arrow_back")) {
    return "←";
  }

  if (value.includes("arrow_forward")) {
    return "→";
  }

  if (value.includes("attach_file")) {
    return "⌘";
  }

  if (value.includes("today")) {
    return "◫";
  }

  if (value.includes("more_vert")) {
    return "⋮";
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
  const leadingVariant = findPropertyValue(properties, "Leading");
  const trailingVariant = findPropertyValue(properties, "Trailing");
  const showDivider = findPropertyValue(properties, "Show divider") !== false;
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

function renderGestureBar(width: number, height: number): string {
  const barWidth = Math.min(Math.max(width * 0.24, 92), 132);

  return `<rect x="${formatNumber((width - barWidth) / 2)}" y="${formatNumber(
    Math.max(height / 2 - 2, 0)
  )}" width="${formatNumber(barWidth)}" height="4" rx="2" fill="${FALLBACK_TEXT}" opacity="0.72" />`;
}

function renderFallbackInstance(width: number, height: number, node: DesignNode): string {
  const label = node.name;
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
  const { width, height } = getNodeSize(node);
  const metadata = getInstanceMetadata(context.document, node);
  const setName = metadata?.componentSetName?.toLowerCase() ?? "";
  const componentName = metadata?.componentName.toLowerCase() ?? node.name.toLowerCase();

  let markup = "";
  let materialized = true;

  if (componentName.includes("status-bar")) {
    markup = renderStatusBar(width);
  } else if (setName === "app bar") {
    markup = renderAppBar(width, height, node);
  } else if (setName === "carousel") {
    markup = renderCarousel(width, height);
  } else if (setName === "icon button - standard") {
    markup = renderIconButton(width, height, node);
  } else if (node.name.toLowerCase().includes("button")) {
    markup = renderTextButton(width, height, node);
  } else if (componentName.includes("navigation")) {
    markup = renderGestureBar(width, height);
  } else if (componentName.includes("condition=3 line+")) {
    markup = renderListItem(width, height, node);
  } else {
    markup = renderFallbackInstance(width, height, node);
    materialized = false;
  }

  if (materialized) {
    context.stats.materializedInstanceCount += 1;
  } else {
    context.stats.fallbackInstanceCount += 1;
  }

  return [
    renderBackground(context.document, node, width, height, materialized ? null : "#f7f2fa"),
    markup
  ].join("");
}

function renderChildren(node: DesignNode, context: RenderContext): string {
  return (node.children ?? []).map((child) => renderNode(child, context)).join("");
}

function renderNode(
  node: DesignNode,
  context: RenderContext,
  options: { ignorePosition?: boolean } = {}
): string {
  context.stats.nodeCount += 1;
  const { x, y } = options.ignorePosition ? { x: 0, y: 0 } : getNodePosition(node);
  const { width, height } = getNodeSize(node);
  let content = "";

  if (node.kind === "text") {
    content = renderTextNode(node, context);
  } else if (node.kind === "instance") {
    content = renderInstanceNode(node, context);
  } else {
    const fallbackFill = node.kind === "frame" ? FALLBACK_SURFACE : null;
    const background = renderBackground(context.document, node, width, height, fallbackFill);
    const children = renderChildren(node, context);

    content = `${background}${children}`;
  }

  return `<g transform="translate(${formatNumber(x)}, ${formatNumber(y)})">${content}</g>`;
}

export function renderDesignDocumentSnapshot(document: DesignDocument): SnapshotRenderResult {
  const context: RenderContext = {
    document,
    stats: {
      fallbackInstanceCount: 0,
      materializedInstanceCount: 0,
      instanceCount: 0,
      nodeCount: 0,
      textNodeCount: 0
    }
  };
  const rootSizes = document.roots.map((root) => getNodeSize(root));
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
      `<rect width="${formatNumber(width)}" height="${formatNumber(
        height
      )}" fill="#f3edf7" />`,
      rootMarkup,
      "</svg>"
    ].join(""),
    width
  };
}
