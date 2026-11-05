# ADR 0004: Supabase Storage via S3-Compatible API for Zero-Cost File Artifacts

## Status

Accepted

## Context

Crucible stores interview artifacts, including collaborative whiteboard snapshots, interview feedback exports, and browser-recorded video/audio chunks.
The previous plan assumed self-hosted MinIO running on a VPS. In a zero-cost architecture without a VPS, a reliable free cloud object store is required.

Verified Supabase Storage Free Tier Limits ([Supabase Pricing](https://supabase.com/pricing) & [Storage Guide](https://supabase.com/docs/guides/storage)):

- **Total Storage**: **1 GB** included at $0/month.
- **Monthly Bandwidth (Egress)**: **5 GB/month** included (5 GB cached / 5 GB uncached).
- **Max File Size**: **50 MB** per upload.
- **Protocol**: Standard S3-compatible protocol (`https://<project-ref>.supabase.co/storage/v1/s3`).
- **Recording Playback Capacity**: At 500 kbps video + 64 kbps audio (~70.5 KB/s), a 60-minute interview recording consumes ~250 MB (0.25 GB). The 5 GB free monthly egress quota supports **~20 complete 60-minute interview playbacks** (or ~40 30-minute playbacks) each month.

## Decision

1. Implement `StorageService` using `@aws-sdk/client-s3` targeting Supabase Storage's S3-compatible gateway.
2. Store artifacts in the dedicated `crucible-recordings` bucket.
3. Configure credentials via environment variables:
   - `SUPABASE_S3_ENDPOINT`: `https://<project-ref>.supabase.co/storage/v1/s3`
   - `SUPABASE_S3_REGION`: `us-east-1`
   - `SUPABASE_S3_BUCKET`: `crucible-recordings`
   - `SUPABASE_S3_ACCESS_KEY`: Project S3 Access Key ID
   - `SUPABASE_S3_SECRET_KEY`: Project S3 Secret Access Key
4. All chunk uploads (`POST /api/v1/rooms/:id/recording/chunk`) and snapshot uploads are streamed into Supabase S3.

## Consequences

- Zero infrastructure maintenance and zero monthly hosting cost.
- Standard AWS S3 SDK allows switching back to any local S3-compatible tool (like MinIO) during local offline development without application code changes.
- 10-second chunks (~700 KB) easily stay under Supabase's 50 MB per-file limit.
