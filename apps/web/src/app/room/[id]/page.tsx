'use client';

import * as React from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Button, Badge, Input, Skeleton } from '@crucible/ui';
import { Lock, Unlock, Play, Square, Clock, Shield, UserCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { CodeEditor } from './editor/code-editor';
import { SupportedLanguage } from '@crucible/shared';

interface RoomStatusResponse {
  interviewId: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  isLocked: boolean;
  isAdmitted: boolean;
  candidateName: string;
  roleTitle: string | null;
  startedAt: string | null;
  questions: Array<{
    id: string;
    question: {
      id: string;
      title: string;
      descriptionMd: string;
    };
  }>;
}

interface LobbyCandidate {
  candidateId: string;
  displayName: string;
  joinedAt: string;
}

function RoomContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const interviewId = params?.['id'] as string;
  const tokenParam = searchParams.get('token');

  const [statusData, setStatusData] = React.useState<RoomStatusResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Candidate Join State
  const [candidateNameInput, setCandidateNameInput] = React.useState('');
  const [hasConsented, setHasConsented] = React.useState(false);
  const [isJoining, setIsJoining] = React.useState(false);
  const [candidateJoined, setCandidateJoined] = React.useState(false);

  // Interviewer Lobby State
  const [waitingCandidates, setWaitingCandidates] = React.useState<LobbyCandidate[]>([]);
  const [isAdmitting, setIsAdmitting] = React.useState(false);

  // Editor State
  const [selectedLanguage, setSelectedLanguage] = React.useState<SupportedLanguage>('typescript');
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);

  const isInterviewer = Boolean(user && !tokenParam);

  const fetchStatus = React.useCallback(async () => {
    try {
      const res = await apiClient<RoomStatusResponse>(`/rooms/${interviewId}/status`);
      setStatusData(res);
      if (res.candidateName && !candidateNameInput) {
        setCandidateNameInput(res.candidateName);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to load interview room');
    } finally {
      setIsLoading(false);
    }
  }, [interviewId, candidateNameInput]);

  const fetchLobby = React.useCallback(async () => {
    if (!isInterviewer) return;
    try {
      const candidates = await apiClient<LobbyCandidate[]>(`/rooms/${interviewId}/lobby`);
      setWaitingCandidates(candidates);
    } catch {
      // Ignored if not interviewer
    }
  }, [interviewId, isInterviewer]);

  // Initial load & Polling
  React.useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
      if (isInterviewer) {
        fetchLobby();
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [fetchStatus, fetchLobby, isInterviewer]);

  // Elapsed Timer
  React.useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (statusData?.startedAt && statusData.status === 'live') {
      const startMs = new Date(statusData.startedAt).getTime();
      const updateTimer = () => {
        const diff = Math.floor((Date.now() - startMs) / 1000);
        setElapsedSeconds(Math.max(0, diff));
      };
      updateTimer();
      timer = setInterval(updateTimer, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [statusData?.startedAt, statusData?.status]);

  // Candidate Join Action
  const handleCandidateJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenParam) return;
    setIsJoining(true);
    setError(null);

    try {
      await apiClient<{ candidateId: string; isAdmitted: boolean }>('/rooms/join', {
        method: 'POST',
        body: JSON.stringify({
          token: tokenParam,
          displayName: candidateNameInput || 'Candidate',
        }),
      });

      setCandidateJoined(true);
      fetchStatus();
    } catch (err) {
      setError((err as Error).message || 'Failed to join interview room');
    } finally {
      setIsJoining(false);
    }
  };

  // Interviewer Actions
  const handleAdmitCandidate = async (candId: string) => {
    setIsAdmitting(true);
    try {
      await apiClient(`/rooms/${interviewId}/admit`, {
        method: 'POST',
        body: JSON.stringify({ candidateSessionId: candId }),
      });
      fetchStatus();
      fetchLobby();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsAdmitting(false);
    }
  };

  const handleToggleLock = async () => {
    if (!statusData) return;
    try {
      await apiClient(`/rooms/${interviewId}/lock`, {
        method: 'POST',
        body: JSON.stringify({ locked: !statusData.isLocked }),
      });
      fetchStatus();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleStartInterview = async () => {
    try {
      await apiClient(`/interviews/${interviewId}/start`, { method: 'POST' });
      fetchStatus();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleEndInterview = async () => {
    if (
      !confirm('Are you sure you want to conclude this interview session? This locks the room.')
    ) {
      return;
    }
    try {
      await apiClient(`/interviews/${interviewId}/end`, { method: 'POST' });
      fetchStatus();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-base p-6 space-y-4 max-w-6xl mx-auto">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[70vh]">
          <Skeleton className="col-span-1 h-full" />
          <Skeleton className="col-span-2 h-full" />
        </div>
      </div>
    );
  }

  if (error || !statusData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base p-4">
        <div className="max-w-md w-full rounded-panel border border-border bg-surface p-6 text-center space-y-3">
          <h2 className="text-sm font-semibold text-danger">Unable to Connect</h2>
          <p className="text-xs text-muted leading-relaxed">{error || 'Room not found'}</p>
          <Button variant="outline" size="sm" onClick={() => router.push('/')}>
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  // Candidate Join / Consent Screen
  if (tokenParam && !candidateJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base p-4">
        <div className="max-w-md w-full rounded-panel border border-border bg-surface p-6 shadow-floating space-y-5">
          <div>
            <h1 className="text-lg font-semibold text-primary">Technical Interview Room</h1>
            <p className="text-xs text-muted mt-1">
              Candidate: <strong className="text-primary">{statusData.candidateName}</strong>
              {statusData.roleTitle && ` · ${statusData.roleTitle}`}
            </p>
          </div>

          <div className="p-3.5 rounded-control bg-base border border-border space-y-2 text-xs text-muted leading-relaxed">
            <div className="flex items-center gap-2 text-primary font-medium">
              <Shield className="w-4 h-4 text-accent" />
              <span>Transparency & Privacy Consent</span>
            </div>
            <p>
              During this interview session, your shared code editor keystrokes, remote cursor, and
              optional screen sharing are visible to your interviewer for evaluation purposes.
            </p>
          </div>

          <form onSubmit={handleCandidateJoin} className="space-y-4">
            <Input
              label="Your Display Name"
              value={candidateNameInput}
              onChange={(e) => setCandidateNameInput(e.target.value)}
              placeholder="e.g. Alex"
              required
            />

            <label className="flex items-start gap-2.5 text-xs text-primary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasConsented}
                onChange={(e) => setHasConsented(e.target.checked)}
                className="mt-0.5 rounded-[4px] border-border accent-accent"
                required
              />
              <span>
                I understand and consent to the session recording and collaborative workspace.
              </span>
            </label>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={!hasConsented}
              isLoading={isJoining}
            >
              Enter Interview Room
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Candidate Lobby Screen (waiting to be admitted)
  if (tokenParam && !statusData.isAdmitted && statusData.status !== 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base p-4">
        <div className="max-w-md w-full rounded-panel border border-border bg-surface p-8 text-center space-y-4 shadow-floating">
          <div className="w-10 h-10 mx-auto rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
            <Clock className="w-5 h-5 text-accent animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-primary">Waiting in the Lobby</h2>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              You are connected. Your interviewer has been notified and will admit you into the live
              session shortly. Please keep this tab open.
            </p>
          </div>
          <div className="pt-2">
            <Badge variant="secondary">Lobby Active · Auto-refreshing</Badge>
          </div>
        </div>
      </div>
    );
  }

  // Unified Room Interface
  const activeQuestion = statusData.questions[0]?.question;
  const documentName = statusData.questions[0]?.id
    ? `code:${statusData.questions[0].id}`
    : `code:${interviewId}`;

  return (
    <div className="h-screen flex flex-col bg-base text-primary overflow-hidden">
      {/* Interviewer Waiting Candidate Notification Banner */}
      {isInterviewer && waitingCandidates.length > 0 && (
        <div className="bg-accent/15 border-b border-accent/40 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-primary font-medium">
            <UserCheck className="w-4 h-4 text-accent" />
            <span>
              Candidate <strong>{waitingCandidates[0]?.displayName}</strong> is waiting in the
              lobby.
            </span>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleAdmitCandidate(waitingCandidates[0]!.candidateId)}
            isLoading={isAdmitting}
          >
            Admit Candidate
          </Button>
        </div>
      )}

      {/* Top Control Bar */}
      <header className="h-12 border-b border-border bg-surface px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm tracking-tight text-primary">Crucible</span>
          <span className="text-xs text-muted">/</span>
          <span className="text-xs font-medium text-primary">{statusData.candidateName}</span>
          <Badge
            variant={
              statusData.status === 'live'
                ? 'accent'
                : statusData.status === 'completed'
                  ? 'success'
                  : 'default'
            }
          >
            {statusData.status.toUpperCase()}
          </Badge>
        </div>

        {/* Center: Timer */}
        <div className="flex items-center gap-1.5 font-mono text-xs text-muted bg-base px-2.5 py-1 rounded-control border border-border">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatTimer(elapsedSeconds)}</span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {isInterviewer && (
            <>
              {statusData.status === 'scheduled' && (
                <Button size="sm" variant="secondary" onClick={handleStartInterview}>
                  <Play className="w-3 h-3 mr-1" />
                  Start Session
                </Button>
              )}

              <Button
                size="sm"
                variant={statusData.isLocked ? 'danger' : 'outline'}
                onClick={handleToggleLock}
              >
                {statusData.isLocked ? (
                  <>
                    <Unlock className="w-3 h-3 mr-1" />
                    Unlock Editor
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 mr-1" />
                    Lock Editor
                  </>
                )}
              </Button>

              {statusData.status !== 'completed' && (
                <Button size="sm" variant="outline" onClick={handleEndInterview}>
                  <Square className="w-3 h-3 mr-1" />
                  End Session
                </Button>
              )}
            </>
          )}

          {!isInterviewer && statusData.status === 'completed' && (
            <Badge variant="success">Interview Ended</Badge>
          )}
        </div>
      </header>

      {/* Main Workspace: Left Question / Center Editor */}
      <main className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* Left: Question Panel */}
        <div className="w-80 rounded-panel border border-border bg-surface/50 p-4 flex flex-col overflow-y-auto shrink-0">
          <div className="mb-3">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
              Problem Statement
            </span>
            <h2 className="text-sm font-semibold text-primary mt-1">
              {activeQuestion?.title || 'Technical Assessment'}
            </h2>
          </div>

          <div className="flex-1 text-xs text-muted space-y-2 leading-relaxed">
            {activeQuestion?.descriptionMd ? (
              <p className="whitespace-pre-wrap">{activeQuestion.descriptionMd}</p>
            ) : (
              <p>
                Write and test your solution in the collaborative editor. Your code synchronizes in
                real time with the interviewer.
              </p>
            )}
          </div>
        </div>

        {/* Center: Live Collaborative Code Editor */}
        <div className="flex-1 h-full min-w-0">
          <CodeEditor
            documentName={documentName}
            authToken={tokenParam || 'interviewer-session'}
            userName={
              isInterviewer ? user?.displayName || 'Interviewer' : candidateNameInput || 'Candidate'
            }
            isInterviewer={isInterviewer}
            isLocked={statusData.isLocked || statusData.status === 'completed'}
            language={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
          />
        </div>
      </main>
    </div>
  );
}

export default function RoomPage() {
  return (
    <React.Suspense
      fallback={<div className="min-h-screen bg-base text-xs text-muted p-4">Loading room...</div>}
    >
      <RoomContent />
    </React.Suspense>
  );
}
