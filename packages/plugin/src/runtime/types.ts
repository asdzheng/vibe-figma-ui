export type RuntimeVariableAlias = {
  id: string;
  type: "VARIABLE_ALIAS";
};

export type RuntimeVariableValue =
  | boolean
  | number
  | string
  | RuntimeVariableAlias
  | {
      a?: number;
      b: number;
      g: number;
      r: number;
    };

export type RuntimeVariable = {
  codeSyntax?: Partial<Record<"ANDROID" | "WEB" | "iOS", string>>;
  id: string;
  key?: string;
  name: string;
  remote?: boolean;
  resolvedType: "BOOLEAN" | "COLOR" | "FLOAT" | "STRING";
  valuesByMode: Record<string, RuntimeVariableValue>;
  variableCollectionId: string;
};

export type RuntimeVariableCollection = {
  id: string;
  key?: string;
  modes: Array<{
    modeId: string;
    name: string;
  }>;
  name: string;
  remote?: boolean;
};

export type RuntimePaint = {
  boundVariables?: Partial<Record<"color" | "opacity", RuntimeVariableAlias>>;
  color?: {
    b: number;
    g: number;
    r: number;
  };
  gradientStops?: ReadonlyArray<{
    color: {
      a?: number;
      b: number;
      g: number;
      r: number;
    };
    position: number;
  }>;
  imageHash?: string | null;
  opacity?: number;
  scaleMode?: "FILL" | "FIT" | "CROP" | "TILE";
  type:
    | "SOLID"
    | "GRADIENT_LINEAR"
    | "GRADIENT_RADIAL"
    | "GRADIENT_ANGULAR"
    | "GRADIENT_DIAMOND"
    | "IMAGE";
  visible?: boolean;
};

export type RuntimeEffect = {
  blendMode?: string;
  boundVariables?: Record<string, RuntimeVariableAlias | undefined>;
  color?: {
    a?: number;
    b: number;
    g: number;
    r: number;
  };
  offset?: {
    x: number;
    y: number;
  };
  radius?: number;
  spread?: number;
  type: string;
  visible?: boolean;
};

export type RuntimeStyle = {
  boundVariables?: Record<
    string,
    RuntimeVariableAlias | readonly RuntimeVariableAlias[] | undefined
  >;
  effects?: readonly RuntimeEffect[];
  id: string;
  key?: string;
  name: string;
  paints?: readonly RuntimePaint[];
  remote?: boolean;
  type: "PAINT" | "TEXT" | "EFFECT" | "GRID";
};

export type RuntimeInstanceSwapPreferredValue = {
  key: string;
  type: "COMPONENT" | "COMPONENT_SET";
};

export type RuntimeComponentPropertyDefinition = {
  boundVariables?: Record<"value", RuntimeVariableAlias | undefined>;
  defaultValue: string | boolean;
  preferredValues?: RuntimeInstanceSwapPreferredValue[];
  type: "BOOLEAN" | "TEXT" | "INSTANCE_SWAP" | "VARIANT";
  variantOptions?: string[];
};

export type RuntimeComponentPropertyDefinitions = Record<
  string,
  RuntimeComponentPropertyDefinition
>;

export type RuntimeComponentProperty = {
  boundVariables?: Record<"value", RuntimeVariableAlias | undefined>;
  preferredValues?: RuntimeInstanceSwapPreferredValue[];
  type: "BOOLEAN" | "TEXT" | "INSTANCE_SWAP" | "VARIANT";
  value: string | boolean;
};

export type RuntimeComponentProperties = Record<string, RuntimeComponentProperty>;

export type RuntimeComponentSetNode = {
  componentPropertyDefinitions?: RuntimeComponentPropertyDefinitions;
  key?: string;
  name: string;
  remote?: boolean;
  type: "COMPONENT_SET";
};

export type RuntimeComponentNode = {
  componentPropertyDefinitions?: RuntimeComponentPropertyDefinitions;
  id: string;
  key?: string;
  name: string;
  parent?: RuntimeComponentSetNode | { type: string } | null;
  remote?: boolean;
};

export type RuntimeSceneNode = {
  bottomLeftRadius?: number;
  bottomRightRadius?: number;
  boundVariables?: {
    componentProperties?: Record<string, RuntimeVariableAlias>;
    effects?: readonly RuntimeVariableAlias[];
    fills?: readonly RuntimeVariableAlias[];
    height?: RuntimeVariableAlias;
    itemSpacing?: RuntimeVariableAlias;
    paddingBottom?: RuntimeVariableAlias;
    paddingLeft?: RuntimeVariableAlias;
    paddingRight?: RuntimeVariableAlias;
    paddingTop?: RuntimeVariableAlias;
    strokes?: readonly RuntimeVariableAlias[];
    strokeWeight?: RuntimeVariableAlias;
    textRangeFills?: readonly RuntimeVariableAlias[];
    topLeftRadius?: RuntimeVariableAlias;
    topRightRadius?: RuntimeVariableAlias;
    visible?: RuntimeVariableAlias;
    width?: RuntimeVariableAlias;
  };
  characters?: string;
  children?: readonly RuntimeSceneNode[];
  clipsContent?: boolean;
  componentProperties?: RuntimeComponentProperties;
  componentPropertyReferences?:
    | {
        characters?: string;
        mainComponent?: string;
        visible?: string;
      }
    | null;
  constraints?: {
    horizontal: string;
    vertical: string;
  };
  cornerRadius?: number;
  counterAxisAlignItems?: "MIN" | "MAX" | "CENTER" | "BASELINE";
  effectStyleId?: string;
  effects?: readonly RuntimeEffect[];
  fillStyleId?: string;
  fills?: readonly RuntimePaint[] | symbol;
  height?: number;
  id: string;
  itemSpacing?: number;
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL" | "GRID";
  layoutPositioning?: "AUTO" | "ABSOLUTE";
  layoutSizingHorizontal?: "FIXED" | "HUG" | "FILL";
  layoutSizingVertical?: "FIXED" | "HUG" | "FILL";
  layoutWrap?: "NO_WRAP" | "WRAP";
  locked?: boolean;
  mainComponent?: RuntimeComponentNode | null;
  maxLines?: number | null;
  name: string;
  opacity?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  primaryAxisAlignItems?: "MIN" | "MAX" | "CENTER" | "SPACE_BETWEEN";
  resolvedVariableModes?: Record<string, string>;
  rotation?: number;
  strokeAlign?: "INSIDE" | "CENTER" | "OUTSIDE";
  strokeStyleId?: string;
  strokeWeight?: number;
  strokes?: readonly RuntimePaint[] | symbol;
  textAlignHorizontal?: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";
  textAlignVertical?: "TOP" | "CENTER" | "BOTTOM";
  textAutoResize?: "NONE" | "WIDTH_AND_HEIGHT" | "HEIGHT" | "TRUNCATE";
  textStyleId?: string | symbol;
  topLeftRadius?: number;
  topRightRadius?: number;
  type: string;
  variantProperties?: Record<string, string> | null;
  visible?: boolean;
  width?: number;
  x?: number;
  y?: number;
};

export type RuntimePluginApi = {
  getStyleById(id: string): RuntimeStyle | null;
  variables: {
    getVariableById(id: string): RuntimeVariable | null;
    getVariableCollectionById(id: string): RuntimeVariableCollection | null;
  };
};
