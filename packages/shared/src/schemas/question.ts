import { z } from 'zod';
import { QUESTION_DIFFICULTIES, SUPPORTED_LANGUAGES } from '../constants.js';

export const TestCaseSchema = z.object({
  id: z.string().uuid().optional(),
  input: z.string(),
  expectedOutput: z.string(),
  isHidden: z.boolean().default(false),
  order: z.number().int().nonnegative().optional(),
});

export type TestCaseInput = z.infer<typeof TestCaseSchema>;

export const QuestionLanguageSchema = z.object({
  id: z.string().uuid().optional(),
  language: z.enum(SUPPORTED_LANGUAGES),
  starterCode: z.string(),
});

export type QuestionLanguageInput = z.infer<typeof QuestionLanguageSchema>;

export const CreateQuestionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title exceeds 200 characters'),
  descriptionMd: z.string().min(1, 'Description is required'),
  difficulty: z.enum(QUESTION_DIFFICULTIES),
  tags: z.array(z.string().min(1).max(50)).default([]),
  languages: z.array(QuestionLanguageSchema).min(1, 'At least one language with starter code is required'),
  testCases: z.array(TestCaseSchema).min(1, 'At least one test case is required'),
});

export type CreateQuestionInput = z.infer<typeof CreateQuestionSchema>;

export const UpdateQuestionSchema = CreateQuestionSchema.partial();

export type UpdateQuestionInput = z.infer<typeof UpdateQuestionSchema>;

export const AttachQuestionSchema = z.object({
  questionId: z.string().uuid('Question ID must be a valid UUID'),
  order: z.number().int().nonnegative().optional(),
  language: z.enum(SUPPORTED_LANGUAGES).default('typescript'),
});

export type AttachQuestionInput = z.infer<typeof AttachQuestionSchema>;

export const ImportQuestionSchema = CreateQuestionSchema;
export type ImportQuestionInput = z.infer<typeof ImportQuestionSchema>;

