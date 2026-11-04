# Crucible

Crucible is a web platform that consolidates technical interview tooling into a single room: video calling, collaborative code editing, isolated code execution, shared whiteboard, timestamped interviewer notes, and structured rubric scoring. Completed sessions provide full timeline replay and scorecard review from the dashboard.

## Architecture

```
                    +------------------------------+
                    |   Browser (Next.js, React)   |
                    | Monaco · tldraw · LiveKit SDK|
                    +---+-----------+------------+-+
                        | HTTPS     | WebSocket  | WebRTC
                        v           v            v
               +------------+ +-----------+ +-------------+
               |  API       | |  Collab   | |  LiveKit    |
               |  (NestJS)  | | (Hocus-   | |  server     |
               |            | |  pocus)   | |             |
               +---+---+-+--+ +-----+-----+ +-------------+
                   |   |            |
          +--------+   +-------+    |
          v                    v    v
     +----------+        +-------------+      +--------------+
     | Postgres |        |   Redis     |      |  Judge0      |
     | (Prisma) |        | presence,   |      | (Docker,     |
     |          |        | rate limits |      |  sandboxed)  |
     +----------+        +-------------+      +--------------+
                               |
                        +------v------+
                        | Object store|
                        | (S3 / MinIO)|
                        +-------------+
```

### Components

- **Web (`apps/web`):** Next.js 15 (App Router), React 19, Tailwind CSS with Crucible design tokens.
- **API (`apps/api`):** NestJS REST service (`/api/v1`) handling authentication, interview lifecycle, token generation, and execution orchestration.
- **Collab (`apps/collab`):** Hocuspocus server managing real-time Yjs CRDT synchronization for editor documents and whiteboard sessions.
- **Shared (`packages/shared`):** Canonical TypeScript types, constants, and Zod schemas shared across services.
- **UI (`packages/ui`):** Component library built with Radix UI primitives and styled via Tailwind CSS adhering to the Crucible design system.
- **PostgreSQL (Prisma):** System of record for users, interviews, questions, rubrics, scorecards, and CRDT update logs.
- **Redis:** Transient state, rate limiting, and presence tracking.
- **MinIO / S3:** Object storage for whiteboard snapshots and exports.
- **Judge0:** Isolated sandbox environment for multi-language test execution.
- **LiveKit:** Audio, video, and screen share transport.

## Tech Stack and Rationale

| Technology                  | Selection Rationale                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| **TypeScript (Strict)**     | End-to-end type safety across packages without loose types or `any`.                       |
| **Next.js & React**         | Server components for auth/dashboard flows, client components for real-time room.          |
| **NestJS**                  | Structured modular backend architecture with dependency injection and typed middleware.    |
| **Prisma & PostgreSQL**     | Declarative data modeling, migrations, and parameterized query execution.                  |
| **Yjs & Hocuspocus**        | Conflict-free replicated data types (CRDTs) allowing offline recovery and timeline replay. |
| **Tailwind CSS & Radix UI** | Strict token enforcement with accessible headless UI primitives.                           |
| **Vitest & Playwright**     | Fast unit and integration tests with deterministic browser-driven end-to-end testing.      |

## Prerequisites

- Node.js >= 20 (v22 or v24 recommended)
- pnpm >= 9
- Docker and Docker Compose

## Getting Started Locally

1. **Clone the repository:**

   ```bash
   git clone https://github.com/djaysharma007/Crucible.git
   cd Crucible
   ```

2. **Configure environment:**

   ```bash
   cp .env.example .env
   ```

3. **Start local infrastructure (Postgres, Redis, MinIO):**

   ```bash
   pnpm docker:up
   ```

4. **Install dependencies:**

   ```bash
   pnpm install
   ```

5. **Generate database client:**

   ```bash
   pnpm prisma:generate
   ```

6. **Start development servers (Web and API):**
   ```bash
   pnpm dev
   ```
   - Web application: `http://localhost:3000`
   - API service: `http://localhost:4000/api/v1`

## Running Tests and Validation

- **Typecheck:**
  ```bash
  pnpm typecheck
  ```
- **Run Unit Tests:**
  ```bash
  pnpm test
  ```
- **Run Linter:**
  ```bash
  pnpm lint
  ```

## Current Project Status and Known Limitations

- **Current Stage:** Phase 0 (Setup & Monorepo Foundation).
- **Implemented:** Monorepo architecture, Docker Compose services, Prisma schema, base UI components with Section 13 design tokens, health API endpoint, shared Zod schemas, and CI workflow.
- **Known Limitations:**
  - Authentication, room tokens, and collaborative editor will be implemented in Phase 1.
  - Code execution and whiteboard sync will be implemented in Phase 2.
  - Video and audio presence will be implemented in Phase 3.
  - Review dashboard and timeline scrubber replay will be implemented in Phase 5.
