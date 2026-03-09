import { describe, expect, test } from "vitest";

import { buildSelectionCaptureFromRuntime } from "@vibe-figma/plugin";
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
      pluginVersion: "0.4.0",
      selection,
      timestamp: "2026-03-09T08:00:00.000Z"
    });

    expect(document.registries.styles["style:text-heading"]).toMatchObject({
      name: "Text / Heading",
      styleType: "TEXT"
    });
    expect(document.registries.variables["variable:color-action-primary"]).toMatchObject({
      name: "color/action/primary"
    });
    expect(document.registries.components["component:button-primary"]).toMatchObject({
      componentSetRef: "component-set:button",
      name: "Button / Primary"
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
        },
        resolvedVariableModes: {
          [colorCollection.id]: "light"
        }
      }
    });
  });
});
