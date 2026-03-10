import type {
  RuntimeComponentNode,
  RuntimeComponentProperty,
  RuntimeComponentPropertyDefinition,
  RuntimeComponentProperties,
  RuntimeComponentPropertyDefinitions,
  RuntimeComponentSetNode,
  RuntimeEffect,
  RuntimePaint,
  RuntimePluginApi,
  RuntimeSceneNode,
  RuntimeStyle,
  RuntimeVariable,
  RuntimeVariableAlias,
  RuntimeVariableCollection
} from "./types.js";

type AsyncRuntimePluginApi = RuntimePluginApi & {
  getStyleByIdAsync(id: string): Promise<BaseStyle | null>;
  variables: RuntimePluginApi["variables"] & {
    getVariableByIdAsync(id: string): Promise<Variable | null>;
    getVariableCollectionByIdAsync(
      id: string
    ): Promise<VariableCollection | null>;
  };
};

type RuntimeSelectionNode = RuntimeSceneNode & {
  children?: readonly RuntimeSelectionNode[];
  getMainComponentAsync?: (() => Promise<ComponentNode | null>) | undefined;
};

type ComponentBoundVariablesInput =
  | {
      value?: RuntimeVariableAlias;
    }
  | Record<"value", RuntimeVariableAlias | undefined>;

type ComponentPropertyDefinitionInput = {
  boundVariables?: ComponentBoundVariablesInput;
  defaultValue: string | boolean;
  preferredValues?: RuntimeComponentPropertyDefinition["preferredValues"];
  type: RuntimeComponentPropertyDefinition["type"];
  variantOptions?: string[];
};

type ComponentPropertyDefinitionsInput = Record<
  string,
  ComponentPropertyDefinitionInput
>;

type ComponentSetNodeInput = {
  componentPropertyDefinitions?: ComponentPropertyDefinitionsInput;
  key?: string;
  name: string;
  remote?: boolean;
  type: "COMPONENT_SET";
};

type ComponentNodeInput = {
  componentPropertyDefinitions?: ComponentPropertyDefinitionsInput;
  id: string;
  key?: string;
  name: string;
  parent?: ComponentSetNodeInput | { type: string } | BaseNode | null;
  remote?: boolean;
};

function isComponentSetParent(
  parent: ComponentNodeInput["parent"]
): parent is ComponentSetNodeInput {
  return (
    !!parent &&
    parent.type === "COMPONENT_SET" &&
    "name" in parent &&
    typeof parent.name === "string"
  );
}

type RuntimeComponentPropertyInput = {
  boundVariables?: ComponentBoundVariablesInput;
  preferredValues?: RuntimeComponentProperty["preferredValues"];
  type: RuntimeComponentProperty["type"];
  value: RuntimeComponentProperty["value"];
};

function hasAsyncRuntimeLookups(
  pluginApi: RuntimePluginApi
): pluginApi is AsyncRuntimePluginApi {
  return (
    "getStyleByIdAsync" in pluginApi &&
    typeof pluginApi.getStyleByIdAsync === "function" &&
    "getVariableByIdAsync" in pluginApi.variables &&
    typeof pluginApi.variables.getVariableByIdAsync === "function" &&
    "getVariableCollectionByIdAsync" in pluginApi.variables &&
    typeof pluginApi.variables.getVariableCollectionByIdAsync === "function"
  );
}

function isVariableAlias(value: unknown): value is RuntimeVariableAlias {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "type" in value &&
    value.type === "VARIABLE_ALIAS"
  );
}

function isAliasArray(
  value: RuntimeVariableAlias | readonly RuntimeVariableAlias[] | undefined
): value is readonly RuntimeVariableAlias[] {
  return Array.isArray(value);
}

function isRuntimeSceneNodeArray(
  value: RuntimeSelectionNode["children"]
): value is readonly RuntimeSelectionNode[] {
  return Array.isArray(value);
}

function isRuntimePaintArray(
  value: RuntimeSceneNode["fills"] | RuntimeSceneNode["strokes"] | RuntimeStyle["paints"]
): value is readonly RuntimePaint[] {
  return Array.isArray(value);
}

function serializeRuntimeStyle(style: BaseStyle): RuntimeStyle {
  return {
    ...(style.boundVariables ? { boundVariables: style.boundVariables } : {}),
    ...("effects" in style && Array.isArray(style.effects)
      ? { effects: style.effects as readonly RuntimeEffect[] }
      : {}),
    id: style.id,
    ...(style.key ? { key: style.key } : {}),
    name: style.name,
    ...("paints" in style && Array.isArray(style.paints)
      ? { paints: style.paints as readonly RuntimePaint[] }
      : {}),
    ...(style.remote !== undefined ? { remote: style.remote } : {}),
    type: style.type
  };
}

function serializeRuntimeVariable(variable: Variable): RuntimeVariable {
  return {
    ...(variable.codeSyntax ? { codeSyntax: variable.codeSyntax } : {}),
    id: variable.id,
    ...(variable.key ? { key: variable.key } : {}),
    name: variable.name,
    ...(variable.remote !== undefined ? { remote: variable.remote } : {}),
    resolvedType: variable.resolvedType,
    valuesByMode: variable.valuesByMode,
    variableCollectionId: variable.variableCollectionId
  };
}

function serializeRuntimeVariableCollection(
  collection: VariableCollection
): RuntimeVariableCollection {
  return {
    id: collection.id,
    ...(collection.key ? { key: collection.key } : {}),
    modes: collection.modes.map((mode) => ({
      modeId: mode.modeId,
      name: mode.name
    })),
    name: collection.name,
    ...(collection.remote !== undefined ? { remote: collection.remote } : {})
  };
}

class RuntimeCaptureLookupContext {
  private readonly pendingCollections = new Map<string, Promise<void>>();
  private readonly pendingStyles = new Map<string, Promise<void>>();
  private readonly pendingVariables = new Map<string, Promise<void>>();
  private readonly styles = new Map<string, RuntimeStyle>();
  private readonly variableCollections = new Map<string, RuntimeVariableCollection>();
  private readonly variables = new Map<string, RuntimeVariable>();

  constructor(private readonly pluginApi: AsyncRuntimePluginApi) {}

  buildRuntimePluginApi(): RuntimePluginApi {
    return {
      getStyleById: (id) => this.styles.get(id) ?? null,
      variables: {
        getVariableById: (id) => this.variables.get(id) ?? null,
        getVariableCollectionById: (id) =>
          this.variableCollections.get(id) ?? null
      }
    };
  }

  async resolveStyle(styleId: string | undefined): Promise<void> {
    if (!styleId || this.styles.has(styleId)) {
      return;
    }

    const pending = this.pendingStyles.get(styleId);

    if (pending) {
      await pending;
      return;
    }

    const load = (async () => {
      const style = await this.pluginApi.getStyleByIdAsync(styleId);

      if (!style) {
        return;
      }

      const runtimeStyle = serializeRuntimeStyle(style);
      this.styles.set(styleId, runtimeStyle);

      await this.resolveBoundVariableRecord(runtimeStyle.boundVariables);
      await this.resolvePaints(runtimeStyle.paints);
      await this.resolveEffects(runtimeStyle.effects);
    })();

    this.pendingStyles.set(styleId, load);

    try {
      await load;
    } finally {
      this.pendingStyles.delete(styleId);
    }
  }

  async resolveVariableAlias(alias: RuntimeVariableAlias | undefined): Promise<void> {
    if (!alias) {
      return;
    }

    await this.resolveVariable(alias.id);
  }

  async resolveBoundVariableRecord(
    value:
      | Record<string, RuntimeVariableAlias | readonly RuntimeVariableAlias[] | undefined>
      | undefined
  ): Promise<void> {
    if (!value) {
      return;
    }

    for (const binding of Object.values(value)) {
      if (!binding) {
        continue;
      }

      if (isAliasArray(binding)) {
        await Promise.all(binding.map((alias) => this.resolveVariableAlias(alias)));
        continue;
      }

      await this.resolveVariableAlias(binding);
    }
  }

  async resolveNodeBoundVariables(
    boundVariables: RuntimeSceneNode["boundVariables"]
  ): Promise<void> {
    if (!boundVariables) {
      return;
    }

    await this.resolveBoundVariableRecord(
      boundVariables as Record<
        string,
        RuntimeVariableAlias | readonly RuntimeVariableAlias[] | undefined
      >
    );
  }

  async resolvePaints(
    paints:
      | RuntimeSceneNode["fills"]
      | RuntimeSceneNode["strokes"]
      | RuntimeStyle["paints"]
      | undefined
  ): Promise<void> {
    if (!isRuntimePaintArray(paints)) {
      return;
    }

    for (const paint of paints) {
      await this.resolveBoundVariableRecord(paint.boundVariables);
    }
  }

  async resolveEffects(effects: readonly RuntimeEffect[] | undefined): Promise<void> {
    if (!effects) {
      return;
    }

    for (const effect of effects) {
      await this.resolveBoundVariableRecord(effect.boundVariables);
    }
  }

  private async resolveVariable(variableId: string): Promise<void> {
    if (this.variables.has(variableId)) {
      return;
    }

    const pending = this.pendingVariables.get(variableId);

    if (pending) {
      await pending;
      return;
    }

    const load = (async () => {
      const variable = await this.pluginApi.variables.getVariableByIdAsync(variableId);

      if (!variable) {
        return;
      }

      const runtimeVariable = serializeRuntimeVariable(variable);
      this.variables.set(variableId, runtimeVariable);

      await this.resolveVariableCollection(runtimeVariable.variableCollectionId);

      for (const value of Object.values(runtimeVariable.valuesByMode)) {
        if (isVariableAlias(value)) {
          await this.resolveVariableAlias(value);
        }
      }
    })();

    this.pendingVariables.set(variableId, load);

    try {
      await load;
    } finally {
      this.pendingVariables.delete(variableId);
    }
  }

  private async resolveVariableCollection(collectionId: string): Promise<void> {
    if (this.variableCollections.has(collectionId)) {
      return;
    }

    const pending = this.pendingCollections.get(collectionId);

    if (pending) {
      await pending;
      return;
    }

    const load = (async () => {
      const collection =
        await this.pluginApi.variables.getVariableCollectionByIdAsync(collectionId);

      if (!collection) {
        return;
      }

      this.variableCollections.set(
        collectionId,
        serializeRuntimeVariableCollection(collection)
      );
    })();

    this.pendingCollections.set(collectionId, load);

    try {
      await load;
    } finally {
      this.pendingCollections.delete(collectionId);
    }
  }
}

async function resolveComponentPropertyDefinitions(
  definitions: ComponentPropertyDefinitionsInput | undefined,
  context: RuntimeCaptureLookupContext
): Promise<RuntimeComponentPropertyDefinitions | undefined> {
  if (!definitions) {
    return undefined;
  }

  const entries = await Promise.all(
    Object.entries(definitions).map(async ([name, definition]) => {
      await context.resolveVariableAlias(definition.boundVariables?.value);

      return [
        name,
        {
          ...(definition.boundVariables
            ? { boundVariables: { value: definition.boundVariables.value } }
            : {}),
          defaultValue: definition.defaultValue,
          ...(definition.preferredValues
            ? { preferredValues: [...definition.preferredValues] }
            : {}),
          type: definition.type,
          ...(definition.variantOptions
            ? { variantOptions: [...definition.variantOptions] }
            : {})
        } satisfies RuntimeComponentPropertyDefinition
      ] as const;
    })
  );

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

async function serializeComponentSetNode(
  componentSet: ComponentSetNodeInput,
  context: RuntimeCaptureLookupContext
): Promise<RuntimeComponentSetNode> {
  const componentPropertyDefinitions = await resolveComponentPropertyDefinitions(
    componentSet.componentPropertyDefinitions,
    context
  );

  return {
    ...(componentPropertyDefinitions ? { componentPropertyDefinitions } : {}),
    ...(componentSet.key ? { key: componentSet.key } : {}),
    name: componentSet.name,
    ...(componentSet.remote !== undefined ? { remote: componentSet.remote } : {}),
    type: "COMPONENT_SET"
  };
}

async function serializeComponentNode(
  component: ComponentNodeInput,
  context: RuntimeCaptureLookupContext
): Promise<RuntimeComponentNode> {
  const componentPropertyDefinitions = await resolveComponentPropertyDefinitions(
    component.componentPropertyDefinitions,
    context
  );
  const parent = isComponentSetParent(component.parent)
    ? await serializeComponentSetNode(component.parent, context)
    : component.parent
      ? { type: component.parent.type }
      : component.parent;

  return {
    ...(componentPropertyDefinitions ? { componentPropertyDefinitions } : {}),
    id: component.id,
    ...(component.key ? { key: component.key } : {}),
    name: component.name,
    ...(parent ? { parent } : {}),
    ...(component.remote !== undefined ? { remote: component.remote } : {})
  };
}

async function resolveMainComponent(
  node: RuntimeSelectionNode,
  context: RuntimeCaptureLookupContext
): Promise<RuntimeComponentNode | null | undefined> {
  if (typeof node.getMainComponentAsync === "function") {
    const component = await node.getMainComponentAsync();

    return component ? serializeComponentNode(component, context) : component;
  }

  return node.mainComponent
    ? serializeComponentNode(node.mainComponent, context)
    : node.mainComponent;
}

async function serializeComponentProperties(
  properties: Record<string, RuntimeComponentPropertyInput> | undefined,
  context: RuntimeCaptureLookupContext
): Promise<RuntimeComponentProperties | undefined> {
  if (!properties) {
    return undefined;
  }

  const entries = await Promise.all(
    Object.entries(properties).map(async ([name, property]) => {
      await context.resolveVariableAlias(property.boundVariables?.value);

      return [
        name,
        {
          ...(property.boundVariables
            ? { boundVariables: { value: property.boundVariables.value } }
            : {}),
          ...(property.preferredValues
            ? { preferredValues: [...property.preferredValues] }
            : {}),
          type: property.type,
          value: property.value
        } satisfies RuntimeComponentProperty
      ] as const;
    })
  );

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

async function serializeRuntimeNode(
  node: RuntimeSelectionNode,
  context: RuntimeCaptureLookupContext
): Promise<RuntimeSceneNode> {
  await context.resolveStyle(node.effectStyleId);
  await context.resolveStyle(node.fillStyleId);
  await context.resolveStyle(
    typeof node.textStyleId === "string" ? node.textStyleId : undefined
  );
  await context.resolveStyle(node.strokeStyleId);
  await context.resolveNodeBoundVariables(node.boundVariables);
  await context.resolvePaints(node.fills);
  await context.resolvePaints(node.strokes);
  await context.resolveEffects(node.effects);

  const children = isRuntimeSceneNodeArray(node.children)
    ? await Promise.all(
        node.children.map((child) => serializeRuntimeNode(child, context))
      )
    : undefined;
  const componentProperties = await serializeComponentProperties(
    node.componentProperties,
    context
  );
  const mainComponent =
    node.type === "INSTANCE"
      ? await resolveMainComponent(node, context)
      : node.mainComponent;

  return {
    ...(node.boundVariables ? { boundVariables: node.boundVariables } : {}),
    ...(node.bottomLeftRadius !== undefined
      ? { bottomLeftRadius: node.bottomLeftRadius }
      : {}),
    ...(node.bottomRightRadius !== undefined
      ? { bottomRightRadius: node.bottomRightRadius }
      : {}),
    ...(node.characters !== undefined ? { characters: node.characters } : {}),
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
    ...(node.effectStyleId ? { effectStyleId: node.effectStyleId } : {}),
    ...(node.effects ? { effects: node.effects } : {}),
    ...(node.fillStyleId ? { fillStyleId: node.fillStyleId } : {}),
    ...(node.fills !== undefined ? { fills: node.fills } : {}),
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
    ...(node.maxLines !== undefined ? { maxLines: node.maxLines } : {}),
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
    ...(node.strokeStyleId ? { strokeStyleId: node.strokeStyleId } : {}),
    ...(node.strokeWeight !== undefined ? { strokeWeight: node.strokeWeight } : {}),
    ...(node.strokes !== undefined ? { strokes: node.strokes } : {}),
    ...(node.textAlignHorizontal
      ? { textAlignHorizontal: node.textAlignHorizontal }
      : {}),
    ...(node.textAlignVertical ? { textAlignVertical: node.textAlignVertical } : {}),
    ...(node.textAutoResize ? { textAutoResize: node.textAutoResize } : {}),
    ...(node.textStyleId !== undefined ? { textStyleId: node.textStyleId } : {}),
    ...(node.topLeftRadius !== undefined ? { topLeftRadius: node.topLeftRadius } : {}),
    ...(node.topRightRadius !== undefined ? { topRightRadius: node.topRightRadius } : {}),
    type: node.type,
    ...(node.variantProperties ? { variantProperties: node.variantProperties } : {}),
    ...(node.visible !== undefined ? { visible: node.visible } : {}),
    ...(node.width !== undefined ? { width: node.width } : {}),
    ...(node.x !== undefined ? { x: node.x } : {}),
    ...(node.y !== undefined ? { y: node.y } : {})
  };
}

export async function prepareRuntimeCaptureInput(
  pluginApi: RuntimePluginApi,
  selection: readonly RuntimeSceneNode[]
): Promise<{
  pluginApi: RuntimePluginApi;
  selection: readonly RuntimeSceneNode[];
}> {
  if (!hasAsyncRuntimeLookups(pluginApi)) {
    return { pluginApi, selection };
  }

  const context = new RuntimeCaptureLookupContext(pluginApi);
  const runtimeSelection = await Promise.all(
    selection.map((node) =>
      serializeRuntimeNode(node as RuntimeSelectionNode, context)
    )
  );

  return {
    pluginApi: context.buildRuntimePluginApi(),
    selection: runtimeSelection
  };
}
