import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter.js';

describe('Phase 5 Dashboard & Replay E2E Test Suite', () => {
  let app: INestApplication;
  let interviewerCookie: string;
  let otherInterviewerCookie: string;
  let interviewId1: string;
  let interviewId2: string;
  let rubricId: string;
  let criterionId: string;

  const testEmail1 = `interviewer-p5-1-${Date.now()}@example.com`;
  const testEmail2 = `interviewer-p5-2-${Date.now()}@example.com`;
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

    // 1. Register main interviewer
    const regRes1 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: testEmail1,
        password: testPassword,
        displayName: 'Director of Engineering',
      })
      .expect(201);

    interviewerCookie = regRes1.headers['set-cookie'].find((c: string) =>
      c.startsWith('crucible_session='),
    );

    // 2. Register second interviewer
    const regRes2 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: testEmail2,
        password: testPassword,
        displayName: 'Tech Lead',
      })
      .expect(201);

    otherInterviewerCookie = regRes2.headers['set-cookie'].find((c: string) =>
      c.startsWith('crucible_session='),
    );

    // 3. Create Interview 1
    const intRes1 = await request(app.getHttpServer())
      .post('/api/v1/interviews')
      .set('Cookie', interviewerCookie)
      .send({
        candidateName: 'Alice Developer',
        roleTitle: 'Senior Full Stack Engineer',
      })
      .expect(201);

    interviewId1 = intRes1.body.interview.id;

    // 4. Create Interview 2
    const intRes2 = await request(app.getHttpServer())
      .post('/api/v1/interviews')
      .set('Cookie', interviewerCookie)
      .send({
        candidateName: 'Bob Architect',
        roleTitle: 'Senior Full Stack Engineer',
      })
      .expect(201);

    interviewId2 = intRes2.body.interview.id;

    // 5. Seed rubric and attach to interview 1
    const rubricsRes = await request(app.getHttpServer())
      .get('/api/v1/rubrics')
      .set('Cookie', interviewerCookie)
      .expect(200);

    rubricId = rubricsRes.body[0].id;
    criterionId = rubricsRes.body[0].criteria[0].id;

    await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId1}/rubric/${rubricId}`)
      .set('Cookie', interviewerCookie)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId2}/rubric/${rubricId}`)
      .set('Cookie', interviewerCookie)
      .expect(201);

    // 6. Add notes and scorecard for interview 1
    await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId1}/notes`)
      .set('Cookie', interviewerCookie)
      .send({
        bodyMd: 'Candidate walked through the recursive depth analysis.',
        offsetMs: 180000,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId1}/scorecard`)
      .set('Cookie', interviewerCookie)
      .send({
        recommendation: 'hire',
        summaryText: 'Strong algorithmic skills and solid communication.',
        ratings: [
          {
            criterionId,
            rating: 4,
            justification: 'Exemplary problem decomposition.',
          },
        ],
      })
      .expect(201);

    // 7. Save whiteboard snapshot on interview 1
    await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId1}/whiteboard/snapshot`)
      .set('Cookie', interviewerCookie)
      .send({
        docType: 'whiteboard',
        snapshot: JSON.stringify({ shapes: [{ id: 'rect-1', type: 'rectangle' }] }),
      })
      .expect(201);

    // 8. End interview 1
    await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId1}/end`)
      .set('Cookie', interviewerCookie)
      .expect(201);

    // 9. Scorecard for interview 2 (strong_hire)
    await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId2}/scorecard`)
      .set('Cookie', interviewerCookie)
      .send({
        recommendation: 'strong_hire',
        summaryText: 'Top tier candidate.',
        ratings: [
          {
            criterionId,
            rating: 4,
            justification: 'Exceptional answers.',
          },
        ],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId2}/end`)
      .set('Cookie', interviewerCookie)
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Aggregate Statistics', () => {
    it('returns aggregate statistics for the interviewer', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/interviews/stats')
        .set('Cookie', interviewerCookie)
        .expect(200);

      expect(res.body.totalInterviews).toBeGreaterThanOrEqual(2);
      expect(res.body.completedInterviews).toBeGreaterThanOrEqual(2);
      expect(res.body.recommendationCounts.hire).toBeGreaterThanOrEqual(1);
      expect(res.body.recommendationCounts.strong_hire).toBeGreaterThanOrEqual(1);
    });

    it('rejects unauthenticated requests to stats (401)', async () => {
      await request(app.getHttpServer()).get('/api/v1/interviews/stats').expect(401);
    });
  });

  describe('2. Comprehensive Interview Detail', () => {
    it('returns detailed interview package with notes, whiteboard snapshots, and scorecard', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/interviews/${interviewId1}/detail`)
        .set('Cookie', interviewerCookie)
        .expect(200);

      expect(res.body.id).toBe(interviewId1);
      expect(res.body.candidateName).toBe('Alice Developer');
      expect(res.body.status).toBe('completed');
      expect(res.body.notes.length).toBeGreaterThanOrEqual(1);
      expect(res.body.notes[0].bodyMd).toContain('recursive depth analysis');
      expect(res.body.scorecard.recommendation).toBe('hire');
      expect(res.body.scorecard.ratings[0].criterion.name).toBeDefined();
      expect(res.body.whiteboardSnapshots.length).toBeGreaterThanOrEqual(1);
    });

    it('rejects access from another interviewer (403)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/interviews/${interviewId1}/detail`)
        .set('Cookie', otherInterviewerCookie)
        .expect(403);
    });
  });

  describe('3. Replay Timeline Events', () => {
    it('returns ordered timeline events for scrub replay', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/interviews/${interviewId1}/replay`)
        .set('Cookie', interviewerCookie)
        .expect(200);

      expect(res.body.interviewId).toBe(interviewId1);
      expect(Array.isArray(res.body.events)).toBe(true);
      expect(res.body.events.length).toBeGreaterThanOrEqual(2); // note and whiteboard snapshot

      // Verify sorted by offsetMs
      for (let i = 1; i < res.body.events.length; i++) {
        expect(res.body.events[i].offsetMs).toBeGreaterThanOrEqual(res.body.events[i - 1].offsetMs);
      }
    });
  });

  describe('4. Candidate Side-by-Side Comparison', () => {
    it('returns side-by-side comparison between two candidates', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/interviews/compare?id1=${interviewId1}&id2=${interviewId2}`)
        .set('Cookie', interviewerCookie)
        .expect(200);

      expect(res.body.interviewA.candidateName).toBe('Alice Developer');
      expect(res.body.interviewB.candidateName).toBe('Bob Architect');
      expect(res.body.criteria.length).toBeGreaterThanOrEqual(1);
      expect(res.body.criteria[0].ratingA).toBe(4);
      expect(res.body.criteria[0].ratingB).toBe(4);
    });

    it('fails when query parameters are missing (400)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/interviews/compare?id1=${interviewId1}`)
        .set('Cookie', interviewerCookie)
        .expect(400);
    });
  });
});

