import type { Address } from './contact.js';

export type CompanySize = 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';

export interface Account {
  id: string;
  name: string;
  domain?: string | null;
  industry?: string | null;
  size?: CompanySize | null;
  annualRevenue?: number | null;
  currency?: string | null;
  website?: string | null;
  description?: string | null;
  address?: Address | null;
  ownerId: string;
  parentAccountId?: string | null;
  tags: string[];
  source?: string | null;
  customFields: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CreateAccountInput {
  name: string;
  domain?: string;
  industry?: string;
  size?: CompanySize;
  annualRevenue?: number;
  currency?: string;
  website?: string;
  description?: string;
  address?: Address;
  ownerId?: string;
  parentAccountId?: string;
  tags?: string[];
  source?: string;
  customFields?: Record<string, unknown>;
}

export type UpdateAccountInput = Partial<CreateAccountInput>;
