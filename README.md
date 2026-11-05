# Crucible

Crucible is a web platform that consolidates technical interview tooling into a single, cohesive room: low-latency WebRTC video/audio calling, collaborative code editing, isolated multi-language code execution, collaborative whiteboard, timestamped interviewer notes, and structured rubric scoring. Completed sessions provide full timeline replay, code diff history, and scorecard review from the interviewer dashboard.

Deployed entirely at **$0/month total cost** with no custom domain, no paid plans, and no expiring trials.

---

## Production Zero-Cost Architecture

```
                          +-----------------------------------+
                          |     Vercel Free Tier (Next.js)    |
                          |    https://crucible.vercel.app    |
                          +-----------------+-----------------+
                                            |
                  +-------------------------+-------------------------+
                  | First-party rewrites:                             | Direct WebSocket:
                  | /api/v1/*                                         | wss://crucible-collab.onrender.com
                  v                                                   v
+-----------------------------------+               +-----------------------------------+
|   Render Free Web Service (API)   |               | Render Free Web Service (Collab)  |
|     Docker: apps/api/Dockerfile   |               |   Docker: apps/collab/Dockerfile  |
|  https://crucible-api.onrender.com|               |https://crucible-collab.onrender.com|
+-----------------+-----------------+               +-----------------+-----------------+
                  |                                                   |
     +------------+------------+                                      |
     |            |            |                                      |
     v            v            v                                      v
+----------+ +---------+ +-----------+                           +---------+
|   Neon   | |  Brevo  | | RapidAPI  |                           | Upstash |
| Postgres | |  Email  | |  Judge0   |                           |  Redis  |
+----------+ +---------+ +-----------+                           +---------+
     |            |            |
     v            v            v
+----------+ +---------+ +-----------+
| Supabase | | LiveKit | |  Browser  |
|Storage S3| |  Cloud  | | Recording |
+----------+ +---------+ +-----------+
```

### Components

- **Web (`apps/web`):** Next.js 15 (App Router), React 19, Tailwind CSS. Hosted on Vercel free tier with first-party rewrites to eliminate cross-site cookie restrictions.
- **API (`apps/api`):** NestJS REST service (`/api/v1`) running in a multi-stage Docker container on Render Free Web Service. Handles authentication, interview lifecycle, signed collab tokens, storage chunk uploads, and execution orchestration.
- **Collab (`apps/collab`):** Hocuspocus server running on Render Free Web Service (Docker). Manages real-time Yjs CRDT synchronization for editor and whiteboard sessions with short-lived HMAC token verification.
- **PostgreSQL (Neon Serverless):** System of record for users, interviews, questions, rubrics, scorecards, and CRDT update logs with automatic serverless suspend.
- **Redis (Upstash):** Serverless Redis for room presence and rate limiting over TLS (`rediss://`).
- **Code Execution (Judge0 CE on RapidAPI):** Sandboxed compilation and execution across TypeScript, JavaScript, Python, Go, Rust, Java, C++, and C#. Pluggable `ExecutionProvider` interface with local Docker fallback.
- **Object Storage (Supabase Storage):** S3-compatible cloud storage for whiteboard snapshots, reports, and continuous 10-second audio/video recording chunks.
- **WebRTC Video & Audio (LiveKit Cloud):** Managed WebRTC media transport under LiveKit's free Build Plan.
- **Transactional Email (Brevo):** Password reset notifications via Brevo HTTP API using a single verified sender address.

---

## Tech Stack

| Layer                | Choice                              | Rationale                                                                           |
| :------------------- | :---------------------------------- | :---------------------------------------------------------------------------------- |
| **Language**         | TypeScript (Strict)                 | Strict typing across all packages; zero `any`.                                      |
| **Frontend**         | Next.js 15, React 19, Tailwind CSS  | First-party API rewrites, server components, dark carbon design system.             |
| **Editor**           | Monaco Editor with `y-monaco`       | High-fidelity code editing with real-time multi-cursor awareness.                   |
| **Whiteboard**       | `@excalidraw/excalidraw` + Yjs      | MIT-licensed collaborative canvas with element-level `versionNonce` reconciliation. |
| **Real-time Sync**   | Yjs + Hocuspocus                    | CRDT document sync with full timestamped update logging for scrubber replay.        |
| **Media & Audio**    | LiveKit Cloud + HTML5 MediaRecorder | Low-latency WebRTC for live room; browser-side audio mixing and chunked uploads.    |
| **Database**         | PostgreSQL (Neon) with Prisma       | Serverless connection pooling and declarative schema migrations on start.           |
| **Cache & Presence** | Redis (Upstash)                     | Managed TLS Redis with exponential backoff reconnect logic.                         |
| **Code Execution**   | Judge0 (RapidAPI & Docker)          | Multi-language sandboxed code execution with daily quota tracking.                  |
| **Storage**          | Supabase Storage (S3 API)           | Zero-cost S3-compatible cloud bucket for snapshots and chunked video streams.       |
| **Email**            | Brevo HTTP API                      | Free transactional email without custom domain purchase.                            |
| **Testing**          | Vitest & Playwright                 | Unit, integration, and E2E test suites with mock execution providers.               |

---

## Free-Tier Limits & Known Operational Behaviors

1. **Render Free Tier Cold Starts**:
   - Free instances on Render spin down into sleep mode after 15 minutes of inactivity.
   - Initial HTTP requests incur a 30–50 second cold start.
   - Crucible includes an automatic `ServerWakeupBanner` that detects dormant backend services, displays a non-intrusive _"Waking up server..."_ status to users, and polls `/health` until the API is warm.
   - Active WebSocket connections and heartbeats keep the collab server awake throughout active interviews.
2. **RapidAPI Judge0 Execution Quota**:
   - The free plan enforces a hard limit of **50 submissions/day** (resets UTC 00:00).
   - Question banks are capped at 2 test cases per problem, allowing at least **25 complete runs per day**.
   - The UI surfaces remaining daily submissions directly in the code editor bar.
   - When the quota is reached (HTTP 429), a typed `QuotaExceededException` returns a clean message in the UI; code execution never fails silently.
3. **Brevo Email Sender Verification & DMARC Restrictions**:
   - Brevo's free plan allows 300 emails/day and permits adding a personal email address (e.g. `@gmail.com`, `@yahoo.com`) as a **Verified Sender** via a one-click confirmation link sent to that inbox, without purchasing a custom domain.
   - **Exact Delivery Limitation:** Major mailbox providers (Google, Yahoo, Microsoft) enforce strict DMARC alignment policies (`p=reject` / `p=quarantine`). When an email is relayed through Brevo's servers with a `From: yourname@gmail.com` header, the SPF and DKIM signatures do not match `gmail.com` DNS records. Consequently, receiving mail servers will **reject or place into spam** messages sent to external inboxes. Real-world delivery from a freemail sender is only accepted by servers without strict DMARC rejection or by the sender's own address.
   - **Crucible Zero-Cost Fallback:** To ensure zero-cost deployments never block an interviewer due to mailbox DMARC rejections, Crucible's `AuthService` always logs the full password reset token and direct reset URL to the API server standard output (`[AuthService] Password reset token generated for <email>: <token>`). Interviewers can retrieve reset URLs directly from the Render service logs if needed.
4. **Supabase Storage Free Quota**:
   - Supabase free tier provides 1 GB total storage and 50 MB max file size.
   - Browser recording bitrates are constrained to 500 kbps video + 64 kbps audio (~70 KB/s), uploading 10-second chunks (~700 KB). A full 60-minute interview recording consumes ~250 MB.

---

## Getting Started Locally

Crucible can be run completely offline using Docker Compose.

### 1. Prerequisites

- Node.js >= 22
- pnpm >= 9
- Docker and Docker Compose

### 2. Setup & Installation

```bash
# Clone the repository
git clone https://github.com/djaysharma007/Crucible.git
cd Crucible

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
```

### 3. Start Local Infrastructure

```bash
# Start local Postgres, Redis, and MinIO (for local dev only)
pnpm docker:up

# Start local Judge0 compiler (optional for local offline code execution)
docker compose -f infra/docker/docker-compose.judge0.yml up -d

# Generate Prisma client and apply database migrations
pnpm prisma:generate
pnpm --filter @crucible/api prisma:migrate:deploy
```

### 4. Seed Demo Data (Optional)

```bash
# Populates sample questions, rubric, interviewer account, and a completed demo interview with replay history
DEMO_INTERVIEWER_PASSWORD="DemoPassword123!" pnpm --filter @crucible/api db:seed
```

### 5. Run Development Services

```bash
# In terminal 1: Start Web and API
pnpm dev

# In terminal 2: Start Collab server
pnpm dev:collab
```

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api/v1`
- Collab WebSocket: `ws://localhost:4001`
- Login: `interviewer@crucible.dev` / `DemoPassword123!`

### 6. Remote Sharing with Cloudflare Quick Tunnel (Zero Cost)

To test WebRTC video and collaborative coding with a candidate on another device without port forwarding:

```bash
# Windows
.\scripts\tunnel.ps1

# macOS / Linux
./scripts/tunnel.sh
```

This launches a free, temporary `*.trycloudflare.com` tunnel directing traffic to `http://localhost:3000`.

---

## Production Deployment

For complete, step-by-step instructions on deploying Crucible to Vercel and Render using Neon, Upstash, LiveKit Cloud, RapidAPI, Supabase, and Brevo, see the [Zero-Cost Deployment Guide](docs/deployment.md).

---

## Validation & Testing

```bash
# TypeScript strict type checking across all workspaces
pnpm typecheck

# Unit & integration tests
pnpm test

# Format checking
pnpm format:check
```
