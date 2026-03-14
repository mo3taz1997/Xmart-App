import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Platform,
  ActivityIndicator, Dimensions, Modal, ScrollView, Share,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { useLanguage } from '@/contexts/LanguageContext';
import PageBackground from '@/components/PageBackground';
import { useStockStatus } from '@/lib/useStockStatus';

const { width } = Dimensions.get('window');
const PAGE_SIZE = 50;
const IS_TABLET_COL = Dimensions.get('window').width >= 768;
const PRODUCT_COLUMNS = IS_TABLET_COL ? 4 : 2;

type CatNode = {
  id: string;
  titleAr: string;
  titleEn: string;
  imageUrl?: string | null;
  collectionHandle?: string | null;
  children?: CatNode[];
};

function findCategoryByHandle(nodes: CatNode[], h: string): CatNode | null {
  for (const node of nodes) {
    if (node.collectionHandle === h) return node;
    if (node.children?.length) {
      const found = findCategoryByHandle(node.children, h);
      if (found) return found;
    }
  }
  return null;
}

function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/(tabs)');
  }
}

export default function CollectionScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const { t, isRTL, language } = useLanguage();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  const SORT_OPTIONS = [
    { key: 'RANDOM', label: '', reverse: false },
    { key: 'BEST_SELLING', label: t('collection.bestSelling'), reverse: false },
    { key: 'PRICE', label: t('collection.priceLow'), reverse: false },
    { key: 'PRICE', label: t('collection.priceHigh'), reverse: true },
    { key: 'TITLE', label: t('collection.name'), reverse: false },
  ];

  const [sortIdx, setSortIdx] = useState(0);
  const [randomSeed, setRandomSeed] = useState(() => Math.random());
  const [showSort, setShowSort] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showVendorFilter, setShowVendorFilter] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);

  /* ── Sub-category drill-down state ── */
  const [subNavStack, setSubNavStack] = useState<CatNode[]>([]);
  const [activeSubChild, setActiveSubChild] = useState<CatNode | null>(null);

  /* Reset when handle changes */
  useEffect(() => {
    setSubNavStack([]);
    setActiveSubChild(null);
    setSelectedType(null);
    setSelectedVendor(null);
  }, [handle]);

  /* ── Categories tree ── */
  const { data: categoriesTree } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
    staleTime: 5 * 60 * 1000,
  });

  const matchedCat = useMemo<CatNode | null>(() => {
    if (!categoriesTree || !handle) return null;
    return findCategoryByHandle(categoriesTree as CatNode[], handle as string);
  }, [categoriesTree, handle]);

  /* Current node in sub-nav — always look up from live tree to prevent stale children */
  const currentSubNode = useMemo(() => {
    if (subNavStack.length === 0) return matchedCat;
    const stale = subNavStack[subNavStack.length - 1];
    if (!stale || !categoriesTree) return stale || matchedCat;
    const findById = (nodes: CatNode[], id: string): CatNode | null => {
      for (const n of nodes) {
        if (n.id === id) return n;
        if (n.children) { const f = findById(n.children, id); if (f) return f; }
      }
      return null;
    };
    return findById(categoriesTree as CatNode[], stale.id) || stale;
  }, [subNavStack, matchedCat, categoriesTree]);

  const subChildItems: CatNode[] = currentSubNode?.children || [];
  const showSubRow = subChildItems.length > 0;

  /* Active product handle for queries */
  const activeProductHandle = useMemo(() => {
    if (activeSubChild?.collectionHandle) return activeSubChild.collectionHandle;
    if (subNavStack.length > 0 && currentSubNode?.collectionHandle) return currentSubNode.collectionHandle;
    return handle as string;
  }, [activeSubChild, subNavStack, currentSubNode, handle]);

  const isAll = handle === 'all';

  useEffect(() => { setRandomSeed(Math.random()); }, [activeProductHandle]);

  const { data, isLoading, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['collection', activeProductHandle, sortIdx, language, sortIdx === 0 ? randomSeed : 0],
    queryFn: async ({ pageParam }) => {
      const sort = SORT_OPTIONS[sortIdx];
      const params: Record<string, string> = {
        first: String(PAGE_SIZE),
        sortKey: sort.key,
        reverse: String(sort.reverse),
      };
      if (!isAll) params.available = 'true';
      if (pageParam) params.after = pageParam;

      if (isAll) {
        params.pageInfo = 'true';
        const result = await api.getProducts(params, language);
        return {
          collection: { title: t('collection.allProducts') },
          products: result.products,
          pageInfo: result.pageInfo,
        };
      }
      return api.getCollectionProducts(activeProductHandle, params, language);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: any) => {
      if (lastPage?.pageInfo?.hasNextPage) return lastPage.pageInfo.endCursor;
      return undefined;
    },
    enabled: !!activeProductHandle,
  });

  const currentProducts = useMemo(() => {
    return data?.pages?.flatMap((page: any) => page.products) || [];
  }, [data]);

  const prevProductsRef = React.useRef<any[]>([]);
  const allProducts = currentProducts.length > 0 ? currentProducts : prevProductsRef.current;
  useEffect(() => {
    if (currentProducts.length > 0) {
      prevProductsRef.current = currentProducts;
    }
  }, [currentProducts]);

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    allProducts.forEach((p: any) => { if (p.productType) types.add(p.productType); });
    return Array.from(types).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [allProducts]);

  const availableVendors = useMemo(() => {
    const vendors = new Set<string>();
    allProducts.forEach((p: any) => { if (p.vendor) vendors.add(p.vendor); });
    return Array.from(vendors).sort((a, b) => a.localeCompare(b));
  }, [allProducts]);

  const [typeTranslations, setTypeTranslations] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (language !== 'ar' || availableTypes.length === 0) return;
    let cancelled = false;
    const translateTypes = async () => {
      const newTranslations: Record<string, string> = {};
      for (const type of availableTypes) {
        if (typeTranslations[type]) { newTranslations[type] = typeTranslations[type]; continue; }
        try {
          const res = await api.translateText(type, 'ar');
          if (!cancelled && res?.translatedText) newTranslations[type] = res.translatedText;
          else newTranslations[type] = type;
        } catch { newTranslations[type] = type; }
      }
      if (!cancelled) setTypeTranslations(prev => ({ ...prev, ...newTranslations }));
    };
    translateTypes();
    return () => { cancelled = true; };
  }, [availableTypes, language]);

  const getTypeLabel = (type: string) => {
    if (language === 'ar' && typeTranslations[type]) return typeTranslations[type];
    return type;
  };

  const { data: oosData } = useQuery({
    queryKey: ['collection-oos', activeProductHandle, language],
    queryFn: () => api.getCollectionProducts(activeProductHandle, { first: '100', available: 'false' }, language),
    enabled: !!activeProductHandle && !isAll,
  });

  const products = useMemo(() => {
    let list = allProducts;
    if (selectedType) list = list.filter((p: any) => p.productType === selectedType);
    if (selectedVendor) list = list.filter((p: any) => p.vendor === selectedVendor);
    return list;
  }, [allProducts, selectedType, selectedVendor]);

  const outOfStockProducts = useMemo(() => {
    let all = (oosData?.products || []).filter((p: any) => p.availableForSale === false);
    if (selectedType) all = all.filter((p: any) => p.productType === selectedType);
    if (selectedVendor) all = all.filter((p: any) => p.vendor === selectedVendor);
    return all;
  }, [oosData, selectedType, selectedVendor]);

  const collectionTitle = isAll ? t('collection.allProducts') : (data?.pages?.[0]?.collection?.title || '');

  const allVisibleProducts = useMemo(() => [...products, ...outOfStockProducts], [products, outOfStockProducts]);
  const { getAvailability } = useStockStatus(allVisibleProducts);

  function extractProductData(product: any) {
    return {
      handle: product.handle,
      title: product.title,
      price: product.priceRange.minVariantPrice.amount,
      currencyCode: product.priceRange.minVariantPrice.currencyCode,
      compareAtPrice: product.compareAtPriceRange?.minVariantPrice?.amount,
      imageUrl: product.images?.edges?.[0]?.node?.url,
      availableForSale: getAvailability(product.handle, product.availableForSale),
    };
  }

  const subScrollRef = React.useRef<ScrollView>(null);
  const subChildIds = subChildItems.map(i => i.id).join(',');

  React.useEffect(() => {
    if (isRTL) {
      setTimeout(() => subScrollRef.current?.scrollToEnd({ animated: false }), 50);
    } else {
      subScrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [subChildIds, isRTL]);

  /* ── Sub-categories row ── */
  const subCatRow = showSubRow ? (
    <View style={{
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border + '55',
      paddingVertical: 10,
    }}>
      {subNavStack.length > 0 && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSubNavStack(prev => prev.slice(0, -1));
            setActiveSubChild(null);
          }}
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            gap: 4,
            marginBottom: 8,
          }}
        >
          <Ionicons
            name={isRTL ? 'chevron-forward' : 'chevron-back'}
            size={14}
            color={colors.primary}
          />
          <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 12, color: colors.primary }}>
            {language === 'ar' ? 'رجوع' : 'Back'}
          </Text>
        </Pressable>
      )}
      <ScrollView
        ref={subScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          minWidth: width,
          justifyContent: isRTL ? 'flex-end' : 'flex-start',
          paddingHorizontal: 12,
          gap: 10,
        }}
        onContentSizeChange={(cw) => {
          if (isRTL && cw > width) {
            subScrollRef.current?.scrollToEnd({ animated: false });
          }
        }}
      >
        {(isRTL ? [...subChildItems].reverse() : subChildItems).map((child) => {
          const isSelected = activeSubChild?.id === child.id;
          const title = language === 'ar' ? child.titleAr : child.titleEn;
          const imgUrl = child.imageUrl?.startsWith('http')
            ? child.imageUrl
            : child.imageUrl
              ? `https://${process.env.EXPO_PUBLIC_DOMAIN}${child.imageUrl}`
              : null;

          return (
            <Pressable
              key={child.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedType(null);
                if (child.children && child.children.length > 0) {
                  setSubNavStack(prev => [...prev, child]);
                  setActiveSubChild(null);
                } else {
                  setActiveSubChild(activeSubChild?.id === child.id ? null : child);
                }
              }}
              style={({ pressed }) => ({
                alignItems: 'center',
                opacity: pressed ? 0.75 : 1,
                width: 72,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              })}
            >
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                overflow: 'hidden',
                borderWidth: isSelected ? 2.5 : 1.5,
                borderColor: isSelected ? colors.primary : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(22,50,89,0.1)'),
                backgroundColor: isDark ? '#1e2e45' : '#e8f0fa',
              }}>
                {imgUrl ? (
                  <Image
                    source={{ uri: imgUrl }}
                    style={{ width: '100%', height: '100%' } as any}
                    contentFit="cover"
                  />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="grid-outline" size={22} color={isSelected ? colors.primary : colors.textMuted} />
                  </View>
                )}
              </View>
              <Text style={{
                fontFamily: isSelected ? 'Cairo_700Bold' : 'Cairo_600SemiBold',
                fontSize: 10,
                color: isSelected ? colors.primary : colors.textSecondary,
                textAlign: 'center',
                marginTop: 4,
                width: 70,
                lineHeight: 14,
              }} numberOfLines={2}>
                {title}
              </Text>
              {isSelected && (
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 2 }} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  ) : null;

  /* ── Sort / filter chips ── */
  const listHeader = (
    <>
      <View style={[styles.chipRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={isRTL ? { direction: 'rtl' } : undefined}
          contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}
        >
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowSort(true); }}
            style={[styles.sortChip, { backgroundColor: sortIdx > 0 ? colors.primary + '18' : colors.card, borderColor: sortIdx > 0 ? colors.primary : colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          >
            <Ionicons name="swap-vertical-outline" size={14} color={sortIdx > 0 ? colors.primary : colors.textSecondary} />
            {sortIdx > 0 && <Text style={[styles.sortChipText, { color: colors.primary, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{SORT_OPTIONS[sortIdx].label}</Text>}
            {sortIdx > 0 ? (
              <Pressable onPress={(e) => { e.stopPropagation(); setSortIdx(0); }} hitSlop={8}>
                <Ionicons name="close-circle" size={14} color={colors.primary} />
              </Pressable>
            ) : (
              <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
            )}
          </Pressable>
          {availableTypes.length > 1 && (
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFilter(true); }}
              style={[styles.sortChip, { backgroundColor: selectedType ? colors.primary + '15' : colors.card, borderColor: selectedType ? colors.primary : colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
              <Ionicons name="filter-outline" size={14} color={selectedType ? colors.primary : colors.textSecondary} />
              <Text style={[styles.sortChipText, { color: selectedType ? colors.primary : colors.textSecondary, writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>
                {selectedType ? getTypeLabel(selectedType) : (language === 'ar' ? 'النوع' : 'Type')}
              </Text>
              {selectedType ? (
                <Pressable
                  onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedType(null); }}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={15} color={colors.primary} />
                </Pressable>
              ) : (
                <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
              )}
            </Pressable>
          )}
          {availableVendors.length > 1 && (
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowVendorFilter(true); }}
              style={[styles.sortChip, { backgroundColor: selectedVendor ? colors.primary + '15' : colors.card, borderColor: selectedVendor ? colors.primary : colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
              <Ionicons name="storefront-outline" size={14} color={selectedVendor ? colors.primary : colors.textSecondary} />
              <Text style={[styles.sortChipText, { color: selectedVendor ? colors.primary : colors.textSecondary, writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>
                {selectedVendor ?? (language === 'ar' ? 'الماركة' : 'Brand')}
              </Text>
              {selectedVendor ? (
                <Pressable
                  onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedVendor(null); }}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={15} color={colors.primary} />
                </Pressable>
              ) : (
                <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
              )}
            </Pressable>
          )}
        </ScrollView>
      </View>
    </>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <PageBackground isDark={isDark} />
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.headerTitle, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Pressable onPress={goBack} style={styles.backBtn} testID="back-button">
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>{collectionTitle}</Text>
        </View>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8 }}>
          <Pressable
            style={({ pressed }) => ({
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: pressed ? 'rgba(36,140,204,0.15)' : 'rgba(36,140,204,0.08)',
              alignItems: 'center' as const, justifyContent: 'center' as const,
            })}
            onPress={async () => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const langPath = language === 'en' ? '/en' : '';
                const collectionUrl = `https://xmart.jo${langPath}/collections/${handle}`;
                await Share.share({
                  message: `${collectionTitle}\n${collectionUrl}`,
                  url: collectionUrl,
                  title: collectionTitle,
                });
              } catch (e) {}
            }}
          >
            <Ionicons name="share-social" size={18} color="#248CCC" />
          </Pressable>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/search'); }} style={styles.backBtn}>
            <Ionicons name="search-outline" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {subCatRow}
      {listHeader}

      {isLoading && allProducts.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item, index) => item.handle + index}
          numColumns={PRODUCT_COLUMNS}
          columnWrapperStyle={{ paddingHorizontal: 8, flexDirection: isRTL ? 'row-reverse' : 'row', opacity: (isFetching && !isFetchingNextPage && currentProducts.length === 0) ? 0.4 : 1 }}
          renderItem={({ item }) => (
            <View style={{ width: (width - 24) / PRODUCT_COLUMNS, padding: 4 }}>
              <ProductCard {...extractProductData(item)} />
            </View>
          )}
          ListHeaderComponent={
            isFetching && !isFetchingNextPage ? (
              <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!products.length || showSubRow || !!outOfStockProducts.length}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={true}
          ListFooterComponent={() => (
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
                      {language === 'ar' ? 'غير متوفر حالياً' : 'Out of Stock'}
                    </Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: colors.border + '88' }} />
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 }}>
                    {outOfStockProducts.map((item: any, i: number) => (
                      <View key={(item.handle || item.id) + i} style={{ width: (width - 24) / PRODUCT_COLUMNS, padding: 4, opacity: 0.55 }}>
                        <ProductCard {...extractProductData(item)} />
                      </View>
                    ))}
                  </View>
                </>
              )}
            </>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="bag-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>{t('collection.empty')}</Text>
            </View>
          }
        />
      )}

      <Modal visible={showSort} transparent animationType="slide" onRequestClose={() => setShowSort(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSort(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('collection.sortBy')}</Text>
            {SORT_OPTIONS.slice(1).map((opt, j) => {
              const i = j + 1;
              return (
                <Pressable
                  key={i}
                  style={[styles.sortOption, i === sortIdx && styles.sortOptionActive, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSortIdx(i); setShowSort(false); }}
                >
                  <Text style={[styles.sortOptionText, { color: i === sortIdx ? colors.primary : colors.textSecondary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {opt.label}
                  </Text>
                  {i === sortIdx ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showFilter} transparent animationType="slide" onRequestClose={() => setShowFilter(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowFilter(false)}>
          <Pressable style={[styles.modalContent, { maxHeight: '50%' }]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{language === 'ar' ? 'فلترة حسب النوع' : 'Filter by Type'}</Text>
            <ScrollView showsVerticalScrollIndicator={false} onStartShouldSetResponder={() => true}>
              <Pressable
                style={[styles.sortOption, !selectedType && styles.sortOptionActive, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedType(null); setShowFilter(false); }}
              >
                <Text style={[styles.sortOptionText, { color: !selectedType ? colors.primary : colors.textSecondary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {language === 'ar' ? 'الكل' : 'All'}
                </Text>
                {!selectedType ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
              </Pressable>
              {availableTypes.map((type) => (
                <Pressable
                  key={type}
                  style={[styles.sortOption, selectedType === type && styles.sortOptionActive, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedType(type); setShowFilter(false); }}
                >
                  <Text style={[styles.sortOptionText, { color: selectedType === type ? colors.primary : colors.textSecondary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {getTypeLabel(type)}
                  </Text>
                  {selectedType === type ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                </Pressable>
              ))}
              <View style={{ height: 8 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showVendorFilter} transparent animationType="slide" onRequestClose={() => setShowVendorFilter(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowVendorFilter(false)}>
          <Pressable style={[styles.modalContent, { maxHeight: '55%' }]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{language === 'ar' ? 'فلترة حسب الماركة' : 'Filter by Brand'}</Text>
            <ScrollView showsVerticalScrollIndicator={false} onStartShouldSetResponder={() => true}>
              <Pressable
                style={[styles.sortOption, !selectedVendor && styles.sortOptionActive, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedVendor(null); setShowVendorFilter(false); }}
              >
                <Text style={[styles.sortOptionText, { color: !selectedVendor ? colors.primary : colors.textSecondary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {language === 'ar' ? 'الكل' : 'All'}
                </Text>
                {!selectedVendor ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
              </Pressable>
              {availableVendors.map((vendor) => (
                <Pressable
                  key={vendor}
                  style={[styles.sortOption, selectedVendor === vendor && styles.sortOptionActive, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedVendor(vendor); setShowVendorFilter(false); }}
                >
                  <Text style={[styles.sortOptionText, { color: selectedVendor === vendor ? colors.primary : colors.textSecondary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {vendor}
                  </Text>
                  {selectedVendor === vendor ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
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

function getStyles(colors: typeof Colors.dark) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    headerTitle: {
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 20,
      color: colors.text,
      flex: 1,
    },
    chipRow: {
      alignItems: 'center',
    },
    sortChip: {
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
    },
    sortChipText: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 12,
    },
    loadingWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 100,
      gap: 12,
    },
    emptyText: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 14,
      color: colors.textMuted,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 40,
    },
    modalTitle: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 18,
      color: colors.text,
      textAlign: 'center',
      marginBottom: 16,
    },
    sortOption: {
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sortOptionActive: {
      backgroundColor: colors.primary + '14',
      borderRadius: 10,
    },
    sortOptionText: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 15,
    },
  });
}
