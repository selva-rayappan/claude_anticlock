'use client'

import { useState } from 'react'
import type { Deal } from '@/generated/prisma/client'
import { updateDealStage } from '@/app/actions/deals'

const STAGES = [
  {
    id: 'LEAD',
    label: 'Lead',
    dot: 'bg-slate-400',
    pill: 'bg-slate-100 text-slate-600',
    dropRing: 'border-slate-300 bg-slate-50',
    countBg: 'bg-slate-200 text-slate-600',
  },
  {
    id: 'CONTACTED',
    label: 'Contacted',
    dot: 'bg-blue-400',
    pill: 'bg-blue-50 text-blue-700',
    dropRing: 'border-blue-300 bg-blue-50/60',
    countBg: 'bg-blue-100 text-blue-600',
  },
  {
    id: 'PROPOSAL',
    label: 'Proposal',
    dot: 'bg-amber-400',
    pill: 'bg-amber-50 text-amber-700',
    dropRing: 'border-amber-300 bg-amber-50/60',
    countBg: 'bg-amber-100 text-amber-600',
  },
  {
    id: 'WON',
    label: 'Won',
    dot: 'bg-emerald-400',
    pill: 'bg-emerald-50 text-emerald-700',
    dropRing: 'border-emerald-300 bg-emerald-50/60',
    countBg: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'LOST',
    label: 'Lost',
    dot: 'bg-rose-400',
    pill: 'bg-rose-50 text-rose-700',
    dropRing: 'border-rose-300 bg-rose-50/60',
    countBg: 'bg-rose-100 text-rose-600',
  },
] as const

type Stage = typeof STAGES[number]

function fmt(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function DealCard({
  deal,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  deal: Deal
  isDragging: boolean
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, deal.id)}
      onDragEnd={onDragEnd}
      className={`group bg-white rounded-xl border border-slate-200 p-3.5 cursor-grab active:cursor-grabbing
        shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-150 select-none
        ${isDragging ? 'opacity-30 scale-[0.97]' : 'opacity-100'}`}
    >
      <p className="text-[13px] font-semibold text-slate-900 leading-snug mb-1 truncate">
        {deal.title}
      </p>
      {deal.company && (
        <p className="text-[11px] text-slate-400 mb-3 truncate">{deal.company}</p>
      )}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="text-[13px] font-bold text-slate-800">{fmt(deal.value)}</span>
        <svg
          className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition-colors"
          viewBox="0 0 16 16" fill="currentColor"
        >
          <circle cx="4" cy="4" r="1.5" /><circle cx="4" cy="12" r="1.5" />
          <circle cx="12" cy="4" r="1.5" /><circle cx="12" cy="12" r="1.5" />
        </svg>
      </div>
    </div>
  )
}

function Column({
  stage,
  deals,
  draggingId,
  isOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  stage: Stage
  deals: Deal[]
  draggingId: string | null
  isOver: boolean
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, id: string) => void
}) {
  const total = deals.reduce((s, d) => s + d.value, 0)

  return (
    <div className="flex flex-col w-[210px] flex-shrink-0">
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 rounded-lg mb-2.5 ${stage.pill}`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stage.dot}`} />
          <span className="text-[12px] font-semibold truncate">{stage.label}</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${stage.countBg}`}>
            {deals.length}
          </span>
        </div>
        <span className="text-[11px] font-medium opacity-70 flex-shrink-0 ml-2">{fmt(total)}</span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => onDragOver(e, stage.id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, stage.id)}
        className={`flex-1 min-h-[120px] rounded-xl p-2 transition-all duration-150 space-y-2.5
          border-2 border-dashed
          ${isOver
            ? `${stage.dropRing}`
            : 'border-transparent bg-slate-50/40'
          }`}
      >
        {deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            isDragging={draggingId === deal.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
        {deals.length === 0 && (
          <div className={`h-14 flex items-center justify-center rounded-lg transition-colors
            ${isOver ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-[11px] text-slate-400 font-medium">Drop here</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function DealsPipeline({ initialDeals }: { initialDeals: Deal[] }) {
  const [deals, setDeals] = useState(initialDeals)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<string | null>(null)

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  function handleDragEnd() {
    setDraggingId(null)
    setOverStage(null)
  }

  function handleDragOver(e: React.DragEvent, stageId: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (overStage !== stageId) setOverStage(stageId)
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setOverStage(null)
    }
  }

  function handleDrop(e: React.DragEvent, stageId: string) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (!id) return
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, stage: stageId } : d)))
    setDraggingId(null)
    setOverStage(null)
    updateDealStage(id, stageId)
  }

  const activeDeals = deals.filter((d) => d.stage !== 'WON' && d.stage !== 'LOST')
  const pipelineValue = activeDeals.reduce((s, d) => s + d.value, 0)
  const wonValue = deals.filter((d) => d.stage === 'WON').reduce((s, d) => s + d.value, 0)

  return (
    <>
      {/* Page header */}
      <div className="px-4 sm:px-8 py-5 sm:py-6 bg-white border-b border-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[17px] font-semibold text-slate-900 tracking-tight">Deals</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {activeDeals.length} active &middot; {fmt(pipelineValue)} pipeline
            </p>
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 whitespace-nowrap">
              <span className="text-emerald-600 font-medium">Won </span>
              <span className="text-emerald-700 font-bold">{fmt(wonValue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hint */}
      <div className="px-4 sm:px-8 pt-4 pb-0">
        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
          </svg>
          Drag cards between stages to update the pipeline
        </p>
      </div>

      {/* Pipeline board */}
      <div className="flex-1 overflow-x-auto px-4 sm:px-8 py-5">
        <div className="flex gap-4 h-full min-w-max pb-4">
          {STAGES.map((stage) => (
            <Column
              key={stage.id}
              stage={stage}
              deals={deals.filter((d) => d.stage === stage.id)}
              draggingId={draggingId}
              isOver={overStage === stage.id}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          ))}
        </div>
      </div>
    </>
  )
}
