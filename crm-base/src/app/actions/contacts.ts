'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type ContactFormData = {
  name: string
  email: string
  phone?: string | null
  company?: string | null
  designation?: string | null
  status: string
}

export async function getContacts() {
  return prisma.contact.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

export async function createContact(data: ContactFormData) {
  await prisma.contact.create({
    data: {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || null,
      company: data.company?.trim() || null,
      designation: data.designation?.trim() || null,
      status: data.status,
    },
  })
  revalidatePath('/contacts')
}

export async function updateContact(id: string, data: ContactFormData) {
  await prisma.contact.update({
    where: { id },
    data: {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || null,
      company: data.company?.trim() || null,
      designation: data.designation?.trim() || null,
      status: data.status,
    },
  })
  revalidatePath('/contacts')
}

export async function deleteContact(id: string) {
  await prisma.contact.delete({ where: { id } })
  revalidatePath('/contacts')
}
