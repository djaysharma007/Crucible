'use client';

import * as React from 'react';
import { Users2, Clock, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Badge,
} from '@crucible/ui';
import { apiClient } from '@/lib/api-client';
import { CandidateComparisonResponse, Recommendation } from '@crucible/shared';

interface CandidateComparisonModalProps {
  id1: string | null;
  id2: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const REC_BADGE: Record<Recommendation, { label: string; variant: 'accent' | 'secondary' | 'danger' | 'default' }> = {
  strong_hire: { label: 'Strong Hire', variant: 'accent' },
  hire: { label: 'Hire', variant: 'accent' },
  no_hire: { label: 'No Hire', variant: 'danger' },
  strong_no_hire: { label: 'Strong No Hire', variant: 'danger' },
};

export function CandidateComparisonModal({
  id1,
  id2,
  isOpen,
  onOpenChange,
}: CandidateComparisonModalProps) {
  const [data, setData] = React.useState<CandidateComparisonResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen || !id1 || !id2) return;

    async function loadComparison() {
      try {
        setIsLoading(true);
        const res = await apiClient<CandidateComparisonResponse>(
          `/interviews/compare?id1=${id1}&id2=${id2}`,
        );
        setData(res);
      } catch (err) {
        alert((err as Error).message || 'Failed to compare candidates');
        onOpenChange(false);
      } finally {
        setIsLoading(false);
      }
    }

    loadComparison();
  }, [isOpen, id1, id2, onOpenChange]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-surface border-border text-primary">
        <DialogHeader>
          <DialogTitle className="text-base text-primary flex items-center gap-2">
            <Users2 className="w-4 h-4 text-accent" />
            Side-by-Side Candidate Comparison
          </DialogTitle>
          <DialogDescription className="text-xs text-muted">
            Compare scoring rubrics, recommendations, problem solutions, and test outcomes.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-muted text-xs">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span>Loading candidate comparison...</span>
          </div>
        ) : !data ? null : (
          <div className="space-y-4 my-2 text-xs">
            {/* Candidate Overview Columns */}
            <div className="grid grid-cols-2 gap-3">
              {/* Candidate A */}
              <div className="p-3 bg-surface-muted/30 border border-border rounded-panel space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-semibold text-sm text-primary">
                      {data.interviewA.candidateName}
                    </span>
                    <p className="text-[11px] text-muted">{data.interviewA.roleTitle || 'Candidate A'}</p>
                  </div>
                  {data.interviewA.scorecard && (
                    <Badge variant={REC_BADGE[data.interviewA.scorecard.recommendation]?.variant || 'default'}>
                      {REC_BADGE[data.interviewA.scorecard.recommendation]?.label || data.interviewA.scorecard.recommendation}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-muted">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-accent" />
                    {Math.round(data.interviewA.durationSeconds / 60)} mins
                  </span>
                  <span>{data.interviewA.questions.length} Questions</span>
                </div>
              </div>

              {/* Candidate B */}
              <div className="p-3 bg-surface-muted/30 border border-border rounded-panel space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-semibold text-sm text-primary">
                      {data.interviewB.candidateName}
                    </span>
                    <p className="text-[11px] text-muted">{data.interviewB.roleTitle || 'Candidate B'}</p>
                  </div>
                  {data.interviewB.scorecard && (
                    <Badge variant={REC_BADGE[data.interviewB.scorecard.recommendation]?.variant || 'default'}>
                      {REC_BADGE[data.interviewB.scorecard.recommendation]?.label || data.interviewB.scorecard.recommendation}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-muted">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-accent" />
                    {Math.round(data.interviewB.durationSeconds / 60)} mins
                  </span>
                  <span>{data.interviewB.questions.length} Questions</span>
                </div>
              </div>
            </div>

            {/* Criteria Breakdown Table */}
            <div className="border border-border rounded-panel overflow-hidden">
              <div className="px-3 py-2 bg-surface-muted/60 border-b border-border flex items-center justify-between text-[11px] font-mono text-muted">
                <span>Rubric Criterion</span>
                <div className="flex items-center gap-12 pr-4">
                  <span>{data.interviewA.candidateName}</span>
                  <span>{data.interviewB.candidateName}</span>
                </div>
              </div>

              <div className="divide-y divide-border">
                {data.criteria.length === 0 ? (
                  <div className="p-4 text-center text-muted text-xs">
                    No matching rubric criteria found between these interviews.
                  </div>
                ) : (
                  data.criteria.map((crit) => (
                    <div key={crit.criterionId} className="px-3 py-2 flex items-center justify-between">
                      <span className="font-medium text-primary text-xs">{crit.name}</span>
                      <div className="flex items-center gap-14 pr-8 font-mono text-xs">
                        <span
                          className={`w-6 h-6 rounded flex items-center justify-center font-bold ${
                            crit.ratingA && crit.ratingA >= 3
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
                              : 'bg-surface-muted text-muted'
                          }`}
                        >
                          {crit.ratingA ?? '—'}
                        </span>
                        <span
                          className={`w-6 h-6 rounded flex items-center justify-center font-bold ${
                            crit.ratingB && crit.ratingB >= 3
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
                              : 'bg-surface-muted text-muted'
                          }`}
                        >
                          {crit.ratingB ?? '—'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Summary Text Comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 bg-surface-muted/20 border border-border rounded text-[11px] space-y-1">
                <span className="font-semibold text-primary block">A: Hiring Rationale</span>
                <p className="text-muted leading-relaxed font-sans">
                  {data.interviewA.scorecard?.summaryText || 'No summary text provided.'}
                </p>
              </div>

              <div className="p-2.5 bg-surface-muted/20 border border-border rounded text-[11px] space-y-1">
                <span className="font-semibold text-primary block">B: Hiring Rationale</span>
                <p className="text-muted leading-relaxed font-sans">
                  {data.interviewB.scorecard?.summaryText || 'No summary text provided.'}
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-3 py-1.5 text-xs border border-border rounded-control text-primary hover:bg-surface-muted"
          >
            Close Comparison
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
