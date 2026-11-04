# Crucible Architecture Documentation

## Overview

Crucible is built as a modular monorepo combining Next.js, NestJS, and Hocuspocus with Neon PostgreSQL, Upstash Redis, Supabase Storage (S3 API), Judge0 (RapidAPI free tier in production, local Docker for dev), and LiveKit Cloud.

## Workspace Layout

```
crucible/
├── apps/
│   ├── web/              # Next.js App Router frontend
│   ├── api/              # NestJS REST backend
│   └── collab/           # Hocuspocus CRDT real-time sync server
├── packages/
│   ├── shared/           # Zod schemas, types, constants
│   ├── ui/               # Internal accessible UI component library
│   └── config/           # Shared TypeScript, Tailwind, and ESLint configurations
├── infra/
│   └── docker/           # Docker Compose definitions for dependencies
├── docs/                 # Architecture notes and ADRs
└── .github/workflows/    # CI pipelines
```

## Data Layer

The database schema is managed via Prisma in `apps/api/prisma/schema.prisma`. It mirrors Section 9 of the PRD:

- `users`: Interviewer accounts with Argon2id hashed credentials.
- `interviews`: Interview sessions with states (`scheduled`, `live`, `completed`, `cancelled`) and room token hashes.
- `questions`, `question_languages`, `test_cases`: Question bank with starter templates and test specifications.
- `rubric_templates`, `rubric_criteria`: Reusable scoring rubrics.
- `notes`: Timestamped interviewer notes indexed by `(interview_id, offset_ms)`.
- `scorecards`, `scorecard_ratings`: Final evaluations and structured ratings.
- `collab_updates`, `collab_snapshots`: Raw Yjs update logs enabling precise timeline replay.
- `signals`: Advisory integrity telemetry (window blur, tab switches, paste events).

## Design System Implementation

Crucible uses an uncompromising dark palette strictly implemented via Tailwind CSS tokens and CSS variables:

- `bg-base`: `#1E2019` (Carbon Black)
- `bg-surface`: `#393E41` (Gunmetal)
- `text-primary`: `#D3D0CB` (Dust Grey)
- `accent`: `#E2C044` (Old Gold) with `#1E2019` text
- `accent-secondary`: `#587B7F` (Pine Blue)
- Semantic accents: `success` (`#4E7A5A`), `danger` (`#A84B4B`), `warning` (`#C48B3F`)
- Spacing: Strict 4px grid
- Corner radii: 6px controls, 10px panels
- Zero decorative gradients, emoji, or excessive animations
