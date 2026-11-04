import { z } from 'zod';
import { INTERVIEW_STATUSES } from '../constants.js';

export const CreateInterviewSchema = z.object({
  candidateName: z.string().trim().min(1, 'Candidate name is required').max(100),
  roleTitle: z.string().trim().max(100).optional(),
  rubricTemplateId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime().optional(),
  questionIds: z.array(z.string().uuid()).optional(),
});

export type CreateInterviewInput = z.infer<typeof CreateInterviewSchema>;

export const UpdateInterviewSchema = z.object({
  candidateName: z.string().trim().min(1).max(100).optional(),
  roleTitle: z.string().trim().max(100).optional(),
  status: z.enum(INTERVIEW_STATUSES).optional(),
  rubricTemplateId: z.string().uuid().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export type UpdateInterviewInput = z.infer<typeof UpdateInterviewSchema>;

export const InterviewFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(INTERVIEW_STATUSES).optional(),
  roleTitle: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['scheduledAt', 'startedAt', 'candidateName', 'status']).default('scheduledAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type InterviewFilterInput = z.infer<typeof InterviewFilterSchema>;
