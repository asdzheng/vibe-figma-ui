import { randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  writeFile
} from "node:fs/promises";
import { dirname } from "node:path";

import { designDocumentSchema } from "@vibe-figma/schema";
import { z } from "zod";

import {
  DEFAULT_BRIDGE_MAX_STORED_CAPTURES,
  DEFAULT_BRIDGE_STORAGE_PATH
} from "./constants.js";
import type {
  CaptureBridgeClient,
  CaptureHistoryEntry,
  CaptureListOptions,
  CaptureStore,
  StoredCapture
} from "./contracts.js";
import { storedCaptureSchema } from "./contracts.js";

type MemoryCaptureStoreOptions = {
  maxEntries?: number;
};

export type FileCaptureStoreOptions = MemoryCaptureStoreOptions & {
  filePath?: string;
};

const captureStoreFileSchema = z
  .object({
    captures: z.array(storedCaptureSchema),
    version: z.literal(1)
  })
  .strict();

function createStoredCapture(document: unknown): StoredCapture {
  const parsedDocument = designDocumentSchema.parse(document);

  return {
    document: parsedDocument,
    id: randomUUID(),
    receivedAt: new Date().toISOString()
  };
}

function createHistoryEntry(capture: StoredCapture): CaptureHistoryEntry {
  return {
    id: capture.id,
    receivedAt: capture.receivedAt,
    rootCount: capture.document.roots.length,
    schemaVersion: capture.document.schemaVersion,
    selectionCount: capture.document.capture.selection.length,
    warningCount: capture.document.diagnostics.warnings.length
  };
}

function normalizeMaxEntries(value: number | undefined): number {
  const maxEntries = value ?? DEFAULT_BRIDGE_MAX_STORED_CAPTURES;

  if (!Number.isInteger(maxEntries) || maxEntries <= 0) {
    throw new Error(`Invalid capture history size: ${String(value)}`);
  }

  return maxEntries;
}

function normalizeListLimit(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid capture list limit: ${String(value)}`);
  }

  return value;
}

function listCaptureHistory(
  captures: readonly StoredCapture[],
  options: CaptureListOptions = {}
): CaptureHistoryEntry[] {
  const limit = normalizeListLimit(options.limit);
  const history = captures.map(createHistoryEntry);

  return limit === undefined ? history : history.slice(0, limit);
}

async function persistCaptureFile(
  filePath: string,
  captures: readonly StoredCapture[]
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });

  const payload = JSON.stringify(
    {
      captures,
      version: 1 as const
    },
    null,
    2
  );
  const temporaryFilePath = `${filePath}.tmp`;

  await writeFile(temporaryFilePath, `${payload}\n`, "utf8");
  await rename(temporaryFilePath, filePath);
}

async function loadCaptureFile(filePath: string): Promise<StoredCapture[]> {
  try {
    const rawFile = await readFile(filePath, "utf8");
    const parsedFile = captureStoreFileSchema.parse(
      JSON.parse(rawFile) as unknown
    );

    return parsedFile.captures;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }
}

function createHistoryCapableStore(options: {
  initialCaptures?: StoredCapture[];
  maxEntries?: number;
  persist?: ((captures: readonly StoredCapture[]) => Promise<void>) | undefined;
  read?: (() => Promise<StoredCapture[]>) | undefined;
}): CaptureStore {
  const maxEntries = normalizeMaxEntries(options.maxEntries);
  let captures = [...(options.initialCaptures ?? [])];
  let initialized = options.read === undefined;
  let initializePromise: Promise<void> | null = null;
  let writeQueue = Promise.resolve();

  async function ensureLoaded(): Promise<void> {
    if (initialized) {
      return;
    }

    if (!initializePromise) {
      initializePromise = (async () => {
        captures = await options.read?.() ?? [];
        initialized = true;
      })();
    }

    await initializePromise;
  }

  async function enqueueWrite(
    storedCapture: StoredCapture
  ): Promise<StoredCapture> {
    const pendingWrite = writeQueue.catch(() => undefined).then(async () => {
      await ensureLoaded();
      const nextCaptures = [storedCapture, ...captures].slice(0, maxEntries);

      await options.persist?.(nextCaptures);
      captures = nextCaptures;
    });
    writeQueue = pendingWrite;

    await pendingWrite;

    return storedCapture;
  }

  return {
    async getById(captureId) {
      await ensureLoaded();

      return captures.find((capture) => capture.id === captureId) ?? null;
    },
    async getLatest() {
      await ensureLoaded();

      return captures[0] ?? null;
    },
    async list(listOptions = {}) {
      await ensureLoaded();

      return listCaptureHistory(captures, listOptions);
    },
    async save(document) {
      return enqueueWrite(createStoredCapture(document));
    }
  };
}

export function createMemoryCaptureStore(
  options: MemoryCaptureStoreOptions = {}
): CaptureStore {
  return createHistoryCapableStore({
    ...(options.maxEntries !== undefined ? { maxEntries: options.maxEntries } : {})
  });
}

export function createFileCaptureStore(
  options: FileCaptureStoreOptions = {}
): CaptureStore {
  const filePath = options.filePath ?? DEFAULT_BRIDGE_STORAGE_PATH;

  return createHistoryCapableStore({
    ...(options.maxEntries !== undefined ? { maxEntries: options.maxEntries } : {}),
    persist: async (captures) => persistCaptureFile(filePath, captures),
    read: async () => loadCaptureFile(filePath)
  });
}

export function createStoreBackedBridgeClient(
  store: CaptureStore
): CaptureBridgeClient {
  return {
    async getCaptureById(captureId) {
      return store.getById(captureId);
    },
    async getLatestCapture() {
      return store.getLatest();
    },
    async listCaptures(options = {}) {
      return store.list(options);
    },
    async uploadCapture(document) {
      return store.save(document);
    }
  };
}
