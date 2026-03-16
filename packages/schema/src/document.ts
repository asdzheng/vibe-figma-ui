import { z } from "zod";

import {
  assetRefSchema,
  componentOrComponentSetRefSchema,
  componentRefSchema,
  componentSetRefSchema,
  iconRefSchema,
  styleRefSchema,
  variableRefSchema
} from "./refs.js";
import { componentCapturePolicySchema } from "./policy.js";

const nodeKindValues = [
  "page",
  "frame",
  "group",
  "section",
  "instance",
  "component",
  "text",
  "shape",
  "image",
  "icon",
  "vector",
  "boolean-operation",
  "unknown"
] as const;

export const nodeKindSchema = z.enum(nodeKindValues);

const boundsSchema = z
  .object({
    height: z.number().optional(),
    rotation: z.number().optional(),
    width: z.number().optional(),
    x: z.number().optional(),
    y: z.number().optional()
  })
  .strict();

const gridTrackSchema = z
  .object({
    type: z.enum(["flex", "fixed", "hug"]),
    value: z.number().optional()
  })
  .strict();

const layoutSchema = z
  .object({
    align: z
      .object({
        alignItems: z
          .enum(["start", "end", "center", "stretch", "baseline"])
          .optional(),
        alignSelf: z.enum(["start", "end", "center", "stretch"]).optional(),
        justifyContent: z
          .enum(["start", "end", "center", "space-between"])
          .optional()
      })
      .strict()
      .optional(),
    constraints: z
      .object({
        horizontal: z.string().min(1).optional(),
        vertical: z.string().min(1).optional()
      })
      .strict()
      .optional(),
    gap: z.number().optional(),
    grid: z
      .object({
        columnGap: z.number().optional(),
        columnSizes: z.array(gridTrackSchema).optional(),
        columns: z.number().int().positive().optional(),
        rowGap: z.number().optional(),
        rowSizes: z.array(gridTrackSchema).optional(),
        rows: z.number().int().positive().optional()
      })
      .strict()
      .optional(),
    gridChild: z
      .object({
        column: z.number().int().nonnegative().optional(),
        columnSpan: z.number().int().positive().optional(),
        horizontalAlign: z.enum(["start", "center", "end"]).optional(),
        row: z.number().int().nonnegative().optional(),
        rowSpan: z.number().int().positive().optional(),
        verticalAlign: z.enum(["start", "center", "end"]).optional()
      })
      .strict()
      .optional(),
    mode: z.enum(["none", "row", "column", "grid"]).optional(),
    overflow: z
      .object({
        x: z.enum(["visible", "scroll", "hidden"]).optional(),
        y: z.enum(["visible", "scroll", "hidden"]).optional()
      })
      .strict()
      .optional(),
    padding: z
      .object({
        bottom: z.number().optional(),
        left: z.number().optional(),
        right: z.number().optional(),
        top: z.number().optional()
      })
      .strict()
      .optional(),
    position: z.enum(["flow", "absolute"]).optional(),
    sizing: z
      .object({
        horizontal: z.enum(["fixed", "fill", "hug"]).optional(),
        vertical: z.enum(["fixed", "fill", "hug"]).optional()
      })
      .strict()
      .optional(),
    wrap: z.boolean().optional()
  })
  .strict();

const paintValueSchema = z
  .object({
    fallback: z.unknown().optional(),
    kind: z.enum(["solid", "gradient", "image", "pattern"]),
    styleRef: styleRefSchema.optional(),
    tokenRef: z.union([variableRefSchema, z.array(variableRefSchema)]).optional()
  })
  .strict();

const strokeValueSchema = z
  .object({
    align: z.enum(["inside", "center", "outside"]).optional(),
    dash: z.array(z.number()).optional(),
    paints: z.array(paintValueSchema),
    width: z.number().optional()
  })
  .strict();

const radiusValueSchema = z.union([
  z
    .object({
      mode: z.literal("uniform"),
      value: z.number()
    })
    .strict(),
  z
    .object({
      bottomLeft: z.number(),
      bottomRight: z.number(),
      mode: z.literal("corners"),
      topLeft: z.number(),
      topRight: z.number()
    })
    .strict()
]);

const effectValueSchema = z
  .object({
    fallback: z.unknown().optional(),
    styleRef: styleRefSchema.optional(),
    tokenRef: z.union([variableRefSchema, z.array(variableRefSchema)]).optional(),
    type: z.string().min(1)
  })
  .strict();

const appearanceSchema = z
  .object({
    background: z.array(paintValueSchema).optional(),
    effects: z.array(effectValueSchema).optional(),
    opacity: z.number().optional(),
    radius: radiusValueSchema.optional(),
    stroke: z.array(strokeValueSchema).optional()
  })
  .strict();

const textContentSchema = z
  .object({
    alignment: z
      .object({
        horizontal: z.enum(["left", "center", "right", "justified"]).optional(),
        vertical: z.enum(["top", "center", "bottom"]).optional()
      })
      .strict()
      .optional(),
    autoResize: z.enum(["fixed", "height", "width-and-height"]).optional(),
    characters: z.string(),
    fill: z.array(paintValueSchema).optional(),
    maxLines: z.number().int().positive().optional(),
    segments: z
      .array(
        z
          .object({
            characters: z.string(),
            end: z.number().int().nonnegative(),
            fill: z.array(paintValueSchema).optional(),
            start: z.number().int().nonnegative(),
            textStyleRef: styleRefSchema.optional()
          })
          .strict()
      )
      .optional(),
    textStyleRef: styleRefSchema.optional()
  })
  .strict();

const imageContentSchema = z
  .object({
    assetRef: assetRefSchema.optional(),
    scaleMode: z.enum(["fill", "fit", "tile", "stretch"]).optional()
  })
  .strict();

const iconContentSchema = z
  .object({
    iconRef: iconRefSchema,
    name: z.string().min(1),
    size: z
      .object({
        height: z.number().optional(),
        width: z.number().optional()
      })
      .strict()
      .optional()
  })
  .strict();

const contentSchema = z
  .object({
    icon: iconContentSchema.optional(),
    image: imageContentSchema.optional(),
    text: textContentSchema.optional()
  })
  .strict();

const componentPropertyValueSchema = z
  .object({
    type: z.enum(["BOOLEAN", "TEXT", "INSTANCE_SWAP", "VARIANT"]),
    value: z.union([z.string(), z.boolean()]),
    variableRef: variableRefSchema.optional()
  })
  .strict();

const overrideValueSchema = z
  .object({
    sourceNodeId: z.string().min(1).optional(),
    sourceProperty: z.string().min(1).optional(),
    type: z.enum(["text", "boolean", "instance-swap", "visibility"]),
    value: z.union([z.string(), z.boolean()])
  })
  .strict();

const designSystemBindingSchema = z
  .object({
    componentPropertyReferences: z.record(z.string(), z.string().min(1)).optional(),
    componentRef: componentRefSchema.optional(),
    instance: z
      .object({
        overrides: z.record(z.string(), overrideValueSchema).optional(),
        properties: z
          .record(z.string(), componentPropertyValueSchema)
          .optional(),
        swapRef: componentOrComponentSetRefSchema.optional(),
        variant: z.record(z.string(), z.string()).optional()
      })
      .strict()
      .optional(),
    policy: componentCapturePolicySchema.optional(),
    resolvedVariableModes: z.record(z.string(), z.string()).optional()
  })
  .strict();

const originInfoSchema = z
  .object({
    sourceComponentRef: componentRefSchema.optional(),
    sourceFigmaType: z.string().min(1).optional(),
    sourcePluginNodeId: z.string().min(1).optional(),
    transform: z
      .enum(["inlined-instance", "normalized-icon", "collapsed-asset"])
      .optional()
  })
  .strict();

export type Bounds = z.infer<typeof boundsSchema>;
export type LayoutInfo = z.infer<typeof layoutSchema>;
export type PaintValue = z.infer<typeof paintValueSchema>;
export type StrokeValue = z.infer<typeof strokeValueSchema>;
export type RadiusValue = z.infer<typeof radiusValueSchema>;
export type AppearanceInfo = z.infer<typeof appearanceSchema>;
export type ContentInfo = z.infer<typeof contentSchema>;
export type ComponentPropertyValue = z.infer<
  typeof componentPropertyValueSchema
>;
export type OverrideValue = z.infer<typeof overrideValueSchema>;
export type DesignSystemBinding = z.infer<typeof designSystemBindingSchema>;
export type OriginInfo = z.infer<typeof originInfoSchema>;

export type DesignNode = {
  appearance?: AppearanceInfo | undefined;
  bounds?: Bounds | undefined;
  children?: DesignNode[] | undefined;
  content?: ContentInfo | undefined;
  designSystem?: DesignSystemBinding | undefined;
  figmaType?: string | undefined;
  kind: z.infer<typeof nodeKindSchema>;
  layout?: LayoutInfo | undefined;
  locked?: boolean | undefined;
  name: string;
  origin?: OriginInfo | undefined;
  path?: string[] | undefined;
  pluginNodeId: string;
  restNodeId?: string | undefined;
  visible?: boolean | undefined;
};

export const designNodeSchema: z.ZodType<DesignNode> = z.lazy(() =>
  z
    .object({
      appearance: appearanceSchema.optional(),
      bounds: boundsSchema.optional(),
      children: z.array(designNodeSchema).optional(),
      content: contentSchema.optional(),
      designSystem: designSystemBindingSchema.optional(),
      figmaType: z.string().min(1).optional(),
      kind: nodeKindSchema,
      locked: z.boolean().optional(),
      name: z.string().min(1),
      origin: originInfoSchema.optional(),
      path: z.array(z.string().min(1)).optional(),
      pluginNodeId: z.string().min(1),
      restNodeId: z.string().min(1).optional(),
      visible: z.boolean().optional(),
      layout: layoutSchema.optional()
    })
    .strict()
);

const componentPropertySchema = z
  .object({
    defaultValue: z.union([z.string(), z.boolean()]).optional(),
    preferredValues: z
      .array(
        z
          .object({
            key: z.string().min(1),
            type: z.enum(["COMPONENT", "COMPONENT_SET"])
          })
          .strict()
      )
      .optional(),
    type: z.enum(["BOOLEAN", "TEXT", "INSTANCE_SWAP", "VARIANT"]),
    variantOptions: z.array(z.string()).optional()
  })
  .strict();

const componentRegistryEntrySchema = z
  .object({
    componentSetRef: componentSetRefSchema.optional(),
    key: z.string().min(1).optional(),
    library: z
      .object({
        name: z.string().min(1).optional()
    })
      .strict()
      .optional(),
    name: z.string().min(1),
    properties: z.record(z.string(), componentPropertySchema).optional(),
    ref: componentRefSchema.optional(),
    remote: z.boolean().optional()
  })
  .strict();

const componentSetRegistryEntrySchema = z
  .object({
    key: z.string().min(1).optional(),
    name: z.string().min(1),
    properties: z.record(z.string(), componentPropertySchema).optional(),
    ref: componentSetRefSchema.optional(),
    remote: z.boolean().optional()
  })
  .strict();

const styleRegistryEntrySchema = z
  .object({
    boundVariables: z
      .record(z.string(), z.union([variableRefSchema, z.array(variableRefSchema)]))
      .optional(),
    fallback: z.unknown().optional(),
    key: z.string().min(1).optional(),
    name: z.string().min(1),
    ref: styleRefSchema.optional(),
    remote: z.boolean().optional(),
    styleType: z.enum(["PAINT", "TEXT", "EFFECT", "GRID"])
  })
  .strict();

const variableModeSchema = z
  .object({
    modeId: z.string().min(1),
    name: z.string().min(1).optional(),
    value: z.unknown().optional()
  })
  .strict();

const variableRegistryEntrySchema = z
  .object({
    codeSyntax: z
      .object({
        ANDROID: z.string().min(1).optional(),
        WEB: z.string().min(1).optional(),
        iOS: z.string().min(1).optional()
      })
      .strict()
      .optional(),
    collection: z
      .object({
        id: z.string().min(1),
        key: z.string().min(1).optional(),
        name: z.string().min(1).optional()
      })
      .strict(),
    id: z.string().min(1).optional(),
    key: z.string().min(1).optional(),
    modes: z.array(variableModeSchema),
    name: z.string().min(1),
    ref: variableRefSchema.optional(),
    remote: z.boolean().optional(),
    resolvedType: z.enum(["BOOLEAN", "COLOR", "FLOAT", "STRING"])
  })
  .strict();

const iconRegistryEntrySchema = z
  .object({
    assetRef: assetRefSchema.optional(),
    componentRef: componentRefSchema.optional(),
    library: z
      .object({
        name: z.string().min(1).optional()
      })
      .strict()
      .optional(),
    name: z.string().min(1),
    ref: iconRefSchema.optional()
  })
  .strict();

const assetRegistryEntrySchema = z
  .object({
    hash: z.string().min(1).optional(),
    kind: z.enum(["svg", "png", "jpg", "pdf"]),
    ref: assetRefSchema.optional(),
    sourceComponentRef: componentRefSchema.optional(),
    sourcePluginNodeId: z.string().min(1).optional()
  })
  .strict();

const selectionEntrySchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    type: z.string().min(1).optional()
  })
  .strict();

const captureSchema = z
  .object({
    editorType: z.string().min(1),
    mode: z.string().min(1).optional(),
    modeContext: z.record(z.string(), z.string()).optional(),
    options: z
      .object({
        captureScope: z.enum(["selection", "page"]),
        expandInstances: z.boolean()
      })
      .strict(),
    page: z
      .object({
        id: z.string().min(1),
        name: z.string().min(1)
      })
      .strict(),
    pluginVersion: z.string().min(1),
    selection: z.array(selectionEntrySchema),
    sourceFileKey: z.string().min(1).optional(),
    timestamp: z.string().datetime()
  })
  .strict();

const diagnosticWarningSchema = z.union([
  z.string().min(1),
  z
    .object({
      code: z.string().min(1).optional(),
      message: z.string().min(1),
      nodeId: z.string().min(1).optional()
    })
    .strict()
]);

const registriesSchema = z
  .object({
    assets: z.record(z.string(), assetRegistryEntrySchema),
    componentSets: z.record(z.string(), componentSetRegistryEntrySchema),
    components: z.record(z.string(), componentRegistryEntrySchema),
    icons: z.record(z.string(), iconRegistryEntrySchema),
    styles: z.record(z.string(), styleRegistryEntrySchema),
    variables: z.record(z.string(), variableRegistryEntrySchema)
  })
  .strict();

const baseDesignDocumentV01Schema = z
  .object({
    capture: captureSchema,
    diagnostics: z
      .object({
        warnings: z.array(diagnosticWarningSchema)
      })
      .strict(),
    registries: registriesSchema,
    roots: z.array(designNodeSchema),
    schemaVersion: z.literal("0.1")
  })
  .strict();

type ReferenceCollections = {
  assets: Set<string>;
  componentSets: Set<string>;
  components: Set<string>;
  icons: Set<string>;
  styles: Set<string>;
  variables: Set<string>;
};

function createReferenceCollections(document: BaseDesignDocument): ReferenceCollections {
  return {
    assets: new Set(Object.keys(document.registries.assets)),
    componentSets: new Set(Object.keys(document.registries.componentSets)),
    components: new Set(Object.keys(document.registries.components)),
    icons: new Set(Object.keys(document.registries.icons)),
    styles: new Set(Object.keys(document.registries.styles)),
    variables: new Set(Object.keys(document.registries.variables))
  };
}

function addRefIssue(
  ctx: z.RefinementCtx,
  path: Array<string | number>,
  message: string
) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message,
    path
  });
}

function ensureRegistryKeyMatchesRef(
  entries: Record<string, { ref?: string | undefined }>,
  path: string,
  ctx: z.RefinementCtx
) {
  for (const [key, value] of Object.entries(entries)) {
    if (value.ref && key !== value.ref) {
      addRefIssue(ctx, ["registries", path, key], `Registry key "${key}" must match ref "${value.ref}".`);
    }
  }
}

function ensureRefExists(
  refs: Set<string>,
  ref: string | undefined,
  path: Array<string | number>,
  ctx: z.RefinementCtx,
  label: string
) {
  if (ref && !refs.has(ref)) {
    addRefIssue(ctx, path, `${label} "${ref}" is not defined in the matching registry.`);
  }
}

function ensureVariableRefExists(
  refs: Set<string>,
  refOrRefs: string | string[] | undefined,
  path: Array<string | number>,
  ctx: z.RefinementCtx,
  label: string
) {
  if (!refOrRefs) {
    return;
  }

  if (typeof refOrRefs === "string") {
    ensureRefExists(refs, refOrRefs, path, ctx, label);
    return;
  }

  refOrRefs.forEach((ref, index) => {
    ensureRefExists(refs, ref, [...path, index], ctx, label);
  });
}

function validatePaints(
  paints: PaintValue[] | undefined,
  refs: ReferenceCollections,
  ctx: z.RefinementCtx,
  path: Array<string | number>
) {
  paints?.forEach((paint, index) => {
    ensureRefExists(refs.styles, paint.styleRef, [...path, index, "styleRef"], ctx, "styleRef");
    ensureVariableRefExists(
      refs.variables,
      paint.tokenRef,
      [...path, index, "tokenRef"],
      ctx,
      "tokenRef"
    );
  });
}

function validateNode(
  node: DesignNode,
  refs: ReferenceCollections,
  ctx: z.RefinementCtx,
  path: Array<string | number>
) {
  if (node.kind === "instance" && !node.designSystem?.componentRef) {
    addRefIssue(ctx, [...path, "designSystem", "componentRef"], "Instance nodes must include designSystem.componentRef.");
  }

  if (node.kind === "icon" && !node.content?.icon) {
    addRefIssue(ctx, [...path, "content", "icon"], "Icon nodes must include content.icon.");
  }

  ensureRefExists(
    refs.components,
    node.designSystem?.componentRef,
    [...path, "designSystem", "componentRef"],
    ctx,
    "componentRef"
  );
  ensureRefExists(
    refs.components,
    node.origin?.sourceComponentRef,
    [...path, "origin", "sourceComponentRef"],
    ctx,
    "sourceComponentRef"
  );
  ensureRefExists(
    refs.icons,
    node.content?.icon?.iconRef,
    [...path, "content", "icon", "iconRef"],
    ctx,
    "iconRef"
  );
  ensureRefExists(
    refs.assets,
    node.content?.image?.assetRef,
    [...path, "content", "image", "assetRef"],
    ctx,
    "assetRef"
  );
  ensureRefExists(
    refs.components,
    node.designSystem?.instance?.swapRef?.startsWith("component:")
      ? node.designSystem.instance.swapRef
      : undefined,
    [...path, "designSystem", "instance", "swapRef"],
    ctx,
    "swapRef"
  );
  ensureRefExists(
    refs.componentSets,
    node.designSystem?.instance?.swapRef?.startsWith("component-set:")
      ? node.designSystem.instance.swapRef
      : undefined,
    [...path, "designSystem", "instance", "swapRef"],
    ctx,
    "swapRef"
  );

  validatePaints(node.appearance?.background, refs, ctx, [...path, "appearance", "background"]);
  node.appearance?.stroke?.forEach((stroke: StrokeValue, strokeIndex: number) => {
    validatePaints(stroke.paints, refs, ctx, [
      ...path,
      "appearance",
      "stroke",
      strokeIndex,
      "paints"
    ]);
  });
  if (node.content?.text?.fill) {
    validatePaints(node.content.text.fill, refs, ctx, [
      ...path,
      "content",
      "text",
      "fill"
    ]);
  }
  node.appearance?.effects?.forEach(
    (
      effect: z.infer<typeof effectValueSchema>,
      index: number
    ) => {
    ensureRefExists(
      refs.styles,
      effect.styleRef,
      [...path, "appearance", "effects", index, "styleRef"],
      ctx,
      "styleRef"
    );
    ensureVariableRefExists(
      refs.variables,
      effect.tokenRef,
      [...path, "appearance", "effects", index, "tokenRef"],
      ctx,
      "tokenRef"
    );
  });
  ensureRefExists(
    refs.styles,
    node.content?.text?.textStyleRef,
    [...path, "content", "text", "textStyleRef"],
    ctx,
    "textStyleRef"
  );

  if (node.designSystem?.instance?.properties) {
    Object.entries(node.designSystem.instance.properties).forEach(
      ([propertyName, value]: [string, ComponentPropertyValue]) => {
        ensureRefExists(
          refs.variables,
          value.variableRef,
          [
            ...path,
            "designSystem",
            "instance",
            "properties",
            propertyName,
            "variableRef"
          ],
          ctx,
          "variableRef"
        );
      }
    );
  }

  node.children?.forEach((child: DesignNode, index: number) => {
    validateNode(child, refs, ctx, [...path, "children", index]);
  });
}

export const designDocumentV0_1Schema = baseDesignDocumentV01Schema.superRefine(
  (document, ctx) => {
    const refs = createReferenceCollections(document);

    ensureRegistryKeyMatchesRef(document.registries.components, "components", ctx);
    ensureRegistryKeyMatchesRef(
      document.registries.componentSets,
      "componentSets",
      ctx
    );
    ensureRegistryKeyMatchesRef(document.registries.styles, "styles", ctx);
    ensureRegistryKeyMatchesRef(document.registries.variables, "variables", ctx);
    ensureRegistryKeyMatchesRef(document.registries.icons, "icons", ctx);
    ensureRegistryKeyMatchesRef(document.registries.assets, "assets", ctx);

    Object.entries(document.registries.components).forEach(([key, component]) => {
      ensureRefExists(
        refs.componentSets,
        component.componentSetRef,
        ["registries", "components", key, "componentSetRef"],
        ctx,
        "componentSetRef"
      );
    });

    Object.entries(document.registries.styles).forEach(([key, style]) => {
      Object.entries(style.boundVariables ?? {}).forEach(([boundKey, boundRef]) => {
        ensureVariableRefExists(
          refs.variables,
          boundRef,
          ["registries", "styles", key, "boundVariables", boundKey],
          ctx,
          "boundVariables"
        );
      });
    });

    Object.entries(document.registries.icons).forEach(([key, icon]) => {
      ensureRefExists(
        refs.components,
        icon.componentRef,
        ["registries", "icons", key, "componentRef"],
        ctx,
        "componentRef"
      );
      ensureRefExists(
        refs.assets,
        icon.assetRef,
        ["registries", "icons", key, "assetRef"],
        ctx,
        "assetRef"
      );
    });

    Object.entries(document.registries.assets).forEach(([key, asset]) => {
      ensureRefExists(
        refs.components,
        asset.sourceComponentRef,
        ["registries", "assets", key, "sourceComponentRef"],
        ctx,
        "sourceComponentRef"
      );
    });

    document.roots.forEach((root, index) => {
      validateNode(root, refs, ctx, ["roots", index]);
    });
  }
);

const componentValueSchema = z.union([z.string().min(1), z.boolean()]);

const canonicalTokenOrValueSchema = z.union([
  z.string().min(1),
  z
    .object({
      token: z.string().min(1)
    })
    .strict(),
  z
    .object({
      image: z.string().min(1)
    })
    .strict()
]);

const canonicalPaddingSchema = z.union([
  z.number(),
  z.tuple([z.number(), z.number()]),
  z.tuple([z.number(), z.number(), z.number(), z.number()])
]);

const canonicalRadiusSchema = z.union([
  z.number(),
  z.tuple([z.number(), z.number()]),
  z.tuple([z.number(), z.number(), z.number(), z.number()])
]);

const canonicalLayoutSchema = z
  .object({
    absolute: z
      .object({
        x: z.number(),
        y: z.number()
      })
      .strict()
      .optional(),
    align: z
      .object({
        items: z
          .enum(["start", "end", "center", "stretch", "baseline"])
          .optional(),
        justify: z.enum(["start", "end", "center", "between"]).optional()
      })
      .strict()
      .optional(),
    flow: z.enum(["row", "column"]).optional(),
    gap: z.number().optional(),
    pad: canonicalPaddingSchema.optional(),
    scroll: z.enum(["x", "y", "both"]).optional(),
    sizing: z
      .object({
        height: z.enum(["fixed", "fill", "hug"]).optional(),
        width: z.enum(["fixed", "fill", "hug"]).optional()
      })
      .strict()
      .optional()
  })
  .strict();

const canonicalSizeSchema = z
  .object({
    height: z.number().optional(),
    width: z.number().optional()
  })
  .strict();

const canonicalStyleSchema = z
  .object({
    fill: z
      .union([
        canonicalTokenOrValueSchema,
        z.array(canonicalTokenOrValueSchema)
      ])
      .optional(),
    opacity: z.number().optional(),
    radius: canonicalRadiusSchema.optional(),
    stroke: z
      .object({
        color: canonicalTokenOrValueSchema,
        width: z.number().optional()
      })
      .strict()
      .optional(),
    textColor: canonicalTokenOrValueSchema.optional(),
    textStyle: z.string().min(1).optional()
  })
  .strict();

const canonicalTextSchema = z.union([
  z.string(),
  z
    .object({
      lines: z.number().int().positive().optional(),
      value: z.string()
    })
    .strict()
]);

const canonicalImageSchema = z
  .object({
    fit: z.enum(["fill", "fit", "tile", "stretch"]).optional(),
    source: z.string().min(1).optional()
  })
  .strict();

const componentUseSchema = z.union([
  z.string().min(1),
  z
    .object({
      library: z.string().min(1).optional(),
      name: z.string().min(1),
      props: z.record(z.string(), componentValueSchema).optional(),
      status: z.enum(["mapped", "unmapped"]).optional(),
      variant: z.record(z.string(), z.union([z.string(), z.boolean()])).optional()
    })
    .strict()
]);

export type CanonicalTokenOrValue = z.infer<typeof canonicalTokenOrValueSchema>;
export type ComponentUse = z.infer<typeof componentUseSchema>;

export type DesignNodeV0_2 = {
  children?: DesignNodeV0_2[] | undefined;
  component?: ComponentUse | undefined;
  id?: string | undefined;
  image?: z.infer<typeof canonicalImageSchema> | undefined;
  kind: z.infer<typeof nodeKindSchema>;
  layout?: z.infer<typeof canonicalLayoutSchema> | undefined;
  name?: string | undefined;
  size?: z.infer<typeof canonicalSizeSchema> | undefined;
  style?: z.infer<typeof canonicalStyleSchema> | undefined;
  text?: z.infer<typeof canonicalTextSchema> | undefined;
};

export const designNodeV0_2Schema: z.ZodType<DesignNodeV0_2> = z.lazy(() =>
  z
    .object({
      children: z.array(designNodeV0_2Schema).optional(),
      component: componentUseSchema.optional(),
      id: z.string().min(1).optional(),
      image: canonicalImageSchema.optional(),
      kind: nodeKindSchema,
      layout: canonicalLayoutSchema.optional(),
      name: z.string().min(1).optional(),
      size: canonicalSizeSchema.optional(),
      style: canonicalStyleSchema.optional(),
      text: canonicalTextSchema.optional()
    })
    .strict()
);

export const designDocumentV0_2Schema = z
  .object({
    capture: z
      .object({
        page: z.string().min(1),
        roots: z.array(z.string().min(1)),
        scope: z.enum(["selection", "page"])
      })
      .strict(),
    profile: z.literal("canonical"),
    roots: z.array(designNodeV0_2Schema),
    schemaVersion: z.literal("0.2"),
    warnings: z.array(z.string().min(1)).optional()
  })
  .strict();

export const designDocumentSchema = z.discriminatedUnion("schemaVersion", [
  designDocumentV0_1Schema,
  designDocumentV0_2Schema
]);

export type ComponentRegistryEntry = z.infer<
  typeof componentRegistryEntrySchema
>;
export type ComponentSetRegistryEntry = z.infer<
  typeof componentSetRegistryEntrySchema
>;
export type StyleRegistryEntry = z.infer<typeof styleRegistryEntrySchema>;
export type VariableRegistryEntry = z.infer<typeof variableRegistryEntrySchema>;
export type IconRegistryEntry = z.infer<typeof iconRegistryEntrySchema>;
export type AssetRegistryEntry = z.infer<typeof assetRegistryEntrySchema>;
export type DesignCapture = z.infer<typeof captureSchema>;
export type BaseDesignDocument = z.infer<typeof baseDesignDocumentV01Schema>;
export type DesignDocumentV0_1 = z.infer<typeof designDocumentV0_1Schema>;
export type DesignDocumentV0_2 = z.infer<typeof designDocumentV0_2Schema>;
export type DesignDocument = z.infer<typeof designDocumentSchema>;

export type AnyDesignNode = DesignNode | DesignNodeV0_2;
export type DesignRegistries = DesignDocumentV0_1["registries"];

export function isDesignDocumentV0_1(
  document: DesignDocument
): document is DesignDocumentV0_1 {
  return document.schemaVersion === "0.1";
}

export function isDesignDocumentV0_2(
  document: DesignDocument
): document is DesignDocumentV0_2 {
  return document.schemaVersion === "0.2";
}

export function createEmptyRegistries(): DesignRegistries {
  return {
    assets: {},
    componentSets: {},
    components: {},
    icons: {},
    styles: {},
    variables: {}
  };
}
