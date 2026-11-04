import { z } from 'zod';

export const CreateNoteSchema = z.object({
  bodyMd: z.string().trim().min(1, 'Note content cannot be empty').max(10000),
  offsetMs: z.number().int().min(0, 'Offset must be non-negative').optional(),
});

export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;

export const UpdateNoteSchema = z.object({
  bodyMd: z.string().trim().min(1, 'Note content cannot be empty').max(10000),
});

export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>;

export interface NoteItem {
  id: string;
  interviewId: string;
  bodyMd: string;
  offsetMs: number;
  createdAt: string;
  updatedAt: string;
}
