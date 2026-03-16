import { describe, expect, test } from "vitest";

import {
  buildSelectionCaptureFromRuntime,
  buildSelectionCaptureFromRuntimeAsync
} from "@vibe-figma/plugin";
import type {
  RuntimePluginApi,
  RuntimeSceneNode,
  RuntimeStyle,
  RuntimeVariable,
  RuntimeVariableCollection
} from "@vibe-figma/plugin";
import type { ComponentPolicyRule } from "@vibe-figma/schema";

describe("buildSelectionCaptureFromRuntime", () => {
  test("extracts styles, variables, layout, and instance metadata from runtime nodes", () => {
    const colorCollection: RuntimeVariableCollection = {
      id: "VariableCollectionId:colors",
      key: "collection-colors",
      modes: [
        {
          modeId: "light",
          name: "Light"
        }
      ],
      name: "Colors",
      remote: false
    };
    const primaryColor: RuntimeVariable = {
      codeSyntax: {
        WEB: "var(--color-action-primary)"
      },
      id: "VariableID:color-primary",
      key: "color-action-primary",
      name: "color/action/primary",
      remote: false,
      resolvedType: "COLOR",
      valuesByMode: {
        light: {
          b: 0.996,
          g: 0.384,
          r: 0.058
        }
      },
      variableCollectionId: colorCollection.id
    };
    const gapVariable: RuntimeVariable = {
      id: "VariableID:gap-md",
      key: "space-gap-md",
      name: "space/gap/md",
      remote: false,
      resolvedType: "FLOAT",
      valuesByMode: {
        light: 24
      },
      variableCollectionId: colorCollection.id
    };
    const styles = new Map<string, RuntimeStyle>([
      [
        "S:text-heading",
        {
          id: "S:text-heading",
          key: "text-heading",
          name: "Text / Heading",
          remote: false,
          type: "TEXT"
        }
      ],
      [
        "S:fill-brand",
        {
          boundVariables: {
            fills: [{ id: primaryColor.id, type: "VARIABLE_ALIAS" }]
          },
          id: "S:fill-brand",
          key: "fill-brand",
          name: "Fill / Brand",
          paints: [
            {
              color: {
                b: 0.996,
                g: 0.384,
                r: 0.058
              },
              type: "SOLID"
            }
          ],
          remote: false,
          type: "PAINT"
        }
      ]
    ]);
    const variables = new Map<string, RuntimeVariable>([
      [primaryColor.id, primaryColor],
      [gapVariable.id, gapVariable]
    ]);
    const collections = new Map<string, RuntimeVariableCollection>([
      [colorCollection.id, colorCollection]
    ]);
    const pluginApi: RuntimePluginApi = {
      getStyleById(id) {
        return styles.get(id) ?? null;
      },
      variables: {
        getVariableById(id) {
          return variables.get(id) ?? null;
        },
        getVariableCollectionById(id) {
          return collections.get(id) ?? null;
        }
      }
    };
    const selection: RuntimeSceneNode[] = [
      {
        children: [
          {
            boundVariables: {
              fills: [{ id: primaryColor.id, type: "VARIABLE_ALIAS" }]
            },
            characters: "Checkout",
            fillStyleId: "S:fill-brand",
            fills: [
              {
                color: {
                  b: 0.996,
                  g: 0.384,
                  r: 0.058
                },
                type: "SOLID"
              }
            ],
            height: 32,
            id: "12:35",
            name: "Heading",
            textAlignHorizontal: "LEFT",
            textAlignVertical: "TOP",
            textAutoResize: "HEIGHT",
            textStyleId: "S:text-heading",
            type: "TEXT",
            width: 220
          },
          {
            boundVariables: {
              componentProperties: {
                "Label#0:1": { id: primaryColor.id, type: "VARIABLE_ALIAS" }
              }
            },
            componentProperties: {
              "Label#0:1": {
                type: "TEXT",
                value: "Pay now"
              },
              Size: {
                type: "VARIANT",
                value: "L"
              }
            },
            componentPropertyReferences: {
              visible: "Visible#0:0"
            },
            height: 48,
            id: "12:99",
            mainComponent: {
              componentPropertyDefinitions: {
                "Label#0:1": {
                  defaultValue: "Submit",
                  type: "TEXT"
                },
                Size: {
                  defaultValue: "M",
                  type: "VARIANT",
                  variantOptions: ["S", "M", "L"]
                }
              },
              id: "20:1",
              key: "button-primary",
              name: "Button / Primary",
              parent: {
                componentPropertyDefinitions: {
                  Size: {
                    defaultValue: "M",
                    type: "VARIANT",
                    variantOptions: ["S", "M", "L"]
                  }
                },
                key: "button",
                name: "Button",
                remote: true,
                type: "COMPONENT_SET"
              },
              remote: true
            },
            name: "Button / Primary",
            resolvedVariableModes: {
              [colorCollection.id]: "light"
            },
            type: "INSTANCE",
            width: 160
          }
        ],
        height: 844,
        id: "12:34",
        itemSpacing: 24,
        layoutMode: "VERTICAL",
        layoutSizingHorizontal: "FIXED",
        layoutSizingVertical: "FIXED",
        name: "Checkout Screen",
        paddingBottom: 32,
        paddingLeft: 24,
        paddingRight: 24,
        paddingTop: 32,
        primaryAxisAlignItems: "MIN",
        resolvedVariableModes: {
          [colorCollection.id]: "light"
        },
        type: "FRAME",
        width: 390
      }
    ];

    const document = buildSelectionCaptureFromRuntime({
      page: {
        id: "1:2",
        name: "Checkout"
      },
      pluginApi,
      profile: "debug",
      pluginVersion: "0.7.0",
      selection,
      timestamp: "2026-03-09T08:00:00.000Z"
    });

    expect(document.registries.styles["style:text-heading"]).toMatchObject({
      name: "Text / Heading",
      styleType: "TEXT"
    });
    expect(document.registries.variables["variable:color-action-primary"]).toMatchObject({
      modes: [
        {
          modeId: "light"
        }
      ],
      name: "color/action/primary"
    });
    expect(document.registries.components["component:button-primary"]).toMatchObject({
      componentSetRef: "component-set:button",
      name: "Button / Primary"
    });
    expect(document.capture.modeContext).toEqual({
      [colorCollection.id]: "light"
    });
    expect(document.roots[0]).toMatchObject({
      layout: {
        gap: 24,
        mode: "column",
        padding: {
          bottom: 32,
          left: 24,
          right: 24,
          top: 32
        }
      }
    });
    expect(document.roots[0]?.figmaType).toBeUndefined();
    expect(document.roots[0]?.restNodeId).toBeUndefined();
    expect(document.roots[0]?.children?.[0]).toMatchObject({
      content: {
        text: {
          autoResize: "height",
          textStyleRef: "style:text-heading"
        }
      }
    });
    expect(document.roots[0]?.children?.[1]).toMatchObject({
      designSystem: {
        componentPropertyReferences: {
          visible: "Visible#0:0"
        },
        componentRef: "component:button-primary",
        instance: {
          properties: {
            "Label#0:1": {
              variableRef: "variable:color-action-primary"
            }
          },
          variant: {
            Size: "L"
          }
        }
      }
    });
    expect(document.roots[0]?.children?.[1]?.designSystem?.resolvedVariableModes).toBeUndefined();
  });

  test("hydrates async-only Figma lookups before building the capture", async () => {
    const colorCollection: RuntimeVariableCollection = {
      id: "VariableCollectionId:colors",
      modes: [
        {
          modeId: "light",
          name: "Light"
        }
      ],
      name: "Colors"
    };
    const primaryColor: RuntimeVariable = {
      id: "VariableID:color-primary",
      name: "color/action/primary",
      resolvedType: "COLOR",
      valuesByMode: {
        light: {
          b: 0.996,
          g: 0.384,
          r: 0.058
        }
      },
      variableCollectionId: colorCollection.id
    };
    const textStyle: RuntimeStyle = {
      id: "S:text-heading",
      name: "Text / Heading",
      type: "TEXT"
    };
    const fillStyle: RuntimeStyle = {
      boundVariables: {
        fills: [{ id: primaryColor.id, type: "VARIABLE_ALIAS" }]
      },
      id: "S:fill-brand",
      name: "Fill / Brand",
      paints: [
        {
          color: {
            b: 0.996,
            g: 0.384,
            r: 0.058
          },
          type: "SOLID"
        }
      ],
      type: "PAINT"
    };
    const pluginApi = {
      getStyleById() {
        throw new Error("sync style lookup should not be used");
      },
      async getStyleByIdAsync(id: string) {
        if (id === textStyle.id) {
          return textStyle as unknown as BaseStyle;
        }

        if (id === fillStyle.id) {
          return fillStyle as unknown as BaseStyle;
        }

        return null;
      },
      variables: {
        getVariableById() {
          throw new Error("sync variable lookup should not be used");
        },
        async getVariableByIdAsync(id: string) {
          return id === primaryColor.id
            ? (primaryColor as unknown as Variable)
            : null;
        },
        getVariableCollectionById() {
          throw new Error("sync variable collection lookup should not be used");
        },
        async getVariableCollectionByIdAsync(id: string) {
          return id === colorCollection.id
            ? (colorCollection as unknown as VariableCollection)
            : null;
        }
      }
    } as RuntimePluginApi & {
      getStyleByIdAsync(id: string): Promise<BaseStyle | null>;
      variables: RuntimePluginApi["variables"] & {
        getVariableByIdAsync(id: string): Promise<Variable | null>;
        getVariableCollectionByIdAsync(
          id: string
        ): Promise<VariableCollection | null>;
      };
    };
    const selection: RuntimeSceneNode[] = [
      {
        children: [
          {
            boundVariables: {
              fills: [{ id: primaryColor.id, type: "VARIABLE_ALIAS" }]
            },
            characters: "Checkout",
            fillStyleId: fillStyle.id,
            fills: [
              {
                color: {
                  b: 0.996,
                  g: 0.384,
                  r: 0.058
                },
                type: "SOLID"
              }
            ],
            id: "12:35",
            name: "Heading",
            textAutoResize: "HEIGHT",
            textStyleId: textStyle.id,
            type: "TEXT"
          },
          {
            componentProperties: {
              Size: {
                type: "VARIANT",
                value: "L"
              }
            },
            getMainComponentAsync: async () =>
              ({
                componentPropertyDefinitions: {
                  Size: {
                    defaultValue: "M",
                    type: "VARIANT",
                    variantOptions: ["M", "L"]
                  }
                },
                id: "20:1",
                key: "button-primary",
                name: "Button / Primary",
                parent: {
                  key: "button",
                  name: "Button",
                  type: "COMPONENT_SET"
                }
              }) as unknown as ComponentNode,
            id: "12:99",
            name: "Button / Primary",
            type: "INSTANCE"
          } as RuntimeSceneNode & {
            getMainComponentAsync(): Promise<ComponentNode | null>;
          }
        ],
        id: "12:34",
        name: "Checkout Screen",
        type: "FRAME"
      }
    ];

    const document = await buildSelectionCaptureFromRuntimeAsync({
      page: {
        id: "1:2",
        name: "Checkout"
      },
      pluginApi,
      profile: "debug",
      pluginVersion: "0.9.0",
      selection
    });

    expect(document.registries.styles["style:S-text-heading"]).toMatchObject({
      name: "Text / Heading"
    });
    expect(document.registries.variables["variable:VariableID-color-primary"]).toMatchObject({
      name: "color/action/primary"
    });
    expect(document.registries.components["component:button-primary"]).toMatchObject({
      componentSetRef: "component-set:button",
      name: "Button / Primary"
    });
    expect(document.roots[0]?.children?.[1]?.designSystem?.instance).toEqual({
      variant: {
        Size: "L"
      }
    });
  });

  test("applies injected component policy rules during runtime capture", () => {
    const pluginApi: RuntimePluginApi = {
      getStyleById() {
        return null;
      },
      variables: {
        getVariableById() {
          return null;
        },
        getVariableCollectionById() {
          return null;
        }
      }
    };
    const rules: ComponentPolicyRule[] = [
      {
        id: "inline-spacer",
        match: {
          componentNameRegex: ["(^|/)spacer($|/)"]
        },
        policy: "inline",
        priority: 1
      }
    ];
    const selection: RuntimeSceneNode[] = [
      {
        children: [
          {
            characters: "Resolved content",
            id: "12:36",
            name: "Label",
            type: "TEXT"
          }
        ],
        id: "12:35",
        mainComponent: {
          id: "20:1",
          key: "spacer",
          name: "Spacer",
          parent: {
            name: "Helpers",
            type: "COMPONENT_SET"
          }
        },
        name: "Spacer",
        type: "INSTANCE"
      }
    ];

    const document = buildSelectionCaptureFromRuntime({
      componentPolicyRules: rules,
      page: {
        id: "1:2",
        name: "Checkout"
      },
      pluginApi,
      profile: "debug",
      pluginVersion: "0.9.0",
      selection,
      timestamp: "2026-03-15T12:00:00.000Z"
    });

    expect(document.roots[0]).toMatchObject({
      children: [
        {
          content: {
            text: {
              characters: "Resolved content"
            }
          },
          kind: "text"
        }
      ],
      designSystem: {
        componentRef: "component:spacer",
        policy: "inline"
      },
      kind: "frame",
      origin: {
        sourceComponentRef: "component:spacer",
        transform: "inlined-instance"
      }
    });
  });

  test("hydrates mixed-text segments and grid metadata through the async runtime path", async () => {
    const headingStyle: RuntimeStyle = {
      id: "S:text-heading",
      name: "Text / Heading",
      type: "TEXT"
    };
    const bodyStyle: RuntimeStyle = {
      id: "S:text-body",
      name: "Text / Body",
      type: "TEXT"
    };
    const pluginApi = {
      getStyleById() {
        throw new Error("sync style lookup should not be used");
      },
      async getStyleByIdAsync(id: string) {
        if (id === headingStyle.id) {
          return headingStyle as unknown as BaseStyle;
        }

        if (id === bodyStyle.id) {
          return bodyStyle as unknown as BaseStyle;
        }

        return null;
      },
      variables: {
        getVariableById() {
          throw new Error("sync variable lookup should not be used");
        },
        async getVariableByIdAsync() {
          return null;
        },
        getVariableCollectionById() {
          throw new Error("sync variable collection lookup should not be used");
        },
        async getVariableCollectionByIdAsync() {
          return null;
        }
      }
    } as RuntimePluginApi & {
      getStyleByIdAsync(id: string): Promise<BaseStyle | null>;
      variables: RuntimePluginApi["variables"] & {
        getVariableByIdAsync(id: string): Promise<Variable | null>;
        getVariableCollectionByIdAsync(
          id: string
        ): Promise<VariableCollection | null>;
      };
    };
    type AsyncMixedTextNode = RuntimeSceneNode & {
      getStyledTextSegments(
        fields: readonly ["fills", "textStyleId", "fillStyleId"]
      ): Array<{
        characters: string;
        end: number;
        fills: Array<{
          color: {
            b: number;
            g: number;
            r: number;
          };
          type: "SOLID";
        }>;
        start: number;
        textStyleId: string;
      }>;
    };
    const richTextNode = {
      characters: "Hello world",
      fills: Symbol("mixed"),
      gridColumnAnchorIndex: 0,
      gridRowAnchorIndex: 0,
      id: "3:10",
      name: "Rich Copy",
      textAlignHorizontal: "LEFT",
      textAutoResize: "HEIGHT",
      textStyleId: Symbol("mixed"),
      type: "TEXT",
      width: 180
    } as AsyncMixedTextNode;
    const selection: RuntimeSceneNode[] = [
      {
        children: [richTextNode],
        gridColumnCount: 1,
        gridRowCount: 1,
        id: "3:1",
        layoutMode: "GRID",
        name: "Async Grid",
        type: "FRAME"
      }
    ];

    richTextNode.getStyledTextSegments = () => [
      {
        characters: "Hello",
        end: 5,
        fills: [
          {
            color: {
              b: 0.996,
              g: 0.384,
              r: 0.058
            },
            type: "SOLID"
          }
        ],
        start: 0,
        textStyleId: "S:text-heading"
      },
      {
        characters: " world",
        end: 11,
        fills: [
          {
            color: {
              b: 0.12,
              g: 0.12,
              r: 0.12
            },
            type: "SOLID"
          }
        ],
        start: 5,
        textStyleId: "S:text-body"
      }
    ];

    const document = await buildSelectionCaptureFromRuntimeAsync({
      page: {
        id: "1:2",
        name: "Async Grid"
      },
      pluginApi,
      profile: "debug",
      pluginVersion: "0.9.0",
      selection
    });

    expect(document.roots[0]).toMatchObject({
      layout: {
        grid: {
          columns: 1,
          rows: 1
        },
        mode: "grid"
      }
    });
    expect(document.roots[0]?.children?.[0]?.content?.text?.segments).toEqual([
      {
        characters: "Hello",
        end: 5,
        fill: [
          {
            fallback: "#0f62fe",
            kind: "solid"
          }
        ],
        start: 0,
        textStyleRef: "style:S-text-heading"
      },
      {
        characters: " world",
        end: 11,
        fill: [
          {
            fallback: "#1f1f1f",
            kind: "solid"
          }
        ],
        start: 5,
        textStyleRef: "style:S-text-body"
      }
    ]);
  });

  test("drops symbol-valued mixed style ids and numeric fields during async runtime capture", async () => {
    const pluginApi = {
      getStyleById() {
        throw new Error("sync style lookup should not be used");
      },
      async getStyleByIdAsync(id: string) {
        if (typeof id !== "string") {
          throw new TypeError("cannot convert symbol to number");
        }

        return null;
      },
      variables: {
        getVariableById() {
          throw new Error("sync variable lookup should not be used");
        },
        async getVariableByIdAsync() {
          return null;
        },
        getVariableCollectionById() {
          throw new Error("sync variable collection lookup should not be used");
        },
        async getVariableCollectionByIdAsync() {
          return null;
        }
      }
    } as RuntimePluginApi & {
      getStyleByIdAsync(id: string): Promise<BaseStyle | null>;
      variables: RuntimePluginApi["variables"] & {
        getVariableByIdAsync(id: string): Promise<Variable | null>;
        getVariableCollectionByIdAsync(
          id: string
        ): Promise<VariableCollection | null>;
      };
    };
    const selection: RuntimeSceneNode[] = [
      {
        children: [
          {
            characters: "Mixed heading",
            fillStyleId: Symbol("mixed-fill-style") as unknown as string,
            fills: Symbol("mixed-fills"),
            height: Symbol("mixed-height") as unknown as number,
            id: "4:10",
            maxLines: Symbol("mixed-lines") as unknown as number,
            name: "Heading",
            strokeStyleId: Symbol("mixed-stroke-style") as unknown as string,
            textStyleId: Symbol("mixed-text-style"),
            type: "TEXT",
            width: 180,
            x: Symbol("mixed-x") as unknown as number
          }
        ],
        fillStyleId: Symbol("mixed-frame-fill-style") as unknown as string,
        gridColumnCount: Symbol("mixed-columns") as unknown as number,
        height: 220,
        id: "4:1",
        name: "Mixed Symbol Frame",
        paddingTop: Symbol("mixed-padding-top") as unknown as number,
        type: "FRAME",
        width: Symbol("mixed-width") as unknown as number
      }
    ];

    const document = await buildSelectionCaptureFromRuntimeAsync({
      page: {
        id: "1:2",
        name: "Mixed Symbols"
      },
      pluginApi,
      profile: "debug",
      pluginVersion: "0.9.0",
      selection
    });

    expect(document.schemaVersion).toBe("0.1");
    expect(document.roots[0]).toMatchObject({
      bounds: {
        height: 220
      },
      children: [
        {
          bounds: {
            width: 180
          },
          content: {
            text: {
              characters: "Mixed heading"
            }
          },
          kind: "text"
        }
      ],
      kind: "frame"
    });
    expect(document.roots[0]?.bounds).not.toHaveProperty("width");
    expect(document.roots[0]?.layout).toBeUndefined();
    expect(document.roots[0]?.children?.[0]?.bounds).not.toHaveProperty("height");
    expect(document.roots[0]?.children?.[0]?.bounds).not.toHaveProperty("x");
    expect(document.roots[0]?.children?.[0]?.content?.text).not.toHaveProperty("maxLines");
    expect(document.roots[0]?.children?.[0]?.content?.text).not.toHaveProperty(
      "textStyleRef"
    );
  });

  test("drops invalid grid sentinel values during async runtime capture", async () => {
    const pluginApi = {
      getStyleById() {
        throw new Error("sync style lookup should not be used");
      },
      async getStyleByIdAsync() {
        return null;
      },
      variables: {
        getVariableById() {
          throw new Error("sync variable lookup should not be used");
        },
        async getVariableByIdAsync() {
          return null;
        },
        getVariableCollectionById() {
          throw new Error("sync variable collection lookup should not be used");
        },
        async getVariableCollectionByIdAsync() {
          return null;
        }
      }
    } as RuntimePluginApi & {
      getStyleByIdAsync(id: string): Promise<BaseStyle | null>;
      variables: RuntimePluginApi["variables"] & {
        getVariableByIdAsync(id: string): Promise<Variable | null>;
        getVariableCollectionByIdAsync(
          id: string
        ): Promise<VariableCollection | null>;
      };
    };
    const selection: RuntimeSceneNode[] = [
      {
        children: [
          {
            gridColumnAnchorIndex: -1 as unknown as number,
            gridColumnSpan: 0,
            gridRowAnchorIndex: -1 as unknown as number,
            gridRowSpan: 0,
            height: 40,
            id: "5:10",
            name: "Card",
            type: "RECTANGLE",
            width: 80
          }
        ],
        gridColumnCount: 0,
        gridColumnGap: 24,
        gridRowCount: 0,
        gridRowGap: 16,
        height: 220,
        id: "5:1",
        layoutMode: "GRID",
        name: "Sentinel Grid",
        type: "FRAME",
        width: 320
      }
    ];

    const document = await buildSelectionCaptureFromRuntimeAsync({
      page: {
        id: "1:2",
        name: "Sentinel Grid"
      },
      pluginApi,
      profile: "debug",
      pluginVersion: "0.9.0",
      selection
    });

    expect(document.roots[0]).toMatchObject({
      kind: "frame",
      layout: {
        grid: {
          columnGap: 24,
          rowGap: 16
        },
        mode: "grid"
      }
    });
    expect(document.roots[0]?.layout?.grid).not.toHaveProperty("columns");
    expect(document.roots[0]?.layout?.grid).not.toHaveProperty("rows");
    expect(document.roots[0]?.children?.[0]?.layout).toBeUndefined();
  });

  test("captures vectors, boolean operations, grid layout metadata, and mixed-text segments", () => {
    const styles = new Map<string, RuntimeStyle>([
      [
        "S:text-heading",
        {
          id: "S:text-heading",
          name: "Text / Heading",
          type: "TEXT"
        }
      ],
      [
        "S:text-body",
        {
          id: "S:text-body",
          name: "Text / Body",
          type: "TEXT"
        }
      ]
    ]);
    const pluginApi: RuntimePluginApi = {
      getStyleById(id) {
        return styles.get(id) ?? null;
      },
      variables: {
        getVariableById() {
          return null;
        },
        getVariableCollectionById() {
          return null;
        }
      }
    };
    const selection: RuntimeSceneNode[] = [
      {
        children: [
          {
            fills: [
              {
                color: {
                  b: 0.2,
                  g: 0.4,
                  r: 0.8
                },
                type: "SOLID"
              }
            ],
            gridColumnAnchorIndex: 0,
            gridRowAnchorIndex: 0,
            height: 48,
            id: "2:10",
            name: "Star Icon",
            type: "VECTOR",
            width: 48
          },
          {
            children: [
              {
                height: 32,
                id: "2:21",
                name: "Boolean Child",
                type: "RECTANGLE",
                width: 64
              }
            ],
            gridChildHorizontalAlign: "CENTER",
            gridChildVerticalAlign: "MAX",
            gridColumnAnchorIndex: 1,
            gridColumnSpan: 1,
            gridRowAnchorIndex: 0,
            gridRowSpan: 2,
            height: 72,
            id: "2:20",
            name: "Combined Shape",
            type: "BOOLEAN_OPERATION",
            width: 72
          },
          {
            characters: "Hello world",
            fills: Symbol("mixed"),
            gridColumnAnchorIndex: 0,
            gridColumnSpan: 2,
            gridRowAnchorIndex: 1,
            id: "2:30",
            name: "Rich Copy",
            textAlignHorizontal: "LEFT",
            textAutoResize: "HEIGHT",
            textSegments: [
              {
                characters: "Hello",
                end: 5,
                fills: [
                  {
                    color: {
                      b: 0.996,
                      g: 0.384,
                      r: 0.058
                    },
                    type: "SOLID"
                  }
                ],
                start: 0,
                textStyleId: "S:text-heading"
              },
              {
                characters: " world",
                end: 11,
                fills: [
                  {
                    color: {
                      b: 0.12,
                      g: 0.12,
                      r: 0.12
                    },
                    type: "SOLID"
                  }
                ],
                start: 5,
                textStyleId: "S:text-body"
              }
            ],
            textStyleId: Symbol("mixed"),
            type: "TEXT",
            width: 180
          }
        ],
        gridColumnCount: 2,
        gridColumnGap: 24,
        gridColumnSizes: [
          {
            type: "FIXED",
            value: 120
          },
          {
            type: "FLEX",
            value: 1
          }
        ],
        gridRowCount: 2,
        gridRowGap: 16,
        gridRowSizes: [
          {
            type: "HUG"
          },
          {
            type: "FLEX",
            value: 1
          }
        ],
        height: 220,
        id: "2:1",
        layoutMode: "GRID",
        name: "Grid Screen",
        paddingBottom: 24,
        paddingLeft: 24,
        paddingRight: 24,
        paddingTop: 24,
        type: "FRAME",
        width: 320
      }
    ];

    const document = buildSelectionCaptureFromRuntime({
      page: {
        id: "1:2",
        name: "Grid Page"
      },
      pluginApi,
      profile: "debug",
      pluginVersion: "0.9.0",
      selection
    });

    expect(document.roots[0]).toMatchObject({
      kind: "frame",
      layout: {
        grid: {
          columnGap: 24,
          columns: 2,
          rowGap: 16,
          rows: 2
        },
        mode: "grid"
      }
    });
    expect(document.roots[0]?.layout?.grid?.columnSizes).toEqual([
      {
        type: "fixed",
        value: 120
      },
      {
        type: "flex",
        value: 1
      }
    ]);
    expect(document.roots[0]?.layout?.grid?.rowSizes).toEqual([
      {
        type: "hug"
      },
      {
        type: "flex",
        value: 1
      }
    ]);
    expect(document.roots[0]?.children?.[0]).toMatchObject({
      kind: "vector",
      layout: {
        gridChild: {
          column: 0,
          row: 0
        }
      }
    });
    expect(document.roots[0]?.children?.[1]).toMatchObject({
      kind: "boolean-operation",
      layout: {
        gridChild: {
          column: 1,
          columnSpan: 1,
          horizontalAlign: "center",
          row: 0,
          rowSpan: 2,
          verticalAlign: "end"
        }
      }
    });
    expect(document.roots[0]?.children?.[2]?.content?.text?.segments).toEqual([
      {
        characters: "Hello",
        end: 5,
        fill: [
          {
            fallback: "#0f62fe",
            kind: "solid"
          }
        ],
        start: 0,
        textStyleRef: "style:S-text-heading"
      },
      {
        characters: " world",
        end: 11,
        fill: [
          {
            fallback: "#1f1f1f",
            kind: "solid"
          }
        ],
        start: 5,
        textStyleRef: "style:S-text-body"
      }
    ]);
  });
});
