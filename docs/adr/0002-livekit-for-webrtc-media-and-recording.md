# ADR 0002: LiveKit SFU for WebRTC Presence, Video/Audio, and Cloud Recording

## Status
Accepted

## Context
Crucible unifies face-to-face video, audio communication, candidate screen sharing, and server-side cloud recording in a single browser room without requiring third-party tools (Zoom, Google Meet, or Loom).

Requirements:
1. Low latency audio/video across NATs and corporate firewalls.
2. Candidate screen sharing with permission request signaling by interviewer.
3. Server-side egress recording requiring double-consent state machine (both participants must opt in).
4. Frictionless candidate join with zero software installation or account creation.

## Decision
We chose **LiveKit** as our WebRTC infrastructure. In production, it connects to LiveKit Cloud or self-hosted LiveKit Server using the `livekit-server-sdk` (Node.js) and `livekit-client` (browser).

### Key Architectural Rationale:
- **Selective Forwarding Unit (SFU):** Far more bandwidth- and CPU-efficient than mesh P2P or monolithic MCU architectures.
- **Granular Token Grants:** Tokens are scoped per room and per role. Interviewers receive administrative grants (`roomAdmin`, `recorder`), while candidates receive scoped publisher grants.
- **State Machine in Redis:** Double-consent recording state (`recording:consent:<interviewId>`) is managed atomically in Redis. LiveKit Egress is initiated only when both participants confirm consent.
- **Lossless Recording:** LiveKit Egress renders the composite room directly to MP4 and uploads to S3/MinIO storage.

## Consequences
- Requires UDP ports (7880, 7881, 50000-60000) open in self-hosted environments.
- Fallback mock service provides deterministic local development when LiveKit cloud credentials are omitted.

