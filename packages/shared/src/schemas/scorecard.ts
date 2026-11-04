import { z } from 'zod';
import { RECOMMENDATIONS, Recommendation } from '../constants.js';

export const ScorecardRatingSchema = z.object({
  criterionId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  justification: z.string().trim().max(5000).optional().nullable(),
});

export type ScorecardRatingInput = z.infer<typeof ScorecardRatingSchema>;

export const SubmitScorecardSchema = z.object({
  recommendation: z.enum(RECOMMENDATIONS),
  summaryText: z.string().trim().max(10000).optional().nullable(),
  ratings: z.array(ScorecardRatingSchema),
});

export type SubmitScorecardInput = z.infer<typeof SubmitScorecardSchema>;

export interface ScorecardRatingItem {
  id: string;
  scorecardId: string;
  criterionId: string;
  rating: number;
  justification: string | null;
  criterion?: {
    id: string;
    name: string;
    description: string;
    weight: number;
    levelDescriptors: Record<string, string>;
  };
}

export interface ScorecardItem {
  id: string;
  interviewId: string;
  recommendation: Recommendation;
  summaryText: string | null;
  submittedAt: string | null;
  ratings: ScorecardRatingItem[];
  createdAt: string;
  updatedAt: string;
}
