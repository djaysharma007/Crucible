import { z } from 'zod';

export const RubricLevelDescriptorsSchema = z.record(z.string(), z.string());

export const RubricCriterionInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Criterion name is required').max(100),
  description: z.string().trim().min(1, 'Criterion description is required').max(1000),
  weight: z.number().positive().default(1.0),
  levelDescriptors: RubricLevelDescriptorsSchema,
});

export type RubricCriterionInput = z.infer<typeof RubricCriterionInputSchema>;

export const CreateRubricTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Template name is required').max(150),
  criteria: z.array(RubricCriterionInputSchema).min(1, 'At least one criterion is required'),
});

export type CreateRubricTemplateInput = z.infer<typeof CreateRubricTemplateSchema>;

export const UpdateRubricTemplateSchema = CreateRubricTemplateSchema.partial();

export type UpdateRubricTemplateInput = z.infer<typeof UpdateRubricTemplateSchema>;

export const AttachRubricSchema = z.object({
  rubricTemplateId: z.string().uuid(),
});

export type AttachRubricInput = z.infer<typeof AttachRubricSchema>;

export interface RubricCriterionItem {
  id: string;
  templateId: string;
  name: string;
  description: string;
  weight: number;
  levelDescriptors: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface RubricTemplateItem {
  id: string;
  ownerId: string;
  name: string;
  criteria: RubricCriterionItem[];
  createdAt: string;
  updatedAt: string;
}
