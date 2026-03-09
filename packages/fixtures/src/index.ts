import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  componentPolicyRulesSchema,
  designDocumentSchema,
  type ComponentPolicyRule,
  type DesignDocument
} from "@vibe-figma/schema";

const packageRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dataRoot = resolve(packageRoot, "data");

export const fixturePaths = {
  sampleCapture: resolve(dataRoot, "sample-capture.json"),
  samplePolicyRules: resolve(dataRoot, "sample-policy-rules.json")
} as const;

async function readJsonFixture(filePath: string): Promise<unknown> {
  const fileContents = await readFile(filePath, "utf8");

  return JSON.parse(fileContents) as unknown;
}

export async function loadSampleCaptureDocument(): Promise<DesignDocument> {
  return designDocumentSchema.parse(
    await readJsonFixture(fixturePaths.sampleCapture)
  );
}

export async function loadSamplePolicyRules(): Promise<ComponentPolicyRule[]> {
  return componentPolicyRulesSchema.parse(
    await readJsonFixture(fixturePaths.samplePolicyRules)
  );
}
