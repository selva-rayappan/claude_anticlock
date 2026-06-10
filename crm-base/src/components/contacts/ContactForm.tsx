'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import type { Contact } from '@/generated/prisma/client'
import { createContact, updateContact } from '@/app/actions/contacts'

type FormData = {
  name: string
  email: string
  phone: string
  company: string
  designation: string
  status: string
}

const STATUS_OPTIONS = [
  { value: 'LEAD',     label: 'Lead' },
  { value: 'ACTIVE',   label: 'Active' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'INACTIVE', label: 'Inactive' },
]

const EMPTY: FormData = { name: '', email: '', phone: '', company: '', designation: '', status: 'LEAD' }

interface Props {
  isOpen: boolean
  contact: Contact | null
  onClose: () => void
}

export function ContactForm({ isOpen, contact, onClose }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ defaultValues: EMPTY })

  useEffect(() => {
    reset(
      contact
        ? {
            name: contact.name,
            email: contact.email,
            phone: contact.phone ?? '',
            company: contact.company ?? '',
            designation: contact.designation ?? '',
            status: contact.status,
          }
        : EMPTY
    )
  }, [contact, reset])

  const onSubmit = async (data: FormData) => {
    try {
      if (contact) {
        await updateContact(contact.id, data)
      } else {
        await createContact(data)
      }
      onClose()
    } catch (err) {
      console.error(err)
    }
  }

  const inputCls = (hasError?: boolean) =>
    `w-full px-3 py-2 rounded-lg border text-sm text-slate-900 placeholder:text-slate-400
     focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors
     ${hasError ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'}`

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-[440px] bg-white shadow-2xl flex flex-col
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">
              {contact ? 'Edit contact' : 'New contact'}
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {contact ? 'Update contact information' : 'Add a new contact to your CRM'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-0.5 rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Full name <span className="text-red-400">*</span>
              </label>
              <input
                {...register('name', {
                  required: 'Name is required',
                  minLength: { value: 2, message: 'At least 2 characters' },
                })}
                type="text"
                placeholder="Jane Smith"
                className={inputCls(!!errors.name)}
              />
              {errors.name && <p className="mt-1.5 text-xs text-red-500">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
                })}
                type="email"
                placeholder="jane@company.com"
                className={inputCls(!!errors.email)}
              />
              {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
              <input
                {...register('phone')}
                type="tel"
                placeholder="+1 (555) 000-0000"
                className={inputCls()}
              />
            </div>

            {/* Company + Designation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Company</label>
                <input
                  {...register('company')}
                  type="text"
                  placeholder="Acme Corp"
                  className={inputCls()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Designation</label>
                <input
                  {...register('designation')}
                  type="text"
                  placeholder="CEO"
                  className={inputCls()}
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <div className="relative">
                <select
                  {...register('status', { required: true })}
                  className="w-full px-3 py-2 pr-8 rounded-lg border border-slate-200 bg-white text-sm text-slate-900
                    hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20
                    focus:border-indigo-400 transition-colors appearance-none cursor-pointer"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                  viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100
                transition-colors border border-slate-200 bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600
                hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed
                transition-colors flex items-center gap-2 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving…
                </>
              ) : contact ? (
                'Save changes'
              ) : (
                'Create contact'
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
