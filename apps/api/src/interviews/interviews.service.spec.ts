import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InterviewsService } from './interviews.service.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

describe('InterviewsService', () => {
  let service: InterviewsService;
  let mockPrisma: {
    interview: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    question: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    interviewQuestion: {
      aggregate: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };

  const mockUser = {
    id: 'user-uuid-1',
    email: 'interviewer@example.com',
    displayName: 'Lead Interviewer',
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    mockPrisma = {
      interview: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      question: {
        findUnique: vi.fn(),
      },
      interviewQuestion: {
        aggregate: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
      },
    };
    service = new InterviewsService(mockPrisma as unknown as PrismaService);
  });

  it('creates an interview with room token and hash', async () => {
    mockPrisma.interview.create.mockImplementation(
      ({
        data,
      }: {
        data: { interviewerId: string; candidateName: string; roomTokenHash: string };
      }) =>
        Promise.resolve({
          id: 'interview-uuid-1',
          interviewerId: data.interviewerId,
          candidateName: data.candidateName,
          status: 'scheduled',
          roomTokenHash: data.roomTokenHash,
          createdAt: new Date(),
          updatedAt: new Date(),
          interviewQuestions: [],
        }),
    );

    const result = await service.create(mockUser, {
      candidateName: 'Bob Candidate',
      roleTitle: 'Frontend Engineer',
    });

    expect(result.interview.id).toBe('interview-uuid-1');
    expect(result.roomToken).toBeDefined();
    expect(result.roomUrl).toContain('/room/interview-uuid-1?token=');
  });

  it('prevents non-owner from accessing interview details', async () => {
    mockPrisma.interview.findUnique.mockResolvedValue({
      id: 'interview-1',
      interviewerId: 'different-user-uuid',
    });

    await expect(service.findOne(mockUser, 'interview-1')).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException when interview does not exist', async () => {
    mockPrisma.interview.findUnique.mockResolvedValue(null);

    await expect(service.findOne(mockUser, 'missing-id')).rejects.toThrow(NotFoundException);
  });
});
