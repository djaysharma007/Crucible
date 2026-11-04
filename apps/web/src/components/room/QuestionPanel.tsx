'use client';

import * as React from 'react';
import { Badge, Tabs, TabsList, TabsTrigger, TabsContent } from '@crucible/ui';
import { CheckCircle2, XCircle, Clock, Cpu, Eye, EyeOff, FileText, Play } from 'lucide-react';
import { RunCodeResponse } from '@crucible/shared';

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  order: number;
}

export interface QuestionLanguage {
  id: string;
  language: string;
  starterCode: string;
}

export interface QuestionDetail {
  id: string;
  title: string;
  descriptionMd: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  languages: QuestionLanguage[];
  testCases: TestCase[];
  hiddenCasesCount?: number;
}

export interface InterviewQuestionItem {
  id: string;
  interviewId: string;
  questionId: string;
  order: number;
  language: string;
  question: QuestionDetail;
}

interface QuestionPanelProps {
  questions: InterviewQuestionItem[];
  activeQuestionId: string | null;
  onSelectQuestion: (questionId: string) => void;
  isInterviewer: boolean;
  onAttachQuestionClick?: () => void;
  latestRun: RunCodeResponse | null;
  defaultTab?: 'problem' | 'testcases' | 'results';
}

export function QuestionPanel({
  questions,
  activeQuestionId,
  onSelectQuestion,
  isInterviewer,
  onAttachQuestionClick,
  latestRun,
  defaultTab = 'problem',
}: QuestionPanelProps) {
  const activeIQ = questions.find((q) => q.question.id === activeQuestionId) || questions[0];
  const question = activeIQ?.question;

  const difficultyVariant = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'success';
      case 'medium':
        return 'warning';
      case 'hard':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1E2019] border-r border-[#393E41] overflow-hidden text-[#D3D0CB]">
      {/* Top Header / Question Tabs */}
      <div className="flex items-center justify-between border-b border-[#393E41] px-3 py-2 bg-[#1E2019]">
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-[280px] no-scrollbar">
          {questions.map((iq, index) => {
            const isSelected = iq.question.id === question?.id;
            return (
              <button
                key={iq.id}
                type="button"
                onClick={() => onSelectQuestion(iq.question.id)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#393E41] text-[#E2C044] font-semibold border border-[#587B7F]'
                    : 'text-[#D3D0CB]/70 hover:bg-[#393E41]/40 hover:text-[#D3D0CB]'
                }`}
              >
                Q{index + 1}: {iq.question.title}
              </button>
            );
          })}
        </div>

        {isInterviewer && onAttachQuestionClick && (
          <button
            type="button"
            onClick={onAttachQuestionClick}
            className="text-xs px-2 py-1 font-mono text-[#E2C044] border border-[#393E41] hover:border-[#E2C044] rounded transition-colors"
          >
            + Attach
          </button>
        )}
      </div>

      {!question ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-[#D3D0CB]/60">
          <FileText className="w-8 h-8 text-[#393E41] mb-2" />
          <p>No question currently selected.</p>
          {isInterviewer && (
            <button
              type="button"
              onClick={onAttachQuestionClick}
              className="mt-3 px-3 py-1.5 text-xs bg-[#E2C044] text-[#1E2019] font-semibold rounded hover:bg-[#E2C044]/90"
            >
              Attach a question from Bank
            </button>
          )}
        </div>
      ) : (
        <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 pt-2 border-b border-[#393E41]">
            <TabsList className="bg-[#1E2019] p-0 gap-3 border-b-0">
              <TabsTrigger
                value="problem"
                className="text-xs px-1 py-1 text-[#D3D0CB]/70 data-[state=active]:text-[#E2C044] data-[state=active]:border-b-2 data-[state=active]:border-[#E2C044] rounded-none bg-transparent"
              >
                Problem
              </TabsTrigger>
              <TabsTrigger
                value="testcases"
                className="text-xs px-1 py-1 text-[#D3D0CB]/70 data-[state=active]:text-[#E2C044] data-[state=active]:border-b-2 data-[state=active]:border-[#E2C044] rounded-none bg-transparent"
              >
                Test Cases ({question.testCases.length + (question.hiddenCasesCount || 0)})
              </TabsTrigger>
              <TabsTrigger
                value="results"
                className="text-xs px-1 py-1 text-[#D3D0CB]/70 data-[state=active]:text-[#E2C044] data-[state=active]:border-b-2 data-[state=active]:border-[#E2C044] rounded-none bg-transparent flex items-center gap-1"
              >
                Results
                {latestRun && (
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      latestRun.allPassed ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Problem Statement */}
          <TabsContent value="problem" className="flex-1 overflow-y-auto p-4 space-y-4 focus:outline-none">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#D3D0CB]">{question.title}</h2>
              <Badge variant={difficultyVariant(question.difficulty)}>
                {question.difficulty.toUpperCase()}
              </Badge>
            </div>

            {question.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {question.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-mono px-2 py-0.5 bg-[#393E41]/50 border border-[#393E41] rounded text-[#D3D0CB]/70"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="text-xs leading-relaxed text-[#D3D0CB]/90 whitespace-pre-wrap font-sans">
              {question.descriptionMd}
            </div>
          </TabsContent>

          {/* Test Cases List */}
          <TabsContent value="testcases" className="flex-1 overflow-y-auto p-4 space-y-3 focus:outline-none">
            <div className="text-xs text-[#D3D0CB]/70 mb-2">
              The solution will be evaluated against visible and hidden test cases:
            </div>

            {question.testCases.map((tc, idx) => (
              <div
                key={tc.id || idx}
                className="border border-[#393E41] bg-[#1E2019] rounded p-3 text-xs space-y-2 font-mono"
              >
                <div className="flex items-center justify-between text-[#D3D0CB]/70 border-b border-[#393E41] pb-1.5">
                  <span className="font-semibold text-[#D3D0CB]">Case {idx + 1}</span>
                  {tc.isHidden ? (
                    <span className="flex items-center gap-1 text-[11px] text-[#E2C044]">
                      <EyeOff className="w-3 h-3" /> Hidden Case
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                      <Eye className="w-3 h-3" /> Visible
                    </span>
                  )}
                </div>

                <div>
                  <div className="text-[11px] text-[#D3D0CB]/60">Input:</div>
                  <pre className="mt-1 p-2 bg-[#393E41]/30 rounded text-[#D3D0CB] overflow-x-auto text-[11px]">
                    {tc.input}
                  </pre>
                </div>

                <div>
                  <div className="text-[11px] text-[#D3D0CB]/60">Expected Output:</div>
                  <pre className="mt-1 p-2 bg-[#393E41]/30 rounded text-[#D3D0CB] overflow-x-auto text-[11px]">
                    {tc.expectedOutput}
                  </pre>
                </div>
              </div>
            ))}

            {/* Candidate summary of hidden test cases */}
            {!isInterviewer && (question.hiddenCasesCount ?? 0) > 0 && (
              <div className="border border-dashed border-[#587B7F] bg-[#587B7F]/10 rounded p-3 text-xs text-[#D3D0CB]">
                <div className="flex items-center gap-2 font-mono font-medium text-[#E2C044]">
                  <EyeOff className="w-4 h-4" />
                  <span>+{question.hiddenCasesCount} Hidden Evaluation Cases</span>
                </div>
                <p className="mt-1 text-[11px] text-[#D3D0CB]/70 font-sans">
                  Additional private evaluation test cases will be executed when you click &quot;Run Tests&quot;. You will receive an aggregate pass/fail count.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Test Execution Results */}
          <TabsContent value="results" className="flex-1 overflow-y-auto p-4 space-y-3 focus:outline-none">
            {!latestRun ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-xs text-[#D3D0CB]/50">
                <Play className="w-6 h-6 mb-2 text-[#393E41]" />
                <p>No test results yet.</p>
                <p className="text-[11px] text-[#D3D0CB]/40 mt-1">
                  Click &quot;Run Tests&quot; in the center panel to evaluate your code.
                </p>
              </div>
            ) : (
              <div className="space-y-3 font-mono text-xs">
                {/* Overall summary banner */}
                <div
                  className={`border rounded p-3 flex items-center justify-between ${
                    latestRun.allPassed
                      ? 'border-emerald-600 bg-emerald-950/30'
                      : 'border-rose-600 bg-rose-950/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {latestRun.allPassed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    )}
                    <div>
                      <div className="font-semibold text-[#D3D0CB]">
                        {latestRun.allPassed ? 'All Test Cases Passed' : 'Tests Failed'}
                      </div>
                      <div className="text-[11px] text-[#D3D0CB]/70">
                        {latestRun.passedCases} of {latestRun.totalCases} test cases passed
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-[#D3D0CB]/60">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {latestRun.durationMs}ms
                    </span>
                  </div>
                </div>

                {/* Visible Results list */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-[#D3D0CB]/70 uppercase tracking-wider">
                    Visible Cases
                  </div>
                  {latestRun.visibleResults.map((r, i) => (
                    <div
                      key={r.testCaseId || i}
                      className="border border-[#393E41] bg-[#1E2019] rounded p-2.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#D3D0CB]">Case {i + 1}</span>
                        <Badge variant={r.passed ? 'success' : 'danger'}>
                          {r.passed ? 'Passed' : r.status || 'Failed'}
                        </Badge>
                      </div>

                      {r.input && (
                        <div className="text-[11px]">
                          <span className="text-[#D3D0CB]/50">Input: </span>
                          <span className="text-[#D3D0CB]">{r.input}</span>
                        </div>
                      )}

                      {r.expectedOutput && (
                        <div className="text-[11px]">
                          <span className="text-[#D3D0CB]/50">Expected: </span>
                          <span className="text-[#D3D0CB]">{r.expectedOutput}</span>
                        </div>
                      )}

                      {r.actualOutput && (
                        <div className="text-[11px]">
                          <span className="text-[#D3D0CB]/50">Output: </span>
                          <span className={r.passed ? 'text-emerald-400' : 'text-rose-400'}>
                            {r.actualOutput}
                          </span>
                        </div>
                      )}

                      {r.stderr && (
                        <pre className="text-[11px] text-rose-400 bg-rose-950/30 p-1.5 rounded overflow-x-auto">
                          {r.stderr}
                        </pre>
                      )}

                      <div className="flex items-center gap-3 text-[10px] text-[#D3D0CB]/50 pt-1 border-t border-[#393E41]/50">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {r.runtimeMs}ms
                        </span>
                        <span className="flex items-center gap-1">
                          <Cpu className="w-3 h-3" /> {r.memoryKb}KB
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Hidden Cases Summary */}
                {latestRun.hiddenSummary.total > 0 && (
                  <div className="border border-[#587B7F] bg-[#587B7F]/10 rounded p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#D3D0CB] flex items-center gap-1.5">
                        <EyeOff className="w-3.5 h-3.5 text-[#E2C044]" />
                        Hidden Cases Evaluation
                      </span>
                      <Badge
                        variant={
                          latestRun.hiddenSummary.passed === latestRun.hiddenSummary.total
                            ? 'success'
                            : 'danger'
                        }
                      >
                        {latestRun.hiddenSummary.passed} / {latestRun.hiddenSummary.total} Passed
                      </Badge>
                    </div>

                    {/* Interviewer detailed view of hidden cases if available */}
                    {isInterviewer && latestRun.hiddenResults && (
                      <div className="pt-2 border-t border-[#393E41] space-y-1.5">
                        <div className="text-[11px] text-[#E2C044] font-medium">
                          Interviewer Detailed View:
                        </div>
                        {latestRun.hiddenResults.map((hr, idx) => (
                          <div
                            key={hr.testCaseId || idx}
                            className="bg-[#1E2019] p-2 rounded border border-[#393E41] text-[11px]"
                          >
                            <div className="flex items-center justify-between">
                              <span>Hidden #{idx + 1}</span>
                              <span className={hr.passed ? 'text-emerald-400' : 'text-rose-400'}>
                                {hr.passed ? 'Passed' : 'Failed'}
                              </span>
                            </div>
                            <div>Input: {hr.input}</div>
                            <div>Expected: {hr.expectedOutput}</div>
                            <div>Actual: {hr.actualOutput}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
