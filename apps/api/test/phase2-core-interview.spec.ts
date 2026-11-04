import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter.js';

describe('Phase 2 Core Interview E2E Test Suite', () => {
  let app: INestApplication;
  let interviewerCookie: string;
  let candidateSessionCookie: string;
  let interviewId: string;
  let questionId: string;
  let interviewQuestionId: string;
  let candidateToken: string;

  const testEmail = `interviewer-p2-${Date.now()}@example.com`;
  const testPassword = 'StrongPassword123!';

  beforeAll(async () => {
    process.env.MOCK_JUDGE0 = 'true';

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
        displayName: 'Technical Lead',
      })
      .expect(201);

    const cookies = regRes.headers['set-cookie'];
    interviewerCookie = cookies.find((c: string) => c.startsWith('crucible_session='));

    // 2. Create an interview
    const intRes = await request(app.getHttpServer())
      .post('/api/v1/interviews')
      .set('Cookie', interviewerCookie)
      .send({
        candidateName: 'Alex Smith',
        roleTitle: 'Senior Backend Engineer',
      })
      .expect(201);

    interviewId = intRes.body.interview.id;
    candidateToken = intRes.body.roomToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Creates a question in the Question Bank with multi-language starter code and visible/hidden test cases', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/questions')
      .set('Cookie', interviewerCookie)
      .send({
        title: 'Reverse String',
        descriptionMd: 'Write a function that reverses a string.',
        difficulty: 'easy',
        tags: ['string', 'two-pointers'],
        languages: [
          {
            language: 'typescript',
            starterCode: 'function reverse(s: string): string { return s.split("").reverse().join(""); }',
          },
          {
            language: 'python',
            starterCode: 'def reverse(s: str) -> str:\n    return s[::-1]',
          },
        ],
        testCases: [
          {
            input: 'hello',
            expectedOutput: 'olleh',
            isHidden: false,
            order: 0,
          },
          {
            input: 'Crucible',
            expectedOutput: 'elbicurC',
            isHidden: true,
            order: 1,
          },
        ],
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('Reverse String');
    expect(res.body.languages).toHaveLength(2);
    expect(res.body.testCases).toHaveLength(2);
    questionId = res.body.id;
  });

  it('2. Lists questions with filters and search query', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/questions')
      .set('Cookie', interviewerCookie)
      .query({ search: 'Reverse', difficulty: 'easy' })
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].title).toBe('Reverse String');
  });

  it('3. Duplicates a question', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/questions/${questionId}/duplicate`)
      .set('Cookie', interviewerCookie)
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.id).not.toBe(questionId);
    expect(res.body.title).toBe('Reverse String (Copy)');
    expect(res.body.languages).toHaveLength(2);
    expect(res.body.testCases).toHaveLength(2);
  });

  it('4. Exports question to JSON and imports it back', async () => {
    const exportRes = await request(app.getHttpServer())
      .get(`/api/v1/questions/${questionId}/export`)
      .set('Cookie', interviewerCookie)
      .expect(200);

    expect(exportRes.body.version).toBe('1.0');
    expect(exportRes.body.question.title).toBe('Reverse String');

    // Modify title to import as new
    const importPayload = {
      ...exportRes.body.question,
      title: 'Reverse String (Imported)',
    };

    const importRes = await request(app.getHttpServer())
      .post('/api/v1/questions/import')
      .set('Cookie', interviewerCookie)
      .send({ question: importPayload })
      .expect(201);

    expect(importRes.body.title).toBe('Reverse String (Imported)');
  });

  it('5. Seeds default technical interview questions', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/questions/seed')
      .set('Cookie', interviewerCookie)
      .expect(201);

    expect(res.body).toHaveProperty('count');
  });

  it('6. Attaches a question to the live interview', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/interviews/${interviewId}/questions`)
      .set('Cookie', interviewerCookie)
      .send({
        questionId,
        language: 'typescript',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.interviewId).toBe(interviewId);
    expect(res.body.questionId).toBe(questionId);
    expect(res.body.language).toBe('typescript');
    interviewQuestionId = res.body.id;
  });

  it('7. Candidate joins room, is admitted by interviewer, and verifies test case visibility', async () => {
    // Candidate joins
    const joinRes = await request(app.getHttpServer())
      .post('/api/v1/rooms/join')
      .send({
        token: candidateToken,
        displayName: 'Alex Smith',
      })
      .expect(201);

    const cookies = joinRes.headers['set-cookie'];
    candidateSessionCookie = cookies.find((c: string) =>
      c.startsWith('crucible_candidate_session='),
    );
    const candidateId = joinRes.body.candidateId;

    // Interviewer admits candidate
    await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId}/admit`)
      .set('Cookie', interviewerCookie)
      .send({ candidateSessionId: candidateId })
      .expect(201);

    // Candidate checks room status: hidden test case details must NOT be leaked
    const candidateStatus = await request(app.getHttpServer())
      .get(`/api/v1/rooms/${interviewId}/status`)
      .set('Cookie', candidateSessionCookie)
      .expect(200);

    const candidateQuestion = candidateStatus.body.questions[0].question;
    expect(candidateQuestion.testCases).toHaveLength(1); // Only visible test case
    expect(candidateQuestion.testCases[0].isHidden).toBe(false);
    expect(candidateQuestion.hiddenCasesCount).toBe(1); // 1 hidden case

    // Interviewer checks room status: sees all test cases including hidden
    const interviewerStatus = await request(app.getHttpServer())
      .get(`/api/v1/rooms/${interviewId}/status`)
      .set('Cookie', interviewerCookie)
      .expect(200);

    const interviewerQuestion = interviewerStatus.body.questions[0].question;
    expect(interviewerQuestion.testCases).toHaveLength(2); // Visible + hidden
  });

  it('8. Candidate runs code against test cases: candidate gets visible details and aggregate hidden summary only', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/interview-questions/${interviewQuestionId}/run`)
      .set('Cookie', candidateSessionCookie)
      .send({
        language: 'typescript',
        sourceCode: 'function reverse(s: string) { return s.split("").reverse().join(""); }',
      })
      .expect(201);

    expect(res.body.runId).toBeDefined();
    expect(res.body.allPassed).toBe(true);
    expect(res.body.totalCases).toBe(2);
    expect(res.body.passedCases).toBe(2);
    expect(res.body.visibleResults).toHaveLength(1);
    expect(res.body.visibleResults[0].passed).toBe(true);
    expect(res.body.visibleResults[0].input).toBe('hello');
    expect(res.body.hiddenSummary).toEqual({ total: 1, passed: 1 });
    expect(res.body.hiddenResults).toBeUndefined(); // Crucial: candidate does NOT get hidden details
  });

  it('9. Interviewer runs code: receives full test case details including hidden cases', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/interview-questions/${interviewQuestionId}/run`)
      .set('Cookie', interviewerCookie)
      .send({
        language: 'typescript',
        sourceCode: 'function reverse(s: string) { return s.split("").reverse().join(""); }',
      })
      .expect(201);

    expect(res.body.allPassed).toBe(true);
    expect(res.body.visibleResults).toHaveLength(1);
    expect(res.body.hiddenResults).toBeDefined();
    expect(res.body.hiddenResults).toHaveLength(1);
    expect(res.body.hiddenResults[0].input).toBe('Crucible');
  });

  it('10. Runs custom input (Run with stdin)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/interview-questions/${interviewQuestionId}/run-custom`)
      .set('Cookie', candidateSessionCookie)
      .send({
        language: 'typescript',
        sourceCode: 'const s = "custom"; console.log(s);',
        stdin: 'arbitrary input',
      })
      .expect(201);

    expect(res.body.stdout).toBeDefined();
    expect(res.body.status).toBe('Accepted');
    expect(res.body.runtimeMs).toBeGreaterThanOrEqual(0);
  });

  it('11. Updates active language for interview question', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/interview-questions/${interviewQuestionId}/language`)
      .set('Cookie', interviewerCookie)
      .send({ language: 'python' })
      .expect(200);

    expect(res.body.language).toBe('python');
  });

  it('12. Saves whiteboard snapshot to object/database snapshots', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${interviewId}/whiteboard/snapshot`)
      .set('Cookie', interviewerCookie)
      .send({
        docType: `whiteboard:${interviewQuestionId}`,
        snapshot: JSON.stringify({ schema: 1, shapes: [{ id: 'shape:1', type: 'geo' }] }),
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.docType).toBe(`whiteboard:${interviewQuestionId}`);
  });
});

