import { getDashboardStats } from '@/app/actions/dashboard'
import { RevenueChart } from '@/components/dashboard/RevenueChart'

export const dynamic = 'force-dynamic'

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

const STAGE_META: Record<string, { label: string; dot: string; bar: string }> = {
  LEAD:      { label: 'Lead',      dot: 'bg-slate-400',   bar: 'bg-slate-300'   },
  CONTACTED: { label: 'Contacted', dot: 'bg-blue-400',    bar: 'bg-blue-400'    },
  PROPOSAL:  { label: 'Proposal',  dot: 'bg-amber-400',   bar: 'bg-amber-400'   },
  WON:       { label: 'Won',       dot: 'bg-emerald-400', bar: 'bg-emerald-400' },
  LOST:      { label: 'Lost',      dot: 'bg-rose-400',    bar: 'bg-rose-300'    },
}

function StatCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string
  value: string | number
  sub?: string
  accent: string
  icon: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 sm:p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accent}`}>
          {icon}
        </div>
      </div>
      <p className="text-[22px] sm:text-[28px] font-bold text-slate-900 leading-none tracking-tight">{value}</p>
      {sub && <p className="text-[11px] sm:text-[12px] text-slate-400 mt-1.5 truncate">{sub}</p>}
    </div>
  )
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  const maxStageValue = Math.max(...stats.dealsByStage.map((s) => s.value), 1)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="flex-1 bg-slate-50/60 overflow-y-auto">
      {/* Header */}
      <div className="px-4 sm:px-8 py-5 sm:py-6 bg-white border-b border-slate-100">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[17px] font-semibold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-sm text-slate-400 mt-0.5">Welcome back, John</p>
          </div>
          <p className="hidden sm:block text-[12px] text-slate-400">{today}</p>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-5 sm:py-6 space-y-4 sm:space-y-5">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Total Contacts"
            value={stats.contactCount}
            sub="in your CRM"
            accent="bg-indigo-50"
            icon={
              <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            }
          />
          <StatCard
            label="Open Deals"
            value={stats.activeDeals}
            sub={`${stats.totalDeals} total deals`}
            accent="bg-blue-50"
            icon={
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
              </svg>
            }
          />
          <StatCard
            label="Pipeline Value"
            value={fmt(stats.pipelineValue)}
            sub="lead · contacted · proposal"
            accent="bg-amber-50"
            icon={
              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Won Revenue"
            value={fmt(stats.wonRevenue)}
            sub="all time"
            accent="bg-emerald-50"
            icon={
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* Bottom panels */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* Deals by stage */}
          <div className="xl:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[13px] font-semibold text-slate-800">Deals by stage</p>
              <span className="text-[11px] text-slate-400">{stats.totalDeals} total</span>
            </div>
            <div className="space-y-4">
              {stats.dealsByStage.map(({ stage, count, value }) => {
                const meta  = STAGE_META[stage]
                const width = value > 0 ? Math.max((value / maxStageValue) * 100, 4) : 0
                return (
                  <div key={stage}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />
                        <span className="text-[12px] font-medium text-slate-600">{meta.label}</span>
                        <span className="text-[11px] text-slate-400">({count})</span>
                      </div>
                      <span className="text-[12px] font-semibold text-slate-700">{fmt(value)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${meta.bar}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Revenue chart */}
          <div className="xl:col-span-3 bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <RevenueChart data={stats.revenueByMonth} />
          </div>
        </div>
      </div>
    </div>
  )
}
