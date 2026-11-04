import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateRubricTemplateInput,
  UpdateRubricTemplateInput,
  UserSummary,
} from '@crucible/shared';
import { DEFAULT_SEED_RUBRIC } from './rubrics.constants.js';

@Injectable()
export class RubricsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async seedDefaultRubric(userId: string) {
    return this.prisma.rubricTemplate.create({
      data: {
        ownerId: userId,
        name: DEFAULT_SEED_RUBRIC.name,
        criteria: {
          create: DEFAULT_SEED_RUBRIC.criteria.map((c) => ({
            name: c.name,
            description: c.description,
            weight: c.weight,
            levelDescriptors: c.levelDescriptors,
          })),
        },
      },
      include: {
        criteria: true,
      },
    });
  }

  async findAll(user: UserSummary) {
    const templates = await this.prisma.rubricTemplate.findMany({
      where: { ownerId: user.id },
      include: {
        criteria: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (templates.length === 0) {
      const seeded = await this.seedDefaultRubric(user.id);
      return [seeded];
    }

    return templates;
  }

  async findOne(user: UserSummary, id: string) {
    const template = await this.prisma.rubricTemplate.findUnique({
      where: { id },
      include: {
        criteria: true,
      },
    });

    if (!template) {
      throw new NotFoundException(`Rubric template with ID '${id}' not found`);
    }

    if (template.ownerId !== user.id) {
      throw new ForbiddenException('You do not have access to this rubric template');
    }

    return template;
  }

  async create(user: UserSummary, input: CreateRubricTemplateInput) {
    return this.prisma.rubricTemplate.create({
      data: {
        ownerId: user.id,
        name: input.name,
        criteria: {
          create: input.criteria.map((c) => ({
            name: c.name,
            description: c.description,
            weight: c.weight,
            levelDescriptors: c.levelDescriptors,
          })),
        },
      },
      include: {
        criteria: true,
      },
    });
  }

  async update(user: UserSummary, id: string, input: UpdateRubricTemplateInput) {
    await this.findOne(user, id);

    return this.prisma.rubricTemplate.update({
      where: { id },
      data: {
        name: input.name,
        // If new criteria passed, replace them
        criteria: input.criteria
          ? {
              deleteMany: {},
              create: input.criteria.map((c) => ({
                name: c.name,
                description: c.description,
                weight: c.weight,
                levelDescriptors: c.levelDescriptors,
              })),
            }
          : undefined,
      },
      include: {
        criteria: true,
      },
    });
  }

  async remove(user: UserSummary, id: string) {
    await this.findOne(user, id);

    await this.prisma.rubricTemplate.delete({
      where: { id },
    });

    return { success: true };
  }

  async attachToInterview(user: UserSummary, interviewId: string, rubricTemplateId: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview) {
      throw new NotFoundException(`Interview with ID '${interviewId}' not found`);
    }

    if (interview.interviewerId !== user.id) {
      throw new ForbiddenException('Only the interviewer can attach a rubric template');
    }

    const template = await this.findOne(user, rubricTemplateId);

    const updated = await this.prisma.interview.update({
      where: { id: interviewId },
      data: { rubricTemplateId: template.id },
      include: {
        rubricTemplate: {
          include: {
            criteria: true,
          },
        },
      },
    });

    return updated.rubricTemplate;
  }

  async getInterviewRubric(interviewId: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        rubricTemplate: {
          include: {
            criteria: true,
          },
        },
      },
    });

    if (!interview) {
      throw new NotFoundException(`Interview with ID '${interviewId}' not found`);
    }

    if (interview.rubricTemplate) {
      return interview.rubricTemplate;
    }

    // Auto-seed and attach if none attached yet
    let template = await this.prisma.rubricTemplate.findFirst({
      where: { ownerId: interview.interviewerId },
      include: { criteria: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!template) {
      template = await this.seedDefaultRubric(interview.interviewerId);
    }

    if (template) {
      const updated = await this.prisma.interview.update({
        where: { id: interviewId },
        data: { rubricTemplateId: template.id },
        include: {
          rubricTemplate: {
            include: {
              criteria: true,
            },
          },
        },
      });
      return updated.rubricTemplate;
    }

    return null;
  }
}
