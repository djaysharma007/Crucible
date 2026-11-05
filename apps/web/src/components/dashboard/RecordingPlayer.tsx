'use client';

import * as React from 'react';
import { AlertCircle, Film, Loader2, Play } from 'lucide-react';
import { Button } from '@crucible/ui';
import { assembleRecordingVideo, MissingChunkError } from '@/lib/recording/recording-playback';

interface RecordingPlayerProps {
  interviewId: string;
}

export function RecordingPlayer({ interviewId }: RecordingPlayerProps) {
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [progress, setProgress] = React.useState<{ loaded: number; total: number }>({
    loaded: 0,
    total: 0,
  });
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const loadRecording = React.useCallback(async () => {
    try {
      setStatus('loading');
      setErrorMessage(null);

      const result = await assembleRecordingVideo(interviewId, (loaded, total) => {
        setProgress({ loaded, total });
      });

      setObjectUrl(result.objectUrl);
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      if (err instanceof MissingChunkError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage((err as Error).message || 'Failed to load recording');
      }
    }
  }, [interviewId]);

  // Clean up object URL on unmount
  React.useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  return (
    <div className="p-4 bg-surface border border-border rounded-panel space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-accent" />
          <span className="text-xs font-semibold font-mono text-primary">
            Session Audio / Video Recording
          </span>
        </div>
        {status === 'ready' && (
          <span className="text-[11px] font-mono text-muted">
            {progress.total} continuous chunks assembled
          </span>
        )}
      </div>

      {status === 'idle' && (
        <div className="p-6 text-center space-y-3 bg-base border border-dashed border-border rounded">
          <p className="text-xs text-muted">
            Continuous browser-recorded WebM chunks are stored in Supabase Storage.
          </p>
          <Button size="sm" variant="outline" onClick={loadRecording} className="gap-2">
            <Play className="w-3.5 h-3.5 text-accent" />
            Assemble & Load Recording
          </Button>
        </div>
      )}

      {status === 'loading' && (
        <div className="p-6 text-center space-y-2 bg-base border border-border rounded font-mono text-xs text-muted">
          <div className="flex items-center justify-center gap-2 text-accent">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Fetching & Concatenating Recording Chunks...</span>
          </div>
          {progress.total > 0 && (
            <p className="text-[11px]">
              Downloaded {progress.loaded} of {progress.total} chunks
            </p>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="p-4 bg-rose-950/30 border border-rose-500/40 rounded flex items-start gap-3 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">Recording Playback Error</span>
            <p className="text-rose-200/80 leading-relaxed font-mono text-[11px]">
              {errorMessage}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={loadRecording}
              className="mt-2 text-xs border-rose-500/50 hover:bg-rose-950/40"
            >
              Retry Loading
            </Button>
          </div>
        </div>
      )}

      {status === 'ready' && objectUrl && (
        <div className="space-y-2">
          <video
            src={objectUrl}
            controls
            playsInline
            className="w-full rounded border border-border bg-black max-h-[460px]"
          />
          <p className="text-[11px] text-muted font-mono leading-relaxed">
            Note: Continuous WebM timeslice chunks are concatenated into a single playback Blob.
            Unprocessed real-time WebM streams lack an index table (Cues); seeking forward into
            unbuffered segments may be constrained by browser keyframe decoding.
          </p>
        </div>
      )}
    </div>
  );
}
