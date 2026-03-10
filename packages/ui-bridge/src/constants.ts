import { homedir } from "node:os";
import { resolve } from "node:path";

export {
  BRIDGE_CAPTURES_PATH,
  BRIDGE_HEALTH_PATH,
  BRIDGE_LATEST_CAPTURE_PATH,
  DEFAULT_BRIDGE_BASE_URL,
  DEFAULT_BRIDGE_HOST,
  DEFAULT_BRIDGE_PORT,
  getBridgeCapturePath
} from "./transport.js";

export const DEFAULT_BRIDGE_MAX_STORED_CAPTURES = 50;
export const DEFAULT_BRIDGE_STORAGE_PATH = resolve(
  homedir(),
  ".vibe-figma-ui",
  "captures.json"
);
