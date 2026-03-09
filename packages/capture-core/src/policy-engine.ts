import type {
  ComponentCapturePolicy,
  ComponentPolicyRule,
  DesignRegistries
} from "@vibe-figma/schema";

export type ComponentPolicyContext = {
  componentKey?: string | undefined;
  componentName?: string | undefined;
  componentRef?: string | undefined;
  componentSetName?: string | undefined;
  folderPath?: string | undefined;
  libraryName?: string | undefined;
  remote?: boolean | undefined;
};

export type PolicyResolution = {
  matchedRuleId?: string | undefined;
  policy: ComponentCapturePolicy;
};

export function sortComponentPolicyRules(
  rules: readonly ComponentPolicyRule[]
): ComponentPolicyRule[] {
  return [...rules]
    .map((rule, index) => ({ index, rule }))
    .sort((left, right) => {
      if (left.rule.priority === right.rule.priority) {
        return left.index - right.index;
      }

      return left.rule.priority - right.rule.priority;
    })
    .map(({ rule }) => rule);
}

function matchExactList(
  value: string | undefined,
  candidates: readonly string[] | undefined
): boolean {
  if (!candidates) {
    return true;
  }

  return value ? candidates.includes(value) : false;
}

function matchRegexList(
  value: string | undefined,
  patterns: readonly string[] | undefined
): boolean {
  if (!patterns) {
    return true;
  }

  return value
    ? patterns.some((pattern) => new RegExp(pattern, "i").test(value))
    : false;
}

export function matchesComponentPolicyRule(
  rule: ComponentPolicyRule,
  context: ComponentPolicyContext
): boolean {
  return (
    matchExactList(context.componentKey, rule.match.componentKey) &&
    matchExactList(context.componentName, rule.match.componentName) &&
    matchRegexList(context.componentName, rule.match.componentNameRegex) &&
    matchRegexList(context.componentSetName, rule.match.componentSetNameRegex) &&
    matchRegexList(context.folderPath, rule.match.folderPathRegex) &&
    matchRegexList(context.libraryName, rule.match.libraryNameRegex) &&
    (rule.match.remote === undefined || rule.match.remote === context.remote)
  );
}

export function resolveComponentPolicy(
  context: ComponentPolicyContext,
  rules: readonly ComponentPolicyRule[]
): PolicyResolution {
  const matchingRule = sortComponentPolicyRules(rules).find((rule) =>
    matchesComponentPolicyRule(rule, context)
  );

  if (!matchingRule) {
    return { policy: "preserve" };
  }

  return {
    matchedRuleId: matchingRule.id,
    policy: matchingRule.policy
  };
}

export function deriveComponentPolicyContext(
  componentRef: string,
  registries: DesignRegistries,
  overrides?: Partial<ComponentPolicyContext>
): ComponentPolicyContext {
  const component = registries.components[componentRef];
  const componentSet = component?.componentSetRef
    ? registries.componentSets[component.componentSetRef]
    : undefined;

  return {
    ...(overrides?.componentKey ?? component?.key
      ? { componentKey: overrides?.componentKey ?? component?.key }
      : {}),
    ...(overrides?.componentName ?? component?.name
      ? { componentName: overrides?.componentName ?? component?.name }
      : {}),
    componentRef,
    ...(overrides?.componentSetName ?? componentSet?.name
      ? { componentSetName: overrides?.componentSetName ?? componentSet?.name }
      : {}),
    ...(overrides?.folderPath ? { folderPath: overrides.folderPath } : {}),
    ...(overrides?.libraryName ?? component?.library?.name
      ? { libraryName: overrides?.libraryName ?? component?.library?.name }
      : {}),
    ...(overrides?.remote ?? component?.remote) !== undefined
      ? { remote: overrides?.remote ?? component?.remote }
      : {}
  };
}
