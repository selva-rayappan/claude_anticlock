'use client'

import { useState, useTransition } from 'react'
import { updateUserRole, deleteUser } from '@/app/actions/users'

type User = {
  id: string
  name: string
  email: string
  role: string
  provider: string
  createdAt: Date
}

const ROLES = ['ADMIN', 'MANAGER', 'USER'] as const

const roleColors: Record<string, string> = {
  ADMIN:   'bg-indigo-500/15 text-indigo-300 border-indigo-500/25',
  MANAGER: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  USER:    'bg-slate-500/15 text-slate-400 border-slate-500/25',
}

const providerColors: Record<string, string> = {
  credentials: 'bg-slate-700/50 text-slate-400',
  google:      'bg-blue-500/10 text-blue-400',
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function avatarColor(id: string) {
  const colors = ['bg-indigo-500', 'bg-violet-500', 'bg-pink-500', 'bg-amber-500', 'bg-teal-500', 'bg-cyan-500']
  const idx = id.charCodeAt(0) % colors.length
  return colors[idx]
}

export function UsersTable({ users: initial, currentUserId }: { users: User[]; currentUserId: string }) {
  const [users, setUsers]       = useState(initial)
  const [pending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)

  function handleRoleChange(userId: string, role: string) {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
    startTransition(async () => {
      try {
        await updateUserRole(userId, role)
      } catch {
        setError('Failed to update role.')
        // revert
        setUsers(initial)
      }
    })
  }

  function handleDelete(userId: string) {
    setDeletingId(userId)
  }

  function confirmDelete(userId: string) {
    setUsers(prev => prev.filter(u => u.id !== userId))
    setDeletingId(null)
    startTransition(async () => {
      try {
        await deleteUser(userId)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete user.')
        setUsers(initial)
      }
    })
  }

  return (
    <div>
      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[13px] text-rose-400">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.948 3.374H4.645c-1.73 0-2.813-1.874-1.948-3.374L10.05 3.378c.866-1.5 3.032-1.5 3.898 0l6.355 13.124zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-rose-500 hover:text-rose-300">✕</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">User</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Provider</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Role</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Joined</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${avatarColor(user.id)} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-[11px] font-semibold text-white">{initials(user.name)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 text-[13px] leading-tight truncate">{user.name}</p>
                      <p className="text-slate-500 text-[11px] truncate">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 hidden sm:table-cell">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${providerColors[user.provider] ?? 'bg-slate-100 text-slate-600'}`}>
                    {user.provider === 'google' ? (
                      <svg className="w-3 h-3" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    )}
                    {user.provider === 'google' ? 'Google' : 'Email'}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  {user.id === currentUserId ? (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold border ${roleColors[user.role]}`}>
                      {user.role}
                    </span>
                  ) : (
                    <select
                      value={user.role}
                      disabled={pending}
                      onChange={e => handleRoleChange(user.id, e.target.value)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border cursor-pointer
                        bg-transparent appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40
                        disabled:opacity-60 ${roleColors[user.role]}`}
                    >
                      {ROLES.map(r => <option key={r} value={r} className="bg-white text-slate-800">{r}</option>)}
                    </select>
                  )}
                </td>
                <td className="px-5 py-3.5 hidden md:table-cell text-[12px] text-slate-500">
                  {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </td>
                <td className="px-5 py-3.5 text-right">
                  {user.id !== currentUserId && (
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-50 transition-colors"
                      title="Delete user"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-[15px] font-semibold text-slate-800 text-center mb-1">Delete user?</h3>
            <p className="text-[13px] text-slate-500 text-center mb-6">
              {users.find(u => u.id === deletingId)?.name} will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(deletingId)}
                className="flex-1 py-2.5 rounded-lg bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
