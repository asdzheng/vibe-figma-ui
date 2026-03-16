export {
  createDesignDocument,
  type BuildDesignDocumentInput
} from "./document-builder.js";
export { convertDesignDocumentToV0_2 } from "./canonical-v0-2.js";
export { defaultComponentPolicyRules } from "./default-policy-rules.js";
export {
  deriveComponentPolicyContext,
  matchesComponentPolicyRule,
  resolveComponentPolicy,
  sortComponentPolicyRules,
  type ComponentPolicyContext,
  type PolicyResolution
} from "./policy-engine.js";
