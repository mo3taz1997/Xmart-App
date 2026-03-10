import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Dimensions, Linking,
  Platform, ActivityIndicator, FlatList, Modal, NativeScrollEvent, NativeSyntheticEvent,
  Share, Alert, Animated as RNAnimated, PanResponder, InteractionManager,
} from 'react-native';
import { Image } from 'expo-image';
import XmartLogoSvg from '@/components/XmartLogoSvg';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { WebView } from 'react-native-webview';
import Toast from '@/components/Toast';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecentlyViewed } from '@/contexts/RecentlyViewedContext';
import { useAuth } from '@/contexts/AuthContext';

import ProductCard from '@/components/ProductCard';
import PageBackground from '@/components/PageBackground';

const { width } = Dimensions.get('window');

function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/(tabs)');
  }
}

function WhatsAppFloatingButton({ onPress, bottom, isRTL }: { onPress: () => void; bottom: number; isRTL: boolean }) {
  const shakeAnim = useRef(new RNAnimated.Value(0)).current;
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const triggerAttention = () => {
      RNAnimated.sequence([
        RNAnimated.timing(scaleAnim, { toValue: 1.15, duration: 150, useNativeDriver: true }),
        RNAnimated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        RNAnimated.sequence([
          RNAnimated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
          RNAnimated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
          RNAnimated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
          RNAnimated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
          RNAnimated.timing(shakeAnim, { toValue: 3, duration: 40, useNativeDriver: true }),
          RNAnimated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]),
      ]).start();
    };

    timerRef.current = setTimeout(triggerAttention, 20000);
    const interval = setInterval(triggerAttention, 20000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); clearInterval(interval); };
  }, []);

  return (
    <Pressable onPress={onPress}>
      <RNAnimated.View style={{
        position: 'absolute',
        bottom,
        [isRTL ? 'left' : 'right']: 16,
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: '#25D366',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        shadowColor: '#25D366',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
        transform: [{ translateX: shakeAnim }, { scale: scaleAnim }],
      }}>
        <Ionicons name="logo-whatsapp" size={28} color="#fff" />
      </RNAnimated.View>
    </Pressable>
  );
}

const COLOR_MAP: Record<string, string> = {
  black: '#000000', white: '#FFFFFF', red: '#E53935', blue: '#1E88E5',
  green: '#43A047', yellow: '#FDD835', orange: '#FB8C00', purple: '#8E24AA',
  pink: '#EC407A', brown: '#795548', grey: '#9E9E9E', gray: '#9E9E9E',
  gold: '#FFD700', silver: '#C0C0C0', beige: '#F5F5DC', cream: '#FFFDD0',
  navy: '#001F3F', 'navy blue': '#001F3F', teal: '#009688', cyan: '#00BCD4',
  maroon: '#800000', olive: '#808000', coral: '#FF7F50', salmon: '#FA8072',
  lavender: '#E6E6FA', indigo: '#3F51B5', violet: '#9C27B0', magenta: '#E91E63',
  turquoise: '#40E0D0', mint: '#98FF98', peach: '#FFDAB9', khaki: '#F0E68C',
  charcoal: '#36454F', ivory: '#FFFFF0', tan: '#D2B48C', burgundy: '#800020',
  'frost blue': '#A8D8EA', 'space blue': '#1B3A5C', 'light blue': '#ADD8E6',
  'dark blue': '#00008B', 'sky blue': '#87CEEB', 'baby blue': '#89CFF0',
  'royal blue': '#4169E1', 'titan gold': '#C5A431', 'rose gold': '#B76E79',
  'midnight black': '#191919', 'phantom black': '#1A1A2E', 'onyx black': '#111111',
  'space gray': '#52565E', 'space grey': '#52565E', 'graphite': '#383838',
  'titanium': '#878681', 'platinum': '#E5E4E2', 'champagne': '#F7E7CE',
  'copper': '#B87333', 'bronze': '#CD7F32', 'wine': '#722F37',
  'sage': '#9CAF88', 'moss': '#8A9A5B', 'emerald': '#50C878',
  'aqua': '#00FFFF', 'lilac': '#C8A2C8', 'sand': '#C2B280',
};

function getColorHex(colorName: string): string | null {
  const lower = colorName.toLowerCase().trim();
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];
  for (const [key, hex] of Object.entries(COLOR_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return hex;
  }
  return null;
}

function isColorVariant(variants: any[]): boolean {
  if (variants.length <= 1) return false;
  const hasColorOption = variants.some((v: any) =>
    v.selectedOptions?.some((opt: any) => opt.name.toLowerCase() === 'color' || opt.name.toLowerCase() === 'colour' || opt.name === 'اللون')
  );
  if (hasColorOption) return true;
  return variants.every((v: any) => getColorHex(v.title) !== null);
}

function ImageSlider({ images, activeIndex, onIndexChange, onImagePress }: {
  images: { url: string; altText?: string }[];
  activeIndex: number;
  onIndexChange: (idx: number) => void;
  onImagePress: (idx: number) => void;
}) {
  const { colors } = useTheme();
  const sliderWidth = isTablet ? tabletImageWidth : width;
  const imgStyles = getImgStyles(colors, sliderWidth);
  const count = images.length;
  const scrollRef = useRef<ScrollView>(null);
  const isScrolling = useRef(false);

  useEffect(() => {
    if (!isScrolling.current && scrollRef.current && count > 0) {
      scrollRef.current.scrollTo({ x: activeIndex * sliderWidth, animated: true });
    }
  }, [activeIndex, count]);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    isScrolling.current = false;
    const idx = Math.round(e.nativeEvent.contentOffset.x / sliderWidth);
    if (idx >= 0 && idx < count && idx !== activeIndex) {
      onIndexChange(idx);
    }
  };

  if (count === 0) {
    return (
      <View style={imgStyles.placeholder}>
        <Ionicons name="image-outline" size={64} color={colors.textMuted} />
      </View>
    );
  }

  return (
    <View style={imgStyles.sliderContainer}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollBeginDrag={() => { isScrolling.current = true; }}
        scrollEventThrottle={16}
        bounces={false}
        style={{ direction: 'ltr' }}
        contentContainerStyle={{ flexDirection: 'row' }}
      >
        {images.map((img, i) => (
          <Pressable key={i} onPress={() => onImagePress(i)} style={{ width: sliderWidth }}>
            <Image source={{ uri: img.url }} style={imgStyles.image} contentFit="contain" transition={300} />
          </Pressable>
        ))}
      </ScrollView>
      {count > 1 && (
        <View style={imgStyles.dotsRow}>
          {[0, 1, 2].map((d) => (
            <View key={d} style={[imgStyles.dot, d === (activeIndex % 3) && imgStyles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

function FullScreenImageViewer({ images, visible, initialIndex, onClose }: {
  images: { url: string; altText?: string }[];
  visible: boolean;
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const count = images.length;
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: initialIndex * width, animated: false });
      }, 50);
    }
  }, [visible, initialIndex]);

  const handleFsScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx >= 0 && idx < count) {
      setCurrentIndex(idx);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ position: 'absolute', top: insets.top + webTopInset + 10, right: 16, zIndex: 10 }}>
          <Pressable onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={24} color="#333" />
          </Pressable>
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleFsScrollEnd}
            scrollEventThrottle={16}
            bounces={false}
            style={{ direction: 'ltr' }}
          >
            {images.map((img, i) => {
              const imgSize = isTablet ? width * 0.4 : width;
              return (
              <View key={i} style={{ width, justifyContent: 'center', alignItems: 'center' }}>
                <Image source={{ uri: img.url }} style={{ width: imgSize, height: imgSize, backgroundColor: '#fff' }} contentFit="contain" transition={200} />
              </View>
              );
            })}
          </ScrollView>
        </View>
        {count > 1 && (
          <View style={{ position: 'absolute', bottom: insets.bottom + 40, left: 0, right: 0, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 6, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
              {[0, 1, 2].map((d) => (
                <View key={d} style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.2)' }, d === (currentIndex % 3) && { width: 18, backgroundColor: '#555' }]} />
              ))}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

function getTrustBadges(price: number) {
  return [
    { icon: 'shield-checkmark' as const, color: '#2E7D32', bg: 'rgba(46,125,50,0.1)', labelAr: 'منتج أصلي', labelEn: 'Authentic' },
    { icon: 'car' as const, color: '#E65100', bg: 'rgba(230,81,0,0.1)', labelAr: price >= 40 ? 'توصيل مجاني' : 'توصيل سريع', labelEn: price >= 40 ? 'Free Delivery' : 'Fast Delivery' },
    { icon: 'ribbon' as const, color: '#1565C0', bg: 'rgba(21,101,192,0.1)', labelAr: 'كفالة حقيقية', labelEn: 'Real Warranty' },
    { icon: 'lock-closed' as const, color: '#6A1B9A', bg: 'rgba(106,27,154,0.1)', labelAr: 'دفع آمن', labelEn: 'Secure Pay' },
  ];
}

function StockBadge({ available, colors, isRTL, t }: { available: boolean; colors: typeof Colors.dark; isRTL: boolean; t: (k: string) => string }) {
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const scaleAnim = useRef(new RNAnimated.Value(0.6)).current;
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  const dotAnim = useRef(new RNAnimated.Value(0.4)).current;

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      RNAnimated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 80 }),
    ]).start();

    if (available) {
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(dotAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          RNAnimated.timing(dotAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          RNAnimated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [available]);

  const bgColor = available ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.08)';
  const borderColor = available ? 'rgba(76,175,80,0.25)' : 'rgba(244,67,54,0.2)';
  const textColor = available ? '#2E7D32' : '#C62828';
  const dotColor = available ? '#4CAF50' : '#EF5350';

  return (
    <RNAnimated.View style={{
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      alignSelf: isRTL ? 'flex-end' : 'flex-start',
      marginTop: 10,
      backgroundColor: bgColor,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: borderColor,
      gap: 7,
      opacity: fadeAnim,
      transform: [{ scale: RNAnimated.multiply(scaleAnim, pulseAnim) }],
    }}>
      <RNAnimated.View style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: dotColor,
        opacity: available ? dotAnim : 1,
      }} />
      <Text style={{
        fontFamily: 'Cairo_600SemiBold',
        fontSize: 12,
        color: textColor,
      }}>
        {available ? t('product.inStock') : t('product.outOfStock')}
      </Text>
    </RNAnimated.View>
  );
}

function RatingBadge({ ratingValue, ratingCount, colors, isRTL }: { ratingValue: string | null; ratingCount: string | null; colors: typeof Colors.dark; isRTL: boolean }) {
  if (!ratingValue || !ratingCount) return null;

  let avgRating = 0;
  let count = 0;
  try {
    const parsed = JSON.parse(ratingValue);
    avgRating = parseFloat(parsed.value || parsed) || 0;
    count = parseInt(ratingCount) || 0;
  } catch {
    avgRating = parseFloat(ratingValue) || 0;
    count = parseInt(ratingCount || '0') || 0;
  }

  if (count === 0 || avgRating === 0) return null;

  const fullStars = Math.floor(avgRating);
  const hasHalf = avgRating - fullStars >= 0.25 && avgRating - fullStars < 0.75;
  const rounded = Math.round(avgRating * 10) / 10;

  return (
    <View style={{
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      alignSelf: isRTL ? 'flex-end' : 'flex-start',
      marginTop: 10,
      backgroundColor: 'rgba(255,193,7,0.1)',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: 'rgba(255,193,7,0.25)',
      gap: 5,
    }}>
      <View style={{ flexDirection: 'row', gap: 1 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= fullStars ? 'star' : (star === fullStars + 1 && hasHalf ? 'star-half' : 'star-outline')}
            size={13}
            color="#F59E0B"
          />
        ))}
      </View>
      <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 12, color: '#B45309' }}>
        {rounded}
      </Text>
      <Text style={{ fontFamily: 'Cairo_400Regular', fontSize: 11, color: '#92400E' }}>
        ({count})
      </Text>
    </View>
  );
}

function TrustBadges({ colors, language, isRTL, price }: { colors: typeof Colors.dark; language: string; isRTL: boolean; price: number }) {
  const badges = React.useMemo(() => getTrustBadges(price), [price]);
  const anims = useRef(badges.map(() => new RNAnimated.Value(0))).current;
  const pulseAnims = useRef(badges.map(() => new RNAnimated.Value(1))).current;

  useEffect(() => {
    const stagger = badges.map((_, i) =>
      RNAnimated.timing(anims[i], { toValue: 1, duration: 500, delay: i * 120, useNativeDriver: true })
    );
    RNAnimated.parallel(stagger).start(() => {
      badges.forEach((_, i) => {
        RNAnimated.loop(
          RNAnimated.sequence([
            RNAnimated.timing(pulseAnims[i], { toValue: 1.06, duration: 1500, delay: i * 400, useNativeDriver: true }),
            RNAnimated.timing(pulseAnims[i], { toValue: 1, duration: 1500, useNativeDriver: true }),
          ])
        ).start();
      });
    });
  }, []);

  return (
    <View style={[trustStyles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {badges.map((badge, i) => {
        const opacity = anims[i];
        const translateY = anims[i].interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
        return (
          <RNAnimated.View
            key={badge.icon}
            style={[trustStyles.card, {
              backgroundColor: badge.bg,
              borderColor: badge.color + '30',
              opacity,
              transform: [{ translateY }, { scale: pulseAnims[i] }],
            }]}
          >
            <View style={[trustStyles.iconCircle, { backgroundColor: badge.color + '20' }]}>
              <Ionicons name={badge.icon} size={18} color={badge.color} />
            </View>
            <Text style={[trustStyles.text, { color: badge.color }]}>
              {language === 'ar' ? badge.labelAr : badge.labelEn}
            </Text>
          </RNAnimated.View>
        );
      })}
    </View>
  );
}

const trustStyles = StyleSheet.create({
  row: {
    marginHorizontal: 16,
    marginTop: 12,
    gap: 6,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Cairo_600SemiBold',
    fontSize: 9,
    textAlign: 'center',
  },
});

const isTablet = width >= 768;
const tabletImageWidth = Math.round(width * 0.45);

export default function ProductDetailScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;
  const { addToCart, cart, getCheckoutUrl, replaceCartWith, isLoading: cartLoading } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { t, isRTL, formatCurrency, language } = useLanguage();
  const { colors, isDark } = useTheme();
  const { customer, isLoggedIn } = useAuth();
  const styles = getStyles(colors);
  const { recentProducts, addToRecentlyViewed } = useRecentlyViewed();

  const { data: homepage } = useQuery({
    queryKey: ['homepage'],
    queryFn: () => api.getHomepage(),
    staleTime: 30 * 60 * 1000,
  });

  const rawLogoUrl = homepage?.settings?.logoUrl;
  const rawLogoDarkUrl = homepage?.settings?.logoDarkUrl;
  const resolveUrl = (url: string | undefined | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const host = process.env.EXPO_PUBLIC_DOMAIN;
    if (!host) return null;
    return `https://${host}${url}`;
  };
  const logoUrl = resolveUrl(isDark ? (rawLogoDarkUrl || rawLogoUrl) : rawLogoUrl);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', handle, language],
    queryFn: () => api.getProduct(handle as string, language),
    enabled: !!handle,
  });

  const [interactionReady, setInteractionReady] = useState(false);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [showBuyNowModal, setShowBuyNowModal] = useState(false);
  const [fullScreenIdx, setFullScreenIdx] = useState(0);
  const [showCartToast, setShowCartToast] = useState(false);
  const toastAnim = useRef(new RNAnimated.Value(-120)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 8,
      onPanResponderMove: (_, gs) => {
        if (gs.dy < 0) toastAnim.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy < -30) {
          if (toastTimer.current) clearTimeout(toastTimer.current);
          RNAnimated.timing(toastAnim, { toValue: -120, duration: 150, useNativeDriver: Platform.OS !== 'web' }).start(() => setShowCartToast(false));
        } else {
          RNAnimated.spring(toastAnim, { toValue: 0, useNativeDriver: Platform.OS !== 'web', tension: 80 }).start();
        }
      },
    })
  ).current;

  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [toastVisible, setToastVisible] = useState(false);

  const showToastMsg = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
  };

  const { data: collections } = useQuery({
    queryKey: ['collections', language],
    queryFn: () => api.getCollections(language),
    staleTime: 30 * 60 * 1000,
  });

  const allImages = product?.images?.edges?.map((e: any) => e.node) || [];
  const variants = product?.variants?.edges?.map((e: any) => e.node) || [];

  const colorVariants = isColorVariant(variants);

  const images = allImages;

  useEffect(() => {
    if (variants.length > 0 && allImages.length > 0) {
      const firstVariant = variants[0];
      if (firstVariant?.image?.url) {
        const imgIdx = allImages.findIndex((img: any) => img.url === firstVariant.image.url);
        if (imgIdx > 0) {
          setActiveImageIdx(imgIdx);
        }
      }
    }
  }, [product?.id]);

  const selectVariant = (i: number) => {
    setSelectedVariantIdx(i);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const v = variants[i];
    if (v?.image?.url) {
      const imgIdx = allImages.findIndex((img: any) => img.url === v.image.url);
      if (imgIdx >= 0) {
        setActiveImageIdx(imgIdx);
      }
    }
  };

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setInteractionReady(true);
    });
    return () => task.cancel();
  }, []);

  const { data: relatedProducts } = useQuery({
    queryKey: ['related-products', product?.vendor, product?.productType, language],
    queryFn: () => {
      const q = product?.vendor ? `vendor:${product.vendor}` : (product?.productType ? `product_type:${product.productType}` : '');
      return api.getProducts({ first: '10', query: q }, language);
    },
    enabled: !!product && interactionReady,
    staleTime: 5 * 60 * 1000,
  });

  const filteredRelated = (relatedProducts || []).filter((p: any) => p.handle !== handle && p.availableForSale !== false).slice(0, 8);

  const recentlyViewedFiltered = recentProducts.filter(p => p.handle !== handle).slice(0, 10);

  useEffect(() => {
    if (!product) return;
    addToRecentlyViewed({
      handle: product.handle,
      title: product.title,
      imageUrl: product.images?.edges?.[0]?.node?.url,
      price: product.priceRange?.minVariantPrice?.amount || '0',
      currencyCode: product.priceRange?.minVariantPrice?.currencyCode || 'JOD',
      compareAtPrice: product.compareAtPriceRange?.minVariantPrice?.amount,
      availableForSale: product.availableForSale,
      vendor: product.vendor,
    });
  }, [product?.handle]);

  if (isLoading || !product) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const selectedVariant = variants[selectedVariantIdx] || variants[0];
  const maxQuantity = selectedVariant?.quantityAvailable != null ? selectedVariant.quantityAvailable : 99;
  const price = selectedVariant?.price?.amount || product.priceRange.minVariantPrice.amount;
  const currency = selectedVariant?.price?.currencyCode || product.priceRange.minVariantPrice.currencyCode;
  const buildCartInfo = () => ({
    productTitle: product.title || '',
    productHandle: product.handle || '',
    variantTitle: selectedVariant?.title !== 'Default Title' ? selectedVariant?.title : undefined,
    price: price,
    currencyCode: currency,
    imageUrl: selectedVariant?.image?.url || (product.images?.edges?.[0]?.node?.url ?? null),
    maxQuantity: maxQuantity,
  });
  const compareAtPrice = selectedVariant?.compareAtPrice?.amount || product.compareAtPriceRange?.minVariantPrice?.amount;
  const hasDiscount = compareAtPrice && parseFloat(compareAtPrice) > parseFloat(price);
  const discountPercent = hasDiscount
    ? Math.round(((parseFloat(compareAtPrice!) - parseFloat(price)) / parseFloat(compareAtPrice!)) * 100)
    : 0;

  const inWishlist = isInWishlist(product.handle);

  const showToast = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setShowCartToast(true);
    RNAnimated.spring(toastAnim, {
      toValue: 0,
      useNativeDriver: Platform.OS !== 'web',
      tension: 80,
      friction: 10,
    }).start();
    toastTimer.current = setTimeout(() => {
      RNAnimated.timing(toastAnim, {
        toValue: -120,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => setShowCartToast(false));
    }, 3500);
  };

  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return;
    setAdding(true);
    try {
      await addToCart(selectedVariant.id, quantity, buildCartInfo());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast();
      setQuantity(1);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setAdding(false);
  };

  const handleBuyNow = () => {
    if (!selectedVariant?.id || !product) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const cartLines = cart?.lines?.edges?.map((e: any) => e.node) || [];
    if (cartLines.length > 0) {
      setShowBuyNowModal(true);
    } else {
      router.push({
        pathname: '/cod-order',
        params: {
          handle: product.handle,
          variantId: selectedVariant.id,
          qty: String(quantity),
        },
      });
    }
  };

  const handleBuyOnlyThis = async () => {
    setShowBuyNowModal(false);
    setBuyingNow(true);
    try {
      await replaceCartWith(selectedVariant!.id, quantity, buildCartInfo());
      router.push('/cod-order');
    } catch {}
    setBuyingNow(false);
  };

  const handleAddToCartAndBuy = async () => {
    setShowBuyNowModal(false);
    setBuyingNow(true);
    try {
      await addToCart(selectedVariant!.id, quantity, buildCartInfo());
      router.push('/cod-order');
    } catch {}
    setBuyingNow(false);
  };

  const handleToggleWishlist = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleWishlist({
      handle: product.handle,
      title: product.title,
      price,
      currencyCode: currency,
      compareAtPrice,
      imageUrl: images[0]?.url,
    });
  };

  const isWhatsappOnly = product?.tags?.some((tag: string) => tag.toLowerCase() === 'whatsapp') ?? false;
  const whatsappNumber = homepage?.settings?.whatsapp || '';

  const handleWhatsApp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const productName = product.title;
    const productUrl = `https://xmart.jo/products/${product.handle}`;
    const message = language === 'ar'
      ? `مرحباً، أنا مهتم بهذا المنتج:\n${productName}\n${productUrl}`
      : `Hi, I'm interested in this product:\n${productName}\n${productUrl}`;
    const phone = (whatsappNumber || '').replace(/[^0-9]/g, '');
    if (!phone) return;
    const encodedMsg = encodeURIComponent(message);
    const waAppUrl = `whatsapp://send?phone=${phone}&text=${encodedMsg}`;
    const waWebUrl = `https://wa.me/${phone}?text=${encodedMsg}`;
    try {
      const canOpen = await Linking.canOpenURL(waAppUrl);
      if (canOpen) {
        await Linking.openURL(waAppUrl);
      } else {
        await Linking.openURL(waWebUrl);
      }
    } catch {
      await Linking.openURL(waWebUrl);
    }
  };

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const langPath = language === 'en' ? '/en' : '';
      const productUrl = `https://xmart.jo${langPath}/products/${product.handle}`;
      await Share.share({
        message: `${product.title} - ${formatCurrency(price, currency)}\n${productUrl}`,
        url: productUrl,
        title: product.title,
      });
    } catch (e) {}
  };

  const displayTitle = product.title;
  const displayVendor = product.vendor;

  const brandCollection = product.vendor && collections
    ? collections.find((c: any) => {
        const vendorLower = product.vendor.toLowerCase().trim();
        const titleLower = (c.title || '').toLowerCase().trim();
        const handleLower = (c.handle || '').toLowerCase().trim();
        const vendorHandle = vendorLower.replace(/[^a-z0-9]+/g, '-');
        return titleLower === vendorLower ||
          handleLower === vendorLower ||
          handleLower === vendorHandle;
      })
    : null;
  const brandImageUrl = (brandCollection?.image?.url) || null;

  return (
    <View style={styles.container}>
      <PageBackground isDark={isDark} />
      <Toast
        message={toastMsg}
        type={toastType}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />
      <View style={{ paddingTop: insets.top + webTopInset, backgroundColor: colors.surface }}>
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable style={styles.headerBtn} onPress={goBack} testID="back-button">
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <XmartLogoSvg width={Math.min(width * 0.233, 102)} isDark={isDark} />
        </View>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8 }}>
          <Pressable
            style={({ pressed }) => [styles.shareBtn, { backgroundColor: pressed ? 'rgba(36,140,204,0.15)' : 'rgba(36,140,204,0.08)' }]}
            onPress={handleShare}
          >
            <Ionicons name="share-social" size={18} color="#248CCC" />
          </Pressable>
          <Pressable style={styles.headerBtn} onPress={() => router.push('/search')}>
            <Ionicons name="search" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }} nestedScrollEnabled>
        <View style={isTablet ? { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start' } : undefined}>
        <View style={[styles.imageSection, isTablet && { width: width * 0.45 }]}>
          <ImageSlider
            images={images}
            activeIndex={activeImageIdx}
            onIndexChange={setActiveImageIdx}
            onImagePress={(idx) => {
              const tappedUrl = images[idx]?.url;
              const allIdx = tappedUrl ? allImages.findIndex((img: any) => img.url === tappedUrl) : 0;
              setFullScreenIdx(allIdx >= 0 ? allIdx : 0);
              setShowFullScreen(true);
            }}


          />
        </View>

        <View style={[styles.contentCard, isTablet && { flex: 1 }]}>
          <View style={[styles.titleBrandRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr', flex: 1 }]}>{displayTitle}</Text>
            {product.vendor ? (
              <Pressable
                style={[styles.vendorRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => {
                  router.push({
                    pathname: '/brand/[vendor]',
                    params: {
                      vendor: product.vendor,
                      ...(brandImageUrl ? { imageUrl: brandImageUrl } : {}),
                    },
                  });
                }}
              >
                {brandImageUrl ? (
                  <Image
                    source={{ uri: brandImageUrl }}
                    style={styles.brandImage}
                    contentFit="contain"
                    transition={200}
                  />
                ) : (
                  <Text style={styles.vendorText}>{displayVendor}</Text>
                )}
                <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={12} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.priceSection}>
            <View style={[styles.priceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {product.availableForSale ? (
                <>
                  <Text style={styles.price}>{formatCurrency(price, currency)}</Text>
                  {hasDiscount ? (
                    <>
                      <Text style={styles.comparePrice}>{formatCurrency(compareAtPrice!, currency)}</Text>
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>-{discountPercent}%</Text>
                      </View>
                    </>
                  ) : null}
                </>
              ) : (
                <Text style={styles.price}>{' '}</Text>
              )}
            </View>
          </View>

          {variants.length > 1 ? (
            <View style={styles.variantsSection}>
              <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('product.options')}</Text>
              {colorVariants ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
                  <View style={styles.variantsRow}>
                    {variants.map((v: any, i: number) => {
                      const colorHex = getColorHex(v.title);
                      const isSelected = i === selectedVariantIdx;
                      const isWhite = colorHex?.toUpperCase() === '#FFFFFF' || colorHex?.toUpperCase() === '#FFFFF0' || colorHex?.toUpperCase() === '#FFFDD0';
                      return (
                        <Pressable
                          key={v.id}
                          style={[styles.colorVariantChip, isSelected && styles.colorVariantChipActive, !v.availableForSale && styles.variantChipDisabled]}
                          onPress={() => { if (v.availableForSale) selectVariant(i); }}
                        >
                          <View style={[
                            styles.colorSwatch,
                            { backgroundColor: colorHex || colors.textMuted },
                            isWhite && { borderWidth: 1, borderColor: colors.border },
                            isSelected && styles.colorSwatchActive,
                          ]}>
                            {isSelected ? (
                              <Ionicons name="checkmark" size={14} color={isWhite ? '#000' : '#fff'} />
                            ) : null}
                          </View>
                          <Text style={[styles.colorName, isSelected && styles.colorNameActive]}>{v.title}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
                  <View style={styles.variantsRow}>
                    {variants.map((v: any, i: number) => (
                      <Pressable
                        key={v.id}
                        style={[styles.variantChip, i === selectedVariantIdx && styles.variantChipActive, !v.availableForSale && styles.variantChipDisabled]}
                        onPress={() => { if (v.availableForSale) selectVariant(i); }}
                      >
                        <Text style={[styles.variantChipText, i === selectedVariantIdx && styles.variantChipTextActive]}>
                          {v.title}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              )}
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <StockBadge available={product.availableForSale} colors={colors} isRTL={isRTL} t={t} />
                <RatingBadge ratingValue={product.ratingValue?.value} ratingCount={product.ratingCount?.value} colors={colors} isRTL={isRTL} />
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <StockBadge available={product.availableForSale} colors={colors} isRTL={isRTL} t={t} />
              <RatingBadge ratingValue={product.ratingValue?.value} ratingCount={product.ratingCount?.value} colors={colors} isRTL={isRTL} />
            </View>
          )}

        </View>
        </View>

        <TrustBadges colors={colors} language={language} isRTL={isRTL} price={parseFloat(price)} />

        {(product.descriptionHtml || product.description) ? (
          <View style={[styles.descCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <View style={[styles.descHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.descAccent, { backgroundColor: '#248CCC' }]} />
              <Ionicons name="document-text" size={18} color="#248CCC" />
              <Text style={[styles.descTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('product.description')}</Text>
            </View>
            <View style={[styles.descDivider, { backgroundColor: colors.border }]} />
            <HtmlDescription
              html={product.descriptionHtml || product.description}
              colors={colors}
              isRTL={isRTL}
            />
          </View>
        ) : null}

        {selectedVariant?.sku ? (
          <Text style={{ fontSize: 11, color: colors.textSecondary, opacity: 0.45, textAlign: isRTL ? 'right' : 'left', paddingHorizontal: 20, marginTop: 2, marginBottom: 8 }}>
            SKU: {selectedVariant.sku}
          </Text>
        ) : null}

        {filteredRelated.length > 0 ? (
          <View style={styles.relatedSection}>
            <Text style={[styles.sectionTitle, styles.relatedTitle, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('product.relatedProducts')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
              style={{ direction: isRTL ? 'rtl' : 'ltr' }}
              nestedScrollEnabled
            >
              {filteredRelated.map((item: any) => (
                <View key={item.handle} style={{ width: isTablet ? Math.round((width - 80) / 5) : (width - 48) / 2 }}>
                  <ProductCard
                    handle={item.handle}
                    title={item.title}
                    price={item.priceRange?.minVariantPrice?.amount || '0'}
                    currencyCode={item.priceRange?.minVariantPrice?.currencyCode || 'JOD'}
                    compareAtPrice={item.compareAtPriceRange?.minVariantPrice?.amount}
                    imageUrl={item.images?.edges?.[0]?.node?.url || ''}
                    availableForSale={item.availableForSale}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {recentlyViewedFiltered.length > 0 ? (
          <View style={styles.relatedSection}>
            <Text style={[styles.sectionTitle, styles.relatedTitle, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {language === 'ar' ? 'شاهدتها مؤخراً' : 'Recently Viewed'}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
              style={{ direction: isRTL ? 'rtl' : 'ltr' }}
              nestedScrollEnabled
            >
              {recentlyViewedFiltered.map((item: any) => (
                <View key={item.handle} style={{ width: isTablet ? Math.round((width - 80) / 5) : (width - 48) / 2 }}>
                  <ProductCard
                    handle={item.handle}
                    title={item.title}
                    price={item.price}
                    currencyCode={item.currencyCode}
                    compareAtPrice={item.compareAtPrice}
                    imageUrl={item.imageUrl || ''}
                    availableForSale={item.availableForSale}
                    vendor={item.vendor}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      {!isWhatsappOnly && whatsappNumber ? (
        <WhatsAppFloatingButton
          onPress={handleWhatsApp}
          bottom={insets.bottom + webBottomInset + 130}
          isRTL={isRTL}
        />
      ) : null}

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + webBottomInset + 8 }]}>
        {isWhatsappOnly ? (
          <View style={[styles.bottomButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Pressable
              style={({ pressed }) => [
                styles.wishlistBtn,
                { opacity: pressed ? 0.85 : 1, borderColor: inWishlist ? '#E53935' : colors.border },
              ]}
              onPress={handleToggleWishlist}
            >
              <Ionicons name={inWishlist ? "heart" : "heart-outline"} size={22} color={inWishlist ? '#C75050' : colors.text} />
            </Pressable>
            <Pressable
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                backgroundColor: '#25D366',
                borderRadius: 14,
                paddingVertical: 14,
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
              onPress={handleWhatsApp}
            >
              <Ionicons name="logo-whatsapp" size={22} color="#fff" />
              <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 15, color: '#fff' }}>
                {language === 'ar' ? 'اطلب عبر واتساب' : 'Order via WhatsApp'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={[styles.qtyRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.qtyLabel, { color: colors.textMuted }]}>
                {language === 'ar' ? 'الكمية' : 'Quantity'}
              </Text>
              <View style={[styles.qtySelector, { borderColor: colors.border }]}>
                <Pressable
                  style={styles.qtySelectorBtn}
                  onPress={() => { if (quantity > 1) { setQuantity(q => q - 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
                >
                  <Ionicons name="remove" size={16} color={quantity > 1 ? colors.text : colors.textMuted} />
                </Pressable>
                <Text style={[styles.qtySelectorText, { color: colors.text }]}>{quantity}</Text>
                <Pressable
                  style={styles.qtySelectorBtn}
                  onPress={() => { if (quantity < maxQuantity) { setQuantity(q => q + 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
                >
                  <Ionicons name="add" size={16} color={quantity < maxQuantity ? colors.text : colors.textMuted} />
                </Pressable>
              </View>
            </View>
            <View style={[styles.bottomButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Pressable
                style={({ pressed }) => [
                  styles.wishlistBtn,
                  { opacity: pressed ? 0.85 : 1, borderColor: inWishlist ? '#E53935' : colors.border },
                ]}
                onPress={handleToggleWishlist}
              >
                <Ionicons name={inWishlist ? "heart" : "heart-outline"} size={22} color={inWishlist ? '#C75050' : colors.text} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.addToCartBtn,
                  { opacity: pressed ? 0.9 : 1 },
                  (!product.availableForSale || !selectedVariant?.availableForSale) && styles.disabledBtn,
                ]}
                onPress={handleAddToCart}
                disabled={!product.availableForSale || !selectedVariant?.availableForSale || adding}
              >
                {adding ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cart" size={18} color="#fff" />
                    <Text style={styles.btnText}>
                      {product.availableForSale ? t('product.addToCart') : t('product.outOfStock')}
                    </Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.buyNowBtn,
                  { opacity: pressed ? 0.9 : 1 },
                  (!product.availableForSale || !selectedVariant?.availableForSale) && styles.disabledBtn,
                ]}
                onPress={handleBuyNow}
                disabled={!product.availableForSale || !selectedVariant?.availableForSale || buyingNow}
              >
                {buyingNow ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="flash" size={18} color={colors.primary} />
                    <Text style={styles.buyNowText}>{t('product.buyNow')}</Text>
                  </>
                )}
              </Pressable>
            </View>
          </>
        )}
      </View>

      <FullScreenImageViewer
        images={allImages}
        visible={showFullScreen}
        initialIndex={fullScreenIdx}
        onClose={() => setShowFullScreen(false)}
      />

      <Modal
        visible={showBuyNowModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBuyNowModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setShowBuyNowModal(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: insets.bottom + webBottomInset + 24,
            }}
          >
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 18 }} />
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: isDark ? 'rgba(36,140,204,0.15)' : 'rgba(36,140,204,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Ionicons name="cart" size={26} color="#248CCC" />
              </View>
              <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 17, color: colors.text, textAlign: 'center', writingDirection: isRTL ? 'rtl' : 'ltr' }}>
                {language === 'ar' ? 'لديك أغراض في السلة' : 'You have items in cart'}
              </Text>
              <Text style={{ fontFamily: 'Cairo_400Regular', fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 4, writingDirection: isRTL ? 'rtl' : 'ltr', paddingHorizontal: 10 }}>
                {language === 'ar'
                  ? 'كيف تحب تكمل طلبك؟'
                  : 'How would you like to proceed?'}
              </Text>
            </View>

            <Pressable
              onPress={handleAddToCartAndBuy}
              style={({ pressed }) => ({
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                backgroundColor: '#248CCC',
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 18,
                gap: 12,
                marginBottom: 10,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="add-circle" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 15, color: '#fff', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }}>
                  {language === 'ar' ? 'أضف على السلة واطلب الكل' : 'Add to cart & order all'}
                </Text>
                <Text style={{ fontFamily: 'Cairo_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.8)', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }}>
                  {language === 'ar' ? 'اطلب هذا المنتج مع باقي السلة' : 'Order this product with your cart items'}
                </Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="rgba(255,255,255,0.6)" />
            </Pressable>

            <Pressable
              onPress={handleBuyOnlyThis}
              style={({ pressed }) => ({
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(22,50,89,0.06)',
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 18,
                gap: 12,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: isDark ? 'rgba(229,57,53,0.15)' : 'rgba(229,57,53,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="swap-horizontal" size={20} color="#E53935" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 15, color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }}>
                  {language === 'ar' ? 'استبدل السلة بهذا المنتج' : 'Replace cart with this product'}
                </Text>
                <Text style={{ fontFamily: 'Cairo_400Regular', fontSize: 11, color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }}>
                  {language === 'ar' ? 'حذف السلة الحالية واطلب هذا المنتج فقط' : 'Clear current cart and order only this'}
                </Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textMuted} />
            </Pressable>

            <Pressable
              onPress={() => setShowBuyNowModal(false)}
              style={({ pressed }) => ({
                alignItems: 'center',
                paddingVertical: 10,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: colors.textSecondary }}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {showCartToast && (
        <RNAnimated.View
          {...toastPan.panHandlers}
          style={[
            toastStyles.container,
            {
              top: insets.top + (Platform.OS === 'web' ? 67 : 0) + 8,
              transform: [{ translateY: toastAnim }],
              backgroundColor: colors.card,
              borderColor: colors.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          {allImages[0]?.url ? (
            <Image source={{ uri: allImages[0].url }} style={toastStyles.image} contentFit="cover" />
          ) : (
            <View style={[toastStyles.image, { backgroundColor: colors.surfaceLight }]}>
              <Ionicons name="cart" size={20} color={colors.textSecondary} />
            </View>
          )}
          <View style={[toastStyles.info, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={[toastStyles.title, { color: colors.text }]}>{t('product.addedToCart')}</Text>
            </View>
            <Text numberOfLines={1} style={[toastStyles.productName, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {product.title}
            </Text>
          </View>
          <Pressable
            style={toastStyles.viewCartBtn}
            onPress={() => {
              if (toastTimer.current) clearTimeout(toastTimer.current);
              RNAnimated.timing(toastAnim, { toValue: -120, duration: 200, useNativeDriver: Platform.OS !== 'web' }).start(() => setShowCartToast(false));
              router.push('/(tabs)/cart');
            }}
          >
            <Text style={toastStyles.viewCartText}>{t('product.viewCart')}</Text>
          </Pressable>
        </RNAnimated.View>
      )}
    </View>
  );
}

function stripExternalStyles(rawHtml: string): string {
  let cleaned = rawHtml;
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  cleaned = cleaned.replace(/<link[^>]*stylesheet[^>]*\/?>/gi, '');
  cleaned = cleaned.replace(/ style="[^"]*"/gi, '');
  cleaned = cleaned.replace(/ style='[^']*'/gi, '');
  cleaned = cleaned.replace(/ class="[^"]*"/gi, '');
  cleaned = cleaned.replace(/ class='[^']*'/gi, '');
  cleaned = cleaned.replace(/ data-[a-z-]+="[^"]*"/gi, '');
  cleaned = cleaned.replace(/ lang="[^"]*"/gi, '');
  cleaned = cleaned.replace(/ dir="[^"]*"/gi, '');
  return cleaned;
}

function HtmlDescription({ html, colors, isRTL }: { html: string; colors: typeof Colors.dark; isRTL: boolean }) {
  const [webViewHeight, setWebViewHeight] = useState(isTablet ? 200 : 100);
  const isWeb = Platform.OS === 'web';

  const cleanHtml = stripExternalStyles(html);

  const wrappedHtml = `
    <!DOCTYPE html>
    <html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${isRTL ? 'ar' : 'en'}">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Cairo', sans-serif !important; }
        body {
          font-family: 'Cairo', sans-serif !important;
          font-size: 14.5px;
          line-height: 1.85;
          color: ${colors.textSecondary};
          background: transparent;
          direction: ${isRTL ? 'rtl' : 'ltr'};
          text-align: ${isRTL ? 'right' : 'left'};
          padding: 14px 16px;
          overflow: hidden;
        }
        div, span, section, article, aside, header, footer, main, nav { display: block; }
        p { margin-bottom: 10px; }
        ul, ol {
          padding-${isRTL ? 'right' : 'left'}: 22px;
          margin-bottom: 10px;
        }
        li {
          margin-bottom: 6px;
          position: relative;
          display: list-item;
        }
        ul li::marker { color: #248CCC; }
        h1, h2, h3, h4, h5, h6 {
          color: ${colors.text};
          font-weight: 700;
          margin-bottom: 8px;
          margin-top: 14px;
          letter-spacing: -0.2px;
        }
        h1 { font-size: 20px; }
        h2 { font-size: 18px; border-bottom: 2px solid rgba(36,140,204,0.2); padding-bottom: 6px; }
        h3 { font-size: 16px; }
        h4, h5, h6 { font-size: 15px; }
        strong, b { color: ${colors.text}; font-weight: 700; }
        a { color: #248CCC; text-decoration: none; border-bottom: 1px solid rgba(36,140,204,0.3); }
        a:hover { border-bottom-color: #248CCC; }
        img { max-width: 100%; height: auto; border-radius: 10px; margin: 10px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        table {
          width: 100% !important;
          border-collapse: separate;
          border-spacing: 0;
          margin: 12px 0;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid ${colors.border};
        }
        th, td {
          padding: 10px 14px !important;
          text-align: ${isRTL ? 'right' : 'left'} !important;
          font-size: 13px !important;
          border-bottom: 1px solid ${colors.border};
          background: transparent !important;
        }
        th {
          background: rgba(36,140,204,0.08) !important;
          color: ${colors.text};
          font-weight: 700;
          font-size: 13.5px !important;
        }
        tr:last-child td { border-bottom: none; }
        tr:nth-child(even) td { background: rgba(0,0,0,0.015) !important; }
        blockquote {
          border-${isRTL ? 'right' : 'left'}: 4px solid #248CCC;
          padding: 12px 16px;
          margin: 12px 0;
          background: rgba(36,140,204,0.06);
          border-radius: 0 8px 8px 0;
          font-style: italic;
        }
        hr {
          border: none;
          height: 1px;
          background: linear-gradient(90deg, transparent, ${colors.border}, transparent);
          margin: 16px 0;
        }
        code {
          background: rgba(36,140,204,0.08);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 13px;
        }
        ::selection { background: rgba(36,140,204,0.2); }
      </style>
    </head>
    <body>${cleanHtml}</body>
    </html>
  `;

  if (isWeb) {
    return (
      <View>
        <iframe
          srcDoc={wrappedHtml}
          style={{
            width: '100%',
            minHeight: 150,
            border: 'none',
            overflow: 'hidden',
          } as any}
          onLoad={(e: any) => {
            try {
              const doc = e.target.contentDocument || e.target.contentWindow?.document;
              if (doc?.body) {
                e.target.style.height = doc.body.scrollHeight + 'px';
              }
            } catch {}
          }}
        />
      </View>
    );
  }

  return (
    <WebView
      source={{ html: wrappedHtml }}
      style={{ height: webViewHeight, backgroundColor: 'transparent' }}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      originWhitelist={['*']}
      onMessage={(event) => {
        const h = parseInt(event.nativeEvent.data, 10);
        if (h > 0) setWebViewHeight(h + 16);
      }}
      injectedJavaScript={`
        function sendHeight() {
          const h = document.body.scrollHeight;
          window.ReactNativeWebView.postMessage(String(h));
        }
        setTimeout(sendHeight, 300);
        setTimeout(sendHeight, 800);
        setTimeout(sendHeight, 1500);
        true;
      `}
    />
  );
}

function getImgStyles(colors: typeof Colors.dark, sliderWidth: number) {
  return StyleSheet.create({
    sliderContainer: {
      backgroundColor: '#fff',
    },
    image: {
      width: sliderWidth,
      height: sliderWidth * 0.85,
      backgroundColor: '#fff',
    },
    placeholder: {
      width: sliderWidth,
      height: sliderWidth * 0.85,
      backgroundColor: colors.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      backgroundColor: '#fff',
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(0,0,0,0.18)',
    },
    dotActive: {
      width: 18,
      backgroundColor: '#555',
    },
    arrowBtn: {
      position: 'absolute',
      top: '50%',
      marginTop: -16,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(0,0,0,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    counterBadge: {
      position: 'absolute',
      bottom: 8,
      alignSelf: 'center',
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    counterText: {
      color: '#fff',
      fontSize: 11,
      fontFamily: 'Cairo_400Regular',
    },
  });
}

function getStyles(colors: typeof Colors.dark) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 10,
      paddingTop: 10,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      zIndex: 10,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerLogo: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 22,
      color: colors.primary,
      letterSpacing: 1,
    },
    headerLogoImage: {
      width: Math.min(width * 0.35, 150),
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    logoImage: {
      width: '100%',
      height: '100%',
    },
    headerBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    shareBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(36,140,204,0.25)',
    },
    imageSection: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    contentCard: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 6,
    },
    titleBrandRow: {
      alignItems: 'flex-start',
      gap: 8,
    },
    title: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 17,
      color: colors.text,
      lineHeight: 24,
    },
    vendorRow: {
      alignItems: 'center',
      gap: 5,
      paddingVertical: 3,
      paddingHorizontal: 8,
      backgroundColor: colors.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    brandImage: {
      width: 50,
      height: 22,
    },
    vendorText: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 12,
      color: colors.textSecondary,
    },
    priceSection: {
      gap: 4,
    },
    priceRow: {
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    price: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 20,
      color: colors.primary,
    },
    comparePrice: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 16,
      color: colors.textMuted,
      textDecorationLine: 'line-through',
    },
    discountBadge: {
      backgroundColor: '#F57C00',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    discountText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 12,
      color: '#fff',
    },
    stockRow: {
      alignItems: 'center',
      gap: 4,
    },
    stockText: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 12,
    },
    variantsSection: {
      gap: 4,
    },
    sectionTitle: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 14,
      color: colors.text,
    },
    variantsRow: {
      flexDirection: 'row',
      gap: 6,
    },
    colorVariantChip: {
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    colorVariantChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '0D',
    },
    colorSwatch: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorSwatchActive: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    colorName: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    colorNameActive: {
      fontFamily: 'Cairo_600SemiBold',
      color: colors.primary,
    },
    variantChip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    variantChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '1A',
    },
    variantChipDisabled: {
      opacity: 0.4,
    },
    variantChipText: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 13,
      color: colors.textSecondary,
    },
    variantChipTextActive: {
      color: colors.primary,
    },
    descCard: {
      marginHorizontal: isTablet ? 40 : 16,
      marginTop: 12,
      padding: 0,
      borderRadius: 14,
      borderWidth: 1,
      overflow: 'hidden',
    },
    descHeader: {
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    descAccent: {
      width: 4,
      height: 20,
      borderRadius: 2,
    },
    descTitle: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 16,
      flex: 1,
    },
    descDivider: {
      height: 1,
      marginHorizontal: 16,
    },
    descText: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 14,
      lineHeight: 24,
      color: colors.textSecondary,
    },
    relatedSection: {
      marginTop: 20,
      gap: 12,
    },
    relatedTitle: {
      paddingHorizontal: 16,
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 16,
      paddingTop: 10,
    },
    qtyRow: {
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 10,
      marginBottom: 10,
    },
    qtyLabel: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 14,
    },
    qtySelector: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: 10,
      height: 38,
      overflow: 'hidden',
    },
    qtySelectorBtn: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qtySelectorText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 16,
      minWidth: 28,
      textAlign: 'center',
    },
    bottomButtons: {
      gap: 10,
      alignItems: 'center',
    },
    wishlistBtn: {
      width: 48,
      height: 48,
      borderRadius: 12,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addToCartBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 13,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    buyNowBtn: {
      flex: 1,
      backgroundColor: 'transparent',
      borderRadius: 12,
      paddingVertical: 13,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    disabledBtn: {
      backgroundColor: colors.textMuted,
      borderColor: colors.textMuted,
    },
    btnText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 14,
      color: '#fff',
    },
    buyNowText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 14,
      color: colors.primary,
    },
  });
}

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    zIndex: 999,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
      web: { boxShadow: '0 4px 20px rgba(0,0,0,0.15)' } as any,
    }),
  },
  image: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 13,
  },
  productName: {
    fontFamily: 'Cairo_400Regular',
    fontSize: 12,
  },
  viewCartBtn: {
    backgroundColor: '#248CCC',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  viewCartText: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 12,
    color: '#fff',
  },
});
