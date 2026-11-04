import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ExecutionProvider,
  EXECUTION_PROVIDER,
} from './execution-provider.interface.js';
import {
  RunCodeInput,
  RunCustomInput,
  RunCodeResponse,
  RunCustomResponse,
  TestCaseResult,
} from '@crucible/shared';

@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EXECUTION_PROVIDER)
    private readonly executionProvider: ExecutionProvider,
  ) {}

  async runTests(
    interviewQuestionId: string,
    input: RunCodeInput,
    isInterviewer: boolean,
  ): Promise<RunCodeResponse> {
    const startTime = Date.now();

    const iq = await this.prisma.interviewQuestion.findUnique({
      where: { id: interviewQuestionId },
      include: {
        interview: true,
        question: {
          include: {
            testCases: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!iq) {
      throw new NotFoundException(`Interview question ${interviewQuestionId} not found`);
    }

    if (iq.interview.status === 'completed' || iq.interview.status === 'cancelled') {
      throw new BadRequestException(`Cannot execute code in '${iq.interview.status}' interview`);
    }

    // Free plan optimization: cap at max 3 test cases to conserve daily quota
    const testCases = iq.question.testCases.slice(0, 3);
    if (testCases.length === 0) {
      throw new BadRequestException('No test cases defined for this question');
    }

    const visibleResults: TestCaseResult[] = [];
    const hiddenResults: TestCaseResult[] = [];
    let passedCount = 0;
    let latestQuotaRemaining: number | undefined = undefined;

    for (const tc of testCases) {
      const submission = await this.executionProvider.submit({
        sourceCode: input.sourceCode,
        language: input.language,
        stdin: tc.input,
        expectedOutput: tc.expectedOutput,
      });

      if (submission.quotaRemaining !== undefined) {
        latestQuotaRemaining = submission.quotaRemaining;
      }

      if (submission.passed) {
        passedCount++;
      }

      const result: TestCaseResult = {
        testCaseId: tc.id,
        order: tc.order,
        passed: submission.passed,
        status: submission.statusDescription,
        input: tc.isHidden && !isInterviewer ? undefined : tc.input,
        expectedOutput: tc.isHidden && !isInterviewer ? undefined : tc.expectedOutput,
        actualOutput: tc.isHidden && !isInterviewer ? undefined : submission.stdout,
        stdout: tc.isHidden && !isInterviewer ? undefined : submission.stdout,
        stderr: tc.isHidden && !isInterviewer ? null : submission.stderr,
        runtimeMs: submission.runtimeMs,
        memoryKb: submission.memoryKb,
        isHidden: tc.isHidden,
      };

      if (tc.isHidden) {
        hiddenResults.push(result);
      } else {
        visibleResults.push(result);
      }
    }

    const durationMs = Date.now() - startTime;
    const totalCases = testCases.length;
    const allPassed = passedCount === totalCases;

    const hiddenPassed = hiddenResults.filter((r) => r.passed).length;
    const hiddenSummary = {
      total: hiddenResults.length,
      passed: hiddenPassed,
    };

    // Save execution record
    const run = await this.prisma.codeRun.create({
      data: {
        interviewQuestionId,
        language: input.language,
        sourceSnapshot: input.sourceCode,
        results: {
          visibleResults,
          hiddenSummary,
          hiddenResults, // Full record stored in DB for interviewer and replay
          allPassed,
          totalCases,
          passedCases: passedCount,
          quotaRemaining: latestQuotaRemaining,
        } as unknown as Prisma.InputJsonValue,
        durationMs,
      },
    });

    this.logger.log(
      `Code run ${run.id} finished for IQ ${interviewQuestionId}: ${passedCount}/${totalCases} passed in ${durationMs}ms (quota remaining: ${latestQuotaRemaining ?? 'unknown'})`,
    );

    const response: RunCodeResponse = {
      runId: run.id,
      interviewQuestionId,
      language: input.language,
      allPassed,
      totalCases,
      passedCases: passedCount,
      visibleResults,
      hiddenSummary,
      durationMs,
      quotaRemaining: latestQuotaRemaining,
    };

    if (isInterviewer) {
      response.hiddenResults = hiddenResults;
    }

    return response;
  }

  async runCustom(
    interviewQuestionId: string,
    input: RunCustomInput,
  ): Promise<RunCustomResponse> {
    const iq = await this.prisma.interviewQuestion.findUnique({
      where: { id: interviewQuestionId },
      include: { interview: true },
    });

    if (!iq) {
      throw new NotFoundException(`Interview question ${interviewQuestionId} not found`);
    }

    if (iq.interview.status === 'completed' || iq.interview.status === 'cancelled') {
      throw new BadRequestException(`Cannot execute code in '${iq.interview.status}' interview`);
    }

    const submission = await this.executionProvider.submit({
      sourceCode: input.sourceCode,
      language: input.language,
      stdin: input.stdin,
    });

    return {
      stdout: submission.stdout,
      stderr: submission.stderr,
      status: submission.statusDescription,
      runtimeMs: submission.runtimeMs,
      memoryKb: submission.memoryKb,
      quotaRemaining: submission.quotaRemaining,
    };
  }

  async getRuns(interviewQuestionId: string, isInterviewer: boolean) {
    const runs = await this.prisma.codeRun.findMany({
      where: { interviewQuestionId },
      orderBy: { requestedAt: 'desc' },
      take: 20,
    });

    if (isInterviewer) {
      return runs;
    }

    // For candidate: sanitize any hidden results
    return runs.map((run) => {
      const resultsObj = run.results as Record<string, unknown>;
      if (resultsObj && 'hiddenResults' in resultsObj) {
        const { hiddenResults: _, ...safeResults } = resultsObj;
        return {
          ...run,
          results: safeResults as Prisma.JsonValue,
        };
      }
      return run;
    });
  }
}
