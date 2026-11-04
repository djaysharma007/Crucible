import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Req,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { ExecutionService } from './execution.service.js';
import { AuthService } from '../auth/auth.service.js';
import { RoomsService } from '../rooms/rooms.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  RunCodeSchema,
  RunCustomSchema,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
} from '@crucible/shared';

@Controller('interview-questions')
export class ExecutionController {
  constructor(
    @Inject(ExecutionService) private readonly executionService: ExecutionService,
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(RoomsService) private readonly roomsService: RoomsService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  private async resolveParticipant(req: Request, interviewQuestionId: string): Promise<{ isInterviewer: boolean }> {
    // Fetch interview question to get interviewId
    const iq = await this.prisma.interviewQuestion.findUnique({
      where: { id: interviewQuestionId },
      include: { interview: true },
    });

    if (!iq) {
      throw new NotFoundException(`Interview question ${interviewQuestionId} not found`);
    }

    // 1. Check interviewer session
    const interviewerCookie = req.cookies?.['crucible_session'];
    if (interviewerCookie) {
      const user = await this.authService.validateSession(interviewerCookie);
      if (user && user.id === iq.interview.interviewerId) {
        return { isInterviewer: true };
      }
    }

    // 2. Check candidate session
    const candidateCookie = req.cookies?.['crucible_candidate_session'];
    if (candidateCookie) {
      const candidate = this.roomsService.validateCandidateSession(candidateCookie);
      if (candidate && candidate.interviewId === iq.interviewId) {
        const isAdmitted = await this.roomsService.isCandidateAdmitted(
          iq.interviewId,
          candidate.candidateId,
        );
        if (isAdmitted) {
          return { isInterviewer: false };
        }
      }
    }

    throw new UnauthorizedException('Authentication and room admission required');
  }

  @Post(':iqId/run')
  async runCode(
    @Param('iqId') iqId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const { isInterviewer } = await this.resolveParticipant(req, iqId);

    const parseResult = RunCodeSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.errors[0]?.message);
    }

    return this.executionService.runTests(iqId, parseResult.data, isInterviewer);
  }

  @Post(':iqId/run-custom')
  async runCustom(
    @Param('iqId') iqId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    await this.resolveParticipant(req, iqId);

    const parseResult = RunCustomSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.errors[0]?.message);
    }

    return this.executionService.runCustom(iqId, parseResult.data);
  }

  @Get(':iqId/runs')
  async getRuns(@Param('iqId') iqId: string, @Req() req: Request) {
    const { isInterviewer } = await this.resolveParticipant(req, iqId);
    return this.executionService.getRuns(iqId, isInterviewer);
  }

  @Patch(':iqId/language')
  async updateLanguage(
    @Param('iqId') iqId: string,
    @Body() body: { language?: string },
    @Req() req: Request,
  ) {
    await this.resolveParticipant(req, iqId);

    if (!body?.language || !SUPPORTED_LANGUAGES.includes(body.language as SupportedLanguage)) {
      throw new BadRequestException(
        `Language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`,
      );
    }

    return this.prisma.interviewQuestion.update({
      where: { id: iqId },
      data: { language: body.language },
    });
  }
}
