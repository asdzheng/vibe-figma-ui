import type {
  ComponentPolicyRule,
  ComponentPropertyValue,
  DesignDocument,
  DesignRegistries
} from "@vibe-figma/schema";
import type { ComponentPolicyContext } from "@vibe-figma/capture-core";

export type {
  DesignDocument,
  DesignRegistries
} from "@vibe-figma/schema";

export type FigmaPaintLike = {
  assetRef?: string | undefined;
  color?: {
    b: number;
    g: number;
    r: number;
  } | undefined;
  fallback?: unknown;
  opacity?: number | undefined;
  scaleMode?: "FILL" | "FIT" | "TILE" | "STRETCH" | undefined;
  styleRef?: string | undefined;
  tokenRef?: string | string[] | undefined;
  type: "SOLID" | "GRADIENT" | "IMAGE";
};

export type FigmaEffectLike = {
  fallback?: unknown;
  styleRef?: string | undefined;
  tokenRef?: string | string[] | undefined;
  type: string;
};

export type FigmaPreferredValueLike = {
  key: string;
  type: "COMPONENT" | "COMPONENT_SET";
};

export type FigmaComponentPropertyDefinitionLike = {
  defaultValue?: string | boolean | undefined;
  preferredValues?: FigmaPreferredValueLike[] | undefined;
  type: ComponentPropertyValue["type"];
  variantOptions?: string[] | undefined;
  variableRef?: string | undefined;
};

export type FigmaComponentLike = {
  componentSet?: {
    key?: string | undefined;
    name: string;
    properties?: Record<string, FigmaComponentPropertyDefinitionLike> | undefined;
    remote?: boolean | undefined;
  } | undefined;
  id?: string | undefined;
  key?: string | undefined;
  libraryName?: string | undefined;
  name: string;
  properties?: Record<string, FigmaComponentPropertyDefinitionLike> | undefined;
  remote?: boolean | undefined;
};

export type FigmaComponentPropertyLike = {
  preferredValues?: FigmaPreferredValueLike[] | undefined;
  type: ComponentPropertyValue["type"];
  value: string | boolean;
  variableRef?: string | undefined;
};

export type FigmaGridTrackLike = {
  type: "FLEX" | "FIXED" | "HUG";
  value?: number | undefined;
};

export type FigmaTextSegmentLike = {
  characters: string;
  end: number;
  fill?: readonly FigmaPaintLike[] | undefined;
  start: number;
  textStyleRef?: string | undefined;
};

export type FigmaNodeLike = {
  characters?: string | undefined;
  children?: readonly FigmaNodeLike[] | undefined;
  clipsContent?: boolean | undefined;
  componentProperties?: Record<string, FigmaComponentPropertyLike> | undefined;
  componentPropertyReferences?: Record<string, string> | undefined;
  constraints?: {
    horizontal: string;
    vertical: string;
  } | undefined;
  cornerRadius?: number | undefined;
  counterAxisAlignItems?: "MIN" | "MAX" | "CENTER" | "BASELINE" | undefined;
  effectStyleRef?: string | undefined;
  effects?: readonly FigmaEffectLike[] | undefined;
  fillStyleRef?: string | undefined;
  fills?: readonly FigmaPaintLike[] | undefined;
  gridChildHorizontalAlign?: "MIN" | "CENTER" | "MAX" | "AUTO" | undefined;
  gridChildVerticalAlign?: "MIN" | "CENTER" | "MAX" | "AUTO" | undefined;
  gridColumnAnchorIndex?: number | undefined;
  gridColumnCount?: number | undefined;
  gridColumnGap?: number | undefined;
  gridColumnSizes?: readonly FigmaGridTrackLike[] | undefined;
  gridColumnSpan?: number | undefined;
  gridRowAnchorIndex?: number | undefined;
  gridRowCount?: number | undefined;
  gridRowGap?: number | undefined;
  gridRowSizes?: readonly FigmaGridTrackLike[] | undefined;
  gridRowSpan?: number | undefined;
  height?: number | undefined;
  id: string;
  itemSpacing?: number | undefined;
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL" | "GRID" | undefined;
  layoutPositioning?: "AUTO" | "ABSOLUTE" | undefined;
  layoutSizingHorizontal?: "FIXED" | "HUG" | "FILL" | undefined;
  layoutSizingVertical?: "FIXED" | "HUG" | "FILL" | undefined;
  layoutWrap?: "NO_WRAP" | "WRAP" | undefined;
  locked?: boolean | undefined;
  mainComponent?: FigmaComponentLike | undefined;
  maxLines?: number | null | undefined;
  name: string;
  opacity?: number | undefined;
  paddingBottom?: number | undefined;
  paddingLeft?: number | undefined;
  paddingRight?: number | undefined;
  paddingTop?: number | undefined;
  primaryAxisAlignItems?:
    | "MIN"
    | "MAX"
    | "CENTER"
    | "SPACE_BETWEEN"
    | undefined;
  resolvedVariableModes?: Record<string, string> | undefined;
  rotation?: number | undefined;
  strokeAlign?: "INSIDE" | "CENTER" | "OUTSIDE" | undefined;
  strokeStyleRef?: string | undefined;
  strokeWeight?: number | undefined;
  strokes?: readonly FigmaPaintLike[] | undefined;
  textAlignHorizontal?:
    | "LEFT"
    | "CENTER"
    | "RIGHT"
    | "JUSTIFIED"
    | undefined;
  textAlignVertical?: "TOP" | "CENTER" | "BOTTOM" | undefined;
  textAutoResize?:
    | "NONE"
    | "WIDTH_AND_HEIGHT"
    | "HEIGHT"
    | "TRUNCATE"
    | undefined;
  textSegments?: readonly FigmaTextSegmentLike[] | undefined;
  textStyleRef?: string | undefined;
  topLeftRadius?: number | undefined;
  topRightRadius?: number | undefined;
  bottomLeftRadius?: number | undefined;
  bottomRightRadius?: number | undefined;
  type: string;
  variantProperties?: Record<string, string> | undefined;
  visible?: boolean | undefined;
  width?: number | undefined;
  x?: number | undefined;
  y?: number | undefined;
};

export type BuildSelectionCaptureInput = {
  componentContextByRef?: Record<string, Partial<ComponentPolicyContext>> | undefined;
  componentPolicyRules?: readonly ComponentPolicyRule[] | undefined;
  page: {
    id: string;
    name: string;
  };
  pluginVersion: string;
  profile?: "canonical" | "debug" | undefined;
  registries?: Partial<DesignRegistries> | undefined;
  selection: readonly FigmaNodeLike[];
  sourceFileKey?: string | undefined;
  timestamp?: string | undefined;
};

export type SelectionCaptureBuilder = (
  input: BuildSelectionCaptureInput
) => DesignDocument;
