"use no memo";
import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Platform,
  ActivityIndicator, Dimensions, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
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
const IS_TABLET_BRAND = Dimensions.get('window').width >= 768;
const PRODUCT_COLUMNS = IS_TABLET_BRAND ? 4 : 2;

function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/(tabs)');
  }
}

export default function BrandScreen() {
  const { vendor } = useLocalSearchParams<{ vendor: string }>();
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

  useEffect(() => { setRandomSeed(Math.random()); }, [vendor]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['brand-products', vendor, sortIdx, language, sortIdx === 0 ? randomSeed : 0],
    queryFn: async ({ pageParam }) => {
      const sort = SORT_OPTIONS[sortIdx];
      const params: Record<string, string> = {
        first: String(PAGE_SIZE),
        sortKey: sort.key,
        reverse: String(sort.reverse),
        query: `vendor:${vendor}`,
        pageInfo: 'true',
      };
      if (pageParam) params.after = pageParam as string;
      return api.getProducts(params, language);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: any) => {
      if (lastPage?.pageInfo?.hasNextPage) return lastPage.pageInfo.endCursor;
      return undefined;
    },
    enabled: !!vendor,
  });

  const allProducts = useMemo(() => {
    return data?.pages?.flatMap((page: any) =>
      Array.isArray(page) ? page : (page?.products || [])
    ) || [];
  }, [data]);

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    allProducts.forEach((p: any) => { if (p.productType) types.add(p.productType); });
    return Array.from(types).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [allProducts]);

  const [typeTranslations, setTypeTranslations] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
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

  const { getAvailability, stockLoaded } = useStockStatus(allProducts);

  const products = useMemo(() => {
    const filtered = selectedType
      ? allProducts.filter((p: any) => p.productType === selectedType)
      : allProducts;
    const withStock = filtered.map((p: any) => ({
      ...p,
      availableForSale: getAvailability(p.handle, p.availableForSale),
    }));
    if (!stockLoaded) return withStock;
    const inStock = withStock.filter((p: any) => p.availableForSale !== false);
    const outOfStock = withStock.filter((p: any) => p.availableForSale === false);
    return [...inStock, ...outOfStock];
  }, [allProducts, selectedType, getAvailability, stockLoaded]);

  function extractProductData(product: any) {
    return {
      handle: product.handle,
      title: product.title,
      price: product.priceRange.minVariantPrice.amount,
      currencyCode: product.priceRange.minVariantPrice.currencyCode,
      compareAtPrice: product.compareAtPriceRange?.minVariantPrice?.amount,
      imageUrl: product.images?.edges?.[0]?.node?.url,
      availableForSale: product.availableForSale,
    };
  }

  const listHeader = (
    <View style={[styles.chipRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={isRTL ? { direction: 'rtl' } as any : undefined}
        contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}
      >
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowSort(true); }}
          style={[styles.chip, { backgroundColor: sortIdx > 0 ? colors.primary + '18' : colors.card, borderColor: sortIdx > 0 ? colors.primary : colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          <Ionicons name="swap-vertical-outline" size={14} color={sortIdx > 0 ? colors.primary : colors.textSecondary} />
          {sortIdx > 0 && <Text style={[styles.chipText, { color: colors.primary }]}>{SORT_OPTIONS[sortIdx].label}</Text>}
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
            style={[styles.chip, {
              backgroundColor: selectedType ? colors.primary + '15' : colors.card,
              borderColor: selectedType ? colors.primary : colors.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            }]}
          >
            <Ionicons name="filter-outline" size={14} color={selectedType ? colors.primary : colors.textSecondary} />
            <Text style={[styles.chipText, { color: selectedType ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
              {selectedType ? getTypeLabel(selectedType) : (language === 'ar' ? 'النوع' : 'Type')}
            </Text>
            {selectedType ? (
              <Pressable onPress={(e) => { e.stopPropagation(); setSelectedType(null); }} hitSlop={8}>
                <Ionicons name="close-circle" size={15} color={colors.primary} />
              </Pressable>
            ) : (
              <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
            )}
          </Pressable>
        )}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <PageBackground isDark={isDark} />

      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.headerLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Pressable onPress={goBack} style={styles.backBtn} testID="back-button">
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={colors.text} />
          </Pressable>
          <Text
            style={[styles.title, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
            numberOfLines={1}
          >
            {vendor}
          </Text>
        </View>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/search'); }}>
          <Ionicons name="search-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item, i) => item.handle + i}
          numColumns={PRODUCT_COLUMNS}
          columnWrapperStyle={{ paddingHorizontal: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}
          renderItem={({ item }) => (
            <View style={{ width: (width - 24) / PRODUCT_COLUMNS, padding: 4 }}>
              <ProductCard {...extractProductData(item)} />
            </View>
          )}
          ListHeaderComponent={listHeader}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!products.length}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.5}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={true}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="bag-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>{t('collection.empty')}</Text>
            </View>
          }
        />
      )}

      {/* Sort modal */}
      <Modal visible={showSort} transparent animationType="slide" onRequestClose={() => setShowSort(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSort(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('collection.sortBy')}</Text>
            {SORT_OPTIONS.slice(1).map((opt, j) => {
              const i = j + 1;
              return (
              <Pressable
                key={i}
                style={[styles.sortOption, i === sortIdx && styles.sortOptionActive, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSortIdx(i); setShowSort(false); }}
              >
                <Text style={[styles.sortOptionText, { color: i === sortIdx ? colors.primary : colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {opt.label}
                </Text>
                {i === sortIdx ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
              </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* Filter modal */}
      <Modal visible={showFilter} transparent animationType="slide" onRequestClose={() => setShowFilter(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowFilter(false)}>
          <View style={[styles.modalContent, { maxHeight: '50%' }]}>
            <Text style={styles.modalTitle}>{language === 'ar' ? 'فلترة حسب النوع' : 'Filter by Type'}</Text>
            <ScrollView showsVerticalScrollIndicator={false} onStartShouldSetResponder={() => true}>
              <Pressable
                style={[styles.sortOption, !selectedType && styles.sortOptionActive, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedType(null); setShowFilter(false); }}
              >
                <Text style={[styles.sortOptionText, { color: !selectedType ? colors.primary : colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
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
                  <Text style={[styles.sortOptionText, { color: selectedType === type ? colors.primary : colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {getTypeLabel(type)}
                  </Text>
                  {selectedType === type ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                </Pressable>
              ))}
              <View style={{ height: 8 }} />
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function getStyles(colors: typeof Colors.dark) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    headerLeft: { alignItems: 'center', gap: 10, flex: 1 },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.card,
      alignItems: 'center', justifyContent: 'center',
    },
    title: {
      fontFamily: 'Cairo_700Bold', fontSize: 20,
      color: colors.text, flex: 1,
    },
    chipRow: { alignItems: 'center' },
    chip: {
      alignItems: 'center', gap: 5,
      paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: 20, borderWidth: 1,
    },
    chipText: { fontFamily: 'Cairo_600SemiBold', fontSize: 12 },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyWrap: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      paddingTop: 100, gap: 12,
    },
    emptyText: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: colors.textMuted },
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 20, paddingBottom: 40,
    },
    modalTitle: {
      fontFamily: 'Cairo_700Bold', fontSize: 18,
      color: colors.text, textAlign: 'center', marginBottom: 16,
    },
    sortOption: {
      alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 14, paddingHorizontal: 8,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    sortOptionActive: { backgroundColor: colors.primary + '14', borderRadius: 10 },
    sortOptionText: { fontFamily: 'Cairo_600SemiBold', fontSize: 15, flex: 1 },
  });
}
