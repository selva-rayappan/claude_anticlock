'use client'

import { usePlatformMetrics, usePlatformTenants } from '@/lib/queries/platform'
import { MetricsTable } from '@/components/platform/metrics-table'

export default function MonitoringPage() {
  const { data: metricsData, isLoading: loadingMetrics } = usePlatformMetrics()
  const { data: tenantsData } = usePlatformTenants()

  const tenantNames = Object.fromEntries(
    (tenantsData?.data ?? []).map((t) => [t.id, t.displayName]),
  )

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Resource Monitoring</h1>
      <p className="mb-4 text-sm text-gray-500">Refreshes every 60 seconds automatically.</p>
      {loadingMetrics ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <MetricsTable snapshots={metricsData?.data ?? []} tenantNames={tenantNames} />
      )}
    </div>
  )
}
