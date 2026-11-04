import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubmitScorecardInput, UserSummary } from '@crucible/shared';

@Injectable()
export class ScorecardService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async verifyInterviewOwner(user: UserSummary, interviewId: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview) {
      throw new NotFoundException(`Interview with ID '${interviewId}' not found`);
    }

    if (interview.interviewerId !== user.id) {
      throw new ForbiddenException('Only the interviewer can access the scorecard');
    }

    return interview;
  }

  async getScorecard(user: UserSummary, interviewId: string) {
    await this.verifyInterviewOwner(user, interviewId);

    return this.prisma.scorecard.findUnique({
      where: { interviewId },
      include: {
        ratings: {
          include: {
            criterion: true,
          },
        },
      },
    });
  }

  async submitScorecard(user: UserSummary, interviewId: string, input: SubmitScorecardInput) {
    await this.verifyInterviewOwner(user, interviewId);

    // Upsert Scorecard
    const scorecard = await this.prisma.scorecard.upsert({
      where: { interviewId },
      create: {
        interviewId,
        recommendation: input.recommendation,
        summaryText: input.summaryText || null,
        submittedAt: new Date(),
      },
      update: {
        recommendation: input.recommendation,
        summaryText: input.summaryText || null,
        submittedAt: new Date(),
      },
    });

    // Upsert Ratings
    for (const r of input.ratings) {
      await this.prisma.scorecardRating.upsert({
        where: {
          scorecardId_criterionId: {
            scorecardId: scorecard.id,
            criterionId: r.criterionId,
          },
        },
        create: {
          scorecardId: scorecard.id,
          criterionId: r.criterionId,
          rating: r.rating,
          justification: r.justification || null,
        },
        update: {
          rating: r.rating,
          justification: r.justification || null,
        },
      });
    }

    // Return complete scorecard
    return this.prisma.scorecard.findUnique({
      where: { id: scorecard.id },
      include: {
        ratings: {
          include: {
            criterion: true,
          },
        },
      },
    });
  }
}
