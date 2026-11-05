import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { JUDGE0_LANGUAGE_IDS } from '@crucible/shared';
import {
  ExecutionProvider,
  ExecutionSubmissionInput,
  ExecutionSubmissionResult,
} from './execution-provider.interface.js';
import { QuotaExceededException } from '../common/exceptions/quota-exceeded.exception.js';

@Injectable()
export class SelfHostedJudge0Provider implements ExecutionProvider {
  private readonly logger = new Logger(SelfHostedJudge0Provider.name);
  private readonly judge0Url = process.env.JUDGE0_URL || 'http://localhost:2358';
  private readonly apiKey = process.env.JUDGE0_API_KEY;

  async submit(input: ExecutionSubmissionInput): Promise<ExecutionSubmissionResult> {
    const languageId = JUDGE0_LANGUAGE_IDS[input.language];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['X-Auth-Token'] = this.apiKey;
    }

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
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(`${this.judge0Url}/submissions?base64_encoded=false&wait=true`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status === 429) {
        throw new QuotaExceededException();
      }

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Self-hosted Judge0 returned HTTP ${response.status}: ${errorText}`);
        throw new BadGatewayException(`Self-hosted Judge0 execution failed: ${errorText}`);
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
      };
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof QuotaExceededException || err instanceof BadGatewayException) {
        throw err;
      }
      this.logger.error(
        `Failed to connect to self-hosted Judge0 at ${this.judge0Url}: ${(err as Error).message}`,
      );
      throw new BadGatewayException(
        `Unable to reach local Judge0 execution server at ${this.judge0Url}. Ensure docker-compose.judge0.yml is running.`,
      );
    }
  }
}
