'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Printer,
  ExternalLink,
  Code2,
  PenTool,
  Lock,
  Award,
  Film,
  FileText,
} from 'lucide-react';
import { Badge, Button, Skeleton } from '@crucible/ui';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  InterviewDetailResponse,
  ReplayTimelineResponse,
  Recommendation,
} from '@crucible/shared';
import { TimelineScrubber } from '@/components/replay/TimelineScrubber';

type DetailTab = 'summary' | 'code' | 'whiteboard' | 'notes' | 'scorecard' | 'replay';

const REC_META: Record<Recommendation, { label: string; color: string }> = {
  strong_hire: { label: 'Strong Hire', color: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40' },
  hire: { label: 'Hire', color: 'bg-teal-950/60 text-teal-400 border-teal-500/40' },
  no_hire: { label: 'No Hire', color: 'bg-amber-950/60 text-amber-400 border-amber-500/40' },
  strong_no_hire: { label: 'Strong No Hire', color: 'bg-rose-950/60 text-rose-400 border-rose-500/40' },
};

export default function InterviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params.id as string;
  const { user, isLoading: authLoading } = useAuth();

  const [detail, setDetail] = React.useState<InterviewDetailResponse | null>(null);
  const [replay, setReplay] = React.useState<ReplayTimelineResponse | null>(null);
  const [activeTab, setActiveTab] = React.useState<DetailTab>('summary');
  const [activeQuestionIndex, setActiveQuestionIndex] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);

  // Replay Scrubber State
  const [currentOffsetMs, setCurrentOffsetMs] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [playbackSpeed, setPlaybackSpeed] = React.useState(1);

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    async function loadData() {
      try {
        setIsLoading(true);
        const [detailData, replayData] = await Promise.all([
          apiClient<InterviewDetailResponse>(`/interviews/${interviewId}/detail`),
          apiClient<ReplayTimelineResponse>(`/interviews/${interviewId}/replay`).catch(() => null),
        ]);
        setDetail(detailData);
        if (replayData) setReplay(replayData);
      } catch (err) {
        alert((err as Error).message || 'Failed to load interview detail');
        router.push('/dashboard');
      } finally {
        setIsLoading(false);
      }
    }

    if (user && interviewId) {
      loadData();
    }
  }, [user, authLoading, interviewId, router]);

  // Replay playback timer loop
  React.useEffect(() => {
    if (!isPlaying || !replay) return;

    const intervalMs = 100;
    const timer = setInterval(() => {
      setCurrentOffsetMs((prev) => {
        const next = prev + intervalMs * playbackSpeed;
        if (next >= replay.totalDurationMs) {
          setIsPlaying(false);
          return replay.totalDurationMs;
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, replay]);

  const handlePrintReport = () => {
    window.print();
  };

  if (authLoading || isLoading || !detail) {
    return (
      <div className="min-h-screen bg-base p-6 max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const activeQuestion = detail.questions[activeQuestionIndex];

  // Reconstruct Replay States at currentOffsetMs
  const replayCodeRuns = activeQuestion
    ? activeQuestion.codeRuns.filter((cr) => {
        const baseTime = detail.startedAt ? new Date(detail.startedAt).getTime() : new Date(detail.createdAt).getTime();
        const offset = Math.max(0, new Date(cr.requestedAt).getTime() - baseTime);
        return offset <= currentOffsetMs;
      })
    : [];
  const latestReplayCodeRun = replayCodeRuns[replayCodeRuns.length - 1];

  const replaySnapshot = detail.whiteboardSnapshots
    .filter((ws) => ws.offsetMs <= currentOffsetMs)
    .pop();

  return (
    <div className="min-h-screen flex flex-col bg-base text-primary">
      {/* Top Header */}
      <header className="h-14 border-b border-border bg-surface px-6 flex items-center justify-between shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="text-muted hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Interviews
          </Button>
          <span className="text-muted">/</span>
          <span className="font-semibold text-sm text-primary">{detail.candidateName}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrintReport}>
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print Report
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push(`/room/${detail.id}`)}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Open Room
          </Button>
        </div>
      </header>

      {/* Main Review Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* Candidate & Session Overview Card */}
        <div className="p-5 bg-surface border border-border rounded-panel flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-primary">
                {detail.candidateName}
              </h1>
              <Badge variant={detail.status === 'completed' ? 'secondary' : 'default'}>
                {detail.status.toUpperCase()}
              </Badge>
              {detail.scorecard && (
                <span
                  className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                    REC_META[detail.scorecard.recommendation]?.color || 'bg-surface border-border'
                  }`}
                >
                  {REC_META[detail.scorecard.recommendation]?.label || detail.scorecard.recommendation}
                </span>
              )}
            </div>
            <p className="text-xs text-muted font-medium">{detail.roleTitle || 'Candidate'}</p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-muted">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-accent" />
              {new Date(detail.createdAt).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#587B7F]" />
              {Math.round(detail.durationSeconds / 60)} mins
            </span>
            <span>{detail.questions.length} Questions</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-border bg-surface px-2 rounded-t-panel print:hidden font-mono text-xs">
          {(
            [
              { id: 'summary', label: 'Summary', icon: FileText },
              { id: 'code', label: 'Code', icon: Code2 },
              { id: 'whiteboard', label: 'Whiteboard', icon: PenTool },
              { id: 'notes', label: 'Notes', icon: Lock },
              { id: 'scorecard', label: 'Scorecard', icon: Award },
              { id: 'replay', label: 'Timeline Replay', icon: Film },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-medium transition-colors ${
                  isActive
                    ? 'border-accent text-accent'
                    : 'border-transparent text-muted hover:text-primary'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Panes */}
        <div className="min-h-[420px]">
          {/* 1. Summary Tab */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Scorecard recommendation card */}
                <div className="p-4 bg-surface border border-border rounded-panel space-y-2">
                  <span className="text-[11px] font-mono text-muted uppercase tracking-wider block">
                    Final Recommendation
                  </span>
                  {detail.scorecard ? (
                    <div>
                      <span className="text-base font-bold text-primary block">
                        {REC_META[detail.scorecard.recommendation]?.label}
                      </span>
                      <p className="text-xs text-muted mt-2 leading-relaxed font-sans">
                        {detail.scorecard.summaryText || 'No overall synthesis provided.'}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-muted">Scorecard not submitted</span>
                  )}
                </div>

                {/* Questions & Test stats */}
                <div className="p-4 bg-surface border border-border rounded-panel space-y-2">
                  <span className="text-[11px] font-mono text-muted uppercase tracking-wider block">
                    Problems Attempted
                  </span>
                  <div className="text-xl font-mono font-bold text-primary">
                    {detail.questions.length}
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {detail.questions.map((q) => (
                      <div key={q.id} className="text-xs flex items-center justify-between text-muted">
                        <span className="truncate max-w-[180px] text-primary">{q.question.title}</span>
                        <span className="font-mono text-[11px]">{q.codeRuns.length} runs</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes Snapshot */}
                <div className="p-4 bg-surface border border-border rounded-panel space-y-2">
                  <span className="text-[11px] font-mono text-muted uppercase tracking-wider block">
                    Private Notes Captured
                  </span>
                  <div className="text-xl font-mono font-bold text-primary">
                    {detail.notes.length}
                  </div>
                  <p className="text-xs text-muted leading-relaxed font-sans">
                    Notes recorded live during the session, pinned to timeline offsets.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. Code Tab */}
          {activeTab === 'code' && (
            <div className="space-y-4">
              {detail.questions.length === 0 ? (
                <div className="p-8 text-center text-muted text-xs bg-surface border border-border rounded-panel">
                  No questions attached to this interview.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Question Tabs */}
                  <div className="flex items-center gap-2 border-b border-border pb-2">
                    {detail.questions.map((q, idx) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setActiveQuestionIndex(idx)}
                        className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                          activeQuestionIndex === idx
                            ? 'bg-accent text-[#1E2019] font-bold'
                            : 'bg-surface border border-border text-muted hover:text-primary'
                        }`}
                      >
                        Q{idx + 1}: {q.question.title}
                      </button>
                    ))}
                  </div>

                  {activeQuestion && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Left: Code Viewer */}
                      <div className="lg:col-span-2 space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono text-muted px-1">
                          <span>Final Code Submission</span>
                          <span className="px-2 py-0.5 rounded bg-surface border border-border">
                            {activeQuestion.language}
                          </span>
                        </div>
                        <pre className="p-4 bg-[#1E2019] border border-border rounded-panel text-[#D3D0CB] font-mono text-xs overflow-x-auto min-h-[300px]">
                          <code>
                            {activeQuestion.codeRuns[0]?.sourceSnapshot ||
                              activeQuestion.question.starterCode ||
                              '// No code runs recorded'}
                          </code>
                        </pre>
                      </div>

                      {/* Right: Code Runs History */}
                      <div className="space-y-2">
                        <span className="text-xs font-mono text-muted block">Run History</span>
                        <div className="space-y-2 max-h-[340px] overflow-y-auto">
                          {activeQuestion.codeRuns.length === 0 ? (
                            <p className="text-xs text-muted">No runs executed.</p>
                          ) : (
                            activeQuestion.codeRuns.map((cr, i) => (
                              <div
                                key={cr.id}
                                className="p-2.5 bg-surface border border-border rounded-panel text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between font-mono text-[11px]">
                                  <span className="font-semibold text-primary">Run #{activeQuestion.codeRuns.length - i}</span>
                                  <span className="text-muted">{cr.durationMs}ms</span>
                                </div>
                                <span className="text-[10px] text-muted block">
                                  {new Date(cr.requestedAt).toLocaleTimeString()}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. Whiteboard Tab */}
          {activeTab === 'whiteboard' && (
            <div className="space-y-3">
              {detail.whiteboardSnapshots.length === 0 ? (
                <div className="p-8 text-center text-muted text-xs bg-surface border border-border rounded-panel">
                  No whiteboard snapshots saved during this session.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {detail.whiteboardSnapshots.map((ws, i) => (
                    <div key={ws.id} className="p-4 bg-surface border border-border rounded-panel space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono text-muted">
                        <span>Snapshot #{detail.whiteboardSnapshots.length - i}</span>
                        <span>{new Date(ws.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <div className="p-4 bg-[#1E2019] border border-border rounded text-[#D3D0CB] text-xs font-mono overflow-auto max-h-64">
                        <pre>{ws.snapshot.slice(0, 500)}...</pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-2">
              {detail.notes.length === 0 ? (
                <div className="p-8 text-center text-muted text-xs bg-surface border border-border rounded-panel">
                  No private notes taken for this interview.
                </div>
              ) : (
                detail.notes.map((note) => {
                  const mins = Math.floor(note.offsetMs / 60000);
                  const secs = Math.floor((note.offsetMs % 60000) / 1000);
                  const timeTag = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                  return (
                    <div
                      key={note.id}
                      className="p-3 bg-surface border border-border rounded-panel space-y-1 text-xs"
                    >
                      <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
                        <span className="px-1.5 py-0.5 rounded bg-accent/15 text-accent font-semibold">
                          [{timeTag}]
                        </span>
                        <span>{new Date(note.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-primary leading-relaxed whitespace-pre-wrap font-sans">
                        {note.bodyMd}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 5. Scorecard Tab */}
          {activeTab === 'scorecard' && (
            <div className="space-y-4">
              {!detail.scorecard ? (
                <div className="p-8 text-center text-muted text-xs bg-surface border border-border rounded-panel">
                  Scorecard has not been submitted for this interview.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Recommendation Header */}
                  <div className="p-4 bg-surface border border-border rounded-panel flex items-center justify-between">
                    <div>
                      <span className="text-xs text-muted font-mono block">Overall Recommendation</span>
                      <span className="text-base font-bold text-primary mt-1 block">
                        {REC_META[detail.scorecard.recommendation]?.label}
                      </span>
                    </div>
                    <span className="text-xs text-muted font-mono">
                      Submitted: {detail.scorecard.submittedAt ? new Date(detail.scorecard.submittedAt).toLocaleDateString() : '—'}
                    </span>
                  </div>

                  {/* Criteria Ratings */}
                  <div className="space-y-2">
                    <span className="text-xs font-mono text-muted block">Criteria Ratings</span>
                    <div className="grid grid-cols-1 gap-2">
                      {detail.scorecard.ratings.map((r) => (
                        <div
                          key={r.id}
                          className="p-3.5 bg-surface border border-border rounded-panel flex items-start justify-between gap-4 text-xs"
                        >
                          <div className="space-y-1">
                            <span className="font-semibold text-primary">{r.criterion?.name}</span>
                            <p className="text-muted leading-relaxed font-sans">
                              {r.justification || r.criterion?.description}
                            </p>
                          </div>
                          <div className="w-8 h-8 rounded bg-accent text-[#1E2019] font-mono font-bold flex items-center justify-center shrink-0">
                            {r.rating}/4
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Synthesis */}
                  {detail.scorecard.summaryText && (
                    <div className="p-4 bg-surface border border-border rounded-panel space-y-1.5 text-xs">
                      <span className="font-semibold text-primary font-mono block">
                        Candidate Summary & Synthesis
                      </span>
                      <p className="text-muted leading-relaxed whitespace-pre-wrap font-sans">
                        {detail.scorecard.summaryText}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 6. Replay Tab */}
          {activeTab === 'replay' && (
            <div className="space-y-4">
              {!replay ? (
                <div className="p-8 text-center text-muted text-xs bg-surface border border-border rounded-panel">
                  Replay timeline data is unavailable.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Timeline Scrubber */}
                  <TimelineScrubber
                    totalDurationMs={replay.totalDurationMs}
                    currentOffsetMs={currentOffsetMs}
                    onSeek={(ms) => setCurrentOffsetMs(ms)}
                    isPlaying={isPlaying}
                    onTogglePlay={() => setIsPlaying(!isPlaying)}
                    playbackSpeed={playbackSpeed}
                    onSpeedChange={setPlaybackSpeed}
                    events={replay.events}
                  />

                  {/* Reconstructed Replay Workspace */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Replayed Code State */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono text-muted">
                        <span>Code State at Timeline Offset</span>
                        {latestReplayCodeRun && (
                          <span className="text-accent">{latestReplayCodeRun.language}</span>
                        )}
                      </div>
                      <pre className="p-4 bg-[#1E2019] border border-border rounded-panel text-[#D3D0CB] font-mono text-xs overflow-x-auto min-h-[260px]">
                        <code>
                          {latestReplayCodeRun?.sourceSnapshot ||
                            activeQuestion?.question.starterCode ||
                            '// Candidate has not written code at this timestamp'}
                        </code>
                      </pre>
                    </div>

                    {/* Replayed Whiteboard Snapshot */}
                    <div className="space-y-2">
                      <span className="text-xs font-mono text-muted block">Whiteboard Snapshot at Offset</span>
                      <div className="p-4 bg-[#1E2019] border border-border rounded-panel text-[#D3D0CB] font-mono text-xs min-h-[260px] flex items-center justify-center text-center">
                        {replaySnapshot ? (
                          <pre className="overflow-auto max-h-60 w-full text-left text-[10px]">
                            {replaySnapshot.snapshot.slice(0, 300)}...
                          </pre>
                        ) : (
                          <span className="text-muted/60">No drawing recorded yet at this timestamp.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
