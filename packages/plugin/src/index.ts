export {
  adaptFigmaNode,
  buildSelectionCapture,
} from "./adapter.js";
export type {
  BuildSelectionCaptureInput,
  FigmaComponentLike,
  FigmaComponentPropertyDefinitionLike,
  FigmaComponentPropertyLike,
  FigmaEffectLike,
  FigmaNodeLike,
  FigmaPaintLike
} from "./model.js";
export {
  captureCurrentSelection,
  initializePluginRuntime,
  PLUGIN_VERSION
} from "./main.js";
export { buildSelectionCaptureFromRuntime } from "./runtime/capture.js";
export { extractNodeFromRuntime } from "./runtime/extract-node.js";
export { RuntimeRegistryCollector } from "./runtime/registry-collector.js";
export type {
  RuntimeComponentNode,
  RuntimeComponentProperty,
  RuntimeComponentPropertyDefinition,
  RuntimePluginApi,
  RuntimeSceneNode,
  RuntimeStyle,
  RuntimeVariable,
  RuntimeVariableAlias,
  RuntimeVariableCollection
} from "./runtime/types.js";
