import { randomUUID } from "node:crypto";

import { designDocumentSchema } from "@vibe-figma/schema";

import type {
  CaptureBridgeClient,
  CaptureStore,
  StoredCapture
} from "./contracts.js";

export function createMemoryCaptureStore(): CaptureStore {
  let latestCapture: StoredCapture | null = null;

  return {
    async getLatest() {
      return latestCapture;
    },
    async save(document) {
      const parsedDocument = designDocumentSchema.parse(document);

      latestCapture = {
        document: parsedDocument,
        id: randomUUID(),
        receivedAt: new Date().toISOString()
      };

      return latestCapture;
    }
  };
}

export function createStoreBackedBridgeClient(
  store: CaptureStore
): CaptureBridgeClient {
  return {
    async getLatestCapture() {
      return store.getLatest();
    },
    async uploadCapture(document) {
      return store.save(document);
    }
  };
}
