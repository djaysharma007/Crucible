import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestionPanel, InterviewQuestionItem } from './QuestionPanel';
import { RunControls } from './RunControls';
import { RunCodeResponse } from '@crucible/shared';

const mockQuestions: InterviewQuestionItem[] = [
  {
    id: 'iq-1',
    interviewId: 'int-1',
    questionId: 'q-1',
    order: 0,
    language: 'typescript',
    question: {
      id: 'q-1',
      title: 'Reverse String',
      descriptionMd: 'Write a function that reverses an input string.',
      difficulty: 'easy',
      tags: ['string'],
      languages: [{ id: 'ql-1', language: 'typescript', starterCode: 'function reverse() {}' }],
      testCases: [
        { id: 'tc-1', input: 'hello', expectedOutput: 'olleh', isHidden: false, order: 0 },
      ],
      hiddenCasesCount: 2,
    },
  },
];

describe('Phase 2 Room Frontend Components', () => {
  it('renders QuestionPanel with problem statement and visible test cases', () => {
    render(
      <QuestionPanel
        questions={mockQuestions}
        activeQuestionId="q-1"
        onSelectQuestion={vi.fn()}
        isInterviewer={false}
        latestRun={null}
      />,
    );

    expect(screen.getByText('Reverse String')).toBeDefined();
    expect(screen.getByText('EASY')).toBeDefined();
    expect(screen.getByText(/Write a function that reverses an input string/)).toBeDefined();
  });

  it('renders candidate hidden cases indicator in testcases tab', () => {
    render(
      <QuestionPanel
        questions={mockQuestions}
        activeQuestionId="q-1"
        onSelectQuestion={vi.fn()}
        isInterviewer={false}
        latestRun={null}
        defaultTab="testcases"
      />,
    );

    expect(screen.getByText('+2 Hidden Evaluation Cases')).toBeDefined();
    expect(screen.getByText('hello')).toBeDefined();
    expect(screen.getByText('olleh')).toBeDefined();
  });

  it('renders execution results when latestRun is provided', () => {
    const mockRun: RunCodeResponse = {
      runId: 'run-1',
      interviewQuestionId: 'iq-1',
      language: 'typescript',
      allPassed: true,
      totalCases: 3,
      passedCases: 3,
      visibleResults: [
        {
          testCaseId: 'tc-1',
          order: 0,
          passed: true,
          status: 'Accepted',
          input: 'hello',
          expectedOutput: 'olleh',
          actualOutput: 'olleh',
          runtimeMs: 12,
          memoryKb: 1024,
          isHidden: false,
        },
      ],
      hiddenSummary: {
        total: 2,
        passed: 2,
      },
      durationMs: 45,
    };

    render(
      <QuestionPanel
        questions={mockQuestions}
        activeQuestionId="q-1"
        onSelectQuestion={vi.fn()}
        isInterviewer={false}
        latestRun={mockRun}
        defaultTab="results"
      />,
    );

    expect(screen.getByText('All Test Cases Passed')).toBeDefined();
    expect(screen.getByText(/3 of 3 test cases passed/)).toBeDefined();
    expect(screen.getByText('2 / 2 Passed')).toBeDefined();
  });

  it('renders RunControls with language selector and run buttons', () => {
    const onRunTests = vi.fn().mockResolvedValue(undefined);
    const onRunCustom = vi.fn();
    const onLanguageChange = vi.fn();

    render(
      <RunControls
        language="typescript"
        onLanguageChange={onLanguageChange}
        onRunTests={onRunTests}
        onRunCustom={onRunCustom}
        isRunning={false}
      />,
    );

    const runBtn = screen.getByText('Run Tests');
    expect(runBtn).toBeDefined();

    fireEvent.click(runBtn);
    expect(onRunTests).toHaveBeenCalledTimes(1);

    // Toggle custom stdin drawer
    const customBtn = screen.getByText('Custom Input');
    fireEvent.click(customBtn);
    expect(screen.getByPlaceholderText('Enter custom input to pass via stdin...')).toBeDefined();
  });
});
