import { describe, it, expect } from 'vitest';
import { RegisterSchema, LoginSchema } from './schemas/auth.js';
import { CreateInterviewSchema } from './schemas/interview.js';
import { RunCodeSchema } from './schemas/execution.js';
import { SubmitScorecardSchema } from './schemas/scorecard.js';
import { CreateRubricTemplateSchema } from './schemas/rubric.js';
import { CreateNoteSchema } from './schemas/notes.js';

describe('Shared Schemas Validation', () => {
  it('validates registration input correctly', () => {
    const valid = RegisterSchema.safeParse({
      email: 'interviewer@example.com',
      password: 'password123',
      displayName: 'Alex Smith',
    });
    expect(valid.success).toBe(true);

    const invalid = RegisterSchema.safeParse({
      email: 'not-an-email',
      password: 'short',
      displayName: '',
    });
    expect(invalid.success).toBe(false);
  });

  it('validates login input', () => {
    expect(LoginSchema.safeParse({ email: 'test@example.com', password: 'pass' }).success).toBe(
      true,
    );
    expect(LoginSchema.safeParse({ email: 'invalid', password: '' }).success).toBe(false);
  });

  it('validates interview creation', () => {
    const valid = CreateInterviewSchema.safeParse({
      candidateName: 'Jane Doe',
      roleTitle: 'Senior Backend Engineer',
    });
    expect(valid.success).toBe(true);
  });

  it('validates code execution inputs', () => {
    const valid = RunCodeSchema.safeParse({
      language: 'python',
      sourceCode: 'print("hello world")',
    });
    expect(valid.success).toBe(true);

    const invalidLang = RunCodeSchema.safeParse({
      language: 'ruby',
      sourceCode: 'puts "hello"',
    });
    expect(invalidLang.success).toBe(false);
  });

  it('validates scorecard submission', () => {
    const valid = SubmitScorecardSchema.safeParse({
      recommendation: 'strong_hire',
      summaryText: 'Excellent problem solving ability.',
      ratings: [
        {
          criterionId: '123e4567-e89b-12d3-a456-426614174000',
          rating: 5,
          justification: 'Clear communication and optimal algorithm.',
        },
      ],
    });
    expect(valid.success).toBe(true);
  });

  it('validates rubric template creation', () => {
    const valid = CreateRubricTemplateSchema.safeParse({
      name: 'Core Software Engineering Rubric',
      criteria: [
        {
          name: 'Problem Solving',
          description: 'Ability to break down problems',
          weight: 1.0,
          levelDescriptors: {
            '1': 'Struggled to understand',
            '4': 'Optimal approach quickly identified',
          },
        },
      ],
    });
    expect(valid.success).toBe(true);

    const invalid = CreateRubricTemplateSchema.safeParse({
      name: '',
      criteria: [],
    });
    expect(invalid.success).toBe(false);
  });

  it('validates note creation', () => {
    const valid = CreateNoteSchema.safeParse({
      bodyMd: 'Candidate quickly identified the two-pointer approach.',
      offsetMs: 125000,
    });
    expect(valid.success).toBe(true);

    const validAutoOffset = CreateNoteSchema.safeParse({
      bodyMd: 'Note with auto-computed offset.',
    });
    expect(validAutoOffset.success).toBe(true);

    const empty = CreateNoteSchema.safeParse({
      bodyMd: '',
    });
    expect(empty.success).toBe(false);
  });
});
