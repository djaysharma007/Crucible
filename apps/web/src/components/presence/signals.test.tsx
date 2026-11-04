import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, renderHook, act } from '@testing-library/react';
import { DeviceCheck } from './DeviceCheck';
import { useTransparencySignals } from '@/hooks/useTransparencySignals';
import { TimelineScrubber } from '@/components/replay/TimelineScrubber';
import { apiClient } from '@/lib/api-client';
import { ReplayTimelineEvent } from '@crucible/shared';

// Mock apiClient
vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

describe('Phase 6 Signals and Hardening Frontend Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DeviceCheck Transparency Disclosure', () => {
    it('renders the transparency and integrity disclosure notice', () => {
      render(<DeviceCheck />);

      expect(screen.getByText('Transparency Disclosure')).toBeDefined();
      expect(
        screen.getByText(/To support technical integrity, tab focus, window visibility/i),
      ).toBeDefined();
      expect(screen.getByText(/All interview data is retained for 90 days/i)).toBeDefined();
    });
  });

  describe('useTransparencySignals Hook', () => {
    it('dispatches paste signals on large clipboard paste events', () => {
      (apiClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      renderHook(() =>
        useTransparencySignals({
          interviewId: 'room-test-123',
          enabled: true,
        }),
      );

      // Create a paste event with 80 characters
      const sampleText = 'function binarySearch(arr, target) {\n  let left = 0;\n  let right = arr.length - 1;\n}';
      const pasteEvent = new Event('paste') as ClipboardEvent;
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: () => sampleText,
        },
      });

      act(() => {
        document.dispatchEvent(pasteEvent);
      });

      expect(apiClient).toHaveBeenCalledWith(
        '/rooms/room-test-123/signals',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            type: 'paste',
            metadata: {
              characterCount: sampleText.length,
              lineCount: 4,
            },
          }),
        }),
      );
    });

    it('dispatches window blur and focus signals', () => {
      (apiClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      renderHook(() =>
        useTransparencySignals({
          interviewId: 'room-test-123',
          enabled: true,
        }),
      );

      act(() => {
        window.dispatchEvent(new Event('blur'));
      });

      expect(apiClient).toHaveBeenCalledWith(
        '/rooms/room-test-123/signals',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            type: 'window_blur',
            metadata: {},
          }),
        }),
      );
    });
  });

  describe('TimelineScrubber Signal Markers', () => {
    it('renders transparency signal pins on the scrubber track', () => {
      const mockEvents: ReplayTimelineEvent[] = [
        {
          id: 'sig-1',
          type: 'signal',
          offsetMs: 45000,
          timestamp: new Date().toISOString(),
          metadata: {
            signalType: 'paste',
            data: { characterCount: 120 },
          },
        },
        {
          id: 'sig-2',
          type: 'signal',
          offsetMs: 90000,
          timestamp: new Date().toISOString(),
          metadata: {
            signalType: 'tab_hidden',
          },
        },
      ];

      render(
        <TimelineScrubber
          totalDurationMs={300000}
          currentOffsetMs={0}
          onSeek={vi.fn()}
          isPlaying={false}
          onTogglePlay={vi.fn()}
          playbackSpeed={1}
          onSpeedChange={vi.fn()}
          events={mockEvents}
        />,
      );

      expect(screen.getByTitle(/Signal @ 00:45: Paste Event/i)).toBeDefined();
      expect(screen.getByTitle(/Signal @ 01:30: Tab Hidden/i)).toBeDefined();
    });
  });
});
