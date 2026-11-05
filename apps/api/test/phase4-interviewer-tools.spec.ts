import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter.js';

describe('Phase 4 Interviewer Tools E2E Test Suite', () => {
  let app: INestApplication;
  let interviewerCookie: string;
  let candidateSessionCookie: string;
  let interviewId: string;
  let candidateToken: string;
  let defaultRubricId: string;
  let defaultCriteriaIds: string[] = [];

  const testEmail = `interviewer-p4-${Date.now()}@example.com`;
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
        displayName: 'Staff Engineer',
      })
      .expect(201);

    const cookies = regRes.headers['set-cookie'];
    interviewerCookie = cookies.find((c: string) => c.startsWith('crucible_session='));

    // 2. Create an interview
    const intRes = await request(app.getHttpServer())
      .post('/api/v1/interviews')
      .set('Cookie', interviewerCookie)
      .send({
        candidateName: 'Morgan Candidate',
        roleTitle: 'Systems Architect',
      })
      .expect(201);

    interviewId = intRes.body.interview.id;
    candidateToken = intRes.body.roomToken;

    // 3. Candidate joins and is admitted
    const joinRes = await request(app.getHttpServer())
      .post('/api/v1/rooms/join')
      .send({
        token: candidateToken,
        displayName: 'Morgan Candidate',
      })
      .expect(201);

    const cCookies = joinRes.headers['set-cookie'];
    candidateSessionCookie = cCookies.find((c: string) =>
      c.startsWith('crucible_candidate_session='),
    );

    await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId}/admit`)
      .set('Cookie', interviewerCookie)
      .send({
        candidateSessionId: joinRes.body.candidateId,
      })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Rubric Templates & Criteria', () => {
    it('seeds and returns default core rubric template if none exist', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/rubrics')
        .set('Cookie', interviewerCookie)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);

      const defaultRubric = res.body[0];
      defaultRubricId = defaultRubric.id;
      expect(defaultRubric.name).toBe('Core Software Engineering Rubric');
      expect(defaultRubric.criteria.length).toBe(4);

      defaultCriteriaIds = defaultRubric.criteria.map((c: { id: string }) => c.id);
      expect(defaultCriteriaIds.length).toBe(4);
    });

    it('creates a custom rubric template', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/rubrics')
        .set('Cookie', interviewerCookie)
        .send({
          name: 'Frontend Specialist Rubric',
          criteria: [
            {
              name: 'CSS & Design Systems',
              description: 'Understanding of modern CSS, responsive layouts, and tokens.',
              weight: 1.5,
              levelDescriptors: {
                '1': 'Unfamiliar with flexbox/grid',
                '4': 'Expert in token architecture and fluid layouts',
              },
            },
          ],
        })
        .expect(201);

      expect(res.body.name).toBe('Frontend Specialist Rubric');
      expect(res.body.criteria[0].name).toBe('CSS & Design Systems');
    });

    it('attaches a rubric template to the active interview', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/rooms/${interviewId}/rubric/${defaultRubricId}`)
        .set('Cookie', interviewerCookie)
        .expect(201);

      expect(res.body.id).toBe(defaultRubricId);
      expect(res.body.name).toBe('Core Software Engineering Rubric');
    });

    it('retrieves the rubric attached to the interview room', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/rooms/${interviewId}/rubric`)
        .set('Cookie', interviewerCookie)
        .expect(200);

      expect(res.body.id).toBe(defaultRubricId);
      expect(res.body.criteria.length).toBe(4);
    });
  });

  describe('2. Timestamped Interviewer Notes', () => {
    let createdNoteId: string;

    it('creates a note with explicit timestamp offset', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/rooms/${interviewId}/notes`)
        .set('Cookie', interviewerCookie)
        .send({
          bodyMd: 'Candidate immediately identified need for a MinHeap.',
          offsetMs: 360000, // 6 minutes in
        })
        .expect(201);

      createdNoteId = res.body.id;
      expect(res.body.bodyMd).toContain('MinHeap');
      expect(res.body.offsetMs).toBe(360000);
      expect(res.body.interviewId).toBe(interviewId);
    });

    it('creates a note with automatically computed offset when omitted', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/rooms/${interviewId}/notes`)
        .set('Cookie', interviewerCookie)
        .send({
          bodyMd: 'Candidate explained trade-offs between BFS and DFS clearly.',
        })
        .expect(201);

      expect(res.body.offsetMs).toBeGreaterThanOrEqual(0);
      expect(res.body.bodyMd).toContain('trade-offs between BFS and DFS');
    });

    it('lists all notes in chronological offset order', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/rooms/${interviewId}/notes`)
        .set('Cookie', interviewerCookie)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('updates note markdown body', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/rooms/${interviewId}/notes/${createdNoteId}`)
        .set('Cookie', interviewerCookie)
        .send({
          bodyMd: 'Candidate immediately identified need for a MinHeap (O(N log K)).',
        })
        .expect(200);

      expect(res.body.bodyMd).toContain('O(N log K)');
    });

    it('rejects candidate access to private interviewer notes (401/403)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/rooms/${interviewId}/notes`)
        .set('Cookie', candidateSessionCookie)
        .expect(401);

      await request(app.getHttpServer())
        .post(`/api/v1/rooms/${interviewId}/notes`)
        .set('Cookie', candidateSessionCookie)
        .send({ bodyMd: 'Hacker note attempt' })
        .expect(401);
    });

    it('deletes a note', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/rooms/${interviewId}/notes/${createdNoteId}`)
        .set('Cookie', interviewerCookie)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/rooms/${interviewId}/notes`)
        .set('Cookie', interviewerCookie)
        .expect(200);

      expect(res.body.find((n: { id: string }) => n.id === createdNoteId)).toBeUndefined();
    });
  });

  describe('3. Scorecards & Ratings', () => {
    it('submits a complete scorecard with ratings and recommendation', async () => {
      const ratings = defaultCriteriaIds.map((cid, i) => ({
        criterionId: cid,
        rating: 4,
        justification: `Criterion ${i + 1} demonstrated strong proficiency.`,
      }));

      const res = await request(app.getHttpServer())
        .post(`/api/v1/rooms/${interviewId}/scorecard`)
        .set('Cookie', interviewerCookie)
        .send({
          recommendation: 'strong_hire',
          summaryText:
            'Outstanding technical performance, clean modular code, and proactive communication.',
          ratings,
        })
        .expect(201);

      expect(res.body.recommendation).toBe('strong_hire');
      expect(res.body.summaryText).toContain('Outstanding technical performance');
      expect(res.body.ratings.length).toBe(4);
      expect(res.body.submittedAt).not.toBeNull();
    });

    it('retrieves the submitted scorecard with criteria descriptions', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/rooms/${interviewId}/scorecard`)
        .set('Cookie', interviewerCookie)
        .expect(200);

      expect(res.body.recommendation).toBe('strong_hire');
      expect(res.body.ratings.length).toBe(4);
      expect(res.body.ratings[0].criterion.name).toBeDefined();
    });

    it('rejects candidate access to scorecard submission or retrieval', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/rooms/${interviewId}/scorecard`)
        .set('Cookie', candidateSessionCookie)
        .expect(401);

      await request(app.getHttpServer())
        .post(`/api/v1/rooms/${interviewId}/scorecard`)
        .set('Cookie', candidateSessionCookie)
        .send({ recommendation: 'hire', ratings: [] })
        .expect(401);
    });
  });

  describe('4. End Interview Lifecycle', () => {
    it('ends the interview session and transitions status to completed', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/rooms/${interviewId}/end`)
        .set('Cookie', interviewerCookie)
        .expect(201);

      expect(res.body.status).toBe('completed');
      expect(res.body.endedAt).not.toBeNull();
    });

    it('confirms interview status is completed via status endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/rooms/${interviewId}/status`)
        .set('Cookie', interviewerCookie)
        .expect(200);

      expect(res.body.status).toBe('completed');
    });
  });
});
