'use client';

import * as React from 'react';
import type { VideoTrack, AudioTrack } from 'livekit-client';
import { Mic, MicOff, MonitorUp } from 'lucide-react';
import { Badge } from '@crucible/ui';

interface VideoTileProps {
  name: string;
  isInterviewer: boolean;
  videoTrack: VideoTrack | null;
  audioTrack: AudioTrack | null;
  isMuted: boolean;
  isSpeaking: boolean;
  isLocal: boolean;
  isScreenSharing?: boolean;
}

export function VideoTile({
  name,
  isInterviewer,
  videoTrack,
  audioTrack,
  isMuted,
  isSpeaking,
  isLocal,
  isScreenSharing,
}: VideoTileProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Attach / Detach Video Track
  React.useEffect(() => {
    const videoEl = videoRef.current;
    if (videoTrack && videoEl) {
      videoTrack.attach(videoEl);
      return () => {
        videoTrack.detach(videoEl);
      };
    }
    return undefined;
  }, [videoTrack]);

  // Attach / Detach Audio Track for remote participants
  React.useEffect(() => {
    const audioEl = audioRef.current;
    if (audioTrack && audioEl && !isLocal) {
      audioTrack.attach(audioEl);
      return () => {
        audioTrack.detach(audioEl);
      };
    }
    return undefined;
  }, [audioTrack, isLocal]);

  return (
    <div
      className={`relative w-full h-28 bg-[#1E2019] rounded border transition-all overflow-hidden flex flex-col justify-end ${
        isSpeaking ? 'border-[#E2C044] ring-1 ring-[#E2C044]' : 'border-[#393E41]'
      }`}
    >
      {/* Remote Audio element (hidden) */}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}

      {/* Video Element or Avatar */}
      {videoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#393E41]/30 text-[#D3D0CB]/50">
          <div className="w-9 h-9 rounded-full bg-[#393E41] flex items-center justify-center text-xs font-semibold text-[#D3D0CB]">
            {name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Top Badges Overlay */}
      <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none z-10">
        <Badge variant={isInterviewer ? 'accent' : 'secondary'} className="text-[10px] px-1.5 py-0">
          {isInterviewer ? 'Interviewer' : 'Candidate'}
        </Badge>

        <div className="flex items-center gap-1">
          {isScreenSharing && (
            <span className="p-1 rounded bg-[#E2C044] text-[#1E2019] flex items-center gap-0.5 text-[9px] font-semibold">
              <MonitorUp className="w-2.5 h-2.5" />
              <span>Sharing</span>
            </span>
          )}

          <div
            className={`p-1 rounded ${
              isMuted ? 'bg-rose-950/80 text-rose-400' : 'bg-[#1E2019]/80 text-[#D3D0CB]'
            }`}
          >
            {isMuted ? <MicOff className="w-2.5 h-2.5" /> : <Mic className="w-2.5 h-2.5" />}
          </div>
        </div>
      </div>

      {/* Bottom Name Overlay */}
      <div className="relative z-10 bg-[#1E2019]/90 backdrop-blur-sm px-2 py-1 text-[11px] font-mono text-[#D3D0CB] flex items-center justify-between border-t border-[#393E41]/50">
        <span className="truncate max-w-[140px]">
          {name} {isLocal && '(You)'}
        </span>
        {isSpeaking && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
      </div>
    </div>
  );
}
