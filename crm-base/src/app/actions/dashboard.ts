'use server'

import { prisma } from '@/lib/prisma'

const STAGE_ORDER = ['LEAD', 'CONTACTED', 'PROPOSAL', 'WON', 'LOST'] as const

export async function getDashboardStats() {
  const [contactCount, deals] = await Promise.all([
    prisma.contact.count(),
    prisma.deal.findMany({ select: { value: true, stage: true, createdAt: true } }),
  ])

  const activeDeals = deals.filter((d) => d.stage !== 'WON' && d.stage !== 'LOST')
  const wonDeals    = deals.filter((d) => d.stage === 'WON')

  const pipelineValue = activeDeals.reduce((s, d) => s + d.value, 0)
  const wonRevenue    = wonDeals.reduce((s, d) => s + d.value, 0)

  const dealsByStage = STAGE_ORDER.map((stage) => {
    const bucket = deals.filter((d) => d.stage === stage)
    return { stage, count: bucket.length, value: bucket.reduce((s, d) => s + d.value, 0) }
  })

  // Last 6 months revenue from WON deals
  const now = new Date()
  const revenueByMonth = Array.from({ length: 6 }, (_, i) => {
    const d   = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const val = wonDeals
      .filter((w) => {
        const wd = new Date(w.createdAt)
        return wd.getFullYear() === d.getFullYear() && wd.getMonth() === d.getMonth()
      })
      .reduce((s, w) => s + w.value, 0)
    return { label: d.toLocaleString('en-US', { month: 'short' }), year: d.getFullYear(), value: val }
  })

  return {
    contactCount,
    totalDeals: deals.length,
    activeDeals: activeDeals.length,
    pipelineValue,
    wonRevenue,
    dealsByStage,
    revenueByMonth,
  }
}
