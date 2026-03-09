import { execFile } from "node:child_process";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const DEFAULT_ARTIFACTS_DIR = "artifacts";
export const PACKAGE_PACK_TARGETS = [
  "@vibe-figma/ui-bridge",
  "@vibe-figma/mcp-server"
];
export const PLUGIN_ARTIFACT_ENTRIES = ["dist", "manifest.json", "ui.html"];

function parseOutputDir(value) {
  if (!value || value.startsWith("--")) {
    throw new Error("Expected a path after --output-dir.");
  }

  return value;
}

export function parsePackageArtifactsArgs(argv) {
  let outputDir = DEFAULT_ARTIFACTS_DIR;
  let skipBuild = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--") {
      continue;
    }

    if (argument === "--skip-build") {
      skipBuild = true;
      continue;
    }

    if (argument === "--output-dir") {
      outputDir = parseOutputDir(argv[index + 1]);
      index += 1;
      continue;
    }

    if (argument.startsWith("--output-dir=")) {
      outputDir = parseOutputDir(argument.slice("--output-dir=".length));
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return {
    outputDir,
    skipBuild
  };
}

async function ensurePathExists(path) {
  try {
    await stat(path);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new Error(`Required artifact input is missing: ${path}`, {
        cause: error
      });
    }

    throw error;
  }
}

async function runPnpm(rootDir, args) {
  const { stdout } = await execFileAsync("corepack", ["pnpm", ...args], {
    cwd: rootDir
  });

  return stdout;
}

export async function copyPluginArtifact({ outputDir, pluginDir }) {
  const bundleDir = join(outputDir, "plugin");

  await Promise.all(
    PLUGIN_ARTIFACT_ENTRIES.map((entry) =>
      ensurePathExists(join(pluginDir, entry))
    )
  );

  await rm(bundleDir, { force: true, recursive: true });
  await mkdir(bundleDir, { recursive: true });

  await Promise.all(
    PLUGIN_ARTIFACT_ENTRIES.map(async (entry) => {
      await cp(join(pluginDir, entry), join(bundleDir, entry), { recursive: true });
    })
  );

  return bundleDir;
}

export async function packWorkspacePackage({ outputDir, packageName, rootDir }) {
  await mkdir(outputDir, { recursive: true });

  const packOutput = await runPnpm(rootDir, [
    "--filter",
    packageName,
    "pack",
    "--json",
    "--pack-destination",
    outputDir
  ]);
  const parsedOutput = JSON.parse(packOutput);
  const packResult = Array.isArray(parsedOutput)
    ? parsedOutput.at(-1)
    : parsedOutput;

  if (!packResult || typeof packResult.filename !== "string") {
    throw new Error(`Unable to determine packed artifact output for ${packageName}.`);
  }

  return {
    filename: packResult.filename,
    name: packResult.name,
    version: packResult.version
  };
}

export async function packageArtifacts({
  outputDir = DEFAULT_ARTIFACTS_DIR,
  rootDir,
  skipBuild = false
}) {
  const artifactRoot = resolve(rootDir, outputDir);
  const npmArtifactDir = join(artifactRoot, "npm");
  const pluginDir = join(rootDir, "packages", "plugin");
  const rootPackage = JSON.parse(
    await readFile(join(rootDir, "package.json"), "utf8")
  );

  await rm(artifactRoot, { force: true, recursive: true });
  await mkdir(artifactRoot, { recursive: true });

  if (!skipBuild) {
    await runPnpm(rootDir, ["build"]);
  }

  const pluginBundleDir = await copyPluginArtifact({
    outputDir: artifactRoot,
    pluginDir
  });
  const packages = [];

  for (const packageName of PACKAGE_PACK_TARGETS) {
    packages.push(
      await packWorkspacePackage({
        outputDir: npmArtifactDir,
        packageName,
        rootDir
      })
    );
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    version: rootPackage.version,
    artifacts: {
      npmPackages: packages.map((artifact) => ({
        file: relative(artifactRoot, artifact.filename),
        name: artifact.name,
        version: artifact.version
      })),
      pluginBundle: {
        files: PLUGIN_ARTIFACT_ENTRIES,
        path: relative(artifactRoot, pluginBundleDir)
      }
    }
  };
  const manifestPath = join(artifactRoot, "manifest.json");

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return {
    artifactRoot,
    manifestPath,
    packages,
    pluginBundleDir
  };
}

async function main() {
  const rootDir = resolve(
    fileURLToPath(new globalThis.URL("..", import.meta.url))
  );
  const options = parsePackageArtifactsArgs(process.argv.slice(2));
  const result = await packageArtifacts({
    ...options,
    rootDir
  });

  globalThis.console.error(`Artifacts written to ${result.artifactRoot}`);
  globalThis.console.error(`Plugin bundle: ${result.pluginBundleDir}`);

  for (const artifact of result.packages) {
    globalThis.console.error(`${artifact.name}: ${artifact.filename}`);
  }

  globalThis.console.error(`Manifest: ${result.manifestPath}`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((error) => {
    const message =
      error instanceof Error ? error.message : "Unknown artifact packaging error.";

    globalThis.console.error(message);
    process.exit(1);
  });
}
