import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service.js';
import { StorageService } from './storage.service.js';
import { RedisService } from '../redis/redis.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('rooms')
export class StorageController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(StorageService) private readonly storageService: StorageService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  @Post(':id/recording/chunk')
  async uploadChunk(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() body: { chunkIndex: number; dataBase64: string },
  ) {
    // Only interviewer can upload recording chunks
    const interviewerCookie = req.cookies?.['crucible_session'];
    if (!interviewerCookie) {
      throw new ForbiddenException('Only the interviewer can upload recording chunks');
    }
    const user = await this.authService.validateSession(interviewerCookie);
    if (!user) {
      throw new ForbiddenException('Invalid interviewer session');
    }

    if (body.chunkIndex === undefined || !body.dataBase64) {
      throw new BadRequestException('chunkIndex and dataBase64 are required');
    }

    const buffer = Buffer.from(body.dataBase64, 'base64');
    const indexStr = body.chunkIndex.toString().padStart(5, '0');
    const key = `recordings/${id}/chunk_${indexStr}.webm`;

    const upload = await this.storageService.uploadObject(key, buffer, 'video/webm');

    // Register chunk in Redis set
    await this.redis.sAdd(`recording:chunks:${id}`, key);

    return { success: true, key: upload.key, size: upload.size };
  }

  @Post(':id/recording/finalize')
  async finalizeRecording(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() body: { totalChunks?: number; durationMs?: number },
  ) {
    const interviewerCookie = req.cookies?.['crucible_session'];
    if (!interviewerCookie) {
      throw new ForbiddenException('Only the interviewer can finalize recording');
    }
    const user = await this.authService.validateSession(interviewerCookie);
    if (!user) {
      throw new ForbiddenException('Invalid interviewer session');
    }

    const interview = await this.prisma.interview.findUnique({
      where: { id },
    });

    if (!interview) {
      throw new BadRequestException(`Interview ${id} not found`);
    }

    const recordingUrl = this.storageService.getPublicUrl(`recordings/${id}/chunk_00000.webm`);
    const offsetMs = interview.startedAt
      ? Math.max(0, Date.now() - interview.startedAt.getTime())
      : 0;

    await this.prisma.signal.create({
      data: {
        interviewId: id,
        type: 'recording_finalized',
        metadata: {
          recordingUrl,
          totalChunks: body.totalChunks || 1,
          durationMs: body.durationMs || offsetMs,
          finalizedAt: new Date().toISOString(),
        },
        offsetMs,
      },
    });

    return {
      success: true,
      recordingUrl,
      interviewId: id,
    };
  }
}
