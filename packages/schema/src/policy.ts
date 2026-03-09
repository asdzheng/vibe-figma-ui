import { z } from "zod";

export const componentCapturePolicySchema = z.enum([
  "preserve",
  "inline",
  "icon",
  "ignore"
]);

export const componentPolicyRuleMatchSchema = z
  .object({
    componentKey: z.array(z.string().min(1)).optional(),
    componentName: z.array(z.string().min(1)).optional(),
    componentNameRegex: z.array(z.string().min(1)).optional(),
    componentSetNameRegex: z.array(z.string().min(1)).optional(),
    folderPathRegex: z.array(z.string().min(1)).optional(),
    libraryNameRegex: z.array(z.string().min(1)).optional(),
    remote: z.boolean().optional()
  })
  .strict();

export const componentPolicyRuleSchema = z
  .object({
    id: z.string().min(1),
    priority: z.number().int(),
    match: componentPolicyRuleMatchSchema,
    policy: componentCapturePolicySchema,
    reason: z.string().min(1).optional()
  })
  .strict();

export const componentPolicyRulesSchema = z.array(componentPolicyRuleSchema);

export type ComponentCapturePolicy = z.infer<
  typeof componentCapturePolicySchema
>;
export type ComponentPolicyRuleMatch = z.infer<
  typeof componentPolicyRuleMatchSchema
>;
export type ComponentPolicyRule = z.infer<typeof componentPolicyRuleSchema>;
