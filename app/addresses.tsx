import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  TextInput, ActivityIndicator, Alert, Modal, Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import PageBackground from '@/components/PageBackground';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';

interface Address {
  id: string;
  customerEmail: string;
  label: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  address: string | null;
  city: string | null;
  country: string | null;
  isDefault: boolean;
  source?: 'local' | 'shopify';
}

export default function AddressesScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useLanguage();
  const { customer, token } = useAuth();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [label, setLabel] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const [isLocating, setIsLocating] = useState(false);

  const lastNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);

  const styles = getStyles(colors, isDark);

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

  const loadAddresses = async () => {
    if (!customer?.email) return;
    try {
      const data = await api.getAddresses(customer.email, token || undefined);
      setAddresses(data);
    } catch (err) {
      console.error('Failed to load addresses:', err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadAddresses();
  }, [customer?.email]);

  const resetForm = () => {
    setLabel('');
    setFirstName(customer?.firstName || '');
    setLastName(customer?.lastName || '');
    setPhone(customer?.phone || '');
    setPhoneError('');
    setAddress('');
    setCity('');
    setIsDefault(addresses.length === 0);
    setEditingAddress(null);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (addr: Address) => {
    setEditingAddress(addr);
    setLabel(addr.label || '');
    setFirstName(addr.firstName);
    setLastName(addr.lastName);
    setPhone(addr.phone);
    setPhoneError('');
    setAddress(addr.address || '');
    setCity(addr.city || '');
    setIsDefault(addr.isDefault);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert(t('addresses.error'), t('addresses.fillRequired'));
      return;
    }
    const phoneClean = phone.trim().replace(/\s/g, '').replace(/-/g, '');
    if (!phoneClean) {
      setPhoneError(isRTL ? 'رقم الهاتف مطلوب' : 'Phone number is required');
      return;
    }
    if (!/^07\d{8}$/.test(phoneClean)) {
      setPhoneError(isRTL ? 'رقم الهاتف يجب أن يكون 10 أرقام ويبدأ بـ 07' : 'Phone must be 10 digits and start with 07');
      return;
    }
    setPhoneError('');
    setIsSaving(true);
    try {
      if (editingAddress) {
        await api.updateAddress(editingAddress.id, {
          email: customer?.email,
          label: label.trim() || undefined,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          isDefault,
        }, token || undefined);
      } else {
        await api.addAddress({
          email: customer?.email || '',
          label: label.trim() || undefined,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          isDefault,
        }, token || undefined);
      }
      setShowForm(false);
      await loadAddresses();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert(t('addresses.error'), err.message || t('addresses.saveError'));
    }
    setIsSaving(false);
  };

  const handleDelete = (addr: Address) => {
    Alert.alert(
      t('addresses.deleteTitle'),
      t('addresses.deleteConfirm'),
      [
        { text: t('addresses.cancel'), style: 'cancel' },
        {
          text: t('addresses.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteAddress(addr.id, token || undefined);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await loadAddresses();
            } catch {}
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <PageBackground isDark={isDark} />
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('addresses.title')}</Text>
        <Pressable onPress={openAddForm} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="location-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyText}>{t('addresses.empty')}</Text>
          <Pressable
            style={({ pressed }) => [styles.addFirstBtn, { opacity: pressed ? 0.9 : 1 }]}
            onPress={openAddForm}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.addFirstBtnText}>{t('addresses.addFirst')}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 + webBottomInset }}
          showsVerticalScrollIndicator={false}
        >
          {addresses.map((addr) => (
            <Pressable
              key={addr.id}
              onPress={() => openEditForm(addr)}
              style={({ pressed }) => [styles.addressCard, addr.isDefault && styles.addressCardDefault, { opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={[styles.cardTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1 }}>
                  <View style={[styles.labelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {addr.label && <Text style={[styles.labelText, { textAlign: isRTL ? 'right' : 'left' }]}>{addr.label}</Text>}
                    {addr.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>{t('addresses.default')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.nameText, { textAlign: isRTL ? 'right' : 'left' }]}>{addr.firstName} {addr.lastName}</Text>
                </View>
                <Pressable
                  onPress={(e) => { e.stopPropagation(); handleDelete(addr); }}
                  hitSlop={10}
                  style={styles.actionBtn}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </Pressable>
              </View>
              <View style={styles.cardDetails}>
                <View style={[styles.detailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="call-outline" size={15} color={colors.textSecondary} />
                  <Text style={styles.detailText}>{addr.phone}</Text>
                </View>
                {addr.address && (
                  <View style={[styles.detailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
                    <Text style={[styles.detailText, { textAlign: isRTL ? 'right' : 'left' }]}>{addr.address}{addr.city ? `, ${addr.city}` : ''}</Text>
                  </View>
                )}
              </View>
              <View style={[styles.editHint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="create-outline" size={14} color={colors.primary} />
                <Text style={styles.editHintText}>{isRTL ? 'اضغط للتعديل' : 'Tap to edit'}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Modal visible={showForm} animationType="slide" transparent={false}>
        <View style={[styles.fullScreenModal, { paddingTop: insets.top + webTopInset }]}>
          <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Pressable onPress={() => setShowForm(false)} style={styles.closeBtn}>
              <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {editingAddress ? t('addresses.edit') : t('addresses.add')}
            </Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, paddingBottom: Math.max(insets.bottom, 16) + webBottomInset + 20 }}
            onScrollBeginDrag={() => { if (Platform.OS !== 'web') Keyboard.dismiss(); }}
          >
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t('addresses.label')}</Text>
              <TextInput
                style={[styles.formInput, { textAlign: isRTL ? 'right' : 'left' }]}
                value={label}
                onChangeText={setLabel}
                placeholder={t('addresses.labelPlaceholder')}
                placeholderTextColor={colors.textMuted}
                returnKeyType="next"
              />
            </View>
            <View style={[styles.formRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.formHalf}>
                <Text style={[styles.formLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t('auth.firstName')} *</Text>
                <TextInput
                  style={[styles.formInput, { textAlign: isRTL ? 'right' : 'left' }]}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder={t('auth.firstName')}
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="next"
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                />
              </View>
              <View style={styles.formHalf}>
                <Text style={[styles.formLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t('auth.lastName')} *</Text>
                <TextInput
                  ref={lastNameRef}
                  style={[styles.formInput, { textAlign: isRTL ? 'right' : 'left' }]}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder={t('auth.lastName')}
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t('checkout.phone')} *</Text>
              <TextInput
                ref={phoneRef}
                style={[styles.formInput, { textAlign: isRTL ? 'right' : 'left' }, phoneError ? { borderColor: '#E53935', borderWidth: 1.5 } : {}]}
                value={phone}
                onChangeText={(v: string) => { setPhone(v); if (phoneError) setPhoneError(''); }}
                placeholder="07XXXXXXXX"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                returnKeyType="next"
                maxLength={10}
                onSubmitEditing={() => addressRef.current?.focus()}
              />
              {!!phoneError && (
                <Text style={{ color: '#E53935', fontSize: 12, fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left', marginTop: 4 }}>
                  {phoneError}
                </Text>
              )}
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

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t('checkout.address')}</Text>
              <TextInput
                ref={addressRef}
                style={[styles.formInput, { textAlign: isRTL ? 'right' : 'left' }]}
                value={address}
                onChangeText={setAddress}
                placeholder={t('checkout.addressPlaceholder')}
                placeholderTextColor={colors.textMuted}
                returnKeyType="next"
                onSubmitEditing={() => cityRef.current?.focus()}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t('checkout.city')}</Text>
              <TextInput
                ref={cityRef}
                style={[styles.formInput, { textAlign: isRTL ? 'right' : 'left' }]}
                value={city}
                onChangeText={setCity}
                placeholder={t('checkout.cityPlaceholder')}
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <Pressable
              style={[styles.defaultToggle, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => setIsDefault(!isDefault)}
            >
              <Ionicons
                name={isDefault ? "checkbox" : "square-outline"}
                size={22}
                color={isDefault ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.defaultToggleText, { textAlign: isRTL ? 'right' : 'left' }]}>{t('addresses.setDefault')}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.saveBtn, { opacity: pressed || isSaving ? 0.8 : 1 }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>{t('addresses.save')}</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function getStyles(colors: typeof Colors.dark, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.header },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontFamily: 'Cairo_700Bold', fontSize: 18, color: colors.text },
    addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceLight },
    centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
    emptyText: { fontFamily: 'Cairo_600SemiBold', fontSize: 16, color: colors.textMuted, textAlign: 'center' },
    addFirstBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
    addFirstBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: '#fff' },
    addressCard: { backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    addressCardDefault: { borderColor: colors.primary, borderWidth: 1.5 },
    cardTop: { alignItems: 'flex-start', marginBottom: 10 },
    labelRow: { alignItems: 'center', gap: 8, marginBottom: 4 },
    labelText: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: colors.primary },
    defaultBadge: { backgroundColor: colors.primary + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    defaultBadgeText: { fontFamily: 'Cairo_600SemiBold', fontSize: 10, color: colors.primary },
    nameText: { fontFamily: 'Cairo_600SemiBold', fontSize: 15, color: colors.text },
    actionBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
    cardDetails: { gap: 6 },
    detailRow: { alignItems: 'center', gap: 8 },
    detailText: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: colors.textSecondary, flex: 1 },
    editHint: { alignItems: 'center', gap: 4, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
    editHintText: { fontFamily: 'Cairo_400Regular', fontSize: 11, color: colors.primary },
    fullScreenModal: { flex: 1, backgroundColor: colors.background },
    modalHeader: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.header },
    modalTitle: { fontFamily: 'Cairo_700Bold', fontSize: 18, color: colors.text, flex: 1 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
    formGroup: { marginBottom: 14 },
    formRow: { gap: 12, marginBottom: 14 },
    formHalf: { flex: 1 },
    formLabel: { fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
    formInput: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: colors.text, backgroundColor: isDark ? colors.inputBg : '#f8f9fa', borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10, height: 46 },
    locationBtn: { alignItems: 'center', gap: 8, backgroundColor: colors.primary + '12', borderRadius: 10, borderWidth: 1, borderColor: colors.primary + '40', paddingVertical: 12, paddingHorizontal: 16, marginBottom: 14 },
    locationBtnText: { fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: colors.primary },
    defaultToggle: { alignItems: 'center', gap: 10, paddingVertical: 12 },
    defaultToggleText: { fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: colors.text },
    saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
    saveBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#fff' },
  });
}
