'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationStore } from '@/store/notification.store';
import { api, paths } from '@/lib/api';

function NotificationSSEConnector() {
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}${paths.notifications.stream}`;
    const es = new EventSource(url, { withCredentials: true });

    es.addEventListener('notification', (e) => {
      try {
        const n = JSON.parse(e.data) as {
          id: string; type: string; title: string; body: string; isRead: boolean;
          entityType?: string; entityId?: string; createdAt: string;
        };
        addNotification(n);
      } catch { /* ignore */ }
    });

    es.onerror = () => {
      es.close();
      // Reconnect after 5s
      setTimeout(() => {}, 5000);
    };

    return () => es.close();
  }, [addNotification]);

  return null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  // Load initial notifications
  useEffect(() => {
    const { setNotifications } = useNotificationStore.getState();
    api.get<{ items: Parameters<typeof setNotifications>[0]; meta: { unreadCount: number } }>(
      paths.notifications.list,
    )
      .then((d) => setNotifications(d.items, d.meta.unreadCount))
      .catch(() => {/* ignore */});
  }, []);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <NotificationSSEConnector />
      <main className="flex flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
