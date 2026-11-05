import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  Res,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
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

  @Get(':id/recording/chunks')
  async listRecordingChunks(@Param('id') id: string) {
    const chunkKeys = await this.redis.sMembers(`recording:chunks:${id}`);

    const finalizeSignal = await this.prisma.signal.findFirst({
      where: { interviewId: id, type: 'recording_finalized' },
      orderBy: { createdAt: 'desc' },
    });

    const metadata = (finalizeSignal?.metadata as Record<string, unknown>) || {};
    const totalChunks = (metadata['totalChunks'] as number) || chunkKeys.length;

    const chunks = chunkKeys
      .map((key) => {
        const match = key.match(/chunk_(\d+)\.webm$/);
        const chunkIndex = match && match[1] ? parseInt(match[1], 10) : 0;
        return {
          chunkIndex,
          key,
          url: this.storageService.getPublicUrl(key),
          streamUrl: `/api/v1/rooms/${id}/recording/chunks/${chunkIndex}`,
        };
      })
      .sort((a, b) => a.chunkIndex - b.chunkIndex);

    return {
      interviewId: id,
      totalChunks,
      isFinalized: Boolean(finalizeSignal),
      chunks,
    };
  }

  @Get(':id/recording/chunks/:chunkIndex')
  async getRecordingChunk(
    @Param('id') id: string,
    @Param('chunkIndex') chunkIndex: string,
    @Res() res: Response,
  ) {
    const indexNum = parseInt(chunkIndex, 10);
    const indexStr = isNaN(indexNum) ? chunkIndex : indexNum.toString().padStart(5, '0');
    const key = `recordings/${id}/chunk_${indexStr}.webm`;

    const obj = await this.storageService.getObject(key);
    if (!obj) {
      throw new NotFoundException(`Recording chunk ${chunkIndex} for interview ${id} not found`);
    }

    res.setHeader('Content-Type', obj.contentType);
    res.setHeader('Content-Length', obj.data.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(obj.data);
  }
}
