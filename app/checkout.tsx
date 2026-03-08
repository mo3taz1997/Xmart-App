import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Alert, Keyboard,
} from 'react-native';

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
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as WebBrowser from 'expo-web-browser';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import PageBackground from '@/components/PageBackground';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t, isRTL, formatCurrency, language } = useLanguage();
  const { cart, getCheckoutUrl, clearCart } = useCart();
  const { customer, token } = useAuth();

  const [firstName, setFirstName] = useState(customer?.firstName || '');
  const [lastName, setLastName] = useState(customer?.lastName || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState(1);
  const [confirmedOrder, setConfirmedOrder] = useState<any>(null);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  React.useEffect(() => {
    if (customer?.email) {
      api.getAddresses(customer.email, token || undefined).then((addrs: any[]) => {
        setSavedAddresses(addrs);
        const defaultAddr = addrs.find((a: any) => a.isDefault);
        if (defaultAddr) {
          applyAddress(defaultAddr);
          setSelectedAddressId(defaultAddr.id);
        }
      }).catch(() => {});
    }
  }, [customer?.email, token]);

  const applyAddress = (addr: any) => {
    setFirstName(addr.firstName || '');
    setLastName(addr.lastName || '');
    setPhone(addr.phone || '');
    setAddress(addr.address || '');
    setCity(addr.city || '');
  };

  const detectLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('addresses.error'), t('addresses.locationDenied'));
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
        setAddress(parts.join(', ') || data.display_name?.split(',').slice(0, 3).join(',') || '');
        setCity(a.city || a.town || a.village || a.state || '');
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert(t('addresses.error'), t('addresses.locationError'));
    }
    setIsLocating(false);
  };

  const lines = cart?.lines?.edges?.map((e: any) => e.node) || [];
  const subtotal = cart?.cost?.subtotalAmount?.amount;
  const total = cart?.cost?.totalAmount?.amount;
  const currency = cart?.cost?.totalAmount?.currencyCode || 'JOD';

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);

  const validateShippingForm = () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      Alert.alert(t('checkout.error'), t('checkout.fillRequired'));
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(t('checkout.error'), t('checkout.invalidEmail'));
      return false;
    }
    return true;
  };

  const handleProceedToPayment = async () => {
    if (!validateShippingForm()) return;

    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const cartId = cart?.id;
      if (!cartId) {
        Alert.alert(t('checkout.error'), t('checkout.noCart'));
        setIsProcessing(false);
        return;
      }

      try {
        await api.updateBuyerIdentity({
          cartId,
          email: email.trim(),
          phone: phone.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          address: address.trim() || undefined,
          city: city.trim() || undefined,
        });
      } catch (e) {
        console.log('Buyer identity update warning:', e);
      }

      if (notes.trim()) {
        try {
          await api.updateCartNote(cartId, notes.trim());
        } catch {}
      }

      let checkoutUrl = getCheckoutUrl();
      if (!checkoutUrl) {
        Alert.alert(t('checkout.error'), t('checkout.noCart'));
        setIsProcessing(false);
        return;
      }
      const locale = language === 'ar' ? 'ar' : 'en';
      const sep = checkoutUrl.includes('?') ? '&' : '?';
      checkoutUrl = `${checkoutUrl}${sep}locale=${locale}`;

      try {
        const result = await api.autoCompleteCheckout({
          checkoutUrl,
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          notes: notes.trim() || undefined,
        });

        if (result.success && result.orderConfirmed) {
          setConfirmedOrder({
            orderNumber: result.orderNumber || '—',
            customerFirstName: firstName.trim(),
            customerLastName: lastName.trim(),
            customerEmail: email.trim(),
            customerPhone: phone.trim(),
            shippingAddress: address.trim(),
            shippingCity: city.trim(),
            total: total || '0',
            currency,
          });
          clearCart();
          setStep(3);
          setIsProcessing(false);
          return;
        }

        if (result.redirectUrl) {
          let redirectUrl = result.redirectUrl;
          if (!redirectUrl.includes('locale=')) {
            const rsep = redirectUrl.includes('?') ? '&' : '?';
            redirectUrl = `${redirectUrl}${rsep}locale=${locale}`;
          }
          const browserResult = await WebBrowser.openBrowserAsync(redirectUrl);
          if (browserResult.type === 'cancel' || browserResult.type === 'dismiss') {
            clearCart();
            router.replace('/');
          }
          setIsProcessing(false);
          return;
        }
      } catch (autoCompleteError) {
        console.log('Auto-complete failed, falling back to browser:', autoCompleteError);
      }

      const browserResult = await WebBrowser.openBrowserAsync(checkoutUrl);
      if (browserResult.type === 'cancel' || browserResult.type === 'dismiss') {
        clearCart();
        router.replace('/');
      }
    } catch (err: any) {
      Alert.alert(t('checkout.error'), t('checkout.orderError'));
    }
    setIsProcessing(false);
  };

  const styles = getStyles(colors, isDark);

  if (confirmedOrder && step === 3) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={{ width: 40 }} />
          <Text style={[styles.headerTitle, { textAlign: 'center' }]}>{t('checkout.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.confirmationContent, { paddingBottom: 40 + webBottomInset }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(400)} style={styles.confirmationCard}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={40} color="#fff" />
            </View>
            <Text style={styles.confirmedTitle}>{t('checkout.orderConfirmed')}</Text>
            {confirmedOrder.orderNumber !== '—' && (
              <View style={styles.orderNumberBadge}>
                <Text style={styles.orderNumberLabel}>{t('checkout.orderNumber')}</Text>
                <Text style={styles.orderNumberValue}>#{confirmedOrder.orderNumber}</Text>
              </View>
            )}
            <Text style={[styles.confirmedDesc, { textAlign: 'center' }]}>{t('checkout.orderConfirmedDesc')}</Text>
            <View style={styles.confirmDivider} />
            <View style={styles.confirmDetails}>
              <View style={[styles.confirmRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.confirmDetailText, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {confirmedOrder.customerFirstName} {confirmedOrder.customerLastName}
                </Text>
              </View>
              <View style={[styles.confirmRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.confirmDetailText, { textAlign: isRTL ? 'right' : 'left' }]}>{confirmedOrder.customerEmail}</Text>
              </View>
              <View style={[styles.confirmRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.confirmDetailText, { textAlign: isRTL ? 'right' : 'left' }]}>{confirmedOrder.customerPhone}</Text>
              </View>
              {confirmedOrder.shippingAddress && (
                <View style={[styles.confirmRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.confirmDetailText, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {confirmedOrder.shippingAddress}{confirmedOrder.shippingCity ? `, ${confirmedOrder.shippingCity}` : ''}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.confirmDivider} />
            <View style={[styles.confirmTotalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.confirmTotalLabel}>{t('cart.total')}</Text>
              <Text style={styles.confirmTotalValue}>{formatCurrency(confirmedOrder.total, confirmedOrder.currency)}</Text>
            </View>
          </Animated.View>
          <Pressable
            style={({ pressed }) => [styles.continueShoppingBtn, { opacity: pressed ? 0.9 : 1 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.replace('/');
            }}
          >
            <Ionicons name="bag-handle-outline" size={20} color="#fff" />
            <Text style={styles.continueBtnText}>{t('checkout.continueShopping')}</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  if (!cart || lines.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('checkout.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyText}>{t('cart.empty')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <PageBackground isDark={isDark} />
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('checkout.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.stepsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {[
          { num: 1, label: t('checkout.orderReview') },
          { num: 2, label: t('checkout.shippingInfo') },
        ].map((s, i) => (
          <React.Fragment key={s.num}>
            {i > 0 && <View style={[styles.stepLine, step >= s.num && styles.stepLineActive]} />}
            <Pressable
              onPress={() => { if (step > s.num) setStep(s.num); }}
              style={styles.stepItem}
            >
              <View style={[styles.stepCircle, step >= s.num && styles.stepCircleActive]}>
                {step > s.num ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Text style={[styles.stepNum, step >= s.num && styles.stepNumActive]}>{s.num}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, step >= s.num && styles.stepLabelActive]}>{s.label}</Text>
            </Pressable>
          </React.Fragment>
        ))}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <Pressable style={{ flex: 1 }} onPress={() => { if (Platform.OS !== 'web') Keyboard.dismiss(); }}>
          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
            contentContainerStyle={{ paddingBottom: 140 + webBottomInset }}
          >
          {step === 1 && (
            <Animated.View entering={FadeInDown.duration(300)}>
              <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('checkout.orderSummary')}</Text>
              {lines.map((line: any) => {
                const product = line.merchandise.product;
                const imageUrl = product.images?.edges?.[0]?.node?.url;
                return (
                  <View key={line.id} style={[styles.orderItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={styles.orderItemImage}>
                      {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.orderImg} contentFit="cover" />
                      ) : (
                        <View style={styles.orderImgPlaceholder}>
                          <Ionicons name="image-outline" size={20} color={colors.textMuted} />
                        </View>
                      )}
                    </View>
                    <View style={[styles.orderItemInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Text style={[styles.orderItemName, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={2}>{product.title}</Text>
                      {line.merchandise.title !== 'Default Title' && (
                        <Text style={[styles.orderItemVariant, { textAlign: isRTL ? 'right' : 'left' }]}>{line.merchandise.title}</Text>
                      )}
                      <View style={[styles.orderItemBottom, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={styles.orderItemPrice}>{formatCurrency(line.merchandise.price.amount, line.merchandise.price.currencyCode)}</Text>
                        <Text style={styles.orderItemQty}>x{line.quantity}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
              <View style={styles.summaryCard}>
                <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={styles.summaryValue}>{subtotal ? formatCurrency(subtotal, currency) : '—'}</Text>
                  <Text style={styles.summaryLabel}>{t('cart.subtotal')}</Text>
                </View>
                <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.summaryValue, { color: colors.success }]}>{t('checkout.freeShipping')}</Text>
                  <Text style={styles.summaryLabel}>{t('checkout.shipping')}</Text>
                </View>
                <View style={styles.divider} />
                <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={styles.totalValue}>{total ? formatCurrency(total, currency) : '—'}</Text>
                  <Text style={styles.totalLabel}>{t('cart.total')}</Text>
                </View>
              </View>
            </Animated.View>
          )}

          {step === 2 && (
            <Animated.View entering={FadeInDown.duration(300)}>
              <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('checkout.shippingDetails')}</Text>

              {savedAddresses.length > 0 && (
                <View style={styles.savedAddressSection}>
                  <Text style={[styles.savedAddressLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t('addresses.selectAddress')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                    {savedAddresses.map((addr: any) => (
                      <Pressable
                        key={addr.id}
                        style={[styles.savedAddressChip, selectedAddressId === addr.id && styles.savedAddressChipActive]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setSelectedAddressId(addr.id);
                          applyAddress(addr);
                        }}
                      >
                        <Ionicons name="location" size={14} color={selectedAddressId === addr.id ? colors.primary : colors.textMuted} />
                        <Text style={[styles.savedAddressChipText, selectedAddressId === addr.id && styles.savedAddressChipTextActive]}>
                          {addr.label || `${addr.firstName} ${addr.lastName}`}
                        </Text>
                        {addr.isDefault && (
                          <View style={styles.chipDefaultDot} />
                        )}
                      </Pressable>
                    ))}
                    <Pressable
                      style={[styles.savedAddressChip, !selectedAddressId && styles.savedAddressChipActive]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedAddressId(null);
                        setFirstName(customer?.firstName || '');
                        setLastName(customer?.lastName || '');
                        setPhone(customer?.phone || '');
                        setAddress('');
                        setCity('');
                      }}
                    >
                      <Ionicons name="create-outline" size={14} color={!selectedAddressId ? colors.primary : colors.textMuted} />
                      <Text style={[styles.savedAddressChipText, !selectedAddressId && styles.savedAddressChipTextActive]}>{t('addresses.add')}</Text>
                    </Pressable>
                  </ScrollView>
                </View>
              )}

              <View style={styles.formCard}>
                <View style={[styles.formRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={styles.formField}>
                    <Text style={[styles.formLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t('auth.firstName')} *</Text>
                    <ScrollableInput style={[styles.formInput, { textAlign: isRTL ? 'right' : 'left' }]} value={firstName} onChangeText={setFirstName} placeholder={t('auth.firstName')} placeholderTextColor={colors.textMuted} returnKeyType="next" onSubmitEditing={() => lastNameRef.current?.focus()} />
                  </View>
                  <View style={styles.formField}>
                    <Text style={[styles.formLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t('auth.lastName')} *</Text>
                    <ScrollableInput inputRef={lastNameRef} style={[styles.formInput, { textAlign: isRTL ? 'right' : 'left' }]} value={lastName} onChangeText={setLastName} placeholder={t('auth.lastName')} placeholderTextColor={colors.textMuted} returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} />
                  </View>
                </View>
                <View style={styles.formFieldFull}>
                  <Text style={[styles.formLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t('auth.email')} *</Text>
                  <ScrollableInput inputRef={emailRef} style={[styles.formInput, { textAlign: isRTL ? 'right' : 'left' }]} value={email} onChangeText={setEmail} placeholder={t('auth.email')} placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" returnKeyType="next" onSubmitEditing={() => phoneRef.current?.focus()} />
                </View>
                <View style={styles.formFieldFull}>
                  <Text style={[styles.formLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t('checkout.phone')} *</Text>
                  <ScrollableInput inputRef={phoneRef} style={[styles.formInput, { textAlign: isRTL ? 'right' : 'left' }]} value={phone} onChangeText={setPhone} placeholder="07XXXXXXXX" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" returnKeyType="next" onSubmitEditing={() => addressRef.current?.focus()} />
                </View>
                <Pressable
                  style={({ pressed }) => [styles.locationBtn, { opacity: pressed ? 0.85 : 1, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={detectLocation}
                  disabled={isLocating}
                >
                  {isLocating ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="navigate" size={18} color={colors.primary} />
                  )}
                  <Text style={styles.locationBtnText}>{t('addresses.detectLocation')}</Text>
                </Pressable>
                <View style={styles.formFieldFull}>
                  <Text style={[styles.formLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t('checkout.address')}</Text>
                  <ScrollableInput inputRef={addressRef} style={[styles.formInput, { textAlign: isRTL ? 'right' : 'left' }]} value={address} onChangeText={setAddress} placeholder={t('checkout.addressPlaceholder')} placeholderTextColor={colors.textMuted} returnKeyType="next" onSubmitEditing={() => cityRef.current?.focus()} />
                </View>
                <View style={styles.formFieldFull}>
                  <Text style={[styles.formLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t('checkout.city')}</Text>
                  <ScrollableInput inputRef={cityRef} style={[styles.formInput, { textAlign: isRTL ? 'right' : 'left' }]} value={city} onChangeText={setCity} placeholder={t('checkout.cityPlaceholder')} placeholderTextColor={colors.textMuted} returnKeyType="next" onSubmitEditing={() => notesRef.current?.focus()} />
                </View>
                <View style={styles.formFieldFull}>
                  <Text style={[styles.formLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t('checkout.notes')}</Text>
                  <ScrollableInput inputRef={notesRef} style={[styles.formInput, styles.formTextarea, { textAlign: isRTL ? 'right' : 'left' }]} value={notes} onChangeText={setNotes} placeholder={t('checkout.notesPlaceholder')} placeholderTextColor={colors.textMuted} multiline numberOfLines={3} />
                </View>
              </View>

              <View style={styles.paymentInfoCard}>
                <View style={[styles.paymentInfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={styles.paymentInfoIcon}>
                    <Ionicons name="shield-checkmark" size={22} color="#2E7D32" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.paymentInfoTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('checkout.securePayment')}</Text>
                    <Text style={[styles.paymentInfoDesc, { textAlign: isRTL ? 'right' : 'left' }]}>{t('checkout.autoCompleteDesc')}</Text>
                  </View>
                </View>
                <View style={[styles.paymentMethodsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={styles.methodBadge}>
                    <Ionicons name="cash-outline" size={16} color="#2E7D32" />
                    <Text style={styles.methodBadgeText}>{t('checkout.cod')}</Text>
                  </View>
                  <View style={styles.methodBadge}>
                    <Ionicons name="card-outline" size={16} color="#1565C0" />
                    <Text style={styles.methodBadgeText}>{t('checkout.card')}</Text>
                  </View>
                  <View style={styles.methodBadge}>
                    <Ionicons name="wallet-outline" size={16} color="#7B1FA2" />
                    <Text style={styles.methodBadgeText}>{t('checkout.wallet')}</Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </Pressable>
    </KeyboardAvoidingView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + webBottomInset }]}>
        {step === 1 && (
          <Pressable
            style={({ pressed }) => [styles.continueBtn, { opacity: pressed ? 0.9 : 1 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setStep(2); }}
          >
            <Text style={styles.continueBtnText}>{t('checkout.continueToShipping')}</Text>
            <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={20} color="#fff" />
          </Pressable>
        )}

        {step === 2 && (
          <View style={{ gap: 10 }}>
            <Pressable
              style={({ pressed }) => [styles.continueBtn, styles.checkoutBtn, { opacity: pressed || isProcessing ? 0.8 : 1 }]}
              onPress={handleProceedToPayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.continueBtnText}>{t('checkout.completingOrder')}</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.continueBtnText}>{t('checkout.completeOrder')}</Text>
                </>
              )}
            </Pressable>
            <Pressable style={styles.backStepBtn} onPress={() => setStep(1)}>
              <Text style={styles.backStepText}>{t('checkout.backToReview')}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function getStyles(colors: typeof Colors.dark, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.header },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontFamily: 'Cairo_700Bold', fontSize: 18, color: colors.text },
    stepsRow: { alignItems: 'center', paddingHorizontal: 40, paddingVertical: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    stepItem: { alignItems: 'center', gap: 4 },
    stepCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    stepCircleActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    stepNum: { fontFamily: 'Cairo_700Bold', fontSize: 12, color: colors.textMuted },
    stepNumActive: { color: '#fff' },
    stepLabel: { fontFamily: 'Cairo_400Regular', fontSize: 11, color: colors.textMuted },
    stepLabelActive: { color: colors.primary, fontFamily: 'Cairo_600SemiBold' },
    stepLine: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 8, marginBottom: 16 },
    stepLineActive: { backgroundColor: colors.primary },
    scrollContent: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
    sectionTitle: { fontFamily: 'Cairo_700Bold', fontSize: 17, color: colors.text, marginBottom: 12 },
    orderItem: { backgroundColor: colors.card, borderRadius: 12, padding: 12, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: colors.border },
    orderItemImage: { width: 65, height: 65, borderRadius: 10, overflow: 'hidden', backgroundColor: '#FFFFFF' },
    orderImg: { width: '100%', height: '100%' },
    orderImgPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
    orderItemInfo: { flex: 1, justifyContent: 'center' },
    orderItemName: { fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: colors.text, lineHeight: 20 },
    orderItemVariant: { fontFamily: 'Cairo_400Regular', fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    orderItemBottom: { alignItems: 'center', gap: 8, marginTop: 4 },
    orderItemPrice: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: colors.primary },
    orderItemQty: { fontFamily: 'Cairo_400Regular', fontSize: 12, color: colors.textMuted, backgroundColor: isDark ? colors.surfaceLight : '#f0f0f0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    summaryCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginTop: 12, borderWidth: 1, borderColor: colors.border },
    summaryRow: { justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    summaryLabel: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: colors.textSecondary },
    summaryValue: { fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: colors.text },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
    totalLabel: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: colors.text },
    totalValue: { fontFamily: 'Cairo_700Bold', fontSize: 18, color: colors.primary },
    savedAddressSection: { marginBottom: 4 },
    savedAddressLabel: { fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
    savedAddressChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: colors.border },
    savedAddressChipActive: { borderColor: colors.primary, backgroundColor: isDark ? colors.primary + '20' : '#f0f4ff' },
    savedAddressChipText: { fontFamily: 'Cairo_600SemiBold', fontSize: 12, color: colors.textSecondary },
    savedAddressChipTextActive: { color: colors.primary },
    chipDefaultDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
    locationBtn: { alignItems: 'center', gap: 8, backgroundColor: colors.primary + '12', borderRadius: 10, borderWidth: 1, borderColor: colors.primary + '40', paddingVertical: 12, paddingHorizontal: 16 },
    locationBtnText: { fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: colors.primary },
    formCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 14 },
    formRow: { gap: 12 },
    formField: { flex: 1 },
    formFieldFull: { width: '100%' },
    formLabel: { fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
    formInput: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: colors.text, backgroundColor: isDark ? colors.inputBg : '#f8f9fa', borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10, height: 46 },
    formTextarea: { height: 'auto' as any, minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
    paymentInfoCard: { backgroundColor: isDark ? '#1a2e1a' : '#f0faf0', borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: isDark ? '#2d4a2d' : '#c8e6c9' },
    paymentInfoRow: { alignItems: 'center', gap: 12, marginBottom: 12 },
    paymentInfoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? '#2d4a2d' : '#e8f5e9', alignItems: 'center', justifyContent: 'center' },
    paymentInfoTitle: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: colors.text },
    paymentInfoDesc: { fontFamily: 'Cairo_400Regular', fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    paymentMethodsRow: { gap: 8, flexWrap: 'wrap' },
    methodBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isDark ? colors.card : '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
    methodBadgeText: { fontFamily: 'Cairo_600SemiBold', fontSize: 11, color: colors.text },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 16, paddingTop: 12 },
    continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, gap: 8 },
    checkoutBtn: { backgroundColor: '#2E7D32' },
    continueBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#fff' },
    backStepBtn: { alignItems: 'center', paddingVertical: 8 },
    backStepText: { fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: colors.textSecondary },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyText: { fontFamily: 'Cairo_600SemiBold', fontSize: 16, color: colors.textMuted },
    confirmationContent: { paddingHorizontal: 16, paddingTop: 24, alignItems: 'center' },
    confirmationCard: { backgroundColor: colors.card, borderRadius: 16, padding: 24, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    checkCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#2E7D32', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    confirmedTitle: { fontFamily: 'Cairo_700Bold', fontSize: 22, color: colors.text, marginBottom: 12 },
    orderNumberBadge: { backgroundColor: isDark ? colors.surfaceLight : '#f0f4ff', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 8, alignItems: 'center', marginBottom: 16 },
    orderNumberLabel: { fontFamily: 'Cairo_400Regular', fontSize: 12, color: colors.textSecondary },
    orderNumberValue: { fontFamily: 'Cairo_700Bold', fontSize: 20, color: colors.primary },
    confirmedDesc: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
    confirmDivider: { height: 1, backgroundColor: colors.border, width: '100%', marginVertical: 16 },
    confirmDetails: { width: '100%', gap: 10 },
    confirmRow: { alignItems: 'center', gap: 10 },
    confirmDetailText: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: colors.text, flex: 1 },
    confirmTotalRow: { width: '100%', justifyContent: 'space-between', alignItems: 'center' },
    confirmTotalLabel: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: colors.text },
    confirmTotalValue: { fontFamily: 'Cairo_700Bold', fontSize: 20, color: colors.primary },
    continueShoppingBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, gap: 8, width: '100%', marginTop: 20 },
  });
}
