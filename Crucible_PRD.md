# Crucible — Product Requirements Document

**Version:** 1.0
**Status:** Ready for implementation
**Owner:** Solo developer
**Tagline:** The interview room for technical hiring. Video, code, whiteboard, and scoring in one place.

---

## 1. Overview

Crucible is a web platform where a technical interview happens entirely in one room. Today an interviewer typically schedules a call on one tool, shares a link to a coding platform, opens a separate whiteboard, and keeps notes in a fourth place. Crucible replaces that with a single interview room and a dashboard for reviewing past interviews.

The product is **interviewer-first**. Every design decision favors the person running the interview: fast room setup, a private notes panel, structured scoring, and a reviewable record of the session. The candidate experience is deliberately frictionless: one link, no account.

## 2. Problem Statement

Running a technical interview currently requires:

1. A video call tool for conversation and screen share.
2. A separate coding platform for questions and a shared editor.
3. A separate whiteboard for system design and diagrams.
4. A separate place for notes and feedback, usually written after the interview from memory.

This costs the interviewer setup time, splits their attention across tabs, makes candidates juggle links and logins, and leaves feedback disconnected from what actually happened during the session.

## 3. Goals and Non-Goals

### Goals
- G1. A complete interview (talk, code, draw, evaluate) in a single browser tab.
- G2. Candidate joins from one link with no signup.
- G3. Interviewers can run candidate code against test cases in multiple languages.
- G4. Interviewers capture notes and structured scores during the session, tied to moments in the timeline.
- G5. Every interview is reviewable afterwards: final code, whiteboard, notes, scorecard, and a timeline replay.
- G6. Candidate screen share is available to the interviewer for transparency.

### Non-Goals (v1)
- AI-generated questions, AI grading, or AI interviewer features.
- Applicant tracking system (ATS) integrations or calendar integrations.
- Payments, billing, or multi-tenant company accounts with roles.
- Native mobile apps.
- Automated cheating verdicts. Crucible surfaces signals only; the interviewer decides.

## 4. Users

| User | Description | Needs |
|---|---|---|
| **Interviewer** | Engineer or hiring manager running technical interviews, authenticated | Fast room setup, one view for everything, private notes, structured scoring, history |
| **Candidate** | Person being interviewed, unauthenticated | Zero-friction join, reliable editor, clear indication of what is shared and recorded |

## 5. Core User Flows

### 5.1 Interviewer: create and run an interview
1. Sign in and open the dashboard.
2. Click **New interview**: enter candidate name, optional role/title, select or create a question set and rubric.
3. Receive a shareable room link. Optionally copy an invite message.
4. Open the room. Wait in the lobby until the candidate joins.
5. Run the interview: converse over video, assign a question, watch the candidate code, run tests, use the whiteboard, take timestamped notes, score the rubric.
6. End the interview. Fill in the final scorecard and recommendation.
7. Review later from the dashboard.

### 5.2 Candidate: join
1. Open the link. See a consent screen explaining what is shared and recorded (camera, microphone, screen share, editor activity).
2. Enter display name, do a device check, join.
3. Interact with the editor and whiteboard; share screen when asked.
4. See a closing screen when the interviewer ends the session. The candidate never sees notes or scores.

### 5.3 Interviewer: review
1. Open a past interview from the dashboard.
2. View summary, scorecard, notes, final code per question, whiteboard snapshot.
3. Play back the session timeline. Notes appear as markers on the timeline.

## 6. Functional Requirements

**Every requirement in this section is in scope for v1 and none may be dropped.** The priority tags only set build order: **P0** = core, built first because other features depend on it; **P1** and **P2** = built in later phases (Section 18 assigns each to a phase) but are not optional. The project is complete only when all of them are implemented and verified.

### 6.1 Authentication and Accounts
- P0. Interviewer registration and login with email and password.
- P0. Passwords hashed with Argon2id. Sessions via httpOnly, secure, sameSite cookies. No tokens in localStorage.
- P0. Candidates join through a signed, expiring, room-scoped token embedded in the link. No account.
- P1. Password reset via email.

### 6.2 Interview Rooms
- P0. Create, list, and cancel interviews. Each has a unique unguessable room identifier.
- P0. States: `scheduled`, `live`, `completed`, `cancelled`.
- P0. Lobby: the candidate waits until the interviewer admits them.
- P0. Only the interviewer can end a session. Ending locks the editor and whiteboard.
- P0. Room link is invalid after the interview is completed or cancelled.

### 6.3 Live Code Editor
- P0. Shared editor with real-time sync between both participants. Conflict-free concurrent editing.
- P0. Language selection: JavaScript, TypeScript, Python, Java, C++ (extendable).
- P0. Per-question editor state, so switching questions preserves each question's code.
- P0. Visible remote cursors with participant name.
- P1. Interviewer can lock or unlock the candidate's editor.
- P1. Starter code per question and language.

### 6.4 Code Execution
- P0. Run code against the question's visible test cases and see stdout, stderr, runtime, and pass/fail per case.
- P0. Hidden test cases visible only to the interviewer; candidate sees only the aggregate pass/fail for them.
- P0. Execution limits: CPU time, wall time, memory, output size, no network.
- P1. Custom input run ("Run with stdin") for free-form exploration.

### 6.5 Whiteboard
- P0. Shared real-time whiteboard (shapes, freehand, text, connectors).
- P0. Whiteboard persists per interview and is saved as a snapshot on completion.
- P1. Separate boards per question or per section.

### 6.6 Video, Audio, and Screen Share
- P0. Two-way audio and video.
- P0. Candidate screen share, visible to the interviewer. Interviewer can request it; the candidate approves via the browser prompt.
- P0. Clear on-screen indicators for who is sharing what.
- P1. Interviewer screen share.
- P2. Cloud recording of the session via LiveKit Egress, stored in object storage, played back in the dashboard alongside the replay timeline. Recording starts only after both participants have consented, and an active-recording indicator is always visible.

### 6.7 Question Bank
- P0. Interviewers create, edit, archive, and tag questions (title, description in Markdown, difficulty, tags, per-language starter code).
- P0. Each question has visible and hidden test cases.
- P0. Questions can be attached to an interview before or during the session.
- P1. Duplicate and import/export a question as JSON.

### 6.8 Interviewer Notes and Scoring
- P0. Private notes panel (Markdown). Candidate never receives these.
- P0. Notes are timestamped relative to interview start, and appear as markers on the replay timeline.
- P0. Rubric: reusable template of criteria (e.g. Problem Solving, Code Quality, Communication, System Design), each rated on a defined scale with level descriptors.
- P0. Final scorecard: per-criterion rating, free-text justification, overall recommendation (Strong Hire / Hire / No Hire / Strong No Hire).
- P1. Interview timer with section markers.

### 6.9 Past Interviews Dashboard
- P0. Table of all interviews with: candidate, role, date, duration, status, recommendation, overall score.
- P0. Search by candidate name; filter by status, recommendation, date range, role; sort by any column.
- P0. Interview detail page with tabs: **Summary**, **Code**, **Whiteboard**, **Notes**, **Scorecard**, **Replay**.
- P0. Summary shows duration, questions asked, test results per question, and key notes.
- P0. Replay: timeline scrubber that reconstructs editor and whiteboard state at any time, with play/pause and speed control; note markers are clickable.
- P1. Compare two candidates on the same question or rubric.
- P1. Export interview report as PDF (Implemented via client-side browser print-to-PDF with `@media print` styling; deliberate architectural deviation from server-side rendering to eliminate high-memory Puppeteer/Chromium processes under zero-cost free-tier boundaries).
- P1. Aggregate stats: interviews per week, recommendation distribution, average duration.

### 6.10 Transparency Signals
- P1. Log tab visibility changes and window blur events on the candidate side.
- P1. Log large paste events (size and timestamp, not content beyond what is in the editor).
- P1. Show signals on the timeline and in the summary as neutral facts with no accusatory language.
- The candidate is told about this logging on the consent screen. Signals are advisory only.

## 7. System Architecture

```
                    ┌──────────────────────────────┐
                    │   Browser (Next.js, React)   │
                    │ Monaco · Excalidraw · LiveKit SDK │
                    └──┬───────────┬────────────┬───┘
                       │ HTTPS     │ WebSocket  │ WebRTC
                       ▼           ▼            ▼
              ┌────────────┐ ┌───────────┐ ┌─────────────┐
              │  API       │ │  Collab   │ │  LiveKit    │
              │  (NestJS)  │ │ (Hocuspocus│ │  server     │
              │            │ │  + Yjs)   │ │             │
              └──┬───┬─────┘ └─────┬─────┘ └─────────────┘
                 │   │             │
        ┌────────┘   └───────┐     │
        ▼                    ▼     ▼
   ┌──────────┐        ┌─────────────┐      ┌──────────────┐
   │ Postgres │        │   Redis     │      │  Judge0      │
   │ (Prisma) │        │ presence,   │      │ (Docker,     │
   │          │        │ rate limits │      │  sandboxed)  │
   └──────────┘        └─────────────┘      └──────────────┘
                              │
                       ┌──────▼──────┐
                       │ Object store│
                       │ (Supabase S3)│
                       └─────────────┘
```

### Components
- **Web (Next.js):** UI, routing, server-rendered marketing and auth pages, client-side interview room.
- **API (NestJS):** REST API, auth, validation, business logic, Judge0 orchestration, LiveKit token issuance.
- **Collab server (Hocuspocus):** Yjs document sync for editor and whiteboard. Authenticates each connection against the room token and persists updates.
- **LiveKit:** Media transport for video, audio, and screen share.
- **Judge0:** Isolated code execution. Never exposed to the public internet; only the API talks to it.
- **Postgres:** System of record.
- **Redis:** Presence, rate limiting, short-lived execution job state.
- **Object storage:** Whiteboard snapshots, exported reports, optional recordings.

### Key Design Decisions
1. **CRDT sync (Yjs)** for the editor and whiteboard, so concurrent edits merge without conflicts and reconnects recover cleanly.
2. **Update log for replay.** The collab server stores each Yjs update with a timestamp. Replay rebuilds the document state at time *t* by applying updates up to *t*. Periodic snapshots keep seeks fast.
3. **Managed media layer (LiveKit)** rather than raw WebRTC, to avoid reimplementing reliability.
4. **Judge0 as an internal service.** Code never runs inside the API process.

## 8. Tech Stack

| Layer | Choice |
|---|---|
| Language | TypeScript (strict) across all packages |
| Frontend | Next.js (App Router), React, Tailwind CSS |
| Editor | Monaco Editor with y-monaco binding |
| Whiteboard | @excalidraw/excalidraw with Yjs sync |
| Real-time sync | Yjs + Hocuspocus |
| Media | LiveKit Cloud Build plan (free) & browser MediaRecorder chunked recording |
| API | NestJS |
| Validation | Zod, shared between frontend and backend |
| Database | PostgreSQL with Prisma |
| Cache | Redis |
| Execution | Judge0 CE on RapidAPI (production) / self-hosted Judge0 Docker (local dev) |
| Storage | S3-compatible (Supabase Storage free tier; MinIO for local dev) |
| Testing | Vitest (unit), Playwright (end-to-end), Supertest (API) |
| Tooling | pnpm workspaces, ESLint, Prettier, Husky + lint-staged, Commitlint |
| Infra | Vercel (Web), Render Free Services (API & Collab), GitHub Actions CI, Cloudflare Quick Tunnel |

Pin exact dependency versions. Before adding any library not listed here, stop and ask.

## 9. Data Model

Primary keys are UUIDs. All tables have `created_at` and `updated_at`.

| Table | Key fields |
|---|---|
| **users** | id, email (unique), password_hash, display_name |
| **rubric_templates** | id, owner_id → users, name |
| **rubric_criteria** | id, template_id, name, description, weight, level_descriptors (JSON) |
| **questions** | id, owner_id, title, description_md, difficulty, tags (text[]), archived_at |
| **question_languages** | id, question_id, language, starter_code |
| **test_cases** | id, question_id, input, expected_output, is_hidden, order |
| **interviews** | id, interviewer_id, candidate_name, role_title, status, rubric_template_id, scheduled_at, started_at, ended_at, room_token_hash |
| **interview_questions** | id, interview_id, question_id, order, language, started_at |
| **code_runs** | id, interview_question_id, language, source_snapshot, results (JSON), requested_at, duration_ms |
| **notes** | id, interview_id, body_md, offset_ms |
| **scorecards** | id, interview_id, recommendation, summary_text, submitted_at |
| **scorecard_ratings** | id, scorecard_id, criterion_id, rating, justification |
| **collab_updates** | id, interview_id, doc_type (`code:<iqId>` or `whiteboard`), payload (bytea), offset_ms |
| **collab_snapshots** | id, interview_id, doc_type, payload, offset_ms |
| **signals** | id, interview_id, type, metadata (JSON), offset_ms |

Indexes: `interviews(interviewer_id, status, started_at)`, `collab_updates(interview_id, doc_type, offset_ms)`, `notes(interview_id, offset_ms)`.

## 10. API Design (REST, JSON)

All endpoints are under `/api/v1`. Request and response bodies are validated with shared Zod schemas. Errors use a consistent shape: `{ "error": { "code": string, "message": string, "details"?: unknown } }`.

### Auth
- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`

### Interviews
- `POST /interviews` · `GET /interviews` (filters, pagination, sorting) · `GET /interviews/:id` · `PATCH /interviews/:id` · `POST /interviews/:id/start` · `POST /interviews/:id/end` · `POST /interviews/:id/cancel`
- `POST /interviews/:id/questions` · `DELETE /interviews/:id/questions/:iqId`

### Room access
- `POST /rooms/join` (candidate token → short-lived session) · `POST /rooms/:id/admit` (interviewer admits candidate)
- `POST /rooms/:id/media-token` (issues LiveKit token by role)

### Execution
- `POST /interview-questions/:iqId/run` · `POST /interview-questions/:iqId/run-custom`

### Notes and scoring
- `POST /interviews/:id/notes` · `GET /interviews/:id/notes` · `PATCH` / `DELETE` note
- `PUT /interviews/:id/scorecard` · `GET /interviews/:id/scorecard`

### Question bank and rubrics
- CRUD under `/questions` and `/rubrics`

### Review
- `GET /interviews/:id/replay` (metadata, snapshots index, signals) · `GET /interviews/:id/replay/updates?doc=&from=&to=`
- `GET /dashboard/stats`
- `GET /interviews/:id/report.pdf` (P1) (Client-side browser print-to-PDF export via dashboard detail page)

Rate limits apply to auth, join, and run endpoints.

## 11. Real-Time Design

- Each interview has one Yjs document per question (`code:<interviewQuestionId>`) and one for the whiteboard.
- Hocuspocus authenticates the socket using the room session, checks role and permissions, and rejects writes from the candidate when the editor is locked or the interview has ended.
- Updates are appended to `collab_updates` with `offset_ms` computed from interview start. A snapshot is written every N updates or every 30 seconds.
- **Replay:** the client requests the nearest snapshot before time *t*, then applies updates up to *t*. Playback streams updates in order, scaled by playback speed.
- Presence (who is connected, cursor positions) uses Yjs awareness. Connection state is shown in the UI, and reconnects are automatic.

## 12. Code Execution and Security

- Judge0 runs in its own Docker network with no outbound internet access, and is reachable only from the API.
- Enforce per-run limits: CPU time, wall time, memory, process count, file size, stdout size.
- Hidden test cases never leave the server. Candidates receive only pass/fail counts for them.
- Rate-limit runs per room and per IP.
- Never evaluate user code in the API process.

**General security requirements**
- Room tokens are random, high entropy, stored hashed, expiring, and single-interview scoped.
- Role checks on every REST endpoint and every collab connection.
- Input validation on all boundaries. Parameterized queries only (via Prisma).
- CORS restricted to the app origin. Security headers (CSP, HSTS, frame protections).
- Secrets only through environment variables. Provide `.env.example`. Never commit secrets.
- Candidate privacy: consent screen before any media or logging; clear indicator when screen share or recording is active; configurable data retention (default 90 days) with a delete-interview action.

## 13. Design System

### Principles
Calm, dense, and precise. The room is used for up to an hour, so the UI must be quiet and readable. It should look like a tool built by an engineer who respects interviewers' time, not a marketing template.

### Color tokens (dark theme is the default and the only theme required for v1)

| Token | Hex | Use |
|---|---|---|
| `bg-base` | `#1E2019` (Carbon Black) | App background, editor background |
| `bg-surface` | `#393E41` (Gunmetal) | Panels, cards, sidebars, inputs |
| `text-primary` | `#D3D0CB` (Dust Grey) | Body text, headings, borders at reduced opacity |
| `accent` | `#E2C044` (Old Gold) | Primary buttons, active states, key highlights. Use dark text (`#1E2019`) on it. |
| `accent-secondary` | `#587B7F` (Pine Blue) | Secondary buttons, links, info states, candidate cursor |

Add these semantic colors, desaturated to match the palette: `success` (muted green), `danger` (muted red), `warning` (amber distinct from the gold accent). Define everything as CSS variables and Tailwind theme tokens. Hard-coded hex values in components are not allowed.

Body text must meet WCAG AA contrast. Pine Blue is for accents and icons, not small body text.

### Typography
- UI: Inter.
- Code: JetBrains Mono.
- A defined type scale (12, 14, 16, 20, 24, 32). Do not introduce sizes outside it.

### Spacing, shape, motion
- 4px spacing grid. Use only multiples of 4.
- Corner radius: 6px for controls, 10px for panels. One border style, 1px at low opacity.
- No gradients, glows, or decorative shadows. Use a subtle shadow only for floating elements (menus, dialogs).
- Motion: 120–180ms ease-out for state changes only. No decorative animation.

### Layout: the interview room
- Left: question panel and test results.
- Center: editor (default), switchable to whiteboard. Run controls beneath.
- Right: video tiles (small), then interviewer-only panel with notes, rubric, and timer. The candidate view omits the interviewer-only panel.
- Top bar: interview name, elapsed time, connection status, sharing indicators, end-interview button.

### Components
Build a small internal component library (Button, IconButton, Input, Select, Tabs, Dialog, Toast, Table, Badge, Tooltip, Skeleton, EmptyState). Use Radix primitives for accessibility. All components support keyboard navigation and visible focus states. Provide loading, empty, and error states for every data view.

### Iconography
One icon set only (Lucide). No emoji anywhere in the UI.

### Branding
The wordmark is "Crucible" in Inter semibold, set in `text-primary` with no logo glyph required for v1. If a mark is added, it must be a simple geometric shape using the palette.

## 14. Repository Structure

```
crucible/
├── apps/
│   ├── web/              # Next.js app
│   ├── api/              # NestJS API
│   └── collab/           # Hocuspocus server
├── packages/
│   ├── shared/           # Zod schemas, types, constants
│   ├── ui/               # Internal component library
│   └── config/           # ESLint, TS, Tailwind presets
├── infra/
│   ├── docker/           # Compose files, Judge0 config, LiveKit config
│   └──├── docs/
│   ├── architecture.md
│   ├── decisions/        # Short ADRs for key choices
│   └── images/
├── .github/workflows/
├── .env.example
└── README.md
```

## 15. Engineering Standards

- TypeScript `strict` mode on. No `any`; use `unknown` and narrow. No `@ts-ignore` without an explanatory comment and a linked issue.
- Feature-based folder structure inside each app. Small modules with a single responsibility. No file over roughly 300 lines without a reason.
- Business logic lives in services, not controllers or React components.
- Shared types and validation live in `packages/shared`, never duplicated.
- Naming: descriptive, consistent, no abbreviations that need decoding.
- Errors: typed error classes, consistent API error shape, no swallowed exceptions, no `console.log` in committed code (use a logger).
- Comments explain *why*, not *what*. No commented-out code, no TODOs without an issue reference.
- Git: small commits, Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`). One concern per commit. Work on feature branches and merge through PRs even when solo, so history reads cleanly.
- CI must pass (lint, typecheck, tests, build) before merging.

## 16. Instructions for the Coding Agent (Antigravity)

> This section is binding. Read it fully before writing any code and re-read it at the start of each phase. If any instruction conflicts with a convenient shortcut, follow the instruction.

### 16.1 Working method
1. Work **one phase at a time** (Section 18). Do not start a phase until the previous phase's acceptance criteria are met and verified.
2. Before each phase, post a short plan: files to create or change, and any decisions that need approval. Wait for approval on anything that deviates from this PRD.
3. **Do not add features, pages, libraries, or services that are not in this PRD.** If something seems missing, ask. Do not silently expand scope.
4. **Do not change the tech stack.** Propose changes with a reason and wait.
5. Make small, reviewable changes and commit with Conventional Commit messages after each coherent unit of work.
6. Run lint, typecheck, and tests before declaring any task done, and report the actual results. Never claim something works without running it.
7. If you are blocked or uncertain, say so plainly instead of guessing or inventing an API.

### 16.2 Code quality rules
- Follow Section 15 exactly.
- Do not generate placeholder logic, fake data presented as real, or stubs that look finished. If something is not implemented, mark it clearly in the code and in the phase report.
- Never hardcode secrets, URLs, or magic numbers. Use configuration.
- Verify every third-party API call against current official documentation. Do not rely on memory for library APIs, since LiveKit, Excalidraw, Hocuspocus, and Judge0 change often.
- Prefer the simplest solution that meets the requirement. No speculative abstractions, no unnecessary design patterns, no over-engineering.
- No dead code, unused exports, unused dependencies, or leftover scaffolding files. Remove framework boilerplate (default Next.js pages, example components, sample READMEs).

### 16.3 Anti-"AI slop" UI rules
The interface must look hand-designed by an engineer with taste. These are hard rules:
- **Use only the design tokens in Section 13.** No colors, font sizes, radii, or spacing values outside them.
- **No gradients** (backgrounds, text, or buttons), no glassmorphism, no glow effects, no neon, no purple/blue-to-pink anything.
- **No emoji** in UI, copy, commit messages, comments, or the README.
- **No stock marketing patterns:** no generic hero section with a floating mockup, no "Trusted by" logo strips, no three-column feature grid with icons, no fake testimonials, no fake statistics, no fake company names.
- **No lorem ipsum or placeholder copy.** All text is real, specific, and written for the product. Write copy in a plain, direct voice. Avoid filler like "seamless", "supercharge", "unlock", "revolutionize", "effortless", or "next-generation".
- **No decorative animation**, no bouncing, parallax, or entrance animations on everything.
- **Consistency over variety:** the same component for the same job, everywhere. Do not create near-duplicate buttons or cards.
- **Real states:** every data view has designed loading (skeleton), empty (with a useful next action), and error states. Forms show inline validation messages.
- **Density suits a work tool.** Prefer compact, information-rich layouts over oversized cards with excessive padding.
- **Accessibility is not optional:** semantic HTML, labels on all inputs, keyboard navigation, visible focus, AA contrast.
- Do not use default component-library themes unstyled. Everything must be visibly consistent with the Crucible tokens.

### 16.4 Writing rules (README, docs, comments, UI copy)
- Plain, factual, specific. State what the project does and how it works.
- Do not exaggerate or claim features that are not implemented and tested.
- README must include: what it is, a screenshot or demo link, architecture diagram, tech stack with reasons, how to run locally, how to run tests, known limitations, and future work. Keep it honest.
- No buzzword paragraphs, no AI-sounding introductions, and no emoji-bulleted feature lists.

### 16.5 Definition of done for any task
- Implements the stated requirement and nothing extra.
- Typechecks, lints, and passes tests. New logic has tests.
- Has handled loading, empty, and error states where relevant.
- Follows the design tokens and standards above.
- Leaves no debugging code or unused files behind.
- The agent has reported what was done, what was verified, and what remains.

## 17. Testing Strategy

- **Unit tests (Vitest):** scoring calculations, replay reconstruction logic, token generation and validation, permission checks, input schemas.
- **API tests (Supertest):** auth flows, interview lifecycle, role-based access, rate limits, execution endpoint behavior with a mocked Judge0.
- **Integration tests:** Hocuspocus authentication and permission rejection; update log persistence and replay reconstruction.
- **End-to-end (Playwright):** two browser contexts, one interviewer and one candidate. Cover create → join → admit → type code → see sync → run tests → add note → end → review in dashboard.
- Target meaningful coverage on core logic rather than a coverage percentage.

## 18. Build Plan and Acceptance Criteria

### Phase 0: Setup
Monorepo, tooling, CI, Docker Compose (Postgres, Redis, local storage), design tokens, base component library skeleton.
**Done when:** `pnpm install && pnpm dev` runs web and API; CI passes on an empty feature.

### Phase 1: Foundation
Auth (including password reset), interview CRUD, room creation, candidate join via token, lobby and admit, live shared editor with remote cursors, per-question starter code, editor lock and unlock.
**Done when:** an interviewer creates a room, a candidate joins from the link in another browser, admission works, and both see each other's edits and cursors in real time. Reconnect restores state.

### Phase 2: Core interview
Question bank (including duplicate and JSON import/export), attach questions, Judge0 integration with visible and hidden test cases, custom stdin runs, multi-language support, synced whiteboard with separate boards per question or section.
**Done when:** the interviewer assigns a question, the candidate runs code, results appear for both (hidden cases reported as aggregate to the candidate), and the whiteboard syncs.

### Phase 3: Presence
LiveKit audio, video, candidate and interviewer screen share with indicators and consent flow, and cloud session recording with playback.
**Done when:** both participants hear and see each other and the interviewer sees the candidate's shared screen.

### Phase 4: Interviewer tools
Timestamped notes, rubric templates, timer with section markers, scorecard, end-of-interview flow.
**Done when:** the interviewer completes a scorecard and the data is saved and retrievable.

### Phase 5: Dashboard and replay
Interview list with search, filters, sorting; detail page with all tabs; replay with scrubber and note markers; recording playback; aggregate stats; side-by-side candidate comparison; PDF report export.
**Done when:** a completed interview can be fully reviewed and replayed to any point in time with correct editor and whiteboard state.

### Phase 6: Signals and hardening
Transparency signals, rate limits, security headers, retention and delete, error handling pass, accessibility pass.

### Phase 7: Zero-cost production release
Zero-cost cloud deployment (Vercel, Render, Neon, Upstash, LiveKit Cloud, RapidAPI Judge0, Supabase S3, Brevo), demo data seeding, README, architecture doc, ADRs, and deployment verification.

## 19. Deployment

- Zero-cost production stack: Web on Vercel free plan (*.vercel.app); API & Collab on Render free web services (*.onrender.com); Neon Postgres; Upstash Redis; Supabase Storage S3; LiveKit Cloud Build plan; RapidAPI Judge0; Brevo single verified sender.
- LiveKit via LiveKit Cloud or a self-hosted instance with the required UDP ports open.
- Judge0 requires privileged container settings; isolate it from the rest of the stack and from the internet.
- Environment-based configuration. Database migrations run on deploy. Automated backups of Postgres.

## 20. Success Criteria

- A full interview can be run end to end in one tab without any third-party tool.
- Editor sync latency feels instant on a normal connection; reconnects recover without data loss.
- Replay reconstructs correct state at arbitrary timestamps.
- Candidate join to first keystroke takes under one minute with no account.
- Judge0 sandbox restrictions hold under a basic abuse test (infinite loop, memory bomb, fork bomb, network attempt).
- CI is green, with unit, API, and end-to-end tests covering the core flow.
- The repository reads as professional: clean history, clear README, documented architecture, and a working live demo.

## 21. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| WebRTC complexity and cross-network reliability | Use LiveKit; test across networks early |
| Judge0 setup and sandbox hardening | Isolate on internal network; apply strict limits; run abuse tests |
| Replay accuracy and storage growth | Periodic snapshots; compress update log; retention policy |
| Scope creep from the coding agent | Section 16 rules; phase gates; plan-before-code |
| Generic-looking UI | Strict design tokens; anti-slop rules; manual design review each phase |
| Large scope for one developer | Phases are independently demo-able and each phase has acceptance criteria. Scope is fixed: no feature is dropped. If time runs short, extend the schedule rather than cutting features. |

## 22. Future Work (README only, not v1)

AI-assisted question suggestions, calendar integration, team accounts and roles, ATS export, session recording with transcripts, behavioral and system-design interview templates, candidate-side practice mode.
