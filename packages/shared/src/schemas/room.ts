import { z } from 'zod';

export const JoinRoomSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  displayName: z.string().trim().min(1, 'Display name is required').max(100),
});

export type JoinRoomInput = z.infer<typeof JoinRoomSchema>;

export const AdmitCandidateSchema = z.object({
  candidateSessionId: z.string().min(1, 'Candidate session ID is required'),
});

export type AdmitCandidateInput = z.infer<typeof AdmitCandidateSchema>;
