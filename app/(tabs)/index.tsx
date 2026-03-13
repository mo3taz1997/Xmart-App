import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import ProductSliderSection from '@/components/ProductSliderSection';
import {
  View, Text, ScrollView, FlatList, Pressable, StyleSheet, Dimensions,
  RefreshControl, Platform, ActivityIndicator,
  Animated as RNAnimated, Easing, LayoutChangeEvent,
} from 'react-native';
import { Image } from 'expo-image';
import XmartLogoSvg from '@/components/XmartLogoSvg';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';
import { BannerSkeleton } from '@/components/SkeletonLoader';
import { useLanguage } from '@/contexts/LanguageContext';
import { tabEvents } from '@/lib/tabEvents';
import PageBackground from '@/components/PageBackground';
import ProductCard from '@/components/ProductCard';
import { useNotifications } from '@/contexts/NotificationContext';

const { width, height: screenHeight } = Dimensions.get('window');

const lazySectionRegistry = new Set<() => void>();
function notifyLazySections() {
  lazySectionRegistry.forEach(fn => fn());
}

function LazySection({ children, estimatedHeight = 280, scrollY }: {
  children: React.ReactNode;
  estimatedHeight?: number;
  scrollY: React.MutableRefObject<number>;
}) {
  const [mounted, setMounted] = useState(false);
  const layoutY = useRef(0);
  const measuredH = useRef(estimatedHeight);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    layoutY.current = e.nativeEvent.layout.y;
    const h = e.nativeEvent.layout.height;
    if (h > 10) measuredH.current = h;
    if (!mounted) {
      const viewportBottom = scrollY.current + screenHeight * 2;
      if (layoutY.current < viewportBottom) {
        setMounted(true);
      }
    }
  }, [scrollY, mounted]);

  useEffect(() => {
    const check = () => {
      if (layoutY.current <= 0) return;
      const sy = scrollY.current;
      const top = layoutY.current;
      const bottom = top + measuredH.current;
      const inRange = top < sy + screenHeight * 2.5 && bottom > sy - screenHeight * 2;
      if (inRange && !mounted) {
        setMounted(true);
      } else if (!inRange && mounted) {
        setMounted(false);
      }
    };
    lazySectionRegistry.add(check);
    return () => { lazySectionRegistry.delete(check); };
  }, [mounted, scrollY]);

  if (mounted) return <View onLayout={onLayout}>{children}</View>;

  return (
    <View onLayout={onLayout} style={{ minHeight: measuredH.current }} />
  );
}

const FlatListGap10 = () => <View style={{ width: 10 }} />;

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (!DOMAIN) return null;
  return `https://${DOMAIN}${url}`;
}


function JordanFlagBadge() {
  const expandAnim = useRef(new RNAnimated.Value(0)).current;
  const isOpen = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = () => {
    isOpen.current = true;
    RNAnimated.spring(expandAnim, { toValue: 1, useNativeDriver: false, tension: 80, friction: 10 }).start();
  };

  const close = () => {
    RNAnimated.spring(expandAnim, { toValue: 0, useNativeDriver: false, tension: 80, friction: 10 }).start(() => {
      isOpen.current = false;
    });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (timerRef.current) clearTimeout(timerRef.current);

    if (isOpen.current) {
      close();
    } else {
      open();
      timerRef.current = setTimeout(close, 2000);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const animatedWidth = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 80] });
  const textOpacity = expandAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });

  return (
    <Pressable onPress={handlePress}>
      <RNAnimated.View style={{
        width: animatedWidth, height: 22, borderRadius: 4, overflow: 'hidden',
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#163259',
        borderWidth: 1, borderColor: expandAnim.interpolate({ inputRange: [0, 1], outputRange: ['transparent', 'rgba(36,140,204,0.45)'] }),
      }}>
        <View style={{ width: 30, height: 20, borderRadius: 3, overflow: 'hidden', flexShrink: 0 }} pointerEvents="none">
          <Image
            source={{ uri: 'https://flagcdn.com/w160/jo.png' }}
            style={{ width: 30, height: 20 }}
            contentFit="fill"
          />
        </View>
        <RNAnimated.View style={{ opacity: textOpacity, flex: 1, alignItems: 'center', justifyContent: 'center', height: 22 }}>
          <Text style={{ color: '#fff', fontFamily: 'Cairo_700Bold', fontSize: 9, lineHeight: 22, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false }}>#محلي</Text>
        </RNAnimated.View>
      </RNAnimated.View>
    </Pressable>
  );
}

const SelectedCategoriesSection = React.memo(function SelectedCategoriesSection({ section, language, colors, isDark, isRTL }: {
  section: any; language: string; colors: any; isDark: boolean; isRTL: boolean;
}) {
  const cats: any[] = section.selectedCategories || [];
  if (cats.length === 0) return null;
  const title = (language === 'ar' ? section.titleAr : section.titleEn) || '';
  const isTablet = width >= 768;
  const circleSize = Math.round(isTablet ? width * 0.11 : width * 0.185);
  return (
    <View style={{ marginTop: 10 }}>
      {!!title && (
        <Text style={{
          fontFamily: 'Cairo_700Bold', fontSize: 17, color: colors.text,
          marginHorizontal: 16, marginBottom: 8,
          textAlign: isRTL ? 'right' : 'left',
          writingDirection: isRTL ? 'rtl' : 'ltr',
        }}>{title}</Text>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8, flexDirection: 'row' }}
        style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
      >
        {cats.map((cat: any) => {
          const catTitle = (language === 'ar' ? cat.titleAr : cat.titleEn) || '';
          const imgUrl = resolveAssetUrl(cat.imageUrl) || cat.imageUrl;
          return (
            <Pressable
              key={cat.id}
              style={({ pressed }) => ({
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1,
                width: circleSize + 12,
                transform: [{ scaleX: isRTL ? -1 : 1 }, { scale: pressed ? 0.95 : 1 }],
              })}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (cat.collectionHandle) {
                  router.push({ pathname: '/collection/[handle]', params: { handle: cat.collectionHandle } });
                }
              }}
            >
              <View style={{
                width: circleSize,
                height: circleSize,
                borderRadius: circleSize / 2,
                overflow: 'hidden',
              }}>
                {imgUrl ? (
                  <Image source={{ uri: imgUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" transition={0} />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(36,140,204,0.12)' : 'rgba(22,50,89,0.06)' }}>
                    <Ionicons name="grid-outline" size={32} color={colors.primary} />
                  </View>
                )}
              </View>
              <Text style={{
                fontFamily: 'Cairo_600SemiBold',
                fontSize: 11,
                color: colors.text,
                textAlign: 'center',
                writingDirection: isRTL ? 'rtl' : 'ltr',
                marginTop: 6,
                width: circleSize + 12,
                lineHeight: 14,
              }} numberOfLines={2}>{catTitle}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});

const CARD_COL_W = Math.floor((width - 40) / 2);
const IS_TABLET_HOME = width >= 768;
const HSCROLL_CARD_W = Math.round(IS_TABLET_HOME ? (width - 80) / 5 : width * 0.4);

const TAB_PALETTE = [
  { bg: '#163259', shadow: '#163259' },
  { bg: '#E8720C', shadow: '#E8720C' },
  { bg: '#0A7B5C', shadow: '#0A7B5C' },
  { bg: '#7B2D8B', shadow: '#7B2D8B' },
  { bg: '#C0392B', shadow: '#C0392B' },
  { bg: '#D4870A', shadow: '#D4870A' },
  { bg: '#1565C0', shadow: '#1565C0' },
  { bg: '#2E7D32', shadow: '#2E7D32' },
];

function MultiCollectionTabBar({ tabs, activeIdx, onSelect, colors, isDark, isRTL, language }: {
  tabs: any[]; activeIdx: number; onSelect: (i: number) => void;
  colors: any; isDark: boolean; isRTL: boolean; language: string;
}) {
  const scaleAnims = useRef(tabs.map(() => new RNAnimated.Value(1))).current;
  const tabScrollRef = useRef<ScrollView>(null);

  const handlePress = (i: number) => {
    onSelect(i);
    RNAnimated.sequence([
      RNAnimated.spring(scaleAnims[i], { toValue: 0.91, useNativeDriver: true, speed: 80, bounciness: 0 }),
      RNAnimated.spring(scaleAnims[i], { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 8 }),
    ]).start();
    tabScrollRef.current?.scrollTo?.({ x: i * 130, animated: true });
  };

  const tabItems = tabs.map((tab: any, i: number) => {
    const isActive = i === activeIdx;
    const tabTitle = (language === 'ar' ? tab.titleAr : tab.titleEn) || tab.handle;
    const palette = TAB_PALETTE[i % TAB_PALETTE.length];
    return (
      <RNAnimated.View
        key={tab.handle + i}
        style={{ transform: [{ scale: scaleAnims[i] }] }}
      >
        <Pressable
          onPress={() => handlePress(i)}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 50,
            backgroundColor: isActive ? palette.bg : (isDark ? 'rgba(255,255,255,0.07)' : '#ffffff'),
            borderWidth: isActive ? 0 : 1.5,
            borderColor: isActive ? 'transparent' : (palette.bg + '55'),
            shadowColor: isActive ? palette.shadow : 'transparent',
            shadowOpacity: isActive ? 0.45 : 0,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 5 },
            elevation: isActive ? 8 : 0,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {isActive && (
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.7)' }} />
          )}
          <Text
            numberOfLines={1}
            style={{
              fontFamily: isActive ? 'Cairo_700Bold' : 'Cairo_600SemiBold',
              fontSize: 13,
              color: isActive ? '#ffffff' : (isDark ? 'rgba(255,255,255,0.6)' : palette.bg),
              letterSpacing: 0.1,
            }}
          >{tabTitle}</Text>
        </Pressable>
      </RNAnimated.View>
    );
  });

  return (
    <View style={{ marginBottom: 12 }}>
      <ScrollView
        ref={tabScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 8,
          alignItems: 'center',
          paddingVertical: 6,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          flexGrow: 1,
        }}
      >
        {tabItems}
      </ScrollView>
    </View>
  );
}

const BRAND_SIZES: Record<string, { w: number; h: number }> = {
  sm: { w: 75,  h: 24 },
  md: { w: 110, h: 40 },
  lg: { w: 145, h: 60 },
};

const BrandsStripSection = React.memo(function BrandsStripSection({ section, isDark, scrollY }: {
  section: any; isDark: boolean; scrollY: React.MutableRefObject<number>;
}) {
  const brands: any[] = (section.brands || []).map((b: any) => ({
    ...b,
    imageUrl: b.imageUrl ? (b.imageUrl.startsWith('http') ? b.imageUrl : (process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}${b.imageUrl}` : b.imageUrl)) : null,
  }));
  if (brands.length === 0) return null;

  const totalW = brands.reduce((sum: number, b: any) => sum + (BRAND_SIZES[b.size]?.w ?? 130), 0);
  const maxH = brands.reduce((m: number, b: any) => Math.max(m, BRAND_SIZES[b.size]?.h ?? 40), 0);
  const doubled = [...brands, ...brands, ...brands];

  const translateX = useRef(new RNAnimated.Value(0)).current;
  const currentOffset = useRef(0);
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const animRef = useRef<RNAnimated.CompositeAnimation | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const layoutY = useRef(-1);

  const onStripLayout = useCallback((e: LayoutChangeEvent) => {
    layoutY.current = e.nativeEvent.layout.y;
  }, []);

  useEffect(() => {
    const check = () => {
      if (layoutY.current < 0) return;
      const sy = scrollY.current;
      const inView = layoutY.current < sy + screenHeight * 1.3 && layoutY.current + 80 > sy - screenHeight * 0.3;
      if (inView !== isVisible) setIsVisible(inView);
    };
    lazySectionRegistry.add(check);
    return () => { lazySectionRegistry.delete(check); };
  }, [scrollY, isVisible]);

  useEffect(() => {
    if (!isVisible) {
      if (animRef.current) { animRef.current.stop(); animRef.current = null; }
      return;
    }
    const listener = translateX.addListener(({ value }) => { currentOffset.current = value; });
    const anim = RNAnimated.loop(
      RNAnimated.timing(translateX, {
        toValue: -totalW,
        duration: totalW * 22,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animRef.current = anim;
    anim.start();
    return () => { anim.stop(); translateX.removeListener(listener); animRef.current = null; };
  }, [totalW, isVisible]);

  const brandWidths = doubled.map((b: any) => BRAND_SIZES[b.size]?.w ?? 130);

  const handleTap = (locX: number) => {
    const offset = Math.abs(currentOffset.current);
    const tapInStrip = locX + offset;
    let acc = 0;
    for (let i = 0; i < doubled.length; i++) {
      acc += brandWidths[i];
      if (tapInStrip < acc) {
        const brand = doubled[i];
        if (brand.collectionHandle) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/collection/${brand.collectionHandle}`);
        } else if (brand.name) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/brand/${encodeURIComponent(brand.name)}`);
        }
        return;
      }
    }
  };

  const vPad = Math.max(4, Math.round((48 - maxH) / 2) + 4);

  return (
    <View
      onLayout={onStripLayout}
      style={{
      marginVertical: 4,
      backgroundColor: isDark ? '#111c2d' : '#ffffff',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(22,50,89,0.08)',
      paddingVertical: vPad,
      overflow: 'hidden',
    }}
      onTouchStart={(e) => {
        touchStart.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY, time: Date.now() };
      }}
      onTouchEnd={(e) => {
        if (!touchStart.current) return;
        const dx = Math.abs(e.nativeEvent.locationX - touchStart.current.x);
        const dy = Math.abs(e.nativeEvent.locationY - touchStart.current.y);
        const dt = Date.now() - touchStart.current.time;
        if (dx < 15 && dy < 15 && dt < 400) {
          handleTap(e.nativeEvent.locationX);
        }
        touchStart.current = null;
      }}
    >
      <RNAnimated.View style={{ flexDirection: 'row', transform: [{ translateX }] }} pointerEvents="none">
        {doubled.map((brand: any, i: number) => {
          const sz = BRAND_SIZES[brand.size] ?? BRAND_SIZES.md;
          return (
            <View
              key={i}
              style={{
                width: sz.w,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 6,
              }}
            >
              {brand.imageUrl ? (
                <View style={isDark ? { backgroundColor: '#ffffff', borderRadius: 6, padding: 4 } : undefined}>
                  <Image
                    source={{ uri: brand.imageUrl }}
                    style={{ width: sz.w - 28, height: sz.h }}
                    contentFit="contain"
                    transition={0}
                    cachePolicy="memory-disk"
                  />
                </View>
              ) : (
                <Text style={{
                  fontFamily: 'Cairo_700Bold',
                  fontSize: sz.h > 40 ? 15 : 12,
                  color: isDark ? '#aac4e0' : '#163259',
                  textAlign: 'center',
                  letterSpacing: 0.5,
                }}>
                  {brand.name}
                </Text>
              )}
            </View>
          );
        })}
      </RNAnimated.View>
    </View>
  );
});

const MultiCollectionSection = React.memo(function MultiCollectionSection({ section, language, colors, isDark, isRTL }: {
  section: any; language: string; colors: any; isDark: boolean; isRTL: boolean;
}) {
  const tabs: any[] = section.tabs || [];
  const [activeIdx, setActiveIdx] = useState(0);
  const contentOpacity = useRef(new RNAnimated.Value(1)).current;
  const productsScrollRef = useRef<ScrollView>(null);

  const activeTab = tabs[activeIdx];
  const { data, isLoading } = useQuery({
    queryKey: ['multi-col-products', activeTab?.handle, language],
    queryFn: () => api.getCollectionProducts(activeTab.handle, { first: '12', available: 'true' }, language),
    enabled: !!activeTab?.handle,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

  if (tabs.length === 0) return null;

  const products: any[] = (data?.products || []).filter((p: any) => p.availableForSale !== false);
  const title = (language === 'ar' ? section.titleAr : section.titleEn) || '';

  const handleSelectTab = (idx: number) => {
    Haptics.selectionAsync();
    productsScrollRef.current?.scrollTo({ x: 0, animated: true });
    if (idx === activeIdx) return;
    RNAnimated.sequence([
      RNAnimated.timing(contentOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
      RNAnimated.timing(contentOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setActiveIdx(idx);
  };

  return (
    <View style={{ marginTop: 10 }}>
      {!!title && (
        <Text style={{
          fontFamily: 'Cairo_700Bold', fontSize: 18, color: colors.text,
          marginHorizontal: 16, marginBottom: 8,
          textAlign: isRTL ? 'right' : 'left',
        }}>{title}</Text>
      )}

      <MultiCollectionTabBar
        tabs={tabs}
        activeIdx={activeIdx}
        onSelect={handleSelectTab}
        colors={colors}
        isDark={isDark}
        isRTL={isRTL}
        language={language}
      />

      <RNAnimated.View style={{ opacity: contentOpacity }}>
        {isLoading ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{
                width: HSCROLL_CARD_W, height: 260,
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                borderRadius: 14,
              }} />
            ))}
          </ScrollView>
        ) : products.length === 0 ? (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Ionicons name="cube-outline" size={36} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontFamily: 'Cairo_400Regular', fontSize: 14, marginTop: 8 }}>
              {language === 'ar' ? 'لا توجد منتجات' : 'No products found'}
            </Text>
          </View>
        ) : (
          <View style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}>
          <ScrollView
            ref={productsScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              gap: 10,
              alignItems: 'flex-start',
            }}
          >
            {products.map((item: any) => {
              const price = item.priceRange?.minVariantPrice?.amount || '0';
              const currency = item.priceRange?.minVariantPrice?.currencyCode || 'JOD';
              const compareAt = item.compareAtPriceRange?.minVariantPrice?.amount;
              const imgUrl = item.images?.edges?.[0]?.node?.url || null;
              return (
                <View key={item.id || item.handle} style={{ width: HSCROLL_CARD_W, transform: isRTL ? [{ scaleX: -1 }] : [] }}>
                  <ProductCard
                    handle={item.handle}
                    title={item.title}
                    price={price}
                    currencyCode={currency}
                    compareAtPrice={compareAt}
                    imageUrl={imgUrl}
                    availableForSale={item.availableForSale}
                    vendor={item.vendor}
                  />
                </View>
              );
            })}
            {activeTab?.handle && products.length * (HSCROLL_CARD_W + 10) + 32 > width && (
              <Pressable
                onPress={() => router.push({ pathname: '/collection/[handle]', params: { handle: activeTab.handle } })}
                style={{
                  width: HSCROLL_CARD_W * 0.55,
                  height: 220,
                  borderRadius: 16,
                  backgroundColor: TAB_PALETTE[activeIdx % TAB_PALETTE.length].bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  shadowColor: TAB_PALETTE[activeIdx % TAB_PALETTE.length].shadow,
                  shadowOpacity: 0.35,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 8,
                  alignSelf: 'center',
                  transform: isRTL ? [{ scaleX: -1 }] : [],
                }}
              >
                <View style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons
                    name={isRTL ? 'chevron-back' : 'chevron-forward'}
                    size={22} color="#fff"
                  />
                </View>
                <Text style={{
                  fontFamily: 'Cairo_700Bold',
                  fontSize: 13,
                  color: '#fff',
                  textAlign: 'center',
                  paddingHorizontal: 8,
                  lineHeight: 20,
                }}>
                  {language === 'ar' ? 'عرض\nالكل' : 'View\nAll'}
                </Text>
              </Pressable>
            )}
          </ScrollView>
          </View>
        )}
      </RNAnimated.View>
    </View>
  );
});

const SHOWCASE_INTERVAL = 3400;

const CollectionShowcaseSection = React.memo(function CollectionShowcaseSection({ section, language, colors, isDark, isRTL }: {
  section: any; language: string; colors: any; isDark: boolean; isRTL: boolean;
}) {
  const collections: any[] = section.showcaseCollections || [];
  const [activeIdx, setActiveIdx] = useState(0);
  const imgOpacity = useRef(new RNAnimated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allHandles = collections.map((c: any) => c.handle).filter(Boolean);
  const thumbCacheRef = useRef<Record<string, string[]>>({});
  const [thumbsReady, setThumbsReady] = useState(false);

  useEffect(() => {
    if (allHandles.length === 0) return;
    let cancelled = false;
    Promise.all(
      allHandles.map(async (handle: string) => {
        try {
          const res = await api.getCollectionProducts(handle, { first: '10', available: 'true' }, language);
          const prods = (res?.products || []).filter((p: any) => p.availableForSale !== false);
          const urls = prods
            .map((p: any) => p.images?.edges?.[0]?.node?.url || p.featuredImage?.url)
            .filter(Boolean);
          return { handle, urls };
        } catch { return { handle, urls: [] as string[] }; }
      })
    ).then(results => {
      if (cancelled) return;
      const cache: Record<string, string[]> = {};
      results.forEach(r => { cache[r.handle] = r.urls; });
      thumbCacheRef.current = cache;
      setThumbsReady(true);
    });
    return () => { cancelled = true; };
  }, [allHandles.join(',')]);

  if (collections.length === 0) return null;

  const sectionTitle = (language === 'ar' ? section.titleAr : section.titleEn) || '';
  const total = collections.length;
  const activeCol = collections[activeIdx];

  const advanceRef = useRef<() => void>(() => {});

  advanceRef.current = () => {
    RNAnimated.timing(imgOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setActiveIdx(prev => (prev + 1) % total);
      RNAnimated.timing(imgOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  };

  useEffect(() => {
    if (total <= 1) return;
    timerRef.current = setInterval(() => advanceRef.current(), SHOWCASE_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [total]);

  const switchTo = (idx: number) => {
    if (idx === activeIdx) return;
    Haptics.selectionAsync();
    if (timerRef.current) clearInterval(timerRef.current);
    RNAnimated.timing(imgOpacity, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setActiveIdx(idx);
      RNAnimated.timing(imgOpacity, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    });
    if (total > 1) {
      timerRef.current = setInterval(() => advanceRef.current(), SHOWCASE_INTERVAL);
    }
  };

  const isTabletCS = width >= 768;
  const cardW = width - 24;
  const listW = cardW * 0.43;
  const circleSize = isTabletCS ? cardW * 0.28 : cardW * 0.48;
  const CARD_H = isTabletCS ? 320 : 290;

  const THUMB_SIZE = 36;
  const THUMB_GAP = 5;
  const thumbRowW = listW - 32;
  const maxThumbs = Math.floor((thumbRowW + THUMB_GAP) / (THUMB_SIZE + THUMB_GAP));
  const activeThumbs = thumbsReady ? (thumbCacheRef.current[activeCol?.handle] || []).slice(0, maxThumbs) : [];

  const listPanel = (
    <View style={{ width: listW, height: CARD_H, paddingVertical: 14, paddingHorizontal: 16, justifyContent: 'space-between' }}>
      <View>
        {collections.map((col: any, i: number) => {
          const isActive = i === activeIdx;
          const colTitle = (language === 'ar' ? col.titleAr : col.titleEn) || col.handle;
          return (
            <Pressable key={col.handle + i} onPress={() => switchTo(i)} style={{ paddingVertical: 4 }}>
              <Text numberOfLines={1} style={{
                fontFamily: isActive ? 'Cairo_700Bold' : 'Cairo_400Regular',
                fontSize: 13,
                color: isActive ? colors.text : colors.textMuted,
                textAlign: isRTL ? 'right' : 'left',
                writingDirection: isRTL ? 'rtl' : 'ltr',
                lineHeight: 20,
              }}>{colTitle}</Text>
            </Pressable>
          );
        })}
      </View>

      <View>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: THUMB_GAP, marginBottom: 10, height: THUMB_SIZE }}>
          {activeThumbs.map((url: string, i: number) => (
            <View key={i} style={{
              width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 8, overflow: 'hidden',
              backgroundColor: isDark ? colors.card : '#f0f4f8',
              borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(22,50,89,0.08)',
            }}>
              <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" transition={0} />
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (activeCol?.handle) router.push({ pathname: '/collection/[handle]', params: { handle: activeCol.handle } });
          }}
          style={{
            backgroundColor: '#163259',
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 7,
            alignSelf: isRTL ? 'flex-end' : 'flex-start',
          }}
        >
          <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 12, color: '#fff' }}>
            {language === 'ar' ? 'تسوق المجموعة' : 'Shop Collection'}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const imagePanel = (
    <View style={{ flex: 1, height: CARD_H, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (activeCol?.handle) router.push({ pathname: '/collection/[handle]', params: { handle: activeCol.handle } });
        }}
      >
        <RNAnimated.View style={{ opacity: imgOpacity }}>
          <View style={{
            width: circleSize, height: circleSize,
            borderRadius: circleSize / 2,
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f4f8',
            overflow: 'hidden',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {activeCol?.imageUrl ? (
              <Image source={{ uri: activeCol.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="contain" cachePolicy="memory-disk" transition={0} />
            ) : (
              <Ionicons name="grid-outline" size={52} color={colors.primary} />
            )}
          </View>
        </RNAnimated.View>
      </Pressable>
    </View>
  );

  return (
    <View style={{ marginTop: 10 }}>
      {!!sectionTitle && (
        <Text style={{
          fontFamily: 'Cairo_700Bold', fontSize: 18, color: colors.text,
          marginHorizontal: 16, marginBottom: 6,
          textAlign: isRTL ? 'right' : 'left',
        }}>{sectionTitle}</Text>
      )}
      <View style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        marginHorizontal: 12,
        borderRadius: 18,
        backgroundColor: isDark ? colors.surface : '#F7F7F7',
        shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 }, elevation: 3,
        height: CARD_H,
        overflow: 'hidden',
      }}>
        {listPanel}
        {imagePanel}
      </View>
    </View>
  );
});

const PromoBannerSlider = React.memo(function PromoBannerSlider({ banners }: { banners: { imageUrl: string; linkType?: string; linkValue?: string; collectionHandle?: string }[] }) {
  const scrollRef = useRef<ScrollView>(null);
  const currentIndex = useRef(0);
  const isBusy = useRef(false);
  const { colors } = useTheme();
  const { isRTL } = useLanguage();
  const { bannerStyles } = getStyles(colors);

  const bannerImageWidth = width - 32;
  const loopCount = banners.length + 1;
  const scaleX = isRTL ? -1 : 1;

  const fallbackH = Math.round(bannerImageWidth * 0.48);
  const [maxBannerHeight, setMaxBannerHeight] = useState(fallbackH);
  const heightsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    heightsRef.current = {};
    setMaxBannerHeight(fallbackH);
    banners.forEach((b) => {
      if (!b.imageUrl) return;
      Image.prefetch(b.imageUrl).catch(() => {});
    });
  }, [JSON.stringify(banners.map(b => b.imageUrl))]);

  const onImageLoad = useCallback((url: string, e: any) => {
    const { width: imgW, height: imgH } = e.source || {};
    if (imgW && imgH) {
      const h = Math.round((imgH / imgW) * bannerImageWidth);
      heightsRef.current[url] = h;
      const allH = Object.values(heightsRef.current);
      const newMax = Math.max(...allH, fallbackH);
      setMaxBannerHeight(newMax);
    }
  }, [bannerImageWidth, fallbackH]);

  const updateIndex = (offsetX: number) => {
    const idx = Math.round(offsetX / width);
    if (idx >= loopCount - 1) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: 0, animated: false });
        currentIndex.current = 0;
        isBusy.current = false;
      }, 50);
    } else {
      currentIndex.current = Math.max(0, idx);
      isBusy.current = false;
    }
  };

  useEffect(() => {
    if (banners.length <= 1) return;
    currentIndex.current = 0;
    isBusy.current = false;

    const ANIM_DURATION = 380;

    const advance = () => {
      if (isBusy.current) return;
      isBusy.current = true;
      const next = currentIndex.current + 1;
      if (next >= loopCount - 1) {
        scrollRef.current?.scrollTo({ x: next * width, animated: true });
        currentIndex.current = next;
        setTimeout(() => {
          scrollRef.current?.scrollTo({ x: 0, animated: false });
          currentIndex.current = 0;
          isBusy.current = false;
        }, ANIM_DURATION + 100);
      } else {
        scrollRef.current?.scrollTo({ x: next * width, animated: true });
        currentIndex.current = next;
        setTimeout(() => { isBusy.current = false; }, ANIM_DURATION + 50);
      }
    };

    const timer = setInterval(advance, 4000);
    return () => clearInterval(timer);
  }, [banners.length, loopCount]);

  if (banners.length === 0) return null;

  const loopBanners = [...banners, banners[0]];

  return (
    <View style={[bannerStyles.container, { height: maxBannerHeight }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        style={{ transform: [{ scaleX }] }}
        onScrollBeginDrag={() => { isBusy.current = true; }}
        onScrollEndDrag={(e) => {
          updateIndex(e.nativeEvent.contentOffset.x);
        }}
        onMomentumScrollEnd={(e) => {
          updateIndex(e.nativeEvent.contentOffset.x);
        }}
      >
        {loopBanners.map((banner, i) => {
          const imgH = heightsRef.current[banner.imageUrl] || maxBannerHeight;
          return (
            <Pressable
              key={i}
              style={{ width, paddingHorizontal: 16, transform: [{ scaleX }], justifyContent: 'center', height: maxBannerHeight }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const type = banner.linkType || 'collection';
                const value = banner.linkValue || banner.collectionHandle || '';
                if (!value) return;
                if (type === 'product') {
                  router.push({ pathname: '/product/[handle]', params: { handle: value } });
                } else if (type === 'url') {
                  import('expo-web-browser').then(mod => mod.openBrowserAsync(value)).catch(() => {});
                } else {
                  router.push({ pathname: '/collection/[handle]', params: { handle: value } });
                }
              }}
            >
              <Image
                source={{ uri: banner.imageUrl }}
                style={[bannerStyles.image, { width: bannerImageWidth, height: imgH }]}
                contentFit="contain"
                transition={300}
                cachePolicy="memory-disk"
                recyclingKey={`banner-${i}`}
                priority="high"
                onLoad={(e: any) => onImageLoad(banner.imageUrl, e)}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});



export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const { t, isRTL, language, setLanguage } = useLanguage();
  const { colors, isDark, setMode } = useTheme();
  const { styles } = useMemo(() => getStyles(colors), [colors]);
  const { unreadCount, hasNewNotification, clearNewFlag, markAllRead } = useNotifications();

  const bellShake = useRef(new RNAnimated.Value(0)).current;
  const useNative = Platform.OS !== 'web';

  useEffect(() => {
    if (hasNewNotification && unreadCount > 0) {
      const shake = RNAnimated.sequence([
        RNAnimated.timing(bellShake, { toValue: 1, duration: 80, useNativeDriver: useNative }),
        RNAnimated.timing(bellShake, { toValue: -1, duration: 80, useNativeDriver: useNative }),
        RNAnimated.timing(bellShake, { toValue: 1, duration: 80, useNativeDriver: useNative }),
        RNAnimated.timing(bellShake, { toValue: -1, duration: 80, useNativeDriver: useNative }),
        RNAnimated.timing(bellShake, { toValue: 0.5, duration: 60, useNativeDriver: useNative }),
        RNAnimated.timing(bellShake, { toValue: -0.5, duration: 60, useNativeDriver: useNative }),
        RNAnimated.timing(bellShake, { toValue: 0, duration: 60, useNativeDriver: useNative }),
      ]);
      shake.start(() => clearNewFlag());
    }
  }, [hasNewNotification, unreadCount]);

  const bellRotation = bellShake.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-18deg', '18deg'],
  });

  const { data: homepage, isLoading: homepageLoading, refetch: refetchHomepage } = useQuery({
    queryKey: ['homepage', language],
    queryFn: () => api.getHomepage(language),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60 * 2,
    placeholderData: keepPreviousData,
  });

  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    qc.invalidateQueries({ queryKey: ['multi-col-products'] });
    qc.invalidateQueries({ queryKey: ['collectionProducts'] });
    await refetchHomepage();
    setRefreshing(false);
  }, [refetchHomepage, qc]);

  const heroBanners = homepage?.heroBanners || [];
  const midBanners = homepage?.midBanners || [];

  const allSections = homepage?.sections || [];
  const SECTION_TYPES = new Set(['selected_categories', 'multi_collection', 'collection_showcase', 'featured_products', 'product_slider', 'brands_strip', 'collection_products', 'static_banner', 'banner_slider']);
  const sortedSections = useMemo(() =>
    allSections
      .filter((s: any) => SECTION_TYPES.has(s.type) && s.visible !== false)
      .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [allSections]
  );
  const findSection = (type: string) => allSections.find((s: any) => s.type === type);
  const sectionVisible = (type: string) => { const s = findSection(type); return s ? s.visible !== false : true; };
  const sectionTitle = (type: string, fallback: string) => {
    const s = findSection(type);
    if (!s) return fallback;
    return (language === 'ar' ? s.titleAr : s.titleEn) || fallback;
  };

  const showHeroBanner = sectionVisible('hero_banner');
  const showMidBanner = sectionVisible('mid_banner');

  const rawLogoUrl = homepage?.settings?.logoUrl;
  const rawLogoDarkUrl = homepage?.settings?.logoDarkUrl;
  const resolveUrl = (url: string | undefined | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const host = process.env.EXPO_PUBLIC_DOMAIN;
    if (!host) return null;
    return `https://${host}${url}`;
  };
  const activeLogoUrl = isDark ? (rawLogoDarkUrl || rawLogoUrl) : rawLogoUrl;
  const logoUrl = resolveUrl(activeLogoUrl);

  const resolvedHeroBanners = heroBanners.map((b: any) => ({ ...b, imageUrl: resolveUrl(b.imageUrl) || b.imageUrl }));
  const resolvedMidBanners = midBanners.map((b: any) => ({ ...b, imageUrl: resolveUrl(b.imageUrl) || b.imageUrl }));

  useEffect(() => {
    const priorityUrls: string[] = [];
    const deferredUrls: string[] = [];
    resolvedHeroBanners.forEach((b: any) => { if (b.imageUrl) priorityUrls.push(b.imageUrl); });
    resolvedMidBanners.forEach((b: any) => { if (b.imageUrl) priorityUrls.push(b.imageUrl); });
    sortedSections.forEach((s: any, idx: number) => {
      const target = idx < 3 ? priorityUrls : deferredUrls;
      if (s.type === 'banner_slider') {
        (s.banners || []).forEach((b: any) => {
          const u = resolveUrl(b.imageUrl) || b.imageUrl;
          if (u) target.push(u);
        });
      }
      if (s.type === 'featured_products' || s.type === 'product_slider') {
        (s.featuredProducts || []).forEach((p: any) => {
          if (p.imageUrl) target.push(p.imageUrl);
          if (p.customImageUrl) target.push(p.customImageUrl);
        });
      }
    });
    const seen = new Set<string>();
    priorityUrls.forEach(u => { if (!seen.has(u)) { seen.add(u); Image.prefetch(u).catch(() => {}); } });
    if (deferredUrls.length > 0) {
      const t = setTimeout(() => {
        deferredUrls.forEach(u => { if (!seen.has(u)) { seen.add(u); Image.prefetch(u).catch(() => {}); } });
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [homepage]);

  const mainScrollRef = useRef<any>(null);
  const scrollYRef = useRef(0);
  const [showHeaderSearch, setShowHeaderSearch] = useState(false);
  const lastSearchVisible = useRef(false);

  const handleScroll = useCallback((e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    scrollYRef.current = y;
    notifyLazySections();
    const shouldShow = y > 50;
    if (shouldShow !== lastSearchVisible.current) {
      lastSearchVisible.current = shouldShow;
      setShowHeaderSearch(shouldShow);
    }
  }, []);

  useEffect(() => {
    return tabEvents.on('homeTabPress', () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      mainScrollRef.current?.scrollTo?.({ y: 0, animated: true });
      mainScrollRef.current?.getNode?.()?.scrollTo?.({ y: 0, animated: true });
    });
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <PageBackground isDark={isDark} />
      <View style={[styles.headerWrap, { backgroundColor: colors.header + 'E6', borderBottomWidth: 1, borderBottomColor: colors.border }]}>
        <View style={[styles.headerTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.headerSide, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <JordanFlagBadge />
            <Pressable
              style={[styles.themeToggle, {
                backgroundColor: isDark ? 'rgba(36,140,204,0.25)' : 'rgba(22,50,89,0.1)',
              }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMode(isDark ? 'light' : 'dark');
              }}
            >
              <Ionicons name={isDark ? "sunny" : "moon"} size={15} color={isDark ? '#248CCC' : '#163259'} />
            </Pressable>
          </View>
          <View style={styles.logoCenter}>
            <View style={styles.logoImageWrap}>
              <XmartLogoSvg width={Math.min(width * 0.233, 102)} isDark={isDark} />
            </View>
          </View>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
            {showHeaderSearch && (
              <Pressable
                style={styles.notifBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/search');
                }}
              >
                <Ionicons name="search" size={20} color={colors.headerText} />
              </Pressable>
            )}
          <Pressable
            style={styles.notifBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              markAllRead();
              router.push('/notifications');
            }}
          >
            <RNAnimated.View style={{ transform: [{ rotate: bellRotation }] }}>
              <Ionicons name={unreadCount > 0 ? "notifications" : "notifications-outline"} size={20} color={colors.headerText} />
            </RNAnimated.View>
            {unreadCount > 0 && (
              <View style={{
                position: 'absolute',
                top: 4,
                right: 4,
                backgroundColor: '#E53935',
                borderRadius: 9,
                minWidth: 18,
                height: 18,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 4,
                borderWidth: 1.5,
                borderColor: colors.header,
              }}>
                <Text style={{ color: '#fff', fontSize: 10, fontFamily: 'Cairo_700Bold', lineHeight: 13 }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        ref={mainScrollRef}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Pressable style={[styles.searchBar, { backgroundColor: isDark ? colors.inputBg : '#fff', borderWidth: 1, borderColor: colors.border, marginHorizontal: 16, marginTop: 4, marginBottom: 8 }]} onPress={() => router.push('/search')}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <Text style={[styles.searchPlaceholder, { textAlign: isRTL ? 'right' : 'left', color: colors.textMuted }]}>{t('search.placeholder')}</Text>
        </Pressable>

        {sortedSections.map((s: any, idx: number) => {
            const renderSection = () => {
              if (s.type === 'banner_slider') {
                const resolvedBanners = (s.banners || []).map((b: any) => ({
                  ...b,
                  imageUrl: resolveUrl(b.imageUrl) || b.imageUrl,
                }));
                if (resolvedBanners.length === 0) return null;
                return <PromoBannerSlider banners={resolvedBanners} />;
              }
              if (s.type === 'static_banner') {
                return <StaticBannerSection section={s} colors={colors} isRTL={isRTL} />;
              }
              if (s.type === 'brands_strip') {
                return <BrandsStripSection section={s} isDark={isDark} scrollY={scrollYRef} />;
              }
              if (s.type === 'multi_collection') {
                return <MultiCollectionSection section={s} language={language} colors={colors} isDark={isDark} isRTL={isRTL} />;
              }
              if (s.type === 'collection_showcase') {
                return <CollectionShowcaseSection section={s} language={language} colors={colors} isDark={isDark} isRTL={isRTL} />;
              }
              if (s.type === 'featured_products') {
                return <FeaturedProductsSection section={s} language={language} colors={colors} isDark={isDark} isRTL={isRTL} />;
              }
              if (s.type === 'product_slider') {
                return <ProductSliderSection section={s} language={language} colors={colors} isDark={isDark} isRTL={isRTL} />;
              }
              if (s.type === 'collection_products') {
                return <CollectionProductsSection section={s} language={language} colors={colors} isDark={isDark} isRTL={isRTL} />;
              }
              return <SelectedCategoriesSection section={s} language={language} colors={colors} isDark={isDark} isRTL={isRTL} />;
            };

            if (idx < 3) {
              return <React.Fragment key={s.id}>{renderSection()}</React.Fragment>;
            }

            return (
              <LazySection key={s.id} scrollY={scrollYRef} estimatedHeight={s.type === 'brands_strip' ? 60 : 280}>
                {renderSection()}
              </LazySection>
            );
          })
        }

      </ScrollView>
    </View>
  );
}

const StaticBannerSection = React.memo(function StaticBannerSection({ section, colors, isRTL }: {
  section: any; colors: any; isRTL: boolean;
}) {
  const metadata = React.useMemo(() => {
    try { return JSON.parse(section.metadata || '{}'); } catch { return {}; }
  }, [section.metadata]);

  const rawImageUrl: string = metadata.imageUrl || '';
  const linkType: string = metadata.linkType || 'none';
  const linkValue: string = metadata.linkValue || '';
  const bannerW = width - 32;
  const [imgHeight, setImgHeight] = useState(Math.round(bannerW * 0.48));

  const imageUrl = React.useMemo(() => {
    if (!rawImageUrl) return '';
    if (rawImageUrl.startsWith('http')) return rawImageUrl;
    const host = process.env.EXPO_PUBLIC_DOMAIN;
    if (!host) return rawImageUrl;
    return `https://${host}${rawImageUrl}`;
  }, [rawImageUrl]);

  if (!imageUrl) return null;

  return (
    <View style={{ marginTop: 8, paddingHorizontal: 16 }}>
      <Pressable
        onPress={() => {
          if (!linkValue || linkType === 'none') return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (linkType === 'product') {
            router.push({ pathname: '/product/[handle]', params: { handle: linkValue } });
          } else if (linkType === 'url') {
            import('expo-web-browser').then(mod => mod.openBrowserAsync(linkValue)).catch(() => {});
          } else {
            router.push({ pathname: '/collection/[handle]', params: { handle: linkValue } });
          }
        }}
      >
        <Image
          source={{ uri: imageUrl }}
          style={{ width: bannerW, height: imgHeight, borderRadius: 14 }}
          contentFit="contain"
          transition={300}
          cachePolicy="memory-disk"
          priority="high"
          onLoad={(e: any) => {
            const { width: iw, height: ih } = e.source || {};
            if (iw && ih) {
              setImgHeight(Math.round((ih / iw) * bannerW));
            }
          }}
        />
      </Pressable>
    </View>
  );
});

const FeaturedProductsSection = React.memo(function FeaturedProductsSection({ section, language, colors, isDark, isRTL }: {
  section: any; language: string; colors: any; isDark: boolean; isRTL: boolean;
}) {
  const products: any[] = section.featuredProducts || [];
  if (products.length === 0) return null;

  const sectionTitle = (language === 'ar' ? section.titleAr : section.titleEn) || '';
  const CARD_W = width - 24;
  const GAP = 6;
  const halfW = (CARD_W - GAP) / 2;
  const HERO_H = Math.round(width * 0.52);
  const SMALL_H = (HERO_H - GAP) / 2;
  const BOTTOM_H = Math.round(width * 0.52);

  const goTo = (handle: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (handle) router.push({ pathname: '/product/[handle]', params: { handle } });
  };

  const priceText = (p: any) => {
    const val = parseFloat(p.price || '0');
    const curr = p.currency || 'JOD';
    return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(2)} ${curr}`;
  };

  const discountPct = (p: any) => {
    if (!p.compareAtPrice) return null;
    const orig = parseFloat(p.compareAtPrice);
    const now = parseFloat(p.price || '0');
    if (orig <= now) return null;
    return Math.round((1 - now / orig) * 100);
  };

  const p1 = products[0];
  const p2 = products[1];
  const p3 = products[2];
  const p4 = products[3];
  const p5 = products[4];

  const overlayBottom = (p: any, small = false) => (
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: small ? 8 : 12, paddingBottom: small ? 8 : 12, paddingTop: small ? 20 : 30, background: undefined }}>
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, top: 0, backgroundColor: 'rgba(0,0,0,0.42)', borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }} />
      <Text style={{ color: '#fff', fontFamily: 'Cairo_700Bold', fontSize: small ? 11 : 13, zIndex: 1, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }} numberOfLines={small ? 1 : 2}>{language === 'ar' ? p.titleAr : p.titleEn}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'Cairo_400Regular', fontSize: small ? 10 : 12, zIndex: 1 }}>{priceText(p)}</Text>
    </View>
  );

  const discountBadge = (p: any) => {
    const pct = discountPct(p);
    if (!pct) return null;
    return (
      <View style={{ position: 'absolute', top: 10, left: isRTL ? undefined : 10, right: isRTL ? 10 : undefined, backgroundColor: '#E91E63', borderRadius: 20, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontFamily: 'Cairo_700Bold', fontSize: 10, lineHeight: 14 }}>وفّر</Text>
        <Text style={{ color: '#fff', fontFamily: 'Cairo_700Bold', fontSize: 12, lineHeight: 14 }}>{pct}%</Text>
      </View>
    );
  };

  const cardBg = '#FFFFFF';
  const cardStyle = { borderRadius: 14, overflow: 'hidden' as const, backgroundColor: cardBg };

  return (
    <View style={{ marginTop: 10 }}>
      {!!sectionTitle && (
        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 18, color: colors.text, marginHorizontal: 16, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }}>{sectionTitle}</Text>
      )}
      <View style={{ marginHorizontal: 12, gap: GAP }}>
        {(p1 || p2 || p3) && (
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: GAP }}>
            {p1 && (
              <Pressable onPress={() => goTo(p1.handle)} style={[cardStyle, { width: halfW, height: HERO_H }]}>
                {p1.imageUrl && <Image source={{ uri: p1.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" recyclingKey={p1.handle} transition={0} />}
                {overlayBottom(p1)}
                <View style={{ position: 'absolute', top: 8, left: isRTL ? undefined : 8, right: isRTL ? 8 : undefined, backgroundColor: 'rgba(22,50,89,0.75)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: '#fff', fontFamily: 'Cairo_700Bold', fontSize: 9 }}>{language === 'ar' ? 'مميز' : 'Featured'}</Text>
                </View>
              </Pressable>
            )}
            {(p2 || p3) && (
              <View style={{ flex: 1, gap: GAP }}>
                {p2 && (
                  <Pressable onPress={() => goTo(p2.handle)} style={[cardStyle, { height: SMALL_H }]}>
                    {p2.imageUrl && <Image source={{ uri: p2.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" recyclingKey={p2.handle} transition={0} />}
                    {overlayBottom(p2, true)}
                  </Pressable>
                )}
                {p3 && (
                  <Pressable onPress={() => goTo(p3.handle)} style={[cardStyle, { height: SMALL_H }]}>
                    {p3.imageUrl && <Image source={{ uri: p3.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" recyclingKey={p3.handle} transition={0} />}
                    {overlayBottom(p3, true)}
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}
        {(p4 || p5) && (
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: GAP }}>
            {p4 && (
              <Pressable onPress={() => goTo(p4.handle)} style={[cardStyle, { flex: 1, height: BOTTOM_H }]}>
                {p4.imageUrl && <Image source={{ uri: p4.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" recyclingKey={p4.handle} transition={0} />}
                {discountBadge(p4)}
                {overlayBottom(p4)}
              </Pressable>
            )}
            {p5 && (
              <Pressable onPress={() => goTo(p5.handle)} style={[cardStyle, { flex: 1, height: BOTTOM_H }]}>
                {p5.imageUrl && <Image source={{ uri: p5.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" recyclingKey={p5.handle} transition={0} />}
                {discountBadge(p5)}
                {overlayBottom(p5)}
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
});

const CollectionProductsSection = React.memo(function CollectionProductsSection({ section, language, colors, isDark, isRTL }: {
  section: any; language: string; colors: any; isDark: boolean; isRTL: boolean;
}) {
  const metadata = React.useMemo(() => {
    try { return JSON.parse(section.metadata || '{}'); } catch { return {}; }
  }, [section.metadata]);

  const collectionHandle: string = metadata.collectionHandle || '';
  const sectionTitle = (language === 'ar' ? section.titleAr : section.titleEn) || '';
  const viewAllLabel = language === 'ar' ? 'عرض الكل' : 'View All';

  const { data, isLoading } = useQuery({
    queryKey: ['collectionProducts', collectionHandle, language],
    queryFn: () => api.getCollectionProducts(collectionHandle, { first: '12', available: 'true' }, language),
    enabled: !!collectionHandle,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

  const products: any[] = ((data as any)?.products || []).filter((p: any) => p.availableForSale === true);

  if (!collectionHandle) return null;
  if (isLoading) return (
    <View style={{ height: 210, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
  if (products.length === 0) return null;

  const isTabletCP = width >= 768;
  const CARD_W_CP = Math.round(isTabletCP ? width * 0.22 : width * 0.39);

  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 6 }}>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <View style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: colors.primary }} />
          <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 18, color: colors.text, textAlign: isRTL ? 'right' : 'left' }}>
            {sectionTitle}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({ pathname: '/collection/[handle]', params: { handle: collectionHandle } });
          }}
          style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 2 }}
        >
          <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: colors.primary }}>{viewAllLabel}</Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={14} color={colors.primary} />
        </Pressable>
      </View>
      <FlatList
        data={products}
        horizontal
        inverted={isRTL}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item: any, i: number) => item.handle || String(i)}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={7}
        removeClippedSubviews={false}
        ItemSeparatorComponent={FlatListGap10}
        renderItem={({ item: p }: { item: any }) => {
          const title = language === 'ar' ? (p.titleAr || p.title) : (p.titleEn || p.title);
          const price = p.priceRange?.minVariantPrice?.amount || p.price || '0';
          const currency = p.priceRange?.minVariantPrice?.currencyCode || p.currency || 'JOD';
          const compareAt = p.compareAtPriceRange?.minVariantPrice?.amount || p.compareAtPrice;
          const imgUrl = p.images?.edges?.[0]?.node?.url || p.imageUrl || p.image || null;
          return (
            <View style={{ width: CARD_W_CP }}>
              <ProductCard
                handle={p.handle}
                title={title}
                price={price}
                currencyCode={currency}
                compareAtPrice={compareAt}
                imageUrl={imgUrl}
                availableForSale={p.availableForSale !== false}
                vendor={p.vendor}
                compact
              />
            </View>
          );
        }}
      />
    </View>
  );
});

function getStyles(colors: typeof Colors.dark) {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerWrap: {
      paddingHorizontal: 16,
      overflow: 'visible',
    },
    headerTop: {
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
    },
    headerSide: {
      alignItems: 'center',
      gap: 10,
    },
    logoCenter: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      zIndex: 0,
    },
    logo: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 30,
      letterSpacing: 1,
    },
    logoImageWrap: {
      width: Math.min(width * 0.233, 102),
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'visible',
    },
    logoImage: {
      width: '100%',
      height: '100%',
    },
    searchIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notifBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 8,
    },
    searchPlaceholder: {
      flex: 1,
      fontFamily: 'Cairo_400Regular',
      fontSize: 14,
      color: '#999',
    },
    langToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: 'rgba(255,255,255,0.15)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 14,
    },
    flagIcon: {
      width: 32,
      height: 16,
      borderRadius: 3,
    },
    themeToggle: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 30,
      height: 30,
      borderRadius: 15,
    },
    langToggleText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 12,
      color: '#fff',
    },
  });

  const bannerW = width - 32;
  const bannerStyles = StyleSheet.create({
    container: {
      position: 'relative',
      marginTop: 8,
    },
    image: {
      width: bannerW,
      borderRadius: 14,
    },
  });

  return { styles, bannerStyles };
}
