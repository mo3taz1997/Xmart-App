import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/lib/api';
import { router } from 'expo-router';
import { queryClient } from '@/lib/query-client';

type NotificationContextType = {
  unreadCount: number;
  markAllRead: () => void;
  hasNewNotification: boolean;
  clearNewFlag: () => void;
};

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  markAllRead: () => {},
  hasNewNotification: false,
  clearNewFlag: () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

const LAST_SEEN_KEY = 'xmart_last_seen_notification_time';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const lastSeenRef = useRef<string | null>(null);

  useEffect(() => {
    loadLastSeen();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      checkUnread();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkUnread();
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    });
    return () => sub.remove();
  }, []);

  const loadLastSeen = async () => {
    try {
      const saved = await AsyncStorage.getItem(LAST_SEEN_KEY);
      lastSeenRef.current = saved;
      checkUnread();
    } catch {}
  };

  const checkUnread = useCallback(async () => {
    try {
      const notifications = await api.getNotifications();
      if (!notifications || !Array.isArray(notifications)) return;

      const lastSeen = lastSeenRef.current;
      if (!lastSeen) {
        setUnreadCount(notifications.length);
        if (notifications.length > 0) setHasNewNotification(true);
        return;
      }

      const lastSeenTime = new Date(lastSeen).getTime();
      const unread = notifications.filter((n: any) => new Date(n.createdAt).getTime() > lastSeenTime);
      setUnreadCount(unread.length);
      if (unread.length > 0) setHasNewNotification(true);
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    lastSeenRef.current = now;
    setUnreadCount(0);
    setHasNewNotification(false);
    try {
      await AsyncStorage.setItem(LAST_SEEN_KEY, now);
    } catch {}
  }, []);

  const clearNewFlag = useCallback(() => {
    setHasNewNotification(false);
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, markAllRead, hasNewNotification, clearNewFlag }}>
      {children}
    </NotificationContext.Provider>
  );
}
