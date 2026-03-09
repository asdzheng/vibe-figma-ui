import { describe, expect, test } from "vitest";

import { createDesignDocument, resolveComponentPolicy } from "@vibe-figma/capture-core";
import { loadSamplePolicyRules } from "@vibe-figma/fixtures";
import {
  createEmptyRegistries,
  type DesignCapture,
  type DesignNode
} from "@vibe-figma/schema";

describe("component policy resolution", () => {
  test("defaults to preserve when no rules match", () => {
    expect(
      resolveComponentPolicy(
        {
          componentName: "Button / Primary"
        },
        []
      )
    ).toEqual({ policy: "preserve" });
  });

  test("matches explicit icon rules before inline helpers", async () => {
    const rules = await loadSamplePolicyRules();

    expect(
      resolveComponentPolicy(
        {
          componentName: "Icon/Search",
          libraryName: "system-icons"
        },
        rules
      )
    ).toEqual({
      matchedRuleId: "icon-library",
      policy: "icon"
    });
  });
});

describe("createDesignDocument", () => {
  const capture: DesignCapture = {
    editorType: "figma",
    options: {
      captureScope: "selection",
      expandInstances: false
    },
    page: {
      id: "1:2",
      name: "Page"
    },
    pluginVersion: "0.1.0",
    selection: [
      {
        id: "10:10",
        name: "Search Icon",
        type: "INSTANCE"
      }
    ],
    timestamp: "2026-03-09T08:00:00.000Z"
  };

  test("normalizes icon instances and populates the icon registry", async () => {
    const rules = await loadSamplePolicyRules();
    const registries = createEmptyRegistries();
    const componentRef = "component:icon-search";
    const roots: DesignNode[] = [
      {
        bounds: {
          height: 20,
          width: 20
        },
        designSystem: {
          componentRef
        },
        figmaType: "INSTANCE",
        kind: "instance",
        name: "Icon/Search",
        pluginNodeId: "10:10"
      }
    ];

    registries.components[componentRef] = {
      key: "icon-search",
      library: {
        name: "system-icons"
      },
      name: "Icon/Search",
      ref: componentRef,
      remote: true
    };

    const document = createDesignDocument({
      capture,
      componentPolicyRules: rules,
      registries,
      roots
    });

    expect(document.roots[0]).toMatchObject({
      kind: "icon"
    });
    expect(Object.keys(document.registries.icons)).toHaveLength(1);
  });

  test("drops ignored instances and records a diagnostic warning", () => {
    const componentRef = "component:annotation-helper";
    const registries = createEmptyRegistries();

    registries.components[componentRef] = {
      name: "Annotation Helper",
      ref: componentRef
    };

    const document = createDesignDocument({
      capture,
      roots: [
        {
          designSystem: {
            componentRef,
            policy: "ignore"
          },
          figmaType: "INSTANCE",
          kind: "instance",
          name: "Annotation Helper",
          pluginNodeId: "10:11"
        }
      ]
    });

    expect(document.roots).toHaveLength(0);
    expect(document.diagnostics.warnings).toHaveLength(1);
  });
});
