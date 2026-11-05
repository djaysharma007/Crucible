import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Req,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { PresenceService, ParticipantInfo } from './presence.service.js';
import { AuthService } from '../auth/auth.service.js';
import { RoomsService } from '../rooms/rooms.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RecordingConsentSchema, ScreenShareRequestSchema } from '@crucible/shared';

@Controller('rooms/:id')
export class PresenceController {
  constructor(
    @Inject(PresenceService) private readonly presenceService: PresenceService,
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(RoomsService) private readonly roomsService: RoomsService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  private async resolveParticipant(req: Request, interviewId: string): Promise<ParticipantInfo> {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview) {
      throw new UnauthorizedException('Interview room not found');
    }

    // 1. Check interviewer session
    const interviewerCookie = req.cookies?.['crucible_session'];
    if (interviewerCookie) {
      const user = await this.authService.validateSession(interviewerCookie);
      if (user && user.id === interview.interviewerId) {
        return {
          interviewId,
          isInterviewer: true,
          participantId: user.id,
          displayName: user.displayName,
        };
      }
    }

    // 2. Check candidate session
    const candidateCookie = req.cookies?.['crucible_candidate_session'];
    if (candidateCookie) {
      const candidate = this.roomsService.validateCandidateSession(candidateCookie);
      if (candidate && candidate.interviewId === interviewId) {
        const isAdmitted = await this.roomsService.isCandidateAdmitted(
          interviewId,
          candidate.candidateId,
        );
        if (isAdmitted) {
          return {
            interviewId,
            isInterviewer: false,
            participantId: candidate.candidateId,
            displayName: candidate.displayName,
          };
        }
      }
    }

    throw new UnauthorizedException('Authentication and room admission required');
  }

  @Post('livekit-token')
  async getLiveKitToken(@Param('id') id: string, @Req() req: Request) {
    const participant = await this.resolveParticipant(req, id);
    return this.presenceService.generateToken(participant);
  }

  @Get('recording/status')
  async getRecordingStatus(@Param('id') id: string, @Req() req: Request) {
    await this.resolveParticipant(req, id);
    return this.presenceService.getRecordingStatus(id);
  }

  @Post('recording/consent')
  async setRecordingConsent(@Param('id') id: string, @Body() body: unknown, @Req() req: Request) {
    const participant = await this.resolveParticipant(req, id);
    const parseResult = RecordingConsentSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.errors[0]?.message);
    }

    return this.presenceService.setRecordingConsent(
      id,
      participant.isInterviewer,
      parseResult.data.consented,
    );
  }

  @Post('recording/start')
  async startRecording(@Param('id') id: string, @Req() req: Request) {
    const participant = await this.resolveParticipant(req, id);
    return this.presenceService.startRecording(id, participant.isInterviewer);
  }

  @Post('recording/stop')
  async stopRecording(@Param('id') id: string, @Req() req: Request) {
    const participant = await this.resolveParticipant(req, id);
    return this.presenceService.stopRecording(id, participant.isInterviewer);
  }

  @Post('screenshare/request')
  async requestScreenShare(@Param('id') id: string, @Body() body: unknown, @Req() req: Request) {
    const participant = await this.resolveParticipant(req, id);
    const parseResult = ScreenShareRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.errors[0]?.message);
    }

    return this.presenceService.requestScreenShare(
      id,
      participant.isInterviewer,
      parseResult.data.target,
      parseResult.data.message,
    );
  }

  @Get('screenshare/request')
  async getScreenShareRequest(@Param('id') id: string, @Req() req: Request) {
    const participant = await this.resolveParticipant(req, id);
    const role = participant.isInterviewer ? 'interviewer' : 'candidate';
    const request = await this.presenceService.getScreenShareRequest(id, role);
    return { request };
  }

  @Delete('screenshare/request')
  async dismissScreenShareRequest(@Param('id') id: string, @Req() req: Request) {
    const participant = await this.resolveParticipant(req, id);
    const role = participant.isInterviewer ? 'interviewer' : 'candidate';
    return this.presenceService.dismissScreenShareRequest(id, role);
  }
}
