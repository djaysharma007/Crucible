# ADR 0002: LiveKit Cloud WebRTC and Browser-Side MediaRecorder Chunked Storage

## Status
Accepted

## Context
Crucible delivers high-quality real-time audio, video, and screen sharing during technical interviews, alongside recording capability for hiring committees to review candidate performance.

An audit of LiveKit Cloud's pricing and documentation for the free **Build Plan** verified the following limits:
- Included participant minutes: **10,000 minutes/month** at $0.
- Maximum concurrent participants: **100 participants**.
- Maximum concurrent rooms: **50 rooms**.
- **LiveKit Cloud Egress is NOT free**: Cloud Egress requires a paid usage-based tier ($0.005/minute for audio, $0.020/minute for composite video) or dedicated serverless infrastructure. Self-hosting LiveKit Egress requires a separate high-CPU Redis/Chromium container that exceeds Render free-tier memory (512 MB).

## Decision
1. **Real-time WebRTC**: Retain LiveKit Cloud free Build Plan for audio, video, and screen share delivery. It satisfies all interactive low-latency WebRTC requirements without server overhead.
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
- Requires zero paid egress servers or cloud egress charges.
- A 60-minute interview recording consumes ~250 MB, remaining comfortably within Supabase Storage's 1 GB free tier.
- No heavy Chromium or GStreamer transcoding burden on Render free containers.
