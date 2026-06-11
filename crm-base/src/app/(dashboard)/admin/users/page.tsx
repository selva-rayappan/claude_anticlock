export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getUsers } from '@/app/actions/users'
import { UsersTable } from '@/components/admin/UsersTable'

const roleBadge: Record<string, string> = {
  ADMIN:   'bg-indigo-100 text-indigo-700',
  MANAGER: 'bg-amber-100 text-amber-700',
  USER:    'bg-slate-100 text-slate-600',
}

export default async function AdminUsersPage() {
  const session = await getSession()
  if (session?.role !== 'ADMIN') redirect('/')

  const users = await getUsers()

  const counts = {
    total:   users.length,
    admins:  users.filter(u => u.role === 'ADMIN').length,
    managers: users.filter(u => u.role === 'MANAGER').length,
    regular: users.filter(u => u.role === 'USER').length,
  }

  return (
    <div className="px-4 sm:px-8 py-6 max-w-6xl mx-auto w-full">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-slate-800 leading-tight">User Management</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Manage accounts and assign roles across your workspace.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Users', value: counts.total,    color: 'text-slate-700' },
          { label: 'Admins',      value: counts.admins,   color: 'text-indigo-600' },
          { label: 'Managers',    value: counts.managers, color: 'text-amber-600' },
          { label: 'Users',       value: counts.regular,  color: 'text-slate-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[12px] text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Role legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {(['ADMIN', 'MANAGER', 'USER'] as const).map(role => (
          <div key={role} className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${roleBadge[role]}`}>{role}</span>
            <span className="text-[12px] text-slate-500">
              {role === 'ADMIN'   && 'Full access — manage users and all data'}
              {role === 'MANAGER' && 'Can manage contacts and deals'}
              {role === 'USER'    && 'View-only access'}
            </span>
          </div>
        ))}
      </div>

      {/* Table */}
      <UsersTable users={users} currentUserId={session.sub} />
    </div>
  )
}
