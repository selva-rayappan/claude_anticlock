import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .refine((p) => /[A-Z]/.test(p), 'Password must contain at least one uppercase letter')
  .refine((p) => /[0-9]/.test(p), 'Password must contain at least one number')
  .refine((p) => /[^A-Za-z0-9]/.test(p), 'Password must contain at least one special character');

export const registerSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: passwordSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const mfaVerifySchema = z.object({
  code: z.string().length(6).regex(/^\d+$/, 'MFA code must be 6 digits'),
});

export const mfaBackupSchema = z.object({
  code: z.string().min(8).max(16),
});

export const tenantRegisterSchema = z.object({
  orgName: z.string().min(2, 'Organisation name is required').max(100),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only')
    .optional(),
  industry: z.string().max(100).optional(),
  size: z.enum(['MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE']).optional(),
  timezone: z.string().default('UTC'),
  currency: z.string().length(3).toUpperCase().default('USD'),
  language: z.string().default('en'),
  adminEmail: z.string().email().toLowerCase(),
  adminPassword: passwordSchema,
  adminFirstName: z.string().min(1).max(100),
  adminLastName: z.string().min(1).max(100),
  plan: z.enum(['BASIC', 'PROFESSIONAL', 'ENTERPRISE']).default('BASIC'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;
export type TenantRegisterInput = z.infer<typeof tenantRegisterSchema>;
