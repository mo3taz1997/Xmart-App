import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
}

function getStyles(colors: typeof Colors.dark) {
  return StyleSheet.create({
    container: {
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 12,
      marginTop: 20,
    },
    title: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 18,
      color: colors.text,
    },
    seeAllBtn: {
      alignItems: 'center',
      gap: 2,
    },
    seeAllText: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 13,
      color: colors.primary,
    },
  });
}

export default function SectionHeader({ title, onSeeAll }: SectionHeaderProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { t, isRTL } = useLanguage();

  return (
    <View style={[styles.container, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{title}</Text>
      {onSeeAll ? (
        <Pressable style={[styles.seeAllBtn, { flexDirection: isRTL ? 'row' : 'row-reverse' }]} onPress={onSeeAll}>
          <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={colors.primary} />
          <Text style={styles.seeAllText}>{t('home.seeAll')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
