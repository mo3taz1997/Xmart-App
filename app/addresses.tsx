import React from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import PageBackground from '@/components/PageBackground';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AddressesScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useLanguage();

  const styles = getStyles(colors, isDark);

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <PageBackground isDark={isDark} />
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('addresses.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.centerContent}>
        <Ionicons name="location-outline" size={64} color={colors.textMuted} />
        <Text style={styles.emptyText}>{t('addresses.empty')}</Text>
      </View>
    </View>
  );
}

function getStyles(colors: typeof Colors.dark, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.header },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontFamily: 'Cairo_700Bold', fontSize: 18, color: colors.text },
    centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
    emptyText: { fontFamily: 'Cairo_600SemiBold', fontSize: 16, color: colors.textMuted, textAlign: 'center' },
  });
}
