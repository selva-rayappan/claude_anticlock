'use client'

import { useState } from 'react'
import { usePlatformTenants } from '@/lib/queries/platform'
import { TenantStatusBadge } from '@/components/platform/tenant-status-badge'
import { ProvisionTenantDialog } from '@/components/platform/provision-tenant-dialog'
import type { TenantStatus } from '@opsnext/shared'

const STATUS_OPTIONS: { label: string; value: TenantStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Suspended', value: 'SUSPENDED' },
  { label: 'Deactivated', value: 'DEACTIVATED' },
]

export default function TenantsPage() {
  const [statusFilter, setStatusFilter] = useState<TenantStatus | ''>('')
  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)

  const { data, isLoading, error } = usePlatformTenants(statusFilter || undefined)
  const tenants = data?.data ?? []

  const filtered = tenants.filter(
    (t) =>
      t.slug.includes(search.toLowerCase()) ||
      t.displayName.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <button
          onClick={() => setShowDialog(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Provision tenant
        </button>
      </div>

      <div className="mb-4 flex items-center gap-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by slug or name…"
          className="rounded border px-3 py-1.5 text-sm w-64"
        />
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value as TenantStatus | '')}
              className={`rounded px-3 py-1 text-xs font-medium ${
                statusFilter === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">Failed to load tenants.</p>}

      {!isLoading && (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Slug</th>
                <th className="px-4 py-3 text-left">Display Name</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Tier</th>
                <th className="px-4 py-3 text-left">Provisioned</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">
                    <a href={`/platform/tenants/${tenant.id}`} className="text-blue-600 hover:underline">
                      {tenant.slug}
                    </a>
                  </td>
                  <td className="px-4 py-3">{tenant.displayName}</td>
                  <td className="px-4 py-3">
                    <TenantStatusBadge status={tenant.status} />
                  </td>
                  <td className="px-4 py-3">{tenant.tier}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(tenant.provisionedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No tenants found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ProvisionTenantDialog open={showDialog} onClose={() => setShowDialog(false)} />
    </div>
  )
}
