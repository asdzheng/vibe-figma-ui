import { homedir } from "node:os";
import { resolve } from "node:path";

export const DEFAULT_BRIDGE_HOST = "127.0.0.1";
export const DEFAULT_BRIDGE_PORT = 3845;
export const DEFAULT_BRIDGE_BASE_URL = `http://${DEFAULT_BRIDGE_HOST}:${DEFAULT_BRIDGE_PORT}`;
export const DEFAULT_BRIDGE_MAX_STORED_CAPTURES = 50;
export const DEFAULT_BRIDGE_STORAGE_PATH = resolve(
  homedir(),
  ".vibe-figma-ui",
  "captures.json"
);

export const BRIDGE_HEALTH_PATH = "/health";
export const BRIDGE_CAPTURES_PATH = "/captures";
export const BRIDGE_LATEST_CAPTURE_PATH = "/captures/latest";

export function getBridgeCapturePath(captureId: string): string {
  return `${BRIDGE_CAPTURES_PATH}/${encodeURIComponent(captureId)}`;
}
