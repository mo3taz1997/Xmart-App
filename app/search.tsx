import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  Platform, ActivityIndicator, Dimensions, ScrollView,
  FlatList, Modal, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import PageBackground from '@/components/PageBackground';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import ProductCard from '@/components/ProductCard';
import { useStockStatus } from '@/lib/useStockStatus';

const { width } = Dimensions.get('window');
const HISTORY_KEY = 'xmart_search_history';
const MAX_HISTORY = 10;
const IS_TABLET_SEARCH = Dimensions.get('window').width >= 768;
const PRODUCT_COLUMNS = IS_TABLET_SEARCH ? 4 : 2;

async function loadHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveToHistory(term: string) {
  try {
    const history = await loadHistory();
    const filtered = history.filter((h) => h.toLowerCase() !== term.toLowerCase());
    filtered.unshift(term);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, MAX_HISTORY)));
  } catch {}
}

async function clearHistory() {
  try { await AsyncStorage.removeItem(HISTORY_KEY); } catch {}
}

function extractProductData(product: any, language: string = 'ar') {
  const title = language === 'ar'
    ? (product.titleAr || product.title)
    : (product.titleEn || product.title);
  return {
    handle: product.handle,
    title,
    price: product.priceRange?.minVariantPrice?.amount || product.price || '0',
    currencyCode: product.priceRange?.minVariantPrice?.currencyCode || product.currencyCode || 'JOD',
    compareAtPrice: product.compareAtPriceRange?.minVariantPrice?.amount || product.compareAtPrice,
    imageUrl: product.images?.edges?.[0]?.node?.url || product.featuredImage?.url || product.imageUrl,
    availableForSale: product.availableForSale,
    vendor: product.vendor,
  };
}

export default function SearchScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const { t, isRTL, language } = useLanguage();
  const { colors, isDark } = useTheme();

  const [query, setQuery] = useState(q || '');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [accumulatedProducts, setAccumulatedProducts] = useState<any[]>([]);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [mode, setMode] = useState<'input' | 'results'>('input');
  const [history, setHistory] = useState<string[]>([]);
  const [showSort, setShowSort] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [sortIdx, setSortIdx] = useState(0);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [allBrands, setAllBrands] = useState<any[]>([]);

  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSearchDone = useRef(false);
  const inputRef = useRef<TextInput>(null);

  const SORT_OPTIONS = [
    { key: 'relevance', label: language === 'ar' ? 'الأكثر صلة' : 'Most Relevant' },
    { key: 'price_asc', label: t('collection.priceLow') },
    { key: 'price_desc', label: t('collection.priceHigh') },
    { key: 'name', label: t('collection.name') },
  ];

  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);

  useEffect(() => {
    if (q && q.trim().length >= 2 && !initialSearchDone.current) {
      initialSearchDone.current = true;
      executeSearch(q.trim());
    }
  }, [q]);

  const PAGE_SIZE = 20;

  const executeSearch = async (text: string, brandFilter?: string | null) => {
    if (Platform.OS !== 'web') Keyboard.dismiss();
    setIsLoading(true);
    setMode('results');
    setSuggestions(null);
    setAccumulatedProducts([]);
    setHasMoreResults(false);
    setCurrentSearchTerm(text);
    try {
      const filters: any = { limit: PAGE_SIZE, offset: 0 };
      if (brandFilter) filters.brand = brandFilter;
      const data = await api.searchProducts(text, language, filters);
      const prods = Array.isArray(data) ? data : (data.products || []);
      const meta = Array.isArray(data)
        ? { totalCount: data.length, brands: [], suggestions: [] }
        : data;
      setAccumulatedProducts(prods);
      setSearchResults(meta);
      setHasMoreResults(prods.length === PAGE_SIZE && (meta.totalCount || prods.length) > prods.length);
      if (!brandFilter) {
        if (meta.brands && meta.brands.length > 0) setAllBrands(meta.brands);
        saveToHistory(text);
        loadHistory().then(setHistory);
      }
    } catch {
      setAccumulatedProducts([]);
      setSearchResults({ products: [], totalCount: 0, brands: [], suggestions: [] });
      setHasMoreResults(false);
    }
    setIsLoading(false);
  };

  const loadMoreResults = async () => {
    if (isLoadingMore || !hasMoreResults || !currentSearchTerm) return;
    setIsLoadingMore(true);
    try {
      const filters: any = { limit: PAGE_SIZE, offset: accumulatedProducts.length };
      if (selectedBrand) filters.brand = selectedBrand;
      const data = await api.searchProducts(currentSearchTerm, language, filters);
      const prods = Array.isArray(data) ? data : (data.products || []);
      const newAll = [...accumulatedProducts, ...prods];
      setAccumulatedProducts(newAll);
      const total = searchResults?.totalCount || newAll.length;
      setHasMoreResults(prods.length === PAGE_SIZE && newAll.length < total);
    } catch {}
    setIsLoadingMore(false);
  };

  const fetchSuggestions = async (text: string) => {
    try {
      setIsSuggestLoading(true);
      const data = await api.searchSuggest(text, language);
      setSuggestions(data);
    } catch {
      setSuggestions(null);
    }
    setIsSuggestLoading(false);
  };

  const handleTextChange = useCallback((text: string) => {
    setQuery(text);
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);

    if (mode === 'results') {
      setMode('input');
      setSearchResults(null);
    }

    if (text.trim().length < 2) {
      setSuggestions(null);
      return;
    }

    suggestTimerRef.current = setTimeout(() => {
      fetchSuggestions(text.trim());
    }, 200);
  }, [mode, language]);

  const handleSubmit = () => {
    if (query.trim().length >= 2) {
      executeSearch(query.trim());
    }
  };

  const handleSuggestionTap = (text: string, type: 'product' | 'category' | 'popular', handle?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    if (type === 'product' && handle) {
      setTimeout(() => router.push({ pathname: '/product/[handle]', params: { handle } }), 50);
    } else if (type === 'category' && handle) {
      setTimeout(() => router.push({ pathname: '/collection/[handle]', params: { handle } }), 50);
    } else {
      setQuery(text);
      executeSearch(text);
    }
  };

  const handleHistoryTap = (term: string) => {
    setQuery(term);
    executeSearch(term);
  };

  const handleClearHistory = async () => {
    await clearHistory();
    setHistory([]);
  };

  const goBackToInput = () => {
    setMode('input');
    setSearchResults(null);
    setAccumulatedProducts([]);
    setHasMoreResults(false);
    setSortIdx(0);
    setSelectedBrand(null);
    inputRef.current?.focus();
  };

  const products = accumulatedProducts;
  const totalCount = searchResults?.totalCount || accumulatedProducts.length;
  const resultBrands = searchResults?.brands || [];

  const { getAvailability } = useStockStatus(products);

  const sortedFilteredProducts = React.useMemo(() => {
    let filtered = products.map((p: any) => ({
      ...p,
      availableForSale: getAvailability(p.handle, p.availableForSale),
    }));
    if (sortIdx === 1) {
      filtered.sort((a: any, b: any) => {
        const pa = parseFloat(a.priceRange?.minVariantPrice?.amount || a.price || '0');
        const pb = parseFloat(b.priceRange?.minVariantPrice?.amount || b.price || '0');
        return pa - pb;
      });
    } else if (sortIdx === 2) {
      filtered.sort((a: any, b: any) => {
        const pa = parseFloat(a.priceRange?.minVariantPrice?.amount || a.price || '0');
        const pb = parseFloat(b.priceRange?.minVariantPrice?.amount || b.price || '0');
        return pb - pa;
      });
    } else if (sortIdx === 3) {
      filtered.sort((a: any, b: any) => (a.title || '').localeCompare(b.title || ''));
    }
    return filtered.sort((a: any, b: any) => {
      const aOut = a.availableForSale === false ? 1 : 0;
      const bOut = b.availableForSale === false ? 1 : 0;
      if (aOut !== bOut) return aOut - bOut;
      return 0;
    });
  }, [products, sortIdx, getAvailability]);

  const vendorBrands = React.useMemo(() => {
    if (allBrands.length > 0) return allBrands;
    if (resultBrands.length > 0) return resultBrands;
    const map = new Map<string, number>();
    products.forEach((p: any) => {
      if (p.vendor) map.set(p.vendor, (map.get(p.vendor) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [products, resultBrands, allBrands]);

  const hasSuggestionContent = suggestions && mode === 'input' && query.trim().length >= 2 && (
    (suggestions.products?.length > 0) ||
    (suggestions.categories?.length > 0) ||
    (suggestions.popular?.length > 0)
  );

  const activeFilterCount = (selectedBrand ? 1 : 0);

  if (mode === 'results') {
    return (
      <Pressable style={{ flex: 1 }} onPress={() => { if (Platform.OS !== 'web') Keyboard.dismiss(); }}>
        <View style={[rs.container, { backgroundColor: colors.background, paddingTop: insets.top + webTopInset }]}>
          <View style={[rs.header, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.border }]}>
          <Pressable onPress={goBackToInput} style={rs.backBtn}>
            <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={colors.text} />
          </Pressable>
          <Pressable
            style={[rs.searchPill, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
            onPress={goBackToInput}
          >
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <Text style={[rs.searchPillText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>
              {query}
            </Text>
          </Pressable>
        </View>

        <View style={[rs.toolbar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowSort(true); }}
              style={[rs.chip, { backgroundColor: sortIdx > 0 ? colors.primary + '18' : colors.card, borderColor: sortIdx > 0 ? colors.primary : colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
              <Ionicons name="swap-vertical-outline" size={14} color={sortIdx > 0 ? colors.primary : colors.textSecondary} />
              {sortIdx > 0 && <Text style={[rs.chipText, { color: colors.primary, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{SORT_OPTIONS[sortIdx].label}</Text>}
              {sortIdx > 0 ? (
                <Pressable onPress={(e) => { e.stopPropagation(); setSortIdx(0); }} hitSlop={8}>
                  <Ionicons name="close-circle" size={14} color={colors.primary} />
                </Pressable>
              ) : (
                <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
              )}
            </Pressable>
            {vendorBrands.length > 1 && (
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFilter(true); }}
                style={[rs.chip, {
                  backgroundColor: selectedBrand ? colors.primary + '15' : colors.card,
                  borderColor: selectedBrand ? colors.primary : colors.border,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                }]}
              >
                <Ionicons name="pricetag-outline" size={14} color={selectedBrand ? colors.primary : colors.textSecondary} />
                <Text style={[rs.chipText, { color: selectedBrand ? colors.primary : colors.textSecondary, writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>
                  {selectedBrand || (language === 'ar' ? 'الماركة' : 'Brand')}
                </Text>
                {selectedBrand ? (
                  <Pressable
                    onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedBrand(null); if (currentSearchTerm) executeSearch(currentSearchTerm, null); }}
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle" size={15} color={colors.primary} />
                  </Pressable>
                ) : (
                  <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
                )}
              </Pressable>
            )}
          </View>
          <Text style={[rs.countText, { color: colors.textMuted }]}>
            {totalCount > 0 ? `${totalCount} ${t('search.products')}` : `${sortedFilteredProducts.length} ${t('search.products')}`}
          </Text>
        </View>

        {isLoading ? (
          <View style={rs.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : sortedFilteredProducts.length === 0 ? (
          <View style={rs.emptyWrap}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <Text style={[rs.emptyText, { color: colors.textMuted }]}>{t('search.noResults')} "{query}"</Text>
          </View>
        ) : (
          <FlatList
            data={sortedFilteredProducts}
            keyExtractor={(item: any, index: number) => (item.handle || item.id || '') + index}
            numColumns={PRODUCT_COLUMNS}
            columnWrapperStyle={{ paddingHorizontal: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}
            renderItem={({ item }) => (
              <View style={{ width: (width - 24) / PRODUCT_COLUMNS, padding: 4 }}>
                <ProductCard {...extractProductData(item, language)} />
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!!sortedFilteredProducts.length}
            onEndReached={() => { if (hasMoreResults) loadMoreResults(); }}
            onEndReachedThreshold={0.4}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
            removeClippedSubviews={true}
            ListFooterComponent={
              isLoadingMore ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null
            }
          />
        )}

        <Modal visible={showSort} transparent animationType="slide" onRequestClose={() => setShowSort(false)}>
          <Pressable style={rs.modalOverlay} onPress={() => setShowSort(false)}>
            <View style={[rs.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[rs.modalTitle, { color: colors.text, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('collection.sortBy')}</Text>
              {SORT_OPTIONS.map((opt, i) => (
                <Pressable
                  key={i}
                  style={[rs.sortOption, i === sortIdx && rs.sortOptionActive, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.border }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSortIdx(i);
                    setShowSort(false);
                  }}
                >
                  <Text style={[rs.sortOptionText, { color: i === sortIdx ? colors.primary : colors.textSecondary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {opt.label}
                  </Text>
                  {i === sortIdx ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>

        <Modal visible={showFilter} transparent animationType="slide" onRequestClose={() => setShowFilter(false)}>
          <Pressable style={rs.modalOverlay} onPress={() => setShowFilter(false)}>
            <View style={[rs.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[rs.modalTitle, { color: colors.text, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('search.brand')}</Text>
              <Pressable
                style={[rs.sortOption, !selectedBrand && rs.sortOptionActive, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.border }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedBrand(null);
                  setShowFilter(false);
                  if (currentSearchTerm) executeSearch(currentSearchTerm, null);
                }}
              >
                <Text style={[rs.sortOptionText, { color: !selectedBrand ? colors.primary : colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('search.allBrands')}
                </Text>
                {!selectedBrand ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
              </Pressable>
              <ScrollView style={{ maxHeight: 350 }}>
                {vendorBrands.map((brand: any) => (
                  <Pressable
                    key={brand.name}
                    style={[rs.sortOption, selectedBrand === brand.name && rs.sortOptionActive, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.border }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const newBrand = selectedBrand === brand.name ? null : brand.name;
                      setSelectedBrand(newBrand);
                      setShowFilter(false);
                      if (currentSearchTerm) executeSearch(currentSearchTerm, newBrand);
                    }}
                  >
                    <Text style={[rs.sortOptionText, { color: selectedBrand === brand.name ? colors.primary : colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      {brand.name} ({brand.count})
                    </Text>
                    {selectedBrand === brand.name ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      </View>
    </Pressable>
    );
  }

  return (
    <Pressable style={{ flex: 1 }} onPress={() => { if (Platform.OS !== 'web') Keyboard.dismiss(); }}>
      <View style={[ss.container, { backgroundColor: colors.background, paddingTop: insets.top + webTopInset }]}>
        <PageBackground isDark={isDark} />
        <View style={[ss.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable style={ss.backBtn} onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); }} testID="back-button">
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={22} color="#fff" />
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => { if (Platform.OS !== 'web') Keyboard.dismiss(); }} accent-color="transparent">
          <View style={[ss.searchBarWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="search" size={18} color="#999" />
            <TextInput
              ref={inputRef}
              style={[ss.searchInput, { writingDirection: isRTL ? 'rtl' : 'ltr' }]}
              placeholder={t('search.placeholder')}
              placeholderTextColor="#999"
              value={query}
              onChangeText={handleTextChange}
              autoFocus
              textAlign={isRTL ? 'right' : 'left'}
              textAlignVertical="center"
              returnKeyType="search"
              onSubmitEditing={handleSubmit}
            />
            {query.length > 0 ? (
              <Pressable onPress={() => { setQuery(''); setSuggestions(null); setSearchResults(null); setMode('input'); inputRef.current?.focus(); }}>
                <Ionicons name="close-circle" size={18} color="#999" />
              </Pressable>
            ) : null}
          </View>
        </Pressable>
        </View>
      </View>

      {hasSuggestionContent ? (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 80 }}>
          {suggestions.popular?.length > 0 ? (
            <View style={sgStyles.section}>
              <View style={[sgStyles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="trending-up" size={16} color={colors.primary} />
                <Text style={[sgStyles.sectionTitle, { color: colors.text }]}>{t('search.popular')}</Text>
              </View>
              {suggestions.popular.map((term: string, i: number) => (
                <Pressable
                  key={`pop-${i}`}
                  style={({ pressed }) => [sgStyles.row, { flexDirection: isRTL ? 'row-reverse' : 'row', opacity: pressed ? 0.7 : 1, borderBottomColor: colors.border }]}
                  onPress={() => handleSuggestionTap(term, 'popular')}
                >
                  <Ionicons name="search-outline" size={14} color={colors.textMuted} />
                  <Text style={[sgStyles.rowText, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{term}</Text>
                  <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={12} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          ) : null}

          {suggestions.categories?.length > 0 ? (
            <View style={sgStyles.section}>
              <View style={[sgStyles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="grid-outline" size={16} color={colors.primary} />
                <Text style={[sgStyles.sectionTitle, { color: colors.text }]}>{t('search.categories')}</Text>
              </View>
              {suggestions.categories.map((cat: any, i: number) => (
                <Pressable
                  key={`cat-${i}`}
                  style={({ pressed }) => [sgStyles.row, { flexDirection: isRTL ? 'row-reverse' : 'row', opacity: pressed ? 0.7 : 1, borderBottomColor: colors.border }]}
                  onPress={() => handleSuggestionTap(cat.title, 'category', cat.handle)}
                >
                  <Ionicons name="folder-outline" size={14} color={colors.primary} />
                  <Text style={[sgStyles.rowText, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{cat.title}</Text>
                  <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={12} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          ) : null}

          {suggestions.products?.length > 0 ? (
            <View style={sgStyles.section}>
              <View style={[sgStyles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="cube-outline" size={16} color={colors.primary} />
                <Text style={[sgStyles.sectionTitle, { color: colors.text }]}>{t('search.suggestions')}</Text>
              </View>
              {suggestions.products.map((product: any, i: number) => (
                <Pressable
                  key={`sug-${i}`}
                  style={({ pressed }) => [sgStyles.productRow, { flexDirection: isRTL ? 'row-reverse' : 'row', opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => handleSuggestionTap(language === 'ar' ? (product.titleAr || product.title) : (product.titleEn || product.title), 'product', product.handle)}
                >
                  <View style={[sgStyles.productImgWrap, { backgroundColor: '#FFFFFF' }]}>
                    {product.imageUrl ? (
                      <Image source={{ uri: product.imageUrl }} style={sgStyles.productImg} contentFit="cover" />
                    ) : (
                      <Ionicons name="cube-outline" size={16} color={colors.textMuted} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[sgStyles.productTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{language === 'ar' ? (product.titleAr || product.title) : (product.titleEn || product.title)}</Text>
                    {product.vendor ? <Text style={[sgStyles.productVendor, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{product.vendor}</Text> : null}
                  </View>
                  <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={14} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          ) : null}

          {query.trim().length >= 2 ? (
            <Pressable
              style={[sgStyles.showAllBtn, { borderColor: colors.primary }]}
              onPress={handleSubmit}
            >
              <Text style={[sgStyles.showAllBtnText, { color: colors.primary }]}>{t('search.showAll')}</Text>
              <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={16} color={colors.primary} />
            </Pressable>
          ) : null}

          {isSuggestLoading ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null}
        </ScrollView>
      ) : query.trim().length < 2 ? (
        history.length > 0 ? (
          <View style={{ flex: 1, paddingTop: 16 }}>
            <View style={[hStyles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[hStyles.headerLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="time-outline" size={18} color={colors.textMuted} />
                <Text style={[hStyles.headerTitle, { color: colors.text }]}>{t('search.recentSearches')}</Text>
              </View>
              <Pressable onPress={handleClearHistory}>
                <Text style={[hStyles.clearBtn, { color: colors.primary }]}>{t('search.clearHistory')}</Text>
              </Pressable>
            </View>
            <View style={hStyles.list}>
              {history.map((term, i) => (
                <Pressable
                  key={`${term}-${i}`}
                  style={({ pressed }) => [hStyles.item, { flexDirection: isRTL ? 'row-reverse' : 'row', opacity: pressed ? 0.7 : 1, borderBottomColor: colors.border }]}
                  onPress={() => handleHistoryTap(term)}
                >
                  <Ionicons name="search-outline" size={16} color={colors.textMuted} />
                  <Text style={[hStyles.itemText, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{term}</Text>
                  <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={14} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View style={ss.emptyWrap}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <Text style={[ss.emptyText, { color: colors.textMuted }]}>{t('search.searchProducts')}</Text>
          </View>
        )
      ) : isSuggestLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={ss.emptyWrap}>
          <Ionicons name="search-outline" size={48} color={colors.textMuted} />
          <Text style={[ss.emptyText, { color: colors.textMuted }]}>{t('search.searchProducts')}</Text>
        </View>
      )}
  </Pressable>
  );
}

const ss = StyleSheet.create({
  container: {},
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 12,
    gap: 10,
    backgroundColor: '#163259',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarWrap: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Cairo_400Regular',
    fontSize: 14,
    color: '#333',
    paddingVertical: 0,
    height: 42,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Cairo_400Regular',
    fontSize: 14,
  },
});

const rs = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPill: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
    gap: 8,
  },
  searchPillText: {
    flex: 1,
    fontFamily: 'Cairo_600SemiBold',
    fontSize: 14,
  },
  toolbar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  chipText: {
    fontFamily: 'Cairo_600SemiBold',
    fontSize: 12,
    maxWidth: 100,
  },
  countText: {
    fontFamily: 'Cairo_400Regular',
    fontSize: 12,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Cairo_400Regular',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    maxHeight: '60%',
  },
  modalTitle: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 17,
    paddingBottom: 12,
  },
  sortOption: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortOptionActive: {},
  sortOptionText: {
    fontFamily: 'Cairo_600SemiBold',
    fontSize: 15,
    flex: 1,
  },
});

const sgStyles = StyleSheet.create({
  section: {
    marginTop: 12,
  },
  sectionHeader: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 14,
  },
  row: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flex: 1,
    fontFamily: 'Cairo_400Regular',
    fontSize: 14,
  },
  productRow: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  productImgWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImg: {
    width: 40,
    height: 40,
  },
  productTitle: {
    fontFamily: 'Cairo_600SemiBold',
    fontSize: 13,
  },
  productVendor: {
    fontFamily: 'Cairo_400Regular',
    fontSize: 11,
  },
  showAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  showAllBtnText: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 14,
  },
});

const hStyles = StyleSheet.create({
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerLeft: {
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 15,
  },
  clearBtn: {
    fontFamily: 'Cairo_600SemiBold',
    fontSize: 13,
  },
  list: {
    paddingHorizontal: 16,
  },
  item: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemText: {
    flex: 1,
    fontFamily: 'Cairo_400Regular',
    fontSize: 14,
  },
});
