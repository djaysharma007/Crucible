import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateInterviewInput,
  UpdateInterviewInput,
  InterviewFilterInput,
  UserSummary,
  InterviewStatsResponse,
  InterviewDetailResponse,
  ReplayTimelineResponse,
  ReplayTimelineEvent,
  CandidateComparisonResponse,
  Recommendation,
} from '@crucible/shared';

@Injectable()
export class InterviewsService {
  private readonly logger = new Logger(InterviewsService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(user: UserSummary, input: CreateInterviewInput) {
    // Generate high-entropy room token for candidate
    const rawRoomToken = randomBytes(24).toString('base64url');
    const roomTokenHash = createHash('sha256').update(rawRoomToken).digest('hex');

    const interview = await this.prisma.interview.create({
      data: {
        interviewerId: user.id,
        candidateName: input.candidateName,
        roleTitle: input.roleTitle,
        rubricTemplateId: input.rubricTemplateId,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        status: 'scheduled',
        roomTokenHash,
      },
      include: {
        interviewQuestions: {
          include: {
            question: true,
          },
        },
      },
    });

    this.logger.log(`Created interview ${interview.id} for interviewer ${user.id}`);

    return {
      interview,
      roomToken: rawRoomToken,
      roomUrl: `/room/${interview.id}?token=${rawRoomToken}`,
    };
  }

  async findAll(user: UserSummary, filter: InterviewFilterInput) {
    const where: {
      interviewerId: string;
      status?: string;
      roleTitle?: { contains: string; mode: 'insensitive' };
      candidateName?: { contains: string; mode: 'insensitive' };
      scheduledAt?: { gte?: Date; lte?: Date };
    } = {
      interviewerId: user.id,
    };

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.search) {
      where.candidateName = { contains: filter.search, mode: 'insensitive' };
    }

    if (filter.roleTitle) {
      where.roleTitle = { contains: filter.roleTitle, mode: 'insensitive' };
    }

    if (filter.from || filter.to) {
      where.scheduledAt = {};
      if (filter.from) where.scheduledAt.gte = new Date(filter.from);
      if (filter.to) where.scheduledAt.lte = new Date(filter.to);
    }

    const skip = (filter.page - 1) * filter.limit;
    const take = filter.limit;

    const [total, items] = await Promise.all([
      this.prisma.interview.count({ where }),
      this.prisma.interview.findMany({
        where,
        skip,
        take,
        orderBy: {
          [filter.sortBy]: filter.sortOrder,
        },
        include: {
          scorecard: true,
          _count: {
            select: {
              interviewQuestions: true,
              notes: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      total,
      page: filter.page,
      limit: filter.limit,
      totalPages: Math.ceil(total / filter.limit),
    };
  }

  async findOne(user: UserSummary, id: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id },
      include: {
        rubricTemplate: {
          include: { criteria: true },
        },
        interviewQuestions: {
          include: {
            question: {
              include: {
                languages: true,
                testCases: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        scorecard: {
          include: { ratings: true },
        },
      },
    });

    if (!interview) {
      throw new NotFoundException(`Interview with ID ${id} not found`);
    }

    if (interview.interviewerId !== user.id) {
      throw new ForbiddenException('Access denied to this interview session');
    }

    return interview;
  }

  async update(user: UserSummary, id: string, input: UpdateInterviewInput) {
    await this.findOne(user, id);

    return this.prisma.interview.update({
      where: { id },
      data: {
        candidateName: input.candidateName,
        roleTitle: input.roleTitle,
        status: input.status,
        rubricTemplateId: input.rubricTemplateId,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      },
    });
  }

  async start(user: UserSummary, id: string) {
    const interview = await this.findOne(user, id);

    if (interview.status === 'completed' || interview.status === 'cancelled') {
      throw new BadRequestException(`Cannot start interview in '${interview.status}' state`);
    }

    return this.prisma.interview.update({
      where: { id },
      data: {
        status: 'live',
        startedAt: interview.startedAt || new Date(),
      },
    });
  }

  async end(user: UserSummary, id: string) {
    const interview = await this.findOne(user, id);

    if (interview.status === 'completed') {
      return interview;
    }

    const updated = await this.prisma.interview.update({
      where: { id },
      data: {
        status: 'completed',
        endedAt: new Date(),
      },
    });

    this.logger.log(`Interview ${id} ended by interviewer ${user.id}`);
    return updated;
  }

  async cancel(user: UserSummary, id: string) {
    await this.findOne(user, id);

    return this.prisma.interview.update({
      where: { id },
      data: {
        status: 'cancelled',
      },
    });
  }

  async attachQuestion(
    user: UserSummary,
    interviewId: string,
    questionId: string,
    language = 'typescript',
  ) {
    await this.findOne(user, interviewId);

    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found`);
    }

    const maxOrder = await this.prisma.interviewQuestion.aggregate({
      where: { interviewId },
      _max: { order: true },
    });

    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    return this.prisma.interviewQuestion.create({
      data: {
        interviewId,
        questionId,
        language,
        order: nextOrder,
      },
      include: {
        question: {
          include: {
            languages: true,
            testCases: true,
          },
        },
      },
    });
  }

  async detachQuestion(user: UserSummary, interviewId: string, interviewQuestionId: string) {
    await this.findOne(user, interviewId);

    const iq = await this.prisma.interviewQuestion.findUnique({
      where: { id: interviewQuestionId },
    });

    if (!iq || iq.interviewId !== interviewId) {
      throw new NotFoundException('Question attachment not found on this interview');
    }

    await this.prisma.interviewQuestion.delete({
      where: { id: interviewQuestionId },
    });

    return { success: true };
  }

  async delete(user: UserSummary, id: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id },
    });

    if (!interview) {
      throw new NotFoundException(`Interview with ID '${id}' not found`);
    }

    if (interview.interviewerId !== user.id) {
      throw new ForbiddenException('Only the interview owner can delete this interview');
    }

    await this.prisma.interview.delete({
      where: { id },
    });

    this.logger.log(`Deleted interview ${id} by owner ${user.id}`);
    return { success: true, id };
  }

  async cleanupExpired(retentionDays = 90) {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const result = await this.prisma.interview.deleteMany({
      where: {
        status: { in: ['completed', 'cancelled'] },
        OR: [{ endedAt: { lte: cutoff } }, { endedAt: null, createdAt: { lte: cutoff } }],
      },
    });

    this.logger.log(
      `Cleaned up ${result.count} expired interviews older than ${retentionDays} days (cutoff: ${cutoff.toISOString()})`,
    );

    return {
      deletedCount: result.count,
      retentionDays,
      cutoffDate: cutoff.toISOString(),
    };
  }

  async getStats(user: UserSummary): Promise<InterviewStatsResponse> {
    const interviews = await this.prisma.interview.findMany({
      where: { interviewerId: user.id },
      include: { scorecard: true },
    });

    const totalInterviews = interviews.length;
    const completed = interviews.filter((i) => i.status === 'completed');
    const completedInterviews = completed.length;

    let totalDurationMs = 0;
    let durationCount = 0;

    for (const i of completed) {
      if (i.startedAt && i.endedAt) {
        totalDurationMs += Math.max(0, i.endedAt.getTime() - i.startedAt.getTime());
        durationCount++;
      }
    }

    const averageDurationMinutes =
      durationCount > 0 ? Math.round(totalDurationMs / durationCount / 60000) : 0;

    const recommendationCounts: Record<Recommendation | 'pending', number> = {
      strong_hire: 0,
      hire: 0,
      no_hire: 0,
      strong_no_hire: 0,
      pending: 0,
    };

    for (const i of interviews) {
      if (i.scorecard && i.scorecard.recommendation in recommendationCounts) {
        recommendationCounts[i.scorecard.recommendation as Recommendation]++;
      } else {
        recommendationCounts.pending++;
      }
    }

    return {
      totalInterviews,
      completedInterviews,
      averageDurationMinutes,
      recommendationCounts,
    };
  }

  async getDetail(user: UserSummary, id: string): Promise<InterviewDetailResponse> {
    await this.findOne(user, id);

    const interview = await this.prisma.interview.findUnique({
      where: { id },
      include: {
        interviewQuestions: {
          include: {
            question: {
              include: {
                languages: true,
                testCases: true,
              },
            },
            codeRuns: {
              orderBy: { requestedAt: 'desc' },
            },
          },
          orderBy: { order: 'asc' },
        },
        notes: {
          orderBy: [{ offsetMs: 'asc' }, { createdAt: 'asc' }],
        },
        scorecard: {
          include: {
            ratings: {
              include: {
                criterion: true,
              },
            },
          },
        },
        collabSnapshots: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!interview) {
      throw new NotFoundException(`Interview '${id}' not found`);
    }

    const startTime = interview.startedAt
      ? interview.startedAt.getTime()
      : interview.createdAt.getTime();
    const endTime = interview.endedAt ? interview.endedAt.getTime() : Date.now();
    const durationSeconds = Math.max(0, Math.round((endTime - startTime) / 1000));

    return {
      id: interview.id,
      candidateName: interview.candidateName,
      roleTitle: interview.roleTitle,
      status: interview.status,
      scheduledAt: interview.scheduledAt ? interview.scheduledAt.toISOString() : null,
      startedAt: interview.startedAt ? interview.startedAt.toISOString() : null,
      endedAt: interview.endedAt ? interview.endedAt.toISOString() : null,
      durationSeconds,
      createdAt: interview.createdAt.toISOString(),
      questions: interview.interviewQuestions.map((iq) => {
        const langConfig = iq.question.languages.find((l) => l.language === iq.language);
        return {
          id: iq.id,
          order: iq.order,
          language: iq.language,
          startedAt: iq.startedAt ? iq.startedAt.toISOString() : null,
          question: {
            id: iq.question.id,
            title: iq.question.title,
            descriptionMd: iq.question.descriptionMd,
            difficulty: iq.question.difficulty,
            tags: iq.question.tags,
            starterCode: langConfig?.starterCode || '',
            testCasesCount: iq.question.testCases.length,
          },
          codeRuns: iq.codeRuns.map((cr) => ({
            id: cr.id,
            language: cr.language,
            sourceSnapshot: cr.sourceSnapshot,
            results: cr.results,
            requestedAt: cr.requestedAt.toISOString(),
            durationMs: cr.durationMs,
          })),
        };
      }),
      notes: interview.notes.map((n) => ({
        id: n.id,
        interviewId: n.interviewId,
        bodyMd: n.bodyMd,
        offsetMs: n.offsetMs,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
      scorecard: interview.scorecard
        ? {
            id: interview.scorecard.id,
            interviewId: interview.scorecard.interviewId,
            recommendation: interview.scorecard.recommendation as Recommendation,
            summaryText: interview.scorecard.summaryText,
            submittedAt: interview.scorecard.submittedAt
              ? interview.scorecard.submittedAt.toISOString()
              : null,
            createdAt: interview.scorecard.createdAt.toISOString(),
            updatedAt: interview.scorecard.updatedAt.toISOString(),
            ratings: interview.scorecard.ratings.map((r) => ({
              id: r.id,
              scorecardId: r.scorecardId,
              criterionId: r.criterionId,
              rating: r.rating,
              justification: r.justification,
              criterion: {
                id: r.criterion.id,
                name: r.criterion.name,
                description: r.criterion.description,
                weight: r.criterion.weight,
                levelDescriptors: r.criterion.levelDescriptors as Record<string, string>,
              },
            })),
          }
        : null,
      whiteboardSnapshots: interview.collabSnapshots.map((s) => ({
        id: s.id,
        docType: s.docType,
        snapshot: Buffer.from(s.payload).toString('utf-8'),
        offsetMs: s.offsetMs,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  }

  async getReplay(user: UserSummary, id: string): Promise<ReplayTimelineResponse> {
    const detail = await this.getDetail(user, id);

    const interview = await this.prisma.interview.findUnique({
      where: { id },
      include: { signals: true },
    });

    const events: ReplayTimelineEvent[] = [];

    // 1. Note markers
    for (const note of detail.notes) {
      events.push({
        id: `note-${note.id}`,
        type: 'note_marker',
        offsetMs: note.offsetMs,
        timestamp: note.createdAt,
        metadata: {
          noteId: note.id,
          bodyMd: note.bodyMd,
        },
      });
    }

    // 2. Code runs
    for (const q of detail.questions) {
      for (const cr of q.codeRuns) {
        const runTime = new Date(cr.requestedAt).getTime();
        const baseTime = detail.startedAt
          ? new Date(detail.startedAt).getTime()
          : new Date(detail.createdAt).getTime();
        const offsetMs = Math.max(0, runTime - baseTime);
        events.push({
          id: `coderun-${cr.id}`,
          type: 'code_run',
          offsetMs,
          timestamp: cr.requestedAt,
          metadata: {
            questionTitle: q.question.title,
            language: cr.language,
            durationMs: cr.durationMs,
            sourceSnapshot: cr.sourceSnapshot,
          },
        });
      }
    }

    // 3. Whiteboard snapshots
    for (const ws of detail.whiteboardSnapshots) {
      events.push({
        id: `whiteboard-${ws.id}`,
        type: 'whiteboard_snapshot',
        offsetMs: ws.offsetMs,
        timestamp: ws.createdAt,
        metadata: {
          docType: ws.docType,
          snapshot: ws.snapshot,
        },
      });
    }

    // 4. Signals
    if (interview?.signals) {
      for (const sig of interview.signals) {
        events.push({
          id: `signal-${sig.id}`,
          type: 'signal',
          offsetMs: sig.offsetMs,
          timestamp: sig.createdAt.toISOString(),
          metadata: {
            signalType: sig.type,
            data: sig.metadata,
          },
        });
      }
    }

    // Sort chronologically by offsetMs
    events.sort((a, b) => a.offsetMs - b.offsetMs);

    return {
      interviewId: id,
      totalDurationMs: detail.durationSeconds * 1000,
      events,
    };
  }

  async compare(user: UserSummary, id1: string, id2: string): Promise<CandidateComparisonResponse> {
    const [detailA, detailB] = await Promise.all([
      this.getDetail(user, id1),
      this.getDetail(user, id2),
    ]);

    // Build unified criteria comparison
    const criteriaMap = new Map<
      string,
      {
        criterionId: string;
        name: string;
        weight: number;
        ratingA: number | null;
        ratingB: number | null;
      }
    >();

    if (detailA.scorecard) {
      for (const r of detailA.scorecard.ratings) {
        criteriaMap.set(r.criterionId, {
          criterionId: r.criterionId,
          name: r.criterion?.name || 'Criterion',
          weight: r.criterion?.weight || 1.0,
          ratingA: r.rating,
          ratingB: null,
        });
      }
    }

    if (detailB.scorecard) {
      for (const r of detailB.scorecard.ratings) {
        const existing = criteriaMap.get(r.criterionId);
        if (existing) {
          existing.ratingB = r.rating;
        } else {
          criteriaMap.set(r.criterionId, {
            criterionId: r.criterionId,
            name: r.criterion?.name || 'Criterion',
            weight: r.criterion?.weight || 1.0,
            ratingA: null,
            ratingB: r.rating,
          });
        }
      }
    }

    return {
      interviewA: detailA,
      interviewB: detailB,
      criteria: Array.from(criteriaMap.values()),
    };
  }
}
