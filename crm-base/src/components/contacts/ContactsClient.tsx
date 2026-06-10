'use client'

import { useState, useMemo } from 'react'
import type { Contact } from '@/generated/prisma/client'
import { ContactsTable } from './ContactsTable'
import { ContactForm } from './ContactForm'

interface Props {
  initialContacts: Contact[]
}

export function ContactsClient({ initialContacts }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return initialContacts
    return initialContacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company?.toLowerCase().includes(q) ?? false) ||
        (c.designation?.toLowerCase().includes(q) ?? false)
    )
  }, [initialContacts, query])

  const openNew = () => { setEditing(null); setIsOpen(true) }
  const openEdit = (c: Contact) => { setEditing(c); setIsOpen(true) }
  const close = () => { setIsOpen(false); setEditing(null) }

  return (
    <>
      {/* Page header */}
      <div className="px-4 sm:px-8 py-5 sm:py-6 bg-white border-b border-slate-100 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[17px] font-semibold text-slate-900 tracking-tight">Contacts</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {initialContacts.length} {initialContacts.length === 1 ? 'contact' : 'contacts'}
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white text-sm font-medium
            rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="hidden sm:inline">New contact</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Search */}
      {initialContacts.length > 0 && (
        <div className="px-4 sm:px-8 py-3.5 bg-white border-b border-slate-100">
          <div className="relative max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
              fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-sm
                text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2
                focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-colors"
            />
          </div>
          {query && (
            <p className="text-xs text-slate-400 mt-2">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Table or no-results */}
      {query && filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm text-slate-500 mb-2">No contacts match &ldquo;{query}&rdquo;</p>
          <button onClick={() => setQuery('')} className="text-sm text-indigo-600 hover:underline">
            Clear search
          </button>
        </div>
      ) : (
        <ContactsTable contacts={filtered} onEdit={openEdit} onNew={openNew} />
      )}

      <ContactForm isOpen={isOpen} contact={editing} onClose={close} />
    </>
  )
}
