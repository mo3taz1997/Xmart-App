import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}

export default function SkeletonLoader({ width, height, borderRadius = 8, style }: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.7, { duration: 800 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.skeleton,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

function getSkeletonStyles(colors: typeof Colors.dark) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      overflow: 'hidden',
      width: 160,
      marginRight: 12,
    },
    info: {
      padding: 10,
      gap: 6,
    },
    categoryCard: {
      alignItems: 'center',
      gap: 4,
      marginRight: 16,
    },
  });
}

export function ProductCardSkeleton() {
  const { colors } = useTheme();
  const skeletonStyles = getSkeletonStyles(colors);

  return (
    <View style={skeletonStyles.card}>
      <SkeletonLoader width="100%" height={180} borderRadius={0} />
      <View style={skeletonStyles.info}>
        <SkeletonLoader width="80%" height={14} />
        <SkeletonLoader width="50%" height={14} />
      </View>
    </View>
  );
}

export function BannerSkeleton() {
  return <SkeletonLoader width="100%" height={180} borderRadius={12} />;
}

export function CategorySkeleton() {
  const { colors } = useTheme();
  const skeletonStyles = getSkeletonStyles(colors);

  return (
    <View style={skeletonStyles.categoryCard}>
      <SkeletonLoader width={70} height={70} borderRadius={35} />
      <SkeletonLoader width={60} height={12} style={{ marginTop: 6 }} />
    </View>
  );
}
