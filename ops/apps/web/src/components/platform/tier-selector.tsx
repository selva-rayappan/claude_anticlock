'use client'

import { useState } from 'react'
import { useUpdateTenantTier } from '@/lib/queries/platform'
import type { TierName } from '@opsnext/shared'

const TIERS: TierName[] = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE']

const TIER_LABELS: Record<TierName, string> = {
  STARTER: 'Starter — 5 users, 60 req/min',
  PROFESSIONAL: 'Professional — 25 users, 300 req/min',
  ENTERPRISE: 'Enterprise — Unlimited',
}

interface Props {
  tenantId: string
  currentTier: TierName
}

export function TierSelector({ tenantId, currentTier }: Props) {
  const [selected, setSelected] = useState<TierName>(currentTier)
  const { mutateAsync, isPending } = useUpdateTenantTier()

  const isDowngrade =
    TIERS.indexOf(selected) < TIERS.indexOf(currentTier)

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelected(e.target.value as TierName)
  }

  const handleApply = async () => {
    if (selected === currentTier) return
    if (isDowngrade && !confirm(`Downgrading to ${selected} may block existing users. Continue?`)) return
    await mutateAsync({ id: tenantId, tier: selected })
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={selected}
        onChange={handleChange}
        className="rounded border px-3 py-1.5 text-sm"
      >
        {TIERS.map((t) => (
          <option key={t} value={t}>
            {TIER_LABELS[t]}
            {t === currentTier ? ' (current)' : ''}
          </option>
        ))}
      </select>
      <button
        onClick={handleApply}
        disabled={selected === currentTier || isPending}
        className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
      >
        {isPending ? 'Saving…' : 'Apply'}
      </button>
      {isDowngrade && selected !== currentTier && (
        <span className="text-xs text-amber-600">⚠ Downgrade — existing users may be blocked</span>
      )}
    </div>
  )
}
