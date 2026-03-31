import React, { useState, useRef, useEffect } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { tabEvents } from '@/lib/tabEvents';
import PageBackground from '@/components/PageBackground';


const { width } = Dimensions.get('window');
const IS_TABLET_WL = width >= 768;
const WL_COLUMNS = IS_TABLET_WL ? 4 : 2;
const CARD_WIDTH = (width - 48) / WL_COLUMNS;

function WishlistItem({ item }: { item: any }) {
  const { removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { isRTL, formatCurrency, language } = useLanguage();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const hasDiscount = item.compareAtPrice && parseFloat(item.compareAtPrice) > parseFloat(item.price);
  const [adding, setAdding] = useState(false);

  const handleAddToCart = async () => {
    if (adding) return;
    setAdding(true);
    try {
      const product = await api.getProduct(item.handle);
      const variantId = product?.variants?.edges?.[0]?.node?.id;
      if (variantId) {
        await addToCart(variantId, 1, {
          productTitle: product.title || item.title || '',
          productHandle: product.handle || item.handle || '',
          price: product.priceRange?.minVariantPrice?.amount || item.price || '0',
          currencyCode: product.priceRange?.minVariantPrice?.currencyCode || item.currencyCode || 'JOD',
          imageUrl: product.images?.edges?.[0]?.node?.url || item.imageUrl || null,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {}
    setAdding(false);
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { width: CARD_WIDTH, opacity: pressed ? 0.9 : 1 }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/product/[handle]', params: { handle: item.handle } });
      }}
    >
      <View style={styles.imageWrap}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={40} color={colors.textMuted} />
          </View>
        )}
        <Pressable
          style={styles.removeBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            removeFromWishlist(item.handle);
          }}
          hitSlop={8}
        >
          <Ionicons name="heart" size={16} color="#E53935" />
        </Pressable>
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={2}>{item.title}</Text>
        <View style={[styles.priceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.price}>
            {formatCurrency(item.price, item.currencyCode)}
          </Text>
          {hasDiscount ? (
            <Text style={styles.comparePrice}>{parseFloat(item.compareAtPrice).toFixed(2)}</Text>
          ) : null}
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            handleAddToCart();
          }}
          disabled={adding}
          style={({ pressed }) => [styles.addToCartBtn, pressed && { opacity: 0.85 }]}
        >
          {adding ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View style={[styles.addToCartInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="cart" size={15} color="#fff" />
              <Text style={styles.addToCartText}>
                {language === 'ar' ? 'أضف للسلة' : 'Add to Cart'}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function WishlistScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const { items, clearWishlist } = useWishlist();
  const { t, isRTL } = useLanguage();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  const mainFlatListRef = useRef<FlatList>(null);
  useEffect(() => {
    return tabEvents.on('wishlistTabPress', () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      mainFlatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <PageBackground isDark={isDark} />
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }}>
          {items.length > 0 ? (
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); clearWishlist(); }}>
              <Ionicons name="trash-outline" size={22} color={colors.primary} />
            </Pressable>
          ) : null}
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/search'); }}>
            <Ionicons name="search-outline" size={22} color={colors.text} />
          </Pressable>
        </View>
        <Text style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('wishlist.title')}</Text>
      </View>

      <FlatList
        ref={mainFlatListRef}
        data={items}
        keyExtractor={(item) => item.handle}
        numColumns={WL_COLUMNS}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
        renderItem={({ item }) => <WishlistItem item={item} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        scrollsToTop={isFocused}
        scrollEnabled={!!items.length}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="heart-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>{t('wishlist.empty')}</Text>
            <Text style={styles.emptySubtext}>{t('wishlist.emptyDesc')}</Text>
            <Pressable
              style={styles.browseBtn}
              onPress={() => router.push('/(tabs)/')}
            >
              <Text style={styles.browseBtnText}>{t('wishlist.browseProducts')}</Text>
            </Pressable>
          </View>
        }
      />
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
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 12,
    },
    imageWrap: {
      width: '100%',
      height: 180,
      backgroundColor: '#FFFFFF',
      position: 'relative',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    placeholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeBtn: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: {
      padding: 10,
      gap: 4,
    },
    title: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 13,
      color: colors.text,
      lineHeight: 20,
    },
    priceRow: {
      alignItems: 'center',
      gap: 6,
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
    addToCartBtn: {
      backgroundColor: '#248CCC',
      borderRadius: 8,
      paddingVertical: 7,
      marginTop: 6,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 34,
    },
    addToCartInner: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },
    addToCartText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 12,
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
    browseBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 10,
      marginTop: 8,
    },
    browseBtnText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 14,
      color: '#fff',
    },
  });
}
