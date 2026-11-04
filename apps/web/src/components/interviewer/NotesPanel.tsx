'use client';

import * as React from 'react';
import { Lock, Plus, Trash2, Clock, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { NoteItem } from '@crucible/shared';

interface NotesPanelProps {
  interviewId: string;
  elapsedSeconds: number;
}

function formatOffset(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function NotesPanel({ interviewId, elapsedSeconds }: NotesPanelProps) {
  const [notes, setNotes] = React.useState<NoteItem[]>([]);
  const [newNoteText, setNewNoteText] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const listEndRef = React.useRef<HTMLDivElement | null>(null);

  const fetchNotes = React.useCallback(async () => {
    try {
      const data = await apiClient<NoteItem[]>(`/rooms/${interviewId}/notes`);
      setNotes(data);
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  }, [interviewId]);

  React.useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleAddNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newNoteText.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const note = await apiClient<NoteItem>(`/rooms/${interviewId}/notes`, {
        method: 'POST',
        body: JSON.stringify({
          bodyMd: newNoteText.trim(),
          offsetMs: elapsedSeconds * 1000,
        }),
      });

      setNotes((prev) => [...prev, note]);
      setNewNoteText('');
      setTimeout(() => {
        listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch (err) {
      alert((err as Error).message || 'Failed to add note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await apiClient(`/rooms/${interviewId}/notes/${noteId}`, {
        method: 'DELETE',
      });
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      alert((err as Error).message || 'Failed to delete note');
    }
  };

  const handleInsertTimestamp = () => {
    const currentTimestamp = `[${formatOffset(elapsedSeconds * 1000)}] `;
    setNewNoteText((prev) => (prev ? `${prev}\n${currentTimestamp}` : currentTimestamp));
  };

  return (
    <div className="flex flex-col h-full bg-[#1E2019] text-[#D3D0CB] text-xs">
      {/* Header with private badge */}
      <div className="px-3 py-2 border-b border-[#393E41] flex items-center justify-between shrink-0 font-mono text-[11px]">
        <div className="flex items-center gap-1.5 text-[#587B7F]">
          <Lock className="w-3.5 h-3.5" />
          <span className="font-semibold text-[#D3D0CB]">Private Notes</span>
        </div>
        <button
          type="button"
          onClick={handleInsertTimestamp}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#393E41] hover:border-[#587B7F] text-[#D3D0CB]/70 hover:text-[#D3D0CB] transition-colors"
          title="Insert current interview timestamp tag"
        >
          <Clock className="w-3 h-3 text-[#E2C044]" />
          <span>{formatOffset(elapsedSeconds * 1000)}</span>
        </button>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-28 text-[#D3D0CB]/50">
            <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            <span>Loading notes...</span>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center text-[#D3D0CB]/50 space-y-1">
            <Lock className="w-5 h-5 opacity-40 text-[#587B7F]" />
            <p className="text-[11px]">No notes captured yet.</p>
            <p className="text-[10px] text-[#D3D0CB]/40">
              Notes are private and timestamped to the session timeline.
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="p-2.5 rounded bg-[#393E41]/20 border border-[#393E41] flex flex-col gap-1 group hover:border-[#587B7F]/60 transition-colors"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-[#D3D0CB]/60">
                <span className="px-1.5 py-0.5 rounded bg-[#393E41]/50 text-[#E2C044] font-medium">
                  {formatOffset(note.offsetMs)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteNote(note.id)}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5 transition-opacity"
                  title="Delete note"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <p className="whitespace-pre-wrap text-[#D3D0CB] text-[11px] leading-relaxed select-text font-sans">
                {note.bodyMd}
              </p>
            </div>
          ))
        )}
        <div ref={listEndRef} />
      </div>

      {/* Add Note Input Area */}
      <form onSubmit={handleAddNote} className="p-3 border-t border-[#393E41] bg-[#1E2019] shrink-0 space-y-2">
        <textarea
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
          placeholder="Take a quick private note... (Ctrl+Enter to save)"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleAddNote();
            }
          }}
          rows={3}
          className="w-full p-2 bg-[#393E41]/30 border border-[#393E41] rounded text-[11px] text-[#D3D0CB] placeholder-[#D3D0CB]/40 focus:border-[#E2C044] focus:outline-none resize-none font-sans"
        />

        <div className="flex items-center justify-between text-[10px] text-[#D3D0CB]/50 font-mono">
          <span>Private to you</span>
          <button
            type="submit"
            disabled={!newNoteText.trim() || isSubmitting}
            className="px-3 py-1 bg-[#587B7F] hover:bg-[#587B7F]/80 text-[#1E2019] font-semibold rounded text-xs transition-colors disabled:opacity-40 flex items-center gap-1"
          >
            {isSubmitting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
            <span>Add Note</span>
          </button>
        </div>
      </form>
    </div>
  );
}
