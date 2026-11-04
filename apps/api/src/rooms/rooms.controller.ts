import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
  Req,
  UseGuards,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { RoomsService } from './rooms.service.js';
import { AuthService } from '../auth/auth.service.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JoinRoomSchema, AdmitCandidateSchema, UserSummary } from '@crucible/shared';

@Controller('rooms')
export class RoomsController {
  constructor(
    @Inject(RoomsService) private readonly roomsService: RoomsService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Post('join')
  async join(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const parseResult = JoinRoomSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.errors[0]?.message);
    }

    const result = await this.roomsService.join(parseResult.data);

    // Set candidate session cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('crucible_candidate_session', result.sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 12 * 60 * 60 * 1000, // 12 hours
    });

    return {
      interviewId: result.interviewId,
      candidateName: result.candidateName,
      status: result.status,
      candidateId: result.candidateId,
      isAdmitted: result.isAdmitted,
    };
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string, @Req() req: Request) {
    const candidateSessionCookie = req.cookies?.['crucible_candidate_session'];
    let candidateId: string | undefined = undefined;

    if (candidateSessionCookie) {
      const candidatePayload = this.roomsService.validateCandidateSession(candidateSessionCookie);
      if (candidatePayload && candidatePayload.interviewId === id) {
        candidateId = candidatePayload.candidateId;
      }
    }

    let isInterviewer = false;
    const interviewerCookie = req.cookies?.['crucible_session'];
    if (interviewerCookie) {
      const user = await this.authService.validateSession(interviewerCookie);
      if (user) {
        isInterviewer = true;
      }
    }

    return this.roomsService.getStatus(id, candidateId, isInterviewer);
  }

  @Get(':id/lobby')
  @UseGuards(AuthGuard)
  async getLobby(@CurrentUser() user: UserSummary, @Param('id') id: string) {
    return this.roomsService.getLobbyCandidates(id, user);
  }

  @Post(':id/admit')
  @UseGuards(AuthGuard)
  async admit(@CurrentUser() user: UserSummary, @Param('id') id: string, @Body() body: unknown) {
    const parseResult = AdmitCandidateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.errors[0]?.message);
    }

    return this.roomsService.admitCandidate(id, parseResult.data.candidateSessionId, user);
  }

  @Post(':id/lock')
  @UseGuards(AuthGuard)
  async setLock(
    @CurrentUser() user: UserSummary,
    @Param('id') id: string,
    @Body() body: { locked: boolean },
  ) {
    if (typeof body?.locked !== 'boolean') {
      throw new BadRequestException('locked boolean parameter required');
    }

    return this.roomsService.setEditorLock(id, body.locked, user);
  }

  @Post(':id/whiteboard/snapshot')
  async saveWhiteboardSnapshot(
    @Param('id') id: string,
    @Body() body: { docType?: string; snapshot: string },
    @Req() req: Request,
  ) {
    if (!body?.snapshot) {
      throw new BadRequestException('snapshot string is required');
    }

    // Authenticate participant
    const interviewerCookie = req.cookies?.['crucible_session'];
    const candidateCookie = req.cookies?.['crucible_candidate_session'];

    let authenticated = false;
    if (interviewerCookie) {
      const user = await this.authService.validateSession(interviewerCookie);
      if (user) authenticated = true;
    }
    if (!authenticated && candidateCookie) {
      const candidate = this.roomsService.validateCandidateSession(candidateCookie);
      if (candidate && candidate.interviewId === id) {
        authenticated = true;
      }
    }

    if (!authenticated) {
      throw new BadRequestException('Participant authentication required to save snapshot');
    }

    const docType = body.docType || 'whiteboard';
    return this.roomsService.saveWhiteboardSnapshot(id, docType, body.snapshot);
  }
}
