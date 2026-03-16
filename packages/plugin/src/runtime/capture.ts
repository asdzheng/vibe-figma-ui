import { buildSelectionCapture } from "../adapter.js";
import type { BuildSelectionCaptureInput } from "../model.js";
import type {
  DesignDocument,
  DesignDocumentV0_1,
  DesignDocumentV0_2
} from "@vibe-figma/schema";
import { prepareRuntimeCaptureInput } from "./live-capture.js";
import { RuntimeRegistryCollector } from "./registry-collector.js";
import { extractNodeFromRuntime } from "./extract-node.js";
import type { RuntimePluginApi, RuntimeSceneNode } from "./types.js";

export type BuildSelectionCaptureFromRuntimeInput = Omit<
  BuildSelectionCaptureInput,
  "registries" | "selection"
> & {
  pluginApi: RuntimePluginApi;
  selection: readonly RuntimeSceneNode[];
};

export function buildSelectionCaptureFromRuntime(
  input: BuildSelectionCaptureFromRuntimeInput & {
    profile: "debug";
  }
): DesignDocumentV0_1;
export function buildSelectionCaptureFromRuntime(
  input: BuildSelectionCaptureFromRuntimeInput & {
    profile?: "canonical" | undefined;
  }
): DesignDocumentV0_2;
export function buildSelectionCaptureFromRuntime(
  input: BuildSelectionCaptureFromRuntimeInput
): DesignDocument {
  const collector = new RuntimeRegistryCollector(input.pluginApi);
  const selection = input.selection.map((node) =>
    extractNodeFromRuntime(node, collector)
  );

  if (input.profile === "debug") {
    return buildSelectionCapture({
      ...(input.componentContextByRef
        ? { componentContextByRef: input.componentContextByRef }
        : {}),
      ...(input.componentPolicyRules
        ? { componentPolicyRules: input.componentPolicyRules }
        : {}),
      page: input.page,
      pluginVersion: input.pluginVersion,
      profile: "debug",
      registries: collector.registries,
      selection,
      ...(input.sourceFileKey ? { sourceFileKey: input.sourceFileKey } : {}),
      ...(input.timestamp ? { timestamp: input.timestamp } : {})
    });
  }

  return buildSelectionCapture({
    ...(input.componentContextByRef
      ? { componentContextByRef: input.componentContextByRef }
      : {}),
    ...(input.componentPolicyRules
      ? { componentPolicyRules: input.componentPolicyRules }
      : {}),
    page: input.page,
    pluginVersion: input.pluginVersion,
    registries: collector.registries,
    selection,
    ...(input.sourceFileKey ? { sourceFileKey: input.sourceFileKey } : {}),
    ...(input.timestamp ? { timestamp: input.timestamp } : {})
  });
}

export async function buildSelectionCaptureFromRuntimeAsync(
  input: BuildSelectionCaptureFromRuntimeInput & {
    profile: "debug";
  }
): Promise<DesignDocumentV0_1>;
export async function buildSelectionCaptureFromRuntimeAsync(
  input: BuildSelectionCaptureFromRuntimeInput & {
    profile?: "canonical" | undefined;
  }
): Promise<DesignDocumentV0_2>;
export async function buildSelectionCaptureFromRuntimeAsync(
  input: BuildSelectionCaptureFromRuntimeInput
): Promise<DesignDocument> {
  const runtimeInput = await prepareRuntimeCaptureInput(
    input.pluginApi,
    input.selection
  );

  if (input.profile === "debug") {
    return buildSelectionCaptureFromRuntime({
      ...input,
      pluginApi: runtimeInput.pluginApi,
      profile: "debug",
      selection: runtimeInput.selection
    });
  }

  return buildSelectionCaptureFromRuntime({
    ...(input.componentContextByRef
      ? { componentContextByRef: input.componentContextByRef }
      : {}),
    ...(input.componentPolicyRules
      ? { componentPolicyRules: input.componentPolicyRules }
      : {}),
    page: input.page,
    pluginApi: runtimeInput.pluginApi,
    pluginVersion: input.pluginVersion,
    selection: runtimeInput.selection,
    ...(input.sourceFileKey ? { sourceFileKey: input.sourceFileKey } : {}),
    ...(input.timestamp ? { timestamp: input.timestamp } : {})
  });
}
