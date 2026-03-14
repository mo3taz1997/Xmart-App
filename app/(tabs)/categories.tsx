"use no memo";
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, FlatList, ScrollView, Pressable,
  StyleSheet, Platform, ActivityIndicator, Dimensions, Modal, BackHandler,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import PageBackground from '@/components/PageBackground';
import ProductCard from '@/components/ProductCard';
import { useStockStatus } from '@/lib/useStockStatus';
import { tabEvents } from '@/lib/tabEvents';

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const host = process.env.EXPO_PUBLIC_DOMAIN;
  if (!host) return null;
  return `https://${host}${url}`;
}

const { width } = Dimensions.get('window');
const H_PAD = 16;
const CIRCLE_COLS = 3;
const CIRCLE_SIZE = Math.floor((width - H_PAD * 2 - 20 * (CIRCLE_COLS - 1)) / CIRCLE_COLS);
const CIRCLE_IMG = Math.min(CIRCLE_SIZE - 8, 90);
const IS_TABLET_CAT = Dimensions.get('window').width >= 768;
const PRODUCT_COLUMNS = IS_TABLET_CAT ? 4 : 2;
const PAGE_SIZE = 20;

type CategoryItem = {
  id: string;
  titleAr: string;
  titleEn: string;
  imageUrl?: string | null;
  collectionHandle?: string | null;
  children?: CategoryItem[];
};

/* ── Level-1 card grid item ── */
function CatCircleItem({
  item, onPress, colors, isDark, language,
}: {
  item: CategoryItem;
  onPress: () => void;
  colors: typeof Colors.dark;
  isDark: boolean;
  language: string;
}) {
  const title = language === 'ar' ? item.titleAr : item.titleEn;
  const imgUrl = resolveImageUrl(item.imageUrl) || item.imageUrl;
  const CARD_IMG_H = Math.round(CIRCLE_SIZE * 0.78);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.circleItem,
        {
          opacity: pressed ? 0.82 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
          backgroundColor: isDark ? '#1a2a42' : '#fff',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(36,140,204,0.18)' : 'rgba(22,50,89,0.09)',
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.07,
          shadowRadius: 4,
          elevation: 2,
        },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <View style={{ width: CIRCLE_SIZE, height: CARD_IMG_H, backgroundColor: isDark ? '#142033' : '#EEF4FB' }}>
        {imgUrl ? (
          <Image
            source={{ uri: imgUrl }}
            style={{ width: '100%', height: '100%' } as any}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="grid-outline" size={28} color={isDark ? '#3a6090' : '#8faec8'} />
          </View>
        )}
      </View>
      <Text
        style={[
          styles.circleLabel,
          {
            color: colors.text,
            textAlign: 'center',
            writingDirection: language === 'ar' ? 'rtl' : 'ltr',
          },
        ]}
        numberOfLines={2}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const SUB_CIRCLE_SIZE = 56;
const SUB_CIRCLE_WIDTH = 72;

function SubCircleRow({
  items,
  activeId,
  onSelect,
  onDrill,
  onReshuffle,
  sortIdx,
  colors,
  isDark,
  language,
  isRTL,
}: {
  items: CategoryItem[];
  activeId: string | null;
  onSelect: (item: CategoryItem) => void;
  onDrill: (item: CategoryItem) => void;
  onReshuffle: () => void;
  sortIdx: number;
  colors: typeof Colors.dark;
  isDark: boolean;
  language: string;
  isRTL: boolean;
}) {
  const ref = useRef<ScrollView>(null);
  const displayItems = isRTL ? [...items].reverse() : items;
  const itemIds = items.map(i => i.id).join(',');

  useEffect(() => {
    if (isRTL) {
      setTimeout(() => ref.current?.scrollToEnd({ animated: false }), 50);
    } else {
      ref.current?.scrollTo({ x: 0, animated: false });
    }
  }, [itemIds, isRTL]);

  return (
    <View style={{ paddingTop: 10, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border + '55' }}>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          minWidth: width,
          justifyContent: isRTL ? 'flex-end' : 'flex-start',
          paddingHorizontal: 12,
          gap: 8,
        }}
        onContentSizeChange={(cw) => {
          if (isRTL && cw > width) {
            ref.current?.scrollToEnd({ animated: false });
          }
        }}
      >
        {displayItems.map((child) => {
          const selected = activeId === child.id;
          const title = language === 'ar' ? child.titleAr : child.titleEn;
          const imgUrl = resolveImageUrl(child.imageUrl) || child.imageUrl;

          return (
            <Pressable
              key={child.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (child.children && child.children.length > 0) {
                  onDrill(child);
                } else if (selected && sortIdx === 0) {
                  onReshuffle();
                } else {
                  onSelect(child);
                }
              }}
              style={({ pressed }) => ({
                alignItems: 'center',
                opacity: pressed ? 0.75 : 1,
                transform: [{ scale: pressed ? 0.94 : 1 }],
                width: SUB_CIRCLE_WIDTH,
              })}
            >
              <View style={{
                width: SUB_CIRCLE_SIZE,
                height: SUB_CIRCLE_SIZE,
                borderRadius: SUB_CIRCLE_SIZE / 2,
                overflow: 'hidden',
                borderWidth: selected ? 2.5 : 1.5,
                borderColor: selected ? colors.primary : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(22,50,89,0.1)'),
                backgroundColor: '#FFFFFF',
              }}>
                {imgUrl ? (
                  <Image source={{ uri: imgUrl }} style={{ width: '100%', height: '100%' } as any} contentFit="cover" />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="grid-outline" size={22} color={selected ? colors.primary : colors.textMuted} />
                  </View>
                )}
              </View>
              <Text
                style={{
                  fontFamily: selected ? 'Cairo_700Bold' : 'Cairo_600SemiBold',
                  fontSize: 10,
                  color: selected ? colors.primary : colors.textSecondary,
                  textAlign: 'center',
                  marginTop: 4,
                  width: SUB_CIRCLE_WIDTH - 2,
                  lineHeight: 14,
                }}
                numberOfLines={2}
              >
                {title}
              </Text>
              {selected && (
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 2 }} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function extractProductData(product: any) {
  return {
    handle: product.handle,
    title: product.title,
    price: product.priceRange?.minVariantPrice?.amount || '0',
    currencyCode: product.priceRange?.minVariantPrice?.currencyCode || 'JOD',
    compareAtPrice: product.compareAtPriceRange?.minVariantPrice?.amount,
    imageUrl: product.images?.edges?.[0]?.node?.url || product.featuredImage?.url,
    availableForSale: product.availableForSale,
    vendor: product.vendor,
  };
}

/* ══════════════════════════ MAIN SCREEN ══════════════════════════ */
export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const { t, isRTL, language } = useLanguage();
  const { colors, isDark } = useTheme();

  const [navStack, setNavStack] = useState<CategoryItem[]>([]);
  const level1ScrollRef = useRef<ScrollView>(null);
  const [sortIdx, setSortIdx] = useState(0);
  const [randomSeed, setRandomSeed] = useState(() => Math.random());
  const [showSort, setShowSort] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showVendorFilter, setShowVendorFilter] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [activeChild, setActiveChild] = useState<CategoryItem | null>(null);

  useEffect(() => {
    return tabEvents.on('categoriesTabPress', () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (navStack.length > 0) {
        setNavStack([]);
        setSelectedType(null);
        setSelectedVendor(null);
        setSortIdx(0);
        setActiveChild(null);
      } else {
        level1ScrollRef.current?.scrollToOffset?.({ offset: 0, animated: true });
      }
    });
  }, [navStack.length]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navStack.length > 0) {
        setNavStack(prev => prev.slice(0, -1));
        setSelectedType(null);
        setActiveChild(null);
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [navStack.length]);

  const { data: categoriesTree, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
    staleTime: 1000 * 30,
    refetchOnMount: 'always' as const,
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60,
  });

  const { data: suggestedProducts, isLoading: sugLoading } = useQuery({
    queryKey: ['suggested-products', language],
    queryFn: () => api.getSuggestedProducts(language),
    staleTime: 1000 * 30,
    refetchOnMount: 'always' as const,
    refetchOnWindowFocus: true,
  });

  const currentCategory = navStack.length > 0 ? navStack[navStack.length - 1] : null;
  const currentCategoryId = currentCategory?.id ?? null;

  const childrenCacheRef = useRef<Record<string, CategoryItem[]>>({});

  let childItems: CategoryItem[] = [];
  if (currentCategory) {
    const catId = currentCategory.id;
    if (currentCategory.children && currentCategory.children.length > 0) {
      childItems = currentCategory.children;
      childrenCacheRef.current[catId] = currentCategory.children;
    } else if (categoriesTree) {
      const search = (nodes: CategoryItem[]): CategoryItem | null => {
        for (const n of nodes) {
          if (n.id === catId) return n;
          if (n.children && n.children.length > 0) {
            const f = search(n.children);
            if (f) return f;
          }
        }
        return null;
      };
      const live = search(categoriesTree);
      if (live?.children && live.children.length > 0) {
        childItems = live.children;
        childrenCacheRef.current[catId] = live.children;
      }
    }
    if (childItems.length === 0) {
      childItems = childrenCacheRef.current[catId] || [];
    }
  }

  const goBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNavStack(prev => prev.slice(0, -1));
    setSelectedType(null);
    setActiveChild(null);
  }, []);

  const drillDown = useCallback((cat: CategoryItem) => {
    if ((cat.children && cat.children.length > 0) || cat.collectionHandle) {
      setSelectedType(null);
      setActiveChild(null);
      setNavStack(prev => [...prev, cat]);
    }
  }, []);

  const headerTitle = currentCategory
    ? (language === 'ar' ? currentCategory.titleAr : currentCategory.titleEn)
    : t('categories.title');

  const SORT_OPTIONS = [
    { key: 'RANDOM', label: language === 'ar' ? 'عشوائي' : 'Random', reverse: false },
    { key: 'BEST_SELLING', label: t('collection.bestSelling'), reverse: false },
    { key: 'PRICE', label: t('collection.priceLow'), reverse: false },
    { key: 'PRICE', label: t('collection.priceHigh'), reverse: true },
    { key: 'TITLE', label: t('collection.name'), reverse: false },
  ];

  const collectionHandle = currentCategory?.collectionHandle;
  const activeHandle = activeChild?.collectionHandle || collectionHandle;

  useEffect(() => {
    setActiveChild(null);
    prevCollProductsRef.current = [];
  }, [currentCategoryId]);

  useEffect(() => {
    if (activeHandle) setRandomSeed(Math.random());
  }, [activeHandle]);

  const { data: collectionData, isLoading: collLoading, isFetching: collFetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['category-products', activeHandle, sortIdx, language, sortIdx === 0 ? randomSeed : 0],
    queryFn: async ({ pageParam }) => {
      const sort = SORT_OPTIONS[sortIdx];
      const params: Record<string, string> = {
        first: String(PAGE_SIZE),
        sortKey: sort.key,
        reverse: String(sort.reverse),
        available: 'true',
      };
      if (pageParam) params.after = pageParam;
      return api.getCollectionProducts(activeHandle as string, params, language);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: any) => {
      if (lastPage?.pageInfo?.hasNextPage) return lastPage.pageInfo.endCursor;
      return undefined;
    },
    enabled: !!activeHandle,
  });

  const { data: outOfStockData } = useQuery({
    queryKey: ['category-oos', activeHandle, language],
    queryFn: () => api.getCollectionProducts(activeHandle as string, { first: '100', available: 'false' }, language),
    enabled: !!activeHandle,
  });

  const currentCollProducts = useMemo(() => {
    return collectionData?.pages?.flatMap((page: any) => page.products) || [];
  }, [collectionData]);

  const prevCollProductsRef = useRef<any[]>([]);
  const allCollProducts = currentCollProducts.length > 0 ? currentCollProducts : prevCollProductsRef.current;
  useEffect(() => {
    if (currentCollProducts.length > 0) {
      prevCollProductsRef.current = currentCollProducts;
    }
  }, [currentCollProducts]);

  const { data: filtersData } = useQuery({
    queryKey: ['collection-filters', activeHandle, language],
    queryFn: () => api.getCollectionFilters(activeHandle as string, language),
    enabled: !!activeHandle,
    staleTime: 5 * 60 * 1000,
  });

  const availableTypes: string[] = filtersData?.types || [];
  const availableVendors: string[] = filtersData?.vendors || [];

  const [typeTranslations, setTypeTranslations] = useState<Record<string, string>>({});
  useEffect(() => {
    if (language !== 'ar' || availableTypes.length === 0) return;
    let cancelled = false;
    (async () => {
      const map: Record<string, string> = {};
      for (const type of availableTypes) {
        if (typeTranslations[type]) { map[type] = typeTranslations[type]; continue; }
        try {
          const res = await api.translateText(type, 'ar');
          map[type] = res?.translatedText || type;
        } catch { map[type] = type; }
      }
      if (!cancelled) setTypeTranslations(prev => ({ ...prev, ...map }));
    })();
    return () => { cancelled = true; };
  }, [availableTypes, language]);

  const getTypeLabel = (type: string) =>
    language === 'ar' && typeTranslations[type] ? typeTranslations[type] : type;

  const allCatProducts = useMemo(() => [...allCollProducts, ...(outOfStockData?.products || [])], [allCollProducts, outOfStockData]);
  const { getAvailability: getCatAvailability } = useStockStatus(allCatProducts);

  const collProducts = useMemo(() => {
    let list = allCollProducts
      .map((p: any) => ({ ...p, availableForSale: getCatAvailability(p.handle, p.availableForSale) }))
      .filter((p: any) => p.availableForSale !== false);
    if (selectedType) list = list.filter((p: any) => p.productType === selectedType);
    if (selectedVendor) list = list.filter((p: any) => p.vendor === selectedVendor);
    return list;
  }, [allCollProducts, selectedType, selectedVendor, getCatAvailability]);

  const outOfStockProducts = useMemo(() => {
    let all = [...(outOfStockData?.products || []), ...allCollProducts]
      .map((p: any) => ({ ...p, availableForSale: getCatAvailability(p.handle, p.availableForSale) }))
      .filter((p: any) => p.availableForSale === false);
    const seen = new Set<string>();
    all = all.filter(p => { if (seen.has(p.handle)) return false; seen.add(p.handle); return true; });
    if (selectedType) all = all.filter((p: any) => p.productType === selectedType);
    if (selectedVendor) all = all.filter((p: any) => p.vendor === selectedVendor);
    return all;
  }, [outOfStockData, allCollProducts, selectedType, selectedVendor, getCatAvailability]);

  /* ── Header bar ── */
  const renderHeader = (showBack: boolean) => (
    <View
      style={[
        styles.topBar,
        {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          borderBottomColor: colors.border + '55',
        },
      ]}
    >
      {showBack ? (
        <Pressable
          onPress={goBack}
          style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(22,50,89,0.07)' }]}
        >
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color={colors.text} />
        </Pressable>
      ) : (
        <View style={{ width: 38 }} />
      )}

      <Text style={[styles.topBarTitle, { color: colors.text, textAlign: 'center' }]} numberOfLines={1}>
        {headerTitle}
      </Text>

      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/search'); }}
        style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(22,50,89,0.07)' }]}
      >
        <Ionicons name="search-outline" size={20} color={colors.text} />
      </Pressable>
    </View>
  );

  /* ══════ LEVEL 1+: sub-categories circles + products ══════ */

  /* Sort / filter bar — always rendered, content updates in place */

  /* If children but no active collection → show children as grid of circles */
  const showChildGrid = childItems.length > 0 && !activeHandle;

  const cats: CategoryItem[] = categoriesTree || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + webTopInset }]}>
      <PageBackground isDark={isDark} />

      {renderHeader(navStack.length > 0)}

      {navStack.length === 0 ? (
          isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              ref={level1ScrollRef as any}
              data={cats}
              keyExtractor={(item) => item.id}
              numColumns={CIRCLE_COLS}
              columnWrapperStyle={{
                paddingHorizontal: H_PAD,
                justifyContent: 'space-around',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              }}
              contentContainerStyle={{ paddingTop: 16, paddingBottom: 120, gap: 16 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <CatCircleItem
                  item={item}
                  onPress={() => drillDown(item)}
                  colors={colors}
                  isDark={isDark}
                  language={language}
                />
              )}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Ionicons name="grid-outline" size={52} color={colors.textMuted} />
                  <Text style={[styles.emptyTxt, { color: colors.textMuted }]}>{t('categories.empty')}</Text>
                </View>
              }
              ListFooterComponent={
                suggestedProducts && suggestedProducts.length > 0 ? (
                  <View style={{ marginTop: 24, paddingHorizontal: H_PAD }}>
                    <View style={[styles.secTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.secAccent, { backgroundColor: colors.primary }]} />
                      <Text style={[styles.secTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                        {language === 'ar' ? 'منتجات مقترحة' : 'Suggested Items'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', direction: isRTL ? 'rtl' : 'ltr', marginHorizontal: -4 }}>
                      {suggestedProducts.map((p: any) => (
                        <View key={p.id || p.handle} style={{ width: (width - H_PAD * 2) / 2, padding: 4 }}>
                          <ProductCard
                            handle={p.handle}
                            title={p.title}
                            price={p.priceRange?.minVariantPrice?.amount || '0'}
                            currencyCode={p.priceRange?.minVariantPrice?.currencyCode || 'JOD'}
                            compareAtPrice={p.compareAtPriceRange?.minVariantPrice?.amount}
                            imageUrl={p.images?.edges?.[0]?.node?.url || p.featuredImage?.url || p._adminImageUrl}
                            availableForSale={p.availableForSale}
                            vendor={p.vendor}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                ) : sugLoading ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : null
              }
            />
          )
      ) : (
        <>
          {childItems.length > 0 && (
            <SubCircleRow
              items={childItems}
              activeId={activeChild?.id ?? null}
              onSelect={setActiveChild}
              onDrill={drillDown}
              onReshuffle={() => setRandomSeed(Math.random())}
              sortIdx={sortIdx}
              colors={colors}
              isDark={isDark}
              language={language}
              isRTL={isRTL}
            />
          )}

          {/* ── Fixed: sort/filter bar — always mounted, visibility toggled ── */}
          {activeHandle ? (
            <View
              style={[styles.sortBar, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.border + '44' }]}
            >
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowSort(true); }}
                style={[styles.chip, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: sortIdx > 0 ? colors.primary + '18' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(22,50,89,0.04)'), borderColor: sortIdx > 0 ? colors.primary : colors.border }]}
              >
                <Ionicons name="swap-vertical-outline" size={14} color={sortIdx > 0 ? colors.primary : colors.textSecondary} />
                {sortIdx > 0 && <Text style={[styles.chipTxt, { color: colors.primary }]}>{SORT_OPTIONS[sortIdx].label}</Text>}
                {sortIdx > 0 ? (
                  <Pressable onPress={(e) => { e.stopPropagation(); setSortIdx(0); }} hitSlop={8}>
                    <Ionicons name="close-circle" size={14} color={colors.primary} />
                  </Pressable>
                ) : (
                  <Ionicons name="chevron-down" size={11} color={colors.textSecondary} />
                )}
              </Pressable>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFilter(true); }}
                style={[styles.chip, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: selectedType ? colors.primary + '18' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(22,50,89,0.04)'), borderColor: selectedType ? colors.primary : colors.border }]}
              >
                <Ionicons name="options-outline" size={13} color={selectedType ? colors.primary : colors.textSecondary} />
                <Text style={[styles.chipTxt, { color: selectedType ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
                  {selectedType ? getTypeLabel(selectedType) : (language === 'ar' ? 'النوع' : 'Type')}
                </Text>
                {selectedType ? (
                  <Pressable onPress={(e) => { e.stopPropagation(); setSelectedType(null); }} hitSlop={8}>
                    <Ionicons name="close-circle" size={14} color={colors.primary} />
                  </Pressable>
                ) : (
                  <Ionicons name="chevron-down" size={11} color={colors.textSecondary} />
                )}
              </Pressable>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowVendorFilter(true); }}
                style={[styles.chip, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: selectedVendor ? colors.primary + '18' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(22,50,89,0.04)'), borderColor: selectedVendor ? colors.primary : colors.border }]}
              >
                <Ionicons name="storefront-outline" size={13} color={selectedVendor ? colors.primary : colors.textSecondary} />
                <Text style={[styles.chipTxt, { color: selectedVendor ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
                  {selectedVendor ?? (language === 'ar' ? 'الماركة' : 'Brand')}
                </Text>
                {selectedVendor ? (
                  <Pressable onPress={(e) => { e.stopPropagation(); setSelectedVendor(null); }} hitSlop={8}>
                    <Ionicons name="close-circle" size={14} color={colors.primary} />
                  </Pressable>
                ) : (
                  <Ionicons name="chevron-down" size={11} color={colors.textSecondary} />
                )}
              </Pressable>
            </View>
          ) : null}

          {/* ── Scrollable: products or child grid ── */}
          {showChildGrid ? (
            <FlatList
              key="child-circle-grid"
              data={childItems}
              keyExtractor={(item) => item.id}
              numColumns={CIRCLE_COLS}
              columnWrapperStyle={{
                paddingHorizontal: H_PAD,
                justifyContent: 'space-around',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              }}
              contentContainerStyle={{ paddingTop: 16, paddingBottom: 120, gap: 16 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <CatCircleItem
                  item={item}
                  onPress={() => drillDown(item)}
                  colors={colors}
                  isDark={isDark}
                  language={language}
                />
              )}
            />
          ) : collLoading && collProducts.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              key="products-grid"
              data={collProducts}
              keyExtractor={(item: any) => item.handle || item.id}
              numColumns={PRODUCT_COLUMNS}
              columnWrapperStyle={{ paddingHorizontal: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}
              renderItem={({ item }) => (
                <View style={{ width: (width - 24) / PRODUCT_COLUMNS, padding: 4 }}>
                  <ProductCard {...extractProductData(item)} />
                </View>
              )}
              contentContainerStyle={{ paddingBottom: 110 }}
              showsVerticalScrollIndicator={false}
              scrollEnabled={!!collProducts.length || !!outOfStockProducts.length}
              onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
              onEndReachedThreshold={0.5}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={7}
              removeClippedSubviews={false}
              ListFooterComponent={
                <>
                  {isFetchingNextPage && (
                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  )}
                  {!hasNextPage && !isFetchingNextPage && outOfStockProducts.length > 0 && (
                    <>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, gap: 8 }}>
                        <View style={{ flex: 1, height: 1, backgroundColor: colors.border + '88' }} />
                        <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 12, color: colors.textMuted, paddingHorizontal: 6 }}>
                          {language === 'ar' ? 'لم يعد بالمخزون' : 'Out of Stock'}
                        </Text>
                        <View style={{ flex: 1, height: 1, backgroundColor: colors.border + '88' }} />
                      </View>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', paddingHorizontal: 8 }}>
                        {outOfStockProducts.map((item: any, i: number) => (
                          <View key={(item.handle || item.id) + i} style={{ width: (width - 24) / PRODUCT_COLUMNS, padding: 4, opacity: 0.55 }}>
                            <ProductCard {...extractProductData(item)} />
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                </>
              }
              ListEmptyComponent={
                <View style={[styles.center, { paddingVertical: 48 }]}>
                  <View style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(22,50,89,0.06)' }]}>
                    <Ionicons name="cube-outline" size={36} color={colors.textMuted} />
                  </View>
                  <Text style={[styles.emptyTxt, { color: colors.textMuted }]}>{t('categories.empty')}</Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* Sort modal */}
          <Modal visible={showSort} transparent animationType="slide" onRequestClose={() => setShowSort(false)}>
            <Pressable style={styles.overlay} onPress={() => setShowSort(false)}>
              <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
                <View style={styles.sheetHandle} />
                <Text style={[styles.sheetTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{t('collection.sortBy')}</Text>
                {SORT_OPTIONS.slice(1).map((opt, j) => {
                  const i = j + 1;
                  return (
                    <Pressable
                      key={i}
                      style={[styles.sheetRow, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.border + '44', backgroundColor: i === sortIdx ? colors.primary + '10' : 'transparent' }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSortIdx(i); setShowSort(false); }}
                    >
                      <Text style={[styles.sheetRowTxt, { color: i === sortIdx ? colors.primary : colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{opt.label}</Text>
                      {i === sortIdx && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                    </Pressable>
                  );
                })}
              </Pressable>
            </Pressable>
          </Modal>

          {/* Filter modal */}
          <Modal visible={showFilter} transparent animationType="slide" onRequestClose={() => setShowFilter(false)}>
            <Pressable style={styles.overlay} onPress={() => setShowFilter(false)}>
              <Pressable style={[styles.sheet, { backgroundColor: colors.surface, maxHeight: '50%' }]} onPress={(e) => e.stopPropagation()}>
                <View style={styles.sheetHandle} />
                <Text style={[styles.sheetTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                  {language === 'ar' ? 'فلترة حسب النوع' : 'Filter by Type'}
                </Text>
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {[null, ...availableTypes].map((type) => (
                    <Pressable
                      key={type ?? '__all__'}
                      style={[styles.sheetRow, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.border + '44', backgroundColor: selectedType === type ? colors.primary + '10' : 'transparent' }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedType(type); setShowFilter(false); }}
                    >
                      <Text style={[styles.sheetRowTxt, { color: selectedType === type ? colors.primary : colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                        {type === null ? (language === 'ar' ? 'الكل' : 'All') : getTypeLabel(type)}
                      </Text>
                      {selectedType === type && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                    </Pressable>
                  ))}
                  <View style={{ height: 8 }} />
                </ScrollView>
              </Pressable>
            </Pressable>
          </Modal>

          {/* Vendor filter modal */}
          <Modal visible={showVendorFilter} transparent animationType="slide" onRequestClose={() => setShowVendorFilter(false)}>
            <Pressable style={styles.overlay} onPress={() => setShowVendorFilter(false)}>
              <Pressable style={[styles.sheet, { backgroundColor: colors.surface, maxHeight: '55%' }]} onPress={(e) => e.stopPropagation()}>
                <View style={styles.sheetHandle} />
                <Text style={[styles.sheetTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                  {language === 'ar' ? 'فلترة حسب الماركة' : 'Filter by Brand'}
                </Text>
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {[null, ...availableVendors].map((vendor) => (
                    <Pressable
                      key={vendor ?? '__all__'}
                      style={[styles.sheetRow, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.border + '44', backgroundColor: selectedVendor === vendor ? colors.primary + '10' : 'transparent' }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedVendor(vendor); setShowVendorFilter(false); }}
                    >
                      <Text style={[styles.sheetRowTxt, { color: selectedVendor === vendor ? colors.primary : colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                        {vendor === null ? (language === 'ar' ? 'الكل' : 'All') : vendor}
                      </Text>
                      {selectedVendor === vendor && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                    </Pressable>
                  ))}
                  <View style={{ height: 8 }} />
                </ScrollView>
              </Pressable>
            </Pressable>
          </Modal>
    </View>
  );
}

/* ═══ Styles ═══ */
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
  emptyTxt: { fontFamily: 'Cairo_600SemiBold', fontSize: 14 },
  emptyIcon: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },

  topBar: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  topBarTitle: { fontFamily: 'Cairo_700Bold', fontSize: 20, flex: 1 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  /* L1 cards */
  circleItem: {
    width: CIRCLE_SIZE,
    alignItems: 'center',
  },
  circleImg: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleLabel: {
    fontFamily: 'Cairo_600SemiBold',
    fontSize: 12,
    lineHeight: 17,
    width: CIRCLE_SIZE,
    paddingHorizontal: 4,
    paddingVertical: 6,
    textAlign: 'center',
  },

  /* Sort bar */
  sortBar: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipTxt: { fontFamily: 'Cairo_600SemiBold', fontSize: 12 },

  /* Section title */
  secTitleRow: { alignItems: 'center', gap: 8, marginBottom: 10 },
  secAccent: { width: 4, height: 20, borderRadius: 2 },
  secTitle: { fontFamily: 'Cairo_700Bold', fontSize: 17, flex: 1 },

  /* Bottom sheet */
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingBottom: 34, maxHeight: '70%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.3)', alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontFamily: 'Cairo_700Bold', fontSize: 17, paddingHorizontal: 20, marginBottom: 6 },
  sheetRow: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetRowTxt: { fontFamily: 'Cairo_600SemiBold', fontSize: 14, flex: 1 },
});
