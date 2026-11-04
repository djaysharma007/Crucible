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

  async getStatus(interviewId: string, candidateId?: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        interviewQuestions: {
          include: {
            question: {
              include: {
                languages: true,
                testCases: {
                  where: { isHidden: false }, // candidate sees only visible test cases
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

    return {
      interviewId: interview.id,
      status: interview.status,
      isLocked,
      isAdmitted,
      candidateName: interview.candidateName,
      roleTitle: interview.roleTitle,
      startedAt: interview.startedAt?.toISOString() || null,
      questions: interview.interviewQuestions,
    };
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

  private generateCandidateSessionToken(payload: CandidateSessionJwtPayload): string {
    return jwt.sign(payload, this.roomSecret, { expiresIn: '12h' });
  }
}
