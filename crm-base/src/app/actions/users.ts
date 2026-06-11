'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

function adminOnly() {
  // verified server-side — proxy.ts already blocks non-ADMIN on admin routes,
  // but server actions are callable directly so we re-check here
  return getSession().then(s => {
    if (s?.role !== 'ADMIN') throw new Error('Forbidden')
  })
}

export async function getUsers() {
  await adminOnly()
  return prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true, role: true, provider: true, createdAt: true },
  })
}

export async function updateUserRole(userId: string, role: string) {
  await adminOnly()
  const validRoles = ['ADMIN', 'MANAGER', 'USER']
  if (!validRoles.includes(role)) throw new Error('Invalid role')

  await prisma.user.update({ where: { id: userId }, data: { role } })
  revalidatePath('/admin/users')
}

export async function deleteUser(userId: string) {
  await adminOnly()
  const session = await getSession()
  if (session?.sub === userId) throw new Error('Cannot delete your own account')

  await prisma.user.delete({ where: { id: userId } })
  revalidatePath('/admin/users')
}
