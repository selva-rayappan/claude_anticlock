'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useTenant, useSuspendTenant, useReactivateTenant } from '@/lib/queries/platform'
import { TenantStatusBadge } from '@/components/platform/tenant-status-badge'
import { TierSelector } from '@/components/platform/tier-selector'
import { DeactivateTenantDialog } from '@/components/platform/deactivate-tenant-dialog'
import { ExportPanel } from '@/components/platform/export-panel'

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading } = useTenant(id)
  const tenant = data?.data

  const suspend = useSuspendTenant()
  const reactivate = useReactivateTenant()
  const [showDeactivate, setShowDeactivate] = useState(false)

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>
  if (!tenant) return <p className="text-sm text-red-600">Tenant not found.</p>

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{tenant.displayName}</h1>
          <p className="font-mono text-sm text-gray-500">{tenant.slug}</p>
        </div>
        <TenantStatusBadge status={tenant.status} />
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Details</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <dt className="text-gray-500">Provisioned</dt>
          <dd>{new Date(tenant.provisionedAt).toLocaleString()}</dd>
          <dt className="text-gray-500">Seed Admin</dt>
          <dd>{tenant.seedAdminEmail}</dd>
          {tenant.suspendedAt && (
            <>
              <dt className="text-gray-500">Suspended</dt>
              <dd>{new Date(tenant.suspendedAt).toLocaleString()}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Tier</h2>
        <TierSelector tenantId={tenant.id} currentTier={tenant.tier} />
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Actions</h2>
        <div className="flex flex-wrap gap-2">
          {tenant.status === 'ACTIVE' && (
            <button
              onClick={() => suspend.mutate({ id: tenant.id })}
              disabled={suspend.isPending}
              className="rounded border border-amber-400 bg-amber-50 px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-100 disabled:opacity-50"
            >
              Suspend
            </button>
          )}
          {tenant.status === 'SUSPENDED' && (
            <button
              onClick={() => reactivate.mutate(tenant.id)}
              disabled={reactivate.isPending}
              className="rounded border border-green-400 bg-green-50 px-3 py-1.5 text-sm text-green-800 hover:bg-green-100 disabled:opacity-50"
            >
              Reactivate
            </button>
          )}
          {tenant.status !== 'DEACTIVATED' && (
            <button
              onClick={() => setShowDeactivate(true)}
              className="rounded border border-red-400 bg-red-50 px-3 py-1.5 text-sm text-red-800 hover:bg-red-100"
            >
              Deactivate…
            </button>
          )}
        </div>
      </div>

      <ExportPanel tenantId={tenant.id} />

      <DeactivateTenantDialog
        tenantId={tenant.id}
        tenantSlug={tenant.slug}
        open={showDeactivate}
        onClose={() => setShowDeactivate(false)}
      />
    </div>
  )
}
