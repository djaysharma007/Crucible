'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';

import { HocuspocusProvider } from '@hocuspocus/provider';
import { apiClient } from '@/lib/api-client';
import { fetchCollabToken } from '@/lib/collab/collab-token';
import { Camera, Check, Lock } from 'lucide-react';
import '@excalidraw/excalidraw/index.css';

// Dynamic import with SSR disabled since Excalidraw requires browser APIs (canvas, window)
const Excalidraw = dynamic(
  async () => {
    const mod = await import('@excalidraw/excalidraw');
    return mod.Excalidraw;
  },
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#181A1B] text-muted text-xs font-mono">
        Loading whiteboard canvas...
      </div>
    ),
  },
);

export interface ExcalidrawElementStub {
  id: string;
  version: number;
  versionNonce: number;
  isDeleted?: boolean;
  [key: string]: unknown;
}

interface WhiteboardProps {
  interviewId: string;
  activeQuestionId?: string | null;
  readOnly?: boolean;
}

export function Whiteboard({ interviewId, activeQuestionId, readOnly = false }: WhiteboardProps) {
  const [isSynced, setIsSynced] = React.useState(false);
  const [isSavingSnapshot, setIsSavingSnapshot] = React.useState(false);
  const [snapshotSaved, setSnapshotSaved] = React.useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const excalidrawAPIRef = React.useRef<any>(null);
  const providerRef = React.useRef<HocuspocusProvider | null>(null);
  const isApplyingRemoteRef = React.useRef(false);

  // Per-question or section whiteboard doc name (PRD Section 6.5)
  const docName = React.useMemo(() => {
    return activeQuestionId
      ? `whiteboard:${interviewId}:${activeQuestionId}`
      : `whiteboard:${interviewId}`;
  }, [interviewId, activeQuestionId]);

  React.useEffect(() => {
    setIsSynced(false);
    const collabUrl = process.env.NEXT_PUBLIC_COLLAB_URL || 'ws://localhost:4001';

    const provider = new HocuspocusProvider({
      url: collabUrl,
      name: docName,
      token: async () => {
        return fetchCollabToken(interviewId);
      },
    });
    providerRef.current = provider;

    const yDoc = provider.document;
    const yElements = yDoc.getMap<ExcalidrawElementStub>('excalidraw_elements');

    // 1. Initial Sync from Yjs Document to Excalidraw Scene
    const syncFromYjs = () => {
      if (!excalidrawAPIRef.current) return;
      const elements: ExcalidrawElementStub[] = [];
      yElements.forEach((val) => {
        if (val) elements.push(val);
      });

      if (elements.length > 0) {
        isApplyingRemoteRef.current = true;
        try {
          excalidrawAPIRef.current.updateScene({
            elements,
          });
        } catch {
          // Ignore initial render conflict
        } finally {
          isApplyingRemoteRef.current = false;
        }
      }
      setIsSynced(true);
    };

    provider.on('synced', () => {
      syncFromYjs();
    });

    // 2. Observe Remote Yjs Changes with element-level reconciliation (version & versionNonce)
    const observeYjs = () => {
      if (isApplyingRemoteRef.current || !excalidrawAPIRef.current) return;

      const currentElements: ExcalidrawElementStub[] =
        excalidrawAPIRef.current.getSceneElements?.() || [];
      const currentMap = new Map<string, ExcalidrawElementStub>(
        currentElements.map((el) => [el.id, el]),
      );

      let hasChanges = false;
      const reconciled: ExcalidrawElementStub[] = [];

      yElements.forEach((remoteElem, id) => {
        const localElem = currentMap.get(id);
        if (!localElem) {
          reconciled.push(remoteElem);
          hasChanges = true;
        } else if (
          remoteElem.version > localElem.version ||
          (remoteElem.version === localElem.version &&
            remoteElem.versionNonce > localElem.versionNonce)
        ) {
          reconciled.push(remoteElem);
          hasChanges = true;
        } else {
          reconciled.push(localElem);
        }
      });

      if (hasChanges) {
        isApplyingRemoteRef.current = true;
        try {
          excalidrawAPIRef.current.updateScene({ elements: reconciled });
        } finally {
          isApplyingRemoteRef.current = false;
        }
      }
    };

    yElements.observe(observeYjs);

    return () => {
      yElements.unobserve(observeYjs);
      provider.destroy();
    };
  }, [docName, interviewId]);

  // 3. Local changes: propagate to Yjs with version checks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (elements: readonly any[]) => {
    if (isApplyingRemoteRef.current || !providerRef.current) return;

    const yDoc = providerRef.current.document;
    const yElements = yDoc.getMap<ExcalidrawElementStub>('excalidraw_elements');

    yDoc.transact(() => {
      for (const el of elements) {
        const remote = yElements.get(el.id);
        if (
          !remote ||
          el.version > remote.version ||
          (el.version === remote.version && el.versionNonce > remote.versionNonce)
        ) {
          yElements.set(el.id, {
            id: el.id,
            version: el.version,
            versionNonce: el.versionNonce,
            type: el.type,
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            angle: el.angle,
            strokeColor: el.strokeColor,
            backgroundColor: el.backgroundColor,
            fillStyle: el.fillStyle,
            strokeWidth: el.strokeWidth,
            strokeStyle: el.strokeStyle,
            roughness: el.roughness,
            opacity: el.opacity,
            groupIds: el.groupIds,
            frameId: el.frameId,
            roundness: el.roundness,
            seed: el.seed,
            isDeleted: el.isDeleted,
            boundElements: el.boundElements,
            updated: el.updated,
            link: el.link,
            locked: el.locked,
            customData: el.customData,
            points: el.points,
            text: el.text,
            fontSize: el.fontSize,
            fontFamily: el.fontFamily,
            textAlign: el.textAlign,
            verticalAlign: el.verticalAlign,
            baseline: el.baseline,
            containerId: el.containerId,
            originalText: el.originalText,
            lineHeight: el.lineHeight,
          });
        }
      }
    });
  };

  const handleSaveSnapshot = async () => {
    if (!excalidrawAPIRef.current) return;
    try {
      setIsSavingSnapshot(true);
      const elements = excalidrawAPIRef.current.getSceneElements?.() || [];
      const snapshotString = JSON.stringify(elements);

      await apiClient.post(`/rooms/${interviewId}/whiteboard/snapshot`, {
        docType: docName,
        snapshot: snapshotString,
      });

      setSnapshotSaved(true);
      setTimeout(() => setSnapshotSaved(false), 2000);
    } catch (err) {
      alert((err as Error).message || 'Failed to save whiteboard snapshot');
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#121212] relative overflow-hidden">
      {/* Top status bar */}
      <div className="h-9 px-3 bg-[#1E2019] border-b border-[#393E41] flex items-center justify-between text-xs font-mono z-10 select-none">
        <div className="flex items-center gap-3">
          <span className="text-[#D3D0CB] font-semibold text-[11px] tracking-wide uppercase">
            {activeQuestionId ? 'Question Board' : 'Shared Whiteboard'}
          </span>
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <span
              className={`w-2 h-2 rounded-full ${
                isSynced ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span>{isSynced ? 'Synced' : 'Syncing...'}</span>
          </div>
          {readOnly && (
            <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
              <Lock className="w-3 h-3" />
              View Mode
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveSnapshot}
            disabled={isSavingSnapshot}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors border ${
              snapshotSaved
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                : 'bg-surface hover:bg-[#393E41] text-[#D3D0CB] border-[#393E41]'
            }`}
            title="Save Whiteboard Snapshot for replay & scorecard review"
          >
            {snapshotSaved ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Camera className="w-3 h-3" />
                <span>{isSavingSnapshot ? 'Saving...' : 'Save Snapshot'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 w-full h-full relative">
        <Excalidraw
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          excalidrawAPI={(api: any) => {
            excalidrawAPIRef.current = api;
          }}
          viewModeEnabled={readOnly}
          zenModeEnabled={false}
          theme="dark"
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
