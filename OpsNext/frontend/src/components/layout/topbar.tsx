'use client';

import { Bell, Search, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useNotificationStore } from '@/store/notification.store';

interface TopbarProps {
  title?: string;
  children?: React.ReactNode;
}

export function Topbar({ title, children }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const { unreadCount } = useNotificationStore();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b bg-background/95 backdrop-blur px-6">
      {title && <h1 className="text-xl font-semibold">{title}</h1>}
      <div className="flex flex-1 items-center justify-end gap-2">
        {children}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => { const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }); document.dispatchEvent(e); }}
          className="text-muted-foreground"
          title="Search (Ctrl+K)"
        >
          <Search className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="text-muted-foreground"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground" asChild>
          <Link href="/notifications">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </Button>
      </div>
    </header>
  );
}
