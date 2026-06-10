'use client'

import { useState } from 'react'

type MonthData = { label: string; year: number; value: number }

function fmtShort(v: number) {
  if (v === 0) return '$0'
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`
  return `$${v}`
}

function fmtFull(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
}

const W = 520
const H = 160
const PAD_X = 10
const PAD_TOP = 32
const PAD_BOTTOM = 28
const BAR_W = 48
const GAP = (W - PAD_X * 2 - BAR_W * 6) / 5

export function RevenueChart({ data }: { data: MonthData[] }) {
  const [hovered, setHovered] = useState<number | null>(null)

  const max  = Math.max(...data.map((d) => d.value), 1)
  const total = data.reduce((s, d) => s + d.value, 0)

  // Y-axis grid at 25 / 50 / 75 / 100 %
  const gridRatios = [0.25, 0.5, 0.75, 1]

  return (
    <div className="flex flex-col h-full">
      {/* summary row */}
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[13px] font-semibold text-slate-700">Won revenue · last 6 months</p>
        <p className="text-[13px] font-bold text-indigo-600">{fmtFull(total)}</p>
      </div>

      <div className="relative flex-1 min-h-[160px]">
        <svg
          viewBox={`0 0 ${W} ${H + PAD_TOP + PAD_BOTTOM}`}
          className="w-full h-full"
          style={{ overflow: 'visible' }}
        >
          {/* Grid lines + y labels */}
          {gridRatios.map((r) => {
            const y = PAD_TOP + H * (1 - r)
            return (
              <g key={r}>
                <line
                  x1={PAD_X} x2={W - PAD_X} y1={y} y2={y}
                  stroke="#f1f5f9" strokeWidth={1}
                />
                <text
                  x={PAD_X} y={y - 4}
                  fontSize={9} fill="#cbd5e1" textAnchor="start"
                >
                  {fmtShort(max * r)}
                </text>
              </g>
            )
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const barH  = d.value > 0 ? Math.max((d.value / max) * H, 5) : 3
            const x     = PAD_X + i * (BAR_W + GAP)
            const y     = PAD_TOP + H - barH
            const faded = hovered !== null && hovered !== i

            return (
              <g
                key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'default' }}
              >
                {/* Bar */}
                <rect
                  x={x} y={d.value > 0 ? y : PAD_TOP + H - 3}
                  width={BAR_W} height={barH}
                  rx={5} ry={5}
                  fill={d.value > 0 ? (hovered === i ? '#4f46e5' : '#6366f1') : '#e2e8f0'}
                  opacity={faded ? 0.35 : 1}
                  style={{ transition: 'fill 0.15s, opacity 0.15s' }}
                />

                {/* Hover tooltip */}
                {hovered === i && d.value > 0 && (
                  <g>
                    <rect
                      x={x + BAR_W / 2 - 30} y={y - 26}
                      width={60} height={20}
                      rx={5} fill="#1e293b"
                    />
                    <text
                      x={x + BAR_W / 2} y={y - 12}
                      textAnchor="middle" fontSize={10} fontWeight={600} fill="white"
                    >
                      {fmtShort(d.value)}
                    </text>
                  </g>
                )}

                {/* Month label */}
                <text
                  x={x + BAR_W / 2} y={PAD_TOP + H + 18}
                  textAnchor="middle" fontSize={11}
                  fill={hovered === i ? '#6366f1' : '#94a3b8'}
                  fontWeight={hovered === i ? 600 : 400}
                  style={{ transition: 'fill 0.15s' }}
                >
                  {d.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
