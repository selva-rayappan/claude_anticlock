'use client'

import { useState } from 'react'
import { useDeactivateTenant } from '@/lib/queries/platform'

interface Props {
  tenantId: string
  tenantSlug: string
  open: boolean
  onClose: () => void
}

export function DeactivateTenantDialog({ tenantId, tenantSlug, open, onClose }: Props) {
  const [confirmSlug, setConfirmSlug] = useState('')
  const { mutateAsync, isPending } = useDeactivateTenant()

  const isMatch = confirmSlug === tenantSlug

  const handleConfirm = async () => {
    if (!isMatch) return
    await mutateAsync({ id: tenantId, tenantSlug })
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-red-700">Deactivate Tenant</h2>
        <p className="mb-4 text-sm text-gray-600">
          This action is <strong>irreversible</strong>. The tenant will be permanently deactivated and
          all active sessions will be terminated.
        </p>
        <p className="mb-2 text-sm">
          Type <code className="rounded bg-gray-100 px-1 font-mono">{tenantSlug}</code> to confirm:
        </p>
        <input
          value={confirmSlug}
          onChange={(e) => setConfirmSlug(e.target.value)}
          placeholder={tenantSlug}
          className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isMatch || isPending}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
          >
            {isPending ? 'Deactivating…' : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>
  )
}
