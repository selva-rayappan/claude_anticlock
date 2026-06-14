export interface PhoneEntry {
  type: 'mobile' | 'work' | 'home' | 'other';
  number: string;
  primary?: boolean;
}

export interface SocialHandles {
  linkedin?: string;
  twitter?: string;
  github?: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phones: PhoneEntry[];
  title?: string | null;
  accountId?: string | null;
  ownerId: string;
  address?: Address | null;
  socialHandles?: SocialHandles | null;
  tags: string[];
  source?: string | null;
  leadSource?: string | null;
  customFields: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CreateContactInput {
  firstName: string;
  lastName: string;
  email: string;
  phones?: PhoneEntry[];
  title?: string;
  accountId?: string;
  ownerId?: string;
  address?: Address;
  socialHandles?: SocialHandles;
  tags?: string[];
  source?: string;
  leadSource?: string;
  customFields?: Record<string, unknown>;
}

export type UpdateContactInput = Partial<CreateContactInput>;
