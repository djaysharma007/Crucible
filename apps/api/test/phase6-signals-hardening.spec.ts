import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { Request, Response, NextFunction } from 'express';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter.js';

describe('Phase 6 Signals and Hardening E2E Test Suite', () => {
  let app: INestApplication;
  let interviewerCookie: string;
  let candidateCookie: string;
  let interviewId: string;
  let rawRoomToken: string;

  const testEmail = `hardening-tester-${Date.now()}@example.com`;
  const testPassword = 'StrongPassword123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());

    // Security Headers middleware as in main.ts
    app.use((_req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws: wss:; frame-ancestors 'none';",
      );
      res.setHeader(
        'Permissions-Policy',
        'camera=(self), microphone=(self), display-capture=(self)',
      );
      next();
    });

    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    // Reset any existing test rate limits in Redis
    const { RedisService } = await import('../src/redis/redis.service.js');
    const redis = app.get(RedisService);
    const client = redis.getClient();
    if (client) {
      const keys = await client.keys('ratelimit:*');
      if (keys.length > 0) {
        await client.del(...keys);
      }
    }

    // 1. Register interviewer
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        displayName: 'Security Lead',
      })
      .expect(201);

    interviewerCookie = regRes.headers['set-cookie'].find((c: string) =>
      c.startsWith('crucible_session='),
    );

    // 2. Create interview session
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/interviews')
      .set('Cookie', interviewerCookie)
      .send({
        candidateName: 'Hardening Candidate',
        roleTitle: 'Security Systems Engineer',
      })
      .expect(201);

    interviewId = createRes.body.interview.id;
    rawRoomToken = createRes.body.roomToken;

    // 3. Candidate joins
    const joinRes = await request(app.getHttpServer())
      .post('/api/v1/rooms/join')
      .send({
        token: rawRoomToken,
        displayName: 'Hardening Candidate',
      })
      .expect(201);

    candidateCookie = joinRes.headers['set-cookie'].find((c: string) =>
      c.startsWith('crucible_candidate_session='),
    );
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Security Headers', () => {
    it('returns strict security headers on all endpoints', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health');

      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
      expect(res.headers['content-security-policy']).toContain("default-src 'self'");
      expect(res.headers['permissions-policy']).toContain('camera=(self)');
    });
  });

  describe('Transparency Signals Telemetry', () => {
    it('records transparency signals from candidate and interviewer', async () => {
      // 1. Candidate sends tab_hidden signal
      const signalRes1 = await request(app.getHttpServer())
        .post(`/api/v1/rooms/${interviewId}/signals`)
        .set('Cookie', candidateCookie)
        .send({
          type: 'tab_hidden',
          offsetMs: 12000,
          metadata: {},
        })
        .expect(201);

      expect(signalRes1.body.type).toBe('tab_hidden');
      expect(signalRes1.body.offsetMs).toBe(12000);

      // 2. Candidate sends paste signal
      const signalRes2 = await request(app.getHttpServer())
        .post(`/api/v1/rooms/${interviewId}/signals`)
        .set('Cookie', candidateCookie)
        .send({
          type: 'paste',
          offsetMs: 25000,
          metadata: {
            characterCount: 140,
            lineCount: 8,
          },
        })
        .expect(201);

      expect(signalRes2.body.type).toBe('paste');
      expect(signalRes2.body.metadata.characterCount).toBe(140);

      // 3. Candidate sends window_blur and window_focus signals
      await request(app.getHttpServer())
        .post(`/api/v1/rooms/${interviewId}/signals`)
        .set('Cookie', candidateCookie)
        .send({
          type: 'window_blur',
          offsetMs: 40000,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/rooms/${interviewId}/signals`)
        .set('Cookie', candidateCookie)
        .send({
          type: 'window_focus',
          offsetMs: 45000,
        })
        .expect(201);
    });

    it('rejects unauthenticated requests to record signals', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/rooms/${interviewId}/signals`)
        .send({
          type: 'tab_hidden',
        })
        .expect(400);
    });

    it('retrieves recorded transparency signals in chronological order', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/rooms/${interviewId}/signals`)
        .set('Cookie', interviewerCookie)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(4);
      expect(res.body[0].type).toBe('tab_hidden');
      expect(res.body[1].type).toBe('paste');
      expect(res.body[1].metadata.characterCount).toBe(140);
    });

    it('includes signals in the replay event timeline', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/interviews/${interviewId}/replay`)
        .set('Cookie', interviewerCookie)
        .expect(200);

      const signalEvents = res.body.events.filter((e: { type: string }) => e.type === 'signal');
      expect(signalEvents.length).toBeGreaterThanOrEqual(4);

      const pasteEvent = signalEvents.find(
        (e: { metadata?: { signalType?: string } }) => e.metadata?.signalType === 'paste',
      );
      expect(pasteEvent).toBeDefined();
      expect(pasteEvent.offsetMs).toBe(25000);
    });
  });

  describe('Rate Limiting', () => {
    it('sets standard rate limit headers on throttled endpoints', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(res.headers['x-ratelimit-limit']).toBeDefined();
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
      expect(res.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('enforces 429 when rate limit threshold is exceeded', async () => {
      const floodEmail = `flood-${Date.now()}@example.com`;

      // Auth register limit is 10 requests per minute
      let hit429 = false;
      for (let i = 0; i < 15; i++) {
        const res = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .set('X-Forwarded-For', '198.51.100.99')
          .send({
            email: floodEmail,
            password: 'InvalidPassword',
            displayName: 'Flood Test',
          });

        if (res.status === 429) {
          hit429 = true;
          expect(res.headers['retry-after']).toBeDefined();
          expect(res.body.error?.message || res.body.message).toContain('Rate limit exceeded');
          break;
        }
      }

      expect(hit429).toBe(true);
    });
  });

  describe('Data Retention and Deletion', () => {
    let deletableInterviewId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/interviews')
        .set('Cookie', interviewerCookie)
        .send({
          candidateName: 'Temporary Interview Candidate',
        })
        .expect(201);

      deletableInterviewId = res.body.interview.id;
    });

    it('deletes an interview session by owner', async () => {
      const delRes = await request(app.getHttpServer())
        .delete(`/api/v1/interviews/${deletableInterviewId}`)
        .set('Cookie', interviewerCookie)
        .expect(200);

      expect(delRes.body.success).toBe(true);
      expect(delRes.body.id).toBe(deletableInterviewId);

      // Verify it is no longer found
      await request(app.getHttpServer())
        .get(`/api/v1/interviews/${deletableInterviewId}`)
        .set('Cookie', interviewerCookie)
        .expect(404);
    });

    it('executes data retention cleanup for expired sessions', async () => {
      const cleanupRes = await request(app.getHttpServer())
        .post('/api/v1/interviews/cleanup?retentionDays=90')
        .set('Cookie', interviewerCookie)
        .expect(201);

      expect(typeof cleanupRes.body.deletedCount).toBe('number');
      expect(cleanupRes.body.retentionDays).toBe(90);
      expect(cleanupRes.body.cutoffDate).toBeDefined();
    });
  });
});
