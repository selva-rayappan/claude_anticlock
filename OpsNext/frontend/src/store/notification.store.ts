import { create } from 'zustand';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  entityType?: string;
  entityId?: string;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Notification) => void;
  setNotifications: (ns: Notification[], unread: number) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (n) =>
    set((s) => ({
      notifications: [n, ...s.notifications].slice(0, 50),
      unreadCount: s.unreadCount + (n.isRead ? 0 : 1),
    })),
  setNotifications: (ns, unread) => set({ notifications: ns, unreadCount: unread }),
  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    })),
  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),
}));
