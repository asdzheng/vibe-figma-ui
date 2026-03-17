import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const DEFAULT_COMPANION_BASE_URL = "http://localhost:3845";
export const DEFAULT_TIMEOUT_MS = 120_000;
export const DEFAULT_POLL_MS = 1_000;
export const DEFAULT_MIN_ROOTS = 1;
export const DEFAULT_MIN_SELECTION_COUNT = 1;
export const DEFAULT_MAX_DIAGNOSTICS = 0;
export const DEFAULT_REPORT_PATH = "artifacts/e2e/figma-smoke-report.json";

function normalizeCompanionBaseUrl(baseUrl) {
  return baseUrl.replace(/\/$/, "");
}

function parseOptionValue(name, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`Expected a value after ${name}.`);
  }

  return value;
}

function parseIntegerOption(name, value, minimum) {
  const parsed = Number.parseInt(parseOptionValue(name, value), 10);

  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(`Expected ${name} to be an integer >= ${minimum}.`);
  }

  return parsed;
}

export function parseFigmaE2eArgs(argv) {
  let companionBaseUrl = DEFAULT_COMPANION_BASE_URL;
  let expectPageName;
  let maxDiagnostics = DEFAULT_MAX_DIAGNOSTICS;
  let minRoots = DEFAULT_MIN_ROOTS;
  let minSelectionCount = DEFAULT_MIN_SELECTION_COUNT;
  let pollMs = DEFAULT_POLL_MS;
  let reportPath = DEFAULT_REPORT_PATH;
  let timeoutMs = DEFAULT_TIMEOUT_MS;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--") {
      continue;
    }

    if (argument === "--bridge-url" || argument.startsWith("--bridge-url=")) {
      throw new Error(
        "`--bridge-url` has been removed. Use `--companion-url` instead."
      );
    }

    if (argument === "--companion-url") {
      companionBaseUrl = normalizeCompanionBaseUrl(
        parseOptionValue(argument, argv[index + 1])
      );
      index += 1;
      continue;
    }

    if (argument.startsWith("--companion-url=")) {
      companionBaseUrl = normalizeCompanionBaseUrl(
        parseOptionValue(
          "--companion-url",
          argument.slice("--companion-url=".length)
        )
      );
      continue;
    }

    if (argument === "--expect-page-name") {
      expectPageName = parseOptionValue(argument, argv[index + 1]);
      index += 1;
      continue;
    }

    if (argument.startsWith("--expect-page-name=")) {
      expectPageName = parseOptionValue(
        "--expect-page-name",
        argument.slice("--expect-page-name=".length)
      );
      continue;
    }

    if (argument === "--max-diagnostics") {
      maxDiagnostics = parseIntegerOption(argument, argv[index + 1], 0);
      index += 1;
      continue;
    }

    if (argument.startsWith("--max-diagnostics=")) {
      maxDiagnostics = parseIntegerOption(
        "--max-diagnostics",
        argument.slice("--max-diagnostics=".length),
        0
      );
      continue;
    }

    if (argument === "--min-roots") {
      minRoots = parseIntegerOption(argument, argv[index + 1], 1);
      index += 1;
      continue;
    }

    if (argument.startsWith("--min-roots=")) {
      minRoots = parseIntegerOption(
        "--min-roots",
        argument.slice("--min-roots=".length),
        1
      );
      continue;
    }

    if (argument === "--min-selection") {
      minSelectionCount = parseIntegerOption(argument, argv[index + 1], 1);
      index += 1;
      continue;
    }

    if (argument.startsWith("--min-selection=")) {
      minSelectionCount = parseIntegerOption(
        "--min-selection",
        argument.slice("--min-selection=".length),
        1
      );
      continue;
    }

    if (argument === "--poll-ms") {
      pollMs = parseIntegerOption(argument, argv[index + 1], 100);
      index += 1;
      continue;
    }

    if (argument.startsWith("--poll-ms=")) {
      pollMs = parseIntegerOption(
        "--poll-ms",
        argument.slice("--poll-ms=".length),
        100
      );
      continue;
    }

    if (argument === "--report-file") {
      reportPath = parseOptionValue(argument, argv[index + 1]);
      index += 1;
      continue;
    }

    if (argument.startsWith("--report-file=")) {
      reportPath = parseOptionValue(
        "--report-file",
        argument.slice("--report-file=".length)
      );
      continue;
    }

    if (argument === "--timeout-ms") {
      timeoutMs = parseIntegerOption(argument, argv[index + 1], 1_000);
      index += 1;
      continue;
    }

    if (argument.startsWith("--timeout-ms=")) {
      timeoutMs = parseIntegerOption(
        "--timeout-ms",
        argument.slice("--timeout-ms=".length),
        1_000
      );
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return {
    companionBaseUrl,
    ...(expectPageName ? { expectPageName } : {}),
    maxDiagnostics,
    minRoots,
    minSelectionCount,
    pollMs,
    reportPath,
    timeoutMs
  };
}

function isRecord(value) {
  return typeof value === "object" && value !== null;
}

function extractStatusPluginVersion(status) {
  if (!isRecord(status)) {
    return "";
  }

  const current = isRecord(status.current) ? status.current : {};
  const currentStatus = isRecord(current.status) ? current.status : {};

  if (typeof currentStatus.pluginVersion === "string") {
    return currentStatus.pluginVersion;
  }

  const sessions = Array.isArray(status.sessions) ? status.sessions : [];
  const activeSession = sessions.find(
    (session) => isRecord(session) && session.isActive === true
  );

  if (isRecord(activeSession) && typeof activeSession.pluginVersion === "string") {
    return activeSession.pluginVersion;
  }

  return "";
}

function extractStatusPageName(status) {
  if (!isRecord(status)) {
    return "";
  }

  const current = isRecord(status.current) ? status.current : {};
  const currentStatus = isRecord(current.status) ? current.status : {};
  const page = isRecord(currentStatus.page) ? currentStatus.page : {};

  if (typeof page.name === "string") {
    return page.name;
  }

  return "";
}

function extractStatusSelectionCount(status) {
  if (!isRecord(status)) {
    return 0;
  }

  const current = isRecord(status.current) ? status.current : {};
  const currentStatus = isRecord(current.status) ? current.status : {};

  return typeof currentStatus.selectionCount === "number"
    ? currentStatus.selectionCount
    : 0;
}

function summarizeCapture(document, context = {}) {
  const capture = isRecord(document.capture) ? document.capture : {};
  const diagnostics = isRecord(document.diagnostics) ? document.diagnostics : {};
  const warnings = Array.isArray(diagnostics.warnings) ? diagnostics.warnings : [];
  const roots = Array.isArray(document.roots) ? document.roots : [];
  const selection = Array.isArray(capture.selection)
    ? capture.selection
    : Array.isArray(capture.roots)
      ? capture.roots
      : [];
  const pageName =
    typeof capture.page === "string"
      ? capture.page
      : isRecord(capture.page) && typeof capture.page.name === "string"
        ? capture.page.name
        : extractStatusPageName(context.status);
  const pluginVersion =
    typeof capture.pluginVersion === "string" && capture.pluginVersion
      ? capture.pluginVersion
      : extractStatusPluginVersion(context.status);
  const selectionCount =
    selection.length > 0 ? selection.length : extractStatusSelectionCount(context.status);

  return {
    diagnosticsCount: warnings.length,
    pageName,
    pluginVersion,
    rootCount: roots.length,
    schemaVersion:
      typeof document.schemaVersion === "string" ? document.schemaVersion : "",
    selectionCount
  };
}

export function validateSmokeCapture(document, options, context = {}) {
  const errors = [];

  if (!isRecord(document)) {
    return {
      errors: ["Captured document is not an object."],
      ok: false,
      summary: summarizeCapture({}, context)
    };
  }

  const summary = summarizeCapture(document, context);

  if (!summary.schemaVersion) {
    errors.push("Design document is missing schemaVersion.");
  }

  if (!summary.pluginVersion) {
    errors.push("Design document is missing capture.pluginVersion.");
  }

  if (summary.rootCount < options.minRoots) {
    errors.push(
      `Expected at least ${options.minRoots} root node(s), received ${summary.rootCount}.`
    );
  }

  if (summary.selectionCount < options.minSelectionCount) {
    errors.push(
      `Expected selectionCount >= ${options.minSelectionCount}, received ${summary.selectionCount}.`
    );
  }

  if (summary.diagnosticsCount > options.maxDiagnostics) {
    errors.push(
      `Expected diagnosticsCount <= ${options.maxDiagnostics}, received ${summary.diagnosticsCount}.`
    );
  }

  if (options.expectPageName && summary.pageName !== options.expectPageName) {
    errors.push(
      `Expected page name "${options.expectPageName}", received "${summary.pageName}".`
    );
  }

  return {
    errors,
    ok: errors.length === 0,
    summary
  };
}

async function fetchCompanionHealth(fetchImpl, companionBaseUrl) {
  const response = await fetchImpl(`${companionBaseUrl}/health`);

  if (!response.ok) {
    throw new Error(`Companion health check failed with ${response.status}.`);
  }

  return response.json();
}

async function fetchCompanionStatus(fetchImpl, companionBaseUrl) {
  const response = await fetchImpl(`${companionBaseUrl}/status`);

  if (!response.ok) {
    throw new Error(`Companion status request failed with ${response.status}.`);
  }

  return response.json();
}

async function requestCapture(fetchImpl, companionBaseUrl) {
  const response = await fetchImpl(`${companionBaseUrl}/commands/capture`, {
    body: JSON.stringify({}),
    headers: {
      "content-type": "application/json"
    },
    method: "POST"
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `Companion capture request failed with ${response.status}.`;
    throw new Error(message);
  }

  return payload;
}

export async function waitForConnectedSession({
  getStatus,
  now = () => Date.now(),
  pollMs,
  sleep = (delayMs) =>
    new Promise((resolve) => {
      globalThis.setTimeout(resolve, delayMs);
    }),
  timeoutMs
}) {
  const startTime = now();

  while (now() - startTime < timeoutMs) {
    const status = await getStatus();

    if (status && typeof status === "object" && status.connected === true) {
      return status;
    }

    await sleep(pollMs);
  }

  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for an active vibe-figma plugin session. Start the companion, run the plugin in Figma desktop, and keep the plugin window open until the smoke report is written.`
  );
}

async function writeReport(reportPath, report) {
  const resolvedPath = resolve(reportPath);

  await mkdir(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  return resolvedPath;
}

export async function runFigmaSmokeTest(options, dependencies = {}) {
  const fetchImpl = dependencies.fetchImpl ?? globalThis.fetch;
  const now = dependencies.now ?? (() => Date.now());
  const sleep =
    dependencies.sleep ??
    ((delayMs) =>
      new Promise((resolve) => {
        globalThis.setTimeout(resolve, delayMs);
      }));

  await fetchCompanionHealth(fetchImpl, options.companionBaseUrl);

  process.stderr.write(
    `Companion reachable at ${options.companionBaseUrl}. Waiting for a live plugin session.\n`
  );
  process.stderr.write(
    "If the plugin is not already open in Figma desktop, run it now and keep the plugin window open.\n"
  );

  const status = await waitForConnectedSession({
    getStatus: async () =>
      fetchCompanionStatus(fetchImpl, options.companionBaseUrl),
    now,
    pollMs: options.pollMs,
    sleep,
    timeoutMs: options.timeoutMs
  });

  process.stderr.write("Plugin session detected. Requesting a live capture.\n");

  const captureResponse = await requestCapture(fetchImpl, options.companionBaseUrl);
  const document = isRecord(captureResponse) ? captureResponse.document : null;
  const validation = validateSmokeCapture(document, options, { status });
  const report = {
    capturedAt:
      isRecord(captureResponse) && typeof captureResponse.capturedAt === "string"
        ? captureResponse.capturedAt
        : "",
    companionBaseUrl: options.companionBaseUrl,
    errors: validation.errors,
    ok: validation.ok,
    sessionId:
      isRecord(captureResponse) && typeof captureResponse.sessionId === "string"
        ? captureResponse.sessionId
        : "",
    status,
    summary: validation.summary
  };
  const reportPath = await writeReport(options.reportPath, report);

  if (!validation.ok) {
    throw new Error(
      `Figma smoke assertions failed. See ${reportPath} for details.`
    );
  }

  process.stderr.write(`Smoke report written to ${reportPath}\n`);

  return report;
}

async function main() {
  const options = parseFigmaE2eArgs(process.argv.slice(2));

  await runFigmaSmokeTest(options);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((error) => {
    const message =
      error instanceof Error ? error.message : "Unknown Figma smoke error.";

    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
