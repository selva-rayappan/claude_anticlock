export type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'TASK';
export type EntityType = 'CONTACT' | 'ACCOUNT' | 'LEAD' | 'OPPORTUNITY';

export interface ActivityParticipant {
  userId?: string;
  name: string;
  email?: string;
}

export interface ActivityAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  uploadedAt: Date;
}

export interface Activity {
  id: string;
  type: ActivityType;
  entityType: EntityType;
  entityId: string;
  subject: string;
  body?: string | null;
  outcome?: string | null;
  durationMinutes?: number | null;
  scheduledAt?: Date | null;
  completedAt?: Date | null;
  participants: ActivityParticipant[];
  attachments: ActivityAttachment[];
  ownerId: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateActivityInput {
  type: ActivityType;
  entityType: EntityType;
  entityId: string;
  subject: string;
  body?: string;
  outcome?: string;
  durationMinutes?: number;
  scheduledAt?: Date | string;
  completedAt?: Date | string;
  participants?: ActivityParticipant[];
  pinned?: boolean;
}
