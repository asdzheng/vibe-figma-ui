import {
  componentPolicyRulesSchema,
  type ComponentPolicyRule
} from "@vibe-figma/schema";

const rules = componentPolicyRulesSchema.parse([
  {
    id: "icon-component-set",
    match: {
      componentNameRegex: ["(^|/)(icon|ic)/"],
      componentSetNameRegex: ["(^|/)icons?$", "(^|/)system-icons?$"]
    },
    policy: "icon",
    priority: 100,
    reason: "normalize icon instances from icon component sets"
  },
  {
    id: "icon-library",
    match: {
      componentNameRegex: ["(^|/)(icon|ic)/"],
      libraryNameRegex: ["(^|/)icons?$", "(^|/)system-icons?$"]
    },
    policy: "icon",
    priority: 110,
    reason: "normalize icon instances into icon refs"
  },
  {
    id: "layout-helpers",
    match: {
      componentNameRegex: [
        "(^|/)(spacer|gap|stack|inset|padding|grid cell|content wrapper)($|/)"
      ]
    },
    policy: "inline",
    priority: 200,
    reason: "treat layout helpers as resolved layout"
  }
]) as readonly ComponentPolicyRule[];

export const defaultComponentPolicyRules = rules;
