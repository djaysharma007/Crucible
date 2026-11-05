'use client';

import * as React from 'react';
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
import { Plus, Search, Loader2 } from 'lucide-react';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@crucible/shared';

interface QuestionBankItem {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  descriptionMd: string;
  languages: { language: string; starterCode: string }[];
  testCases: { input: string; expectedOutput: string; isHidden: boolean }[];
}

interface AttachQuestionModalProps {
  interviewId: string;
  isOpen: boolean;
  onClose: () => void;
  onQuestionAttached: () => void;
}

export function AttachQuestionModal({
  interviewId,
  isOpen,
  onClose,
  onQuestionAttached,
}: AttachQuestionModalProps) {
  const [questions, setQuestions] = React.useState<QuestionBankItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [selectedQuestionId, setSelectedQuestionId] = React.useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = React.useState<SupportedLanguage>('typescript');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;

    const loadBank = async () => {
      try {
        setIsLoading(true);
        const data = await apiClient<QuestionBankItem[]>('/questions');
        setQuestions(data);
        const first = data[0];
        if (first && !selectedQuestionId) {
          setSelectedQuestionId(first.id);
        }
      } catch {
        // Handled
      } finally {
        setIsLoading(false);
      }
    };

    loadBank();
  }, [isOpen, selectedQuestionId]);

  const filteredQuestions = React.useMemo(() => {
    return questions.filter(
      (q) =>
        q.title.toLowerCase().includes(search.toLowerCase()) ||
        q.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
    );
  }, [questions, search]);

  const handleAttach = async () => {
    if (!selectedQuestionId) return;
    try {
      setIsSubmitting(true);
      await apiClient.post(`/interviews/${interviewId}/questions`, {
        questionId: selectedQuestionId,
        language: selectedLanguage,
      });

      onQuestionAttached();
      onClose();
    } catch {
      // Handled
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedQuestion = questions.find((q) => q.id === selectedQuestionId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-[#1E2019] text-[#D3D0CB] border border-[#393E41]">
        <DialogHeader>
          <DialogTitle className="text-[#D3D0CB] text-base font-semibold">
            Attach Question to Interview
          </DialogTitle>
          <DialogDescription className="text-[#D3D0CB]/70 text-xs">
            Choose a problem from your Question Bank to assign to the candidate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#D3D0CB]/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search problems by title or tag..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#393E41]/30 border border-[#393E41] rounded text-[#D3D0CB] focus:border-[#E2C044] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-64">
            {/* Left list */}
            <div className="border border-[#393E41] rounded overflow-y-auto divide-y divide-[#393E41]/50 bg-[#1E2019]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full text-xs text-[#D3D0CB]/50">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading Question Bank...
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-[#D3D0CB]/50 p-4 text-center">
                  No questions found. Seed or create questions in the Question Bank dashboard.
                </div>
              ) : (
                filteredQuestions.map((q) => {
                  const isSelected = q.id === selectedQuestionId;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setSelectedQuestionId(q.id)}
                      className={`w-full p-2.5 text-left transition-colors flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-[#393E41] border-l-2 border-[#E2C044]'
                          : 'hover:bg-[#393E41]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs text-[#D3D0CB]">{q.title}</span>
                        <Badge
                          variant={
                            q.difficulty === 'easy'
                              ? 'success'
                              : q.difficulty === 'medium'
                                ? 'warning'
                                : 'danger'
                          }
                        >
                          {q.difficulty}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-[#D3D0CB]/60">
                        {q.testCases.length} test cases | {q.languages.length} languages
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Right preview */}
            <div className="border border-[#393E41] rounded p-3 bg-[#393E41]/20 flex flex-col text-xs overflow-hidden">
              {selectedQuestion ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="font-semibold text-[#D3D0CB] mb-1">{selectedQuestion.title}</div>
                  <div className="text-[11px] text-[#D3D0CB]/80 flex-1 overflow-y-auto whitespace-pre-wrap pr-1">
                    {selectedQuestion.descriptionMd}
                  </div>

                  <div className="pt-2 border-t border-[#393E41] mt-2">
                    <label
                      htmlFor="starter-lang"
                      className="text-[11px] text-[#D3D0CB]/70 font-mono block mb-1"
                    >
                      Initial Starter Language:
                    </label>
                    <select
                      id="starter-lang"
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value as SupportedLanguage)}
                      className="w-full px-2 py-1 text-xs font-mono bg-[#393E41] border border-[#587B7F] rounded text-[#D3D0CB]"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-[#D3D0CB]/40">
                  Select a question to preview
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs border border-[#393E41] rounded text-[#D3D0CB] hover:bg-[#393E41]/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAttach}
            disabled={!selectedQuestionId || isSubmitting}
            className="px-4 py-1.5 text-xs font-medium bg-[#E2C044] hover:bg-[#E2C044]/90 text-[#1E2019] rounded disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Attach Question
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
