export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'

export type TierName = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'

export type ExportStatus = 'PENDING' | 'RUNNING' | 'COMPLETE' | 'FAILED'

export interface Tenant {
  id: string
  slug: string
  displayName: string
  status: TenantStatus
  tier: TierName
  seedAdminEmail: string
  provisionedAt: string
  suspendedAt: string | null
  deactivatedAt: string | null
}

export interface TierDefinition {
  name: TierName
  maxUsers: number
  maxCustomFields: number
  apiRateLimitPerMinute: number
  featureFlags: string[]
}

export interface TenantMetricsSnapshot {
  id: string
  tenantId: string
  activeUserCount: number
  totalRecordCount: number
  apiCallCount30d: number
  storageBytes: number
  snapshotAt: string
}

export interface DataExportJob {
  id: string
  tenantId: string
  status: ExportStatus
  downloadUrl: string | null
  expiresAt: string | null
  triggeredBy: string | null
  triggeredAt: string
  completedAt: string | null
  errorMessage: string | null
}
