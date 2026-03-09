import { z } from "zod";

import { designDocumentSchema } from "@vibe-figma/schema";

export const storedCaptureSchema = z
  .object({
    document: designDocumentSchema,
    id: z.string().min(1),
    receivedAt: z.string().datetime()
  })
  .strict();

export type StoredCapture = z.infer<typeof storedCaptureSchema>;

export const captureHistoryEntrySchema = z
  .object({
    id: z.string().min(1),
    receivedAt: z.string().datetime(),
    rootCount: z.number().int().nonnegative(),
    schemaVersion: z.string().min(1),
    selectionCount: z.number().int().nonnegative(),
    warningCount: z.number().int().nonnegative()
  })
  .strict();

export const captureHistorySchema = z.array(captureHistoryEntrySchema);

export type CaptureHistoryEntry = z.infer<typeof captureHistoryEntrySchema>;

export type CaptureListOptions = {
  limit?: number;
};

export interface CaptureStore {
  getById(captureId: string): Promise<StoredCapture | null>;
  getLatest(): Promise<StoredCapture | null>;
  list(options?: CaptureListOptions): Promise<CaptureHistoryEntry[]>;
  save(document: unknown): Promise<StoredCapture>;
}

export interface CaptureBridgeClient {
  getCaptureById(captureId: string): Promise<StoredCapture | null>;
  getLatestCapture(): Promise<StoredCapture | null>;
  listCaptures(options?: CaptureListOptions): Promise<CaptureHistoryEntry[]>;
  uploadCapture(document: unknown): Promise<StoredCapture>;
}
