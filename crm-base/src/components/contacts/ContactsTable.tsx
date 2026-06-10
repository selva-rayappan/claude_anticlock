'use client'

import { useState } from 'react'
import type { Contact } from '@/generated/prisma/client'
import { deleteContact } from '@/app/actions/contacts'
import { StatusBadge } from './StatusBadge'

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
]

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

interface Props {
  contacts: Contact[]
  onEdit: (contact: Contact) => void
  onNew: () => void
}

export function ContactsTable({ contacts, onEdit, onNew }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteContact(id)
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-5">
          <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">No contacts yet</h3>
        <p className="text-sm text-slate-400 mb-6 max-w-xs leading-relaxed">
          Start building your CRM by adding your first contact.
        </p>
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium
            rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add your first contact
        </button>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="px-4 sm:px-6 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Contact</th>
            <th className="hidden sm:table-cell px-4 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Phone</th>
            <th className="hidden md:table-cell px-4 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Company</th>
            <th className="px-4 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
            <th className="px-4 sm:px-6 py-3.5 w-20 sm:w-24" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {contacts.map((contact) => (
            <tr key={contact.id} className="hover:bg-slate-50/70 transition-colors group">

              {/* Contact */}
              <td className="px-4 sm:px-6 py-3.5 sm:py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center
                    text-xs font-semibold ${avatarColor(contact.name)}`}>
                    {initials(contact.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{contact.name}</p>
                    <p className="text-xs text-slate-400 truncate">{contact.email}</p>
                  </div>
                </div>
              </td>

              {/* Phone */}
              <td className="hidden sm:table-cell px-4 py-4 text-slate-500 whitespace-nowrap">
                {contact.phone || <span className="text-slate-200">—</span>}
              </td>

              {/* Company */}
              <td className="hidden md:table-cell px-4 py-4">
                {contact.company ? (
                  <div>
                    <p className="text-slate-700 font-medium">{contact.company}</p>
                    {contact.designation && (
                      <p className="text-xs text-slate-400">{contact.designation}</p>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-200">—</span>
                )}
              </td>

              {/* Status */}
              <td className="px-4 py-3.5 sm:py-4">
                <StatusBadge status={contact.status} />
              </td>

              {/* Actions */}
              <td className="px-4 sm:px-6 py-3.5 sm:py-4 text-right">
                {confirmId === contact.id ? (
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs text-slate-400">Delete?</span>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      disabled={deletingId === contact.id}
                      className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-red-50 text-red-600
                        hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {deletingId === contact.id ? '…' : 'Yes'}
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-100
                        text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(contact)}
                      title="Edit"
                      className="p-2 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setConfirmId(contact.id)}
                      title="Delete"
                      className="p-2 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
