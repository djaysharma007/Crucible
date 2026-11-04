'use client';

import * as React from 'react';
import {
  Tldraw,
  createTLStore,
  defaultShapeUtils,
  defaultBindingUtils,
  TLRecord,
  TLStore,
  Editor,
} from 'tldraw';
import 'tldraw/tldraw.css';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { apiClient } from '@/lib/api-client';

interface WhiteboardProps {
  interviewId: string;
  activeQuestionId?: string | null;
  readOnly?: boolean;
}

export function Whiteboard({
  interviewId,
  activeQuestionId,
  readOnly = false,
}: WhiteboardProps) {
  const [store, setStore] = React.useState<TLStore | null>(null);
  const [isSynced, setIsSynced] = React.useState(false);
  const [isSavingSnapshot, setIsSavingSnapshot] = React.useState(false);
  const [snapshotSaved, setSnapshotSaved] = React.useState(false);
  const editorRef = React.useRef<Editor | null>(null);

  // Per-question or section whiteboard doc name (PRD Section 6.5)
  const docName = React.useMemo(() => {
    return activeQuestionId
      ? `whiteboard:${interviewId}:${activeQuestionId}`
      : `whiteboard:${interviewId}`;
  }, [interviewId, activeQuestionId]);

  React.useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateInstanceState({ isReadonly: readOnly });
    }
  }, [readOnly]);

  React.useEffect(() => {
    setIsSynced(false);
    const newStore = createTLStore({
      shapeUtils: defaultShapeUtils,
      bindingUtils: defaultBindingUtils,
    });

    const collabUrl = process.env.NEXT_PUBLIC_COLLAB_URL || 'ws://localhost:4001';
    const provider = new HocuspocusProvider({
      url: collabUrl,
      name: docName,
      token: 'room_participant',
    });

    const yDoc = provider.document;
    const yRecords = yDoc.getMap<TLRecord>('tldraw_records');

    let isApplyingRemote = false;

    // 1. Initial sync from Y.Doc to tldraw store
    const syncFromYjs = () => {
      const recordsToPut: TLRecord[] = [];
      yRecords.forEach((val) => {
        if (val) recordsToPut.push(val);
      });

      if (recordsToPut.length > 0) {
        isApplyingRemote = true;
        try {
          newStore.put(recordsToPut);
        } catch {
          // Ignore initial conflict
        } finally {
          isApplyingRemote = false;
        }
      }
      setIsSynced(true);
    };

    provider.on('synced', () => {
      syncFromYjs();
    });

    // 2. Listen to remote Yjs changes
    const observeYjs = (event: Y.YMapEvent<TLRecord>) => {
      if (isApplyingRemote) return;

      isApplyingRemote = true;
      try {
        const toPut: TLRecord[] = [];
        const toRemove: TLRecord['id'][] = [];

        event.changes.keys.forEach((change, key) => {
          if (change.action === 'add' || change.action === 'update') {
            const val = yRecords.get(key);
            if (val) toPut.push(val);
          } else if (change.action === 'delete') {
            toRemove.push(key as TLRecord['id']);
          }
        });

        if (toPut.length > 0) newStore.put(toPut);
        if (toRemove.length > 0) newStore.remove(toRemove);
      } finally {
        isApplyingRemote = false;
      }
    };

    yRecords.observe(observeYjs);

    // 3. Listen to local tldraw changes and propagate to Yjs
    const unlistenStore = newStore.listen(
      (entry) => {
        if (isApplyingRemote) return;

        yDoc.transact(() => {
          Object.values(entry.changes.added).forEach((record) => {
            yRecords.set(record.id, record);
          });
          Object.values(entry.changes.updated).forEach(([, to]) => {
            yRecords.set(to.id, to);
          });
          Object.values(entry.changes.removed).forEach((record) => {
            yRecords.delete(record.id);
          });
        });
      },
      { scope: 'document', source: 'user' },
    );

    setStore(newStore);

    return () => {
      unlistenStore();
      yRecords.unobserve(observeYjs);
      provider.destroy();
    };
  }, [docName]);

  const handleSaveSnapshot = async () => {
    if (!store) return;
    try {
      setIsSavingSnapshot(true);
      const snapshot = store.serialize();
      const snapshotString = JSON.stringify(snapshot);

      await apiClient.post(`/rooms/${interviewId}/whiteboard/snapshot`, {
        docType: docName,
        snapshot: snapshotString,
      });

      setSnapshotSaved(true);
      setTimeout(() => setSnapshotSaved(false), 2000);
    } catch {
      // Ignore or log error
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#1E2019] text-[#D3D0CB]">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#393E41] bg-[#1E2019]/90 text-xs font-mono select-none z-10">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#E2C044]" />
          <span className="font-medium text-[#D3D0CB]">
            {activeQuestionId ? 'Question Board' : 'Shared Whiteboard'}
          </span>
          <span className="text-[#D3D0CB]/50">({docName})</span>
          {!isSynced && <span className="text-[#E2C044] animate-pulse">Syncing...</span>}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveSnapshot}
            disabled={isSavingSnapshot || !isSynced}
            className="px-2.5 py-1 text-xs border border-[#393E41] hover:border-[#587B7F] rounded text-[#D3D0CB] hover:bg-[#393E41]/50 disabled:opacity-50 transition-colors"
          >
            {isSavingSnapshot ? 'Saving...' : snapshotSaved ? 'Snapshot Saved!' : 'Save Snapshot'}
          </button>
        </div>
      </div>

      <div className="flex-1 relative w-full h-full overflow-hidden">
        {store ? (
          <Tldraw
            store={store}
            autoFocus={false}
            onMount={(editor) => {
              editorRef.current = editor;
              editor.updateInstanceState({ isReadonly: readOnly });
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-[#D3D0CB]/50">
            Initializing collaborative whiteboard...
          </div>
        )}
      </div>
    </div>
  );
}
