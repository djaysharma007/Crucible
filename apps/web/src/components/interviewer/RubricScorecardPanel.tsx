'use client';

import * as React from 'react';
import { Award, Check, Info, Loader2, Save } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import {
  RubricTemplateItem,
  ScorecardItem,
  Recommendation,
  RECOMMENDATIONS,
} from '@crucible/shared';

interface RubricScorecardPanelProps {
  interviewId: string;
}

const RECOMMENDATION_LABELS: Record<Recommendation, { label: string; color: string }> = {
  strong_hire: { label: 'Strong Hire', color: 'bg-emerald-600 text-white border-emerald-500' },
  hire: { label: 'Hire', color: 'bg-teal-700 text-white border-teal-600' },
  no_hire: { label: 'No Hire', color: 'bg-amber-700 text-white border-amber-600' },
  strong_no_hire: { label: 'Strong No Hire', color: 'bg-rose-800 text-white border-rose-700' },
};

export function RubricScorecardPanel({ interviewId }: RubricScorecardPanelProps) {
  const [rubric, setRubric] = React.useState<RubricTemplateItem | null>(null);
  const [ratings, setRatings] = React.useState<Record<string, { rating: number; justification: string }>>({});
  const [recommendation, setRecommendation] = React.useState<Recommendation>('hire');
  const [summaryText, setSummaryText] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);
  const [activeCriterionHelp, setActiveCriterionHelp] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const [rubricData, scorecardData] = await Promise.all([
        apiClient<RubricTemplateItem>(`/rooms/${interviewId}/rubric`).catch(() => null),
        apiClient<ScorecardItem | null>(`/rooms/${interviewId}/scorecard`).catch(() => null),
      ]);

      if (rubricData) {
        setRubric(rubricData);
      }

      if (scorecardData) {
        setRecommendation(scorecardData.recommendation);
        setSummaryText(scorecardData.summaryText || '');
        const map: Record<string, { rating: number; justification: string }> = {};
        for (const r of scorecardData.ratings) {
          map[r.criterionId] = {
            rating: r.rating,
            justification: r.justification || '',
          };
        }
        setRatings(map);
      }
    } finally {
      setIsLoading(false);
    }
  }, [interviewId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectRating = (criterionId: string, rating: number) => {
    setRatings((prev) => ({
      ...prev,
      [criterionId]: {
        rating,
        justification: prev[criterionId]?.justification || '',
      },
    }));
    setIsSaved(false);
  };

  const handleJustificationChange = (criterionId: string, justification: string) => {
    setRatings((prev) => ({
      ...prev,
      [criterionId]: {
        rating: prev[criterionId]?.rating || 3,
        justification,
      },
    }));
    setIsSaved(false);
  };

  const handleSaveScorecard = async () => {
    if (!rubric) return;

    try {
      setIsSubmitting(true);
      const formattedRatings = rubric.criteria.map((c) => ({
        criterionId: c.id,
        rating: ratings[c.id]?.rating || 3,
        justification: ratings[c.id]?.justification || null,
      }));

      await apiClient<ScorecardItem>(`/rooms/${interviewId}/scorecard`, {
        method: 'POST',
        body: JSON.stringify({
          recommendation,
          summaryText: summaryText.trim() || null,
          ratings: formattedRatings,
        }),
      });

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      alert((err as Error).message || 'Failed to save scorecard');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-[#D3D0CB]/50 text-xs">
        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
        <span>Loading rubric & scorecard...</span>
      </div>
    );
  }

  if (!rubric) {
    return (
      <div className="p-4 text-center text-[#D3D0CB]/50 text-xs space-y-1">
        <Award className="w-6 h-6 mx-auto opacity-30 text-[#E2C044]" />
        <p>No rubric template attached.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#1E2019] text-[#D3D0CB] text-xs">
      {/* Rubric Header */}
      <div className="px-3 py-2 border-b border-[#393E41] flex items-center justify-between shrink-0 font-mono text-[11px]">
        <div className="flex items-center gap-1.5 text-[#E2C044]">
          <Award className="w-3.5 h-3.5" />
          <span className="font-semibold text-[#D3D0CB] truncate">{rubric.name}</span>
        </div>
        <span className="text-[10px] text-[#D3D0CB]/50 font-sans">
          {rubric.criteria.length} Criteria
        </span>
      </div>

      {/* Criteria & Rating Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {rubric.criteria.map((criterion) => {
          const currentRating = ratings[criterion.id]?.rating || 0;
          const currentJustification = ratings[criterion.id]?.justification || '';
          const isHelpOpen = activeCriterionHelp === criterion.id;

          return (
            <div
              key={criterion.id}
              className="p-2.5 rounded bg-[#393E41]/20 border border-[#393E41] space-y-2"
            >
              <div className="flex items-start justify-between gap-1">
                <div>
                  <span className="font-semibold text-[11px] text-[#D3D0CB]">
                    {criterion.name}
                  </span>
                  <p className="text-[10px] text-[#D3D0CB]/60 mt-0.5 leading-snug">
                    {criterion.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCriterionHelp(isHelpOpen ? null : criterion.id)}
                  className="text-[#D3D0CB]/40 hover:text-[#E2C044] p-0.5"
                  title="View rating level descriptors"
                >
                  <Info className="w-3 h-3" />
                </button>
              </div>

              {/* Level Descriptors Disclosure */}
              {isHelpOpen && criterion.levelDescriptors && (
                <div className="p-2 bg-[#1E2019] border border-[#393E41] rounded text-[10px] space-y-1 font-mono">
                  {Object.entries(criterion.levelDescriptors).map(([lvl, desc]) => (
                    <div key={lvl} className="flex gap-1.5">
                      <span className="font-bold text-[#E2C044]">{lvl}:</span>
                      <span className="text-[#D3D0CB]/70 font-sans">{desc}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Rating Scale Buttons (1-4) */}
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4].map((val) => {
                  const isSelected = currentRating === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSelectRating(criterion.id, val)}
                      className={`flex-1 py-1 text-center font-mono font-semibold rounded text-xs transition-colors border ${
                        isSelected
                          ? 'bg-[#E2C044] border-[#E2C044] text-[#1E2019]'
                          : 'bg-[#393E41]/50 border-[#393E41] text-[#D3D0CB]/70 hover:text-[#D3D0CB] hover:bg-[#393E41]'
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>

              {/* Justification input */}
              <input
                type="text"
                value={currentJustification}
                onChange={(e) => handleJustificationChange(criterion.id, e.target.value)}
                placeholder="Optional notes or justification..."
                className="w-full px-2 py-1 text-[10px] bg-[#1E2019] border border-[#393E41] rounded text-[#D3D0CB] placeholder-[#D3D0CB]/40 focus:border-[#E2C044] focus:outline-none font-sans"
              />
            </div>
          );
        })}

        {/* Overall Recommendation Selector */}
        <div className="p-2.5 rounded bg-[#393E41]/20 border border-[#393E41] space-y-2">
          <span className="font-semibold text-[11px] text-[#D3D0CB] block">
            Overall Recommendation
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {RECOMMENDATIONS.map((rec) => {
              const isSelected = recommendation === rec;
              const meta = RECOMMENDATION_LABELS[rec];
              return (
                <button
                  key={rec}
                  type="button"
                  onClick={() => {
                    setRecommendation(rec);
                    setIsSaved(false);
                  }}
                  className={`py-1.5 px-2 text-center text-[10px] font-semibold rounded border transition-colors ${
                    isSelected
                      ? meta.color
                      : 'bg-[#393E41]/40 border-[#393E41] text-[#D3D0CB]/70 hover:bg-[#393E41]'
                  }`}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary Notes */}
        <div className="space-y-1">
          <label className="font-semibold text-[11px] text-[#D3D0CB] block">
            Candidate Summary & Synthesis
          </label>
          <textarea
            value={summaryText}
            onChange={(e) => {
              setSummaryText(e.target.value);
              setIsSaved(false);
            }}
            placeholder="Summarize key strengths, areas for improvement, and your hiring rationale..."
            rows={3}
            className="w-full p-2 bg-[#393E41]/30 border border-[#393E41] rounded text-[11px] text-[#D3D0CB] placeholder-[#D3D0CB]/40 focus:border-[#E2C044] focus:outline-none resize-none font-sans"
          />
        </div>
      </div>

      {/* Footer Save Action */}
      <div className="p-3 border-t border-[#393E41] bg-[#1E2019] shrink-0 flex items-center justify-between">
        <div className="text-[10px] text-[#D3D0CB]/60 font-mono">
          {isSaved ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <Check className="w-3 h-3" /> Saved to database
            </span>
          ) : (
            <span>Auto-saves on submit</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleSaveScorecard}
          disabled={isSubmitting}
          className="px-3.5 py-1.5 bg-[#E2C044] hover:bg-[#E2C044]/90 text-[#1E2019] font-bold rounded text-xs transition-colors disabled:opacity-40 flex items-center gap-1.5"
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>Save Scorecard</span>
        </button>
      </div>
    </div>
  );
}
