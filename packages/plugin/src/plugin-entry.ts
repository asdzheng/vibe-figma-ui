import { initializePluginRuntime } from "./main.js";

if (typeof figma !== "undefined") {
  initializePluginRuntime();
}
