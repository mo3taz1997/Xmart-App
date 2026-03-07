import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/lib/api';
import { router } from 'expo-router';
import { queryClient } from '@/lib/query-client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const handledResponseIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    registerForPushNotifications();
    loadLastSeen();

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      setHasNewNotification(true);
      checkUnread();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const responseId = response.notification.request.identifier;
      if (handledResponseIds.current.has(responseId)) return;
      handledResponseIds.current.add(responseId);

      const notifDate = response.notification.date;
      const now = Date.now() / 1000;
      if (notifDate && (now - notifDate) > 30) return;

      const actionId = response.actionIdentifier;
      if (actionId !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

      const data = response.notification.request.content.data;
      if (data?.linkType === 'product' && data?.linkValue) {
        router.push({ pathname: '/product/[handle]', params: { handle: data.linkValue as string } });
      } else if (data?.linkType === 'collection' && data?.linkValue) {
        router.push({ pathname: '/collection/[handle]', params: { handle: data.linkValue as string } });
      } else if (data?.linkType) {
        router.push('/notifications');
      }
    });

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
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

async function registerForPushNotifications() {
  try {
    if (Platform.OS === 'web') return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '3e6b6783-234b-4908-9292-c1396a2444f9',
    });
    const token = tokenData.data;

    try {
      await api.registerPushToken(token, Platform.OS);
    } catch {}

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#248CCC',
      });
    }
  } catch {}
}
