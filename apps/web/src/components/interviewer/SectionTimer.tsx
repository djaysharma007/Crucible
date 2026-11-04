'use client';

import * as React from 'react';
import { Clock, BookmarkPlus, CheckCircle2, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface SectionTimerProps {
  interviewId: string;
  elapsedSeconds: number;
  onMarkerCreated?: () => void;
}

interface SectionDefinition {
  id: string;
  name: string;
  startSec: number;
  endSec: number;
}

const DEFAULT_SECTIONS: SectionDefinition[] = [
  { id: 'intro', name: 'Intro & Agenda', startSec: 0, endSec: 300 }, // 0-5m
  { id: 'coding', name: 'Problem Solving & Coding', startSec: 300, endSec: 2400 }, // 5-40m
  { id: 'followup', name: 'System & Follow-ups', startSec: 2400, endSec: 3000 }, // 40-50m
  { id: 'qa', name: 'Candidate Questions & Wrap-up', startSec: 3000, endSec: 3600 }, // 50-60m
];

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function SectionTimer({
  interviewId,
  elapsedSeconds,
  onMarkerCreated,
}: SectionTimerProps) {
  const [isLogging, setIsLogging] = React.useState<string | null>(null);
  const [lastLoggedSection, setLastLoggedSection] = React.useState<string | null>(null);

  const currentSection =
    DEFAULT_SECTIONS.find(
      (sec) => elapsedSeconds >= sec.startSec && elapsedSeconds < sec.endSec,
    ) || DEFAULT_SECTIONS[DEFAULT_SECTIONS.length - 1];

  const targetDuration = 3600; // 60 mins
  const progressPercent = Math.min(100, Math.round((elapsedSeconds / targetDuration) * 100));

  const handleLogMarker = async (sec: SectionDefinition) => {
    try {
      setIsLogging(sec.id);
      await apiClient(`/rooms/${interviewId}/notes`, {
        method: 'POST',
        body: JSON.stringify({
          bodyMd: `📍 **Section Transition:** Entered ${sec.name} (${formatTime(elapsedSeconds)})`,
          offsetMs: elapsedSeconds * 1000,
        }),
      });
      setLastLoggedSection(sec.id);
      onMarkerCreated?.();
    } catch (err) {
      alert((err as Error).message || 'Failed to log section marker');
    } finally {
      setIsLogging(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1E2019] text-[#D3D0CB] text-xs p-3 space-y-3.5">
      {/* Timer Overview Box */}
      <div className="p-3 rounded bg-[#393E41]/30 border border-[#393E41] flex flex-col items-center justify-center space-y-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#D3D0CB]/60">
          Interview Duration
        </span>
        <div className="text-2xl font-mono font-bold tracking-tight text-[#E2C044] flex items-center gap-1.5">
          <Clock className="w-5 h-5 text-[#587B7F]" />
          <span>{formatTime(elapsedSeconds)}</span>
          <span className="text-xs font-normal text-[#D3D0CB]/50 font-sans">/ 60:00</span>
        </div>

        {/* 60-min Visual Progress Bar */}
        <div className="w-full space-y-1">
          <div className="w-full h-1.5 bg-[#1E2019] rounded-full overflow-hidden border border-[#393E41]">
            <div
              className={`h-full transition-all duration-300 ${
                elapsedSeconds > 3600 ? 'bg-rose-500' : 'bg-[#587B7F]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-[#D3D0CB]/40">
            <span>0m</span>
            <span>20m</span>
            <span>40m</span>
            <span>60m</span>
          </div>
        </div>
      </div>

      {/* Sections Roadmap */}
      <div className="space-y-2">
        <span className="font-semibold text-[11px] text-[#D3D0CB] block font-mono">
          Session Roadmap
        </span>

        <div className="space-y-1.5">
          {DEFAULT_SECTIONS.map((sec) => {
            const isCurrent = currentSection?.id === sec.id;
            const isPassed = elapsedSeconds >= sec.endSec;
            const isLogActive = isLogging === sec.id;
            const wasLogged = lastLoggedSection === sec.id;

            return (
              <div
                key={sec.id}
                className={`p-2 rounded border transition-colors flex items-center justify-between ${
                  isCurrent
                    ? 'bg-[#393E41]/40 border-[#E2C044] text-[#D3D0CB]'
                    : isPassed
                    ? 'bg-[#1E2019] border-[#393E41]/50 text-[#D3D0CB]/50'
                    : 'bg-[#1E2019] border-[#393E41] text-[#D3D0CB]/70'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isPassed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : isCurrent ? (
                    <div className="w-2 h-2 rounded-full bg-[#E2C044] animate-pulse shrink-0 ml-1" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-[#393E41] shrink-0 ml-1" />
                  )}

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-[11px]">{sec.name}</span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.2 rounded bg-[#E2C044]/20 text-[#E2C044] text-[9px] font-mono font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-[#D3D0CB]/50">
                      {formatTime(sec.startSec)} - {formatTime(sec.endSec)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleLogMarker(sec)}
                  disabled={isLogActive}
                  className="px-2 py-1 rounded border border-[#393E41] hover:border-[#587B7F] text-[#D3D0CB]/70 hover:text-[#D3D0CB] text-[10px] transition-colors flex items-center gap-1 shrink-0"
                  title="Record timestamped section marker to notes timeline"
                >
                  {isLogActive ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : wasLogged ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <BookmarkPlus className="w-3 h-3 text-[#E2C044]" />
                  )}
                  <span>{wasLogged ? 'Marked' : 'Mark'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
