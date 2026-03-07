import React, { useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import PageBackground from '@/components/PageBackground';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { useNotifications } from '@/contexts/NotificationContext';
import { queryClient } from '@/lib/query-client';

function timeAgo(date: string, t: (k: string) => string) {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('notifications.justNow');
  if (mins < 60) return t('notifications.minutesAgo').replace('{n}', String(mins));
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('notifications.hoursAgo').replace('{n}', String(hrs));
  const days = Math.floor(hrs / 24);
  return t('notifications.daysAgo').replace('{n}', String(days));
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const { colors, isDark } = useTheme();
  const { t, isRTL, language } = useLanguage();
  const { markAllRead } = useNotifications();

  useFocusEffect(
    useCallback(() => {
      markAllRead();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }, [])
  );

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const styles = getStyles(colors, isDark);

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <PageBackground isDark={isDark} />
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('notifications.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !notifications || notifications.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>{t('notifications.empty')}</Text>
          <Text style={styles.emptyDesc}>{t('notifications.emptyDesc')}</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {notifications.map((n: any) => {
            const title = language === 'ar' ? n.titleAr : n.titleEn;
            const body = language === 'ar' ? n.bodyAr : n.bodyEn;
            return (
              <Pressable
                key={n.id}
                style={[styles.notifCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => {
                  if (n.linkType === 'product' && n.linkValue) {
                    router.push({ pathname: '/product/[handle]', params: { handle: n.linkValue } });
                  } else if (n.linkType === 'collection' && n.linkValue) {
                    router.push({ pathname: '/collection/[handle]', params: { handle: n.linkValue } });
                  }
                }}
              >
                {n.imageUrl ? (
                  <Image source={{ uri: n.imageUrl }} style={styles.notifImage} contentFit="cover" />
                ) : (
                  <View style={styles.notifIconWrap}>
                    <Ionicons name="notifications" size={24} color={colors.primary} />
                  </View>
                )}
                <View style={[styles.notifContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.notifTitle, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={2}>{title}</Text>
                  {body ? (
                    <Text style={[styles.notifBody, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={3}>{body}</Text>
                  ) : null}
                  <Text style={[styles.notifTime, { textAlign: isRTL ? 'right' : 'left' }]}>{timeAgo(n.createdAt, t)}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function getStyles(colors: typeof Colors.dark, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      fontFamily: 'Cairo_700Bold',
      fontSize: 20,
      color: colors.text,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 12,
    },
    emptyTitle: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 18,
      color: colors.text,
    },
    emptyDesc: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    notifCard: {
      padding: 16,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    notifImage: {
      width: 56,
      height: 56,
      borderRadius: 12,
    },
    notifIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(36,140,204,0.15)' : 'rgba(36,140,204,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    notifContent: {
      flex: 1,
      gap: 4,
    },
    notifTitle: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 15,
      color: colors.text,
    },
    notifBody: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    notifTime: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 12,
      color: colors.textMuted,
    },
  });
}
