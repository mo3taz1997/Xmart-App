import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, ScrollView,
  TextInput, ActivityIndicator, Alert, Modal, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import PageBackground from '@/components/PageBackground';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

interface Address {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  country?: string;
  company?: string;
  isDefault: boolean;
}

export default function AddressesScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t, isRTL, language } = useLanguage();
  const { token } = useAuth();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [saving, setSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address1, setAddress1] = useState('');
  const [city, setCity] = useState('');
  const [company, setCompany] = useState('');

  const loadAddresses = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await api.getCustomerAddresses(token);
      setAddresses(data);
    } catch (e: any) {
      console.error("Failed to load addresses:", e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAddresses();
  };

  const openAddForm = () => {
    setEditingAddress(null);
    setFirstName('');
    setLastName('');
    setPhone('');
    setAddress1('');
    setCity('');
    setCompany('');
    setShowForm(true);
  };

  const openEditForm = (addr: Address) => {
    setEditingAddress(addr);
    setFirstName(addr.firstName);
    setLastName(addr.lastName);
    let displayPhone = addr.phone || '';
    if (displayPhone.startsWith('+962')) {
      displayPhone = '0' + displayPhone.substring(4);
    }
    setPhone(displayPhone);
    setAddress1(addr.address1);
    setCity(addr.city);
    setCompany(addr.company || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!token) return;
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      Alert.alert(t('addresses.error'), t('addresses.fillRequired'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        address1: address1.trim(),
        city: city.trim(),
        company: company.trim(),
      };
      if (editingAddress) {
        await api.updateCustomerAddress(token, editingAddress.id, payload);
      } else {
        await api.createCustomerAddress(token, payload);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowForm(false);
      loadAddresses();
    } catch (e: any) {
      Alert.alert(t('addresses.error'), t('addresses.saveError'));
    } finally {
      setSaving(false);
    }
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
            if (!token) return;
            try {
              await api.deleteCustomerAddress(token, addr.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              loadAddresses();
            } catch (e: any) {
              Alert.alert(t('addresses.error'), e.message);
            }
          },
        },
      ],
    );
  };

  const handleSetDefault = async (addr: Address) => {
    if (!token || addr.isDefault) return;
    try {
      await api.setDefaultAddress(token, addr.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadAddresses();
    } catch (e: any) {
      Alert.alert(t('addresses.error'), e.message);
    }
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
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (geo) {
        const parts = [geo.street, geo.district, geo.subregion].filter(Boolean);
        if (parts.length) setAddress1(parts.join(', '));
        if (geo.city) setCity(geo.city);
      }
    } catch {
      Alert.alert(t('addresses.error'), t('addresses.locationError'));
    } finally {
      setIsLocating(false);
    }
  };

  const styles = getStyles(colors, isDark);

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <PageBackground isDark={isDark} />
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'left', color: colors.text }]}>{t('addresses.title')}</Text>
        <Pressable onPress={openAddForm} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="location-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('addresses.empty')}</Text>
          <Pressable onPress={openAddForm} style={[styles.addFirstBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addFirstBtnText}>{t('addresses.addFirst')}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {addresses.map((addr) => (
            <View key={addr.id} style={[styles.card, { backgroundColor: colors.card, borderColor: addr.isDefault ? colors.primary : colors.border }]}>
              <View style={[styles.cardTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1 }}>
                  <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }]}>
                    <Text style={[styles.cardName, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                      {addr.firstName} {addr.lastName}
                    </Text>
                    {addr.isDefault && (
                      <View style={[styles.defaultBadge, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.defaultBadgeText, { color: colors.primary }]}>{t('addresses.default')}</Text>
                      </View>
                    )}
                  </View>
                  {addr.company ? (
                    <Text style={[styles.cardDetail, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{addr.company}</Text>
                  ) : null}
                  <Text style={[styles.cardDetail, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{addr.phone}</Text>
                  {addr.address1 ? (
                    <Text style={[styles.cardDetail, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{addr.address1}</Text>
                  ) : null}
                  {addr.city ? (
                    <Text style={[styles.cardDetail, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{addr.city}</Text>
                  ) : null}
                </View>
              </View>
              <View style={[styles.cardActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {!addr.isDefault && (
                  <Pressable onPress={() => handleSetDefault(addr)} style={[styles.actionBtn, { borderColor: colors.border }]}>
                    <Ionicons name="star-outline" size={16} color={colors.primary} />
                    <Text style={[styles.actionText, { color: colors.primary }]}>{t('addresses.setDefault')}</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => openEditForm(addr)} style={[styles.actionBtn, { borderColor: colors.border }]}>
                  <Ionicons name="create-outline" size={16} color={colors.text} />
                  <Text style={[styles.actionText, { color: colors.text }]}>{t('addresses.edit')}</Text>
                </Pressable>
                <Pressable onPress={() => handleDelete(addr)} style={[styles.actionBtn, { borderColor: colors.border }]}>
                  <Ionicons name="trash-outline" size={16} color="#E53935" />
                  <Text style={[styles.actionText, { color: '#E53935' }]}>{t('addresses.delete')}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={showForm} animationType="slide" transparent={false} onRequestClose={() => setShowForm(false)}>
        <View style={[styles.modalContainer, { paddingTop: insets.top + webTopInset, backgroundColor: colors.background }]}>
          <PageBackground isDark={isDark} />
          <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Pressable onPress={() => setShowForm(false)} style={styles.backBtn}>
              <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'left', color: colors.text }]}>
              {editingAddress ? t('addresses.edit') : t('addresses.add')}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left', color: colors.text }]}>{t('addresses.label')}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
                value={company}
                onChangeText={setCompany}
                placeholder={t('addresses.labelPlaceholder')}
                placeholderTextColor={colors.textMuted}
              />

              <View style={[styles.formRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left', color: colors.text }]}>{t('auth.firstName')} *</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder={t('auth.firstName')}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left', color: colors.text }]}>{t('auth.lastName')} *</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder={t('auth.lastName')}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left', color: colors.text }]}>{t('checkout.phone')} *</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="07XXXXXXXX"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
              />

              <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left', color: colors.text }]}>{t('checkout.address')}</Text>
              <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8 }]}>
                <TextInput
                  style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
                  value={address1}
                  onChangeText={setAddress1}
                  placeholder={t('checkout.addressPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                />
                <Pressable onPress={detectLocation} style={[styles.locationBtn, { backgroundColor: colors.primary }]} disabled={isLocating}>
                  {isLocating ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="navigate" size={20} color="#fff" />}
                </Pressable>
              </View>

              <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left', color: colors.text }]}>{t('checkout.city')}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
                value={city}
                onChangeText={setCity}
                placeholder={language === 'ar' ? 'المدينة' : 'City'}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
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

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontFamily: 'Cairo_700Bold', fontSize: 18 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  emptyText: { fontFamily: 'Cairo_600SemiBold', fontSize: 16, textAlign: 'center' },
  addFirstBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  addFirstBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: '#fff' },
  list: { flex: 1, paddingHorizontal: 16 },
  card: { borderRadius: 14, borderWidth: 1.5, padding: 16, marginBottom: 12 },
  cardTop: { gap: 12 },
  cardName: { fontFamily: 'Cairo_700Bold', fontSize: 16 },
  cardDetail: { fontFamily: 'Cairo_400Regular', fontSize: 13, marginTop: 2 },
  defaultBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  defaultBadgeText: { fontFamily: 'Cairo_600SemiBold', fontSize: 11 },
  cardActions: { marginTop: 12, gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  actionText: { fontFamily: 'Cairo_600SemiBold', fontSize: 12 },
  modalContainer: { flex: 1 },
  modalHeader: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  formScroll: { flex: 1 },
  formCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  formRow: { gap: 12 },
  label: { fontFamily: 'Cairo_600SemiBold', fontSize: 13 },
  input: { fontFamily: 'Cairo_400Regular', fontSize: 14, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44 },
  locationBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#fff' },
});
