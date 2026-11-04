import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter.js';

describe('Phase 3 Presence & Media E2E Test Suite', () => {
  let app: INestApplication;
  let interviewerCookie: string;
  let candidateSessionCookie: string;
  let interviewId: string;
  let candidateToken: string;

  const testEmail = `interviewer-p3-${Date.now()}@example.com`;
  const testPassword = 'StrongPassword123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    // 1. Register interviewer
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        displayName: 'Lead Architect',
      })
      .expect(201);

    const cookies = regRes.headers['set-cookie'];
    interviewerCookie = cookies.find((c: string) => c.startsWith('crucible_session='));

    // 2. Create an interview
    const intRes = await request(app.getHttpServer())
      .post('/api/v1/interviews')
      .set('Cookie', interviewerCookie)
      .send({
        candidateName: 'Robin Candidate',
        roleTitle: 'Distributed Systems Engineer',
      })
      .expect(201);

    interviewId = intRes.body.interview.id;
    candidateToken = intRes.body.roomToken;

    // 3. Candidate joins and is admitted
    const joinRes = await request(app.getHttpServer())
      .post('/api/v1/rooms/join')
      .send({
        token: candidateToken,
        displayName: 'Robin C.',
      })
      .expect(201);

    const candCookies = joinRes.headers['set-cookie'];
    candidateSessionCookie = candCookies.find((c: string) =>
      c.startsWith('crucible_candidate_session='),
    );
    const candidateId = joinRes.body.candidateId;

    await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId}/admit`)
      .set('Cookie', interviewerCookie)
      .send({ candidateSessionId: candidateId })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Generates LiveKit presence token for Interviewer with correct room grants', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId}/livekit-token`)
      .set('Cookie', interviewerCookie)
      .expect(201);

    expect(res.body.token).toBeDefined();
    expect(res.body.wsUrl).toBeDefined();
    expect(res.body.roomName).toBe(`crucible-room-${interviewId}`);
    expect(res.body.isInterviewer).toBe(true);
    expect(res.body.participantName).toBe('Lead Architect');
  });

  it('2. Generates LiveKit presence token for Candidate with correct room grants', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId}/livekit-token`)
      .set('Cookie', candidateSessionCookie)
      .expect(201);

    expect(res.body.token).toBeDefined();
    expect(res.body.roomName).toBe(`crucible-room-${interviewId}`);
    expect(res.body.isInterviewer).toBe(false);
    expect(res.body.participantName).toBe('Robin C.');
  });

  it('3. Rejects token generation without authentication or admission', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId}/livekit-token`)
      .expect(401);
  });

  it('4. Checks recording status initially indicates no active recording and no consent', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/rooms/${interviewId}/recording/status`)
      .set('Cookie', interviewerCookie)
      .expect(200);

    expect(res.body.isRecording).toBe(false);
    expect(res.body.interviewerConsented).toBe(false);
    expect(res.body.candidateConsented).toBe(false);
  });

  it('5. Interviewer grants recording consent', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId}/recording/consent`)
      .set('Cookie', interviewerCookie)
      .send({ consented: true })
      .expect(201);

    expect(res.body.interviewerConsented).toBe(true);
    expect(res.body.candidateConsented).toBe(false);
  });

  it('6. Rejects starting recording when only interviewer has consented (double-consent requirement)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId}/recording/start`)
      .set('Cookie', interviewerCookie)
      .expect(400);

    expect(res.body.error.message).toContain('explicit consent from both participants');
  });

  it('7. Candidate grants recording consent, and recording starts successfully', async () => {
    // Candidate consents
    const consentRes = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId}/recording/consent`)
      .set('Cookie', candidateSessionCookie)
      .send({ consented: true })
      .expect(201);

    expect(consentRes.body.interviewerConsented).toBe(true);
    expect(consentRes.body.candidateConsented).toBe(true);

    // Interviewer starts recording
    const startRes = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId}/recording/start`)
      .set('Cookie', interviewerCookie)
      .expect(201);

    expect(startRes.body.isRecording).toBe(true);
    expect(startRes.body.egressId).toBeDefined();
    expect(startRes.body.startedAt).toBeDefined();
  });

  it('8. Interviewer stops cloud session recording', async () => {
    const stopRes = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId}/recording/stop`)
      .set('Cookie', interviewerCookie)
      .expect(201);

    expect(stopRes.body.isRecording).toBe(false);

    // Verify status returns not recording
    const statusRes = await request(app.getHttpServer())
      .get(`/api/v1/rooms/${interviewId}/recording/status`)
      .set('Cookie', candidateSessionCookie)
      .expect(200);

    expect(statusRes.body.isRecording).toBe(false);
  });

  it('9. Interviewer requests candidate screen share and candidate retrieves prompt', async () => {
    const reqRes = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId}/screenshare/request`)
      .set('Cookie', interviewerCookie)
      .send({
        target: 'candidate',
        message: 'Please share your entire screen for system design review.',
      })
      .expect(201);

    expect(reqRes.body.success).toBe(true);

    // Candidate polls for screen share request
    const promptRes = await request(app.getHttpServer())
      .get(`/api/v1/rooms/${interviewId}/screenshare/request`)
      .set('Cookie', candidateSessionCookie)
      .expect(200);

    expect(promptRes.body.request).toBeDefined();
    expect(promptRes.body.request.target).toBe('candidate');
    expect(promptRes.body.request.message).toContain('Please share your entire screen');

    // Candidate dismisses prompt
    await request(app.getHttpServer())
      .delete(`/api/v1/rooms/${interviewId}/screenshare/request`)
      .set('Cookie', candidateSessionCookie)
      .expect(200);

    const emptyRes = await request(app.getHttpServer())
      .get(`/api/v1/rooms/${interviewId}/screenshare/request`)
      .set('Cookie', candidateSessionCookie)
      .expect(200);

    expect(emptyRes.body.request).toBeNull();
  });
});
