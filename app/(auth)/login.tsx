import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Platform,
  ActivityIndicator, KeyboardAvoidingView, ScrollView, Dimensions, Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLogoUrl } from '@/lib/useLogoUrl';
import XmartLogoSvg from '@/components/XmartLogoSvg';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import PageBackground from '@/components/PageBackground';
import Toast from '@/components/Toast';

const { width: LOGIN_SCREEN_W } = Dimensions.get('window');

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const { login } = useAuth();
  const { t, isRTL } = useLanguage();
  const { colors, isDark } = useTheme();
  const logoUrl = useLogoUrl();
  const styles = getStyles(colors);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showRecover, setShowRecover] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setIsLoading(true);
    try {
      await login(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(isRTL ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Incorrect email or password');
    }
    setIsLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <Pressable style={{ flex: 1 }} onPress={() => { if (Platform.OS !== 'web') Keyboard.dismiss(); }}>
        <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
          <PageBackground isDark={isDark} />
          <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Pressable style={styles.closeBtn} onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.logoSection}>
              <XmartLogoSvg width={Math.min(Dimensions.get('window').width * 0.6, 280)} isDark={isDark} />
              <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('auth.login')}</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputWrap}>
                <TextInput
                  style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={t('auth.email')}
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                />
                <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={[styles.inputIcon, isRTL ? { right: 14 } : { left: 14 }]} />
              </View>

              <View style={styles.inputWrap}>
                <TextInput
                  style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={t('auth.password')}
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  textContentType="password"
                />
                <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={[styles.inputIcon, isRTL ? { right: 14 } : { left: 14 }]} />
                <Pressable
                  style={[styles.eyeBtn, isRTL ? { left: 14 } : { right: 14 }]}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              <Pressable onPress={() => setShowRecover(true)}>
                <Text style={[styles.forgotText, { textAlign: isRTL ? 'left' : 'right' }]}>{t('auth.forgotPassword')}</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.loginBtn, { opacity: pressed ? 0.9 : 1 }, (!email.trim() || !password.trim()) && styles.disabledBtn]}
                onPress={handleLogin}
                disabled={isLoading || !email.trim() || !password.trim()}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.loginBtnText}>{t('auth.login')}</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.footer}>
              <Pressable onPress={() => router.replace('/(auth)/register')}>
                <Text style={styles.footerText}>
                  {t('auth.noAccount')} <Text style={styles.footerLink}>{t('auth.createAccount')}</Text>
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          {showRecover ? <RecoverModal onClose={() => setShowRecover(false)} /> : null}
        </View>
      </Pressable>
      <Toast
        message={toastMsg}
        type="error"
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

function RecoverModal({ onClose }: { onClose: () => void }) {
  const { recover } = useAuth();
  const { t, isRTL } = useLanguage();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const handleRecover = async () => {
    if (!email.trim()) return;
    setIsLoading(true);
    try {
      await recover(email.trim());
      setSent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setToastMsg(isRTL ? 'حدث خطأ، يرجى المحاولة لاحقاً' : 'Something went wrong, please try again');
      setToastVisible(true);
    }
    setIsLoading(false);
  };

  return (
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
        {sent ? (
          <View style={styles.modalInner}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text style={styles.modalTitle}>{t('auth.emailSent')}</Text>
            <Text style={[styles.modalDesc, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('auth.emailSentDesc')}</Text>
            <Pressable style={styles.modalBtn} onPress={onClose}>
              <Text style={styles.modalBtnText}>{t('auth.ok')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.modalInner}>
            <Text style={styles.modalTitle}>{t('auth.recover')}</Text>
            <Text style={[styles.modalDesc, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('auth.recoverDesc')}</Text>
            <TextInput
              style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
              placeholder={t('auth.email')}
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Pressable
              style={[styles.modalBtn, !email.trim() && styles.disabledBtn]}
              onPress={handleRecover}
              disabled={isLoading || !email.trim()}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalBtnText}>{t('auth.send')}</Text>
              )}
            </Pressable>
          </View>
        )}
      </Pressable>
      <Toast
        message={toastMsg}
        type="error"
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />
    </Pressable>
  );
}

function getStyles(colors: typeof Colors.dark) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      justifyContent: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      padding: 24,
      paddingTop: 20,
    },
    logoSection: {
      alignItems: 'center',
      marginBottom: 40,
      gap: 8,
    },
    logoImage: {
      width: Math.min(LOGIN_SCREEN_W * 0.96, 400),
      height: Math.min(LOGIN_SCREEN_W * 0.96, 400) * 0.42,
    },
    logoText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 72,
      color: colors.primary,
      letterSpacing: 2,
    },
    subtitle: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 20,
      color: colors.text,
    },
    form: {
      gap: 16,
    },
    inputWrap: {
      position: 'relative',
    },
    input: {
      height: 52,
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 48,
      color: colors.text,
      fontFamily: 'Cairo_400Regular',
      fontSize: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputIcon: {
      position: 'absolute',
      top: 16,
    },
    eyeBtn: {
      position: 'absolute',
      top: 16,
    },
    forgotText: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 13,
      color: colors.primary,
    },
    loginBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 15,
      justifyContent: 'center',
      width: '100%',
      marginTop: 8,
    },
    loginBtnText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 16,
      color: '#fff',
      textAlign: 'center',
      width: '100%',
    },
    disabledBtn: {
      opacity: 0.5,
    },
    footer: {
      alignItems: 'center',
      marginTop: 32,
    },
    footerText: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 14,
      color: colors.textSecondary,
    },
    footerLink: {
      fontFamily: 'Cairo_700Bold',
      color: colors.primary,
    },
    modalOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalContent: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: colors.surface,
      borderRadius: 20,
      overflow: 'hidden',
    },
    modalInner: {
      padding: 24,
      alignItems: 'center',
      gap: 12,
    },
    modalTitle: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 18,
      color: colors.text,
    },
    modalDesc: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    modalBtn: {
      width: '100%',
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    modalBtnText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 15,
      color: '#fff',
    },
  });
}
