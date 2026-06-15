const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: Record<string, unknown> = {};
    try { body = await res.json(); } catch { /* ignore */ }
    const err = (body as { error?: { code?: string; message?: string; details?: unknown } }).error ?? {};
    throw new ApiError(res.status, err.code ?? 'UNKNOWN', err.message ?? res.statusText, err.details);
  }
  if (res.status === 204) {
    return {} as T;
  }
  const text = await res.text();
  if (!text) {
    return {} as T;
  }
  try {
    const json = JSON.parse(text);
    return json.data;
  } catch (e) {
    return {} as T;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };

  if (typeof window !== 'undefined') {
    let slug = '';
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length > 2 && parts[0] !== 'www') {
      slug = parts[0];
    }

    if (!slug) {
      const searchParams = new URLSearchParams(window.location.search);
      const tenantParam = searchParams.get('tenant_id') || searchParams.get('tenant');
      if (tenantParam) {
        slug = tenantParam;
      }
    }

    if (slug) {
      headers['X-Tenant-Slug'] = slug;
    }

    // Retrieve access token from persisted Zustand store
    try {
      const authStore = localStorage.getItem('opsnext-auth');
      if (authStore) {
        const parsed = JSON.parse(authStore);
        const token = parsed?.state?.token;
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  const res = await fetch(url, {
    credentials: 'include',
    headers,
    ...init,
  });
  return handleResponse<T>(res);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// API path helpers
export const paths = {
  auth: {
    login: '/api/v1/auth/login',
    register: '/api/v1/auth/register',
    logout: '/api/v1/auth/logout',
    me: '/api/v1/auth/me',
    forgotPassword: '/api/v1/auth/forgot-password',
    resetPassword: '/api/v1/auth/reset-password',
    refresh: '/api/v1/auth/refresh',
  },
  contacts: {
    list: (q?: string) => `/api/v1/contacts${q ? `?${q}` : ''}`,
    get: (id: string) => `/api/v1/contacts/${id}`,
    create: '/api/v1/contacts',
    update: (id: string) => `/api/v1/contacts/${id}`,
    delete: (id: string) => `/api/v1/contacts/${id}`,
    tags: (id: string) => `/api/v1/contacts/${id}/tags`,
    merge: (id: string) => `/api/v1/contacts/${id}/merge`,
  },
  accounts: {
    list: (q?: string) => `/api/v1/accounts${q ? `?${q}` : ''}`,
    get: (id: string) => `/api/v1/accounts/${id}`,
    create: '/api/v1/accounts',
    update: (id: string) => `/api/v1/accounts/${id}`,
  },
  leads: {
    list: (q?: string) => `/api/v1/leads${q ? `?${q}` : ''}`,
    get: (id: string) => `/api/v1/leads/${id}`,
    create: '/api/v1/leads',
    update: (id: string) => `/api/v1/leads/${id}`,
    convert: (id: string) => `/api/v1/leads/${id}/convert`,
  },
  opportunities: {
    list: (q?: string) => `/api/v1/opportunities${q ? `?${q}` : ''}`,
    get: (id: string) => `/api/v1/opportunities/${id}`,
    create: '/api/v1/opportunities',
    update: (id: string) => `/api/v1/opportunities/${id}`,
    close: (id: string) => `/api/v1/opportunities/${id}/close`,
    stage: (id: string) => `/api/v1/opportunities/${id}/stage`,
  },
  pipelines: {
    list: '/api/v1/pipelines',
    board: (id: string) => `/api/v1/pipelines/${id}/board`,
    summary: (id: string) => `/api/v1/pipelines/${id}/summary`,
    create: '/api/v1/pipelines',
  },
  activities: {
    list: (type: string, id: string) => `/api/v1/activities/entity/${type}/${id}`,
    create: '/api/v1/activities',
    update: (id: string) => `/api/v1/activities/${id}`,
    delete: (id: string) => `/api/v1/activities/${id}`,
  },
  tasks: {
    list: (view?: string) => `/api/v1/tasks${view ? `?view=${view}` : ''}`,
    create: '/api/v1/tasks',
    update: (id: string) => `/api/v1/tasks/${id}`,
    delete: (id: string) => `/api/v1/tasks/${id}`,
  },
  notifications: {
    list: '/api/v1/notifications',
    readAll: '/api/v1/notifications/read-all',
    read: (id: string) => `/api/v1/notifications/${id}/read`,
    stream: '/api/v1/notifications/stream',
  },
  reports: {
    salesOverview: '/api/v1/reports/sales-overview',
    pipelineSummary: '/api/v1/reports/pipeline-summary',
    leadFunnel: '/api/v1/reports/lead-funnel',
    winLoss: '/api/v1/reports/win-loss',
  },
  search: (q: string) => `/api/v1/search?q=${encodeURIComponent(q)}`,
  admin: {
    users: '/api/v1/admin/users',
    inviteUser: '/api/v1/admin/users/invite',
    userStatus: (id: string) => `/api/v1/admin/users/${id}/status`,
    userRoles: (id: string) => `/api/v1/admin/users/${id}/roles`,
    customFields: '/api/v1/admin/custom-fields',
    auditLogs: '/api/v1/admin/audit-logs',
    apiKeys: '/api/v1/admin/api-keys',
  },
  tenant: {
    me: '/api/v1/platform/tenants/me',
    branding: '/api/v1/platform/tenants/me/branding',
    checkSlug: (slug: string) => `/api/v1/platform/tenants/check-slug?slug=${slug}`,
    register: '/api/v1/platform/tenants/register',
  },
} as const;
