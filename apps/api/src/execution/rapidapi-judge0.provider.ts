import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { JUDGE0_LANGUAGE_IDS } from '@crucible/shared';
import {
  ExecutionProvider,
  ExecutionSubmissionInput,
  ExecutionSubmissionResult,
} from './execution-provider.interface.js';
import { QuotaExceededException } from '../common/exceptions/quota-exceeded.exception.js';

@Injectable()
export class RapidApiJudge0Provider implements ExecutionProvider {
  private readonly logger = new Logger(RapidApiJudge0Provider.name);
  private readonly baseUrl = process.env.RAPIDAPI_JUDGE0_URL || 'https://judge0-ce.p.rapidapi.com';
  private readonly rapidApiKey = process.env.RAPIDAPI_KEY || '';
  private readonly rapidApiHost =
    process.env.RAPIDAPI_HOST ||
    process.env.RAPIDAPI_JUDGE0_HOST ||
    'judge0-ce.p.rapidapi.com';

  async submit(input: ExecutionSubmissionInput): Promise<ExecutionSubmissionResult> {
    if (!this.rapidApiKey) {
      throw new BadGatewayException(
        'RAPIDAPI_KEY is not configured on the server. Set RAPIDAPI_KEY or switch EXECUTION_PROVIDER=self_hosted.',
      );
    }

    const languageId = JUDGE0_LANGUAGE_IDS[input.language];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-rapidapi-key': this.rapidApiKey,
      'x-rapidapi-host': this.rapidApiHost,
    };

    const payload = {
      source_code: input.sourceCode,
      language_id: languageId,
      stdin: input.stdin || '',
      expected_output: input.expectedOutput,
      cpu_time_limit: 2.0,
      wall_time_limit: 5.0,
      memory_limit: 128000,
      max_file_size: 65536,
      enable_network: false,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${this.baseUrl}/submissions?base64_encoded=false&wait=true`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Parse remaining requests from RapidAPI rate limit headers
      const remainingHeader = response.headers.get('x-ratelimit-requests-remaining');
      const quotaRemaining = remainingHeader ? parseInt(remainingHeader, 10) : undefined;

      if (response.status === 429) {
        this.logger.warn(`RapidAPI Judge0 quota exceeded: HTTP 429`);
        throw new QuotaExceededException();
      }

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`RapidAPI Judge0 returned HTTP ${response.status}: ${errorText}`);
        if (
          response.status === 403 ||
          errorText.toLowerCase().includes('quota') ||
          errorText.toLowerCase().includes('exceeded')
        ) {
          throw new QuotaExceededException();
        }
        throw new BadGatewayException(`RapidAPI Judge0 execution failed: ${errorText}`);
      }

      const data = (await response.json()) as {
        stdout?: string | null;
        stderr?: string | null;
        compile_output?: string | null;
        status?: { id: number; description: string };
        time?: string | number | null;
        memory?: number | null;
      };

      const stdout = data.stdout ?? '';
      const stderr = data.stderr ?? null;
      const compileOutput = data.compile_output ?? null;
      const statusId = data.status?.id ?? 3;
      const statusDescription = data.status?.description ?? 'Accepted';
      const runtimeMs = data.time ? Math.round(Number(data.time) * 1000) : 10;
      const memoryKb = data.memory ?? 1024;

      const trimmedStdout = stdout.trim();
      const trimmedExpected = input.expectedOutput?.trim();
      const passed =
        statusId === 3 || (Boolean(trimmedExpected) && trimmedStdout === trimmedExpected);

      return {
        stdout,
        stderr,
        compileOutput,
        statusId,
        statusDescription,
        runtimeMs,
        memoryKb,
        passed,
        quotaRemaining,
      };
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof QuotaExceededException || err instanceof BadGatewayException) {
        throw err;
      }
      this.logger.error(`Failed to connect to RapidAPI Judge0: ${(err as Error).message}`);
      throw new BadGatewayException(
        `Unable to reach RapidAPI Judge0 service at ${this.baseUrl}: ${(err as Error).message}`,
      );
    }
  }
}
