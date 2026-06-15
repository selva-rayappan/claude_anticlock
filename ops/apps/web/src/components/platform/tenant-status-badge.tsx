import type { TenantStatus } from '@opsnext/shared'

const styles: Record<TenantStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-amber-100 text-amber-800',
  DEACTIVATED: 'bg-red-100 text-red-800',
}

export function TenantStatusBadge({ status }: { status: TenantStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  )
}
