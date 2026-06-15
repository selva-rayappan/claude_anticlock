const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

export const api = {
  get: (path: string, init?: RequestInit) =>
    fetch(`${BASE}${path}`, { ...init, credentials: 'include' }),
  post: (path: string, body: unknown, init?: RequestInit) =>
    fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
      ...init,
    }),
  put: (path: string, body: unknown, init?: RequestInit) =>
    fetch(`${BASE}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
      ...init,
    }),
  delete: (path: string, init?: RequestInit) =>
    fetch(`${BASE}${path}`, { method: 'DELETE', credentials: 'include', ...init }),
}

export const paths = {
  auth: {
    login: '/api/v1/auth/login',
    logout: '/api/v1/auth/logout',
    refresh: '/api/v1/auth/refresh',
    me: '/api/v1/auth/me',
  },
  platform: {
    tenants: '/api/v1/platform/tenants',
    tenant: (id: string) => `/api/v1/platform/tenants/${id}`,
    provision: '/api/v1/platform/tenants',
    suspend: (id: string) => `/api/v1/platform/tenants/${id}/suspend`,
    reactivate: (id: string) => `/api/v1/platform/tenants/${id}/reactivate`,
    deactivate: (id: string) => `/api/v1/platform/tenants/${id}/deactivate`,
    updateTier: (id: string) => `/api/v1/platform/tenants/${id}/tier`,
    metrics: '/api/v1/platform/metrics',
    tenantMetrics: (id: string) => `/api/v1/platform/tenants/${id}/metrics`,
    triggerExport: (id: string) => `/api/v1/platform/tenants/${id}/export`,
    exportStatus: (id: string, jobId: string) =>
      `/api/v1/platform/tenants/${id}/export/${jobId}`,
  },
}
