import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOutDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import PageBackground from '@/components/PageBackground';
import { api } from '@/lib/api';

type ToastInfo = { type: 'success' | 'partial' | 'error'; added: number; skipped: number } | null;

function ReorderToast({ toast, onDismiss, colors, t, isRTL }: { toast: NonNullable<ToastInfo>; onDismiss: () => void; colors: any; t: any; isRTL: boolean }) {
  React.useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, []);

  const bgColor = toast.type === 'error' ? '#EF5350' : toast.type === 'partial' ? '#FF9800' : '#4CAF50';
  const icon = toast.type === 'error' ? 'close-circle' : toast.type === 'partial' ? 'alert-circle' : 'checkmark-circle';

  return (
    <Animated.View
      entering={FadeInDown.duration(300).springify()}
      exiting={FadeOutDown.duration(200)}
      style={{
        position: 'absolute',
        bottom: 100,
        left: 20,
        right: 20,
        zIndex: 999,
        backgroundColor: bgColor,
        borderRadius: 14,
        padding: 16,
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
      }}
    >
      <Ionicons name={icon as any} size={28} color="#fff" />
      <View style={{ flex: 1 }}>
        {toast.type === 'success' && (
          <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: '#fff', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }}>
            {t('orders.reorderSuccess')}
          </Text>
        )}
        {toast.type === 'partial' && (
          <>
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: '#fff', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }}>
              {t('orders.reorderSuccess')}
            </Text>
            <Text style={{ fontFamily: 'Cairo_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.9)', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr', marginTop: 2 }}>
              {t('orders.reorderFail')}
            </Text>
          </>
        )}
        {toast.type === 'error' && (
          <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: '#fff', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }}>
            {t('orders.reorderFail')}
          </Text>
        )}
      </View>
      <Pressable onPress={onDismiss} hitSlop={10}>
        <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
      </Pressable>
    </Animated.View>
  );
}

function getStatusTranslation(status: string, fulfillmentStatus: string, canceled: boolean, t: any): string {
  if (canceled) return t('orders.statusCanceled');
  
  const fulfill = (fulfillmentStatus || '').toUpperCase();
  if (fulfill === 'FULFILLED') return t('orders.statusCompleted');
  
  return t('orders.statusProcessing');
}

function getStatusColor(financialStatus: string, fulfillmentStatus: string, canceled: boolean, colors: any): string {
  if (canceled) return '#EF5350'; // Red
  
  const fulfill = (fulfillmentStatus || '').toUpperCase();
  if (fulfill === 'FULFILLED') return colors.success || '#4CAF50'; // Green
  
  return '#FFA726'; // Orange
}

function OrderItem({ order, t, isRTL, formatCurrency, colors, language, deliveryCodeMap, onReorder }: any) {
  const [expanded, setExpanded] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [translatedTitles, setTranslatedTitles] = useState<Record<string, string>>({});
  const styles = getStyles(colors);

  React.useEffect(() => {
    if (language !== 'ar' || !expanded) return;
    const lineItems = order.lineItems?.edges?.map((e: any) => e.node) || [];
    let cancelled = false;
    const doTranslate = async () => {
      const newT: Record<string, string> = {};
      for (const li of lineItems) {
        const title = li.title;
        if (!title || translatedTitles[title]) continue;
        if (/[\u0600-\u06FF]/.test(title)) { newT[title] = title; continue; }
        try {
          const res = await api.translateText(title, 'ar');
          if (!cancelled && res?.translatedText) newT[title] = res.translatedText;
        } catch {}
      }
      if (!cancelled && Object.keys(newT).length > 0) {
        setTranslatedTitles(prev => ({ ...prev, ...newT }));
      }
    };
    doTranslate();
    return () => { cancelled = true; };
  }, [expanded, language]);

  const date = new Date(order.processedAt);
  const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  const totalAmount = order.currentTotalPrice?.amount || order.totalPrice?.amount || '0';
  const currency = order.currentTotalPrice?.currencyCode || order.totalPrice?.currencyCode || 'JOD';
  const subtotal = order.subtotalPrice?.amount;
  const shippingAmount = order.totalShippingPrice?.amount;
  const lineItems = order.lineItems?.edges?.map((e: any) => e.node) || [];
  const itemCount = lineItems.reduce((sum: number, li: any) => sum + (li.quantity || 1), 0);
  const shopifyName = order.name || `#${order.orderNumber}`;
  const deliveryCode = deliveryCodeMap?.[shopifyName];
  const orderName = deliveryCode ? `#${deliveryCode}` : null;
  const fulfillmentStatus = order.fulfillmentStatus || 'UNFULFILLED';
  const isCanceled = !!order.canceledAt;
  const shippingAddr = order.shippingAddress;

  const statusColor = getStatusColor(order.financialStatus, fulfillmentStatus, isCanceled, colors);

  return (
    <Animated.View entering={FadeInDown.duration(300)} style={styles.orderCard}>
      <Pressable onPress={() => setExpanded(!expanded)} style={{ gap: 10 }}>
        <View style={[styles.orderHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            {orderName && <Text style={[styles.orderNumber, { textAlign: isRTL ? 'right' : 'left' }]}>{orderName}</Text>}
            <Text style={[styles.dateText, { textAlign: isRTL ? 'right' : 'left' }]}>{formattedDate}</Text>
          </View>
          <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 4 }}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusTranslation(order.financialStatus, fulfillmentStatus, isCanceled, t)}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.orderSummaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row' }, styles.itemCountWrap]}>
            <Ionicons name="cube-outline" size={14} color={colors.textMuted} />
            <Text style={styles.itemCountText}>
              {itemCount} {itemCount === 1 ? t('orders.item') : t('orders.items')}
            </Text>
          </View>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.totalValue}>{formatCurrency(totalAmount, currency)}</Text>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.textMuted}
            />
          </View>
        </View>

        {!expanded && lineItems.length > 0 && (
          <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row' }, styles.thumbnailRow]}>
            {lineItems.slice(0, 4).map((li: any, idx: number) => (
              <View key={idx} style={styles.thumbnailWrap}>
                {li.variant?.image?.url ? (
                  <Image source={{ uri: li.variant.image.url }} style={styles.thumbnail} contentFit="cover" />
                ) : (
                  <View style={[styles.thumbnail, { backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="cube-outline" size={16} color={colors.textMuted} />
                  </View>
                )}
                {li.quantity > 1 && (
                  <View style={styles.qtyBadge}>
                    <Text style={styles.qtyBadgeText}>{li.quantity}</Text>
                  </View>
                )}
              </View>
            ))}
            {lineItems.length > 4 && (
              <View style={[styles.thumbnailWrap, styles.thumbnail, { backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 12, color: colors.textMuted }}>+{lineItems.length - 4}</Text>
              </View>
            )}
          </View>
        )}
      </Pressable>

      {expanded && (
        <Animated.View entering={FadeIn.duration(250)} style={styles.expandedSection}>
          <View style={styles.divider} />

          {lineItems.map((li: any, idx: number) => (
            <Pressable
              key={idx}
              onPress={() => {
                const handle = li.variant?.product?.handle;
                if (handle) router.push(`/product/${handle}`);
              }}
              style={[styles.lineItemRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
              <View style={styles.lineItemImgWrap}>
                {li.variant?.image?.url ? (
                  <Image source={{ uri: li.variant.image.url }} style={styles.lineItemImg} contentFit="cover" />
                ) : (
                  <View style={[styles.lineItemImg, { backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="cube-outline" size={20} color={colors.textMuted} />
                  </View>
                )}
              </View>
              <View style={{ flex: 1, gap: 2, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.lineItemTitle, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={2}>{(language === 'ar' && translatedTitles[li.title]) ? translatedTitles[li.title] : li.title}</Text>
                {li.variant?.title && li.variant.title !== 'Default Title' && (
                  <Text style={[styles.lineItemVariant, { textAlign: isRTL ? 'right' : 'left' }]}>{li.variant.title}</Text>
                )}
                <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row' }, styles.lineItemBottom]}>
                  <Text style={styles.lineItemQty}>{t('orders.qty')}: {li.quantity}</Text>
                  <Text style={styles.lineItemPrice}>
                    {formatCurrency(li.originalTotalPrice?.amount || (parseFloat(li.variant?.price?.amount || '0') * li.quantity).toFixed(2), currency)}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}

          <View style={styles.divider} />

          <View style={styles.priceSummary}>
            {subtotal && (
              <View style={[styles.priceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.priceLabel}>{t('orders.subtotal')}</Text>
                <Text style={styles.priceValue}>{formatCurrency(subtotal, currency)}</Text>
              </View>
            )}
            {shippingAmount && (
              <View style={[styles.priceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.priceLabel}>{t('orders.shipping')}</Text>
                <Text style={styles.priceValue}>
                  {parseFloat(shippingAmount) === 0 ? t('orders.free') : formatCurrency(shippingAmount, currency)}
                </Text>
              </View>
            )}
            <View style={[styles.priceRow, styles.totalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.totalLabel}>{t('orders.total')}</Text>
              <Text style={styles.totalAmountBig}>{formatCurrency(totalAmount, currency)}</Text>
            </View>
          </View>

          {shippingAddr && (
            <>
              <View style={styles.divider} />
              <View style={{ gap: 4 }}>
                <Text style={[styles.sectionLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t('orders.shippingAddress')}</Text>
                <View style={[styles.addressBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.addressText, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {[shippingAddr.firstName, shippingAddr.lastName].filter(Boolean).join(' ')}
                  </Text>
                  <Text style={[styles.addressText, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {shippingAddr.address1}
                  </Text>
                  <Text style={[styles.addressText, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {shippingAddr.city}
                  </Text>
                  {shippingAddr.phone && (
                    <Text style={[styles.addressText, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {shippingAddr.phone}
                    </Text>
                  )}
                </View>
              </View>
            </>
          )}

          <View style={styles.divider} />
          <Pressable
            onPress={async () => {
              if (reordering) return;
              setReordering(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              try {
                await onReorder(lineItems);
              } finally {
                setReordering(false);
              }
            }}
            style={({ pressed }) => [styles.reorderBtn, { opacity: pressed ? 0.8 : 1, backgroundColor: colors.primary }]}
          >
            {reordering ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={18} color="#fff" />
                <Text style={styles.reorderBtnText}>{t('orders.reorder')}</Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
  );
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const { customer, token, isLoggedIn } = useAuth();
  const { t, isRTL, formatCurrency, language } = useLanguage();
  const { colors, isDark } = useTheme();
  const { addToCart } = useCart();
  const styles = getStyles(colors);

  const { data: combinedOrders, isLoading, refetch, isRefetching } = useQuery<any[]>({
    queryKey: ['shopify-orders-v6', customer?.email, language, !!token],
    queryFn: async () => {
      if (!customer?.email || !token) {
        console.log("[Orders] Missing email or token", { email: !!customer?.email, token: !!token });
        return [];
      }
      try {
        console.log("[Orders] Fetching from Shopify via getCustomer...");
        const langParam = language === 'ar' ? 'AR' : 'EN';
        const data = await api.getCustomer(token, langParam);
        
        if (data?.orders?.edges) {
          const list = data.orders.edges.map((e: any) => e.node);
          console.log(`[Orders] Success: Found ${list.length} orders`);
          return list.sort((a: any, b: any) => 
            new Date(b.processedAt || b.createdAt).getTime() - new Date(a.processedAt || a.createdAt).getTime()
          );
        }
        
        console.warn("[Orders] No orders in Shopify response");
        return [];
      } catch (err) {
        console.error("[Orders] Fetch error:", err);
        // Fallback to direct API if getCustomer fails for some reason
        try {
          console.log("[Orders] Falling back to direct API...");
          const res = await api.getOrders(customer.email, token);
          return Array.isArray(res) ? res : [];
        } catch (fallbackErr) {
          console.error("[Orders] Fallback also failed:", fallbackErr);
          return [];
        }
      }
    },
    enabled: !!customer?.email && !!token && isLoggedIn,
    staleTime: 5000,
  });

  const orders = combinedOrders;

  const orderNames = React.useMemo(() => {
    if (!orders || orders.length === 0) return [];
    return orders.map((o: any) => o.name).filter(Boolean);
  }, [orders]);

  const { data: deliveryCodeMap } = useQuery<Record<string, string>>({
    queryKey: ['delivery-codes', orderNames],
    queryFn: () => api.getDeliveryCodes(orderNames),
    enabled: orderNames.length > 0,
    staleTime: 300000,
  });

  const [reorderToast, setReorderToast] = useState<ToastInfo>(null);

  const handleReorder = async (lineItems: any[]) => {
    let addedCount = 0;
    let skippedCount = 0;
    for (const li of lineItems) {
      const variantId = li.variant?.id;
      if (!variantId) { skippedCount++; continue; }
      if (li.variant?.availableForSale === false) { skippedCount++; continue; }
      try {
        const handle = li.variant?.product?.handle;
        if (handle) {
          const productData = await api.getProduct(handle, language);
          const matchingVariant = productData?.variants?.edges?.find(
            (e: any) => e.node.id === variantId
          )?.node;
          if (matchingVariant && !matchingVariant.availableForSale) {
            skippedCount++;
            continue;
          }
        }
        const imgUrl = li.variant?.image?.url || li.variant?.product?.images?.edges?.[0]?.node?.url || null;
        await addToCart(variantId, li.quantity || 1, {
          productTitle: li.title || li.variant?.product?.title || '',
          productHandle: li.variant?.product?.handle || '',
          variantTitle: li.variant?.title !== 'Default Title' ? li.variant?.title : undefined,
          price: li.variant?.price?.amount || li.originalTotalPrice?.amount || '0',
          currencyCode: li.variant?.price?.currencyCode || 'JOD',
          imageUrl: imgUrl,
        });
        addedCount++;
      } catch {
        skippedCount++;
      }
    }
    Haptics.notificationAsync(addedCount > 0 ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    if (addedCount > 0 && skippedCount > 0) {
      setReorderToast({ type: 'partial', added: addedCount, skipped: skippedCount });
      setTimeout(() => router.push('/(tabs)/cart'), 1500);
    } else if (addedCount > 0) {
      setReorderToast({ type: 'success', added: addedCount, skipped: 0 });
      setTimeout(() => router.push('/(tabs)/cart'), 1500);
    } else {
      setReorderToast({ type: 'error', added: 0, skipped: skippedCount });
    }
  };

  const orderCount = orders?.length || 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <PageBackground isDark={isDark} />
      {reorderToast && (
        <ReorderToast
          toast={reorderToast}
          onDismiss={() => setReorderToast(null)}
          colors={colors}
          t={t}
          isRTL={isRTL}
        />
      )}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable style={styles.backBtn} onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); }} testID="back-button">
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start', marginHorizontal: 12 }}>
          <Text style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('orders.title')}</Text>
          {orderCount > 0 && (
            <Text style={[styles.headerCount, { textAlign: isRTL ? 'right' : 'left' }]}>
              {orderCount} {orderCount === 1 ? t('orders.item') : t('orders.items')}
            </Text>
          )}
        </View>
        {isLoggedIn && (
          <Pressable 
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              refetch();
            }}
          >
            {isRefetching ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Ionicons name="refresh-outline" size={20} color={colors.text} />
            )}
          </Pressable>
        )}
        {!isLoggedIn && <View style={{ width: 36 }} />}
      </View>

      {!isLoggedIn ? (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '12' }]}>
            <Ionicons name="log-in-outline" size={40} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>{t('orders.loginRequired')}</Text>
          <Pressable style={[styles.loginBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginBtnText}>{t('profile.login')}</Text>
          </Pressable>
        </View>
      ) : isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders || []}
          keyExtractor={(item, i) => item.id || String(i)}
          renderItem={({ item }) => (
            <OrderItem order={item} t={t} isRTL={isRTL} formatCurrency={formatCurrency} colors={colors} language={language} deliveryCodeMap={deliveryCodeMap} onReorder={handleReorder} />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!(orders && orders.length > 0)}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '12' }]}>
                <Ionicons name="receipt-outline" size={40} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>{t('orders.empty')}</Text>
              <Text style={styles.emptySubtext}>{t('orders.emptyDesc')}</Text>
            </View>
          }
        />
      )}
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
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 20,
      color: colors.text,
    },
    headerCount: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 12,
      color: colors.textMuted,
      marginTop: -4,
    },
    loadingWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    orderCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    orderHeader: {
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    orderNumber: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 17,
      color: colors.text,
    },
    dateText: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 12,
      color: colors.textMuted,
      marginTop: -2,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 8,
      gap: 5,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 11,
    },
    orderSummaryRow: {
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    itemCountWrap: {
      alignItems: 'center',
      gap: 5,
    },
    itemCountText: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 13,
      color: colors.textMuted,
    },
    totalValue: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 16,
      color: colors.primary,
    },
    thumbnailRow: {
      gap: 8,
      marginTop: 4,
    },
    thumbnailWrap: {
      position: 'relative',
    },
    thumbnail: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: '#FFFFFF',
    },
    qtyBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: colors.primary,
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qtyBadgeText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 10,
      color: '#fff',
    },
    expandedSection: {
      gap: 14,
      marginTop: 4,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
    },
    lineItemRow: {
      gap: 12,
      alignItems: 'center',
    },
    lineItemImgWrap: {
      borderRadius: 10,
      overflow: 'hidden',
    },
    lineItemImg: {
      width: 60,
      height: 60,
      borderRadius: 10,
      backgroundColor: '#FFFFFF',
    },
    lineItemTitle: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
    },
    lineItemVariant: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 11,
      color: colors.textMuted,
    },
    lineItemBottom: {
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginTop: 2,
    },
    lineItemQty: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 12,
      color: colors.textMuted,
    },
    lineItemPrice: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 13,
      color: colors.text,
    },
    priceSummary: {
      gap: 6,
    },
    priceRow: {
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    priceLabel: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 13,
      color: colors.textMuted,
    },
    priceValue: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 13,
      color: colors.textSecondary,
    },
    totalRow: {
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    totalLabel: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 14,
      color: colors.text,
    },
    totalAmountBig: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 17,
      color: colors.primary,
    },
    sectionLabel: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 13,
      color: colors.text,
    },
    addressBox: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 10,
      padding: 12,
      gap: 2,
    },
    addressText: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 13,
      color: colors.textSecondary,
    },
    reorderBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 12,
      paddingVertical: 12,
    },
    reorderBtnText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 14,
      color: '#fff',
    },
    emptyWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 100,
      gap: 12,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    emptyTitle: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 18,
      color: colors.text,
      textAlign: 'center',
    },
    emptySubtext: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
    },
    loginBtn: {
      paddingHorizontal: 28,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 4,
    },
    loginBtnText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 14,
      color: '#fff',
    },
  });
}
