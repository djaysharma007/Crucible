# ADR 0003: Isolated Container Sandbox for Multi-Language Code Execution

## Status
Accepted

## Context
Candidates write and execute arbitrary code in multiple languages (TypeScript, Python, JavaScript, Java, C++). The platform must evaluate both public and hidden test cases, compute execution duration and memory consumption, while preventing security abuse:
1. Infinite loops or CPU starvation.
2. Memory exhaustion bombs.
3. Fork bombs or rogue child processes.
4. Host file system tampering or internal network traversal.

## Decision
We integrated **Judge0 CE** deployed in an isolated Docker container network, accessible only via internal HTTP from the NestJS API process.

### Key Architectural Rationale:
- **Defense in Depth:** Judge0 uses Linux cgroups and isolated namespaces to enforce strict per-submission limits:
  - CPU time limit: 5 seconds.
  - Wall time limit: 10 seconds.
  - Memory limit: 256 MB.
  - Process count: 64 processes maximum.
- **Zero Internet Access:** The execution container is attached to an internal Docker network with no outbound gateway or internet routing.
- **Hidden Test Case Security:** Test cases marked `is_hidden: true` are stored strictly in PostgreSQL. They are injected into the runner harness on the API server and evaluated within Judge0. The candidate browser receives only pass/fail counts and never inspects hidden inputs or assertion outputs.
- **Execution Rate Limiting:** Enforced at the API gateway layer per IP and per interview room (15 executions per minute).

## Consequences
- Requires a Linux host with cgroup v2 support for Judge0 in production environments.
- High-concurrency environments benefit from dedicated Judge0 worker nodes.

