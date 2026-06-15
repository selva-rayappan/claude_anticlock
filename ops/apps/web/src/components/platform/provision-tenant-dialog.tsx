'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { provisionTenantSchema, type ProvisionTenantInput } from '@opsnext/shared'
import { useProvisionTenant } from '@/lib/queries/platform'

interface Props {
  open: boolean
  onClose: () => void
}

export function ProvisionTenantDialog({ open, onClose }: Props) {
  const { mutateAsync, isPending } = useProvisionTenant()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProvisionTenantInput>({
    resolver: zodResolver(provisionTenantSchema),
  })

  const onSubmit = async (data: ProvisionTenantInput) => {
    setServerError(null)
    try {
      await mutateAsync(data)
      reset()
      onClose()
    } catch (err: unknown) {
      const body = err as { errors?: { code: string; message: string }[] }
      const code = body?.errors?.[0]?.code
      setServerError(
        code === 'DUPLICATE_SLUG'
          ? `The slug "${data.slug}" is already taken. Choose a different one.`
          : 'Something went wrong. Please try again.',
      )
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">Provision New Tenant</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Slug</label>
            <input
              {...register('slug')}
              placeholder="acme-corp"
              className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Display Name</label>
            <input
              {...register('displayName')}
              placeholder="Acme Corporation"
              className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.displayName && (
              <p className="mt-1 text-xs text-red-600">{errors.displayName.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Seed Admin Email</label>
            <input
              {...register('seedAdminEmail')}
              type="email"
              placeholder="admin@acme.com"
              className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.seedAdminEmail && (
              <p className="mt-1 text-xs text-red-600">{errors.seedAdminEmail.message}</p>
            )}
          </div>
          {serverError && <p className="text-sm text-red-600">{serverError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { reset(); onClose() }}
              className="rounded px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Provisioning…' : 'Provision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
