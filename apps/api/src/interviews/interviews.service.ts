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
}
