import { z } from 'zod';
import { SIGNAL_TYPES, SignalType } from '../constants.js';

export const CreateSignalSchema = z.object({
  type: z.enum(SIGNAL_TYPES),
  offsetMs: z.number().int().nonnegative().optional(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export type CreateSignalInput = z.infer<typeof CreateSignalSchema>;

export interface SignalItem {
  id: string;
  interviewId: string;
  type: SignalType;
  metadata: Record<string, unknown>;
  offsetMs: number;
  createdAt: string;
  updatedAt: string;
}

export interface RetentionCleanupResponse {
  deletedCount: number;
  retentionDays: number;
  cutoffDate: string;
}
