import { Sidebar } from '@/components/Sidebar'
import { MobileHeader } from '@/components/MobileHeader'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile top bar + drawer */}
      <MobileHeader />

      {/* Main content — top padding on mobile for the fixed 56px bar */}
      <main className="flex-1 overflow-y-auto bg-white flex flex-col pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}
