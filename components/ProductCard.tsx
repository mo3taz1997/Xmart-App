import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSalesCount } from '@/contexts/SalesCountContext';

function StaticFire() {
  return (
    <Text style={{ fontSize: 11 }}>
      {'\uD83D\uDD25'}
    </Text>
  );
}


const BADGE_COLORS = ['#248CCC', '#2E7D32', '#E65100', '#7B1FA2'];

function handleToOffset(handle: string): number {
  let h = 0;
  for (let i = 0; i < handle.length; i++) {
    h = (h * 31 + handle.charCodeAt(i)) & 0x7fffffff;
  }
  return h;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

function TrustBadges({ freeDelivery, isRTL, language, colors, soldCount, startOffset }: { freeDelivery: boolean; isRTL: boolean; language: string; colors: typeof Colors.dark; soldCount: number; startOffset: number }) {
  const items = React.useMemo(() => {
    const list: { icon: string; text: string; color: string }[] = [];
    if (soldCount > 0) {
      const soldText = language === 'ar'
        ? `تم بيعه ${soldCount} مرة مؤخراً`
        : `Sold ${soldCount} times recently`;
      list.push({ icon: 'trending-up-outline', text: soldText, color: '#D84315' });
    }
    if (freeDelivery) {
      list.push({ icon: 'car-outline', text: language === 'ar' ? 'توصيل مجاني' : 'Free Delivery', color: BADGE_COLORS[1] });
    } else {
      list.push({ icon: 'flash-outline', text: language === 'ar' ? 'توصيل سريع' : 'Fast Delivery', color: BADGE_COLORS[2] });
    }
    list.push(
      { icon: 'shield-checkmark-outline', text: language === 'ar' ? 'منتج أصلي 100%' : '100% Authentic', color: BADGE_COLORS[0] },
      { icon: 'ribbon-outline', text: language === 'ar' ? 'كفالة حقيقية' : 'Genuine Warranty', color: BADGE_COLORS[1] },
      { icon: 'card-outline', text: language === 'ar' ? 'دفع آمن' : 'Secure Payment', color: BADGE_COLORS[3] },
      { icon: 'wallet-outline', text: language === 'ar' ? 'طرق دفع متنوعة' : 'Multiple Payment Methods', color: BADGE_COLORS[2] },
    );
    const rng = seededRandom(startOffset);
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }, [freeDelivery, soldCount, language, startOffset]);

  const [idx, setIdx] = React.useState(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  const advanceIdx = React.useCallback(() => {
    setIdx(prev => (prev + 1) % items.length);
  }, [items.length]);

  React.useEffect(() => {
    if (items.length <= 1) return;
    const delay = 3000 + (startOffset % 5) * 400;
    const timer = setInterval(() => {
      translateY.value = withTiming(-18, { duration: 250, easing: Easing.in(Easing.ease) });
      opacity.value = withTiming(0, { duration: 250 }, () => {
        runOnJS(advanceIdx)();
        translateY.value = 18;
        opacity.value = 0;
        translateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) });
        opacity.value = withTiming(1, { duration: 250 });
      });
    }, delay);
    return () => clearInterval(timer);
  }, [items.length, startOffset]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const badge = items[idx];
  if (!badge) return null;

  return (
    <View style={{
      marginTop: 4,
      overflow: 'hidden',
      borderRadius: 6,
      height: 26,
    }}>
      <Animated.View style={[{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 6,
        backgroundColor: badge.color + '0A',
        borderRadius: 6,
      }, animStyle]}>
        <Ionicons name={badge.icon as any} size={11} color={badge.color} />
        <Text
          style={{
            fontFamily: 'Cairo_600SemiBold',
            fontSize: 9,
            color: badge.color,
            writingDirection: isRTL ? 'rtl' : 'ltr',
          }}
          numberOfLines={1}
        >
          {badge.text}
        </Text>
      </Animated.View>
    </View>
  );
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface ProductCardProps {
  handle: string;
  title: string;
  price: string;
  currencyCode: string;
  compareAtPrice?: string;
  imageUrl?: string;
  availableForSale?: boolean;
  compact?: boolean;
  vendor?: string;
}

function getStyles(colors: typeof Colors.dark) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 12,
    },
    imageContainer: {
      width: '100%',
      backgroundColor: '#FFFFFF',
      position: 'relative',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    placeholderImage: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: {
      padding: 10,
      gap: 2,
    },
    vendor: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 11,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    title: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 12,
      color: colors.text,
      lineHeight: 18,
      height: 36,
    },
    priceRow: {
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    price: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 14,
      color: colors.primary,
    },
    comparePrice: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 12,
      color: colors.textMuted,
      textDecorationLine: 'line-through',
    },
    discountBadge: {
      position: 'absolute',
      top: 8,
      backgroundColor: '#F57C00',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    discountText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 11,
      color: '#fff',
    },
    soldOutBadge: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(211, 47, 47, 0.9)',
      paddingVertical: 5,
      alignItems: 'center',
    },
    soldOutText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 12,
      color: '#fff',
    },
    wishlistBtn: {
      position: 'absolute',
      top: 8,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}

function ProductCard({
  handle,
  title,
  price,
  currencyCode,
  compareAtPrice,
  imageUrl,
  availableForSale = true,
  compact = false,
  vendor,
}: ProductCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { language, formatCurrency, t, isRTL } = useLanguage();
  const soldCount = useSalesCount(handle);
  const inWishlist = isInWishlist(handle);
  const displayTitle = title;

  const hasDiscount = compareAtPrice && parseFloat(compareAtPrice) > parseFloat(price);
  const discountPercent = hasDiscount
    ? Math.round(((parseFloat(compareAtPrice!) - parseFloat(price)) / parseFloat(compareAtPrice!)) * 100)
    : 0;

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/product/[handle]', params: { handle } });
  }, [handle]);

  const handleWishlist = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleWishlist({ handle, title, price, currencyCode, compareAtPrice, imageUrl });
  }, [handle, title, price, currencyCode, compareAtPrice, imageUrl, toggleWishlist]);

  const isTablet = width >= 768;
  const tabletCardW = Math.round((width - 80) / 5);
  const cardWidth = compact ? (isTablet ? tabletCardW : Math.round(width * 0.4)) : undefined;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { width: cardWidth, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
      onPress={handlePress}
    >
      <View style={[styles.imageContainer, { aspectRatio: 1, height: undefined }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={[styles.image, !availableForSale && { opacity: 0.5 }]} contentFit="contain" transition={0} cachePolicy="memory-disk" recyclingKey={handle} placeholder={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88P/BfwAJhAPkv6IuGgAAAABJRU5ErkJggg==' }} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={40} color={colors.textMuted} />
          </View>
        )}
        {hasDiscount && discountPercent > 0 && availableForSale ? (
          <View style={[styles.discountBadge, isRTL ? { right: 8 } : { left: 8 }]}>
            <Text style={styles.discountText}>-{discountPercent}%</Text>
          </View>
        ) : null}
        {!availableForSale ? (
          <View style={styles.soldOutBadge}>
            <Text style={styles.soldOutText}>{t('product.soldOut')}</Text>
          </View>
        ) : null}
        <Pressable style={[styles.wishlistBtn, isRTL ? { left: 8 } : { right: 8 }]} onPress={handleWishlist} hitSlop={8}>
          <Ionicons
            name={inWishlist ? "heart" : "heart-outline"}
            size={20}
            color={inWishlist ? "#C75050" : "#fff"}
          />
        </Pressable>
      </View>
      <View style={styles.info}>
        {vendor ? (
          <Text style={[styles.vendor, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{vendor}</Text>
        ) : null}
        <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={2}>{displayTitle}</Text>
        <View style={[styles.priceRow, { flexDirection: isRTL ? 'row-reverse' : 'row', opacity: availableForSale ? 1 : 0 }]}>
          {hasDiscount ? (
            <Text style={styles.comparePrice}>
              {parseFloat(compareAtPrice!).toFixed(2)}
            </Text>
          ) : null}
          <Text style={styles.price}>{formatCurrency(price, currencyCode)}</Text>
        </View>
        <TrustBadges
          freeDelivery={parseFloat(price) >= 40}
          isRTL={isRTL}
          language={language}
          colors={colors}
          soldCount={soldCount}
          startOffset={handleToOffset(handle)}
        />
      </View>
    </Pressable>
  );
}

export default React.memo(ProductCard, (prev, next) => {
  return prev.handle === next.handle &&
    prev.imageUrl === next.imageUrl &&
    prev.price === next.price &&
    prev.compareAtPrice === next.compareAtPrice &&
    prev.title === next.title &&
    prev.availableForSale === next.availableForSale &&
    prev.compact === next.compact &&
    prev.vendor === next.vendor;
});
