export {
  createDesignDocument,
  type BuildDesignDocumentInput
} from "./document-builder.js";
export {
  deriveComponentPolicyContext,
  matchesComponentPolicyRule,
  resolveComponentPolicy,
  sortComponentPolicyRules,
  type ComponentPolicyContext,
  type PolicyResolution
} from "./policy-engine.js";
