# ADR 0001: CRDT with Yjs and Hocuspocus for Real-Time Collaborative Editing

## Status
Accepted

## Context
Crucible unifies live code editing and freehand architectural whiteboarding in a single browser room. Two participants (interviewer and candidate) collaborate concurrently. The editor must support:
1. Low-latency concurrent character insertions and deletions without cursor jumping.
2. Resilience across network latency spikes and transparent reconnection without data loss.
3. Chronological persistence of state updates for arbitrary point-in-time timeline replay.

## Decision
We adopted **Yjs** as our Conflict-Free Replicated Data Type (CRDT) framework, paired with **Hocuspocus** as the WebSocket synchronization server.

### Key Architectural Rationale:
- **No Transformation Centralization:** Unlike Operational Transformation (OT) which requires a centralized state machine with complex transform matrices, Yjs operates symmetrically with deterministic convergence.
- **Timeline Replay by Design:** Yjs updates are binary delta payloads that can be appended to an immutable append-only table (`collab_updates`) with `offset_ms`. A client can reconstruct the exact editor and whiteboard state at any timestamp $t$ by taking a periodic snapshot and applying deltas up to $t$.
- **Unified Document Model:** Both Monaco Editor (code) and Tldraw (whiteboard) bind directly to Yjs documents (`code:<interviewQuestionId>` and `whiteboard:<interviewId>`).
- **Presence & Awareness:** Yjs awareness maps cursor positions and selections seamlessly over WebSocket.

## Consequences
- Requires binary update storage in PostgreSQL (`Bytes` columns).
- Periodic snapshots are written every 30 seconds or $N$ updates to bound replay reconstruction overhead.
- Clean separation of concern: the Hocuspocus collab server runs independently of the NestJS REST API.

