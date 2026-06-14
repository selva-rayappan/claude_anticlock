export type SubscriptionTier = 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  subscriptionTier: SubscriptionTier;
  schemaName: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface TenantConfig {
  id: string;
  tenantId: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  timezone: string;
  currency: string;
  language: string;
  dateFormat: string;
  featureFlags: Record<string, boolean>;
}

export interface CreateTenantInput {
  name: string;
  slug?: string;
  industry?: string;
  size?: string;
  timezone?: string;
  currency?: string;
  language?: string;
  subscriptionTier?: SubscriptionTier;
}
