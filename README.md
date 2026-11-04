# Crucible

> **Crucible** is a unified, high-performance technical interview platform that consolidates video calling, collaborative code editing, multi-language execution in an isolated sandbox, architectural whiteboarding, private timestamped interviewer notes, structured rubric scoring, advisory integrity telemetry, and millisecond-accurate timeline replay into a single browser room with frictionless candidate join.

---

## 1. Core Platform Capabilities

- **Frictionless Candidate Join:** High-entropy cryptographic single-use room tokens allow candidates to join in under 1 minute with zero account registration or software downloads.
- **Collaborative Code Editing (Yjs CRDT):** Monaco Editor integration with instant conflict-free concurrent editing, syntax highlighting, syntax-aware language switching, and interviewer editor locking.
- **Multi-Language Isolated Execution:** Judge0 CE container execution across TypeScript, JavaScript, Python, Java, and C++ with strict Linux cgroup limits (CPU, memory, wall time, process count). Hidden test cases are evaluated securely on the server and never sent to candidate browsers.
- **Infinite Vector Whiteboard:** Real-time collaborative Tldraw v3 canvas synchronized across participants with periodic vector snapshots.
- **Live Video, Audio & Screen Sharing (LiveKit):** WebRTC media powered by LiveKit SFU with double-consent cloud recording (renders directly to MP4 with S3/MinIO upload) and candidate screen share theater.
- **Interviewer Evaluation Suite:**
  - Private timestamped notes auto-calculated with `[mm:ss]` session offsets.
  - 60-minute roadmap section timer with quick progress logging.
  - Structured 4-level rubric scoring (Problem Solving, Code Quality, System Efficiency, Communication) with weighted averages and hiring recommendations (`strong_hire`, `hire`, `no_hire`, `strong_no_hire`).
- **Deep Dashboard & Timeline Replay:**
  - Interactive timeline scrubber with play/pause, seek slider, variable speeds ($1\times, 2\times, 5\times, 10\times$), and clickable note pin markers.
  - Point-in-time replay reconstructing both code execution outputs and whiteboard drawings.
  - Side-by-side candidate comparison modal with criteria score deltas.
  - Printer-friendly PDF report exports.
- **Advisory Integrity Signals & Hardening:**
  - Neutral advisory logging of tab switches, window blur events, and large clipboard pastes ($\ge 50$ characters, size/timestamp only).
  - Transparent candidate disclosure notice prior to entering the session.
  - Redis token-bucket rate limiting across auth, join, execution, and telemetry endpoints.
  - Strict security headers (`CSP`, `HSTS`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).
  - Configurable 90-day retention cleanup and permanent session deletion.
- **Anti-AI-Slop Dark Mode Aesthetic:**
  - Built strictly with Section 13 design tokens (`#1E2019`, `#393E41`, `#D3D0CB`, `#E2C044`, `#587B7F`), 4px grid, accessible Radix UI primitives, and visible keyboard focus states.

---

## 2. Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   Browser Client                                       │
│          Next.js 15 (React 19) · Monaco Editor · Tldraw v3 · LiveKit Client SDK         │
└──────────────────┬───────────────────────────────┬────────────────────────────┬────────┘
                   │ HTTPS / REST                  │ WebSocket (WSS)            │ WebRTC
                   ▼                               ▼                            ▼
┌──────────────────────────────────┐ ┌───────────────────────────┐ ┌─────────────────────┐
│          NestJS REST API         │ │   Hocuspocus Collab Node  │ │     LiveKit SFU     │
│ Auth · RBAC · Rate Limits · CRUD │ │ Yjs CRDT · Awareness Sync │ │ Video/Audio/Screen  │
│ Execution Gateway · Signals · PDF│ │ Lock Enforcement · Replay │ │   Cloud Egress MP4  │
└─────────┬──────────────┬─────────┘ └─────────────┬─────────────┘ └──────────┬──────────┘
          │              │                         │                          │
          ▼              ▼                         ▼                          ▼
┌──────────────────┐ ┌───────────────────────────────────────────┐ ┌─────────────────────┐
│     Judge0 CE    │ │                 Datastores                │ │   MinIO / S3 Bucket │
│ Linux cgroup v2  │ │  PostgreSQL 16 (Prisma)  ·  Redis 7       │ │ Room Recordings &   │
│ Isolated Sandbox │ │  Interviews · Scorecards · State Machine  │ │ Whiteboard Exports  │
└──────────────────┘ └───────────────────────────────────────────┘ └─────────────────────┘
```

### Workspace Layout

```
crucible/
├── apps/
│   ├── web/              # Next.js 15 App Router frontend
│   ├── api/              # NestJS REST backend service
│   └── collab/           # Hocuspocus CRDT real-time sync server
├── packages/
│   ├── shared/           # Zod schemas, TypeScript types, constants
│   ├── ui/               # Accessible UI component library (Radix primitives)
│   └── config/           # Shared TypeScript, Tailwind, ESLint configs
├── infra/
│   └── docker/           # Docker Compose manifests (Postgres, Redis, Judge0, Caddy)
└── docs/
    ├── architecture.md   # System architecture & technical specs
    └── adr/              # Architecture Decision Records (Yjs, LiveKit, Judge0, Design)
```

---

## 3. Tech Stack & Selection Rationale

| Technology | Selection Rationale |
|---|---|
| **TypeScript (Strict)** | Strict `noImplicitAny` and end-to-end typing across monorepo boundaries with zero loose `any`. |
| **Next.js 15 & React 19** | Fast SSR for dashboard & review, client-side hydration for collaborative room tooling. |
| **NestJS 11** | Modular backend architecture with dependency injection, global exception filters, and guard pipelines. |
| **Prisma 6 & PostgreSQL 16** | Strongly-typed data layer with migrations and parameterized queries. |
| **Yjs & Hocuspocus** | Conflict-free replicated data types (CRDTs) enabling instant offline recovery and point-in-time replay. |
| **LiveKit SFU** | Resilient WebRTC audio/video transport with token-based access and cloud egress recording. |
| **Judge0 CE** | Dockerized sandbox with Linux cgroup v2 resource limits and internal network isolation. |
| **Tailwind CSS & Radix UI** | Strict Section 13 design tokens with accessible, headless UI primitives. |
| **Vitest & Supertest** | Lightning-fast unit, component, and full-stack API integration testing. |

---

## 4. Quickstart Guide (Local Development)

### Prerequisites
- Node.js $\ge 20$ (v22 LTS recommended)
- pnpm $\ge 9$ (v10 recommended)
- Docker & Docker Compose

### 1. Clone & Configure
```bash
git clone https://github.com/djaysharma007/Crucible.git
cd Crucible
cp .env.example .env
```

### 2. Start Supporting Infrastructure
```bash
pnpm docker:up
```
*Starts PostgreSQL (port 5433), Redis (port 6379), and MinIO (ports 9000 & 9001).*

### 3. Install Dependencies & Build Packages
```bash
pnpm install
pnpm prisma:generate
```

### 4. Seed Production Demo Data
```bash
pnpm seed
```
*Preloads default interviewer credentials, core engineering rubric, question bank problems with multi-language starter codes and test cases, and past demo interviews with rich replay timelines.*

### 5. Launch Development Servers
```bash
pnpm dev
```
In a separate terminal, launch the real-time CRDT sync server:
```bash
pnpm dev:collab
```

- **Web Frontend:** `http://localhost:3000`
- **REST API:** `http://localhost:4000/api/v1`
- **Collab WebSocket:** `ws://localhost:1234`

### Preloaded Demo Credentials
- **Interviewer Email:** `interviewer@crucible.dev`
- **Password:** `Password123!`

---

## 5. Verification & Quality Gates

Run all quality gates locally:

```bash
# Typecheck across all 6 workspace packages
pnpm typecheck

# Lint check (0 errors, 0 warnings enforced)
pnpm lint

# Full test suite (108 passing tests across unit, component, and E2E)
pnpm test

# Production build compilation
pnpm build
```

---

## 6. Single-VPS Production Deployment

Crucible is packaged for zero-friction single-VPS deployment with automatic HTTPS via Caddy:

1. On your VPS, ensure ports `80`, `443`, and UDP `7880-7882` (if self-hosting LiveKit) are accessible.
2. Clone the repository and configure `.env`:
   ```bash
   cp .env.example .env
   # Set DOMAIN, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, etc.
   ```
3. Deploy the full production stack:
   ```bash
   docker compose -f infra/docker/docker-compose.prod.yml up -d --build
   ```
4. Run migrations and demo seed:
   ```bash
   docker compose -f infra/docker/docker-compose.prod.yml exec api pnpm --filter @crucible/api prisma:migrate deploy
   docker compose -f infra/docker/docker-compose.prod.yml exec api pnpm seed
   ```

---

## 7. Future Work (Roadmap)

- **AI-Assisted Question Recommendations:** Dynamic problem difficulty calibration based on candidate velocity.
- **Calendar & ATS Integrations:** Native Greenhouse, Lever, and Ashby webhooks for automated scorecard dispatch.
- **Multi-Tenant Team Roles:** Organization-level RBAC for hiring managers, senior reviewers, and sourcers.
- **Automated Video Transcription:** Speaker-separated real-time audio transcripts pinned to timeline replay events.
- **System Design Templates:** Preconfigured distributed systems component palettes for the infinite whiteboard.
