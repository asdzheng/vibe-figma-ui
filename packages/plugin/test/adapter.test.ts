import { describe, expect, test } from "vitest";

import { buildSelectionCapture } from "@vibe-figma/plugin";

describe("buildSelectionCapture", () => {
  test("captures instance metadata into canonical design JSON", () => {
    const document = buildSelectionCapture({
      page: {
        id: "1:2",
        name: "Checkout"
      },
      pluginVersion: "0.2.0",
      selection: [
        {
          componentProperties: {
            Label: {
              type: "TEXT",
              value: "Pay now"
            }
          },
          height: 48,
          id: "12:99",
          mainComponent: {
            key: "button-primary",
            libraryName: "Acme Design System",
            name: "Button / Primary",
            remote: true
          },
          name: "Button / Primary",
          type: "INSTANCE",
          variantProperties: {
            Size: "L",
            Tone: "Primary"
          },
          width: 160
        }
      ],
      timestamp: "2026-03-09T08:00:00.000Z"
    });

    expect(document.registries.components["component:button-primary"]).toMatchObject({
      name: "Button / Primary"
    });
    expect(document.roots[0]?.designSystem?.instance?.variant).toEqual({
      Size: "L",
      Tone: "Primary"
    });
  });
});
