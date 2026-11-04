/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { randomBytes, createHash } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Crucible database with production demo data...');

  // 1. Create or update Demo Interviewer
  const passwordHash = await argon2.hash('Password123!');
  const interviewer = await prisma.user.upsert({
    where: { email: 'interviewer@crucible.dev' },
    update: { passwordHash, displayName: 'Sarah Connor' },
    create: {
      email: 'interviewer@crucible.dev',
      passwordHash,
      displayName: 'Sarah Connor',
    },
  });

  console.log(`Seeded user: ${interviewer.email} (${interviewer.id})`);

  // 2. Create Core Software Engineering Rubric
  const rubric = await prisma.rubricTemplate.create({
    data: {
      ownerId: interviewer.id,
      name: 'Core Software Engineering Rubric',
      criteria: {
        create: [
          {
            name: 'Problem Solving',
            description:
              'Ability to deconstruct ambiguous technical problems, identify edge cases, and devise optimal algorithms.',
            weight: 1.0,
            levelDescriptors: {
              '1': 'Needs direction; struggles to identify basic edge cases or approach.',
              '2': 'Arrives at working solution with significant hints; algorithmic complexity sub-optimal.',
              '3': 'Independently designs correct algorithm; handles edge cases with minimal prompting.',
              '4': 'Flawlessly identifies optimal approach, analyzes trade-offs, and proactively validates edge cases.',
            },
          },
          {
            name: 'Code Quality',
            description:
              'Clean, idiomatic, maintainable code with modular decomposition and clear naming conventions.',
            weight: 1.0,
            levelDescriptors: {
              '1': 'Spaghetti code; unidiomatic constructs, difficult to trace.',
              '2': 'Functional code but cluttered; inconsistent naming and poor separation of concerns.',
              '3': 'Clean, readable, idiomatic code with logical function breakdown.',
              '4': 'Production-grade architecture; exceptionally modular, readable, and elegant.',
            },
          },
          {
            name: 'System Efficiency',
            description:
              'Deep understanding of time and space complexity, memory footprints, and CPU bottlenecks.',
            weight: 1.0,
            levelDescriptors: {
              '1': 'Unaware of time/space complexity or provides incorrect Big-O bounds.',
              '2': 'Understands theoretical complexity after guided questions.',
              '3': 'Accurately computes time and space complexities; avoids obvious bottlenecks.',
              '4': 'Proactively optimizes both asymptotic complexity and practical cache/memory layout.',
            },
          },
          {
            name: 'Communication',
            description:
              'Clarity in thought articulation, active listening, and technical collaboration.',
            weight: 1.0,
            levelDescriptors: {
              '1': 'Silent or unresponsive; dismisses hints and fails to communicate thought process.',
              '2': 'Communicates only when directly asked; difficult to follow reasoning.',
              '3': 'Thinks aloud clearly; open to feedback and responsive to guidance.',
              '4': 'Exemplary collaborative partner; clearly frames trade-offs and articulates reasoning.',
            },
          },
        ],
      },
    },
    include: { criteria: true },
  });

  console.log(`Seeded rubric: ${rubric.name} with ${rubric.criteria.length} criteria`);

  // 3. Create Technical Questions in Question Bank
  // Question A: Two Sum II
  const q1 = await prisma.question.create({
    data: {
      ownerId: interviewer.id,
      title: 'Two Sum II - Input Array Is Sorted',
      difficulty: 'easy',
      tags: ['algorithms', 'arrays', 'two-pointers'],
      descriptionMd: `### Problem Description

Given a 1-indexed array of integers \`numbers\` that is already sorted in non-decreasing order, find two numbers such that they add up to a specific \`target\` number.

Return the indices of the two numbers, \`index1\` and \`index2\`, added by one as an integer array \`[index1, index2]\` of length 2.

The tests are generated such that there is exactly one solution. You may not use the same element twice.

Your solution must use only constant extra space $O(1)$.

#### Example 1:
\`\`\`
Input: numbers = [2,7,11,15], target = 9
Output: [1,2]
Explanation: The sum of 2 and 7 is 9. Therefore, index1 = 1, index2 = 2.
\`\`\`

#### Example 2:
\`\`\`
Input: numbers = [2,3,4], target = 6
Output: [1,3]
\`\`\``,
      languages: {
        create: [
          {
            language: 'typescript',
            starterCode: `export function twoSum(numbers: number[], target: number): [number, number] {
  // Your implementation here
  return [0, 0];
}`,
          },
          {
            language: 'python',
            starterCode: `from typing import List

def two_sum(numbers: List[int], target: int) -> List[int]:
    # Your implementation here
    return [0, 0]`,
          },
          {
            language: 'javascript',
            starterCode: `function twoSum(numbers, target) {
  // Your implementation here
  return [0, 0];
}`,
          },
        ],
      },
      testCases: {
        create: [
          {
            input: '{"numbers": [2, 7, 11, 15], "target": 9}',
            expectedOutput: '[1, 2]',
            isHidden: false,
            order: 0,
          },
          {
            input: '{"numbers": [2, 3, 4], "target": 6}',
            expectedOutput: '[1, 3]',
            isHidden: false,
            order: 1,
          },
          {
            input: '{"numbers": [-1, 0], "target": -1}',
            expectedOutput: '[1, 2]',
            isHidden: true,
            order: 2,
          },
        ],
      },
    },
    include: { languages: true, testCases: true },
  });

  // Question B: LRU Cache
  const q2 = await prisma.question.create({
    data: {
      ownerId: interviewer.id,
      title: 'LRU Cache Design and Implementation',
      difficulty: 'medium',
      tags: ['data-structures', 'hash-map', 'doubly-linked-list'],
      descriptionMd: `### Problem Description

Design a data structure that follows the constraints of a **Least Recently Used (LRU) Cache**.

Implement the \`LRUCache\` class:
- \`LRUCache(int capacity)\`: Initialize the LRU cache with positive size \`capacity\`.
- \`int get(int key)\`: Return the value of the \`key\` if the key exists, otherwise return \`-1\`.
- \`void put(int key, int value)\`: Update the value of the \`key\` if the \`key\` exists. Otherwise, add the \`key-value\` pair to the cache. If the number of keys exceeds the \`capacity\` from this operation, evict the least recently used key.

The functions \`get\` and \`put\` must each run in $O(1)$ average time complexity.`,
      languages: {
        create: [
          {
            language: 'typescript',
            starterCode: `export class LRUCache {
  constructor(capacity: number) {
    // Initialize data structures
  }

  get(key: number): number {
    return -1;
  }

  put(key: number, value: number): void {
    // Insert or update key
  }
}`,
          },
          {
            language: 'python',
            starterCode: `class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity

    def get(self, key: int) -> int:
        return -1

    def put(self, key: int, value: int) -> None:
        pass`,
          },
        ],
      },
      testCases: {
        create: [
          {
            input: '{"operations": ["put", "put", "get", "put", "get", "put", "get", "get", "get"], "args": [[1,1], [2,2], [1], [3,3], [2], [4,4], [1], [3], [4]], "capacity": 2}',
            expectedOutput: '[null, null, 1, null, -1, null, -1, 3, 4]',
            isHidden: false,
            order: 0,
          },
        ],
      },
    },
    include: { languages: true, testCases: true },
  });

  console.log(`Seeded questions: ${q1.title}, ${q2.title}`);

  // 4. Seed Preloaded Interviews for Instant Demo Value
  // Interview 1: Alex Chen (Completed, Strong Hire)
  const token1 = randomBytes(24).toString('base64url');
  const tokenHash1 = createHash('sha256').update(token1).digest('hex');
  const startedAt1 = new Date(Date.now() - 4200000); // 70 mins ago
  const endedAt1 = new Date(Date.now() - 600000); // 10 mins ago

  const interview1 = await prisma.interview.create({
    data: {
      interviewerId: interviewer.id,
      candidateName: 'Alex Chen',
      roleTitle: 'Senior Infrastructure Engineer',
      status: 'completed',
      rubricTemplateId: rubric.id,
      startedAt: startedAt1,
      endedAt: endedAt1,
      scheduledAt: new Date(Date.now() - 7200000),
      roomTokenHash: tokenHash1,
      interviewQuestions: {
        create: [
          {
            questionId: q2.id,
            language: 'typescript',
            order: 0,
            startedAt: startedAt1,
            codeRuns: {
              create: [
                {
                  language: 'typescript',
                  sourceSnapshot: `// Candidate initial attempt\nexport class LRUCache {\n  constructor(capacity: number) {}\n}`,
                  results: { status: 'failed', passedCount: 0, totalCount: 1 },
                  requestedAt: new Date(startedAt1.getTime() + 600000),
                  durationMs: 420,
                },
                {
                  language: 'typescript',
                  sourceSnapshot: `// Optimal Doubly Linked List + Map LRU implementation\nexport class LRUCache {\n  private capacity: number;\n  private map: Map<number, number>;\n  constructor(capacity: number) {\n    this.capacity = capacity;\n    this.map = new Map();\n  }\n  get(key: number): number {\n    if (!this.map.has(key)) return -1;\n    const val = this.map.get(key)!;\n    this.map.delete(key);\n    this.map.set(key, val);\n    return val;\n  }\n  put(key: number, value: number): void {\n    if (this.map.has(key)) this.map.delete(key);\n    else if (this.map.size >= this.capacity) {\n      const firstKey = this.map.keys().next().value;\n      this.map.delete(firstKey);\n    }\n    this.map.set(key, value);\n  }\n}`,
                  results: { status: 'passed', passedCount: 1, totalCount: 1 },
                  requestedAt: new Date(startedAt1.getTime() + 1800000),
                  durationMs: 310,
                },
              ],
            },
          },
        ],
      },
      notes: {
        create: [
          {
            bodyMd: 'Candidate immediately clarified concurrency and capacity bounds.',
            offsetMs: 120000,
          },
          {
            bodyMd: 'Articulated O(1) hash map + doubly linked list trade-offs cleanly.',
            offsetMs: 780000,
          },
          {
            bodyMd: 'Working solution verified with comprehensive unit edge cases.',
            offsetMs: 1950000,
          },
        ],
      },
      signals: {
        create: [
          {
            type: 'tab_hidden',
            metadata: {},
            offsetMs: 450000,
          },
          {
            type: 'tab_visible',
            metadata: {},
            offsetMs: 458000,
          },
        ],
      },
      scorecard: {
        create: {
          recommendation: 'strong_hire',
          summaryText:
            'Outstanding systems intuition. Alex proposed the optimal O(1) eviction model immediately and implemented a bug-free LRU Cache in under 30 minutes.',
          submittedAt: endedAt1,
          ratings: {
            create: rubric.criteria.map((c, idx) => ({
              criterionId: c.id,
              rating: idx === 3 ? 3 : 4,
              justification: `High competency demonstrated in ${c.name}.`,
            })),
          },
        },
      },
    },
  });

  // Interview 2: Elena Rostova (Scheduled for tomorrow)
  const token2 = randomBytes(24).toString('base64url');
  const tokenHash2 = createHash('sha256').update(token2).digest('hex');

  const interview2 = await prisma.interview.create({
    data: {
      interviewerId: interviewer.id,
      candidateName: 'Elena Rostova',
      roleTitle: 'Lead Distributed Systems Engineer',
      status: 'scheduled',
      rubricTemplateId: rubric.id,
      scheduledAt: new Date(Date.now() + 86400000), // Tomorrow
      roomTokenHash: tokenHash2,
      interviewQuestions: {
        create: [
          {
            questionId: q1.id,
            language: 'typescript',
            order: 0,
          },
        ],
      },
    },
  });

  console.log(`Seeded demo interviews:`);
  console.log(`1. Completed: ${interview1.candidateName} (ID: ${interview1.id})`);
  console.log(`2. Scheduled: ${interview2.candidateName} (ID: ${interview2.id}) -> Room URL: /room/${interview2.id}?token=${token2}`);

  console.log('Database seeding successfully finished.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
