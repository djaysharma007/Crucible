import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SelfHostedJudge0Provider } from './self-hosted-judge0.provider.js';
import { RapidApiJudge0Provider } from './rapidapi-judge0.provider.js';
import { QuotaExceededException } from '../common/exceptions/quota-exceeded.exception.js';
import { BadGatewayException } from '@nestjs/common';

describe('Execution Providers', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('SelfHostedJudge0Provider', () => {
    it('executes submission successfully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          stdout: '[0,1]\n',
          stderr: null,
          status: { id: 3, description: 'Accepted' },
          time: '0.015',
          memory: 2048,
        }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const provider = new SelfHostedJudge0Provider();
      const result = await provider.submit({
        language: 'typescript',
        sourceCode: 'console.log("[0,1]")',
        expectedOutput: '[0,1]',
      });

      expect(result.passed).toBe(true);
      expect(result.stdout).toBe('[0,1]\n');
      expect(result.runtimeMs).toBe(15);
      expect(result.statusDescription).toBe('Accepted');
    });

    it('throws QuotaExceededException on HTTP 429', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      } as unknown as Response);

      const provider = new SelfHostedJudge0Provider();
      await expect(
        provider.submit({
          language: 'python',
          sourceCode: 'print(1)',
        }),
      ).rejects.toThrow(QuotaExceededException);
    });

    it('throws BadGatewayException when local Judge0 is unreachable', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const provider = new SelfHostedJudge0Provider();
      await expect(
        provider.submit({
          language: 'python',
          sourceCode: 'print(1)',
        }),
      ).rejects.toThrow(BadGatewayException);
    });
  });

  describe('RapidApiJudge0Provider', () => {
    it('throws BadGatewayException if RAPIDAPI_KEY is missing', async () => {
      delete process.env.RAPIDAPI_KEY;
      const provider = new RapidApiJudge0Provider();
      await expect(
        provider.submit({
          language: 'typescript',
          sourceCode: 'console.log(1)',
        }),
      ).rejects.toThrow(BadGatewayException);
    });

    it('executes submission and extracts x-ratelimit-requests-remaining', async () => {
      process.env.RAPIDAPI_KEY = 'test-rapidapi-key';
      const mockHeaders = new Headers();
      mockHeaders.set('x-ratelimit-requests-remaining', '42');

      const mockResponse = {
        ok: true,
        status: 200,
        headers: mockHeaders,
        json: async () => ({
          stdout: 'true\n',
          stderr: null,
          status: { id: 3, description: 'Accepted' },
          time: '0.020',
          memory: 4096,
        }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const provider = new RapidApiJudge0Provider();
      const result = await provider.submit({
        language: 'python',
        sourceCode: 'print("true")',
        expectedOutput: 'true',
      });

      expect(result.passed).toBe(true);
      expect(result.quotaRemaining).toBe(42);
    });

    it('throws QuotaExceededException on HTTP 429 from RapidAPI', async () => {
      process.env.RAPIDAPI_KEY = 'test-rapidapi-key';
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers(),
        text: async () => 'Monthly quota exceeded',
      } as unknown as Response);

      const provider = new RapidApiJudge0Provider();
      await expect(
        provider.submit({
          language: 'python',
          sourceCode: 'print(1)',
        }),
      ).rejects.toThrow(QuotaExceededException);
    });
  });
});
