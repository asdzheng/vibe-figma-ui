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

export interface CaptureStore {
  getLatest(): Promise<StoredCapture | null>;
  save(document: unknown): Promise<StoredCapture>;
}

export interface CaptureBridgeClient {
  getLatestCapture(): Promise<StoredCapture | null>;
  uploadCapture(document: unknown): Promise<StoredCapture>;
}
