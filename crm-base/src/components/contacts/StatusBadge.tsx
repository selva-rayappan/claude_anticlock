type Status = 'LEAD' | 'ACTIVE' | 'CUSTOMER' | 'INACTIVE'

const config: Record<Status, { label: string; cls: string }> = {
  LEAD:     { label: 'Lead',     cls: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  ACTIVE:   { label: 'Active',   cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  CUSTOMER: { label: 'Customer', cls: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20' },
  INACTIVE: { label: 'Inactive', cls: 'bg-slate-100 text-slate-500 ring-slate-200' },
}

export function StatusBadge({ status }: { status: string }) {
  const c = config[status as Status] ?? config.INACTIVE
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${c.cls}`}>
      {c.label}
    </span>
  )
}
