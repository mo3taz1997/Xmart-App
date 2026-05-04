import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Image,
  Animated,
  Easing,
} from 'react-native';
import * as Application from 'expo-application';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getApiUrl } from '@/lib/query-client';

type AppVersionInfo = {
  minAndroidVersionCode: number;
  minIosBuildNumber: number;
  latestAndroidVersion?: string;
  latestIosVersion?: string;
  forceUpdate: boolean;
  playStoreUrl: string;
  appStoreUrl: string;
};

const STORAGE_KEY = '@xmart/last_update_dismiss';

export function ForceUpdateModal() {
  const { colors, isDark } = useTheme();
  const { language, isRTL } = useLanguage();
  const [info, setInfo] = useState<AppVersionInfo | null>(null);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [isForce, setIsForce] = useState(false);
  const scale = React.useRef(new Animated.Value(0.9)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let cancelled = false;
    const checkVersion = async () => {
      try {
        const url = new URL('/api/app-version', getApiUrl());
        const res = await fetch(url.toString());
        if (!res.ok) return;
        const data: AppVersionInfo = await res.json();
        if (cancelled) return;

        const currentBuild = parseInt(
          Application.nativeBuildVersion || '0',
          10,
        ) || 0;

        const minRequired =
          Platform.OS === 'android'
            ? data.minAndroidVersionCode
            : data.minIosBuildNumber;

        if (minRequired > 0 && currentBuild < minRequired) {
          setInfo(data);
          setNeedsUpdate(true);
          setIsForce(data.forceUpdate);
        }
      } catch (e) {
        console.log('[ForceUpdate] check failed:', e);
      }
    };

    checkVersion();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (needsUpdate) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [needsUpdate]);

  const handleUpdate = async () => {
    if (!info) return;
    const storeUrl =
      Platform.OS === 'android' ? info.playStoreUrl : info.appStoreUrl;
    try {
      await Linking.openURL(storeUrl);
    } catch (e) {
      console.log('[ForceUpdate] failed to open store:', e);
    }
  };

  const handleLater = () => {
    if (isForce) return;
    setNeedsUpdate(false);
  };

  if (!needsUpdate || !info) return null;

  const t = {
    title: language === 'ar' ? 'تحديث متوفر' : 'Update Available',
    message:
      language === 'ar'
        ? 'يتوفر إصدار جديد من تطبيق Xmart بمزايا وتحسينات جديدة. يرجى التحديث للاستمرار.'
        : 'A new version of Xmart is available with new features and improvements. Please update to continue.',
    messageOptional:
      language === 'ar'
        ? 'يتوفر إصدار جديد من تطبيق Xmart. ننصحك بالتحديث للاستفادة من آخر التحسينات.'
        : 'A new version of Xmart is available. We recommend updating to get the latest improvements.',
    update: language === 'ar' ? 'تحديث الآن' : 'Update Now',
    later: language === 'ar' ? 'لاحقاً' : 'Later',
  };

  return (
    <Modal
      visible={needsUpdate}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (!isForce) handleLater();
      }}
    >
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              transform: [{ scale }],
              direction: isRTL ? 'rtl' : 'ltr',
            },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + '15' }]}>
            <Text style={styles.iconText}>⬆️</Text>
          </View>

          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                textAlign: 'center',
                writingDirection: isRTL ? 'rtl' : 'ltr',
              },
            ]}
          >
            {t.title}
          </Text>

          <Text
            style={[
              styles.message,
              {
                color: colors.textSecondary,
                textAlign: 'center',
                writingDirection: isRTL ? 'rtl' : 'ltr',
              },
            ]}
          >
            {isForce ? t.message : t.messageOptional}
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleUpdate}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>{t.update}</Text>
          </TouchableOpacity>

          {!isForce && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleLater}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>
                {t.later}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 36,
  },
  title: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 22,
    marginBottom: 12,
  },
  message: {
    fontFamily: 'Cairo_400Regular',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    fontFamily: 'Cairo_600SemiBold',
    fontSize: 14,
  },
});
