'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Building2, TrendingUp, BarChart3,
  CheckSquare, Bell, Settings, LogOut, ChevronRight,
  Workflow, PieChart, Upload, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationStore } from '@/store/notification.store';
import { api, paths } from '@/lib/api';
import { initials } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Contacts', icon: Users, href: '/contacts' },
  { label: 'Accounts', icon: Building2, href: '/accounts' },
  { label: 'Leads', icon: TrendingUp, href: '/leads' },
  { label: 'Opportunities', icon: BarChart3, href: '/opportunities' },
  { label: 'Tasks', icon: CheckSquare, href: '/tasks' },
  { label: 'Workflows', icon: Workflow, href: '/workflows' },
  { label: 'Reports', icon: PieChart, href: '/reports' },
  { label: 'Imports', icon: Upload, href: '/imports' },
];

const BOTTOM_NAV = [
  { label: 'Notifications', icon: Bell, href: '/notifications' },
  { label: 'Settings', icon: Settings, href: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  async function handleLogout() {
    try { await api.post(paths.auth.logout, {}); } catch { /* ignore */ }
    logout();
    window.location.href = '/login';
  }

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Zap className="h-7 w-7 text-sidebar-primary" />
          <span className="text-xl font-bold tracking-tight">OpsNext</span>
        </div>
      </div>

      {/* Search hint */}
      <div className="px-4 py-3">
        <button
          onClick={() => { const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }); document.dispatchEvent(e); }}
          className="flex w-full items-center gap-2 rounded-md bg-sidebar-accent px-3 py-2 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
        >
          <span className="flex-1 text-left">Search...</span>
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-sidebar-border bg-sidebar px-1.5 font-mono text-[10px]">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-0.5 py-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                {active && <ChevronRight className="ml-auto h-3 w-3 opacity-60" />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border my-2" />

        <nav className="space-y-0.5 pb-2">
          {BOTTOM_NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                {item.href === '/notifications' && unreadCount > 0 && (
                  <Badge className="ml-auto h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-sidebar-primary text-sidebar-primary-foreground">
              {initials(user?.firstName, user?.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
