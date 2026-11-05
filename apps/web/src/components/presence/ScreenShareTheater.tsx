'use client';

import * as React from 'react';
import { VideoTrack } from 'livekit-client';
import { MonitorUp, X, Maximize2, Minimize2 } from 'lucide-react';
import { Badge } from '@crucible/ui';

interface ScreenShareTheaterProps {
  participantName: string;
  isInterviewer: boolean;
  track: VideoTrack;
  onClose?: () => void;
}

export function ScreenShareTheater({
  participantName,
  isInterviewer,
  track,
  onClose,
}: ScreenShareTheaterProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = videoRef.current;
    if (track && el) {
      track.attach(el);
      return () => {
        track.detach(el);
      };
    }
    return undefined;
  }, [track]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-4 md:inset-12 z-50 bg-[#1E2019] border border-[#587B7F] rounded shadow-2xl flex flex-col overflow-hidden text-[#D3D0CB]"
    >
      {/* Header with clear on-screen indicator */}
      <div className="h-10 px-4 bg-[#1E2019] border-b border-[#393E41] flex items-center justify-between shrink-0 font-mono text-xs">
        <div className="flex items-center gap-2">
          <MonitorUp className="w-4 h-4 text-[#E2C044]" />
          <span className="font-semibold text-[#D3D0CB]">Screen Share:</span>
          <span className="text-[#E2C044] font-medium">{participantName}</span>
          <Badge variant={isInterviewer ? 'accent' : 'secondary'} className="text-[10px] py-0">
            {isInterviewer ? 'Interviewer' : 'Candidate'}
          </Badge>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1 hover:bg-[#393E41] rounded text-[#D3D0CB]/70 hover:text-[#D3D0CB] transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-[#393E41] rounded text-[#D3D0CB]/70 hover:text-rose-400 transition-colors"
              title="Close view"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Screen Share Video Track */}
      <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" />
      </div>
    </div>
  );
}
