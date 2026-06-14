import { z } from 'zod';

const companySizeEnum = z.enum(['MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE']);

const addressSchema = z.object({
  street: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
});

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(255),
  domain: z.string().max(255).optional(),
  industry: z.string().max(100).optional(),
  size: companySizeEnum.optional(),
  annualRevenue: z.number().nonnegative().optional(),
  currency: z.string().length(3).toUpperCase().optional(),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().max(5000).optional(),
  address: addressSchema.optional(),
  ownerId: z.string().cuid2().optional(),
  parentAccountId: z.string().cuid2().optional(),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  source: z.string().max(100).optional(),
  customFields: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateAccountSchema = createAccountSchema.partial();

export const accountListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  ownerId: z.string().cuid2().optional(),
  industry: z.string().optional(),
  size: companySizeEnum.optional(),
  tags: z.array(z.string()).optional(),
  q: z.string().max(200).optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type AccountListQuery = z.infer<typeof accountListQuerySchema>;
