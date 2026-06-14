export interface Opportunity {
  id: string;
  name: string;
  accountId?: string | null;
  contactId?: string | null;
  pipelineId: string;
  stageId: string;
  ownerId: string;
  value: number;
  currency: string;
  probability: number;
  expectedCloseDate?: Date | null;
  closeReason?: string | null;
  closeNote?: string | null;
  customFields: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CreateOpportunityInput {
  name: string;
  accountId?: string;
  contactId?: string;
  pipelineId: string;
  stageId: string;
  ownerId?: string;
  value?: number;
  currency?: string;
  probability?: number;
  expectedCloseDate?: Date | string;
  customFields?: Record<string, unknown>;
}

export type UpdateOpportunityInput = Partial<CreateOpportunityInput>;

export interface CloseOpportunityInput {
  outcome: 'WON' | 'LOST';
  reason: string;
  note?: string;
}

export interface OpportunityStageHistory {
  id: string;
  opportunityId: string;
  fromStageId?: string | null;
  toStageId: string;
  changedBy: string;
  changedAt: Date;
  durationInPreviousStage?: number | null;
}
