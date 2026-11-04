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
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JoinRoomSchema, AdmitCandidateSchema, UserSummary } from '@crucible/shared';

@Controller('rooms')
export class RoomsController {
  constructor(@Inject(RoomsService) private readonly roomsService: RoomsService) {}

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

    return this.roomsService.getStatus(id, candidateId);
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
}
