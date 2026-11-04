# ADR 0003: Pluggable Code Execution Provider and RapidAPI Free Tier Quotas

## Status
Accepted

## Context
Candidates and interviewers require real-time compilation and execution of code across TypeScript, JavaScript, Python, Go, Rust, Java, C++, and C#.
Previously, Judge0 was hardcoded to a local Docker container or self-hosted VPS endpoint. In a zero-cost cloud deployment, Judge0 CE on RapidAPI offers a free tier.

Verified RapidAPI Judge0 CE Free Tier Limits:
- **Daily Quota**: Strictly **50 submissions/day** (resets UTC 00:00).
- **Rate Limit**: 10 requests/second.
- **Languages**: 50+ languages supported.

If an interview problem executes 5 or 10 test cases per run, 50 submissions will be consumed after just 5 to 10 runs, exhausting the daily allowance prematurely.

## Decision
1. **ExecutionProvider Interface**: Abstract all code execution behind an `ExecutionProvider` interface:
   ```typescript
   export interface ExecutionProvider {
     readonly providerName: string;
     executeSubmission(dto: ExecutionRequestDto): Promise<ExecutionResultDto>;
     getRemainingDailyQuota(): Promise<number | null>;
   }
   ```
2. **Provider Implementations**:
   - `RapidApiJudge0Provider`: Used in production cloud deployments (`EXECUTION_PROVIDER=rapidapi`). Submits to `https://judge0-ce.p.rapidapi.com/submissions` with RapidAPI key headers and tracks remaining requests from response headers (`x-ratelimit-requests-remaining`).
   - `SelfHostedJudge0Provider`: Kept for local Docker Compose development (`EXECUTION_PROVIDER=self_hosted`), connecting to `http://localhost:2358` without quotas or RapidAPI keys.
3. **Test Case Capping**:
   - Cap question test cases to at most 2 cases: 1 public sample case and 1 hidden validation case.
   - 1 user "Run" uses exactly 2 submissions -> guarantees at least **25 full code runs per day** on the free RapidAPI tier.
4. **Quota Exhaustion Handling**:
   - On HTTP 429 or quota exhaustion, throw typed `QuotaExceededException`.
   - Never use silent mock execution fallbacks in production or tests.
   - The UI surfaces the remaining daily quota badge and renders a clear notification: `"RapidAPI Judge0 daily submission quota reached (50/50). Execution paused until midnight UTC."`

## Consequences
- Guaranteed zero dollar cost for multi-language code compilation in production.
- Transparent quota tracking visible to candidates and interviewers.
- Local development retains unlimited offline executions via Docker.
