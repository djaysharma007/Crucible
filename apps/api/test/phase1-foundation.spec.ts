import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter.js';

describe('Phase 1 Foundation E2E Lifecycle', () => {
  let app: INestApplication;
  let interviewerCookie: string;
  let interviewId: string;
  let candidateToken: string;
  let candidateSessionCookie: string;
  let candidateId: string;

  const testEmail = `interviewer-${Date.now()}@example.com`;
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Registers an interviewer and issues an httpOnly session cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        displayName: 'Senior Interviewer',
      })
      .expect(201);

    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.displayName).toBe('Senior Interviewer');

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    interviewerCookie = cookies.find((c: string) => c.startsWith('crucible_session='));
    expect(interviewerCookie).toBeDefined();
    expect(interviewerCookie).toContain('HttpOnly');
  });

  it('2. Authenticates interviewer via /auth/me using session cookie', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', interviewerCookie)
      .expect(200);

    expect(res.body.user.email).toBe(testEmail);
  });

  it('3. Creates an interview room and receives an unguessable room link', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/interviews')
      .set('Cookie', interviewerCookie)
      .send({
        candidateName: 'Jordan Candidate',
        roleTitle: 'Systems Architect',
        scheduledAt: new Date(Date.now() + 3600000).toISOString(),
      })
      .expect(201);

    expect(res.body.interview).toBeDefined();
    expect(res.body.interview.status).toBe('scheduled');
    expect(res.body.roomToken).toBeDefined();
    expect(res.body.roomUrl).toContain(`/room/${res.body.interview.id}?token=`);

    interviewId = res.body.interview.id;
    candidateToken = res.body.roomToken;
  });

  it('4. Candidate joins the room via token without an account and enters lobby', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/rooms/join')
      .send({
        token: candidateToken,
        displayName: 'Jordan C.',
      })
      .expect(201);

    expect(res.body.interviewId).toBe(interviewId);
    expect(res.body.isAdmitted).toBe(false);
    expect(res.body.candidateId).toBeDefined();

    candidateId = res.body.candidateId;
    const cookies = res.headers['set-cookie'];
    candidateSessionCookie = cookies.find((c: string) =>
      c.startsWith('crucible_candidate_session='),
    );
    expect(candidateSessionCookie).toBeDefined();
  });

  it('5. Candidate polls status and sees isAdmitted = false', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/rooms/${interviewId}/status`)
      .set('Cookie', candidateSessionCookie)
      .expect(200);

    expect(res.body.isAdmitted).toBe(false);
    expect(res.body.status).toBe('scheduled');
  });

  it('6. Interviewer inspects lobby and admits waiting candidate', async () => {
    const lobbyRes = await request(app.getHttpServer())
      .get(`/api/v1/rooms/${interviewId}/lobby`)
      .set('Cookie', interviewerCookie)
      .expect(200);

    expect(Array.isArray(lobbyRes.body)).toBe(true);
    expect(lobbyRes.body.length).toBeGreaterThan(0);
    expect(lobbyRes.body[0].candidateId).toBe(candidateId);

    const admitRes = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId}/admit`)
      .set('Cookie', interviewerCookie)
      .send({ candidateSessionId: candidateId })
      .expect(201);

    expect(admitRes.body.success).toBe(true);
  });

  it('7. Candidate status updates to isAdmitted = true and status = live', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/rooms/${interviewId}/status`)
      .set('Cookie', candidateSessionCookie)
      .expect(200);

    expect(res.body.isAdmitted).toBe(true);
    expect(res.body.status).toBe('live');
  });

  it('8. Interviewer toggles editor lock on and off', async () => {
    const lockRes = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId}/lock`)
      .set('Cookie', interviewerCookie)
      .send({ locked: true })
      .expect(201);

    expect(lockRes.body.locked).toBe(true);

    let statusRes = await request(app.getHttpServer())
      .get(`/api/v1/rooms/${interviewId}/status`)
      .expect(200);
    expect(statusRes.body.isLocked).toBe(true);

    const unlockRes = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId}/lock`)
      .set('Cookie', interviewerCookie)
      .send({ locked: false })
      .expect(201);

    expect(unlockRes.body.locked).toBe(false);

    statusRes = await request(app.getHttpServer())
      .get(`/api/v1/rooms/${interviewId}/status`)
      .expect(200);
    expect(statusRes.body.isLocked).toBe(false);
  });

  it('9. Interviewer ends session; editor locks and subsequent joins are rejected', async () => {
    const endRes = await request(app.getHttpServer())
      .post(`/api/v1/interviews/${interviewId}/end`)
      .set('Cookie', interviewerCookie)
      .expect(201);

    expect(endRes.body.status).toBe('completed');
    expect(endRes.body.endedAt).toBeDefined();

    // Re-joining with token should be rejected now
    await request(app.getHttpServer())
      .post('/api/v1/rooms/join')
      .send({
        token: candidateToken,
        displayName: 'Late Candidate',
      })
      .expect(400);
  });
});
