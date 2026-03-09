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

export const captureFixtureNames = [
  "sample",
  "iconNormalized",
  "helperInlined",
  "helperIgnored",
  "remoteLibrary",
  "variableModes"
] as const;

export type CaptureFixtureName = (typeof captureFixtureNames)[number];

const captureFixturePaths: Record<CaptureFixtureName, string> = {
  sample: resolve(dataRoot, "sample-capture.json"),
  iconNormalized: resolve(dataRoot, "icon-normalized-capture.json"),
  helperInlined: resolve(dataRoot, "helper-inlined-capture.json"),
  helperIgnored: resolve(dataRoot, "helper-ignored-capture.json"),
  remoteLibrary: resolve(dataRoot, "remote-library-capture.json"),
  variableModes: resolve(dataRoot, "variable-modes-capture.json")
};

export const fixturePaths = {
  captures: captureFixturePaths,
  sampleCapture: captureFixturePaths.sample,
  samplePolicyRules: resolve(dataRoot, "sample-policy-rules.json")
} as const;

async function readJsonFixture(filePath: string): Promise<unknown> {
  const fileContents = await readFile(filePath, "utf8");

  return JSON.parse(fileContents) as unknown;
}

export async function loadCaptureFixtureDocument(
  fixtureName: CaptureFixtureName
): Promise<DesignDocument> {
  return designDocumentSchema.parse(
    await readJsonFixture(fixturePaths.captures[fixtureName])
  );
}

export async function loadAllCaptureFixtureDocuments(): Promise<
  Record<CaptureFixtureName, DesignDocument>
> {
  const entries = await Promise.all(
    captureFixtureNames.map(async (fixtureName) => [
      fixtureName,
      await loadCaptureFixtureDocument(fixtureName)
    ] as const)
  );

  return Object.fromEntries(entries) as Record<CaptureFixtureName, DesignDocument>;
}

export async function loadSampleCaptureDocument(): Promise<DesignDocument> {
  return loadCaptureFixtureDocument("sample");
}

export async function loadSamplePolicyRules(): Promise<ComponentPolicyRule[]> {
  return componentPolicyRulesSchema.parse(
    await readJsonFixture(fixturePaths.samplePolicyRules)
  );
}
