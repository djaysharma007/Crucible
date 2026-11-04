import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateQuestionInput,
  UpdateQuestionInput,
  UserSummary,
  QuestionDifficulty,
  SupportedLanguage,
} from '@crucible/shared';
import { SEED_QUESTIONS } from './questions.seed.js';

export interface QuestionFilters {
  search?: string;
  difficulty?: QuestionDifficulty;
  tag?: string;
  includeArchived?: boolean;
}

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(user: UserSummary, input: CreateQuestionInput) {
    const question = await this.prisma.question.create({
      data: {
        title: input.title,
        descriptionMd: input.descriptionMd,
        difficulty: input.difficulty,
        tags: input.tags,
        ownerId: user.id,
        languages: {
          create: input.languages.map((l) => ({
            language: l.language,
            starterCode: l.starterCode,
          })),
        },
        testCases: {
          create: input.testCases.map((tc, idx) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden ?? false,
            order: tc.order ?? idx,
          })),
        },
      },
      include: {
        languages: true,
        testCases: {
          orderBy: { order: 'asc' },
        },
      },
    });

    this.logger.log(`Question '${question.title}' (${question.id}) created by user ${user.id}`);
    return question;
  }

  async findAll(user: UserSummary, filters: QuestionFilters = {}) {
    const where: Record<string, unknown> = {
      ownerId: user.id,
    };

    if (!filters.includeArchived) {
      where.archivedAt = null;
    }

    if (filters.difficulty) {
      where.difficulty = filters.difficulty;
    }

    if (filters.tag) {
      where.tags = { has: filters.tag };
    }

    if (filters.search) {
      where.title = { contains: filters.search, mode: 'insensitive' };
    }

    return this.prisma.question.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        languages: true,
        testCases: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            interviewQuestions: true,
          },
        },
      },
    });
  }

  async findOne(user: UserSummary, id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        languages: true,
        testCases: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    if (question.ownerId !== user.id) {
      throw new ForbiddenException('You do not have access to this question');
    }

    return question;
  }

  async update(user: UserSummary, id: string, input: UpdateQuestionInput) {
    await this.findOne(user, id);

    return this.prisma.$transaction(async (tx) => {
      if (input.languages) {
        await tx.questionLanguage.deleteMany({ where: { questionId: id } });
        await tx.questionLanguage.createMany({
          data: input.languages.map((l) => ({
            questionId: id,
            language: l.language,
            starterCode: l.starterCode,
          })),
        });
      }

      if (input.testCases) {
        await tx.testCase.deleteMany({ where: { questionId: id } });
        await tx.testCase.createMany({
          data: input.testCases.map((tc, idx) => ({
            questionId: id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden ?? false,
            order: tc.order ?? idx,
          })),
        });
      }

      return tx.question.update({
        where: { id },
        data: {
          title: input.title,
          descriptionMd: input.descriptionMd,
          difficulty: input.difficulty,
          tags: input.tags,
        },
        include: {
          languages: true,
          testCases: {
            orderBy: { order: 'asc' },
          },
        },
      });
    });
  }

  async archive(user: UserSummary, id: string) {
    await this.findOne(user, id);

    return this.prisma.question.update({
      where: { id },
      data: {
        archivedAt: new Date(),
      },
    });
  }

  async duplicate(user: UserSummary, id: string) {
    const source = await this.findOne(user, id);

    const duplicateInput: CreateQuestionInput = {
      title: `${source.title} (Copy)`,
      descriptionMd: source.descriptionMd,
      difficulty: source.difficulty as QuestionDifficulty,
      tags: source.tags,
      languages: source.languages.map((l) => ({
        language: l.language as SupportedLanguage,
        starterCode: l.starterCode,
      })),
      testCases: source.testCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: tc.isHidden,
        order: tc.order,
      })),
    };

    return this.create(user, duplicateInput);
  }

  async exportJson(user: UserSummary, id: string) {
    const question = await this.findOne(user, id);

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      question: {
        title: question.title,
        descriptionMd: question.descriptionMd,
        difficulty: question.difficulty,
        tags: question.tags,
        languages: question.languages.map((l) => ({
          language: l.language,
          starterCode: l.starterCode,
        })),
        testCases: question.testCases.map((tc) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden,
          order: tc.order,
        })),
      },
    };
  }

  async importJson(user: UserSummary, input: unknown) {
    let rawQuestion = input;
    if (typeof input === 'object' && input !== null && 'question' in input) {
      rawQuestion = (input as { question: unknown }).question;
    }

    const parseResult = (await import('@crucible/shared')).CreateQuestionSchema.safeParse(rawQuestion);
    if (!parseResult.success) {
      throw new BadRequestException(
        `Invalid question import payload: ${parseResult.error.errors[0]?.message}`,
      );
    }

    return this.create(user, parseResult.data);
  }

  async seedDefaults(user: UserSummary) {
    const existing = await this.prisma.question.count({
      where: { ownerId: user.id },
    });

    if (existing > 0) {
      return { count: 0, message: 'Questions already exist for this user' };
    }

    const created = [];
    for (const seed of SEED_QUESTIONS) {
      created.push(await this.create(user, seed));
    }

    return { count: created.length, message: `Seeded ${created.length} initial questions` };
  }
}
