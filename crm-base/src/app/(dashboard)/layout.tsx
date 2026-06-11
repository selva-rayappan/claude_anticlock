import { getSession } from '@/lib/auth'
import { Sidebar } from '@/components/Sidebar'
import { MobileHeader } from '@/components/MobileHeader'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const user = session
    ? { name: session.name, email: session.email, role: session.role }
    : { name: 'Guest', email: '', role: 'USER' }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="hidden md:block">
        <Sidebar user={user} />
      </div>

      <MobileHeader user={user} />

      <main className="flex-1 overflow-y-auto bg-white flex flex-col pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}
