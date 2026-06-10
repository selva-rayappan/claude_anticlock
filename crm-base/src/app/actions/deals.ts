'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getDeals() {
  return prisma.deal.findMany({ orderBy: { createdAt: 'asc' } })
}

export async function updateDealStage(id: string, stage: string) {
  await prisma.deal.update({ where: { id }, data: { stage } })
  revalidatePath('/deals')
}
