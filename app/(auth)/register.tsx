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

const { width: REG_SCREEN_W } = Dimensions.get('window');

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const { register } = useAuth();
  const { t, isRTL } = useLanguage();
  const { colors, isDark } = useTheme();
  const logoUrl = useLogoUrl();
  const styles = getStyles(colors);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const isValid = firstName.trim() && lastName.trim() && email.trim() && password.trim() && password.length >= 5;

  const handleRegister = async () => {
    if (!isValid) return;
    setIsLoading(true);
    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = error?.message || (isRTL ? 'حدث خطأ، يرجى المحاولة لاحقاً' : 'Something went wrong, please try again');
      setToastMsg(msg);
      setToastVisible(true);
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
            <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('auth.register')}</Text>
          </View>

          <View style={styles.form}>
            <View style={[styles.nameRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.inputWrap, { flex: 1 }]}>
                <TextInput
                  style={[styles.input, styles.inputPadded, { textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={t('auth.firstName')}
                  placeholderTextColor={colors.textMuted}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  autoComplete="given-name"
                  textContentType="givenName"
                  importantForAutofill="yes"
                />
              </View>
              <View style={[styles.inputWrap, { flex: 1 }]}>
                <TextInput
                  style={[styles.input, styles.inputPadded, { textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={t('auth.lastName')}
                  placeholderTextColor={colors.textMuted}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  autoComplete="family-name"
                  textContentType="familyName"
                  importantForAutofill="yes"
                />
              </View>
            </View>

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
                importantForAutofill="yes"
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
                autoComplete="new-password"
                textContentType="newPassword"
                importantForAutofill="yes"
              />
              <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={[styles.inputIcon, isRTL ? { right: 14 } : { left: 14 }]} />
              <Pressable
                style={[styles.eyeBtn, isRTL ? { left: 14 } : { right: 14 }]}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [styles.registerBtn, { opacity: pressed ? 0.9 : 1 }, !isValid && styles.disabledBtn]}
              onPress={handleRegister}
              disabled={isLoading || !isValid}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.registerBtnText}>{t('auth.createAccount')}</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Pressable onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.footerText}>
                {t('auth.hasAccount')} <Text style={styles.footerLink}>{t('auth.loginHere')}</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
      <Toast
        message={toastMsg}
        type="error"
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />
    </Pressable>
  </KeyboardAvoidingView>
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
      marginBottom: 32,
      gap: 8,
    },
    logoImage: {
      width: Math.min(REG_SCREEN_W * 0.96, 400),
      height: Math.min(REG_SCREEN_W * 0.96, 400) * 0.42,
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
      gap: 14,
    },
    nameRow: {
      gap: 10,
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
    inputPadded: {
      paddingHorizontal: 16,
    },
    inputIcon: {
      position: 'absolute',
      top: 16,
    },
    eyeBtn: {
      position: 'absolute',
      top: 16,
    },
    registerBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 15,
      justifyContent: 'center',
      width: '100%',
      marginTop: 8,
    },
    registerBtnText: {
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
  });
}
