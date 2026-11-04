'use client';

import * as React from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  MonitorUp,
  MonitorOff,
  Share2,
  Loader2,
} from 'lucide-react';

interface MediaControlsProps {
  isCameraEnabled: boolean;
  isMicEnabled: boolean;
  isScreenSharing: boolean;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onToggleScreenShare: () => void;
  isInterviewer: boolean;
  onRequestCandidateScreenShare?: () => void;
  isRequestingScreen?: boolean;
}

export function MediaControls({
  isCameraEnabled,
  isMicEnabled,
  isScreenSharing,
  onToggleCamera,
  onToggleMic,
  onToggleScreenShare,
  isInterviewer,
  onRequestCandidateScreenShare,
  isRequestingScreen = false,
}: MediaControlsProps) {
  return (
    <div className="flex items-center justify-between p-2 bg-[#1E2019] border border-[#393E41] rounded text-xs text-[#D3D0CB]">
      <div className="flex items-center gap-1.5">
        {/* Mic Toggle */}
        <button
          type="button"
          onClick={onToggleMic}
          className={`p-2 rounded border transition-colors ${
            isMicEnabled
              ? 'bg-[#393E41] border-[#587B7F] text-[#D3D0CB] hover:bg-[#393E41]/80'
              : 'bg-rose-950/60 border-rose-600/40 text-rose-400 hover:bg-rose-950'
          }`}
          title={isMicEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {isMicEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>

        {/* Camera Toggle */}
        <button
          type="button"
          onClick={onToggleCamera}
          className={`p-2 rounded border transition-colors ${
            isCameraEnabled
              ? 'bg-[#393E41] border-[#587B7F] text-[#D3D0CB] hover:bg-[#393E41]/80'
              : 'bg-rose-950/60 border-rose-600/40 text-rose-400 hover:bg-rose-950'
          }`}
          title={isCameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
        >
          {isCameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </button>

        {/* Screen Share Toggle */}
        <button
          type="button"
          onClick={onToggleScreenShare}
          className={`p-2 rounded border transition-colors ${
            isScreenSharing
              ? 'bg-[#E2C044] border-[#E2C044] text-[#1E2019] font-medium'
              : 'bg-[#393E41] border-[#587B7F] text-[#D3D0CB] hover:bg-[#393E41]/80'
          }`}
          title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
        >
          {isScreenSharing ? (
            <MonitorOff className="w-4 h-4" />
          ) : (
            <MonitorUp className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Interviewer Request Candidate Screen Share */}
      {isInterviewer && onRequestCandidateScreenShare && (
        <button
          type="button"
          onClick={onRequestCandidateScreenShare}
          disabled={isRequestingScreen}
          className="px-2 py-1 text-[11px] font-mono border border-[#587B7F] text-[#E2C044] rounded hover:bg-[#393E41]/60 transition-colors flex items-center gap-1 disabled:opacity-50"
          title="Prompt candidate to share their entire screen"
        >
          {isRequestingScreen ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Share2 className="w-3 h-3" />
          )}
          <span>Request Screen</span>
        </button>
      )}
    </div>
  );
}

