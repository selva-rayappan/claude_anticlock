import { z } from 'zod';

const phoneEntrySchema = z.object({
  type: z.enum(['mobile', 'work', 'home', 'other']),
  number: z.string().min(1).max(30),
  primary: z.boolean().optional(),
});

const addressSchema = z.object({
  street: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
});

const socialHandlesSchema = z.object({
  linkedin: z.string().url().optional().or(z.literal('')),
  twitter: z.string().max(100).optional(),
  github: z.string().max(100).optional(),
});

export const createContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address').toLowerCase(),
  phones: z.array(phoneEntrySchema).max(10).optional().default([]),
  title: z.string().max(150).optional(),
  accountId: z.string().cuid2().optional(),
  ownerId: z.string().cuid2().optional(),
  address: addressSchema.optional(),
  socialHandles: socialHandlesSchema.optional(),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  source: z.string().max(100).optional(),
  leadSource: z.string().max(100).optional(),
  customFields: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateContactSchema = createContactSchema.partial().omit({ email: true }).extend({
  email: z.string().email().toLowerCase().optional(),
});

export const contactListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.enum(['firstName', 'lastName', 'email', 'createdAt', 'updatedAt']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  accountId: z.string().cuid2().optional(),
  ownerId: z.string().cuid2().optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  q: z.string().max(200).optional(),
  segmentId: z.string().cuid2().optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ContactListQuery = z.infer<typeof contactListQuerySchema>;
