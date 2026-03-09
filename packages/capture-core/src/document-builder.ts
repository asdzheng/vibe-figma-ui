import {
  createEmptyRegistries,
  createRegistryRef,
  designDocumentSchema,
  type ComponentPolicyRule,
  type DesignCapture,
  type DesignDocument,
  type DesignNode,
  type DesignRegistries,
  type IconRegistryEntry
} from "@vibe-figma/schema";

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
  diagnostics?: DesignDocument["diagnostics"];
  registries?: PartialRegistries;
  roots: DesignNode[];
};

type TransformState = {
  componentContextByRef: Record<string, Partial<ComponentPolicyContext>>;
  diagnostics: string[];
  registries: DesignRegistries;
  rules: readonly ComponentPolicyRule[];
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

  state.registries.icons[entry.ref] = entry;

  return entry;
}

function transformNode(node: DesignNode, state: TransformState): DesignNode | null {
  const transformedChildren = node.children
    ?.map((child: DesignNode) => transformNode(child, state))
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

      return compactNode({
        ...node,
        children: undefined,
        content: {
          ...(node.content ?? {}),
          icon: {
            iconRef: iconEntry.ref,
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
      });
    }

    if (resolution.policy === "inline") {
      return compactNode({
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
      });
    }

    return compactNode({
      ...node,
      children: undefined,
      designSystem: {
        ...(node.designSystem ?? {}),
        componentRef,
        policy: "preserve"
      }
    });
  }

  return compactNode({
    ...node,
    children: transformedChildren
  });
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

export function createDesignDocument(
  input: BuildDesignDocumentInput
): DesignDocument {
  const diagnostics = [...(input.diagnostics?.warnings ?? [])]
    .filter((warning): warning is string => typeof warning === "string");
  const state: TransformState = {
    componentContextByRef: input.componentContextByRef ?? {},
    diagnostics,
    registries: mergeRegistries(input.registries),
    rules: input.componentPolicyRules ?? []
  };
  const roots = input.roots
    .map((root) => transformNode(root, state))
    .filter((root): root is DesignNode => root !== null);

  return designDocumentSchema.parse({
    capture: input.capture,
    diagnostics: {
      warnings: [
        ...(input.diagnostics?.warnings?.filter(
          (warning): warning is Exclude<typeof warning, string> =>
            typeof warning !== "string"
        ) ?? []),
        ...state.diagnostics
      ]
    },
    registries: state.registries,
    roots,
    schemaVersion: "0.1"
  });
}
