import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, parse, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { designDocumentSchema, type DesignDocument } from "@vibe-figma/schema";

import { createFetchCompanionClient } from "./client.js";
import { renderDesignDocumentSnapshot } from "./snapshot.js";
import { startCompanionHttpServer } from "./server.js";
import {
  DEFAULT_COMPANION_HOST,
  DEFAULT_COMPANION_PORT,
  type CompanionStatus
} from "./transport.js";

export const CLI_VERSION = "0.8.0";

type ParsedGlobalOptions = {
  command: string;
  inputPath?: string;
  outputPath?: string;
  sessionId?: string;
  targetUrl: string;
};

function isOption(argument: string): boolean {
  return argument.startsWith("--");
}

function parseOptionValue(
  optionName: string,
  rawValue: string | undefined
): string {
  if (!rawValue || isOption(rawValue)) {
    throw new Error(`Expected a value after ${optionName}.`);
  }

  return rawValue;
}

function parseIntegerOption(
  optionName: string,
  rawValue: string | undefined,
  fallbackValue: number
): number {
  if (rawValue === undefined) {
    return fallbackValue;
  }

  const parsedValue = Number.parseInt(parseOptionValue(optionName, rawValue), 10);

  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`Expected ${optionName} to be a positive integer.`);
  }

  return parsedValue;
}

function parsePort(value: string | undefined, fallbackValue: number): number {
  if (!value) {
    return fallbackValue;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isSafeInteger(parsedValue) || parsedValue < 0 || parsedValue > 65535) {
    throw new Error(`Invalid companion port: ${value}`);
  }

  return parsedValue;
}

function printJson(payload: unknown): void {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function readDefaultBaseUrl(env: NodeJS.ProcessEnv): string {
  const explicitBaseUrl =
    env.VIBE_FIGMA_COMPANION_URL ?? env.VIBE_FIGMA_BRIDGE_URL;

  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/$/, "");
  }

  const host =
    env.VIBE_FIGMA_COMPANION_HOST ??
    env.VIBE_FIGMA_BRIDGE_HOST ??
    DEFAULT_COMPANION_HOST;
  const port = parsePort(
    env.VIBE_FIGMA_COMPANION_PORT ?? env.VIBE_FIGMA_BRIDGE_PORT ?? env.PORT,
    DEFAULT_COMPANION_PORT
  );

  return `http://${host}:${port}`;
}

function summarizeDocument(document: DesignDocument): {
  pageName: string;
  rootCount: number;
  schemaVersion: string;
  selectionCount: number;
  warningCount: number;
} {
  return {
    pageName: document.capture.page.name,
    rootCount: document.roots.length,
    schemaVersion: document.schemaVersion,
    selectionCount: document.capture.selection.length,
    warningCount: document.diagnostics.warnings.length
  };
}

function usage(): string {
  return [
    "Usage: vibe-figma <command> [options]",
    "",
    "Commands:",
    "  init",
    "  dev",
    "  status [--session <id>] [--companion-url <url>]",
    "  capture [--session <id>] [--companion-url <url>]",
    "  export-json [--session <id>] [--output <path>] [--companion-url <url>]",
    "  logs [--session <id>] [--limit <n>] [--companion-url <url>]",
    "  doctor [--companion-url <url>]",
    "  screenshot [--input <path>] [--output <path>] [--session <id>] [--companion-url <url>]",
    ""
  ].join("\n");
}

function parseGlobalOptions(
  argv: readonly string[],
  env: NodeJS.ProcessEnv
): ParsedGlobalOptions {
  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;
  const [command = "help", ...rest] = normalizedArgv;
  let inputPath: string | undefined;
  let outputPath: string | undefined;
  let sessionId: string | undefined;
  let targetUrl = readDefaultBaseUrl(env);

  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];

    if (!argument || argument === "--") {
      continue;
    }

    if (argument === "--help") {
      return {
        command: "help",
        targetUrl
      };
    }

    if (argument === "--session") {
      sessionId = parseOptionValue(argument, rest[index + 1]);
      index += 1;
      continue;
    }

    if (argument.startsWith("--session=")) {
      sessionId = argument.slice("--session=".length);
      continue;
    }

    if (argument === "--output") {
      outputPath = parseOptionValue(argument, rest[index + 1]);
      index += 1;
      continue;
    }

    if (argument.startsWith("--output=")) {
      outputPath = argument.slice("--output=".length);
      continue;
    }

    if (argument === "--input") {
      inputPath = parseOptionValue(argument, rest[index + 1]);
      index += 1;
      continue;
    }

    if (argument.startsWith("--input=")) {
      inputPath = argument.slice("--input=".length);
      continue;
    }

    if (argument === "--companion-url") {
      targetUrl = parseOptionValue(argument, rest[index + 1]).replace(/\/$/, "");
      index += 1;
      continue;
    }

    if (argument.startsWith("--companion-url=")) {
      targetUrl = argument.slice("--companion-url=".length).replace(/\/$/, "");
      continue;
    }
  }

  return {
    command,
    ...(inputPath ? { inputPath } : {}),
    ...(outputPath ? { outputPath } : {}),
    ...(sessionId ? { sessionId } : {}),
    targetUrl
  };
}

async function resolveLiveStatus(
  status: CompanionStatus,
  requestedSessionId: string | undefined,
  targetUrl: string
): Promise<unknown> {
  if (!status.connected) {
    return status;
  }

  const client = createFetchCompanionClient({ baseUrl: targetUrl });
  const liveStatus = await client.requestStatus({
    ...(requestedSessionId ? { sessionId: requestedSessionId } : {})
  });

  return {
    ...status,
    current: {
      sessionId: liveStatus.sessionId,
      status: liveStatus.status
    }
  };
}

async function writeExport(document: DesignDocument, outputPath: string): Promise<void> {
  const resolvedPath = resolve(outputPath);

  await mkdir(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
}

async function readDocumentFromFile(inputPath: string): Promise<DesignDocument> {
  const resolvedPath = resolve(inputPath);
  const fileContents = await readFile(resolvedPath, "utf8");

  return designDocumentSchema.parse(JSON.parse(fileContents) as unknown);
}

function resolveDefaultScreenshotPath(inputPath: string | undefined): string {
  if (!inputPath) {
    return resolve("artifacts/manual/live-screenshot.svg");
  }

  const resolvedPath = resolve(inputPath);
  const parsedPath = parse(resolvedPath);

  return resolve(parsedPath.dir, `${parsedPath.name}.snapshot.svg`);
}

function createInitPayload(targetUrl: string): {
  companionUrl: string;
  manualFigmaSteps: string[];
  nextSteps: string[];
  pluginManifestPath: string;
  smokeTestCommand: string;
  version: string;
} {
  const pluginManifestPath = fileURLToPath(
    new URL("../../plugin/manifest.json", import.meta.url)
  );

  return {
    companionUrl: targetUrl,
    manualFigmaSteps: [
      "Import the plugin manifest into Figma desktop.",
      "Run the plugin and keep its window open while the companion is active.",
      "Use `vibe-figma status`, `capture`, or `export-json` from another terminal."
    ],
    nextSteps: [
      "Run `vibe-figma dev` to start the local companion.",
      "Run the plugin in Figma, then use `vibe-figma status` or `vibe-figma export-json`.",
      "Run `corepack pnpm test:e2e:figma` for the assisted smoke loop."
    ],
    pluginManifestPath,
    smokeTestCommand: "corepack pnpm test:e2e:figma",
    version: CLI_VERSION
  };
}

async function waitForever(): Promise<void> {
  await new Promise<void>(() => {
    // Keep the companion process alive until it receives a termination signal.
  });
}

async function runDevCommand(env: NodeJS.ProcessEnv): Promise<void> {
  const host =
    env.VIBE_FIGMA_COMPANION_HOST ??
    env.VIBE_FIGMA_BRIDGE_HOST ??
    DEFAULT_COMPANION_HOST;
  const port = parsePort(
    env.VIBE_FIGMA_COMPANION_PORT ?? env.VIBE_FIGMA_BRIDGE_PORT ?? env.PORT,
    DEFAULT_COMPANION_PORT
  );
  const server = await startCompanionHttpServer({
    host,
    port,
    version: CLI_VERSION
  });

  const shutdown = async (): Promise<void> => {
    await server.close();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });

  process.stderr.write(
    `vibe-figma companion listening on ${server.baseUrl} (v${CLI_VERSION}).\n`
  );

  await waitForever();
}

export async function runCli(
  argv: readonly string[],
  env: NodeJS.ProcessEnv = process.env
): Promise<void> {
  const options = parseGlobalOptions(argv, env);

  if (options.command === "help") {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  if (options.command === "init") {
    printJson(createInitPayload(options.targetUrl));
    return;
  }

  if (options.command === "dev") {
    await runDevCommand(env);
    return;
  }

  const client = createFetchCompanionClient({
    baseUrl: options.targetUrl
  });

  if (options.command === "doctor") {
    printJson(await client.getDoctor());
    return;
  }

  if (options.command === "logs") {
    const limitIndex = argv.findIndex(
      (argument) => argument === "--limit" || argument.startsWith("--limit=")
    );
    const limitValue =
      limitIndex === -1
        ? undefined
        : argv[limitIndex]?.startsWith("--limit=")
          ? argv[limitIndex]?.slice("--limit=".length)
          : argv[limitIndex + 1];
    const limit = parseIntegerOption("--limit", limitValue, 50);

    printJson(
      await client.getLogs({
        limit,
        ...(options.sessionId ? { sessionId: options.sessionId } : {})
      })
    );
    return;
  }

  if (options.command === "status") {
    const status = await client.getStatus();

    printJson(
      await resolveLiveStatus(status, options.sessionId, options.targetUrl)
    );
    return;
  }

  if (options.command === "capture") {
    const capture = await client.requestCapture({
      ...(options.sessionId ? { sessionId: options.sessionId } : {})
    });

    printJson({
      ...summarizeDocument(capture.document),
      capturedAt: capture.capturedAt,
      sessionId: capture.sessionId
    });
    return;
  }

  if (options.command === "export-json") {
    const capture = await client.requestCapture({
      ...(options.sessionId ? { sessionId: options.sessionId } : {})
    });

    if (options.outputPath) {
      await writeExport(capture.document, options.outputPath);
    }

    printJson(capture.document);
    return;
  }

  if (options.command === "screenshot") {
    const document = options.inputPath
      ? await readDocumentFromFile(options.inputPath)
      : (
          await client.requestCapture({
            ...(options.sessionId ? { sessionId: options.sessionId } : {})
          })
        ).document;
    const renderResult = renderDesignDocumentSnapshot(document);
    const outputPath = options.outputPath ?? resolveDefaultScreenshotPath(options.inputPath);

    await mkdir(dirname(resolve(outputPath)), { recursive: true });
    await writeFile(resolve(outputPath), `${renderResult.svg}\n`, "utf8");

    printJson({
      ...summarizeDocument(document),
      materializedInstanceCount: renderResult.stats.materializedInstanceCount,
      outputPath: resolve(outputPath),
      placeholderInstanceCount: renderResult.stats.fallbackInstanceCount,
      source: options.inputPath ? "file" : "live-capture",
      svgHeight: renderResult.height,
      svgWidth: renderResult.width
    });
    return;
  }

  throw new Error(`Unknown command: ${options.command}`);
}
