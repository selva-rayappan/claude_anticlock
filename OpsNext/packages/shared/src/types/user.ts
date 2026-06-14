export type UserStatus = 'ACTIVE' | 'INVITED' | 'DEACTIVATED';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  status: UserStatus;
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithRoles extends User {
  roles: string[];
}

export type ResourceType =
  | 'CONTACT'
  | 'ACCOUNT'
  | 'LEAD'
  | 'OPPORTUNITY'
  | 'PIPELINE'
  | 'REPORT'
  | 'WORKFLOW'
  | 'USER'
  | 'SETTING';

export type ActionType = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXPORT';
export type ScopeType = 'ALL' | 'OWN';

export interface Permission {
  id: string;
  resource: ResourceType;
  action: ActionType;
  scope: ScopeType;
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissions: Permission[];
  createdAt: Date;
}

export type BuiltInRole =
  | 'SUPER_ADMIN'
  | 'TENANT_ADMIN'
  | 'SALES_MANAGER'
  | 'SALES_REP'
  | 'READ_ONLY';
