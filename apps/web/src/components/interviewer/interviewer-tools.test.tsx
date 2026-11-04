import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotesPanel } from './NotesPanel';
import { RubricScorecardPanel } from './RubricScorecardPanel';
import { SectionTimer } from './SectionTimer';
import { EndInterviewModal } from './EndInterviewModal';
import { apiClient } from '@/lib/api-client';

// Mock apiClient
vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

describe('Phase 4 Interviewer Tools Frontend Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('NotesPanel', () => {
    it('renders notes list and allows taking a private timestamped note', async () => {
      const mockNotes = [
        {
          id: 'note-1',
          interviewId: 'room-1',
          bodyMd: 'Candidate immediately understood binary search.',
          offsetMs: 125000,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      (apiClient as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url.includes('/notes')) {
          return Promise.resolve(mockNotes);
        }
        return Promise.resolve({});
      });

      render(<NotesPanel interviewId="room-1" elapsedSeconds={125} />);

      expect(screen.getByText('Private Notes')).toBeDefined();

      await waitFor(() => {
        expect(screen.getByText(/Candidate immediately understood binary search/)).toBeDefined();
        expect(screen.getAllByText('02:05').length).toBeGreaterThanOrEqual(1);
      });

      // Type note and click Add Note
      const textarea = screen.getByPlaceholderText(/Take a quick private note/i);
      fireEvent.change(textarea, { target: { value: 'Good edge case analysis.' } });

      const addBtn = screen.getByRole('button', { name: /Add Note/i });
      fireEvent.click(addBtn);

      expect(apiClient).toHaveBeenCalled();
    });
  });

  describe('RubricScorecardPanel', () => {
    it('renders rubric criteria, allows rating selection and scorecard saving', async () => {
      const mockRubric = {
        id: 'rubric-1',
        name: 'Core Software Engineering Rubric',
        criteria: [
          {
            id: 'crit-1',
            templateId: 'rubric-1',
            name: 'Problem Solving',
            description: 'Algorithmic decomposition',
            weight: 1.0,
            levelDescriptors: { '1': 'Poor', '4': 'Optimal' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      (apiClient as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url.includes('/rubric')) {
          return Promise.resolve(mockRubric);
        }
        if (url.includes('/scorecard')) {
          return Promise.resolve(null);
        }
        return Promise.resolve({});
      });

      render(<RubricScorecardPanel interviewId="room-1" />);

      await waitFor(() => {
        expect(screen.getByText('Core Software Engineering Rubric')).toBeDefined();
        expect(screen.getByText('Problem Solving')).toBeDefined();
      });

      // Rating button 4
      const rating4Btn = screen.getByRole('button', { name: '4' });
      fireEvent.click(rating4Btn);

      // Select Strong Hire
      const strongHireBtn = screen.getByRole('button', { name: 'Strong Hire' });
      fireEvent.click(strongHireBtn);

      // Save Scorecard
      const saveBtn = screen.getByRole('button', { name: /Save Scorecard/i });
      fireEvent.click(saveBtn);

      expect(apiClient).toHaveBeenCalled();
    });
  });

  describe('SectionTimer', () => {
    it('renders session duration and logs section transition marker', async () => {
      const onMarkerCreated = vi.fn();
      (apiClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'note-marker' });

      render(
        <SectionTimer
          interviewId="room-1"
          elapsedSeconds={420} // 7 minutes (inside Coding section)
          onMarkerCreated={onMarkerCreated}
        />,
      );

      expect(screen.getByText('07:00')).toBeDefined();
      expect(screen.getByText('Problem Solving & Coding')).toBeDefined();
      expect(screen.getByText('ACTIVE')).toBeDefined();

      // Click Mark section
      const markButtons = screen.getAllByRole('button', { name: /Mark/i });
      fireEvent.click(markButtons[0]!);

      await waitFor(() => {
        expect(apiClient).toHaveBeenCalled();
      });
    });
  });

  describe('EndInterviewModal', () => {
    it('renders confirmation dialog and triggers end endpoint', async () => {
      const onEnded = vi.fn();
      (apiClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'completed' });

      render(
        <EndInterviewModal
          isOpen={true}
          onOpenChange={vi.fn()}
          interviewId="room-1"
          onEnded={onEnded}
        />,
      );

      expect(screen.getByText('End Technical Interview?')).toBeDefined();

      const endBtn = screen.getByRole('button', { name: /End Interview Session/i });
      fireEvent.click(endBtn);

      await waitFor(() => {
        expect(apiClient).toHaveBeenCalledWith('/rooms/room-1/end', { method: 'POST' });
        expect(onEnded).toHaveBeenCalled();
      });
    });
  });
});
