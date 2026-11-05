import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { JoinRoomInput, UserSummary } from '@crucible/shared';

export interface CandidateSessionJwtPayload {
  interviewId: string;
  role: 'candidate';
  displayName: string;
  candidateId: string;
}

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);
  private readonly roomSecret =
    process.env.ROOM_TOKEN_SECRET || 'dev_room_token_secret_change_in_production_32_chars';

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  async join(input: JoinRoomInput) {
    const tokenHash = createHash('sha256').update(input.token).digest('hex');

    const interview = await this.prisma.interview.findFirst({
      where: { roomTokenHash: tokenHash },
    });

    if (!interview) {
      throw new NotFoundException('Invalid or expired interview room link');
    }

    if (interview.status === 'completed' || interview.status === 'cancelled') {
      throw new BadRequestException(`This interview session has already ${interview.status}`);
    }

    const candidateId = randomBytes(16).toString('hex');
    const sessionToken = this.generateCandidateSessionToken({
      interviewId: interview.id,
      role: 'candidate',
      displayName: input.displayName,
      candidateId,
    });

    // Register candidate in lobby
    await this.redis.set(
      `lobby:${interview.id}:${candidateId}`,
      JSON.stringify({
        candidateId,
        displayName: input.displayName,
        joinedAt: new Date().toISOString(),
      }),
      7200, // 2 hours
    );

    this.logger.log(`Candidate ${input.displayName} joined lobby for interview ${interview.id}`);

    const isAdmitted = await this.isCandidateAdmitted(interview.id, candidateId);

    return {
      interviewId: interview.id,
      candidateName: interview.candidateName,
      status: interview.status,
      candidateId,
      isAdmitted,
      sessionToken,
    };
  }

  async getStatus(interviewId: string, candidateId?: string, isInterviewer = false) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        interviewQuestions: {
          include: {
            question: {
              include: {
                languages: true,
                testCases: {
                  where: isInterviewer ? undefined : { isHidden: false },
                  orderBy: { order: 'asc' },
                },
                _count: {
                  select: {
                    testCases: true,
                  },
                },
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!interview) {
      throw new NotFoundException('Interview room not found');
    }

    const isLockedStr = await this.redis.get(`room:${interviewId}:locked`);
    const isLocked = isLockedStr === 'true';

    let isAdmitted = false;
    if (candidateId) {
      isAdmitted = await this.isCandidateAdmitted(interviewId, candidateId);
    }

    const questions = interview.interviewQuestions.map((iq) => {
      const visibleCases = iq.question.testCases;
      const totalCases = iq.question._count.testCases;
      const hiddenCasesCount = totalCases - visibleCases.length;

      return {
        ...iq,
        question: {
          ...iq.question,
          hiddenCasesCount,
        },
      };
    });

    return {
      interviewId: interview.id,
      status: interview.status,
      isLocked,
      isAdmitted,
      candidateName: interview.candidateName,
      roleTitle: interview.roleTitle,
      startedAt: interview.startedAt?.toISOString() || null,
      questions,
    };
  }

  async saveWhiteboardSnapshot(interviewId: string, docType: string, snapshotData: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview) {
      throw new NotFoundException('Interview room not found');
    }

    const offsetMs = interview.startedAt
      ? Math.max(0, Date.now() - interview.startedAt.getTime())
      : 0;

    const payload = Buffer.from(snapshotData, 'utf-8');

    return this.prisma.collabSnapshot.create({
      data: {
        interviewId,
        docType,
        payload,
        offsetMs,
      },
    });
  }

  async getLobbyCandidates(interviewId: string, user: UserSummary) {
    // Verify user owns this interview
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview || interview.interviewerId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    // In a multi-key redis pattern, find lobby keys
    const redisClient = this.redis.getClient();
    if (!redisClient) return [];

    const keys = await redisClient.keys(`lobby:${interviewId}:*`);
    const candidates = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        try {
          candidates.push(JSON.parse(data));
        } catch {
          // Ignore invalid JSON
        }
      }
    }

    return candidates;
  }

  async admitCandidate(interviewId: string, candidateId: string, user: UserSummary) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview || interview.interviewerId !== user.id) {
      throw new ForbiddenException('Only the interviewer can admit candidates');
    }

    // Set admitted flag in Redis
    await this.redis.set(`room:${interviewId}:admitted:${candidateId}`, 'true', 14400); // 4 hours
    await this.redis.del(`lobby:${interviewId}:${candidateId}`);

    // If interview status is still scheduled, automatically transition to live
    if (interview.status === 'scheduled') {
      await this.prisma.interview.update({
        where: { id: interviewId },
        data: { status: 'live', startedAt: new Date() },
      });
    }

    this.logger.log(`Candidate ${candidateId} admitted to interview ${interviewId}`);
    return { success: true, admittedCandidateId: candidateId };
  }

  async setEditorLock(interviewId: string, locked: boolean, user: UserSummary) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview || interview.interviewerId !== user.id) {
      throw new ForbiddenException('Only the interviewer can toggle editor lock');
    }

    await this.redis.set(`room:${interviewId}:locked`, locked ? 'true' : 'false');
    this.logger.log(`Editor lock for room ${interviewId} set to ${locked}`);

    return { locked };
  }

  async endInterview(interviewId: string, user: UserSummary) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview) {
      throw new NotFoundException(`Interview with ID '${interviewId}' not found`);
    }

    if (interview.interviewerId !== user.id) {
      throw new ForbiddenException('Only the interviewer can end the interview');
    }

    const updated = await this.prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: 'completed',
        endedAt: new Date(),
      },
    });

    this.logger.log(`Interview ${interviewId} marked as completed by interviewer ${user.id}`);
    return updated;
  }

  async isCandidateAdmitted(interviewId: string, candidateId: string): Promise<boolean> {
    const admitted = await this.redis.get(`room:${interviewId}:admitted:${candidateId}`);
    return admitted === 'true';
  }

  validateCandidateSession(token: string): CandidateSessionJwtPayload | null {
    try {
      return jwt.verify(token, this.roomSecret) as CandidateSessionJwtPayload;
    } catch {
      return null;
    }
  }

  async recordSignal(
    interviewId: string,
    type: string,
    metadata: Record<string, unknown>,
    clientOffsetMs?: number,
  ) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview) {
      throw new NotFoundException(`Interview with ID '${interviewId}' not found`);
    }

    let offsetMs = clientOffsetMs;
    if (offsetMs === undefined) {
      const baseTime = interview.startedAt
        ? interview.startedAt.getTime()
        : interview.createdAt.getTime();
      offsetMs = Math.max(0, Date.now() - baseTime);
    }

    const signal = await this.prisma.signal.create({
      data: {
        interviewId,
        type,
        metadata: metadata as import('@prisma/client').Prisma.InputJsonValue,
        offsetMs,
      },
    });

    this.logger.log(
      `Recorded transparency signal '${type}' for interview ${interviewId} at offset ${offsetMs}ms`,
    );
    return signal;
  }

  async getSignals(interviewId: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview) {
      throw new NotFoundException(`Interview with ID '${interviewId}' not found`);
    }

    return this.prisma.signal.findMany({
      where: { interviewId },
      orderBy: { offsetMs: 'asc' },
    });
  }

  issueCollabToken(
    interviewId: string,
    participant: { role: 'interviewer' | 'candidate'; displayName: string; userId?: string },
  ) {
    const collabSecret =
      process.env.COLLAB_TOKEN_SECRET ||
      process.env.ROOM_TOKEN_SECRET ||
      'dev_collab_token_secret_32_chars';

    const payload = {
      sub: participant.userId || participant.displayName,
      interviewId,
      role: participant.role,
      displayName: participant.displayName,
    };

    const token = jwt.sign(payload, collabSecret, { expiresIn: '15m' });
    return { token, expiresInSeconds: 900 };
  }

  private generateCandidateSessionToken(payload: CandidateSessionJwtPayload): string {
    return jwt.sign(payload, this.roomSecret, { expiresIn: '12h' });
  }
}
