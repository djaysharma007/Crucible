'use client';

import * as React from 'react';
import { Play, Pause, RotateCcw, Bookmark, Activity } from 'lucide-react';
import { ReplayTimelineEvent } from '@crucible/shared';

interface TimelineScrubberProps {
  totalDurationMs: number;
  currentOffsetMs: number;
  onSeek: (offsetMs: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  events: ReplayTimelineEvent[];
}

function formatMs(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSecs / 60);
  const seconds = totalSecs % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function TimelineScrubber({
  totalDurationMs,
  currentOffsetMs,
  onSeek,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onSpeedChange,
  events,
}: TimelineScrubberProps) {
  const progressPercent =
    totalDurationMs > 0 ? Math.min(100, (currentOffsetMs / totalDurationMs) * 100) : 0;

  const noteEvents = events.filter((e) => e.type === 'note_marker');
  const signalEvents = events.filter((e) => e.type === 'signal');

  return (
    <div className="bg-[#1E2019] border border-[#393E41] rounded p-3 text-xs text-[#D3D0CB] space-y-2.5 font-mono select-none">
      {/* Scrubber Track Bar with Note Pins and Signal Pins */}
      <div className="relative w-full h-8 flex items-center group">
        {/* Background rail */}
        <div className="relative w-full h-2 bg-[#393E41]/50 rounded-full cursor-pointer overflow-hidden border border-[#393E41]">
          {/* Filled progress */}
          <div
            className="h-full bg-[#E2C044] transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Note Markers on Timeline Rail */}
        {noteEvents.map((note) => {
          const pinPercent =
            totalDurationMs > 0 ? Math.min(99, Math.max(1, (note.offsetMs / totalDurationMs) * 100)) : 0;
          const noteText =
            typeof note.metadata?.bodyMd === 'string'
              ? note.metadata.bodyMd
              : typeof note.metadata?.title === 'string'
                ? note.metadata.title
                : 'Private Note';

          return (
            <button
              key={note.id}
              type="button"
              onClick={() => onSeek(note.offsetMs)}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#587B7F] border border-[#D3D0CB] flex items-center justify-center hover:scale-125 transition-transform z-10"
              style={{ left: `${pinPercent}%` }}
              title={`Note @ ${formatMs(note.offsetMs)}: ${noteText.slice(0, 50)}`}
            >
              <Bookmark className="w-2.5 h-2.5 text-[#1E2019]" />
            </button>
          );
        })}

        {/* Transparency Signal Markers on Timeline Rail */}
        {signalEvents.map((sig) => {
          const pinPercent =
            totalDurationMs > 0 ? Math.min(99, Math.max(1, (sig.offsetMs / totalDurationMs) * 100)) : 0;
          const sigType = typeof sig.metadata?.signalType === 'string' ? sig.metadata.signalType : 'signal';
          const label =
            sigType === 'paste'
              ? 'Paste Event'
              : sigType === 'tab_hidden'
                ? 'Tab Hidden'
                : sigType === 'tab_visible'
                  ? 'Tab Visible'
                  : sigType === 'window_blur'
                    ? 'Window Blur'
                    : 'Window Focus';

          return (
            <button
              key={sig.id}
              type="button"
              onClick={() => onSeek(sig.offsetMs)}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-amber-500/80 border border-amber-300 flex items-center justify-center hover:scale-125 transition-transform z-10"
              style={{ left: `${pinPercent}%` }}
              title={`Signal @ ${formatMs(sig.offsetMs)}: ${label}`}
            >
              <Activity className="w-2 h-2 text-[#1E2019]" />
            </button>
          );
        })}

        {/* Interactive Native Range Input overlay */}
        <input
          type="range"
          aria-label="Replay timeline scrubber"
          min={0}
          max={Math.max(1, totalDurationMs)}
          value={currentOffsetMs}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        />
      </div>

      {/* Control Bar: Play/Pause, Time readout, Speed */}
      <div className="flex items-center justify-between text-[11px]">
        {/* Play / Pause / Reset */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlay}
            className="p-1.5 rounded bg-[#393E41] hover:bg-[#393E41]/80 text-[#D3D0CB] transition-colors border border-[#587B7F]"
            title={isPlaying ? 'Pause Replay' : 'Play Replay'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-[#E2C044]" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          <button
            type="button"
            onClick={() => onSeek(0)}
            className="p-1.5 rounded bg-[#393E41]/50 hover:bg-[#393E41] text-[#D3D0CB]/70 hover:text-[#D3D0CB] transition-colors border border-[#393E41]"
            title="Reset to beginning"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1 font-mono text-[11px] text-[#D3D0CB]">
            <span className="font-semibold text-[#E2C044]">{formatMs(currentOffsetMs)}</span>
            <span className="text-[#D3D0CB]/50">/</span>
            <span className="text-[#D3D0CB]/70">{formatMs(totalDurationMs)}</span>
          </div>
        </div>

        {/* Speed Controls: 1x, 2x, 5x, 10x */}
        <div className="flex items-center gap-1 font-mono text-[10px]">
          <span className="text-[#D3D0CB]/50 mr-1">Speed:</span>
          {[1, 2, 5, 10].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSpeedChange(s)}
              className={`px-2 py-0.5 rounded border transition-colors ${
                playbackSpeed === s
                  ? 'bg-[#E2C044] border-[#E2C044] text-[#1E2019] font-bold'
                  : 'bg-[#393E41]/40 border-[#393E41] text-[#D3D0CB]/60 hover:text-[#D3D0CB]'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
