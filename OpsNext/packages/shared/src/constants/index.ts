export const BUILT_IN_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  SALES_MANAGER: 'SALES_MANAGER',
  SALES_REP: 'SALES_REP',
  READ_ONLY: 'READ_ONLY',
} as const;

export const DEFAULT_PIPELINE_STAGES = [
  { name: 'Prospecting', displayOrder: 0, probability: 10, isClosed: false, isWon: false },
  { name: 'Qualification', displayOrder: 1, probability: 25, isClosed: false, isWon: false },
  { name: 'Proposal', displayOrder: 2, probability: 50, isClosed: false, isWon: false },
  { name: 'Negotiation', displayOrder: 3, probability: 75, isClosed: false, isWon: false },
  { name: 'Closed Won', displayOrder: 4, probability: 100, isClosed: true, isWon: true },
  { name: 'Closed Lost', displayOrder: 5, probability: 0, isClosed: true, isWon: false },
] as const;

export const RESERVED_SLUGS = new Set([
  'admin', 'api', 'app', 'www', 'mail', 'smtp', 'static', 'assets',
  'platform', 'dashboard', 'auth', 'login', 'signup', 'register',
  'support', 'help', 'docs', 'blog', 'status', 'health', 'metrics',
  'opsnext', 'system', 'root', 'public', 'private',
]);

export const SUBSCRIPTION_LIMITS = {
  BASIC: {
    users: 5,
    contacts: 10_000,
    apiCallsPerMonth: 50_000,
    storageGB: 1,
    customFields: 20,
    pipelines: 1,
    workflows: 5,
  },
  PROFESSIONAL: {
    users: 25,
    contacts: 100_000,
    apiCallsPerMonth: 500_000,
    storageGB: 10,
    customFields: 50,
    pipelines: 5,
    workflows: 25,
  },
  ENTERPRISE: {
    users: Infinity,
    contacts: Infinity,
    apiCallsPerMonth: Infinity,
    storageGB: 100,
    customFields: 200,
    pipelines: Infinity,
    workflows: Infinity,
  },
} as const;

export const RATE_LIMITS = {
  BASIC: { requestsPerMinute: 500 },
  PROFESSIONAL: { requestsPerMinute: 2000 },
  ENTERPRISE: { requestsPerMinute: 5000 },
} as const;

export const MAX_IMPORT_FILE_SIZE_MB = 50;
export const MAX_ATTACHMENT_SIZE_MB = 25;
export const MAX_BULK_OPERATION_SIZE = 100;
export const MAX_EXPORT_ROWS = 100_000;
export const MAX_PINNED_NOTES = 3;
export const STALE_DEAL_DAYS_DEFAULT = 30;
export const JWT_ACCESS_TOKEN_EXPIRY = '8h';
export const JWT_REFRESH_TOKEN_EXPIRY_DAYS = 30;
export const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;
export const PASSWORD_RESET_EXPIRY_MINUTES = 30;
export const ACCOUNT_LOCKOUT_ATTEMPTS = 5;
export const ACCOUNT_LOCKOUT_DURATION_MINUTES = 15;
