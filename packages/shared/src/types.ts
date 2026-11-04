export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponseError {
  error: ApiErrorPayload;
}

export interface UserSummary {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface RoomSessionPayload {
  interviewId: string;
  role: 'interviewer' | 'candidate';
  userId?: string;
  displayName: string;
}
