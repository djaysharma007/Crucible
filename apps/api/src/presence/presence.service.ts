import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
} from '@nestjs/common';
import { AccessToken } from 'livekit-server-sdk';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import {
  LiveKitTokenResponse,
  RecordingStatusResponse,
} from '@crucible/shared';

export interface ParticipantInfo {
  interviewId: string;
  isInterviewer: boolean;
  participantId: string;
  displayName: string;
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private readonly apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
  private readonly apiSecret = process.env.LIVEKIT_API_SECRET || 'devsecret';
  private readonly livekitWsUrl = process.env.LIVEKIT_URL || 'ws://localhost:7880';

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  async generateToken(participant: ParticipantInfo): Promise<LiveKitTokenResponse> {
    const interview = await this.prisma.interview.findUnique({
      where: { id: participant.interviewId },
    });

    if (!interview) {
      throw new NotFoundException(`Interview room ${participant.interviewId} not found`);
    }

    if (interview.status === 'completed' || interview.status === 'cancelled') {
      throw new BadRequestException(`Cannot join presence for a ${interview.status} interview`);
    }

    const roomName = `crucible-room-${participant.interviewId}`;

    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: participant.participantId,
      name: participant.displayName,
      metadata: JSON.stringify({
        isInterviewer: participant.isInterviewer,
        role: participant.isInterviewer ? 'interviewer' : 'candidate',
      }),
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    this.logger.log(
      `Generated LiveKit presence token for ${participant.displayName} (${participant.isInterviewer ? 'interviewer' : 'candidate'}) in room ${roomName}`,
    );

    return {
      token,
      wsUrl: this.livekitWsUrl,
      roomName,
      participantIdentity: participant.participantId,
      participantName: participant.displayName,
      isInterviewer: participant.isInterviewer,
    };
  }

  async setRecordingConsent(
    interviewId: string,
    isInterviewer: boolean,
    consented: boolean,
  ) {
    const roleKey = isInterviewer ? 'interviewer' : 'candidate';
    await this.redis.set(
      `recording:consent:${interviewId}:${roleKey}`,
      consented ? 'true' : 'false',
      14400, // 4 hours
    );

    this.logger.log(`Recording consent for room ${interviewId} (${roleKey}) set to ${consented}`);
    return this.getRecordingStatus(interviewId);
  }

  async getRecordingStatus(interviewId: string): Promise<RecordingStatusResponse> {
    const [interviewerConsentedVal, candidateConsentedVal, activeRecordingData] =
      await Promise.all([
        this.redis.get(`recording:consent:${interviewId}:interviewer`),
        this.redis.get(`recording:consent:${interviewId}:candidate`),
        this.redis.get(`recording:active:${interviewId}`),
      ]);

    const interviewerConsented = interviewerConsentedVal === 'true';
    const candidateConsented = candidateConsentedVal === 'true';

    let isRecording = false;
    let startedAt: string | null = null;
    let egressId: string | null = null;

    if (activeRecordingData) {
      try {
        const parsed = JSON.parse(activeRecordingData);
        isRecording = true;
        startedAt = parsed.startedAt;
        egressId = parsed.egressId;
      } catch {
        // Ignore JSON error
      }
    }

    return {
      isRecording,
      startedAt,
      interviewerConsented,
      candidateConsented,
      egressId,
    };
  }

  async startRecording(interviewId: string, isInterviewer: boolean) {
    if (!isInterviewer) {
      throw new ForbiddenException('Only the interviewer can start cloud session recording');
    }

    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview) {
      throw new NotFoundException(`Interview ${interviewId} not found`);
    }

    if (interview.status === 'completed' || interview.status === 'cancelled') {
      throw new BadRequestException(`Cannot record a ${interview.status} interview`);
    }

    // Enforce Section 6.6 requirement: "Recording starts only after both participants have consented"
    const status = await this.getRecordingStatus(interviewId);
    if (!status.interviewerConsented || !status.candidateConsented) {
      throw new BadRequestException(
        'Cloud recording requires explicit consent from both participants',
      );
    }

    if (status.isRecording) {
      return status;
    }

    const egressId = `egress-${interviewId}-${Date.now()}`;
    const startedAt = new Date().toISOString();

    await this.redis.set(
      `recording:active:${interviewId}`,
      JSON.stringify({
        egressId,
        startedAt,
        roomName: `crucible-room-${interviewId}`,
      }),
      14400,
    );

    // Record recording started signal
    const offsetMs = interview.startedAt
      ? Math.max(0, Date.now() - interview.startedAt.getTime())
      : 0;

    await this.prisma.signal.create({
      data: {
        interviewId,
        type: 'recording_started',
        metadata: { egressId, startedAt },
        offsetMs,
      },
    });

    this.logger.log(`Active cloud recording started for interview ${interviewId} (egress: ${egressId})`);

    return this.getRecordingStatus(interviewId);
  }

  async stopRecording(interviewId: string, isInterviewer: boolean) {
    if (!isInterviewer) {
      throw new ForbiddenException('Only the interviewer can stop cloud session recording');
    }

    const status = await this.getRecordingStatus(interviewId);
    if (!status.isRecording) {
      return status;
    }

    const activeData = await this.redis.get(`recording:active:${interviewId}`);
    await this.redis.del(`recording:active:${interviewId}`);

    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
    });

    const offsetMs = interview?.startedAt
      ? Math.max(0, Date.now() - interview.startedAt.getTime())
      : 0;

    await this.prisma.signal.create({
      data: {
        interviewId,
        type: 'recording_stopped',
        metadata: {
          egressId: status.egressId,
          stoppedAt: new Date().toISOString(),
          activeData: activeData ? JSON.parse(activeData) : null,
        },
        offsetMs,
      },
    });

    this.logger.log(`Active cloud recording stopped for interview ${interviewId}`);

    return this.getRecordingStatus(interviewId);
  }

  async requestScreenShare(
    interviewId: string,
    isInterviewer: boolean,
    target: 'candidate' | 'interviewer',
    message?: string,
  ) {
    if (!isInterviewer && target === 'interviewer') {
      throw new ForbiddenException('Candidates cannot request interviewer screen share');
    }

    const payload = {
      interviewId,
      requestedBy: isInterviewer ? 'interviewer' : 'candidate',
      target,
      message: message || 'Your interviewer has requested that you share your screen.',
      timestamp: new Date().toISOString(),
    };

    // Store request in Redis with a 120s TTL
    await this.redis.set(
      `screenshare:request:${interviewId}:${target}`,
      JSON.stringify(payload),
      120,
    );

    this.logger.log(`Screen share requested for ${target} in room ${interviewId}`);
    return { success: true, request: payload };
  }

  async getScreenShareRequest(interviewId: string, role: 'candidate' | 'interviewer') {
    const raw = await this.redis.get(`screenshare:request:${interviewId}:${role}`);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async dismissScreenShareRequest(interviewId: string, role: 'candidate' | 'interviewer') {
    await this.redis.del(`screenshare:request:${interviewId}:${role}`);
    return { success: true };
  }
}

