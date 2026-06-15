import { z } from 'zod'

export const provisionTenantSchema = z.object({
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(63, 'Slug must be 63 characters or fewer')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only')
    .refine((s) => !s.startsWith('-') && !s.endsWith('-'), 'Slug cannot start or end with a hyphen'),
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(200, 'Display name must be 200 characters or fewer'),
  seedAdminEmail: z.string().email('Must be a valid email address'),
})

export type ProvisionTenantInput = z.infer<typeof provisionTenantSchema>

export const updateTierSchema = z.object({
  tier: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
})

export type UpdateTierInput = z.infer<typeof updateTierSchema>

export const suspendTenantSchema = z.object({
  reason: z.string().max(500).optional(),
})

export type SuspendTenantInput = z.infer<typeof suspendTenantSchema>

export const deactivateTenantSchema = z.object({
  confirm: z.literal(true),
  tenantSlug: z.string(),
})

export type DeactivateTenantInput = z.infer<typeof deactivateTenantSchema>
