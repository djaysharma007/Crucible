import { NoteItem } from './notes.js';
import { ScorecardItem } from './scorecard.js';
import { Recommendation } from '../constants.js';

export interface InterviewStatsResponse {
  totalInterviews: number;
  completedInterviews: number;
  averageDurationMinutes: number;
  recommendationCounts: Record<Recommendation | 'pending', number>;
}

export interface CodeRunDetail {
  id: string;
  language: string;
  sourceSnapshot: string;
  results: unknown;
  requestedAt: string;
  durationMs: number;
}

export interface InterviewQuestionDetail {
  id: string;
  order: number;
  language: string;
  startedAt: string | null;
  question: {
    id: string;
    title: string;
    descriptionMd: string;
    difficulty: string;
    tags: string[];
    starterCode: string;
    testCasesCount: number;
  };
  codeRuns: CodeRunDetail[];
}

export interface WhiteboardSnapshotDetail {
  id: string;
  docType: string;
  snapshot: string;
  offsetMs: number;
  createdAt: string;
}

export interface InterviewDetailResponse {
  id: string;
  candidateName: string;
  roleTitle: string | null;
  status: string;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  createdAt: string;
  questions: InterviewQuestionDetail[];
  notes: NoteItem[];
  scorecard: ScorecardItem | null;
  whiteboardSnapshots: WhiteboardSnapshotDetail[];
}

export interface ReplayTimelineEvent {
  id: string;
  type: 'code_update' | 'code_run' | 'note_marker' | 'whiteboard_snapshot' | 'signal';
  offsetMs: number;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface ReplayTimelineResponse {
  interviewId: string;
  totalDurationMs: number;
  events: ReplayTimelineEvent[];
}

export interface CriteriaComparisonItem {
  criterionId: string;
  name: string;
  weight: number;
  ratingA: number | null;
  ratingB: number | null;
}

export interface CandidateComparisonResponse {
  interviewA: InterviewDetailResponse;
  interviewB: InterviewDetailResponse;
  criteria: CriteriaComparisonItem[];
}

