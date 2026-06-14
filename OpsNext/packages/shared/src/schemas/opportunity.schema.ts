import { z } from 'zod';

export const createOpportunitySchema = z.object({
  name: z.string().min(1, 'Opportunity name is required').max(255),
  accountId: z.string().cuid2().optional(),
  contactId: z.string().cuid2().optional(),
  pipelineId: z.string().cuid2(),
  stageId: z.string().cuid2(),
  ownerId: z.string().cuid2().optional(),
  value: z.number().nonnegative().default(0),
  currency: z.string().length(3).toUpperCase().default('USD'),
  probability: z.number().int().min(0).max(100).optional(),
  expectedCloseDate: z.coerce.date().optional(),
  customFields: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateOpportunitySchema = createOpportunitySchema.partial();

export const closeOpportunitySchema = z.object({
  outcome: z.enum(['WON', 'LOST']),
  reason: z.string().min(1, 'Close reason is required').max(500),
  note: z.string().max(2000).optional(),
});

export const opportunityListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.enum(['name', 'value', 'expectedCloseDate', 'createdAt', 'updatedAt']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  pipelineId: z.string().cuid2().optional(),
  stageId: z.string().cuid2().optional(),
  ownerId: z.string().cuid2().optional(),
  accountId: z.string().cuid2().optional(),
  closeDateFrom: z.coerce.date().optional(),
  closeDateTo: z.coerce.date().optional(),
  minValue: z.coerce.number().nonnegative().optional(),
  maxValue: z.coerce.number().nonnegative().optional(),
  q: z.string().max(200).optional(),
});

export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;
export type CloseOpportunityInput = z.infer<typeof closeOpportunitySchema>;
export type OpportunityListQuery = z.infer<typeof opportunityListQuerySchema>;
