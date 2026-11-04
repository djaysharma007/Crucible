'use client';

import * as React from 'react';
import { apiClient } from '@/lib/api-client';
import { SignalType } from '@crucible/shared';

interface UseTransparencySignalsProps {
  interviewId: string | null;
  enabled?: boolean;
}

export function useTransparencySignals({
  interviewId,
  enabled = true,
}: UseTransparencySignalsProps) {
  const lastSignalRef = React.useRef<{ type: string; timestamp: number }>({
    type: '',
    timestamp: 0,
  });

  const sendSignal = React.useCallback(
    async (type: SignalType, metadata: Record<string, unknown> = {}) => {
      if (!interviewId || !enabled) return;

      const now = Date.now();
      // Debounce duplicate events within 500ms
      if (
        lastSignalRef.current.type === type &&
        now - lastSignalRef.current.timestamp < 500
      ) {
        return;
      }
      lastSignalRef.current = { type, timestamp: now };

      try {
        await apiClient(`/rooms/${interviewId}/signals`, {
          method: 'POST',
          body: JSON.stringify({
            type,
            metadata,
          }),
        });
      } catch {
        // Suppress telemetry failures to not interrupt interview session
      }
    },
    [interviewId, enabled],
  );

  React.useEffect(() => {
    if (!enabled || !interviewId) return;

    // 1. Tab visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        sendSignal('tab_hidden');
      } else {
        sendSignal('tab_visible');
      }
    };

    // 2. Window focus and blur
    const handleWindowBlur = () => {
      sendSignal('window_blur');
    };

    const handleWindowFocus = () => {
      sendSignal('window_focus');
    };

    // 3. Large paste events (> 50 chars)
    const handlePaste = (e: ClipboardEvent) => {
      const pastedText = e.clipboardData?.getData('text/plain') ?? '';
      if (pastedText.length >= 50) {
        const lineCount = pastedText.split('\n').length;
        sendSignal('paste', {
          characterCount: pastedText.length,
          lineCount,
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('paste', handlePaste);
    };
  }, [enabled, interviewId, sendSignal]);

  return { sendSignal };
}

