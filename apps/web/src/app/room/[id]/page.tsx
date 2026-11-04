'use client';

import * as React from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Button, Badge, Input, Skeleton } from '@crucible/ui';
import {
  Lock,
  Unlock,
  Play,
  Square,
  Clock,
  Shield,
  UserCheck,
  Code2,
  PenTool,
  Video,
  MonitorUp,
  Share2,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { CodeEditor } from './editor/code-editor';
import { Whiteboard } from '@/components/whiteboard/Whiteboard';
import { QuestionPanel, InterviewQuestionItem } from '@/components/room/QuestionPanel';
import { RunControls } from '@/components/room/RunControls';
import { AttachQuestionModal } from '@/components/room/AttachQuestionModal';
import { DeviceCheck } from '@/components/presence/DeviceCheck';
import { VideoTile } from '@/components/presence/VideoTile';
import { MediaControls } from '@/components/presence/MediaControls';
import { ScreenShareTheater } from '@/components/presence/ScreenShareTheater';
import { RecordingControls } from '@/components/presence/RecordingControls';
import { useLiveKitRoom } from '@/components/presence/useLiveKitRoom';
import { InterviewerToolsTabs } from '@/components/interviewer/InterviewerToolsTabs';
import { EndInterviewModal } from '@/components/interviewer/EndInterviewModal';
import { useTransparencySignals } from '@/hooks/useTransparencySignals';
import {
  SupportedLanguage,
  RunCodeResponse,
  RunCustomResponse,
  RecordingStatusResponse,
} from '@crucible/shared';

interface RoomStatusResponse {
  interviewId: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  isLocked: boolean;
  isAdmitted: boolean;
  candidateName: string;
  roleTitle: string | null;
  startedAt: string | null;
  questions: InterviewQuestionItem[];
}

interface LobbyCandidate {
  candidateId: string;
  displayName: string;
  joinedAt: string;
}

interface ScreenShareRequestPayload {
  interviewId: string;
  requestedBy: string;
  target: string;
  message: string;
  timestamp: string;
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

  // Workspace View State
  const [centerView, setCenterView] = React.useState<'code' | 'whiteboard'>('code');
  const [activeQuestionId, setActiveQuestionId] = React.useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = React.useState<SupportedLanguage>('typescript');
  const [currentCode, setCurrentCode] = React.useState<string>('');
  const [isRunningTests, setIsRunningTests] = React.useState(false);
  const [latestRun, setLatestRun] = React.useState<RunCodeResponse | null>(null);
  const [isAttachModalOpen, setIsAttachModalOpen] = React.useState(false);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);

  // Presence & Media State
  const isInterviewer = Boolean(user && !tokenParam);
  const [recordingStatus, setRecordingStatus] = React.useState<RecordingStatusResponse | null>(null);
  const [screenSharePrompt, setScreenSharePrompt] = React.useState<ScreenShareRequestPayload | null>(null);
  const [isRequestingScreen, setIsRequestingScreen] = React.useState(false);
  const [isScreenTheaterOpen, setIsScreenTheaterOpen] = React.useState(true);
  const [isEndModalOpen, setIsEndModalOpen] = React.useState(false);

  // LiveKit hook (only activates once admitted or when interviewer)
  const shouldConnectLiveKit = Boolean(statusData?.isAdmitted || isInterviewer);
  const {
    connectionState,
    participants,
    isCameraEnabled,
    isMicEnabled,
    isScreenSharing,
    activeScreenShare,
    toggleCamera,
    toggleMicrophone,
    toggleScreenShare,
  } = useLiveKitRoom(shouldConnectLiveKit ? interviewId : '');

  // Transparency & integrity telemetry (Section 6.10 & Phase 6 Hardening)
  useTransparencySignals({
    interviewId,
    enabled: Boolean(!isInterviewer && statusData?.isAdmitted),
  });

  const fetchStatus = React.useCallback(async () => {
    try {
      const res = await apiClient<RoomStatusResponse>(`/rooms/${interviewId}/status`);
      setStatusData(res);
      if (res.candidateName && !candidateNameInput) {
        setCandidateNameInput(res.candidateName);
      }
      const firstQ = res.questions[0];
      if (firstQ && !activeQuestionId) {
        setActiveQuestionId(firstQ.question.id);
        const qLang = firstQ.language as SupportedLanguage;
        if (qLang) setSelectedLanguage(qLang);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to load interview room');
    } finally {
      setIsLoading(false);
    }
  }, [interviewId, candidateNameInput, activeQuestionId]);

  const fetchLobby = React.useCallback(async () => {
    if (!isInterviewer) return;
    try {
      const candidates = await apiClient<LobbyCandidate[]>(`/rooms/${interviewId}/lobby`);
      setWaitingCandidates(candidates);
    } catch {
      // Ignored if not interviewer
    }
  }, [interviewId, isInterviewer]);

  const fetchRecordingStatus = React.useCallback(async () => {
    if (!shouldConnectLiveKit) return;
    try {
      const rec = await apiClient<RecordingStatusResponse>(`/rooms/${interviewId}/recording/status`);
      setRecordingStatus(rec);
    } catch {
      // Ignored
    }
  }, [interviewId, shouldConnectLiveKit]);

  const fetchScreenShareRequest = React.useCallback(async () => {
    if (isInterviewer || !statusData?.isAdmitted) return;
    try {
      const data = await apiClient<{ request: ScreenShareRequestPayload | null }>(
        `/rooms/${interviewId}/screenshare/request`,
      );
      setScreenSharePrompt(data.request);
    } catch {
      // Ignored
    }
  }, [interviewId, isInterviewer, statusData?.isAdmitted]);

  // Initial load & Polling
  React.useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
      if (isInterviewer) {
        fetchLobby();
      }
      fetchRecordingStatus();
      fetchScreenShareRequest();
    }, 2500);

    return () => clearInterval(interval);
  }, [fetchStatus, fetchLobby, fetchRecordingStatus, fetchScreenShareRequest, isInterviewer]);

  // Elapsed time counter
  React.useEffect(() => {
    if (!statusData?.startedAt) return;
    const startTime = new Date(statusData.startedAt).getTime();

    const timer = setInterval(() => {
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - startTime) / 1000)));
    }, 1000);

    return () => clearInterval(timer);
  }, [statusData?.startedAt]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCandidateJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateNameInput.trim() || !hasConsented || !tokenParam) return;

    try {
      setIsJoining(true);
      await apiClient.post('/rooms/join', {
        token: tokenParam,
        displayName: candidateNameInput.trim(),
        consentTelemetry: true,
      });

      setCandidateJoined(true);
      fetchStatus();
    } catch (err) {
      setError((err as Error).message || 'Failed to enter interview lobby');
    } finally {
      setIsJoining(false);
    }
  };

  const handleAdmitCandidate = async (candidateSessionId: string) => {
    try {
      setIsAdmitting(true);
      await apiClient.post(`/rooms/${interviewId}/admit`, {
        candidateSessionId,
      });
      fetchLobby();
      fetchStatus();
    } catch (err) {
      setError((err as Error).message || 'Failed to admit candidate');
    } finally {
      setIsAdmitting(false);
    }
  };

  const handleToggleLock = async () => {
    if (!statusData) return;
    try {
      const nextLocked = !statusData.isLocked;
      await apiClient.post(`/rooms/${interviewId}/lock`, {
        locked: nextLocked,
      });
      setStatusData({ ...statusData, isLocked: nextLocked });
    } catch (err) {
      setError((err as Error).message || 'Failed to change lock state');
    }
  };

  const handleStartInterview = async () => {
    try {
      await apiClient.post(`/interviews/${interviewId}/start`);
      fetchStatus();
    } catch (err) {
      setError((err as Error).message || 'Failed to start interview');
    }
  };

  const handleEndInterview = () => {
    setIsEndModalOpen(true);
  };

  // Find active InterviewQuestion item
  const activeIQ =
    statusData?.questions.find((q) => q.question.id === activeQuestionId) ||
    statusData?.questions[0];

  const handleRunTests = async () => {
    if (!activeIQ) return;
    try {
      setIsRunningTests(true);
      const res = await apiClient.post<RunCodeResponse>(
        `/interview-questions/${activeIQ.id}/run`,
        {
          language: selectedLanguage,
          sourceCode: currentCode,
        },
      );
      setLatestRun(res);
    } catch (err) {
      alert((err as Error).message || 'Execution error');
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleRunCustom = async (stdin: string): Promise<RunCustomResponse> => {
    if (!activeIQ) throw new Error('No active question');
    return apiClient.post<RunCustomResponse>(`/interview-questions/${activeIQ.id}/run-custom`, {
      language: selectedLanguage,
      sourceCode: currentCode,
      stdin,
    });
  };

  const handleLanguageChange = async (newLang: SupportedLanguage) => {
    setSelectedLanguage(newLang);
    if (activeIQ) {
      try {
        await apiClient.patch(`/interview-questions/${activeIQ.id}/language`, {
          language: newLang,
        });
      } catch {
        // Ignored
      }
    }
  };

  const handleRequestCandidateScreen = async () => {
    try {
      setIsRequestingScreen(true);
      await apiClient.post(`/rooms/${interviewId}/screenshare/request`, {
        target: 'candidate',
        message: 'Your interviewer has requested that you share your screen.',
      });
      alert('Prompt sent to candidate to share their screen.');
    } catch (err) {
      alert((err as Error).message || 'Failed to request candidate screen share');
    } finally {
      setIsRequestingScreen(false);
    }
  };

  const handleApproveScreenPrompt = async () => {
    await toggleScreenShare();
    try {
      await apiClient.delete(`/rooms/${interviewId}/screenshare/request`);
      setScreenSharePrompt(null);
    } catch {
      // Ignored
    }
  };

  const handleDismissScreenPrompt = async () => {
    try {
      await apiClient.delete(`/rooms/${interviewId}/screenshare/request`);
      setScreenSharePrompt(null);
    } catch {
      // Ignored
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-base p-6 flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <div className="flex-1 grid grid-cols-3 gap-4">
          <Skeleton className="h-full col-span-1" />
          <Skeleton className="h-full col-span-2" />
        </div>
      </div>
    );
  }

  if (error && !statusData) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 border border-border bg-surface rounded-panel text-center">
          <h2 className="text-base font-semibold text-danger">Access Error</h2>
          <p className="text-xs text-muted mt-2">{error}</p>
          <Button
            size="sm"
            variant="secondary"
            className="mt-4"
            onClick={() => router.push('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!statusData) return null;

  // Candidate Consent & Join View with Device Check (Section 5.2 Step 2)
  if (!isInterviewer && !statusData.isAdmitted && !candidateJoined) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center p-4">
        <div className="max-w-lg w-full border border-border bg-surface rounded-panel p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-sm tracking-tight text-primary">Crucible</span>
            <Badge variant="accent">Technical Interview Room</Badge>
          </div>

          <div>
            <h1 className="text-lg font-semibold text-primary">Join Interview Room</h1>
            <p className="text-xs text-muted mt-0.5">
              You have been invited to a live technical assessment for{' '}
              <strong className="text-primary">{statusData.roleTitle || 'Engineering Role'}</strong>.
            </p>
          </div>

          <form onSubmit={handleCandidateJoin} className="space-y-4">
            <div>
              <label htmlFor="display-name" className="text-xs font-medium text-muted block mb-1">
                Your Display Name
              </label>
              <Input
                id="display-name"
                value={candidateNameInput}
                onChange={(e) => setCandidateNameInput(e.target.value)}
                placeholder="e.g. Alex Smith"
                required
              />
            </div>

            {/* Device Check (Microphone and Camera Preview) */}
            <DeviceCheck />

            {/* Transparency Notice */}
            <div className="border border-border/80 bg-base p-3.5 rounded-control text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-medium text-primary">
                <Shield className="w-4 h-4 text-accent" />
                <span>Session Transparency Notice</span>
              </div>
              <p className="text-muted leading-relaxed text-[11px]">
                To maintain assessment integrity, this interview room records collaborative editor
                changes, code test execution results, and advisory tab visibility signals. Private notes
                and internal rubric evaluations remain interviewer-only.
              </p>
              <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasConsented}
                  onChange={(e) => setHasConsented(e.target.checked)}
                  className="mt-0.5 rounded border-border text-accent focus:ring-0"
                  required
                />
                <span className="text-[11px] text-primary">
                  I understand and consent to session telemetry and recording.
                </span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isJoining}
              disabled={!hasConsented || !candidateNameInput.trim()}
            >
              Enter Interview Lobby
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Candidate Waiting in Lobby View
  if (!isInterviewer && !statusData.isAdmitted) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center p-4">
        <div className="max-w-md w-full border border-border bg-surface rounded-panel p-6 text-center space-y-4">
          <div className="w-10 h-10 rounded-full bg-accent/15 text-accent flex items-center justify-center mx-auto animate-pulse">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-primary">Waiting for Interviewer</h2>
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

  // Candidate View When Interview Is Completed
  if (!isInterviewer && statusData.status === 'completed') {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center p-4">
        <div className="max-w-md w-full border border-border bg-surface rounded-panel p-6 text-center space-y-4">
          <div className="w-10 h-10 rounded-full bg-accent/15 text-accent flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-primary">Interview Concluded</h2>
            <p className="text-xs text-muted mt-2 leading-relaxed font-sans">
              Thank you for participating in today's technical interview. The session has ended, and your code and whiteboard work have been saved.
            </p>
            <p className="text-[11px] text-muted/70 mt-1 font-sans">
              Our hiring team will follow up with feedback and next steps. You may now safely close this tab.
            </p>
          </div>
          <div className="pt-2">
            <Badge variant="secondary">Session Closed</Badge>
          </div>
        </div>
      </div>
    );
  }

  // Unified Room Interface
  const starterCode = activeIQ?.question?.languages.find(
    (l) => l.language === selectedLanguage,
  )?.starterCode;

  const documentName = activeIQ?.id ? `code:${activeIQ.id}` : `code:${interviewId}`;

  // Find local & remote participant states
  const localParticipant = participants.find((p) => p.isLocal);
  const remoteParticipant = participants.find((p) => !p.isLocal);

  return (
    <div className="h-screen flex flex-col bg-[#1E2019] text-[#D3D0CB] overflow-hidden">
      {/* Candidate Screen Share Request Banner */}
      {screenSharePrompt && !isInterviewer && (
        <div className="bg-[#E2C044] text-[#1E2019] px-4 py-2 flex items-center justify-between text-xs font-medium z-30 shadow-md">
          <div className="flex items-center gap-2">
            <MonitorUp className="w-4 h-4" />
            <span>{screenSharePrompt.message}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApproveScreenPrompt}
              className="px-3 py-1 bg-[#1E2019] text-[#D3D0CB] font-semibold text-xs rounded hover:bg-[#393E41] transition-colors flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Screen</span>
            </button>
            <button
              type="button"
              onClick={handleDismissScreenPrompt}
              className="px-2 py-1 text-xs text-[#1E2019] hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Interviewer Waiting Candidate Notification Banner */}
      {isInterviewer && waitingCandidates.length > 0 && (
        <div className="bg-[#E2C044]/15 border-b border-[#E2C044]/40 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#D3D0CB] font-medium">
            <UserCheck className="w-4 h-4 text-[#E2C044]" />
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
      <header className="h-12 border-b border-[#393E41] bg-[#1E2019] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm tracking-tight text-[#D3D0CB]">Crucible</span>
          <span className="text-xs text-[#D3D0CB]/40">/</span>
          <span className="text-xs font-medium text-[#D3D0CB]">{statusData.candidateName}</span>
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

          {/* Media Presence Status Indicator */}
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#D3D0CB]/60">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionState === 'connected'
                  ? 'bg-emerald-400'
                  : connectionState === 'connecting'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-[#587B7F]'
              }`}
            />
            <span className="capitalize">{connectionState}</span>
          </div>

          {/* Cloud Recording Status & Double-Consent Indicator */}
          <RecordingControls
            interviewId={interviewId}
            isInterviewer={isInterviewer}
            recordingStatus={recordingStatus}
            onStatusChange={fetchRecordingStatus}
          />
        </div>

        {/* Center: Workspace Toggle & Timer */}
        <div className="flex items-center gap-3">
          {/* Workspace Tabs: Code Editor / Whiteboard */}
          <div className="flex items-center bg-[#393E41]/60 p-0.5 rounded border border-[#393E41]">
            <button
              type="button"
              onClick={() => setCenterView('code')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                centerView === 'code'
                  ? 'bg-[#E2C044] text-[#1E2019] font-semibold'
                  : 'text-[#D3D0CB]/70 hover:text-[#D3D0CB]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Code Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setCenterView('whiteboard')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                centerView === 'whiteboard'
                  ? 'bg-[#E2C044] text-[#1E2019] font-semibold'
                  : 'text-[#D3D0CB]/70 hover:text-[#D3D0CB]'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Whiteboard</span>
            </button>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-1.5 font-mono text-xs text-[#D3D0CB]/70 bg-[#393E41]/30 px-2.5 py-1 rounded border border-[#393E41]">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Active Screen Share Pill (if screen share is running) */}
          {activeScreenShare && (
            <button
              type="button"
              onClick={() => setIsScreenTheaterOpen(true)}
              className="px-2.5 py-1 bg-[#E2C044] text-[#1E2019] font-semibold text-xs rounded flex items-center gap-1.5 transition-colors animate-pulse"
              title="Click to view shared screen"
            >
              <MonitorUp className="w-3.5 h-3.5" />
              <span>Viewing Screen: {activeScreenShare.participantName}</span>
            </button>
          )}

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

      {/* Main Workspace (Section 13) */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Question Panel and Test Results */}
        <div className="w-80 md:w-96 shrink-0 h-full">
          <QuestionPanel
            questions={statusData.questions}
            activeQuestionId={activeQuestionId}
            onSelectQuestion={(qId) => {
              setActiveQuestionId(qId);
              const targetIQ = statusData.questions.find((q) => q.question.id === qId);
              if (targetIQ?.language) {
                setSelectedLanguage(targetIQ.language as SupportedLanguage);
              }
            }}
            isInterviewer={isInterviewer}
            onAttachQuestionClick={() => setIsAttachModalOpen(true)}
            latestRun={latestRun}
          />
        </div>

        {/* Center: Editor (default), switchable to Whiteboard. Run controls beneath. */}
        <div className="flex-1 flex flex-col h-full min-w-0 border-r border-[#393E41]">
          <div className="flex-1 relative overflow-hidden">
            {centerView === 'code' ? (
              <CodeEditor
                key={documentName}
                documentName={documentName}
                authToken={tokenParam || 'interviewer-session'}
                userName={
                  isInterviewer
                    ? user?.displayName || 'Interviewer'
                    : candidateNameInput || 'Candidate'
                }
                isInterviewer={isInterviewer}
                isLocked={statusData.isLocked || statusData.status === 'completed'}
                language={selectedLanguage}
                onLanguageChange={handleLanguageChange}
                starterCode={starterCode}
                onCodeChange={setCurrentCode}
              />
            ) : (
              <Whiteboard
                key={`wb:${activeIQ?.id || 'root'}`}
                interviewId={interviewId}
                activeQuestionId={activeIQ?.id}
                readOnly={!isInterviewer && (statusData.isLocked || statusData.status === 'completed')}
              />
            )}
          </div>

          {/* Run controls beneath editor/whiteboard */}
          <RunControls
            language={selectedLanguage}
            onLanguageChange={handleLanguageChange}
            onRunTests={handleRunTests}
            onRunCustom={handleRunCustom}
            isRunning={isRunningTests}
            disabled={statusData.status === 'completed'}
          />
        </div>

        {/* Right: Video tiles (small), media controls, then interviewer-only panel (Section 13) */}
        <div className="w-72 shrink-0 h-full bg-[#1E2019] flex flex-col overflow-hidden text-xs">
          {/* Video Tiles Area */}
          <div className="p-3 border-b border-[#393E41] bg-[#393E41]/10 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#D3D0CB]/60">
              <span className="flex items-center gap-1.5 font-medium text-[#D3D0CB]">
                <Video className="w-3.5 h-3.5 text-[#587B7F]" />
                Live Video & Audio
              </span>
              <span className="text-[10px]">LiveKit SFU</span>
            </div>

            {/* Video Tiles for Participants */}
            <div className="flex flex-col gap-2">
              {/* Local Participant Tile */}
              <VideoTile
                name={isInterviewer ? user?.displayName || 'Interviewer' : candidateNameInput || 'Candidate'}
                isInterviewer={isInterviewer}
                videoTrack={localParticipant?.videoTrack || null}
                audioTrack={localParticipant?.audioTrack || null}
                isMuted={!isMicEnabled}
                isSpeaking={Boolean(localParticipant?.isSpeaking)}
                isLocal={true}
                isScreenSharing={isScreenSharing}
              />

              {/* Remote Participant Tile */}
              <VideoTile
                name={
                  remoteParticipant
                    ? remoteParticipant.name
                    : isInterviewer
                    ? statusData.candidateName || 'Candidate'
                    : 'Interviewer'
                }
                isInterviewer={!isInterviewer}
                videoTrack={remoteParticipant?.videoTrack || null}
                audioTrack={remoteParticipant?.audioTrack || null}
                isMuted={Boolean(remoteParticipant?.isMuted)}
                isSpeaking={Boolean(remoteParticipant?.isSpeaking)}
                isLocal={false}
                isScreenSharing={Boolean(remoteParticipant?.screenShareTrack)}
              />
            </div>

            {/* Media Controls Bar */}
            <MediaControls
              isCameraEnabled={isCameraEnabled}
              isMicEnabled={isMicEnabled}
              isScreenSharing={isScreenSharing}
              onToggleCamera={toggleCamera}
              onToggleMic={toggleMicrophone}
              onToggleScreenShare={toggleScreenShare}
              isInterviewer={isInterviewer}
              onRequestCandidateScreenShare={handleRequestCandidateScreen}
              isRequestingScreen={isRequestingScreen}
            />
          </div>

          {/* Interviewer Tools Panel (Phase 4) */}
          {isInterviewer ? (
            <InterviewerToolsTabs
              interviewId={interviewId}
              elapsedSeconds={elapsedSeconds}
            />
          ) : (
            <div className="flex-1 p-4 flex flex-col items-center justify-center text-center text-[11px] text-[#D3D0CB]/50 space-y-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Interview In Progress</span>
            </div>
          )}
        </div>
      </main>

      {/* Screen Share Expanded Theater View */}
      {activeScreenShare && isScreenTheaterOpen && (
        <ScreenShareTheater
          participantName={activeScreenShare.participantName}
          isInterviewer={activeScreenShare.isInterviewer}
          track={activeScreenShare.track}
          onClose={() => setIsScreenTheaterOpen(false)}
        />
      )}

      {/* Attach Question Modal */}
      <AttachQuestionModal
        interviewId={interviewId}
        isOpen={isAttachModalOpen}
        onClose={() => setIsAttachModalOpen(false)}
        onQuestionAttached={() => fetchStatus()}
      />

      {/* End Interview Confirmation Modal */}
      <EndInterviewModal
        isOpen={isEndModalOpen}
        onOpenChange={setIsEndModalOpen}
        interviewId={interviewId}
        onEnded={() => {
          fetchStatus();
          router.push('/dashboard');
        }}
      />
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
