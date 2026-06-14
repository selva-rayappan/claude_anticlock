export type NotificationType =
  | 'TASK_DUE'
  | 'DEAL_STAGE_CHANGED'
  | 'NEW_ASSIGNMENT'
  | 'MENTION'
  | 'WORKFLOW_TRIGGERED'
  | 'IMPORT_COMPLETE'
  | 'STALE_DEAL'
  | 'SYSTEM_ALERT';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt?: Date | null;
  createdAt: Date;
}
