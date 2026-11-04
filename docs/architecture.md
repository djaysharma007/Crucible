# Crucible — System Architecture & Technical Specifications

Crucible is a unified, frictionless technical interview platform engineered to replace fragmented stacks (Zoom + Google Docs + CoderPad + HackerRank) with a single, high-performance browser room.

---

## 1. High-Level Architecture Topology

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

---

## 2. Monorepo Structure

Managed via **pnpm workspaces** and **Turborepo** conventions:

```
crucible/
├── apps/
│   ├── web/                      # Next.js 15 App Router frontend application
│   │   ├── src/app/              # Routes: /, /login, /dashboard, /room/[id], /dashboard/interviews/[id]
│   │   ├── src/components/       # UI feature modules (room, presence, interviewer, dashboard, replay)
│   │   └── src/hooks/            # Telemetry, LiveKit, collaboration hooks
│   ├── api/                      # NestJS 11 modular REST API
│   │   ├── src/auth/             # JWT session auth, Argon2id passwords
│   │   ├── src/interviews/       # Lifecycle, questions, stats, detail, compare, retention
│   │   ├── src/rooms/            # Admission lobby, editor locking, transparency signals
│   │   ├── src/execution/        # Judge0 sandbox gateway & test case harness
│   │   ├── src/presence/         # LiveKit token grants & double-consent recording
│   │   ├── src/rubrics/          # Reusable scoring rubrics & criteria
│   │   ├── src/notes/            # Timestamped interviewer private notes
│   │   ├── src/scorecard/        # Structured evaluation ratings & recommendations
│   │   └── src/common/           # RateLimitGuard, AllExceptionsFilter, LoggingInterceptor
│   └── collab/                   # Hocuspocus CRDT real-time sync server
│       └── src/index.ts          # Yjs WebSocket server with DB snapshot/update persistence
├── packages/
│   ├── shared/                   # Shared TypeScript contracts, Zod schemas, constants
│   ├── ui/                       # Internal accessible UI component library (Radix UI)
│   └── config/                   # Shared ESLint, Prettier, TypeScript, Tailwind presets
├── infra/
│   └── docker/                   # Docker Compose manifests (Postgres, Redis, Judge0, Caddy)
└── docs/
    ├── architecture.md           # This document
    └── adr/                      # Architecture Decision Records
```

---

## 3. Real-Time Synchronization & Timeline Replay

### Collaborative State Machine (Yjs CRDT)
- **Document Scoping:**
  - Code editor: `code:<interviewQuestionId>`
  - Whiteboard canvas: `whiteboard:<interviewId>`
- **Lock Enforcement:**
  - When the interviewer toggles Editor Lock, the API updates Redis and notifies the collab server. Write updates from candidate connections are rejected at the WebSocket protocol layer.
- **Timeline Replay Model:**
  - Every update processed by Hocuspocus is stored in `collab_updates` with an auto-calculated `offset_ms` from session start.
  - Periodic vector snapshots are written to `collab_snapshots`.
  - To reconstruct state at arbitrary timestamp $t$, the client retrieves the closest snapshot before $t$ and streams incremental updates up to $t$.
  - The [`TimelineScrubber`](file:///d:/Personal_Projects/Crucible/apps/web/src/components/replay/TimelineScrubber.tsx) component supports seeking, variable speeds ($1\times, 2\times, 5\times, 10\times$), note pin markers, and code execution events.

---

## 4. Presence, Audio/Video & Cloud Recording

### WebRTC Pipeline (LiveKit SFU)
- **Frictionless Candidate Join:**
  - High-entropy cryptographic room tokens allow candidates to join in $< 1\text{ minute}$ with zero account creation.
  - Candidate enters a lobby stage; interviewer reviews device check before admitting.
- **Double-Consent Cloud Recording:**
  - Server-side recording via LiveKit Egress requires mutual agreement.
  - Both parties must confirm consent. The Redis state machine transitions:
    $$\text{idle} \longrightarrow \text{interviewer\_consented} \longrightarrow \text{candidate\_consented} \longrightarrow \text{active}$$
  - Room signals broadcast recording status (`recording_active`, `recording_stopped`) to all participant tiles.

---

## 5. Sandboxed Code Execution (Judge0)

### Security & Isolation Model
- **Container Isolation:** Judge0 runs on an internal Docker network with no outbound internet gateway.
- **Resource Constraints (cgroups v2):**
  - CPU Time Limit: 5 seconds.
  - Wall Clock Time Limit: 10 seconds.
  - Memory Limit: 256 MB.
  - Maximum Processes: 64.
- **Hidden Test Cases:**
  - Public test cases are sent with full input/output details.
  - Hidden test cases are evaluated exclusively inside the backend harness; only pass/fail counts are returned to the candidate client.
- **Rate Limiting:** Execution endpoints are throttled to 15 runs/min per room/IP.

---

## 6. Transparency Signals & Telemetry

Advisory telemetry is captured to assist interviewers with integrity context without using accusatory language:
- `tab_hidden` / `tab_visible`: Browser visibility changes (`document.hidden`).
- `window_blur` / `window_focus`: Window focus shifts.
- `paste`: Pasted text blocks $\ge 50$ characters (logs character length and line count only; never stores clipboard contents outside the editor).
- Signals are displayed on the replay timeline and review summary as neutral facts.

---

## 7. Data Retention & Hardening

- **Retention Window:** Configurable 90-day retention policy.
- **Cleanup API:** `POST /api/v1/interviews/cleanup?retentionDays=90` automatically purges completed/cancelled interviews older than the cutoff.
- **Hard Delete:** `DELETE /api/v1/interviews/:id` allows interview owners to permanently purge sessions with cascading deletion of questions, code runs, notes, whiteboard snapshots, and signals.
- **Security Headers:** Enforced via Express middleware and Next.js config:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `Content-Security-Policy: default-src 'self'; ...`
  - `Permissions-Policy: camera=(self), microphone=(self), display-capture=(self)`
