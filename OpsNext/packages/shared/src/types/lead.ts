export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'UNQUALIFIED' | 'CONVERTED';

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  source?: string | null;
  status: LeadStatus;
  ownerId: string;
  score: number;
  convertedAt?: Date | null;
  convertedToContactId?: string | null;
  convertedToAccountId?: string | null;
  convertedToOpportunityId?: string | null;
  customFields: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CreateLeadInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  status?: LeadStatus;
  ownerId?: string;
  customFields?: Record<string, unknown>;
}

export type UpdateLeadInput = Partial<CreateLeadInput>;

export interface ConvertLeadInput {
  createContact: boolean;
  createAccount: boolean;
  createOpportunity: boolean;
  opportunityName?: string;
  opportunityValue?: number;
  pipelineId?: string;
  stageId?: string;
}
