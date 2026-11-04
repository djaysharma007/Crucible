import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { SEED_QUESTIONS } from '../src/questions/questions.seed.js';
import { DEFAULT_SEED_RUBRIC } from '../src/rubrics/rubrics.constants.js';

const prisma = new PrismaClient();

async function main() {
  const password = process.env.DEMO_INTERVIEWER_PASSWORD;
  if (!password) {
    process.stderr.write(
      'ERROR: DEMO_INTERVIEWER_PASSWORD environment variable is required to run the seed script.\n' +
        'Example: DEMO_INTERVIEWER_PASSWORD="Password123!" pnpm --filter @crucible/api db:seed\n',
    );
    process.exit(1);
  }

  process.stdout.write('--- Starting Crucible Demo Data Seeding ---\n');

  // 1. Seed or find demo interviewer account
  const demoEmail = 'interviewer@crucible.dev';
  let interviewer = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (!interviewer) {
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    interviewer = await prisma.user.create({
      data: {
        email: demoEmail,
        passwordHash,
        displayName: 'Lead Technical Interviewer',
      },
    });
    process.stdout.write(`Created demo interviewer account: ${demoEmail} (${interviewer.id})\n`);
  } else {
    process.stdout.write(`Demo interviewer account already exists: ${demoEmail} (${interviewer.id})\n`);
  }

  // 2. Seed standard question bank
  for (const q of SEED_QUESTIONS) {
    const existing = await prisma.question.findFirst({
      where: { title: q.title, ownerId: interviewer.id },
    });

    if (!existing) {
      await prisma.question.create({
        data: {
          title: q.title,
          descriptionMd: q.descriptionMd,
          difficulty: q.difficulty,
          tags: q.tags,
          ownerId: interviewer.id,
          languages: {
            create: q.languages.map((l) => ({
              language: l.language,
              starterCode: l.starterCode,
            })),
          },
          testCases: {
            create: q.testCases.map((tc, idx) => ({
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isHidden: tc.isHidden,
              order: tc.order ?? idx,
            })),
          },
        },
      });
      process.stdout.write(`Seeded question: ${q.title}\n`);
    }
  }

  // 3. Seed rubric template
  let rubric = await prisma.rubricTemplate.findFirst({
    where: { ownerId: interviewer.id, name: DEFAULT_SEED_RUBRIC.name },
  });

  if (!rubric) {
    rubric = await prisma.rubricTemplate.create({
      data: {
        name: DEFAULT_SEED_RUBRIC.name,
        ownerId: interviewer.id,
        criteria: {
          create: DEFAULT_SEED_RUBRIC.criteria.map((c) => ({
            name: c.name,
            description: c.description,
            weight: c.weight,
            levelDescriptors: c.levelDescriptors,
          })),
        },
      },
    });
    process.stdout.write(`Seeded rubric template: ${rubric.name}\n`);
  }

  // 4. Seed a completed presentation interview with full replay history
  const demoInterviewTitle = 'Demo: Senior Backend Engineer — Alex Smith';
  let interview = await prisma.interview.findFirst({
    where: { interviewerId: interviewer.id, candidateName: 'Alex Smith' },
  });

  if (!interview) {
    const rawToken = randomBytes(24).toString('base64url');
    const roomTokenHash = createHash('sha256').update(rawToken).digest('hex');

    const startedAt = new Date(Date.now() - 45 * 60 * 1000); // 45 mins ago
    const endedAt = new Date(Date.now() - 5 * 60 * 1000); // 5 mins ago

    interview = await prisma.interview.create({
      data: {
        interviewerId: interviewer.id,
        candidateName: 'Alex Smith',
        roleTitle: 'Senior Backend Engineer',
        roomTokenHash,
        status: 'completed',
        rubricTemplateId: rubric.id,
        startedAt,
        endedAt,
      },
    });

    // Attach Two Sum question to this interview
    const twoSum = await prisma.question.findFirst({
      where: { title: 'Two Sum', ownerId: interviewer.id },
    });

    if (twoSum) {
      const iq = await prisma.interviewQuestion.create({
        data: {
          interviewId: interview.id,
          questionId: twoSum.id,
          order: 0,
          language: 'typescript',
          startedAt,
        },
      });

      // Add a passing code run
      await prisma.codeRun.create({
        data: {
          interviewQuestionId: iq.id,
          language: 'typescript',
          sourceSnapshot: `function twoSum(nums: number[], target: number): number[] {\n  const map = new Map<number, number>();\n  for (let i = 0; i < nums.length; i++) {\n    const comp = target - nums[i];\n    if (map.has(comp)) return [map.get(comp)!, i];\n    map.set(nums[i], i);\n  }\n  return [];\n}`,
          results: {
            allPassed: true,
            totalCases: 2,
            passedCases: 2,
            visibleResults: [
              {
                testCaseId: 'demo-tc-1',
                order: 0,
                passed: true,
                status: 'Accepted',
                input: '[2,7,11,15]\\n9',
                expectedOutput: '[0,1]',
                actualOutput: '[0,1]',
                runtimeMs: 14,
                memoryKb: 2048,
                isHidden: false,
              },
            ],
            hiddenSummary: { total: 1, passed: 1 },
          },
          durationMs: 42,
          requestedAt: new Date(startedAt.getTime() + 20 * 60 * 1000),
        },
      });
    }

    // Attach rubric scorecard with criteria ratings
    const criteria = await prisma.rubricCriterion.findMany({
      where: { templateId: rubric.id },
    });

    await prisma.scorecard.create({
      data: {
        interviewId: interview.id,
        recommendation: 'hire',
        summaryText:
          'Alex demonstrated strong algorithmic problem-solving skills and exceptional communication throughout the technical interview. Walked through edge cases before coding and arrived at an optimal O(n) hash table solution.',
        submittedAt: endedAt,
        ratings: {
          create: criteria.map((c) => ({
            criterionId: c.id,
            rating: c.name.includes('Problem') ? 4 : 3,
            justification: `Solid performance on ${c.name}.`,
          })),
        },
      },
    });

    // Add private timestamped notes
    await prisma.note.createMany({
      data: [
        {
          interviewId: interview.id,
          bodyMd: 'Candidate immediately clarified edge cases (duplicate values, negative numbers).',
          offsetMs: 3 * 60 * 1000,
        },
        {
          interviewId: interview.id,
          bodyMd: 'Proposed hash table approach with O(N) time and O(N) space. Well reasoned.',
          offsetMs: 12 * 60 * 1000,
        },
        {
          interviewId: interview.id,
          bodyMd: 'Clean TypeScript implementation with type safety. Passed all unit test cases.',
          offsetMs: 25 * 60 * 1000,
        },
      ],
    });

    // Add whiteboard snapshot
    await prisma.collabSnapshot.create({
      data: {
        interviewId: interview.id,
        docType: `whiteboard:${interview.id}`,
        payload: Buffer.from(
          JSON.stringify([
            {
              id: 'demo-box-1',
              type: 'rectangle',
              version: 1,
              versionNonce: 101,
              x: 100,
              y: 120,
              width: 200,
              height: 100,
              strokeColor: '#E2C044',
              backgroundColor: 'transparent',
            },
            {
              id: 'demo-box-2',
              type: 'rectangle',
              version: 1,
              versionNonce: 102,
              x: 400,
              y: 120,
              width: 200,
              height: 100,
              strokeColor: '#587B7F',
              backgroundColor: 'transparent',
            },
          ]),
        ),
        offsetMs: 15 * 60 * 1000,
      },
    });

    // Add signals for replay timeline
    await prisma.signal.createMany({
      data: [
        {
          interviewId: interview.id,
          type: 'room_joined',
          metadata: { participant: 'Interviewer' },
          offsetMs: 0,
        },
        {
          interviewId: interview.id,
          type: 'candidate_admitted',
          metadata: { candidateName: 'Alex Smith' },
          offsetMs: 1 * 60 * 1000,
        },
        {
          interviewId: interview.id,
          type: 'question_attached',
          metadata: { title: 'Two Sum' },
          offsetMs: 4 * 60 * 1000,
        },
        {
          interviewId: interview.id,
          type: 'recording_started',
          metadata: { storage: 'supabase_s3' },
          offsetMs: 5 * 60 * 1000,
        },
        {
          interviewId: interview.id,
          type: 'test_executed',
          metadata: { passed: 2, total: 2 },
          offsetMs: 20 * 60 * 1000,
        },
        {
          interviewId: interview.id,
          type: 'recording_stopped',
          metadata: { totalChunks: 15 },
          offsetMs: 40 * 60 * 1000,
        },
        {
          interviewId: interview.id,
          type: 'interview_completed',
          metadata: { completedBy: 'Interviewer' },
          offsetMs: 40 * 60 * 1000,
        },
      ],
    });

    process.stdout.write(`Created completed demo interview: ${demoInterviewTitle} (${interview.id})\n`);
  }

  process.stdout.write('--- Seeding Completed Successfully ---\n');
}

main()
  .catch((e) => {
    process.stderr.write(`Seeding error: ${(e as Error).stack}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
