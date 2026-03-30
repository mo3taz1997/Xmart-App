import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform, ActivityIndicator, Dimensions, TextInput, Modal, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay, withSequence, withSpring,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/colors';
import { tabEvents } from '@/lib/tabEvents';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import PageBackground from '@/components/PageBackground';
import { useTheme } from '@/contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MENU_ITEMS = [
  { key: 'account', icon: 'person-outline', labelKey: 'profile.account', color: '#248CCC', route: '/account' },
  { key: 'orders', icon: 'receipt-outline', labelKey: 'profile.orders', color: '#248CCC', route: '/orders' },
  { key: 'addresses', icon: 'location-outline', labelKey: 'profile.addresses', color: '#4CD964', route: '/addresses' },
  { key: 'wishlist', icon: 'heart-outline', labelKey: 'profile.wishlist', color: '#FF6B8A', route: '/(tabs)/wishlist' },
  { key: 'cart', icon: 'bag-outline', labelKey: 'profile.cart', color: '#F5A623', route: '/(tabs)/cart' },
];

function MenuRow({ item, colors, isRTL, t, index, isDark, isLast }: { item: typeof MENU_ITEMS[0]; colors: typeof Colors.dark; isRTL: boolean; t: any; index: number; isDark: boolean; isLast: boolean }) {
  const iconPulse = useSharedValue(1);
  const chevronNudge = useSharedValue(0);

  useEffect(() => {
    iconPulse.value = withDelay(index * 200 + 600, withRepeat(
      withSequence(
        withTiming(1.12, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      ), -1, true,
    ));
    chevronNudge.value = withDelay(index * 200 + 1000, withRepeat(
      withSequence(
        withTiming(isRTL ? -3 : 3, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ), -1, true,
    ));
  }, []);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconPulse.value }] }));
  const chevStyle = useAnimatedStyle(() => ({ transform: [{ translateX: chevronNudge.value }] }));

  const tintBg = item.color + (isDark ? '18' : '12');

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (item.route.startsWith('/(tabs)/')) {
          router.navigate(item.route as any);
        } else {
          router.push(item.route as any);
        }
      }}
      style={{
        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
      }}
    >
      {({ pressed }) => (
        <View style={{
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          paddingVertical: 14,
          paddingHorizontal: 4,
          opacity: pressed ? 0.6 : 1,
        }}>
          <Animated.View style={[{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: tintBg,
            alignItems: 'center', justifyContent: 'center',
          }, iconStyle]}>
            <Ionicons name={item.icon as any} size={20} color={item.color} />
          </Animated.View>

          <Text style={{
            fontFamily: 'Cairo_600SemiBold', fontSize: 15.5, color: colors.text,
            textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr',
            marginHorizontal: 10,
          }}>
            {t(item.labelKey)}
          </Text>

          <View style={{ flex: 1 }} />

          <Animated.View style={chevStyle}>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={17} color={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'} />
          </Animated.View>
        </View>
      )}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const { customer, isLoggedIn, isLoading, logout } = useAuth();
  const { t, isRTL, language, setLanguage, switchCount } = useLanguage();
  const { colors, isDark, setMode } = useTheme();
  const mainScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    return tabEvents.on('profileTabPress', () => {
      mainScrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
    });
  }, []);

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showEditName, setShowEditName] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [displayName, setDisplayName] = useState<{ first: string; last: string } | null>(null);

  const AVATAR_PRESETS = [
    { id: 'cool', emoji: '😎', bg: '#248CCC', label: language === 'ar' ? 'كول' : 'Cool' },
    { id: 'star', emoji: '🤩', bg: '#FF9800', label: language === 'ar' ? 'نجمة' : 'Star' },
    { id: 'chill', emoji: '😊', bg: '#4CAF50', label: language === 'ar' ? 'مرح' : 'Happy' },
    { id: 'fire', emoji: '🔥', bg: '#F44336', label: language === 'ar' ? 'نار' : 'Fire' },
    { id: 'rocket', emoji: '🚀', bg: '#163259', label: language === 'ar' ? 'صاروخ' : 'Rocket' },
    { id: 'diamond', emoji: '💎', bg: '#9C27B0', label: language === 'ar' ? 'ألماس' : 'Diamond' },
    { id: 'crown', emoji: '👑', bg: '#FFC107', label: language === 'ar' ? 'تاج' : 'Crown' },
    { id: 'bolt', emoji: '⚡', bg: '#FF5722', label: language === 'ar' ? 'برق' : 'Bolt' },
    { id: 'ghost', emoji: '👻', bg: '#607D8B', label: language === 'ar' ? 'شبح' : 'Ghost' },
    { id: 'alien', emoji: '👾', bg: '#673AB7', label: language === 'ar' ? 'فضائي' : 'Alien' },
    { id: 'ninja', emoji: '🥷', bg: '#37474F', label: language === 'ar' ? 'نينجا' : 'Ninja' },
    { id: 'lion', emoji: '🦁', bg: '#E65100', label: language === 'ar' ? 'أسد' : 'Lion' },
  ];

  useEffect(() => {
    if (customer?.email) {
      AsyncStorage.getItem(`profile_image_${customer.email}`).then(uri => {
        if (uri) setProfileImage(uri);
      });
      AsyncStorage.getItem(`profile_name_${customer.email}`).then(name => {
        if (name) {
          try { setDisplayName(JSON.parse(name)); } catch {}
        }
      });
    }
  }, [customer?.email]);

  const pickCustomImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);
      setShowAvatarPicker(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (customer?.email) {
        AsyncStorage.setItem(`profile_image_${customer.email}`, uri);
      }
    }
  };

  const selectPreset = (emoji: string) => {
    const val = `emoji:${emoji}`;
    setProfileImage(val);
    setShowAvatarPicker(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (customer?.email) {
      AsyncStorage.setItem(`profile_image_${customer.email}`, val);
    }
  };

  const isEmojiAvatar = profileImage?.startsWith('emoji:');
  const emojiChar = isEmojiAvatar ? profileImage!.replace('emoji:', '') : null;
  const emojiPreset = isEmojiAvatar ? AVATAR_PRESETS.find(p => p.emoji === emojiChar) : null;

  const openEditName = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditFirstName(displayName?.first || customer?.firstName || '');
    setEditLastName(displayName?.last || customer?.lastName || '');
    setShowEditName(true);
  };

  const saveName = () => {
    const name = { first: editFirstName.trim(), last: editLastName.trim() };
    setDisplayName(name);
    setShowEditName(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (customer?.email) {
      AsyncStorage.setItem(`profile_name_${customer.email}`, JSON.stringify(name));
    }
  };

  const firstName = displayName?.first || customer?.firstName || '';
  const lastName = displayName?.last || customer?.lastName || '';
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : customer?.email || '';
  const avatarLetter = (firstName?.[0] || customer?.email?.[0] || 'X').toUpperCase();

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', paddingTop: insets.top + webTopInset }]}>
        <PageBackground isDark={isDark} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + webTopInset }]}>
        <PageBackground isDark={isDark} />
        <ScrollView ref={mainScrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={styles.guestWrap}>
            <View style={[styles.guestAvatarWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)', borderColor: isDark ? 'rgba(36,140,204,0.3)' : 'rgba(22,50,89,0.12)' }]}>
              <Ionicons name="person-outline" size={48} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(22,50,89,0.35)'} />
            </View>
            <Text style={[styles.guestTitle, { color: isDark ? '#fff' : '#163259' }]}>{t('profile.welcome')}</Text>
            <Text style={[styles.guestSubtext, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(22,50,89,0.55)' }]}>{t('profile.guestDesc')}</Text>
            <View style={styles.guestActions}>
              <Pressable
                style={({ pressed }) => [styles.loginBtn, { backgroundColor: isDark ? '#248CCC' : '#163259', opacity: pressed ? 0.9 : 1 }]}
                onPress={() => router.push('/(auth)/login')}
              >
                <Text key={switchCount} style={styles.loginBtnText}>{t('profile.login')}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.registerBtn, { borderColor: isDark ? '#248CCC' : '#163259', opacity: pressed ? 0.9 : 1 }]}
                onPress={() => router.push('/(auth)/register')}
              >
                <Text key={switchCount} style={[styles.registerBtnText, { color: isDark ? '#248CCC' : '#163259' }]}>{t('profile.register')}</Text>
              </Pressable>
            </View>
          </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 12 }}>
          <SettingsSection colors={colors} isDark={isDark} isRTL={isRTL} language={language} setLanguage={setLanguage} setMode={setMode} t={t} />
        </View>
      </ScrollView>
    </View>
  );
}

return (
  <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + webTopInset }]}>
    <PageBackground isDark={isDark} />
    <ScrollView ref={mainScrollRef} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <View style={styles.profileCard}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAvatarPicker(true); }} style={{ position: 'relative' }}>
          {isEmojiAvatar ? (
            <View style={[styles.avatarWrap, {
              backgroundColor: emojiPreset ? emojiPreset.bg + '25' : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)'),
              borderWidth: 3,
              borderColor: emojiPreset ? emojiPreset.bg + '50' : (isDark ? 'rgba(36,140,204,0.4)' : 'rgba(22,50,89,0.15)'),
            }]}>
              <Text style={{ fontSize: 46 }}>{emojiChar}</Text>
            </View>
          ) : profileImage ? (
            <Image source={{ uri: profileImage }} style={[styles.avatarImg, { borderColor: isDark ? 'rgba(36,140,204,0.5)' : '#fff' }]} contentFit="cover" />
          ) : (
            <View style={[styles.avatarWrap, { backgroundColor: isDark ? '#248CCC' : '#163259' }]}>
              <Text style={styles.avatarText}>{avatarLetter}</Text>
            </View>
          )}
          <View style={[styles.cameraBtn, { backgroundColor: emojiPreset ? emojiPreset.bg : '#248CCC', borderColor: isDark ? '#0f2440' : '#e8f4fd' }]}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </Pressable>

        <Pressable onPress={openEditName} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <Text style={[styles.profileName, { color: isDark ? '#fff' : '#163259' }]}>{fullName}</Text>
          <Ionicons name="create-outline" size={16} color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(22,50,89,0.4)'} />
        </Pressable>
        <Text style={[styles.profileEmail, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(22,50,89,0.55)' }]}>{customer?.email}</Text>
      </View>

      <View style={{ paddingHorizontal: 20, marginTop: 4 }}>
        {MENU_ITEMS.map((item, idx) => (
          <MenuRow key={item.key} item={item} colors={colors} isRTL={isRTL} t={t} index={idx} isDark={isDark} isLast={idx === MENU_ITEMS.length - 1} />
        ))}
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 20, gap: 12 }}>
        <SettingsSection colors={colors} isDark={isDark} isRTL={isRTL} language={language} setLanguage={setLanguage} setMode={setMode} t={t} />
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 16 }}>
        <Pressable
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 14,
            backgroundColor: colors.card,
            borderRadius: 14,
            opacity: pressed ? 0.8 : 1,
          })}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            logout();
          }}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 15, color: colors.error }}>{t('profile.logout')}</Text>
        </Pressable>
      </View>
    </ScrollView>


      <Modal visible={showEditName} transparent animationType="fade" onRequestClose={() => setShowEditName(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowEditName(false)}>
          <Pressable onPress={e => e.stopPropagation()} style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={[styles.modalTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {language === 'ar' ? 'تعديل الاسم' : 'Edit Name'}
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceLight, color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
              value={editFirstName}
              onChangeText={setEditFirstName}
              placeholder={language === 'ar' ? 'الاسم الأول' : 'First Name'}
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceLight, color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
              value={editLastName}
              onChangeText={setEditLastName}
              placeholder={language === 'ar' ? 'اسم العائلة' : 'Last Name'}
              placeholderTextColor={colors.textMuted}
            />
            <Pressable
              onPress={saveName}
              style={({ pressed }) => [styles.modalSaveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
            >
              <Text style={styles.modalSaveBtnText}>{language === 'ar' ? 'حفظ' : 'Save'}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showAvatarPicker} transparent animationType="fade" onRequestClose={() => setShowAvatarPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAvatarPicker(false)}>
          <Pressable onPress={e => e.stopPropagation()} style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={[styles.modalTitle, { color: colors.text, textAlign: 'center' }]}>
              {language === 'ar' ? 'اختر صورة الحساب' : 'Choose Avatar'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginBottom: 20 }}>
              {AVATAR_PRESETS.map(p => {
                const isActive = profileImage === `emoji:${p.emoji}`;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => selectPreset(p.emoji)}
                    style={({ pressed }) => ({
                      alignItems: 'center',
                      width: 76,
                      opacity: pressed ? 0.7 : 1,
                      transform: [{ scale: pressed ? 0.88 : 1 }],
                    })}
                  >
                    <View style={{
                      width: 60, height: 60, borderRadius: 30,
                      backgroundColor: p.bg + (isDark ? '30' : '18'),
                      borderWidth: isActive ? 3 : 1.5,
                      borderColor: isActive ? p.bg : (isDark ? p.bg + '40' : p.bg + '25'),
                      alignItems: 'center', justifyContent: 'center',
                      ...(isActive ? {
                        shadowColor: p.bg,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.35,
                        shadowRadius: 8,
                        elevation: 6,
                      } : {}),
                    }}>
                      <Text style={{ fontSize: 32 }}>{p.emoji}</Text>
                    </View>
                    <Text style={{
                      fontFamily: isActive ? 'Cairo_700Bold' : 'Cairo_400Regular',
                      fontSize: 10,
                      color: isActive ? p.bg : colors.textSecondary,
                      marginTop: 5,
                      textAlign: 'center',
                    }}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={pickCustomImage}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 14,
                backgroundColor: colors.surfaceLight,
                borderRadius: 12,
                marginBottom: 8,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Ionicons name="image-outline" size={20} color={colors.primary} />
              <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: colors.primary }}>
                {language === 'ar' ? 'اختر صورة من الجاليري' : 'Choose from Gallery'}
              </Text>
            </Pressable>
            {profileImage && (
              <Pressable
                onPress={() => {
                  setProfileImage(null);
                  setShowAvatarPicker(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (customer?.email) AsyncStorage.removeItem(`profile_image_${customer.email}`);
                }}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  paddingVertical: 10,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: colors.error }}>
                  {language === 'ar' ? 'إزالة الصورة' : 'Remove Avatar'}
                </Text>
              </Pressable>
            )}
            <View style={{ height: Platform.OS === 'web' ? 24 : 34 }} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function SettingsSection({ colors, isDark, isRTL, language, setLanguage, setMode, t }: {
  colors: typeof Colors.dark; isDark: boolean; isRTL: boolean; language: string;
  setLanguage: (l: string) => void; setMode: (m: 'light' | 'dark') => void; t: any;
}) {
  const { switchCount } = useLanguage();
  const handleLanguageChange = async (lang: string) => {
    if (lang === language) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setLanguage(lang);
    router.replace('/(tabs)');
    setTimeout(() => tabEvents.emit('homeTabPress'), 400);
  };
  return (
    <>
      <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
        <View style={[styles.settingsHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="globe-outline" size={18} color={colors.primary} />
          <Text style={[styles.settingsHeaderText, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{t('profile.language')}</Text>
        </View>
        <View style={[styles.toggleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Pressable
            style={[styles.toggleBtn, { backgroundColor: colors.surfaceLight }, language === 'ar' && { backgroundColor: colors.primary + '20', borderWidth: 1.5, borderColor: colors.primary }]}
            onPress={() => handleLanguageChange('ar')}
          >
            <Text style={[styles.toggleFlag, { color: colors.primary }]}>ع</Text>
            <Text key={`ar-${switchCount}`} style={[styles.toggleText, { color: language === 'ar' ? colors.text : colors.textSecondary, textAlign: 'center' }]}>العربية</Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, { backgroundColor: colors.surfaceLight }, language === 'en' && { backgroundColor: colors.primary + '20', borderWidth: 1.5, borderColor: colors.primary }]}
            onPress={() => handleLanguageChange('en')}
          >
            <Text style={[styles.toggleFlag, { color: colors.primary }]}>EN</Text>
            <Text key={`en-${switchCount}`} style={[styles.toggleText, { color: language === 'en' ? colors.text : colors.textSecondary, textAlign: 'center' }]}>English</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
        <View style={[styles.settingsHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={18} color={colors.primary} />
          <Text style={[styles.settingsHeaderText, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{t('profile.theme')}</Text>
        </View>
        <View style={[styles.toggleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Pressable
            style={[styles.toggleBtn, { backgroundColor: colors.surfaceLight }, !isDark && { backgroundColor: colors.primary + '20', borderWidth: 1.5, borderColor: colors.primary }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMode('light'); }}
          >
            <Ionicons name="sunny-outline" size={18} color={!isDark ? colors.primary : colors.textMuted} />
            <Text style={[styles.toggleText, { color: !isDark ? colors.text : colors.textSecondary, textAlign: 'center' }]}>{t('profile.lightMode')}</Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, { backgroundColor: colors.surfaceLight }, isDark && { backgroundColor: colors.primary + '20', borderWidth: 1.5, borderColor: colors.primary }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMode('dark'); }}
          >
            <Ionicons name="moon-outline" size={18} color={isDark ? colors.primary : colors.textMuted} />
            <Text style={[styles.toggleText, { color: isDark ? colors.text : colors.textSecondary, textAlign: 'center' }]}>{t('profile.darkMode')}</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        style={[styles.settingsCard, { backgroundColor: '#25D366', flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 10 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Linking.openURL('https://wa.me/962797161111');
        }}
      >
        <Ionicons name="logo-whatsapp" size={22} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 15, fontFamily: 'Cairo_600SemiBold' }}>
          {language === 'ar' ? 'تواصل معنا عبر واتساب' : 'Contact us on WhatsApp'}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.settingsCard, { backgroundColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 10 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const url = language === 'ar'
            ? 'https://www.xmart.jo/pages/become-a-supplier'
            : 'https://www.xmart.jo/en/pages/become-a-supplier';
          Linking.openURL(url);
        }}
      >
        <Ionicons name="storefront-outline" size={22} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 15, fontFamily: 'Cairo_600SemiBold' }}>
          {language === 'ar' ? 'انضم لشبكة الموردين' : 'Become a Supplier'}
        </Text>
      </Pressable>

      <View style={{ alignItems: 'center', marginTop: 4, marginBottom: 2 }}>
        <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: colors.textMuted, marginBottom: 6 }}>
          {language === 'ar' ? 'تابعنا' : 'Follow Us'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 20 }}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL('https://www.instagram.com/xmart.jo'); }}
            style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons name="logo-instagram" size={22} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL('https://web.facebook.com/Xmart.jo'); }}
            style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons name="logo-facebook" size={22} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL('https://www.linkedin.com/company/xmart-jo'); }}
            style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons name="logo-linkedin" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <View style={{ alignItems: 'center', marginTop: 2, marginBottom: 6, gap: 1 }}>
        <Text style={{ fontFamily: 'Cairo_400Regular', fontSize: 11, color: colors.textMuted, opacity: 0.6 }}>
          {language === 'ar' ? 'الإصدار 2.2.0' : 'Version 2.2.0'} <Text style={{ fontSize: 9, opacity: 0.4 }}>(39)</Text>
        </Text>
        <Text style={{ fontFamily: 'Cairo_400Regular', fontSize: 11, color: colors.textMuted, opacity: 0.5 }}>
          {language === 'ar' ? '© 2026 XMART. جميع الحقوق محفوظة' : '© 2026 XMART. All rights reserved'}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  guestWrap: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  guestLogo: {
    width: Math.min(SCREEN_WIDTH * 0.42, 170),
    height: Math.min(SCREEN_WIDTH * 0.42, 170) * 0.42,
    marginBottom: 24,
  },
  guestAvatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  guestTitle: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 22,
    marginBottom: 8,
    textAlign: 'center',
  },
  guestSubtext: {
    fontFamily: 'Cairo_400Regular',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  guestActions: {
    width: '100%',
    gap: 12,
  },
  loginBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    width: '100%',
    minHeight: 52,
  },
  loginBtnText: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 16,
    color: '#fff',
    lineHeight: 26,
    textAlign: 'center',
    width: '100%',
  },
  registerBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  registerBtnText: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
    width: '100%',
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
  },
  avatarText: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 36,
    color: '#fff',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 20,
  },
  profileEmail: {
    fontFamily: 'Cairo_400Regular',
    fontSize: 14,
    marginTop: 2,
  },
  settingsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  settingsHeaderText: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 15,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  toggleFlag: {
    fontSize: 16,
    fontFamily: 'Cairo_700Bold',
  },
  toggleText: {
    fontFamily: 'Cairo_600SemiBold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 12,
  },
  modalTitle: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 18,
    marginBottom: 16,
  },
  modalInput: {
    fontFamily: 'Cairo_400Regular',
    fontSize: 15,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  modalSaveBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: Platform.OS === 'web' ? 24 : 34,
  },
  modalSaveBtnText: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 16,
    color: '#fff',
  },
});
