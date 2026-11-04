import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '../constants.js';

export const RunCodeSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES),
  sourceCode: z.string().max(65536, 'Source code exceeds maximum allowed size (64KB)'),
});

export type RunCodeInput = z.infer<typeof RunCodeSchema>;

export const RunCustomSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES),
  sourceCode: z.string().max(65536, 'Source code exceeds maximum allowed size (64KB)'),
  stdin: z.string().max(16384, 'Standard input exceeds maximum allowed size (16KB)'),
});

export type RunCustomInput = z.infer<typeof RunCustomSchema>;
