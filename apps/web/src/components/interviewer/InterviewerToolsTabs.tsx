'use client';

import * as React from 'react';
import { Lock, Award, Clock } from 'lucide-react';
import { NotesPanel } from './NotesPanel';
import { RubricScorecardPanel } from './RubricScorecardPanel';
import { SectionTimer } from './SectionTimer';

interface InterviewerToolsTabsProps {
  interviewId: string;
  elapsedSeconds: number;
}

type TabType = 'notes' | 'scorecard' | 'timer';

export function InterviewerToolsTabs({
  interviewId,
  elapsedSeconds,
}: InterviewerToolsTabsProps) {
  const [activeTab, setActiveTab] = React.useState<TabType>('notes');

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#1E2019] border-t border-[#393E41]">
      {/* Tab Switcher Header */}
      <div className="flex items-center border-b border-[#393E41] bg-[#1E2019] shrink-0 font-mono text-[11px]">
        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'notes'
              ? 'border-[#E2C044] text-[#E2C044] font-semibold bg-[#393E41]/20'
              : 'border-transparent text-[#D3D0CB]/60 hover:text-[#D3D0CB] hover:bg-[#393E41]/10'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Notes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scorecard')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'scorecard'
              ? 'border-[#E2C044] text-[#E2C044] font-semibold bg-[#393E41]/20'
              : 'border-transparent text-[#D3D0CB]/60 hover:text-[#D3D0CB] hover:bg-[#393E41]/10'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Rubric</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('timer')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'timer'
              ? 'border-[#E2C044] text-[#E2C044] font-semibold bg-[#393E41]/20'
              : 'border-transparent text-[#D3D0CB]/60 hover:text-[#D3D0CB] hover:bg-[#393E41]/10'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Timer</span>
        </button>
      </div>

      {/* Tab Content Panes */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'notes' && (
          <NotesPanel interviewId={interviewId} elapsedSeconds={elapsedSeconds} />
        )}
        {activeTab === 'scorecard' && (
          <RubricScorecardPanel interviewId={interviewId} />
        )}
        {activeTab === 'timer' && (
          <SectionTimer
            interviewId={interviewId}
            elapsedSeconds={elapsedSeconds}
          />
        )}
      </div>
    </div>
  );
}
