# ADR 0001: Whiteboard Engine Migration to Excalidraw with Yjs Reconciliation

## Status
Accepted

## Context
Crucible requires an embedded collaborative whiteboard for system design and architecture interview rounds. The initial prototype considered `tldraw`. However, an audit of `tldraw`'s commercial licensing revealed that production usage requires a paid commercial license and enterprise contract. Hard Rule 1 of the zero-cost production mandate strictly prohibits paid commercial licenses or expiring trial software.

Furthermore, multi-user whiteboard collaboration must preserve CRDT convergence without race conditions or element duplication.

## Decision
1. Replace `tldraw` with `@excalidraw/excalidraw` (MIT License), which is completely free for commercial and non-commercial production deployment.
2. Synchronize whiteboard state across participants using Yjs (`y-websocket` / Hocuspocus).
3. To eliminate race conditions and avoid naive state overwrites, implement an element-level reconciliation algorithm comparing `version` and `versionNonce` attributes:
   - Elements are stored in a Yjs `Y.Array<ExcalidrawElement>`.
   - When local elements update, the reconciler updates existing elements in place only if `local.version > remote.version` or `(local.version === remote.version && local.versionNonce > remote.versionNonce)`.
   - Elements deleted or created are reflected accurately without blowing away remote participant strokes.
4. Support per-question whiteboard document scopes (`whiteboard:${interviewId}:${questionId || 'main'}`), serialized snapshots in `collab_snapshots`, and read-only mode during post-interview replay.

## Consequences
- Zero license fees, zero recurring cost, and full open-source compliance under the MIT license.
- Clean Next.js dynamic import (`ssr: false`) prevents canvas/window SSR hydration mismatches.
- Whiteboard replay and snapshot capabilities remain fully operational.
