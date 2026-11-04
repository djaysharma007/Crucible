'use client';

import * as React from 'react';
import { Circle, Radio, Check, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@crucible/ui';
import { apiClient } from '@/lib/api-client';
import { RecordingStatusResponse } from '@crucible/shared';

interface RecordingControlsProps {
  interviewId: string;
  isInterviewer: boolean;
  recordingStatus: RecordingStatusResponse | null;
  onStatusChange: () => void;
}

export function RecordingControls({
  interviewId,
  isInterviewer,
  recordingStatus,
  onStatusChange,
}: RecordingControlsProps) {
  const [isConsentModalOpen, setIsConsentModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isRecording = Boolean(recordingStatus?.isRecording);
  const myConsent = isInterviewer
    ? Boolean(recordingStatus?.interviewerConsented)
    : Boolean(recordingStatus?.candidateConsented);

  const canStartRecording =
    isInterviewer &&
    Boolean(recordingStatus?.interviewerConsented) &&
    Boolean(recordingStatus?.candidateConsented);

  const handleToggleConsent = async (consented: boolean) => {
    try {
      setIsSubmitting(true);
      await apiClient.post(`/rooms/${interviewId}/recording/consent`, {
        consented,
      });
      onStatusChange();
    } catch {
      // Handled
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      setIsSubmitting(true);
      await apiClient.post(`/rooms/${interviewId}/recording/start`);
      onStatusChange();
      setIsConsentModalOpen(false);
    } catch (err) {
      alert((err as Error).message || 'Failed to start cloud recording');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStopRecording = async () => {
    if (!confirm('Are you sure you want to stop cloud session recording?')) return;
    try {
      setIsSubmitting(true);
      await apiClient.post(`/rooms/${interviewId}/recording/stop`);
      onStatusChange();
    } catch (err) {
      alert((err as Error).message || 'Failed to stop recording');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Top Bar Indicator Button */}
      <div className="flex items-center gap-1.5 font-mono text-xs">
        {isRecording ? (
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-rose-600/50 bg-rose-950/40 text-rose-300 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>REC</span>
            </span>

            {isInterviewer && (
              <button
                type="button"
                onClick={handleStopRecording}
                disabled={isSubmitting}
                className="px-2 py-0.5 text-[10px] border border-[#393E41] hover:border-rose-400 rounded text-[#D3D0CB] transition-colors"
              >
                Stop Rec
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsConsentModalOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded border border-[#393E41] hover:border-[#587B7F] text-[#D3D0CB]/70 hover:text-[#D3D0CB] text-[11px] transition-colors"
            title="Cloud session recording options"
          >
            <Circle className="w-2.5 h-2.5 text-[#587B7F]" />
            <span>{isInterviewer ? 'Record Session' : 'Recording Consent'}</span>
          </button>
        )}
      </div>

      {/* Recording Consent & Control Dialog */}
      <Dialog open={isConsentModalOpen} onOpenChange={setIsConsentModalOpen}>
        <DialogContent className="max-w-md bg-[#1E2019] border-[#393E41] text-[#D3D0CB]">
          <DialogHeader>
            <DialogTitle className="text-base text-[#D3D0CB] flex items-center gap-2">
              <Radio className="w-4 h-4 text-rose-400" />
              Cloud Session Recording
            </DialogTitle>
            <DialogDescription className="text-xs text-[#D3D0CB]/70 leading-relaxed">
              Crucible records technical interviews via LiveKit cloud egress. To protect candidate and interviewer privacy, recording starts only after both parties have explicitly granted consent.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-3 text-xs font-mono">
            {/* Double-consent status cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded bg-[#393E41]/30 border border-[#393E41] flex flex-col gap-1">
                <span className="text-[10px] text-[#D3D0CB]/60">Interviewer Consent</span>
                <div className="flex items-center gap-1.5 font-medium">
                  {recordingStatus?.interviewerConsented ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 text-xs">Granted</span>
                    </>
                  ) : (
                    <>
                      <X className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-[#D3D0CB]/60 text-xs">Pending</span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#393E41]/30 border border-[#393E41] flex flex-col gap-1">
                <span className="text-[10px] text-[#D3D0CB]/60">Candidate Consent</span>
                <div className="flex items-center gap-1.5 font-medium">
                  {recordingStatus?.candidateConsented ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 text-xs">Granted</span>
                    </>
                  ) : (
                    <>
                      <X className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-[#D3D0CB]/60 text-xs">Pending</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* My Consent Toggle */}
            <div className="p-3 bg-[#393E41]/20 border border-[#393E41] rounded flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-semibold text-xs text-[#D3D0CB]">
                  {isInterviewer ? 'Your Consent (Interviewer)' : 'Your Consent (Candidate)'}
                </div>
                <div className="text-[11px] text-[#D3D0CB]/60 font-sans">
                  Allow video, audio, and shared editor recording to cloud storage.
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleConsent(!myConsent)}
                disabled={isSubmitting}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  myConsent
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-[#393E41] hover:bg-[#393E41]/80 text-[#D3D0CB]'
                }`}
              >
                {myConsent ? 'Consented' : 'Grant Consent'}
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setIsConsentModalOpen(false)}
              className="px-3 py-1.5 text-xs border border-[#393E41] rounded text-[#D3D0CB] hover:bg-[#393E41]/50"
            >
              Close
            </button>

            {isInterviewer && (
              <button
                type="button"
                onClick={handleStartRecording}
                disabled={!canStartRecording || isSubmitting || isRecording}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Radio className="w-3.5 h-3.5" />
                )}
                <span>Start Cloud Recording</span>
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

