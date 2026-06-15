import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, paths } from '@/lib/api'
import type { Tenant, TenantMetricsSnapshot, DataExportJob } from '@opsnext/shared'

// ─── Query keys ────────────────────────────────────────────────────────────────

export const platformKeys = {
  tenants: (status?: string) => ['platform', 'tenants', status] as const,
  tenant: (id: string) => ['platform', 'tenant', id] as const,
  metrics: () => ['platform', 'metrics'] as const,
  tenantMetrics: (id: string) => ['platform', 'tenant', id, 'metrics'] as const,
  exportJob: (tenantId: string, jobId: string) =>
    ['platform', 'export', tenantId, jobId] as const,
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function usePlatformTenants(status?: string) {
  return useQuery({
    queryKey: platformKeys.tenants(status),
    queryFn: async (): Promise<{ data: Tenant[]; meta: { total: number } }> => {
      const url = status
        ? `${paths.platform.tenants}?status=${status}`
        : paths.platform.tenants
      const res = await api.get(url)
      if (!res.ok) throw new Error('Failed to fetch tenants')
      return res.json()
    },
  })
}

export function useTenant(id: string) {
  return useQuery({
    queryKey: platformKeys.tenant(id),
    queryFn: async (): Promise<{ data: Tenant }> => {
      const res = await api.get(paths.platform.tenant(id))
      if (!res.ok) throw new Error('Failed to fetch tenant')
      return res.json()
    },
    enabled: !!id,
  })
}

export function usePlatformMetrics() {
  return useQuery({
    queryKey: platformKeys.metrics(),
    queryFn: async (): Promise<{ data: TenantMetricsSnapshot[] }> => {
      const res = await api.get(paths.platform.metrics)
      if (!res.ok) throw new Error('Failed to fetch metrics')
      return res.json()
    },
    refetchInterval: 60_000,
  })
}

export function useTenantMetrics(id: string) {
  return useQuery({
    queryKey: platformKeys.tenantMetrics(id),
    queryFn: async (): Promise<{ data: TenantMetricsSnapshot }> => {
      const res = await api.get(paths.platform.tenantMetrics(id))
      if (!res.ok) throw new Error('Failed to fetch tenant metrics')
      return res.json()
    },
    enabled: !!id,
  })
}

export function useExportJobStatus(tenantId: string, jobId: string | null) {
  return useQuery({
    queryKey: platformKeys.exportJob(tenantId, jobId ?? ''),
    queryFn: async (): Promise<{ data: DataExportJob }> => {
      const res = await api.get(paths.platform.exportStatus(tenantId, jobId!))
      if (!res.ok) throw new Error('Failed to fetch export job')
      return res.json()
    },
    enabled: !!tenantId && !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status
      return status === 'PENDING' || status === 'RUNNING' ? 5_000 : false
    },
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useProvisionTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { slug: string; displayName: string; seedAdminEmail: string }) => {
      const res = await api.post(paths.platform.provision, body)
      if (!res.ok) {
        const err = await res.json()
        throw err
      }
      return res.json() as Promise<{ data: Tenant }>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform', 'tenants'] }),
  })
}

export function useSuspendTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await api.post(paths.platform.suspend(id), { reason })
      if (!res.ok) throw new Error('Failed to suspend tenant')
      return res.json()
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: platformKeys.tenant(id) })
      qc.invalidateQueries({ queryKey: ['platform', 'tenants'] })
    },
  })
}

export function useReactivateTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(paths.platform.reactivate(id), {})
      if (!res.ok) throw new Error('Failed to reactivate tenant')
      return res.json()
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: platformKeys.tenant(id) })
      qc.invalidateQueries({ queryKey: ['platform', 'tenants'] })
    },
  })
}

export function useDeactivateTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, tenantSlug }: { id: string; tenantSlug: string }) => {
      const res = await api.post(paths.platform.deactivate(id), {
        confirm: true,
        tenantSlug,
      })
      if (!res.ok) throw new Error('Failed to deactivate tenant')
      return res.json()
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: platformKeys.tenant(id) })
      qc.invalidateQueries({ queryKey: ['platform', 'tenants'] })
    },
  })
}

export function useUpdateTenantTier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, tier }: { id: string; tier: string }) => {
      const res = await api.put(paths.platform.updateTier(id), { tier })
      if (!res.ok) throw new Error('Failed to update tier')
      return res.json()
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: platformKeys.tenant(id) })
      qc.invalidateQueries({ queryKey: ['platform', 'tenants'] })
    },
  })
}

export function useTriggerExport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (tenantId: string) => {
      const res = await api.post(paths.platform.triggerExport(tenantId), {})
      if (!res.ok) throw new Error('Failed to trigger export')
      return res.json() as Promise<{ data: { jobId: string } }>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform', 'export'] }),
  })
}
