import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import PageBackground from '@/components/PageBackground';

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const { customer, updateCustomer, refreshCustomer, deleteAccount } = useAuth();
  const { isRTL, language } = useLanguage();
  const { colors, isDark } = useTheme();

  const [firstName, setFirstName] = useState(customer?.firstName || '');
  const [lastName, setLastName] = useState(customer?.lastName || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (customer) {
      setFirstName(customer.firstName || '');
      setLastName(customer.lastName || '');
      setEmail(customer.email || '');
    }
  }, [customer?.id]);

  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const hasProfileChanges = (
    firstName !== (customer?.firstName || '') ||
    lastName !== (customer?.lastName || '') ||
    email !== (customer?.email || '')
  );

  const saveProfile = async () => {
    if (!hasProfileChanges) return;
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const updates: Record<string, string> = {};
      if (firstName !== (customer?.firstName || '')) updates.firstName = firstName.trim();
      if (lastName !== (customer?.lastName || '')) updates.lastName = lastName.trim();
      if (email !== (customer?.email || '')) updates.email = email.trim();
      await updateCustomer(updates);
      await refreshCustomer();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setProfileMsg({ type: 'success', text: t('تم تحديث البيانات بنجاح', 'Profile updated successfully') });
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = (err?.message || '').toUpperCase();
      console.log('[AccountUpdate] Error:', err?.message);
      if (msg.includes('TAKEN')) {
        setProfileMsg({ type: 'error', text: t('البريد الإلكتروني مستخدم بالفعل', 'Email is already taken') });
      } else if (msg.includes('INVALID')) {
        setProfileMsg({ type: 'error', text: t('بيانات غير صالحة، تأكد من المدخلات', 'Invalid data, please check your inputs') });
      } else if (msg.includes('TOKEN') || msg.includes('UNAUTHORIZED')) {
        setProfileMsg({ type: 'error', text: t('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجددًا', 'Session expired, please log in again') });
      } else {
        setProfileMsg({ type: 'error', text: t('حدث خطأ، حاول مجددًا', 'Something went wrong, try again') });
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    setPasswordMsg(null);
    if (!newPassword || newPassword.length < 5) {
      setPasswordMsg({ type: 'error', text: t('كلمة المرور يجب أن تكون 5 أحرف على الأقل', 'Password must be at least 5 characters') });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: t('كلمات المرور غير متطابقة', 'Passwords do not match') });
      return;
    }
    setSavingPassword(true);
    try {
      await updateCustomer({ password: newPassword });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg({ type: 'success', text: t('تم تغيير كلمة المرور بنجاح', 'Password changed successfully') });
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPasswordMsg({ type: 'error', text: t('فشل تغيير كلمة المرور', 'Failed to change password') });
    } finally {
      setSavingPassword(false);
    }
  };

  const textAlign = isRTL ? 'right' as const : 'left' as const;
  const writingDirection = isRTL ? 'rtl' as const : 'ltr' as const;
  const flexDir = isRTL ? 'row-reverse' as const : 'row' as const;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + webTopInset }]}>
      <PageBackground isDark={isDark} />
      <View style={[styles.header, { flexDirection: flexDir, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text, textAlign, writingDirection }]} numberOfLines={1}>
          {t('حسابي', 'My Account')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <Pressable style={{ flex: 1 }} onPress={() => { if (Platform.OS !== 'web') Keyboard.dismiss(); }}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, textAlign, writingDirection }]}>
                {t('المعلومات الشخصية', 'Personal Information')}
              </Text>

              <View style={{ gap: 12 }}>
                <View style={[styles.fieldRow, { flexDirection: flexDir }]}>
                  <View style={styles.fieldHalf}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary, textAlign, writingDirection }]}>
                      {t('الاسم الأول', 'First Name')}
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surfaceLight, color: colors.text, textAlign, writingDirection, borderColor: colors.border }]}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={styles.fieldHalf}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary, textAlign, writingDirection }]}>
                      {t('اسم العائلة', 'Last Name')}
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surfaceLight, color: colors.text, textAlign, writingDirection, borderColor: colors.border }]}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                <View>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary, textAlign, writingDirection }]}>
                    {t('البريد الإلكتروني', 'Email')}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surfaceLight, color: colors.text, textAlign, writingDirection, borderColor: colors.border }]}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              {profileMsg && (
                <View style={[styles.msgBox, { backgroundColor: profileMsg.type === 'success' ? '#4CAF5015' : '#F4433615' }]}>
                  <Ionicons
                    name={profileMsg.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                    size={18}
                    color={profileMsg.type === 'success' ? '#4CAF50' : '#F44336'}
                  />
                  <Text style={[styles.msgText, { color: profileMsg.type === 'success' ? '#4CAF50' : '#F44336', textAlign, writingDirection }]}>
                    {profileMsg.text}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={saveProfile}
                disabled={!hasProfileChanges || savingProfile}
                style={({ pressed }) => [
                  styles.saveBtn,
                  {
                    backgroundColor: hasProfileChanges ? colors.primary : colors.textMuted + '30',
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{t('حفظ التغييرات', 'Save Changes')}</Text>
                )}
              </Pressable>
            </View>

            <View style={[styles.section, { backgroundColor: colors.card, marginTop: 16 }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, textAlign, writingDirection }]}>
                {t('تغيير كلمة المرور', 'Change Password')}
              </Text>

              <View style={{ gap: 12 }}>
                <View>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary, textAlign, writingDirection }]}>
                    {t('كلمة المرور الجديدة', 'New Password')}
                  </Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surfaceLight, color: colors.text, textAlign, writingDirection, borderColor: colors.border, paddingRight: isRTL ? 16 : 44, paddingLeft: isRTL ? 44 : 16 }]}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                      placeholder={t('أدخل كلمة المرور الجديدة', 'Enter new password')}
                      placeholderTextColor={colors.textMuted}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      style={[styles.eyeBtn, isRTL ? { left: 12 } : { right: 12 }]}
                    >
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                    </Pressable>
                  </View>
                </View>

                <View>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary, textAlign, writingDirection }]}>
                    {t('تأكيد كلمة المرور', 'Confirm Password')}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surfaceLight, color: colors.text, textAlign, writingDirection, borderColor: colors.border }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    placeholder={t('أعد إدخال كلمة المرور', 'Re-enter password')}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              {passwordMsg && (
                <View style={[styles.msgBox, { backgroundColor: passwordMsg.type === 'success' ? '#4CAF5015' : '#F4433615' }]}>
                  <Ionicons
                    name={passwordMsg.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                    size={18}
                    color={passwordMsg.type === 'success' ? '#4CAF50' : '#F44336'}
                  />
                  <Text style={[styles.msgText, { color: passwordMsg.type === 'success' ? '#4CAF50' : '#F44336', textAlign, writingDirection }]}>
                    {passwordMsg.text}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={savePassword}
                disabled={!newPassword || savingPassword}
                style={({ pressed }) => [
                  styles.saveBtn,
                  {
                    backgroundColor: newPassword ? colors.primary : colors.textMuted + '30',
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                {savingPassword ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{t('تغيير كلمة المرور', 'Change Password')}</Text>
                )}
              </Pressable>
            </View>

            <View style={[styles.section, { backgroundColor: colors.card, marginTop: 16 }]}>
              <Text style={[styles.sectionTitle, { color: '#F44336', textAlign, writingDirection }]}>
                {t('حذف الحساب', 'Delete Account')}
              </Text>
              <Text style={{ fontFamily: 'Cairo_400Regular', fontSize: 13, color: colors.textMuted, textAlign, writingDirection, marginBottom: 16, lineHeight: 20 }}>
                {t(
                  'سيتم حذف حسابك وجميع بياناتك الشخصية بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه.',
                  'Your account and all personal data will be permanently deleted. This action cannot be undone.'
                )}
              </Text>
              <Pressable
                onPress={() => {
                  Alert.alert(
                    t('حذف الحساب', 'Delete Account'),
                    t(
                      'هل أنت متأكد أنك تريد حذف حسابك؟ سيتم حذف جميع بياناتك بشكل نهائي ولا يمكن استعادتها.',
                      'Are you sure you want to delete your account? All your data will be permanently deleted and cannot be recovered.'
                    ),
                    [
                      { text: t('إلغاء', 'Cancel'), style: 'cancel' },
                      {
                        text: t('حذف نهائي', 'Delete Permanently'),
                        style: 'destructive',
                        onPress: () => {
                          Alert.alert(
                            t('تأكيد الحذف', 'Confirm Deletion'),
                            t('هل أنت متأكد تماماً؟ لا يمكن التراجع عن هذا.', 'Are you absolutely sure? This cannot be undone.'),
                            [
                              { text: t('إلغاء', 'Cancel'), style: 'cancel' },
                              {
                                text: t('نعم، احذف حسابي', 'Yes, Delete My Account'),
                                style: 'destructive',
                                onPress: async () => {
                                  setDeletingAccount(true);
                                  try {
                                    await deleteAccount();
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    router.replace('/');
                                  } catch (err: any) {
                                    Alert.alert(
                                      t('خطأ', 'Error'),
                                      t('حدث خطأ أثناء حذف الحساب. حاول مرة أخرى.', 'An error occurred while deleting your account. Please try again.')
                                    );
                                  } finally {
                                    setDeletingAccount(false);
                                  }
                                },
                              },
                            ]
                          );
                        },
                      },
                    ]
                  );
                }}
                disabled={deletingAccount}
                style={({ pressed }) => [
                  styles.saveBtn,
                  {
                    backgroundColor: '#F44336',
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                {deletingAccount ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>{t('حذف الحساب', 'Delete Account')}</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  headerTitle: {
    flex: 1,
    fontFamily: 'Cairo_700Bold',
    fontSize: 18,
  },
  section: {
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 17,
    marginBottom: 16,
  },
  fieldRow: {
    gap: 12,
  },
  fieldHalf: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: 'Cairo_600SemiBold',
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    fontFamily: 'Cairo_400Regular',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  eyeBtn: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  msgBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  msgText: {
    fontFamily: 'Cairo_400Regular',
    fontSize: 13,
    flex: 1,
  },
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    minHeight: 48,
  },
  saveBtnText: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 15,
    color: '#fff',
  },
});
