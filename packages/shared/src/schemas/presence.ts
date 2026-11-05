import { z } from 'zod';

export const RecordingConsentSchema = z.object({
  consented: z.boolean(),
});

export type RecordingConsentInput = z.infer<typeof RecordingConsentSchema>;

export const ScreenShareRequestSchema = z.object({
  target: z.enum(['candidate', 'interviewer']),
  message: z.string().max(200).optional(),
});

export type ScreenShareRequestInput = z.infer<typeof ScreenShareRequestSchema>;

export interface LiveKitTokenResponse {
  token: string;
  wsUrl: string;
  roomName: string;
  participantIdentity: string;
  participantName: string;
  isInterviewer: boolean;
}

export interface RecordingStatusResponse {
  isRecording: boolean;
  startedAt: string | null;
  interviewerConsented: boolean;
  candidateConsented: boolean;
  egressId: string | null;
}
