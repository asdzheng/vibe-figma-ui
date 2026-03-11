import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  copyPluginArtifact,
  parsePackageArtifactsArgs
} from "./package-artifacts.mjs";

describe("package artifact helpers", () => {
  let temporaryDirectory;

  afterEach(async () => {
    if (temporaryDirectory) {
      await rm(temporaryDirectory, { force: true, recursive: true });
      temporaryDirectory = undefined;
    }
  });

  test("parses output-dir and skip-build arguments", () => {
    expect(
      parsePackageArtifactsArgs(["--output-dir", "release-artifacts", "--skip-build"])
    ).toEqual({
      outputDir: "release-artifacts",
      skipBuild: true
    });

    expect(parsePackageArtifactsArgs(["--output-dir=out"])).toEqual({
      outputDir: "out",
      skipBuild: false
    });

    expect(parsePackageArtifactsArgs(["--", "--skip-build"])).toEqual({
      outputDir: "artifacts",
      skipBuild: true
    });
  });

  test("copies the plugin import bundle into the artifact directory", async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "vibe-figma-package-"));

    const pluginDir = join(temporaryDirectory, "plugin");
    const artifactDir = join(temporaryDirectory, "artifacts");

    await mkdir(join(pluginDir, "dist"), { recursive: true });
    await writeFile(
      join(pluginDir, "manifest.json"),
      JSON.stringify({ main: "dist/plugin.js", ui: "ui.html" }),
      "utf8"
    );
    await writeFile(join(pluginDir, "ui.html"), "<html></html>", "utf8");
    await writeFile(join(pluginDir, "dist", "plugin.js"), "(() => {})();\n", "utf8");

    const pluginBundleDir = await copyPluginArtifact({
      outputDir: artifactDir,
      pluginDir
    });

    await expect(
      readFile(join(pluginBundleDir, "manifest.json"), "utf8")
    ).resolves.toContain('"main":"dist/plugin.js"');
    await expect(
      readFile(join(pluginBundleDir, "ui.html"), "utf8")
    ).resolves.toContain("<html>");
    await expect(
      readFile(join(pluginBundleDir, "dist", "plugin.js"), "utf8")
    ).resolves.toContain("(() => {})()");
  });

  test("fails fast when required plugin bundle inputs are missing", async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "vibe-figma-package-"));

    const pluginDir = join(temporaryDirectory, "plugin");
    const artifactDir = join(temporaryDirectory, "artifacts");

    await mkdir(pluginDir, { recursive: true });

    await expect(
      copyPluginArtifact({
        outputDir: artifactDir,
        pluginDir
      })
    ).rejects.toThrow("Required artifact input is missing");
  });
});
