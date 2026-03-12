import {
  createEmptyRegistries,
  createRegistryRef,
  designDocumentV0_1Schema,
  type ComponentPolicyRule,
  type DesignCapture,
  type DesignDocument,
  type DesignDocumentV0_1,
  type DesignDocumentV0_2,
  type DesignNode,
  type DesignRegistries,
  type IconRegistryEntry
} from "@vibe-figma/schema";

import { convertDesignDocumentToV0_2 } from "./canonical-v0-2.js";
import {
  deriveComponentPolicyContext,
  resolveComponentPolicy,
  type ComponentPolicyContext
} from "./policy-engine.js";

type PartialRegistries = Partial<DesignRegistries>;

export type BuildDesignDocumentInput = {
  capture: DesignCapture;
  componentContextByRef?: Record<string, Partial<ComponentPolicyContext>>;
  componentPolicyRules?: readonly ComponentPolicyRule[];
  diagnostics?: DesignDocumentV0_1["diagnostics"];
  profile?: "canonical" | "debug";
  registries?: PartialRegistries;
  roots: DesignNode[];
};

type TransformState = {
  componentContextByRef: Record<string, Partial<ComponentPolicyContext>>;
  diagnostics: string[];
  registries: DesignRegistries;
  rules: readonly ComponentPolicyRule[];
};

type TransformOptions = {
  isRoot: boolean;
  parentUsesFlowLayout: boolean;
};

function mergeRegistries(registries?: PartialRegistries): DesignRegistries {
  const empty = createEmptyRegistries();

  return {
    assets: { ...empty.assets, ...registries?.assets },
    componentSets: { ...empty.componentSets, ...registries?.componentSets },
    components: { ...empty.components, ...registries?.components },
    icons: { ...empty.icons, ...registries?.icons },
    styles: { ...empty.styles, ...registries?.styles },
    variables: { ...empty.variables, ...registries?.variables }
  };
}

function inferInlinedKind(node: DesignNode): DesignNode["kind"] {
  if (node.content?.text) {
    return "text";
  }

  if (node.content?.image) {
    return "image";
  }

  return "frame";
}

function ensureIconRegistryEntry(
  state: TransformState,
  componentRef: string,
  fallbackName: string
): IconRegistryEntry {
  const existing = Object.values(state.registries.icons).find(
    (entry) => entry.componentRef === componentRef
  );

  if (existing) {
    return existing;
  }

  const component = state.registries.components[componentRef];
  const baseRef = createRegistryRef(
    "icon",
    component?.key ?? component?.name ?? fallbackName
  );

  let uniqueRef = baseRef;
  let suffix = 2;
  while (state.registries.icons[uniqueRef]) {
    uniqueRef = `${baseRef}-${suffix}` as typeof baseRef;
    suffix += 1;
  }

  const entry: IconRegistryEntry = {
    ...(component?.library?.name
      ? { library: { name: component.library.name } }
      : {}),
    componentRef,
    name: component?.name ?? fallbackName,
    ref: uniqueRef
  };

  state.registries.icons[uniqueRef] = entry;

  return entry;
}

function resolveComponentPropertyDefinitions(
  componentRef: string,
  registries: DesignRegistries
) {
  const component = registries.components[componentRef];
  const componentSet = component?.componentSetRef
    ? registries.componentSets[component.componentSetRef]
    : undefined;

  return {
    ...(componentSet?.properties ?? {}),
    ...(component?.properties ?? {})
  };
}

function pruneInstanceBinding(
  node: DesignNode,
  registries: DesignRegistries
): DesignNode["designSystem"] {
  const componentRef = node.designSystem?.componentRef;

  if (!componentRef || !node.designSystem) {
    return node.designSystem;
  }

  const definitions = resolveComponentPropertyDefinitions(componentRef, registries);
  const sourceProperties = node.designSystem.instance?.properties ?? {};
  const derivedVariant = Object.fromEntries(
    Object.entries(sourceProperties)
      .filter(
        ([name, value]) =>
          value.type === "VARIANT" &&
          typeof value.value === "string" &&
          definitions[name]?.defaultValue !== value.value
      )
      .map(([name, value]) => [name, value.value as string] as const)
  );
  const explicitVariant = Object.fromEntries(
    Object.entries(node.designSystem.instance?.variant ?? {}).filter(
      ([name, value]) => definitions[name]?.defaultValue !== value
    )
  );
  const properties = Object.fromEntries(
    Object.entries(sourceProperties).filter(
      ([name, value]) =>
        value.type !== "VARIANT" &&
        (value.variableRef !== undefined || definitions[name]?.defaultValue !== value.value)
    )
  );
  const variant = {
    ...derivedVariant,
    ...explicitVariant
  };

  return {
    ...node.designSystem,
    ...(node.designSystem.policy && node.designSystem.policy !== "preserve"
      ? { policy: node.designSystem.policy }
      : {}),
    instance:
      Object.keys(properties).length > 0 ||
      Object.keys(variant).length > 0 ||
      node.designSystem.instance?.overrides ||
      node.designSystem.instance?.swapRef
        ? {
            ...(Object.keys(properties).length > 0 ? { properties } : {}),
            ...(Object.keys(variant).length > 0 ? { variant } : {}),
            ...(node.designSystem.instance?.overrides
              ? { overrides: node.designSystem.instance.overrides }
              : {}),
            ...(node.designSystem.instance?.swapRef
              ? { swapRef: node.designSystem.instance.swapRef }
              : {})
          }
        : undefined
  };
}

function transformNode(
  node: DesignNode,
  state: TransformState,
  options: TransformOptions
): DesignNode | null {
  const nodeUsesFlowLayout =
    node.layout?.mode === "row" || node.layout?.mode === "column";
  const transformedChildren = node.children
    ?.map((child: DesignNode) =>
      transformNode(child, state, {
        isRoot: false,
        parentUsesFlowLayout: nodeUsesFlowLayout
      })
    )
    .filter((child: DesignNode | null): child is DesignNode => child !== null);

  if (node.kind === "instance" && node.designSystem?.componentRef) {
    const componentRef = node.designSystem.componentRef;
    const explicitPolicy = node.designSystem.policy;
    const context = deriveComponentPolicyContext(
      componentRef,
      state.registries,
      state.componentContextByRef[componentRef]
    );
    const resolution: {
      matchedRuleId?: string | undefined;
      policy: typeof explicitPolicy;
    } | ReturnType<typeof resolveComponentPolicy> = explicitPolicy
      ? { policy: explicitPolicy }
      : resolveComponentPolicy(context, state.rules);

    if (resolution.policy === "ignore") {
      const source = resolution.matchedRuleId ?? "explicit policy";
      state.diagnostics.push(
        `Ignored instance "${node.name}" because ${source} resolved to ignore.`
      );
      return null;
    }

    if (resolution.policy === "icon") {
      const iconEntry = ensureIconRegistryEntry(state, componentRef, node.name);

      return compactNode(
        normalizeNodeForCanonical({
        ...node,
        children: undefined,
        content: {
          ...(node.content ?? {}),
          icon: {
            iconRef: iconEntry.ref!,
            name: iconEntry.name,
            size: node.bounds
              ? {
                  height: node.bounds.height,
                  width: node.bounds.width
                }
              : undefined
          }
        },
        designSystem: {
          ...(node.designSystem ?? {}),
          componentRef,
          policy: "icon"
        },
        kind: "icon",
        origin: {
          sourceComponentRef: componentRef,
          sourceFigmaType: node.figmaType,
          sourcePluginNodeId: node.pluginNodeId,
          transform: "normalized-icon"
        }
        }, options)
      );
    }

    if (resolution.policy === "inline") {
      return compactNode(
        normalizeNodeForCanonical({
        ...node,
        children: transformedChildren,
        designSystem: {
          ...(node.designSystem ?? {}),
          componentRef,
          policy: "inline"
        },
        kind: inferInlinedKind(node),
        origin: {
          sourceComponentRef: componentRef,
          sourceFigmaType: node.figmaType,
          sourcePluginNodeId: node.pluginNodeId,
          transform: "inlined-instance"
        }
        }, options)
      );
    }

    return compactNode(
      normalizeNodeForCanonical({
      ...node,
      children: undefined,
      designSystem: pruneInstanceBinding(
        {
          ...node,
          designSystem: {
            ...(node.designSystem ?? {}),
            componentRef,
            policy: "preserve"
          }
        },
        state.registries
      )
      }, options)
    );
  }

  return compactNode(
    normalizeNodeForCanonical({
    ...node,
    children: transformedChildren
    }, options)
  );
}

function normalizeNodeForCanonical(
  node: DesignNode,
  options: TransformOptions
): DesignNode {
  const shouldDropFlowCoordinates =
    !options.isRoot &&
    options.parentUsesFlowLayout &&
    node.layout?.position !== "absolute";
  const align = {
    ...(node.layout?.align?.alignItems &&
    node.layout.align.alignItems !== "start"
      ? { alignItems: node.layout.align.alignItems }
      : {}),
    ...(node.layout?.align?.alignSelf
      ? { alignSelf: node.layout.align.alignSelf }
      : {}),
    ...(node.layout?.align?.justifyContent &&
    node.layout.align.justifyContent !== "start"
      ? { justifyContent: node.layout.align.justifyContent }
      : {})
  };
  const sizing = {
    ...(node.layout?.sizing?.horizontal &&
    node.layout.sizing.horizontal !== "fixed"
      ? { horizontal: node.layout.sizing.horizontal }
      : {}),
    ...(node.layout?.sizing?.vertical &&
    node.layout.sizing.vertical !== "fixed"
      ? { vertical: node.layout.sizing.vertical }
      : {})
  };
  const layout =
    node.layout
      ? {
          ...node.layout,
          ...(Object.keys(align).length > 0 ? { align } : { align: undefined }),
          ...(node.layout.position === "absolute"
            ? { constraints: node.layout.constraints }
            : { constraints: undefined }),
          ...(Object.keys(sizing).length > 0 ? { sizing } : { sizing: undefined })
        }
      : undefined;

  return {
    ...node,
    bounds: node.bounds
      ? {
          ...node.bounds,
          ...(shouldDropFlowCoordinates ? { x: undefined, y: undefined } : {})
        }
      : undefined,
    figmaType: node.kind === "unknown" ? node.figmaType : undefined,
    layout,
    locked: node.locked ? true : undefined,
    restNodeId: undefined
  };
}

function compactValue(value: unknown, key?: string): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (key === "visible" && value === true) {
    return undefined;
  }

  if (key === "opacity" && value === 1) {
    return undefined;
  }

  if (key === "locked" && value === false) {
    return undefined;
  }

  if (key === "position" && value === "flow") {
    return undefined;
  }

  if (key === "wrap" && value === false) {
    return undefined;
  }

  if (key === "gap" && value === 0) {
    return undefined;
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => compactValue(item))
      .filter((item) => item !== undefined);

    return items.length > 0 ? items : undefined;
  }

  if (value && typeof value === "object") {
    const compactedEntries = Object.entries(value)
      .map(([entryKey, entryValue]) => [entryKey, compactValue(entryValue, entryKey)] as const)
      .filter(([, entryValue]) => entryValue !== undefined);

    if (compactedEntries.length === 0) {
      return undefined;
    }

    return Object.fromEntries(compactedEntries);
  }

  return value;
}

function compactNode(node: DesignNode): DesignNode {
  return compactValue(node) as DesignNode;
}

function collectModeContext(roots: readonly DesignNode[]): Record<string, string> {
  const modeIdsByCollection = new Map<string, Set<string>>();

  const visit = (node: DesignNode) => {
    for (const [collectionId, modeId] of Object.entries(
      node.designSystem?.resolvedVariableModes ?? {}
    )) {
      const values = modeIdsByCollection.get(collectionId) ?? new Set<string>();
      values.add(modeId);
      modeIdsByCollection.set(collectionId, values);
    }

    node.children?.forEach(visit);
  };

  roots.forEach(visit);

  return Object.fromEntries(
    [...modeIdsByCollection.entries()]
      .filter(([, modeIds]) => modeIds.size === 1)
      .map(([collectionId, modeIds]) => [
        collectionId,
        [...modeIds][0] as string
      ])
  );
}

function stripPromotedModeContext(
  node: DesignNode,
  globalModeContext: Record<string, string>,
  usedModeIdsByCollection: Map<string, Set<string>>
): DesignNode {
  const localModeContext = Object.fromEntries(
    Object.entries(node.designSystem?.resolvedVariableModes ?? {}).filter(
      ([collectionId, modeId]) => globalModeContext[collectionId] !== modeId
    )
  );

  for (const [collectionId, modeId] of Object.entries(globalModeContext)) {
    const values = usedModeIdsByCollection.get(collectionId) ?? new Set<string>();
    values.add(modeId);
    usedModeIdsByCollection.set(collectionId, values);
  }

  for (const [collectionId, modeId] of Object.entries(localModeContext)) {
    const values = usedModeIdsByCollection.get(collectionId) ?? new Set<string>();
    values.add(modeId);
    usedModeIdsByCollection.set(collectionId, values);
  }

  return compactNode({
    ...node,
    children: node.children?.map((child) =>
      stripPromotedModeContext(child, globalModeContext, usedModeIdsByCollection)
    ),
    designSystem: node.designSystem
      ? {
          ...node.designSystem,
          ...(Object.keys(localModeContext).length > 0
            ? { resolvedVariableModes: localModeContext }
            : { resolvedVariableModes: undefined })
        }
      : undefined
  });
}

function pruneVariableModes(
  registries: DesignRegistries,
  usedModeIdsByCollection: Map<string, Set<string>>
): DesignRegistries {
  return {
    ...registries,
    variables: Object.fromEntries(
      Object.entries(registries.variables).map(([ref, variableEntry]) => {
        const usedModeIds = usedModeIdsByCollection.get(variableEntry.collection.id);
        const filteredModes = usedModeIds
          ? variableEntry.modes.filter((mode) => usedModeIds.has(mode.modeId))
          : variableEntry.modes;

        return [
          ref,
          {
            ...variableEntry,
            modes: filteredModes.length > 0 ? filteredModes : variableEntry.modes
          }
        ];
      })
    )
  };
}

function pruneRegistriesForCanonical(registries: DesignRegistries): DesignRegistries {
  return {
    assets: Object.fromEntries(
      Object.entries(registries.assets).map(([ref, asset]) => [
        ref,
        {
          ...(asset.hash ? { hash: asset.hash } : {}),
          kind: asset.kind,
          ...(asset.sourceComponentRef
            ? { sourceComponentRef: asset.sourceComponentRef }
            : {}),
          ...(asset.sourcePluginNodeId
            ? { sourcePluginNodeId: asset.sourcePluginNodeId }
            : {})
        }
      ])
    ),
    componentSets: Object.fromEntries(
      Object.entries(registries.componentSets).map(([ref, componentSet]) => [
        ref,
        {
          name: componentSet.name
        }
      ])
    ),
    components: Object.fromEntries(
      Object.entries(registries.components).map(([ref, component]) => [
        ref,
        {
          ...(component.componentSetRef
            ? { componentSetRef: component.componentSetRef }
            : {}),
          ...(component.library?.name
            ? { library: { name: component.library.name } }
            : {}),
          name: component.name
        }
      ])
    ),
    icons: Object.fromEntries(
      Object.entries(registries.icons).map(([ref, icon]) => [
        ref,
        {
          ...(icon.assetRef ? { assetRef: icon.assetRef } : {}),
          ...(icon.componentRef ? { componentRef: icon.componentRef } : {}),
          ...(icon.library?.name ? { library: { name: icon.library.name } } : {}),
          name: icon.name
        }
      ])
    ),
    styles: Object.fromEntries(
      Object.entries(registries.styles).map(([ref, style]) => [
        ref,
        {
          ...(style.boundVariables ? { boundVariables: style.boundVariables } : {}),
          ...(style.fallback !== undefined ? { fallback: style.fallback } : {}),
          name: style.name,
          styleType: style.styleType
        }
      ])
    ),
    variables: Object.fromEntries(
      Object.entries(registries.variables).map(([ref, variable]) => [
        ref,
        {
          collection: {
            id: variable.collection.id
          },
          modes: variable.modes.map((mode) => ({
            modeId: mode.modeId,
            ...(mode.value !== undefined ? { value: mode.value } : {})
          })),
          name: variable.name,
          resolvedType: variable.resolvedType
        }
      ])
    )
  };
}

function createDebugDesignDocument(
  input: BuildDesignDocumentInput
): DesignDocumentV0_1 {
  const diagnostics = [...(input.diagnostics?.warnings ?? [])]
    .filter((warning): warning is string => typeof warning === "string");
  const state: TransformState = {
    componentContextByRef: input.componentContextByRef ?? {},
    diagnostics,
    registries: mergeRegistries(input.registries),
    rules: input.componentPolicyRules ?? []
  };
  const roots = input.roots
    .map((root) =>
      transformNode(root, state, {
        isRoot: true,
        parentUsesFlowLayout: false
      })
    )
    .filter((root): root is DesignNode => root !== null);
  const modeContext = collectModeContext(roots);
  const usedModeIdsByCollection = new Map<string, Set<string>>();
  const compactedRoots = roots.map((root) =>
    stripPromotedModeContext(root, modeContext, usedModeIdsByCollection)
  );
  const registries = pruneRegistriesForCanonical(
    pruneVariableModes(state.registries, usedModeIdsByCollection)
  );

  return designDocumentV0_1Schema.parse({
    capture: {
      ...input.capture,
      selection: input.capture.selection.map((entry) => ({
        id: entry.id
      })),
      ...(Object.keys(modeContext).length > 0 ? { modeContext } : {})
    },
    diagnostics: {
      warnings: [
        ...(input.diagnostics?.warnings?.filter(
          (warning): warning is Exclude<typeof warning, string> =>
            typeof warning !== "string"
        ) ?? []),
        ...state.diagnostics
      ]
    },
    registries,
    roots: compactedRoots,
    schemaVersion: "0.1"
  });
}

export function createDesignDocument(
  input: BuildDesignDocumentInput & {
    profile: "debug";
  }
): DesignDocumentV0_1;
export function createDesignDocument(
  input: BuildDesignDocumentInput & {
    profile?: "canonical" | undefined;
  }
): DesignDocumentV0_2;
export function createDesignDocument(
  input: BuildDesignDocumentInput
): DesignDocument {
  const debugDocument = createDebugDesignDocument(input);

  if (input.profile === "debug") {
    return debugDocument;
  }

  return convertDesignDocumentToV0_2(debugDocument);
}
