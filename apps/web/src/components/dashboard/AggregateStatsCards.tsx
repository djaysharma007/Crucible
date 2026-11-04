'use client';

import * as React from 'react';
import { Users, CheckCircle2, Clock, Award } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { InterviewStatsResponse } from '@crucible/shared';

export function AggregateStatsCards() {
  const [stats, setStats] = React.useState<InterviewStatsResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadStats() {
      try {
        const data = await apiClient<InterviewStatsResponse>('/interviews/stats');
        setStats(data);
      } catch {
        // Ignored
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-surface border border-border rounded-panel animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Total Interviews */}
      <div className="p-3.5 bg-surface border border-border rounded-panel flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[11px] font-mono text-muted uppercase tracking-wider block">
            Total Interviews
          </span>
          <span className="text-xl font-mono font-bold text-primary">{stats.totalInterviews}</span>
        </div>
        <div className="w-8 h-8 rounded bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
          <Users className="w-4 h-4" />
        </div>
      </div>

      {/* Completed Interviews */}
      <div className="p-3.5 bg-surface border border-border rounded-panel flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[11px] font-mono text-muted uppercase tracking-wider block">
            Completed Sessions
          </span>
          <span className="text-xl font-mono font-bold text-primary">{stats.completedInterviews}</span>
        </div>
        <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
        </div>
      </div>

      {/* Average Duration */}
      <div className="p-3.5 bg-surface border border-border rounded-panel flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[11px] font-mono text-muted uppercase tracking-wider block">
            Average Duration
          </span>
          <span className="text-xl font-mono font-bold text-primary">
            {stats.averageDurationMinutes} <span className="text-xs font-normal text-muted">mins</span>
          </span>
        </div>
        <div className="w-8 h-8 rounded bg-[#587B7F]/10 border border-[#587B7F]/20 flex items-center justify-center text-[#587B7F]">
          <Clock className="w-4 h-4" />
        </div>
      </div>

      {/* Recommendation Distribution */}
      <div className="p-3 bg-surface border border-border rounded-panel flex flex-col justify-between">
        <div className="flex items-center justify-between pb-1">
          <span className="text-[10px] font-mono text-muted uppercase tracking-wider">
            Recommendations
          </span>
          <Award className="w-3.5 h-3.5 text-accent" />
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span
            className="px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-semibold"
            title="Strong Hire & Hire"
          >
            +{stats.recommendationCounts.strong_hire + stats.recommendationCounts.hire}
          </span>
          <span
            className="px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 font-semibold"
            title="No Hire"
          >
            -{stats.recommendationCounts.no_hire}
          </span>
          <span
            className="px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 font-semibold"
            title="Strong No Hire"
          >
            --{stats.recommendationCounts.strong_no_hire}
          </span>
          <span
            className="px-1.5 py-0.5 rounded bg-surface-muted text-muted"
            title="Pending Scorecard"
          >
            ?{stats.recommendationCounts.pending}
          </span>
        </div>
      </div>
    </div>
  );
}
