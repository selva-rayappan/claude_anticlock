export type WorkflowTriggerType =
  | 'RECORD_CREATED'
  | 'RECORD_UPDATED'
  | 'STAGE_CHANGED'
  | 'DATE_REACHED'
  | 'TAG_ADDED';

export type WorkflowActionType =
  | 'CREATE_TASK'
  | 'SEND_EMAIL'
  | 'SEND_NOTIFICATION'
  | 'UPDATE_FIELD'
  | 'ASSIGN_OWNER'
  | 'CALL_WEBHOOK';

export type WorkflowExecutionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'SKIPPED';

export interface WorkflowCondition {
  field: string;
  operator:
    | 'eq'
    | 'neq'
    | 'contains'
    | 'starts_with'
    | 'gt'
    | 'lt'
    | 'in'
    | 'between'
    | 'is_null'
    | 'is_not_null';
  value?: unknown;
}

export interface WorkflowAction {
  type: WorkflowActionType;
  config: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  triggerType: WorkflowTriggerType;
  triggerConfig: Record<string, unknown>;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  runCount: number;
  lastRunAt?: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  triggerType: WorkflowTriggerType;
  triggerConfig: Record<string, unknown>;
  conditions?: WorkflowCondition[];
  actions: WorkflowAction[];
}
