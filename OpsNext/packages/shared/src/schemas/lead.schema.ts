import { z } from 'zod';

export const leadStatusEnum = z.enum([
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'UNQUALIFIED',
  'CONVERTED',
]);

export const createLeadSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email().toLowerCase().optional(),
  phone: z.string().max(30).optional(),
  company: z.string().max(255).optional(),
  source: z.string().max(100).optional(),
  status: leadStatusEnum.default('NEW'),
  ownerId: z.string().cuid2().optional(),
  customFields: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateLeadSchema = createLeadSchema.partial();

export const convertLeadSchema = z.object({
  createContact: z.boolean(),
  createAccount: z.boolean(),
  createOpportunity: z.boolean(),
  opportunityName: z.string().max(255).optional(),
  opportunityValue: z.number().nonnegative().optional(),
  pipelineId: z.string().cuid2().optional(),
  stageId: z.string().cuid2().optional(),
});

export const leadListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.enum(['firstName', 'lastName', 'score', 'createdAt', 'updatedAt']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  status: leadStatusEnum.optional(),
  ownerId: z.string().cuid2().optional(),
  q: z.string().max(200).optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  maxScore: z.coerce.number().int().min(0).max(100).optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;
export type LeadListQuery = z.infer<typeof leadListQuerySchema>;
