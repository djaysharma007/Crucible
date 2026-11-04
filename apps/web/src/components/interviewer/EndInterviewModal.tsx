'use client';

import * as React from 'react';
import { LogOut, AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@crucible/ui';
import { apiClient } from '@/lib/api-client';

interface EndInterviewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  interviewId: string;
  onEnded: () => void;
}

export function EndInterviewModal({
  isOpen,
  onOpenChange,
  interviewId,
  onEnded,
}: EndInterviewModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleEndInterview = async () => {
    try {
      setIsSubmitting(true);
      await apiClient(`/rooms/${interviewId}/end`, {
        method: 'POST',
      });
      onOpenChange(false);
      onEnded();
    } catch (err) {
      alert((err as Error).message || 'Failed to end interview');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#1E2019] border-[#393E41] text-[#D3D0CB]">
        <DialogHeader>
          <DialogTitle className="text-base text-[#D3D0CB] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            End Technical Interview?
          </DialogTitle>
          <DialogDescription className="text-xs text-[#D3D0CB]/70 leading-relaxed">
            Ending the interview marks the session as completed and transitions the candidate to the
            conclusion screen. The code, whiteboard, and timeline will be locked for review.
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 my-2 bg-[#393E41]/20 border border-[#393E41] rounded text-xs space-y-1.5 font-sans">
          <p className="font-semibold text-[#E2C044]">Before ending:</p>
          <ul className="list-disc list-inside space-y-1 text-[#D3D0CB]/70 text-[11px]">
            <li>Ensure you have saved your scorecard ratings and recommendation.</li>
            <li>Any final private notes are committed to the timeline.</li>
          </ul>
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-3 py-1.5 text-xs border border-[#393E41] rounded text-[#D3D0CB] hover:bg-[#393E41]/50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleEndInterview}
            disabled={isSubmitting}
            className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            <span>End Interview Session</span>
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
