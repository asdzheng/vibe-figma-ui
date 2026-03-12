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
      pluginVersion: "0.8.0",
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
});
