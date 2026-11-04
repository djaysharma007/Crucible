import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AggregateStatsCards } from './AggregateStatsCards';
import { CandidateComparisonModal } from './CandidateComparisonModal';
import { TimelineScrubber } from '@/components/replay/TimelineScrubber';
import { apiClient } from '@/lib/api-client';
import {
  InterviewStatsResponse,
  CandidateComparisonResponse,
  ReplayTimelineEvent,
  InterviewDetailResponse,
} from '@crucible/shared';

// Mock apiClient
vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

describe('Phase 5 Dashboard & Replay Frontend Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AggregateStatsCards', () => {
    it('fetches and renders aggregate interview metrics correctly', async () => {
      const mockStats: InterviewStatsResponse = {
        totalInterviews: 24,
        completedInterviews: 18,
        averageDurationMinutes: 52,
        recommendationCounts: {
          strong_hire: 6,
          hire: 8,
          no_hire: 3,
          strong_no_hire: 1,
          pending: 0,
        },
      };

      (apiClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockStats);

      render(<AggregateStatsCards />);

      await waitFor(() => {
        expect(screen.getByText('Total Interviews')).toBeDefined();
        expect(screen.getByText('24')).toBeDefined();
        expect(screen.getByText('Completed Sessions')).toBeDefined();
        expect(screen.getByText('18')).toBeDefined();
        expect(screen.getByText('Average Duration')).toBeDefined();
        expect(screen.getByText('52')).toBeDefined();
        // Positive recommendations: 6 + 8 = 14
        expect(screen.getByText('+14')).toBeDefined();
        // Negative recommendations: -3 (no_hire)
        expect(screen.getByText('-3')).toBeDefined();
      });
    });
  });

  describe('TimelineScrubber', () => {
    const mockEvents: ReplayTimelineEvent[] = [
      {
        id: 'evt-1',
        type: 'note_marker',
        offsetMs: 30000,
        timestamp: new Date().toISOString(),
        metadata: {
          bodyMd: 'Candidate explained time complexity',
        },
      },
      {
        id: 'evt-2',
        type: 'code_run',
        offsetMs: 120000,
        timestamp: new Date().toISOString(),
        metadata: {
          language: 'python',
          status: 'success',
        },
      },
    ];

    it('renders timeline duration and responds to play/pause toggle', () => {
      const onTogglePlay = vi.fn();
      const onSeek = vi.fn();
      const onSpeedChange = vi.fn();

      render(
        <TimelineScrubber
          totalDurationMs={300000} // 5 mins
          currentOffsetMs={60000} // 1 min
          onSeek={onSeek}
          isPlaying={false}
          onTogglePlay={onTogglePlay}
          playbackSpeed={1}
          onSpeedChange={onSpeedChange}
          events={mockEvents}
        />,
      );

      // Verify formatted time display (01:00 / 05:00)
      expect(screen.getByText('01:00')).toBeDefined();
      expect(screen.getByText('05:00')).toBeDefined();

      // Click Play button
      const playButton = screen.getByTitle('Play Replay');
      fireEvent.click(playButton);
      expect(onTogglePlay).toHaveBeenCalledTimes(1);

      // Verify speed button click
      const speed2xButton = screen.getByRole('button', { name: '2x' });
      fireEvent.click(speed2xButton);
      expect(onSpeedChange).toHaveBeenCalledWith(2);

      // Verify seek slider interaction
      const slider = screen.getByLabelText('Replay timeline scrubber');
      fireEvent.change(slider, { target: { value: '150000' } });
      expect(onSeek).toHaveBeenCalledWith(150000);
    });

    it('displays event markers with tooltips and seeks to event on click', () => {
      const onSeek = vi.fn();

      render(
        <TimelineScrubber
          totalDurationMs={300000}
          currentOffsetMs={0}
          onSeek={onSeek}
          isPlaying={false}
          onTogglePlay={vi.fn()}
          playbackSpeed={1}
          onSpeedChange={vi.fn()}
          events={mockEvents}
        />,
      );

      // Verify event marker exists and clicking seeks to offset
      const noteMarker = screen.getByTitle(/Candidate explained time complexity/i);
      expect(noteMarker).toBeDefined();
      fireEvent.click(noteMarker);
      expect(onSeek).toHaveBeenCalledWith(30000);
    });
  });

  describe('CandidateComparisonModal', () => {
    it('fetches comparison data and displays rubric scores and recommendations side by side', async () => {
      const interviewA: InterviewDetailResponse = {
        id: 'int-1',
        candidateName: 'Alice Chen',
        roleTitle: 'Staff Backend Engineer',
        status: 'completed',
        scheduledAt: null,
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds: 3300,
        createdAt: new Date().toISOString(),
        questions: [],
        notes: [],
        scorecard: {
          id: 'sc-1',
          interviewId: 'int-1',
          recommendation: 'strong_hire',
          summaryText: 'Exceptional system architecture understanding and fast code execution.',
          submittedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ratings: [
            { id: 'r-1', scorecardId: 'sc-1', criterionId: 'crit-1', rating: 4, justification: 'Flawless optimal algorithm' },
          ],
        },
        whiteboardSnapshots: [],
      };

      const interviewB: InterviewDetailResponse = {
        id: 'int-2',
        candidateName: 'Bob Vance',
        roleTitle: 'Senior Backend Engineer',
        status: 'completed',
        scheduledAt: null,
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds: 2700,
        createdAt: new Date().toISOString(),
        questions: [],
        notes: [],
        scorecard: {
          id: 'sc-2',
          interviewId: 'int-2',
          recommendation: 'no_hire',
          summaryText: 'Struggled with concurrency edge cases.',
          submittedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ratings: [
            { id: 'r-2', scorecardId: 'sc-2', criterionId: 'crit-1', rating: 2, justification: 'Brute force without optimization' },
          ],
        },
        whiteboardSnapshots: [],
      };

      const mockComparison: CandidateComparisonResponse = {
        interviewA,
        interviewB,
        criteria: [
          {
            criterionId: 'crit-1',
            name: 'Problem Solving',
            weight: 1,
            ratingA: 4,
            ratingB: 2,
          },
        ],
      };

      (apiClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockComparison);

      render(
        <CandidateComparisonModal
          id1="int-1"
          id2="int-2"
          isOpen={true}
          onOpenChange={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getAllByText('Alice Chen').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Bob Vance').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Problem Solving')).toBeDefined();
        expect(screen.getByText('Strong Hire')).toBeDefined();
        expect(screen.getByText('No Hire')).toBeDefined();
        expect(
          screen.getByText(/Exceptional system architecture understanding/i),
        ).toBeDefined();
      });
    });
  });
});
