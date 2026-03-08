import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  TextInput, ActivityIndicator, Alert, Keyboard,
  Dimensions, FlatList, Animated as RNAnimated, PanResponder, BackHandler,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { Modal } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Toast from '@/components/Toast';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import PageBackground from '@/components/PageBackground';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';

const { width } = Dimensions.get('window');
const SWIPE_H = 58;
const THUMB_W = 60;

function ScrollableInput({ inputRef, style, onFocusCb, onBlurCb, ...props }: any) {
  const [focused, setFocused] = useState(false);
  const localRef = useRef<TextInput>(null);
  const ref = inputRef || localRef;
  return (
    <View style={{ position: 'relative' }}>
      <TextInput
        ref={ref}
        style={style}
        onFocus={(e: any) => { setFocused(true); onFocusCb?.(e); }}
        onBlur={(e: any) => { setFocused(false); onBlurCb?.(e); }}
        {...props}
      />
      {!focused && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => ref.current?.focus()}
        />
      )}
    </View>
  );
}

function SwipeToConfirm({ onComplete, isRTL, language, colors, labelAr, labelEn }: {
  onComplete: () => void; isRTL: boolean; language: string; colors: any;
  labelAr?: string; labelEn?: string;
}) {
  const trackW = width - 64;
  const maxDx = trackW - THUMB_W;
  const tx = useRef(new RNAnimated.Value(0)).current;
  const done = useRef(false);
  const dragging = useRef(false);
  const pulseAnim = useRef(new RNAnimated.Value(0)).current;
  const arrowAnim = useRef(new RNAnimated.Value(0)).current;
  const nudgeAnim = useRef(new RNAnimated.Value(0)).current;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true })
    ).start();
    RNAnimated.loop(
      RNAnimated.timing(arrowAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();
    const runNudge = () => {
      if (dragging.current || done.current) return;
      RNAnimated.sequence([
        RNAnimated.timing(nudgeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        RNAnimated.timing(nudgeAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        RNAnimated.delay(200),
        RNAnimated.timing(nudgeAnim, { toValue: 0.6, duration: 250, useNativeDriver: true }),
        RNAnimated.timing(nudgeAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    };
    runNudge();
    const iv = setInterval(runNudge, 3500);
    return () => clearInterval(iv);
  }, []);

  const nudgeDir = isRTL ? -1 : 1;
  const nudgeTx = nudgeAnim.interpolate({
    inputRange: [0, 1], outputRange: [0, 16 * nudgeDir],
  });

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 5,
      onPanResponderGrant: () => { dragging.current = true; },
      onPanResponderMove: (_, gs) => {
        if (done.current) return;
        const clamped = Math.max(0, Math.min(Math.abs(gs.dx), maxDx));
        tx.setValue(clamped);
      },
      onPanResponderRelease: (_, gs) => {
        dragging.current = false;
        if (done.current) return;
        if (Math.abs(gs.dx) >= maxDx * 0.65) {
          done.current = true;
          RNAnimated.spring(tx, {
            toValue: maxDx,
            useNativeDriver: true, bounciness: 4,
          }).start(() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onCompleteRef.current();
            setTimeout(() => {
              done.current = false;
              tx.setValue(0);
            }, 1200);
          });
        } else {
          RNAnimated.spring(tx, {
            toValue: 0, useNativeDriver: true, friction: 6, tension: 80,
          }).start();
        }
      },
    })
  ).current;

  const progress = tx.interpolate({
    inputRange: [0, maxDx],
    outputRange: [0, 1], extrapolate: 'clamp',
  });
  const textOp = progress.interpolate({ inputRange: [0, 0.3], outputRange: [1, 0], extrapolate: 'clamp' });
  const checkScale = progress.interpolate({ inputRange: [0.6, 0.85, 1], outputRange: [0, 1.2, 1], extrapolate: 'clamp' });
  const checkOp = progress.interpolate({ inputRange: [0.6, 0.8], outputRange: [0, 1], extrapolate: 'clamp' });
  const thumbSc = pulseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.06, 1] });
  const a1 = arrowAnim.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: [0.3, 1, 0.3, 0.3] });
  const a2 = arrowAnim.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: [0.3, 0.3, 1, 0.3] });
  const a3 = arrowAnim.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: [0.3, 0.3, 0.3, 1] });

  const thumbTranslateX = isRTL
    ? RNAnimated.multiply(RNAnimated.add(tx, nudgeTx), -1)
    : RNAnimated.add(tx, nudgeTx);

  const arrowIcon = isRTL ? "chevron-back" : "chevron-forward";

  return (
    <View style={{ marginTop: 4 }}>
      <View style={{
        height: SWIPE_H, borderRadius: SWIPE_H / 2,
        backgroundColor: '#4CAF50', overflow: 'hidden',
        justifyContent: 'center',
        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
      }}>
        <View style={{
          position: 'absolute', top: 0, bottom: 0,
          left: isRTL ? 16 : THUMB_W + 8,
          right: isRTL ? THUMB_W + 8 : 16,
          justifyContent: 'center', alignItems: 'center',
        }}>
          <RNAnimated.View style={{
            opacity: textOp,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center', gap: 2,
          }}>
            <Text style={{
              fontFamily: 'Cairo_700Bold', fontSize: 15, color: '#fff',
              writingDirection: isRTL ? 'rtl' : 'ltr',
            }}>
              {language === 'ar' 
                ? (labelAr || 'اسحب لتأكيد الطلب') 
                : (labelEn || 'Swipe to Confirm')}
            </Text>
            <View style={{ flexDirection: 'row', marginHorizontal: 4 }}>
              <RNAnimated.View style={{ opacity: a1 }}>
                <Ionicons name={arrowIcon} size={14} color="rgba(255,255,255,0.9)" style={{ marginHorizontal: -3 }} />
              </RNAnimated.View>
              <RNAnimated.View style={{ opacity: a2 }}>
                <Ionicons name={arrowIcon} size={14} color="rgba(255,255,255,0.9)" style={{ marginHorizontal: -3 }} />
              </RNAnimated.View>
              <RNAnimated.View style={{ opacity: a3 }}>
                <Ionicons name={arrowIcon} size={14} color="rgba(255,255,255,0.9)" style={{ marginHorizontal: -3 }} />
              </RNAnimated.View>
            </View>
          </RNAnimated.View>
        </View>

        <RNAnimated.View style={{
          position: 'absolute', alignSelf: 'center',
          opacity: checkOp, transform: [{ scale: checkScale }],
        }}>
          <Ionicons name="checkmark-circle" size={30} color="#fff" />
        </RNAnimated.View>

        <RNAnimated.View
          {...pan.panHandlers}
          style={{
            position: 'absolute',
            ...(isRTL ? { right: 4 } : { left: 4 }),
            width: THUMB_W, height: SWIPE_H - 8,
            borderRadius: (SWIPE_H - 8) / 2,
            backgroundColor: '#fff',
            alignItems: 'center', justifyContent: 'center',
            transform: [
              { translateX: thumbTranslateX },
              { scale: thumbSc },
            ],
            elevation: 6,
            shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.25, shadowRadius: 6,
          }}
        >
          <RNAnimated.View style={{ opacity: RNAnimated.subtract(1, checkOp) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={18} color="#4CAF50" style={{ marginRight: isRTL ? 0 : -10, marginLeft: isRTL ? -10 : 0 }} />
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={18} color="#4CAF50" />
            </View>
          </RNAnimated.View>
          <RNAnimated.View style={{ position: 'absolute', opacity: checkOp, transform: [{ scale: checkScale }] }}>
            <Ionicons name="checkmark" size={26} color="#4CAF50" />
          </RNAnimated.View>
        </RNAnimated.View>
      </View>
    </View>
  );
}

const JORDAN_CITIES = [
  { ar: 'عمّان', en: 'Amman' },
  { ar: 'إربد', en: 'Irbid' },
  { ar: 'الزرقاء', en: 'Zarqa' },
  { ar: 'العقبة', en: 'Aqaba' },
  { ar: 'السلط / البلقاء', en: 'Salt / Balqa' },
  { ar: 'المفرق', en: 'Mafraq' },
  { ar: 'جرش', en: 'Jerash' },
  { ar: 'عجلون', en: 'Ajloun' },
  { ar: 'مادبا', en: 'Madaba' },
  { ar: 'الكرك', en: 'Karak' },
  { ar: 'الطفيلة', en: 'Tafilah' },
  { ar: 'معان', en: 'Maan' },
];

function UpsellCard({ item, colors, isRTL, language, formatCurrency, addToCart }: any) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const imgUrl = item.images?.edges?.[0]?.node?.url || item.featuredImage?.url;
  const price = item.priceRange?.minVariantPrice?.amount || '0';
  const curr = item.priceRange?.minVariantPrice?.currencyCode || 'JOD';
  const variantId = item.variants?.edges?.[0]?.node?.id;

  const handleAdd = async () => {
    if (!variantId || adding || added) return;
    setAdding(true);
    try {
      await addToCart(variantId, 1, item);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAdded(true);
      setTimeout(() => setAdded(false), 3000);
    } catch {}
    setAdding(false);
  };

  return (
    <View style={{ width: 120, backgroundColor: colors.card, borderRadius: 10, overflow: 'hidden', borderWidth: added ? 2 : 1, borderColor: added ? '#4CAF50' : colors.border }}>
      <Pressable onPress={() => {}}>
        <View style={{ width: 120, height: 110, backgroundColor: '#fff' }}>
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
        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 11, color: colors.primary, textAlign: isRTL ? 'right' : 'left' }}>{formatCurrency(price, curr)}</Text>
        <Pressable
          onPress={handleAdd}
          disabled={adding || added || !item.availableForSale}
          style={({ pressed }) => ({
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            backgroundColor: added ? '#4CAF50' : (item.availableForSale ? (pressed ? '#1a7ab5' : '#248CCC') : colors.textMuted),
            borderRadius: 6,
            paddingVertical: 4,
            marginTop: 2,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          {adding ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : added ? (
            <>
              <Ionicons name="checkmark-circle" size={13} color="#fff" />
              <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 9, color: '#fff' }}>
                {language === 'ar' ? 'تمت الإضافة ✓' : 'Added ✓'}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="add-circle" size={13} color="#fff" />
              <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 9, color: '#fff' }}>
                {language === 'ar' ? 'أضف للطلب' : 'Add to Order'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export default function CodOrderScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;
  const router = useRouter();
  const params = useLocalSearchParams<{ handle?: string; variantId?: string; qty?: string }>();
  const { colors, isDark } = useTheme();
  const { t, isRTL, language, formatCurrency } = useLanguage();
  const { cart, addToCart, clearCart, getCheckoutUrl } = useCart();
  const { customer, token } = useAuth();

  const autoEmail = customer?.email || '';
  const formValues = useRef({
    firstName: customer?.firstName || '',
    lastName: customer?.lastName || '',
    phone: customer?.phone || '',
    address: '',
    city: '',
    notes: '',
  });
  const firstNameInputRef = useRef<TextInput>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card'>('cod');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('error');
  const [toastVisible, setToastVisible] = useState(false);
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'error') => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
  };

  const [saveAsDefault, setSaveAsDefault] = useState(false);

  useEffect(() => {
    if (token) {
      api.getCustomerAddresses(token).then((addrs: any[]) => {
        const defaultAddr = addrs.find((a: any) => a.isDefault);
        if (defaultAddr) {
          formValues.current.firstName = defaultAddr.firstName || formValues.current.firstName;
          formValues.current.lastName = defaultAddr.lastName || formValues.current.lastName;
          let displayPhone = defaultAddr.phone || '';
          if (displayPhone.startsWith('+962')) displayPhone = '0' + displayPhone.substring(4);
          formValues.current.phone = displayPhone || formValues.current.phone;
          formValues.current.address = defaultAddr.address1 || formValues.current.address;
          formValues.current.city = defaultAddr.city || formValues.current.city;
          setTimeout(() => {
            firstNameInputRef.current?.setNativeProps({ text: formValues.current.firstName });
            lastNameRef.current?.setNativeProps({ text: formValues.current.lastName });
            phoneRef.current?.setNativeProps({ text: formValues.current.phone });
            addressRef.current?.setNativeProps({ text: formValues.current.address });
            cityRef.current?.setNativeProps({ text: formValues.current.city });
          }, 200);
        } else if (customer) {
          if (customer.firstName && !formValues.current.firstName) {
            formValues.current.firstName = customer.firstName;
            firstNameInputRef.current?.setNativeProps({ text: customer.firstName });
          }
          if (customer.lastName && !formValues.current.lastName) {
            formValues.current.lastName = customer.lastName;
            lastNameRef.current?.setNativeProps({ text: customer.lastName });
          }
          if (customer.phone && !formValues.current.phone) {
            formValues.current.phone = customer.phone;
            phoneRef.current?.setNativeProps({ text: customer.phone });
          }
        }
      }).catch(() => {
        if (customer) {
          if (customer.firstName && !formValues.current.firstName) {
            formValues.current.firstName = customer.firstName;
            firstNameInputRef.current?.setNativeProps({ text: customer.firstName });
          }
          if (customer.lastName && !formValues.current.lastName) {
            formValues.current.lastName = customer.lastName;
            lastNameRef.current?.setNativeProps({ text: customer.lastName });
          }
          if (customer.phone && !formValues.current.phone) {
            formValues.current.phone = customer.phone;
            phoneRef.current?.setNativeProps({ text: customer.phone });
          }
        }
      });
    } else if (customer) {
      if (customer.firstName && !formValues.current.firstName) {
        formValues.current.firstName = customer.firstName;
        firstNameInputRef.current?.setNativeProps({ text: customer.firstName });
      }
      if (customer.lastName && !formValues.current.lastName) {
        formValues.current.lastName = customer.lastName;
        lastNameRef.current?.setNativeProps({ text: customer.lastName });
      }
      if (customer.phone && !formValues.current.phone) {
        formValues.current.phone = customer.phone;
        phoneRef.current?.setNativeProps({ text: customer.phone });
      }
    }
  }, [token, customer]);
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState<{
    code: string;
    discountAmount: string;
    isFreeShipping: boolean;
    newSubtotal: string;
    newTotal: string;
  } | null>(null);
  const [discountError, setDiscountError] = useState('');
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<any>(null);
  const [fetchingOrderDetails, setFetchingOrderDetails] = useState(false);
  const [checkoutWebViewUrl, setCheckoutWebViewUrl] = useState<string | null>(null);
  const webViewHandledRef = useRef(false);
  const [isLocating, setIsLocating] = useState(false);
  const [productQty, setProductQty] = useState(parseInt(params.qty || '1'));
  const [upsellItems, setUpsellItems] = useState<Array<{ variantId: string; productTitle: string; variantTitle?: string; quantity: number; price: string; currency: string; imageUrl?: string }>>([]);

  const lastNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!isProcessing) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => handler.remove();
  }, [isProcessing]);

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', params.handle, language],
    queryFn: () => api.getProduct(params.handle!, language),
    enabled: !!params.handle,
  });

  const productId = product?.id;
  const { data: upsellRecommendations } = useQuery({
    queryKey: ['cod-upsell', productId, language],
    queryFn: () => api.getProductRecommendations(productId, language),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });
  const { data: upsellBestSelling } = useQuery({
    queryKey: ['cod-upsell-bestselling', language],
    queryFn: () => api.getProducts({ first: '12', sortKey: 'BEST_SELLING' }, language),
    enabled: !params.handle,
    staleTime: 10 * 60 * 1000,
  });
  const upsellProducts = params.handle
    ? upsellRecommendations
    : (Array.isArray(upsellBestSelling) ? upsellBestSelling : upsellBestSelling?.products || []);

  const { data: shippingRates } = useQuery({
    queryKey: ['shipping-rates'],
    queryFn: () => api.getShippingRates(),
    staleTime: 10 * 60 * 1000,
  });

  const detectLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast(t('addresses.locationDenied'));
        setIsLocating(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;
      const lang = isRTL ? 'ar' : 'en';
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${lang}&addressdetails=1`,
        { headers: { 'User-Agent': 'XmartApp/1.0' } }
      );
      const data = await res.json();
      if (data?.address) {
        const a = data.address;
        const road = a.road || a.pedestrian || a.street || '';
        const neighbourhood = a.neighbourhood || a.suburb || a.quarter || '';
        const houseNumber = a.house_number || '';
        const parts = [houseNumber, road, neighbourhood].filter(Boolean);
        const newAddr = parts.join(', ') || data.display_name?.split(',').slice(0, 3).join(',') || '';
        formValues.current.address = newAddr;
        addressRef.current?.setNativeProps({ text: newAddr });
        const detectedCity = a.city || a.town || a.village || a.state || '';
        const detectedState = a.state || '';
        const detectedCounty = a.county || '';
        const allParts = [detectedCity, detectedState, detectedCounty, data.display_name || ''].join(' ').toLowerCase();
        const matchedCity = JORDAN_CITIES.find(c => {
          const arName = c.ar.replace(/\s*\/\s*/, '|').split('|');
          const enName = c.en.replace(/\s*\/\s*/, '|').split('|');
          return arName.some(n => allParts.includes(n.trim())) ||
                 enName.some(n => allParts.includes(n.trim().toLowerCase())) ||
                 detectedCity.includes(c.ar) || detectedCity.includes(c.en) ||
                 c.ar.includes(detectedCity) || c.en.toLowerCase().includes(detectedCity.toLowerCase());
        });
        const newCity = matchedCity
          ? (language === 'ar' ? matchedCity.ar : matchedCity.en)
          : detectedCity;
        if (newCity) {
          formValues.current.city = newCity;
          cityRef.current?.setNativeProps({ text: newCity });
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      showToast(t('addresses.locationError'));
    }
    setIsLocating(false);
  };

  const selectedVariant = product?.variants?.edges?.find(
    (e: any) => e.node.id === params.variantId
  )?.node || product?.variants?.edges?.[0]?.node;

  const productPrice = selectedVariant?.price?.amount || product?.priceRange?.minVariantPrice?.amount || '0';
  const productCurrency = selectedVariant?.price?.currencyCode || product?.priceRange?.minVariantPrice?.currencyCode || 'JOD';
  const compareAtPrice = selectedVariant?.compareAtPrice?.amount || product?.compareAtPriceRange?.minVariantPrice?.amount;
  const productImage = product?.images?.edges?.[0]?.node?.url;
  const itemTotal = (parseFloat(productPrice) * productQty).toFixed(2);

  const lines = cart?.lines?.edges?.map((e: any) => e.node) || [];
  const cartSubtotal = cart?.cost?.subtotalAmount?.amount;
  const cartTotal = cart?.cost?.totalAmount?.amount;
  const cartCurrency = cart?.cost?.totalAmount?.currencyCode || 'JOD';

  const isDirectBuy = !!params.handle;
  const upsellSubtotal = upsellItems.reduce((sum, u) => sum + parseFloat(u.price) * u.quantity, 0);
  const rawSubtotal = isDirectBuy
    ? (parseFloat(itemTotal) + upsellSubtotal).toFixed(2)
    : (cartSubtotal || cartTotal || '0');
  const displayCurrency = isDirectBuy ? productCurrency : cartCurrency;

  const shipping = useMemo(() => {
    if (!shippingRates || shippingRates.length === 0) return { cost: '0', name: '' };
    const sub = parseFloat(rawSubtotal);
    for (const rate of shippingRates) {
      const min = rate.minSubtotal ?? 0;
      const max = rate.maxSubtotal ?? Infinity;
      if (sub >= min && sub <= max) {
        return { cost: parseFloat(rate.price).toFixed(3), name: rate.name };
      }
    }
    return { cost: '0', name: '' };
  }, [shippingRates, rawSubtotal]);

  const shippingAmount = parseFloat(shipping.cost);
  const discountAmount = discountApplied ? parseFloat(discountApplied.discountAmount) : 0;
  const effectiveShipping = discountApplied?.isFreeShipping ? 0 : shippingAmount;
  const displayTotal = useMemo(
    () => Math.max(0, parseFloat(rawSubtotal) - discountAmount + effectiveShipping).toFixed(3),
    [rawSubtotal, discountAmount, effectiveShipping]
  );

  const handleApplyDiscount = async () => {
    const code = discountCode.trim();
    if (!code) return;
    Keyboard.dismiss();
    setIsValidatingDiscount(true);
    setDiscountError('');
    try {
      let itemsForValidation: Array<{ variantId: string; quantity: number }> = [];
      if (isDirectBuy && selectedVariant) {
        itemsForValidation = [{ variantId: selectedVariant.id, quantity: productQty }];
        upsellItems.forEach(u => itemsForValidation.push({ variantId: u.variantId, quantity: u.quantity }));
      } else {
        itemsForValidation = lines
          .filter((line: any) => !!line.merchandise?.id)
          .map((line: any) => ({
            variantId: line.merchandise.id,
            quantity: line.quantity || 1,
          }));
      }
      if (itemsForValidation.length === 0) {
        setDiscountError(language === 'ar' ? 'لا توجد منتجات في السلة' : 'No products in cart');
        setIsValidatingDiscount(false);
        return;
      }
      const result = await api.validateDiscount(code, '', itemsForValidation);
      if (result.valid && result.applicable !== false) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setDiscountApplied({
          code: result.code || code,
          discountAmount: result.discountAmount || '0',
          isFreeShipping: result.isFreeShipping || false,
          newSubtotal: result.newSubtotal || rawSubtotal,
          newTotal: result.newTotal || rawSubtotal,
        });
        setDiscountError('');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setDiscountError(language === 'ar' ? 'كود الخصم غير صالح أو لا ينطبق على هذه المنتجات' : 'Invalid discount code or not applicable to these products');
        setDiscountApplied(null);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setDiscountError(language === 'ar' ? 'فشل التحقق من كود الخصم' : 'Failed to validate discount code');
    }
    setIsValidatingDiscount(false);
  };

  const removeDiscount = () => {
    setDiscountApplied(null);
    setDiscountCode('');
    setDiscountError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };



  const cartHandles = lines.map((l: any) => l.merchandise?.product?.handle).filter(Boolean);
  const filteredUpsell = (upsellProducts || [])
    .filter((p: any) => p.handle !== params.handle && !cartHandles.includes(p.handle) && p.availableForSale)
    .slice(0, 10);

  const addUpsellToOrder = async (variantId: string, qty: number, item: any) => {
    const imgUrl = item.images?.edges?.[0]?.node?.url || item.featuredImage?.url;
    const price = item.priceRange?.minVariantPrice?.amount || '0';
    const curr = item.priceRange?.minVariantPrice?.currencyCode || 'JOD';
    const variant = item.variants?.edges?.find((e: any) => e.node.id === variantId)?.node;
    await addToCart(variantId, qty, {
      productTitle: item.title || '',
      productHandle: item.handle || '',
      variantTitle: variant?.title !== 'Default Title' ? variant?.title : undefined,
      price: variant?.price?.amount || price,
      currencyCode: variant?.price?.currencyCode || curr,
      imageUrl: imgUrl ?? null,
    });
    if (isDirectBuy) {
      setUpsellItems(prev => {
        const existing = prev.find(u => u.variantId === variantId);
        if (existing) {
          return prev.map(u => u.variantId === variantId ? { ...u, quantity: u.quantity + qty } : u);
        }
        return [...prev, {
          variantId,
          productTitle: item.title || '',
          variantTitle: variant?.title !== 'Default Title' ? variant?.title : undefined,
          quantity: qty,
          price: variant?.price?.amount || price,
          currency: variant?.price?.currencyCode || curr,
          imageUrl: imgUrl,
        }];
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, boolean> = {};
    if (!formValues.current.firstName.trim()) errors.firstName = true;
    if (!formValues.current.lastName.trim()) errors.lastName = true;
    const phoneClean = formValues.current.phone.trim().replace(/\s/g, '').replace(/-/g, '');
    if (!phoneClean) errors.phone = true;
    else if (!/^07\d{8}$/.test(phoneClean)) errors.phone = true;
    if (!formValues.current.address.trim()) errors.address = true;
    if (!formValues.current.city.trim()) errors.city = true;

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(
        language === 'ar'
          ? 'يرجى تعبئة جميع البيانات المطلوبة بشكل صحيح'
          : 'Please fill in all required fields correctly',
        'error'
      );
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return false;
    }
    return true;
  };

  const handlePlaceOrder = async () => {
    if (paymentMethod === 'cod' && !validateForm()) return;
    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (saveAsDefault && token) {
      try {
        const created = await api.createCustomerAddress(token, {
          firstName: formValues.current.firstName.trim(),
          lastName: formValues.current.lastName.trim(),
          phone: formValues.current.phone.trim(),
          address1: formValues.current.address.trim(),
          city: formValues.current.city.trim(),
        });
        if (created?.id) await api.setDefaultAddress(token, created.id);
      } catch {}
    }

    try {
      if (paymentMethod === 'card') {
        let cardCartId: string | undefined;

        let newCart: any;
        if (isDirectBuy && selectedVariant?.id) {
          const cartLines = [{ merchandiseId: selectedVariant.id, quantity: productQty }];
          for (const u of upsellItems) {
            cartLines.push({ merchandiseId: u.variantId, quantity: u.quantity });
          }
          newCart = await api.createCart(cartLines);
        } else {
          const cartLines = lines.map((l: any) => ({
            merchandiseId: l.merchandise.id,
            quantity: l.quantity,
          }));
          if (cartLines.length === 0) {
            showToast(language === 'ar' ? 'السلة فارغة' : 'Cart is empty');
            setIsProcessing(false);
            return;
          }
          newCart = await api.createCart(cartLines);
        }

        cardCartId = newCart?.id;

        if (cardCartId) {
          const rawPhone = formValues.current.phone.trim().replace(/\s+/g, '').replace(/-/g, '');
          let formattedPhone: string | undefined;
          if (rawPhone.length >= 9) {
            if (rawPhone.startsWith('07')) {
              formattedPhone = '+962' + rawPhone.substring(1);
            } else if (rawPhone.startsWith('7') && rawPhone.length === 9) {
              formattedPhone = '+962' + rawPhone;
            } else if (rawPhone.startsWith('+962')) {
              formattedPhone = rawPhone;
            } else if (rawPhone.startsWith('00962')) {
              formattedPhone = '+' + rawPhone.substring(2);
            }
          }

          const hasEmail = !!customer?.email;
          const hasPhone = !!formattedPhone;
          if (hasEmail || hasPhone) {
            try {
              await api.updateBuyerIdentity({
                cartId: cardCartId,
                email: customer?.email || undefined,
                phone: hasPhone ? formattedPhone : undefined,
                firstName: formValues.current.firstName.trim() || undefined,
                lastName: formValues.current.lastName.trim() || undefined,
                address: formValues.current.address.trim() || undefined,
                city: formValues.current.city.trim() || undefined,
              });
            } catch {}
          }

          if (formValues.current.notes.trim()) {
            try { await api.updateCartNote(cardCartId, formValues.current.notes.trim()); } catch {}
          }

          if (discountApplied?.code) {
            try { await api.applyDiscount(cardCartId, [discountApplied.code]); } catch {}
          }

          let checkoutUrl = newCart?.checkoutUrl;
          if (!checkoutUrl) {
            const freshCart = await api.getCart(cardCartId);
            checkoutUrl = freshCart?.checkoutUrl;
          }
          if (checkoutUrl) {
            if (checkoutUrl.startsWith('http://')) {
              checkoutUrl = checkoutUrl.replace('http://', 'https://');
            }
            const locale = language === 'ar' ? 'ar' : 'en';
            const separator = checkoutUrl.includes('?') ? '&' : '?';
            checkoutUrl = `${checkoutUrl}${separator}locale=${locale}`;

            setCheckoutWebViewUrl(checkoutUrl);
            setIsProcessing(false);
            return;
          } else {
            showToast(language === 'ar' ? 'لم نتمكن من فتح صفحة الدفع' : 'Could not open checkout page');
          }
        }
        setIsProcessing(false);
        return;
      }

      if (isDirectBuy && selectedVariant?.id) {
        const updatedCart = await addToCart(selectedVariant.id, productQty, {
          productTitle: product?.title || '',
          productHandle: product?.handle || params.handle || '',
          variantTitle: selectedVariant?.title !== 'Default Title' ? selectedVariant?.title : undefined,
          price: productPrice,
          currencyCode: productCurrency,
          imageUrl: productImage ?? null,
        });
        const cartId = updatedCart?.id || cart?.id;

        if (cartId) {
          try {
            await api.updateBuyerIdentity({
              cartId,
              email: customer?.email || `${formValues.current.phone.trim().replace(/\D/g, '')}@xmart.jo`,
              phone: formValues.current.phone.trim(),
              firstName: formValues.current.firstName.trim(),
              lastName: formValues.current.lastName.trim(),
              address: formValues.current.address.trim() || undefined,
              city: formValues.current.city.trim() || undefined,
            });
          } catch {}

          if (formValues.current.notes.trim()) {
            try { await api.updateCartNote(cartId, formValues.current.notes.trim()); } catch {}
          }

          const orderItems = [
            {
              productTitle: product?.title || '',
              productHandle: product?.handle || params.handle || undefined,
              variantTitle: selectedVariant?.title !== 'Default Title' ? selectedVariant?.title : undefined,
              variantId: selectedVariant.id,
              quantity: productQty,
              price: productPrice,
              currency: productCurrency,
              imageUrl: productImage,
            },
            ...upsellItems.map(u => ({
              productTitle: u.productTitle,
              productHandle: u.handle || undefined,
              variantTitle: u.variantTitle,
              variantId: u.variantId,
              quantity: u.quantity,
              price: u.price,
              currency: u.currency,
              imageUrl: u.imageUrl,
            })),
          ];

          const result = await api.placeOrder({
            cartId,
            firstName: formValues.current.firstName.trim(),
            lastName: formValues.current.lastName.trim(),
            email: customer?.email || `${formValues.current.phone.trim().replace(/\D/g, '')}@xmart.jo`,
            phone: formValues.current.phone.trim(),
            address: formValues.current.address.trim() || undefined,
            city: formValues.current.city.trim() || undefined,
            notes: formValues.current.notes.trim() || undefined,
            items: orderItems,
            subtotal: itemTotal,
            total: displayTotal,
            currency: productCurrency,
            discountCode: discountApplied?.code || undefined,
            shippingCost: discountApplied?.isFreeShipping ? '0' : shipping.cost,
            shippingName: discountApplied?.isFreeShipping ? (language === 'ar' ? 'توصيل مجاني' : 'Free Delivery') : shipping.name,
          });

          setConfirmedOrder({
            orderNumber: result.order?.deliveryCode || '—',
            total: displayTotal,
            currency: productCurrency,
            orderStatusUrl: result.order?.shopifyOrderStatusUrl || null,
            firstName: formValues.current.firstName,
            lastName: formValues.current.lastName,
            phone: formValues.current.phone,
            address: formValues.current.address,
            city: formValues.current.city,
            email: customer?.email || '',
            items: [{ title: product?.title || '', quantity: productQty, price: selectedVariant?.price?.amount || product?.priceRange?.minVariantPrice?.amount || '0', imageUrl: product?.images?.edges?.[0]?.node?.url }],
            subtotal: rawSubtotal,
            shippingCost: shipping.cost,
            shippingName: shipping.name,
            discountCode: discountApplied?.code || null,
            discountAmount: discountAmount > 0 ? discountAmount.toFixed(3) : null,
            isFreeShipping: discountApplied?.isFreeShipping || false,
          });
          clearCart();
        }
      } else {
        const cartId = cart?.id;
        if (!cartId) {
          showToast(t('checkout.noCart'));
          setIsProcessing(false);
          return;
        }

        try {
          await api.updateBuyerIdentity({
            cartId,
            email: customer?.email || `${formValues.current.phone.trim().replace(/\D/g, '')}@xmart.jo`,
            phone: formValues.current.phone.trim(),
            firstName: formValues.current.firstName.trim(),
            lastName: formValues.current.lastName.trim(),
            address: formValues.current.address.trim() || undefined,
            city: formValues.current.city.trim() || undefined,
          });
        } catch {}

        if (formValues.current.notes.trim()) {
          try { await api.updateCartNote(cartId, formValues.current.notes.trim()); } catch {}
        }

        const orderItemsList = lines.map((line: any) => ({
          productTitle: line.merchandise.product.title,
          productHandle: line.merchandise.product.handle || undefined,
          variantTitle: line.merchandise.title !== 'Default Title' ? line.merchandise.title : undefined,
          variantId: line.merchandise.id,
          quantity: line.quantity,
          price: line.merchandise.price.amount,
          currency: line.merchandise.price.currencyCode,
          imageUrl: line.merchandise.product.images?.edges?.[0]?.node?.url,
        }));

        const result = await api.placeOrder({
          cartId,
          firstName: formValues.current.firstName.trim(),
          lastName: formValues.current.lastName.trim(),
          email: customer?.email || `${formValues.current.phone.trim().replace(/\D/g, '')}@xmart.jo`,
          phone: formValues.current.phone.trim(),
          address: formValues.current.address.trim() || undefined,
          city: formValues.current.city.trim() || undefined,
          notes: formValues.current.notes.trim() || undefined,
          items: orderItemsList,
          subtotal: rawSubtotal,
          total: displayTotal,
          currency: cartCurrency,
          discountCode: discountApplied?.code || undefined,
          shippingCost: discountApplied?.isFreeShipping ? '0' : shipping.cost,
          shippingName: discountApplied?.isFreeShipping ? (language === 'ar' ? 'توصيل مجاني' : 'Free Delivery') : shipping.name,
        });

        setConfirmedOrder({
          orderNumber: result.order?.deliveryCode || '—',
          total: displayTotal,
          currency: cartCurrency,
          orderStatusUrl: result.order?.shopifyOrderStatusUrl || null,
          firstName: formValues.current.firstName,
          lastName: formValues.current.lastName,
          phone: formValues.current.phone,
          address: formValues.current.address,
          city: formValues.current.city,
          email: customer?.email || '',
          items: lines.map((line: any) => ({
            title: line.merchandise?.product?.title || '',
            quantity: line.quantity || 1,
            price: line.merchandise?.price?.amount || line.cost?.totalAmount?.amount || '0',
            imageUrl: line.merchandise?.image?.url || line.merchandise?.product?.images?.edges?.[0]?.node?.url,
          })),
          subtotal: rawSubtotal,
          shippingCost: shipping.cost,
          shippingName: shipping.name,
          discountCode: discountApplied?.code || null,
          discountAmount: discountAmount > 0 ? discountAmount.toFixed(3) : null,
          isFreeShipping: discountApplied?.isFreeShipping || false,
        });
        clearCart();
      }
    } catch (err: any) {
      showToast(
        language === 'ar' ? 'حدث خطأ في تأكيد الطلب. يرجى المحاولة مرة أخرى' : 'Failed to place order. Please try again'
      );
    }
    setIsProcessing(false);
  };

  const s = useMemo(() => getStyles(colors, isDark, isRTL), [colors, isDark, isRTL]);

  const handleWebViewNavigation = (navState: any) => {
    const url = navState.url || '';
    if ((url.includes('/thank_you') || url.includes('/thank-you') || url.includes('order-confirmed') || url.includes('/orders/')) && !webViewHandledRef.current) {
      webViewHandledRef.current = true;
      setCheckoutWebViewUrl(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const capturedEmail = customer?.email || '';
      const capturedFirstName = formValues.current.firstName;
      const capturedLastName = formValues.current.lastName;
      const capturedPhone = formValues.current.phone;
      const capturedAddress = formValues.current.address;
      const capturedCity = formValues.current.city;
      const capturedSubtotal = rawSubtotal;
      const capturedDisplayTotal = displayTotal;
      const capturedCurrency = displayCurrency;
      const capturedShipping = { ...shipping };
      const capturedItems = isDirectBuy && product
        ? [{ title: product.title, quantity: productQty, price: selectedVariant?.price?.amount || product.priceRange?.minVariantPrice?.amount || '0', imageUrl: product.images?.edges?.[0]?.node?.url }]
        : lines.map((line: any) => ({
            title: line.merchandise?.product?.title || '',
            quantity: line.quantity || 1,
            price: line.merchandise?.price?.amount || line.cost?.totalAmount?.amount || '0',
            imageUrl: line.merchandise?.image?.url || line.merchandise?.product?.images?.edges?.[0]?.node?.url,
          }));

      setFetchingOrderDetails(true);
      clearCart();

      const fetchOrderDetails = async () => {
        let shopifyOrderName = '';
        let shopifyTotal = '';
        let shopifyDeliveryCode: string | null = null;

        if (capturedEmail) {
          for (let attempt = 0; attempt < 5; attempt++) {
            try {
              await new Promise(resolve => setTimeout(resolve, attempt === 0 ? 2000 : 3000));
              const result = await api.getLatestOrder(capturedEmail);
              if (result?.order) {
                shopifyOrderName = result.order.name || '';
                shopifyTotal = result.order.totalPrice || '';
                shopifyDeliveryCode = result.order.deliveryCode || null;
                break;
              }
            } catch {}
          }
        }

        setConfirmedOrder({
          orderNumber: shopifyDeliveryCode || shopifyOrderName || '—',
          total: capturedDisplayTotal || shopifyTotal || capturedSubtotal,
          currency: capturedCurrency,
          firstName: capturedFirstName,
          lastName: capturedLastName,
          phone: capturedPhone,
          address: capturedAddress,
          city: capturedCity,
          email: capturedEmail,
          items: capturedItems,
          subtotal: capturedSubtotal,
          shippingCost: capturedShipping.cost,
          shippingName: capturedShipping.name,
          discountCode: discountApplied?.code || null,
          discountAmount: discountAmount > 0 ? discountAmount.toFixed(3) : null,
          isFreeShipping: discountApplied?.isFreeShipping || false,
        });
        setFetchingOrderDetails(false);
      };

      fetchOrderDetails();
    }
  };

  if (checkoutWebViewUrl) {
    return (
      <View style={[s.container, { paddingTop: insets.top + webTopInset }]}>
        <View style={[s.subHeader, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCheckoutWebViewUrl(null);
            }}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={colors.text} />
          </Pressable>
          <Text style={[s.subHeaderTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>
            {language === 'ar' ? 'إتمام الدفع' : 'Complete Payment'}
          </Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCheckoutWebViewUrl(null);
            }}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>
        <WebView
          source={{ uri: checkoutWebViewUrl }}
          style={{ flex: 1 }}
          onNavigationStateChange={handleWebViewNavigation}
          originWhitelist={['https://*', 'http://*']}
          setSupportMultipleWindows={false}
          mixedContentMode="always"
          allowsInlineMediaPlayback
          startInLoadingState
          renderLoading={() => (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: colors.textSecondary, marginTop: 12 }}>
                {language === 'ar' ? 'جاري تحميل صفحة الدفع...' : 'Loading checkout...'}
              </Text>
            </View>
          )}
          onShouldStartLoadWithRequest={(request) => {
            if (request.url && request.url.startsWith('http://')) {
              return false;
            }
            return true;
          }}
          onError={() => {}}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
        />
      </View>
    );
  }

  if (fetchingOrderDetails && !confirmedOrder) {
    return (
      <View style={[s.container, { paddingTop: insets.top + webTopInset, justifyContent: 'center', alignItems: 'center' }]}>
        <View style={s.checkCircle}>
          <Ionicons name="checkmark" size={44} color="#fff" />
        </View>
        <Text style={[s.confirmTitle, { marginTop: 16 }]}>{t('checkout.orderConfirmed')}</Text>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
        <Text style={{ fontFamily: 'Cairo_400Regular', fontSize: 14, color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
          {language === 'ar' ? 'جاري جلب تفاصيل الطلب...' : 'Fetching order details...'}
        </Text>
      </View>
    );
  }

  if (confirmedOrder) {
    const cItems = confirmedOrder.items || [];
    const cShippingCost = parseFloat(confirmedOrder.shippingCost || '0');
    return (
      <View style={[s.container, { paddingTop: insets.top + webTopInset }]}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 + webBottomInset }} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(500)} style={s.confirmCard}>
            <View style={s.checkCircle}>
              <Ionicons name="checkmark" size={44} color="#fff" />
            </View>
            <Text style={s.confirmTitle}>{t('checkout.orderConfirmed')}</Text>
            {confirmedOrder.orderNumber !== '—' && (
              <View style={s.orderBadge}>
                <Text style={s.orderBadgeLabel}>{t('checkout.orderNumber')}</Text>
                <Text style={s.orderBadgeValue}>{confirmedOrder.orderNumber}</Text>
              </View>
            )}
            <Text style={s.confirmDesc}>{t('checkout.orderConfirmedDesc')}</Text>
          </Animated.View>

          {cItems.length > 0 && (
            <Animated.View entering={FadeInDown.duration(500).delay(100)} style={[s.confirmCard, { marginTop: 12 }]}>
              <Text style={[s.confirmSectionTitle, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {language === 'ar' ? 'المنتجات' : 'Items'} ({cItems.length})
              </Text>
              {cItems.map((item: any, idx: number) => (
                <View key={idx} style={[s.confirmItemRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={s.confirmItemImage} contentFit="cover" />
                  ) : (
                    <View style={[s.confirmItemImage, { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="cube-outline" size={20} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text style={[s.confirmItemTitle, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={2}>{item.title}</Text>
                    <Text style={[s.confirmItemQty, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {language === 'ar' ? `الكمية: ${item.quantity}` : `Qty: ${item.quantity}`}
                    </Text>
                  </View>
                </View>
              ))}
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={[s.confirmCard, { marginTop: 12 }]}>
            {confirmedOrder.discountCode && (
              <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(76,175,80,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 12 }]}>
                <Ionicons name="pricetag" size={16} color="#4CAF50" />
                <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13, color: '#4CAF50' }}>{confirmedOrder.discountCode}</Text>
                {confirmedOrder.isFreeShipping ? (
                  <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 12, color: '#4CAF50' }}>
                    {language === 'ar' ? '— توصيل مجاني' : '— Free Shipping'}
                  </Text>
                ) : confirmedOrder.discountAmount ? (
                  <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 12, color: '#4CAF50' }}>
                    — -{formatCurrency(confirmedOrder.discountAmount, confirmedOrder.currency)}
                  </Text>
                ) : null}
              </View>
            )}
            <View style={[s.confirmTotalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={s.confirmTotalLabel}>{t('cart.total')}</Text>
              <Text style={s.confirmTotalValue}>{formatCurrency(confirmedOrder.total, confirmedOrder.currency)}</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(300)} style={[s.confirmCard, { marginTop: 12 }]}>
            <View style={[s.confirmInfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name={paymentMethod === 'card' ? 'card-outline' : 'cash-outline'} size={18} color={paymentMethod === 'card' ? '#248CCC' : '#4CAF50'} />
              <Text style={[s.confirmInfoText, { textAlign: isRTL ? 'right' : 'left', fontFamily: 'Cairo_700Bold' }]}>
                {paymentMethod === 'card'
                  ? (language === 'ar' ? 'الدفع بالبطاقة الائتمانية' : 'Credit Card Payment')
                  : (language === 'ar' ? 'الدفع عند الاستلام' : 'Cash on Delivery')}
              </Text>
            </View>
            <View style={s.confirmDivider} />
            <View style={[s.confirmInfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
              <Text style={[s.confirmInfoText, { textAlign: isRTL ? 'right' : 'left' }]}>{confirmedOrder.firstName} {confirmedOrder.lastName}</Text>
            </View>
            {confirmedOrder.email ? (
              <View style={[s.confirmInfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
                <Text style={[s.confirmInfoText, { textAlign: isRTL ? 'right' : 'left' }]}>{confirmedOrder.email}</Text>
              </View>
            ) : null}
            <View style={[s.confirmInfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
              <Text style={[s.confirmInfoText, { textAlign: isRTL ? 'right' : 'left' }]}>{confirmedOrder.phone}</Text>
            </View>
            {confirmedOrder.address ? (
              <View style={[s.confirmInfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
                <Text style={[s.confirmInfoText, { textAlign: isRTL ? 'right' : 'left' }]}>{confirmedOrder.address}{confirmedOrder.city ? `, ${confirmedOrder.city}` : ''}</Text>
              </View>
            ) : null}
          </Animated.View>

          <Pressable
            style={({ pressed }) => [s.continueBtn, { opacity: pressed ? 0.9 : 1, marginTop: 16 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.replace('/');
            }}
          >
            <Ionicons name="bag-handle-outline" size={20} color="#fff" />
            <Text style={s.continueBtnText}>{t('checkout.continueShopping')}</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  if (productLoading && isDirectBuy) {
    return (
      <View style={[s.container, { paddingTop: insets.top + webTopInset, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top + webTopInset }]}>
      <PageBackground isDark={isDark} />
      <Toast
        message={toastMsg}
        type={toastType}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />
      <View style={[s.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable onPress={() => { if (!isProcessing) router.back(); }} style={[s.backBtn, isProcessing && { opacity: 0.3 }]} disabled={isProcessing}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {isDirectBuy
            ? (language === 'ar' ? 'طلب سريع' : 'Quick Order')
            : (language === 'ar' ? 'إتمام الطلب' : 'Checkout')}
        </Text>
        <Pressable
          onPress={() => {
            if (isProcessing) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setPaymentMethod(prev => prev === 'cod' ? 'card' : 'cod');
          }}
          disabled={isProcessing}
          style={[s.codBadge, { backgroundColor: paymentMethod === 'card' ? '#248CCC15' : '#4CAF5015' }, isProcessing && { opacity: 0.3 }]}
        >
          <Ionicons name={paymentMethod === 'card' ? 'card-outline' : 'cash-outline'} size={14} color={paymentMethod === 'card' ? '#248CCC' : '#4CAF50'} />
          <Text style={[s.codBadgeText, { color: paymentMethod === 'card' ? '#248CCC' : '#4CAF50' }]}>
            {paymentMethod === 'card'
              ? (language === 'ar' ? 'بطاقة ائتمان' : 'Card')
              : (language === 'ar' ? 'دفع عند الاستلام' : 'COD')}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        nestedScrollEnabled={true}
        contentContainerStyle={{ paddingBottom: 120 + webBottomInset }}
      >
          {isDirectBuy && product && (
            <View style={s.productCard}>
              <View style={[s.productRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={s.productImgWrap}>
                  {productImage ? (
                    <Image source={{ uri: productImage }} style={s.productImg} contentFit="cover" />
                  ) : (
                    <View style={s.productImgPlaceholder}>
                      <Ionicons name="image-outline" size={28} color={colors.textMuted} />
                    </View>
                  )}
                </View>
                <View style={[s.productInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[s.productTitle, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={2}>{product.title}</Text>
                  {selectedVariant?.title && selectedVariant.title !== 'Default Title' && (
                    <Text style={s.variantText}>{selectedVariant.title}</Text>
                  )}
                  <View style={[s.priceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={s.priceText}>{formatCurrency(productPrice, productCurrency)}</Text>
                    {compareAtPrice && parseFloat(compareAtPrice) > parseFloat(productPrice) && (
                      <Text style={s.comparePrice}>{formatCurrency(compareAtPrice, productCurrency)}</Text>
                    )}
                  </View>
                  <View style={s.qtyRow}>
                    <Pressable
                      style={s.qtyBtn}
                      onPress={() => {
                        if (productQty > 1) {
                          setProductQty(q => q - 1);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                    >
                      <Ionicons name="remove" size={18} color={productQty > 1 ? '#E53935' : colors.textMuted} />
                    </Pressable>
                    <Text style={s.qtyText}>{productQty}</Text>
                    <Pressable
                      style={s.qtyBtn}
                      onPress={() => {
                        setProductQty(q => q + 1);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Ionicons name="add" size={18} color="#4CAF50" />
                    </Pressable>
                  </View>
                </View>
              </View>
              {upsellItems.length > 0 && (
                <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }}>
                  <Text style={[s.sectionLabel, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr', marginBottom: 6 }]}>
                    {language === 'ar' ? 'منتجات مضافة' : 'Added Products'}
                  </Text>
                  {upsellItems.map((u, idx) => (
                    <View key={u.variantId} style={[s.cartItemRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={s.cartItemImg}>
                        {u.imageUrl ? (
                          <Image source={{ uri: u.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                        ) : (
                          <Ionicons name="image-outline" size={18} color={colors.textMuted} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.cartItemTitle, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>{u.productTitle}</Text>
                        <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 6 }]}>
                          <Text style={s.cartItemQty}>×{u.quantity}</Text>
                          <Text style={s.cartItemPrice}>{formatCurrency(u.price, u.currency)}</Text>
                        </View>
                      </View>
                      <Pressable
                        onPress={() => {
                          setUpsellItems(prev => prev.filter(x => x.variantId !== u.variantId));
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={{ padding: 6 }}
                      >
                        <Ionicons name="close-circle" size={20} color="#E53935" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
              <View style={[s.itemTotalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={s.itemTotalLabel}>{language === 'ar' ? 'المجموع' : 'Total'}</Text>
                <Text style={s.itemTotalValue}>{formatCurrency(rawSubtotal, productCurrency)}</Text>
              </View>
            </View>
          )}

          {!isDirectBuy && lines.length > 0 && (
            <View style={s.productCard}>
              <Text style={[s.sectionLabel, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('checkout.orderSummary')} ({lines.length})
              </Text>
              {lines.map((line: any) => {
                const prod = line.merchandise.product;
                const imgUrl = prod.images?.edges?.[0]?.node?.url;
                return (
                  <View key={line.id} style={[s.cartItemRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={s.cartItemImg}>
                      {imgUrl ? (
                        <Image source={{ uri: imgUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                      ) : (
                        <Ionicons name="image-outline" size={18} color={colors.textMuted} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.cartItemTitle, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>{prod.title}</Text>
                      <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 6 }]}>
                        <Text style={s.cartItemPrice}>{formatCurrency(line.merchandise.price.amount, line.merchandise.price.currencyCode)}</Text>
                        <Text style={s.cartItemQty}>x{line.quantity}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
              <View style={[s.itemTotalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={s.itemTotalLabel}>{t('cart.total')}</Text>
                <Text style={s.itemTotalValue}>{formatCurrency(cartTotal || '0', cartCurrency)}</Text>
              </View>
            </View>
          )}

          <View style={s.formCard}>
            <Text style={[s.sectionLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', marginBottom: 12 }]}>
              {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
            </Text>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10 }}>
              <Pressable
                onPress={() => { setPaymentMethod('cod'); Haptics.selectionAsync(); }}
                style={[
                  s.paymentOption,
                  { borderColor: paymentMethod === 'cod' ? colors.primary : colors.border, backgroundColor: paymentMethod === 'cod' ? colors.primary + '10' : colors.card }
                ]}
              >
                <Ionicons name="cash-outline" size={24} color={paymentMethod === 'cod' ? colors.primary : colors.textMuted} />
                <Text style={[s.paymentOptionText, { color: paymentMethod === 'cod' ? colors.primary : colors.text }]}>
                  {language === 'ar' ? 'دفع عند الاستلام' : 'Cash on Delivery'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { setPaymentMethod('card'); Haptics.selectionAsync(); }}
                style={[
                  s.paymentOption,
                  { borderColor: paymentMethod === 'card' ? colors.primary : colors.border, backgroundColor: paymentMethod === 'card' ? colors.primary + '10' : colors.card }
                ]}
              >
                <Ionicons name="card-outline" size={24} color={paymentMethod === 'card' ? colors.primary : colors.textMuted} />
                <Text style={[s.paymentOptionText, { color: paymentMethod === 'card' ? colors.primary : colors.text }]}>
                  {language === 'ar' ? 'بطاقة ائتمان' : 'Credit Card'}
                </Text>
              </Pressable>
            </View>
            {paymentMethod === 'cod' && (
              <Text style={{ fontFamily: 'Cairo_400Regular', fontSize: 12, color: colors.textMuted, textAlign: isRTL ? 'right' : 'left', marginTop: 10, writingDirection: isRTL ? 'rtl' : 'ltr', lineHeight: 20 }}>
                {language === 'ar'
                  ? 'ادفع بكل سهولة عند وصول طلبك — بدون دفعات مقدمة وبدون أي متاعب. متاح بعدة طرق مريحة: كاش أو كليك (CliQ)'
                  : 'Pay easily when your order arrives — no upfront payments, no hassle. Available via cash or CliQ'}
              </Text>
            )}
            {paymentMethod === 'card' && (
              <Text style={{ fontFamily: 'Cairo_400Regular', fontSize: 12, color: colors.textMuted, textAlign: isRTL ? 'right' : 'left', marginTop: 10, writingDirection: isRTL ? 'rtl' : 'ltr', lineHeight: 20 }}>
                {language === 'ar'
                  ? 'لا تشيل هم الكاش 💳 ادفع أونلاين واستلم طلبك بأسرع وقت'
                  : 'No cash worries 💳 Pay online in seconds and receive your order as fast as possible'}
              </Text>
            )}
          </View>

          {paymentMethod === 'cod' && (
          <View style={s.formCard}>
            <View style={[s.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="person-outline" size={20} color={colors.primary} />
              <Text style={[s.sectionLabel, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('checkout.shippingDetails')}
              </Text>
            </View>

            <View>
            <View style={[s.formRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={s.formField}>
                <Text style={[s.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('auth.firstName')} *</Text>
                <ScrollableInput inputRef={firstNameInputRef} style={[s.input, { textAlign: isRTL ? 'right' : 'left' }, fieldErrors.firstName && { borderColor: '#E53935', borderWidth: 1.5 }]} defaultValue={formValues.current.firstName} onChangeText={(v: string) => { formValues.current.firstName = v; if (fieldErrors.firstName) setFieldErrors(e => ({ ...e, firstName: false })); }} placeholder={t('auth.firstName')} placeholderTextColor={colors.textMuted} returnKeyType="next" onSubmitEditing={() => lastNameRef.current?.focus()} />
              </View>
              <View style={s.formField}>
                <Text style={[s.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('auth.lastName')} *</Text>
                <ScrollableInput inputRef={lastNameRef} style={[s.input, { textAlign: isRTL ? 'right' : 'left' }, fieldErrors.lastName && { borderColor: '#E53935', borderWidth: 1.5 }]} defaultValue={formValues.current.lastName} onChangeText={(v: string) => { formValues.current.lastName = v; if (fieldErrors.lastName) setFieldErrors(e => ({ ...e, lastName: false })); }} placeholder={t('auth.lastName')} placeholderTextColor={colors.textMuted} returnKeyType="next" onSubmitEditing={() => phoneRef.current?.focus()} />
              </View>
            </View>

            <Text style={[s.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('checkout.phone')} *</Text>
            <ScrollableInput inputRef={phoneRef} style={[s.input, { textAlign: isRTL ? 'right' : 'left' }, fieldErrors.phone && { borderColor: '#E53935', borderWidth: 1.5 }]} defaultValue={formValues.current.phone} onChangeText={(v: string) => { formValues.current.phone = v; if (fieldErrors.phone) setFieldErrors(e => ({ ...e, phone: false })); }} placeholder="07XXXXXXXX" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" returnKeyType="next" onSubmitEditing={() => addressRef.current?.focus()} maxLength={10} />
            {fieldErrors.phone && (
              <Text style={{ color: '#E53935', fontSize: 12, fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left', marginTop: 4 }}>
                {language === 'ar' ? 'رقم الهاتف يجب أن يكون 10 أرقام ويبدأ بـ 07' : 'Phone must be 10 digits and start with 07'}
              </Text>
            )}

            <Text style={[s.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('checkout.address')} *</Text>
            <View style={[s.addressRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <ScrollableInput inputRef={addressRef} style={[s.input, s.addressInput, { textAlign: isRTL ? 'right' : 'left' }, fieldErrors.address && { borderColor: '#E53935', borderWidth: 1.5 }]} defaultValue={formValues.current.address} onChangeText={(v: string) => { formValues.current.address = v; if (fieldErrors.address) setFieldErrors(e => ({ ...e, address: false })); }} placeholder={t('checkout.addressPlaceholder')} placeholderTextColor={colors.textMuted} returnKeyType="next" onSubmitEditing={() => notesRef.current?.focus()} />
              <Pressable
                style={({ pressed }) => [s.locationIconBtn, { opacity: pressed ? 0.7 : 1 }]}
                onPress={detectLocation}
                disabled={isLocating}
              >
                {isLocating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="navigate" size={20} color="#fff" />
                )}
              </Pressable>
            </View>

            <Text style={[s.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('checkout.city')} *</Text>
            <ScrollableInput inputRef={cityRef} style={[s.input, { textAlign: isRTL ? 'right' : 'left' }, fieldErrors.city && { borderColor: '#E53935', borderWidth: 1.5 }]} defaultValue={formValues.current.city} onChangeText={(v: string) => { formValues.current.city = v; if (fieldErrors.city) setFieldErrors(e => ({ ...e, city: false })); }} placeholder={language === 'ar' ? 'المدينة' : 'City'} placeholderTextColor={colors.textMuted} returnKeyType="next" onSubmitEditing={() => notesRef.current?.focus()} />

            <Text style={[s.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('checkout.notes')}</Text>
            <ScrollableInput inputRef={notesRef} style={[s.input, s.textArea, { textAlign: isRTL ? 'right' : 'left', textAlignVertical: 'top' }]} defaultValue={formValues.current.notes} onChangeText={(v: string) => { formValues.current.notes = v; }} placeholder={t('checkout.notesPlaceholder')} placeholderTextColor={colors.textMuted} multiline numberOfLines={3} />
            </View>

            {!!token && (
              <Pressable
                onPress={() => setSaveAsDefault(v => !v)}
                style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, marginTop: 4, paddingVertical: 4 }}
              >
                <View style={{
                  width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                  borderColor: saveAsDefault ? colors.primary : colors.border,
                  backgroundColor: saveAsDefault ? colors.primary : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {saveAsDefault && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={{ fontFamily: 'Cairo_400Regular', fontSize: 14, color: colors.text }}>
                  {language === 'ar' ? 'حفظ كعنوان افتراضي' : 'Make this my default address'}
                </Text>
              </Pressable>
            )}
          </View>
          )}


          <View style={s.formCard}>
            <View style={[s.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="pricetag-outline" size={20} color={colors.primary} />
              <Text style={[s.sectionLabel, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {language === 'ar' ? 'كود الخصم' : 'Discount Code'}
              </Text>
            </View>
            {discountApplied ? (
              <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(76,175,80,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flex: 1 }]}>
                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                  <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: '#4CAF50' }}>{discountApplied.code}</Text>
                  <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: '#4CAF50' }}>
                    {discountApplied.isFreeShipping
                      ? (language === 'ar' ? '— توصيل مجاني' : '— Free Shipping')
                      : `— -${formatCurrency(discountApplied.discountAmount, displayCurrency)}`}
                  </Text>
                </View>
                <Pressable onPress={removeDiscount} style={{ padding: 6, marginHorizontal: 4 }}>
                  <Ionicons name="close-circle" size={22} color="#E53935" />
                </Pressable>
              </View>
            ) : (
              <>
                <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, alignItems: 'center' }]}>
                  <TextInput
                    style={[s.input, { flex: 1, marginBottom: 0, letterSpacing: 1 }]}
                    value={discountCode}
                    onChangeText={(v) => { setDiscountCode(v.toUpperCase()); setDiscountError(''); }}
                    placeholder={language === 'ar' ? 'أدخل كود الخصم' : 'Enter discount code'}
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters"
                    returnKeyType="go"
                    onSubmitEditing={handleApplyDiscount}
                    editable={!isValidatingDiscount}
                    scrollEnabled={false}
                  />
                  <Pressable
                    onPress={handleApplyDiscount}
                    disabled={isValidatingDiscount || !discountCode.trim()}
                    style={({ pressed }) => ({
                      backgroundColor: isValidatingDiscount || !discountCode.trim() ? colors.textMuted : colors.primary,
                      borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10,
                      alignItems: 'center', justifyContent: 'center', minWidth: 80,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    {isValidatingDiscount ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: '#fff' }}>
                        {language === 'ar' ? 'تطبيق' : 'Apply'}
                      </Text>
                    )}
                  </Pressable>
                </View>
                {!!discountError && (
                  <Text style={{ fontFamily: 'Cairo_400Regular', fontSize: 12, color: '#E53935', marginTop: 6, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }}>
                    {discountError}
                  </Text>
                )}
              </>
            )}
          </View>

          {paymentMethod === 'cod' && (
          <View style={s.formCard}>
            <View style={[s.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="receipt-outline" size={20} color={colors.primary} />
              <Text style={[s.sectionLabel, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {language === 'ar' ? 'تفاصيل السعر' : 'Price Details'}
              </Text>
            </View>
            <View style={[s.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={s.summaryLabel}>{t('cart.subtotal')}</Text>
              <Text style={s.summaryValue}>{formatCurrency(rawSubtotal, displayCurrency)}</Text>
            </View>
            {discountApplied && discountAmount > 0 && (
              <View style={[s.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[s.summaryLabel, { color: '#4CAF50' }]}>
                  {language === 'ar' ? 'الخصم' : 'Discount'} ({discountApplied.code})
                </Text>
                <Text style={[s.summaryValue, { color: '#4CAF50' }]}>-{formatCurrency(discountAmount.toFixed(3), displayCurrency)}</Text>
              </View>
            )}
            <View style={[s.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={s.summaryLabel}>{t('checkout.shipping')}</Text>
              <Text style={[s.summaryValue, effectiveShipping === 0 && { color: '#4CAF50' }]}>
                {effectiveShipping === 0 ? (language === 'ar' ? 'مجاني' : 'Free') : formatCurrency(shipping.cost, displayCurrency)}
              </Text>
            </View>
            {discountApplied?.isFreeShipping && shippingAmount > 0 && (
              <Text style={[s.freeShippingHint, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr', color: '#4CAF50' }]}>
                {language === 'ar'
                  ? `توصيل مجاني بكود ${discountApplied.code}`
                  : `Free shipping with code ${discountApplied.code}`}
              </Text>
            )}
            {!discountApplied?.isFreeShipping && shippingAmount > 0 && parseFloat(rawSubtotal) < 40 && (
              <Text style={[s.freeShippingHint, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {language === 'ar'
                  ? `أضف ${formatCurrency((40 - parseFloat(rawSubtotal)).toFixed(3), displayCurrency)} للحصول على توصيل مجاني`
                  : `Add ${formatCurrency((40 - parseFloat(rawSubtotal)).toFixed(3), displayCurrency)} more for free delivery`}
              </Text>
            )}
            <View style={s.summaryDivider} />
            <View style={[s.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={s.summaryTotalLabel}>{t('cart.total')}</Text>
              <Text style={s.summaryTotalValue}>{formatCurrency(displayTotal, displayCurrency)}</Text>
            </View>
          </View>
          )}

      </ScrollView>

      <View style={[s.bottomBar, { paddingBottom: insets.bottom + webBottomInset + 8 }]}>
        <View style={[s.bottomTotal, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View>
            <Text style={[s.bottomTotalLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
              {language === 'ar' ? 'الإجمالي' : 'Total'}
            </Text>
            <Text style={s.bottomTotalValue}>{formatCurrency(displayTotal, displayCurrency)}</Text>
          </View>
          <View style={[s.codTag, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: paymentMethod === 'card' ? '#248CCC10' : '#4CAF5010', borderColor: paymentMethod === 'card' ? '#248CCC30' : '#4CAF5030' }]}>
            <Ionicons name={paymentMethod === 'card' ? 'card-outline' : 'cash-outline'} size={14} color={paymentMethod === 'card' ? '#248CCC' : '#4CAF50'} />
            <Text style={[s.codTagText, { color: paymentMethod === 'card' ? '#248CCC' : '#4CAF50' }]}>
              {paymentMethod === 'card'
                ? (language === 'ar' ? 'بطاقة ائتمان' : 'Credit Card')
                : (language === 'ar' ? 'دفع عند الاستلام' : 'Cash on Delivery')}
            </Text>
          </View>
        </View>
        {isProcessing ? (
          <View style={[s.placeOrderBtn, { opacity: 0.7 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={s.placeOrderText}>{t('checkout.placingOrder')}</Text>
            </View>
          </View>
        ) : paymentMethod === 'card' ? (
          <Pressable
            style={({ pressed }) => [s.placeOrderBtn, { backgroundColor: '#248CCC', opacity: pressed ? 0.85 : 1 }]}
            onPress={handlePlaceOrder}
          >
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="card-outline" size={20} color="#fff" />
              <Text style={s.placeOrderText}>
                {language === 'ar' ? 'المتابعة للدفع' : 'Proceed to Payment'}
              </Text>
            </View>
          </Pressable>
        ) : (
          <SwipeToConfirm
            onComplete={handlePlaceOrder}
            isRTL={isRTL}
            language={language}
            colors={colors}
            labelAr="اسحب لتأكيد الطلب"
            labelEn="Swipe to Confirm Order"
          />
        )}
      </View>
    </View>
  );
}

function getStyles(colors: typeof Colors.dark, isDark: boolean, isRTL: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    subHeader: {
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    subHeaderTitle: {
      flex: 1,
      fontFamily: 'Cairo_700Bold',
      fontSize: 18,
    },
    header: {
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      fontFamily: 'Cairo_700Bold',
      fontSize: 20,
      color: colors.text,
    },
    codBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(76,175,80,0.12)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    codBadgeText: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 11,
      color: '#4CAF50',
    },
    productCard: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    productRow: {
      gap: 12,
    },
    productImgWrap: {
      width: 90,
      height: 90,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: '#fff',
    },
    productImg: {
      width: 90,
      height: 90,
    },
    productImgPlaceholder: {
      width: 90,
      height: 90,
      alignItems: 'center',
      justifyContent: 'center',
    },
    productInfo: {
      flex: 1,
      gap: 4,
    },
    productTitle: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    variantText: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 12,
      color: colors.textSecondary,
    },
    priceRow: {
      alignItems: 'center',
      gap: 8,
    },
    priceText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 16,
      color: colors.primary,
    },
    comparePrice: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 13,
      color: colors.textMuted,
      textDecorationLine: 'line-through',
    },
    qtyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginTop: 6,
    },
    qtyBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    qtyText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 16,
      color: colors.text,
      minWidth: 24,
      textAlign: 'center',
    },
    itemTotalRow: {
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    itemTotalLabel: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 14,
      color: colors.textSecondary,
    },
    itemTotalValue: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 18,
      color: colors.primary,
    },
    cartItemRow: {
      gap: 10,
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    cartItemImg: {
      width: 48,
      height: 48,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cartItemTitle: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 13,
      color: colors.text,
    },
    cartItemPrice: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 13,
      color: colors.primary,
    },
    cartItemQty: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 12,
      color: colors.textMuted,
    },
    formCard: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionHeader: {
      alignItems: 'center',
      gap: 8,
      marginBottom: 14,
    },
    sectionLabel: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 16,
      color: colors.text,
    },
    formRow: {
      gap: 10,
      marginBottom: 4,
    },
    formField: {
      flex: 1,
    },
    label: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 4,
      marginTop: 8,
    },
    input: {
      backgroundColor: isDark ? colors.inputBg : '#f8f9fa',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontFamily: 'Cairo_400Regular',
      fontSize: 14,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      height: 46,
    },
    textArea: {
      height: 'auto' as any,
      minHeight: 70,
    },
    addressRow: {
      alignItems: 'center',
      gap: 8,
    },
    addressInput: {
      flex: 1,
      height: 46,
    },
    locationIconBtn: {
      width: 42,
      height: 42,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    cityPickerWrap: {
      marginTop: 4,
      flexWrap: 'wrap',
      gap: 8,
    },
    cityChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: isDark ? colors.inputBg : '#f8f9fa',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cityChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    cityChipText: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 13,
      color: colors.textSecondary,
    },
    cityChipTextActive: {
      color: '#fff',
    },
    summaryRow: {
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
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
    summaryDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 8,
    },
    summaryTotalLabel: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 16,
      color: colors.text,
    },
    summaryTotalValue: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 20,
      color: colors.primary,
    },
    freeShippingHint: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 11,
      color: '#FF9800',
      marginTop: 2,
      paddingHorizontal: 2,
    },
    upsellHeader: {
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    upsellTitle: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 16,
      color: colors.text,
    },
    bottomBar: {
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    bottomTotal: {
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    bottomTotalLabel: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 12,
      color: colors.textMuted,
    },
    bottomTotalValue: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 22,
      color: colors.primary,
    },
    codTag: {
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(76,175,80,0.1)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    codTagText: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 11,
      color: '#4CAF50',
    },
    paymentOption: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 15,
      borderRadius: 12,
      borderWidth: 2,
      gap: 8,
    },
    paymentOptionText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 14,
    },
    placeOrderBtn: {
      backgroundColor: '#4CAF50',
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeOrderText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 17,
      color: '#fff',
    },
    confirmCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    checkCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: '#4CAF50',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    confirmTitle: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 22,
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    orderBadge: {
      backgroundColor: colors.primary + '15',
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 10,
      marginBottom: 12,
      alignItems: 'center',
    },
    orderBadgeLabel: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 12,
      color: colors.textSecondary,
    },
    orderBadgeValue: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 18,
      color: colors.primary,
    },
    confirmDesc: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    confirmDivider: {
      height: 1,
      backgroundColor: colors.border,
      width: '100%',
      marginVertical: 16,
    },
    confirmTotalRow: {
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginBottom: 12,
    },
    confirmTotalLabel: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 16,
      color: colors.text,
    },
    confirmTotalValue: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 20,
      color: '#4CAF50',
    },
    confirmSectionTitle: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 16,
      color: colors.text,
      marginBottom: 12,
    },
    confirmItemRow: {
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border + '50',
      width: '100%',
    },
    confirmItemImage: {
      width: 48,
      height: 48,
      borderRadius: 8,
      backgroundColor: '#FFFFFF',
    },
    confirmItemTitle: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 13,
      color: colors.text,
      lineHeight: 20,
    },
    confirmItemQty: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 12,
      color: colors.textSecondary,
    },
    confirmItemPrice: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 14,
      color: colors.text,
    },
    confirmSummaryRow: {
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      paddingVertical: 4,
    },
    confirmSummaryLabel: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 14,
      color: colors.textSecondary,
    },
    confirmSummaryValue: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 14,
      color: colors.text,
    },
    confirmInfoRow: {
      alignItems: 'center',
      gap: 8,
      width: '100%',
      paddingVertical: 4,
    },
    confirmInfoText: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 14,
      color: colors.textSecondary,
      flex: 1,
    },
    trackOrderBtn: {
      flexDirection: 'row',
      backgroundColor: '#4CAF50',
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 20,
    },
    trackOrderBtnText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 16,
      color: '#fff',
    },
    continueBtn: {
      flexDirection: 'row',
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 20,
    },
    continueBtnText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 16,
      color: '#fff',
    },
  });
}
