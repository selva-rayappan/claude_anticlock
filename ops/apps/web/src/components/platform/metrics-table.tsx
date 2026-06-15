'use client'

import { useState } from 'react'
import type { TenantMetricsSnapshot } from '@opsnext/shared'

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${(bytes / 1073741824).toFixed(2)} GB`
}

type SortKey = keyof Pick<
  TenantMetricsSnapshot,
  'activeUserCount' | 'totalRecordCount' | 'apiCallCount30d' | 'storageBytes'
>

interface Props {
  snapshots: TenantMetricsSnapshot[]
  tenantNames: Record<string, string>
}

export function MetricsTable({ snapshots, tenantNames }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('totalRecordCount')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const toggle = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...snapshots].sort((a, b) => {
    const diff = Number(a[sortKey]) - Number(b[sortKey])
    return sortDir === 'asc' ? diff : -diff
  })

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : null

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3 text-left">Tenant</th>
            <th className="cursor-pointer px-4 py-3 text-right" onClick={() => toggle('activeUserCount')}>
              Users<SortIcon col="activeUserCount" />
            </th>
            <th className="cursor-pointer px-4 py-3 text-right" onClick={() => toggle('totalRecordCount')}>
              Records<SortIcon col="totalRecordCount" />
            </th>
            <th className="cursor-pointer px-4 py-3 text-right" onClick={() => toggle('apiCallCount30d')}>
              API Calls (30d)<SortIcon col="apiCallCount30d" />
            </th>
            <th className="cursor-pointer px-4 py-3 text-right" onClick={() => toggle('storageBytes')}>
              Storage<SortIcon col="storageBytes" />
            </th>
            <th className="px-4 py-3 text-right">Snapshot</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sorted.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{tenantNames[s.tenantId] ?? s.tenantId}</td>
              <td className="px-4 py-3 text-right">{s.activeUserCount.toLocaleString()}</td>
              <td className="px-4 py-3 text-right">{s.totalRecordCount.toLocaleString()}</td>
              <td className="px-4 py-3 text-right">{s.apiCallCount30d.toLocaleString()}</td>
              <td className="px-4 py-3 text-right">{formatBytes(s.storageBytes)}</td>
              <td className="px-4 py-3 text-right text-gray-400 text-xs">
                {new Date(s.snapshotAt).toLocaleString()}
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                No metrics data available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
