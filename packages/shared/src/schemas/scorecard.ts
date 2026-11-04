import { z } from 'zod';
import { RECOMMENDATIONS } from '../constants.js';

export const ScorecardRatingSchema = z.object({
  criterionId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  justification: z.string().trim().max(5000).optional(),
});

export const SubmitScorecardSchema = z.object({
  recommendation: z.enum(RECOMMENDATIONS),
  summaryText: z.string().trim().max(10000).optional(),
  ratings: z.array(ScorecardRatingSchema),
});

export type SubmitScorecardInput = z.infer<typeof SubmitScorecardSchema>;
