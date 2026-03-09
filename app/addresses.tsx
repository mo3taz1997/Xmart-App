import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, ScrollView,
  TextInput, ActivityIndicator, Modal, RefreshControl,
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
import Toast from '@/components/Toast';

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
  const [settingDefault, setSettingDefault] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmAddr, setDeleteConfirmAddr] = useState<Address | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address1, setAddress1] = useState('');
  const [city, setCity] = useState('');
  const [company, setCompany] = useState('');

  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('error');
  const [toastVisible, setToastVisible] = useState(false);
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'error') => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
  };

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
      showToast(
        language === 'ar' ? 'يرجى تعبئة الحقول المطلوبة' : 'Please fill required fields',
        'error'
      );
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
      showToast(
        editingAddress
          ? (language === 'ar' ? 'تم تحديث العنوان بنجاح' : 'Address updated successfully')
          : (language === 'ar' ? 'تم إضافة العنوان بنجاح' : 'Address added successfully'),
        'success'
      );
      setShowForm(false);
      loadAddresses();
    } catch (e: any) {
      showToast(
        language === 'ar' ? 'حدث خطأ في حفظ العنوان' : 'Failed to save address',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (addr: Address) => {
    if (addr.isDefault) {
      showToast(
        language === 'ar'
          ? 'لا يمكن حذف العنوان الافتراضي. قم بتعيين عنوان آخر كافتراضي أولاً'
          : 'Cannot delete default address. Set another address as default first',
        'info'
      );
      return;
    }
    setDeleteConfirmAddr(addr);
  };

  const confirmDelete = async () => {
    if (!token || !deleteConfirmAddr) return;
    setDeletingId(deleteConfirmAddr.id);
    setDeleteConfirmAddr(null);
    try {
      await api.deleteCustomerAddress(token, deleteConfirmAddr.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(
        language === 'ar' ? 'تم حذف العنوان' : 'Address deleted',
        'success'
      );
      loadAddresses();
    } catch (e: any) {
      showToast(
        language === 'ar' ? 'حدث خطأ في حذف العنوان' : 'Failed to delete address',
        'error'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (addr: Address) => {
    if (!token || addr.isDefault) return;
    setSettingDefault(addr.id);
    try {
      await api.setDefaultAddress(token, addr.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(
        language === 'ar' ? 'تم تعيين العنوان كافتراضي' : 'Default address updated',
        'success'
      );
      loadAddresses();
    } catch (e: any) {
      showToast(
        language === 'ar' ? 'حدث خطأ في تعيين العنوان الافتراضي' : 'Failed to set default address',
        'error'
      );
    } finally {
      setSettingDefault(null);
    }
  };

  const detectLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast(
          language === 'ar' ? 'لم يتم السماح بالوصول للموقع' : 'Location permission denied',
          'error'
        );
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
      showToast(
        language === 'ar' ? 'تم تحديد الموقع' : 'Location detected',
        'success'
      );
    } catch {
      showToast(
        language === 'ar' ? 'حدث خطأ في تحديد الموقع' : 'Failed to detect location',
        'error'
      );
    } finally {
      setIsLocating(false);
    }
  };

  const styles = getStyles(colors, isDark);

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <PageBackground isDark={isDark} />
      <Toast
        message={toastMsg}
        type={toastType}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'left', color: colors.text }]}>{t('addresses.title')}</Text>
        <Pressable onPress={openAddForm} style={[styles.addHeaderBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="add" size={20} color="#fff" />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="location-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {language === 'ar' ? 'لا توجد عناوين محفوظة' : 'No saved addresses'}
          </Text>
          <Pressable onPress={openAddForm} style={[styles.addFirstBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addFirstBtnText}>
              {language === 'ar' ? 'إضافة عنوان' : 'Add Address'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {addresses.map((addr) => (
            <View key={addr.id} style={[styles.card, {
              backgroundColor: colors.card,
              borderColor: addr.isDefault ? colors.primary : colors.border,
              borderWidth: addr.isDefault ? 2 : 1,
            }]}>
              <View style={[styles.cardTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.cardIcon, { backgroundColor: addr.isDefault ? colors.primary + '15' : (isDark ? 'rgba(255,255,255,0.08)' : '#f5f5f5') }]}>
                  <Ionicons name={addr.isDefault ? "location" : "location-outline"} size={22} color={addr.isDefault ? colors.primary : colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }]}>
                    <Text style={[styles.cardName, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                      {addr.firstName} {addr.lastName}
                    </Text>
                    {addr.isDefault && (
                      <View style={[styles.defaultBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.defaultBadgeText}>
                          {language === 'ar' ? 'افتراضي' : 'Default'}
                        </Text>
                      </View>
                    )}
                  </View>
                  {addr.company ? (
                    <Text style={[styles.cardDetail, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{addr.company}</Text>
                  ) : null}
                  <Text style={[styles.cardDetail, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{addr.phone}</Text>
                  {addr.address1 ? (
                    <Text style={[styles.cardDetail, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{addr.address1}{addr.city ? `, ${addr.city}` : ''}</Text>
                  ) : addr.city ? (
                    <Text style={[styles.cardDetail, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{addr.city}</Text>
                  ) : null}
                </View>
              </View>

              <View style={[styles.cardActions, { flexDirection: isRTL ? 'row-reverse' : 'row', borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f0' }]}>
                {!addr.isDefault && (
                  <Pressable
                    onPress={() => handleSetDefault(addr)}
                    style={[styles.defaultAction, { backgroundColor: colors.primary + '12', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    disabled={settingDefault === addr.id}
                  >
                    {settingDefault === addr.id ? (
                      <ActivityIndicator size={14} color={colors.primary} />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                        <Text style={[styles.defaultActionText, { color: colors.primary }]}>
                          {language === 'ar' ? 'تعيين افتراضي' : 'Set Default'}
                        </Text>
                      </>
                    )}
                  </Pressable>
                )}
                <Pressable
                  onPress={() => openEditForm(addr)}
                  style={[styles.iconAction, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f5f5f5' }]}
                >
                  <Ionicons name="create-outline" size={18} color={colors.text} />
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(addr)}
                  style={[styles.iconAction, { backgroundColor: addr.isDefault ? (isDark ? 'rgba(255,255,255,0.04)' : '#fafafa') : '#FFEBEE' }]}
                  disabled={deletingId === addr.id}
                >
                  {deletingId === addr.id ? (
                    <ActivityIndicator size={16} color="#E53935" />
                  ) : (
                    <Ionicons name="trash-outline" size={18} color={addr.isDefault ? colors.textMuted : '#E53935'} />
                  )}
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
              {editingAddress
                ? (language === 'ar' ? 'تعديل العنوان' : 'Edit Address')
                : (language === 'ar' ? 'إضافة عنوان' : 'Add Address')}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left', color: colors.textSecondary }]}>
                {language === 'ar' ? 'التسمية (اختياري)' : 'Label (optional)'}
              </Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fafafa', textAlign: isRTL ? 'right' : 'left' }]}
                value={company}
                onChangeText={setCompany}
                placeholder={language === 'ar' ? 'مثال: المنزل، العمل' : 'e.g. Home, Work'}
                placeholderTextColor={colors.textMuted}
              />

              <View style={[styles.formRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left', color: colors.textSecondary }]}>
                    {language === 'ar' ? 'الاسم الأول' : 'First Name'} *
                  </Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fafafa', textAlign: isRTL ? 'right' : 'left' }]}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder={language === 'ar' ? 'الاسم الأول' : 'First Name'}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left', color: colors.textSecondary }]}>
                    {language === 'ar' ? 'الاسم الأخير' : 'Last Name'} *
                  </Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fafafa', textAlign: isRTL ? 'right' : 'left' }]}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder={language === 'ar' ? 'الاسم الأخير' : 'Last Name'}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left', color: colors.textSecondary }]}>
                {language === 'ar' ? 'رقم الهاتف' : 'Phone'} *
              </Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fafafa', textAlign: isRTL ? 'right' : 'left' }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="07XXXXXXXX"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
              />

              <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left', color: colors.textSecondary }]}>
                {language === 'ar' ? 'العنوان' : 'Address'}
              </Text>
              <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8 }]}>
                <TextInput
                  style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fafafa', textAlign: isRTL ? 'right' : 'left' }]}
                  value={address1}
                  onChangeText={setAddress1}
                  placeholder={language === 'ar' ? 'الشارع، الحي' : 'Street, Area'}
                  placeholderTextColor={colors.textMuted}
                />
                <Pressable onPress={detectLocation} style={[styles.locationBtn, { backgroundColor: colors.primary }]} disabled={isLocating}>
                  {isLocating ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="navigate" size={20} color="#fff" />}
                </Pressable>
              </View>

              <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left', color: colors.textSecondary }]}>
                {language === 'ar' ? 'المدينة' : 'City'}
              </Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fafafa', textAlign: isRTL ? 'right' : 'left' }]}
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
                <Text style={styles.saveBtnText}>
                  {editingAddress
                    ? (language === 'ar' ? 'حفظ التعديلات' : 'Save Changes')
                    : (language === 'ar' ? 'إضافة العنوان' : 'Add Address')}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={!!deleteConfirmAddr} transparent animationType="fade" onRequestClose={() => setDeleteConfirmAddr(null)}>
        <Pressable style={styles.overlay} onPress={() => setDeleteConfirmAddr(null)}>
          <Pressable style={[styles.confirmSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={[styles.confirmIconWrap, { backgroundColor: '#FFF1F0' }]}>
              <Ionicons name="trash-outline" size={32} color="#E53935" />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>
              {language === 'ar' ? 'حذف العنوان' : 'Delete Address'}
            </Text>
            <Text style={[styles.confirmDesc, { color: colors.textSecondary }]}>
              {deleteConfirmAddr ? (
                language === 'ar'
                  ? `هل أنت متأكد من حذف عنوان "${deleteConfirmAddr.firstName} ${deleteConfirmAddr.lastName}"؟ لا يمكن التراجع عن هذا الإجراء.`
                  : `Are you sure you want to delete "${deleteConfirmAddr.firstName} ${deleteConfirmAddr.lastName}"? This action cannot be undone.`
              ) : ''}
            </Text>
            <View style={styles.confirmBtns}>
              <Pressable
                onPress={() => setDeleteConfirmAddr(null)}
                style={[styles.confirmCancelBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f5f5f5' }]}
              >
                <Text style={[styles.confirmCancelText, { color: colors.text }]}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Text>
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                style={styles.confirmDeleteBtn}
              >
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={styles.confirmDeleteText}>
                  {language === 'ar' ? 'حذف' : 'Delete'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontFamily: 'Cairo_700Bold', fontSize: 18 },
  addHeaderBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyText: { fontFamily: 'Cairo_600SemiBold', fontSize: 16, textAlign: 'center' },
  addFirstBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  addFirstBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: '#fff' },
  list: { flex: 1, paddingHorizontal: 16 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTop: { gap: 12, alignItems: 'flex-start' },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontFamily: 'Cairo_700Bold', fontSize: 15, flexShrink: 1 },
  cardDetail: { fontFamily: 'Cairo_400Regular', fontSize: 13, marginTop: 2 },
  defaultBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  defaultBadgeText: { fontFamily: 'Cairo_600SemiBold', fontSize: 10, color: '#fff' },
  cardActions: { marginTop: 14, gap: 10, borderTopWidth: 1, paddingTop: 12 },
  iconAction: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  defaultAction: { height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, gap: 5 },
  defaultActionText: { fontFamily: 'Cairo_600SemiBold', fontSize: 12 },
  modalContainer: { flex: 1 },
  modalHeader: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  formScroll: { flex: 1 },
  formCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  formRow: { gap: 12 },
  label: { fontFamily: 'Cairo_600SemiBold', fontSize: 13 },
  input: { fontFamily: 'Cairo_400Regular', fontSize: 14, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44 },
  locationBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#fff' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  confirmSheet: { width: '100%', maxWidth: 340, borderRadius: 20, padding: 24, alignItems: 'center' },
  confirmIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  confirmTitle: { fontFamily: 'Cairo_700Bold', fontSize: 18, marginBottom: 8, textAlign: 'center' },
  confirmDesc: { fontFamily: 'Cairo_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  confirmBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmCancelBtn: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  confirmCancelText: { fontFamily: 'Cairo_600SemiBold', fontSize: 15 },
  confirmDeleteBtn: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E53935', flexDirection: 'row', gap: 6 },
  confirmDeleteText: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: '#fff' },
});
