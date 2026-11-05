import { SupportedLanguage } from '@crucible/shared';

export interface ExecutionSubmissionInput {
  sourceCode: string;
  language: SupportedLanguage;
  stdin?: string;
  expectedOutput?: string;
}

export interface ExecutionSubmissionResult {
  stdout: string;
  stderr: string | null;
  compileOutput: string | null;
  statusId: number;
  statusDescription: string;
  runtimeMs: number;
  memoryKb: number;
  passed: boolean;
  quotaRemaining?: number;
}

export interface ExecutionProvider {
  submit(input: ExecutionSubmissionInput): Promise<ExecutionSubmissionResult>;
}

export const EXECUTION_PROVIDER = Symbol('EXECUTION_PROVIDER');
