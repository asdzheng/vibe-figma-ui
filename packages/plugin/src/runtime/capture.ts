import { buildSelectionCapture } from "../adapter.js";
import type { BuildSelectionCaptureInput } from "../model.js";
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
  input: BuildSelectionCaptureFromRuntimeInput
) {
  const collector = new RuntimeRegistryCollector(input.pluginApi);
  const selection = input.selection.map((node) =>
    extractNodeFromRuntime(node, collector)
  );

  return buildSelectionCapture({
    page: input.page,
    pluginVersion: input.pluginVersion,
    registries: collector.registries,
    selection,
    ...(input.sourceFileKey ? { sourceFileKey: input.sourceFileKey } : {}),
    ...(input.timestamp ? { timestamp: input.timestamp } : {})
  });
}
