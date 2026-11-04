import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateNoteInput, UpdateNoteInput, UserSummary } from '@crucible/shared';

@Injectable()
export class NotesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async verifyInterviewOwner(user: UserSummary, interviewId: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview) {
      throw new NotFoundException(`Interview with ID '${interviewId}' not found`);
    }

    if (interview.interviewerId !== user.id) {
      throw new ForbiddenException('Only the interviewer has access to private interview notes');
    }

    return interview;
  }

  async getNotes(user: UserSummary, interviewId: string) {
    await this.verifyInterviewOwner(user, interviewId);

    return this.prisma.note.findMany({
      where: { interviewId },
      orderBy: [{ offsetMs: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createNote(user: UserSummary, interviewId: string, input: CreateNoteInput) {
    const interview = await this.verifyInterviewOwner(user, interviewId);

    let offsetMs = input.offsetMs;
    if (offsetMs === undefined || offsetMs === null) {
      const baseTime = interview.startedAt ? interview.startedAt.getTime() : interview.createdAt.getTime();
      offsetMs = Math.max(0, Date.now() - baseTime);
    }

    return this.prisma.note.create({
      data: {
        interviewId,
        bodyMd: input.bodyMd,
        offsetMs,
      },
    });
  }

  async updateNote(
    user: UserSummary,
    interviewId: string,
    noteId: string,
    input: UpdateNoteInput,
  ) {
    await this.verifyInterviewOwner(user, interviewId);

    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note || note.interviewId !== interviewId) {
      throw new NotFoundException(`Note with ID '${noteId}' not found in this interview`);
    }

    return this.prisma.note.update({
      where: { id: noteId },
      data: {
        bodyMd: input.bodyMd,
      },
    });
  }

  async deleteNote(user: UserSummary, interviewId: string, noteId: string) {
    await this.verifyInterviewOwner(user, interviewId);

    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note || note.interviewId !== interviewId) {
      throw new NotFoundException(`Note with ID '${noteId}' not found in this interview`);
    }

    await this.prisma.note.delete({
      where: { id: noteId },
    });

    return { success: true };
  }
}
