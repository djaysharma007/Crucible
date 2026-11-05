# ADR 0002: LiveKit Cloud WebRTC and Browser-Side MediaRecorder Chunked Storage

## Status

Accepted

## Context

Crucible delivers high-quality real-time audio, video, and screen sharing during technical interviews, alongside recording capability for hiring committees to review candidate performance.

An audit of LiveKit Cloud's pricing and documentation for the free **Build Plan** ([LiveKit Pricing](https://livekit.io/pricing)) verified the following official limits:

- **Monthly Cost**: $0 (No credit card required).
- **WebRTC Participant Minutes**: **10,000 minutes/month** included at $0.
- **Data Transfer / Bandwidth**: 50 GB downstream included.
- **LiveKit Cloud Egress Allowance**:
  - **Transcode Minutes** (RoomComposite / Participant Egress): **60 minutes/month total** (shared with stream import).
  - **Track Egress** (Raw stream exports): **60 minutes/month total**.
  - **Concurrent Exports**: **Up to 2 concurrent exports**.
  - **Hard Caps**: On the free Build plan, all included allowances act as **hard caps**. When 60 minutes of recording egress are reached in a calendar month, subsequent egress jobs fail rather than incurring overage charges.
- **Architectural Impact**: A 60-minute monthly egress cap means that a single 1-hour technical interview completely consumes 100% of the account's monthly recording allotment. Any subsequent interviews conducted within that same month would fail to record if relying on LiveKit Cloud Egress. Furthermore, self-hosting LiveKit Egress requires a dedicated container running headless Chromium, Redis, and GStreamer, requiring 2-4 CPU cores and >2 GB RAM—vastly exceeding the Render free-tier allowance (512 MB RAM).

## Decision

1. **Real-time WebRTC**: Retain LiveKit Cloud free Build Plan for audio, video, and screen share delivery. It satisfies all interactive low-latency WebRTC requirements (10,000 participant minutes/month) without server overhead.
2. **Interview Recording**: Implement client-side recording within the interviewer's browser using the HTML5 `MediaRecorder` API:
   - Combine interviewer microphone audio with candidate audio tracks using Web Audio API (`AudioContext` and `ChannelMergerNode`).
   - If screen share is active, combine video tracks; otherwise record composite video/audio.
   - Constrain encoding bitrates to **500 kbps video** and **64 kbps audio** (VP8/WebM or H.264/AAC), producing ~70 KB/s (~4.2 MB/minute).
   - Capture continuous **10-second chunks** (`recorder.start(10000)`) and upload them immediately via `POST /api/v1/rooms/:id/recording/chunk`.
   - Storing sequential chunks directly in Supabase Storage ensures that if an interviewer tab is unexpectedly closed or crashes, at most 10 seconds of recording is lost.
3. **Candidate Consent and Active Recording Indicators**:
   - Explicit two-step candidate consent dialog is required before recording starts.
   - Both interviewer and candidate UIs show a prominent, pulsing amber/red `RECORDING IN PROGRESS` indicator throughout the session.
4. **Playback**:
   - Replay dashboard streams recorded WebM chunks sequentially or loads finalized recordings directly from Supabase Storage S3.

## Consequences

- Bypasses LiveKit Cloud Egress's 60-minute monthly hard cap entirely, enabling unlimited interview recordings subject only to Supabase Storage's 1 GB quota (~4 full 60-minute interviews).
- Requires zero paid egress servers, zero credit card requirement, and zero cloud egress charges.
- No heavy Chromium or GStreamer transcoding burden on Render free containers.
