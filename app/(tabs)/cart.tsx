import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Platform,
  TextInput, ActivityIndicator, Alert, Dimensions, Animated, Keyboard, InteractionManager,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { tabEvents } from '@/lib/tabEvents';
import PageBackground from '@/components/PageBackground';

const { width } = Dimensions.get('window');
const MINI_CARD_W = 130;

function UpsellMiniCard({ item, onAdded }: { item: any; onAdded?: (handle: string) => void }) {
  const { addToCart } = useCart();
  const { formatCurrency, isRTL, language } = useLanguage();
  const { colors } = useTheme();
  const [adding, setAdding] = React.useState(false);
  const [added, setAdded] = React.useState(false);
  const imgUrl = item.images?.edges?.[0]?.node?.url || item.featuredImage?.url;
  const price = item.priceRange?.minVariantPrice?.amount || '0';
  const curr = item.priceRange?.minVariantPrice?.currencyCode || 'JOD';
  const variantId = item.variants?.edges?.[0]?.node?.id;

  const handleAdd = async () => {
    if (!variantId || adding) return;
    setAdding(true);
    try {
      await addToCart(variantId, 1, {
        productTitle: item.title || '',
        productHandle: item.handle || '',
        price,
        currencyCode: curr,
        imageUrl: imgUrl || null,
        variantTitle: item.variants?.edges?.[0]?.node?.title,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
      onAdded?.(item.handle);
    } catch {}
    setAdding(false);
  };

  return (
    <View style={{ width: MINI_CARD_W, backgroundColor: colors.card, borderRadius: 10, overflow: 'hidden', borderWidth: added ? 2 : 0, borderColor: '#4CAF50' }}>
      <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/product/[handle]', params: { handle: item.handle } }); }}>
        <View style={{ width: MINI_CARD_W, height: MINI_CARD_W, backgroundColor: '#fff' }}>
          {imgUrl ? (
            <Image source={{ uri: imgUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="image-outline" size={24} color={colors.textMuted} />
            </View>
          )}
        </View>
      </Pressable>
      <View style={{ padding: 6, gap: 2 }}>
        <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 10, color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }} numberOfLines={1}>{item.title}</Text>
        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 12, color: colors.primary, textAlign: isRTL ? 'right' : 'left' }}>{formatCurrency(price, curr)}</Text>
        <Pressable
          onPress={handleAdd}
          disabled={adding || !item.availableForSale}
          style={({ pressed }) => ({
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            backgroundColor: item.availableForSale ? (added ? '#4CAF50' : pressed ? '#1a7ab5' : '#248CCC') : colors.textMuted,
            borderRadius: 6,
            paddingVertical: 5,
            marginTop: 4,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          {adding ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : added ? (
            <>
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 10, color: '#fff' }}>
                {language === 'ar' ? 'أُضيف ✓' : 'Added ✓'}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="cart" size={13} color="#fff" />
              <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 10, color: '#fff' }}>
                {language === 'ar' ? 'أضف' : 'Add'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function CartItem({ item, highlighted }: { item: any; highlighted?: boolean }) {
  const { updateQuantity, removeFromCart, isLoading } = useCart();
  const { isRTL, formatCurrency } = useLanguage();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  const line = item;
  const product = line.merchandise.product;
  const imageUrl = product.images?.edges?.[0]?.node?.url;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (highlighted) {
      glowOpacity.setValue(0);
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(1400),
        Animated.timing(glowOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  }, [highlighted]);

  return (
    <View style={{ position: 'relative' }}>
      <View style={[styles.cartItem, {
        flexDirection: isRTL ? 'row-reverse' : 'row',
        borderWidth: 2,
        borderColor: highlighted ? '#4CAF50' : 'transparent',
      }]}>
        <Pressable
          style={styles.itemImageWrap}
          onPress={() => {
            const handle = product?.handle;
            if (handle) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: '/product/[handle]', params: { handle } });
            }
          }}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.itemImage} contentFit="cover" />
          ) : (
            <View style={styles.itemPlaceholder}>
              <Ionicons name="image-outline" size={24} color={colors.textMuted} />
            </View>
          )}
        </Pressable>
        <View style={styles.itemDetails}>
          <Text style={[styles.itemTitle, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={2}>{product.title}</Text>
          {line.merchandise.title !== 'Default Title' ? (
            <Text style={[styles.itemVariant, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{line.merchandise.title}</Text>
          ) : null}
          <Text style={[styles.itemPrice, { textAlign: isRTL ? 'right' : 'left' }]}>
            {formatCurrency(line.merchandise.price.amount, line.merchandise.price.currencyCode)}
          </Text>
          <View style={styles.qtyRow}>
            <Pressable
              style={({ pressed }) => [styles.qtyBtn, pressed && { backgroundColor: 'rgba(244,67,54,0.2)' }]}
              onPress={() => {
                if (line.quantity <= 1) {
                  removeFromCart(line.id);
                } else {
                  updateQuantity(line.id, line.quantity - 1);
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              disabled={isLoading}
            >
              <Ionicons name="remove" size={16} color="#E53935" />
            </Pressable>
            <Text style={styles.qtyText}>{line.quantity}</Text>
            <Pressable
              style={({ pressed }) => [styles.qtyBtn, pressed && { backgroundColor: 'rgba(76,175,80,0.2)' }]}
              onPress={() => {
                updateQuantity(line.id, line.quantity + 1);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              disabled={isLoading}
            >
              <Ionicons name="add" size={16} color="#4CAF50" />
            </Pressable>
          </View>
        </View>
        <Pressable
          style={[styles.removeBtn, { backgroundColor: isDark ? 'rgba(244,67,54,0.15)' : 'rgba(244,67,54,0.08)' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            removeFromCart(line.id);
          }}
        >
          <Ionicons name="trash-outline" size={14} color="#f44336" />
        </Pressable>
      </View>
      {highlighted && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            borderRadius: 12,
            opacity: glowOpacity,
            backgroundColor: 'rgba(76,175,80,0.06)',
          }}
        />
      )}
    </View>
  );
}

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;
  const router = useRouter();
  const { cart, isLoading, getCheckoutUrl, clearCart } = useCart();
  const { t, isRTL, formatCurrency } = useLanguage();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  const { language } = useLanguage();
  const lines = cart?.lines?.edges?.map((e: any) => e.node) || [];
  const subtotal = cart?.cost?.subtotalAmount?.amount;
  const total = cart?.cost?.totalAmount?.amount;
  const currency = cart?.cost?.totalAmount?.currencyCode;

  const cartHandles = useMemo(() =>
    lines.map((l: any) => l.merchandise?.product?.handle).filter(Boolean),
    [lines]
  );

  const { data: smartUpsell } = useQuery({
    queryKey: ['cart-upsell', cartHandles.join(','), language],
    queryFn: () => api.getCartUpsell(cartHandles, language),
    enabled: cartHandles.length > 0,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: trendingProducts } = useQuery({
    queryKey: ['cart-trending', language],
    queryFn: () => api.getTrendingProducts(language),
    staleTime: 10 * 60 * 1000,
    enabled: cartHandles.length === 0,
  });

  const upsellList = useMemo(() => {
    if (smartUpsell && smartUpsell.length > 0) return smartUpsell;
    const fb = Array.isArray(trendingProducts) ? trendingProducts : [];
    return fb.filter((p: any) => p.availableForSale && !cartHandles.includes(p.handle)).slice(0, 12);
  }, [smartUpsell, trendingProducts, cartHandles]);

  const [highlightedHandle, setHighlightedHandle] = useState<string | null>(null);

  const mainFlatListRef = useRef<FlatList>(null);
  const linesRef = useRef(lines);
  useEffect(() => { linesRef.current = lines; }, [lines]);

  const handleUpsellAdded = useCallback((handle: string) => {
    setHighlightedHandle(handle);
    setTimeout(() => {
      const currentLines = linesRef.current;
      const idx = currentLines.findIndex((l: any) => l.merchandise?.product?.handle === handle);
      if (idx >= 0) {
        try {
          mainFlatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
        } catch {
          mainFlatListRef.current?.scrollToEnd({ animated: true });
        }
      }
    }, 400);
    setTimeout(() => setHighlightedHandle(null), 3000);
  }, []);
  useEffect(() => {
    return tabEvents.on('cartTabPress', () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      mainFlatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  }, []);

  const handleCheckout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push('/cod-order');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <PageBackground isDark={isDark} />
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('cart.title')}</Text>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/search'); }}>
            <Ionicons name="search-outline" size={22} color={colors.text} />
          </Pressable>
          {lines.length > 0 ? (
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); clearCart(); }}>
              <Ionicons name="trash-outline" size={22} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        ref={mainFlatListRef}
        data={lines}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CartItem item={item} highlighted={highlightedHandle === item.merchandise?.product?.handle} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 260 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        scrollEnabled={!!lines.length || upsellList.length > 0}
        onScrollToIndexFailed={() => {
          mainFlatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }}
        ListEmptyComponent={
          <View>
            <View style={styles.emptyWrap}>
              <Ionicons name="cart-outline" size={64} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>{t('cart.empty')}</Text>
              <Text style={styles.emptySubtext}>{t('cart.emptyDesc')}</Text>
            </View>
            {upsellList.length > 0 ? (
              <View style={styles.upsellSection}>
                <View style={[styles.upsellHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={styles.upsellAccent} />
                  <Ionicons name="sparkles" size={18} color="#248CCC" />
                  <Text style={[styles.upsellTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {language === 'ar' ? 'منتجات قد تعجبك' : 'Products You May Like'}
                  </Text>
                </View>
                <FlatList
                  data={upsellList}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 4, gap: 8 }}
                  style={{ direction: isRTL ? 'rtl' : 'ltr' }}
                  renderItem={({ item }: { item: any }) => (
                    <UpsellMiniCard item={item} onAdded={handleUpsellAdded} />
                  )}
                  keyExtractor={(item: any) => item.handle}
                />
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={lines.length > 0 && upsellList.length > 0 ? (
          <View style={styles.upsellSection}>
            <View style={[styles.upsellHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.upsellAccent} />
              <Ionicons name="sparkles" size={18} color="#248CCC" />
              <Text style={[styles.upsellTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {language === 'ar' ? 'منتجات قد تعجبك' : 'Products You May Like'}
              </Text>
            </View>
            <FlatList
              data={upsellList}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 4, gap: 8 }}
              style={{ direction: isRTL ? 'rtl' : 'ltr' }}
              renderItem={({ item }: { item: any }) => (
                <UpsellMiniCard item={item} onAdded={handleUpsellAdded} />
              )}
              keyExtractor={(item: any) => item.handle}
            />
          </View>
        ) : null}
      />

      {lines.length > 0 ? (
        <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + webBottomInset + 70 }]}>
          <View style={[styles.summaryRow, styles.totalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.totalValue}>{total ? formatCurrency(total, currency || 'JOD') : formatCurrency('0', currency || 'JOD')}</Text>
            <Text style={styles.totalLabel}>{t('cart.total')}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.checkoutBtn, { opacity: pressed ? 0.9 : 1 }]}
            onPress={handleCheckout}
          >
            <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
            <Text style={styles.checkoutBtnText}>
              {language === 'ar' ? 'اتمام الطلب' : 'Complete Order'}
            </Text>
          </Pressable>
        </View>
      ) : null}
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
      paddingVertical: 12,
    },
    headerTitle: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 24,
      color: colors.text,
    },
    cartItem: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      gap: 12,
      position: 'relative',
    },
    itemImageWrap: {
      width: 80,
      height: 80,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: '#FFFFFF',
    },
    itemImage: {
      width: 80,
      height: 80,
    },
    itemPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemDetails: {
      flex: 1,
      gap: 4,
    },
    itemTitle: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 14,
      color: colors.text,
    },
    itemVariant: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 12,
      color: colors.textSecondary,
    },
    itemPrice: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 14,
      color: colors.primary,
    },
    qtyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      alignSelf: 'flex-end',
      marginTop: 4,
    },
    qtyBtn: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: colors.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qtyText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 14,
      color: colors.text,
      minWidth: 20,
      textAlign: 'center',
    },
    removeBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start',
      marginTop: 2,
    },
    bottomSheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 16,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    summaryRow: {
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryLabel: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 14,
      color: colors.textSecondary,
    },
    summaryValue: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 14,
      color: colors.text,
    },
    totalRow: {
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    totalLabel: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 16,
      color: colors.text,
    },
    totalValue: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 18,
      color: colors.primary,
    },
    checkoutBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 4,
    },
    checkoutBtnText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 16,
      color: '#fff',
    },
    emptyWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 120,
      gap: 10,
    },
    emptyTitle: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 18,
      color: colors.text,
    },
    emptySubtext: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 14,
      color: colors.textMuted,
    },
    upsellSection: {
      marginTop: 16,
      gap: 12,
    },
    upsellHeader: {
      alignItems: 'center',
      gap: 8,
    },
    upsellAccent: {
      width: 4,
      height: 20,
      borderRadius: 2,
      backgroundColor: '#248CCC',
    },
    upsellTitle: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 16,
      flex: 1,
    },
  });
}
