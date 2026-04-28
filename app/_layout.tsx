export const unstable_settings = {
  initialRouteName: "(tabs)",
};

import { QueryClientProvider } from "@tanstack/react-query";
import { useLogoUrl } from "@/lib/useLogoUrl";
import XmartLogoSvg from "@/components/XmartLogoSvg";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Platform, Animated, Easing, StyleSheet, View, Text, Dimensions } from "react-native";
import * as Updates from "expo-updates";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useFonts, Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold } from "@expo-google-fonts/cairo";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { initMetaSdk, requestTrackingPermission, logAppOpen } from "@/lib/meta-events";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { RecentlyViewedProvider } from "@/contexts/RecentlyViewedContext";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { SalesCountProvider } from "@/contexts/SalesCountContext";

SplashScreen.preventAutoHideAsync();
const { width: LOGO_SCREEN_W } = Dimensions.get('window');

function LanguageSwitchOverlay() {
  const { isSwitching } = useLanguage();
  const { colors, isDark } = useTheme();
  const logoUrl = useLogoUrl();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const useNative = Platform.OS !== 'web';

  useEffect(() => {
    if (isSwitching) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: useNative }),
        Animated.spring(scale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: useNative }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: useNative }),
        Animated.timing(scale, { toValue: 0.8, duration: 300, useNativeDriver: useNative }),
      ]).start();
    }
  }, [isSwitching]);

  return (
    <Animated.View
      pointerEvents={isSwitching ? "auto" : "none"}
      style={[overlayStyles.container, { opacity, backgroundColor: colors.background }]}
    >
      <Animated.View style={[overlayStyles.content, { transform: [{ scale }] }]}>
        <XmartLogoSvg width={Math.min(LOGO_SCREEN_W * 0.6, 300)} isDark={isDark} />
        <View style={overlayStyles.spinner}>
          <Animated.View style={[overlayStyles.dot, { backgroundColor: colors.primary }]} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const overlayStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 20,
  },
  logoImage: {
    width: Math.min(LOGO_SCREEN_W * 0.9, 480),
    height: Math.min(LOGO_SCREEN_W * 0.9, 480) * 0.42,
  },
  logoText: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 72,
    letterSpacing: 2,
  },
  spinner: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

function ThemeSwitchOverlay() {
  const { isSwitching, switchingTo, colors } = useTheme();
  const { language } = useLanguage();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const useNative = Platform.OS !== 'web';

  useEffect(() => {
    if (isSwitching) {
      iconRotate.setValue(0);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: useNative }),
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: useNative }),
        Animated.timing(iconRotate, { toValue: 1, duration: 800, useNativeDriver: useNative }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: useNative }),
        Animated.timing(scale, { toValue: 0.6, duration: 400, useNativeDriver: useNative }),
      ]).start();
    }
  }, [isSwitching]);

  const targetDark = switchingTo === 'dark';
  const logoUrl = useLogoUrl(targetDark);
  const bgColor = targetDark ? '#0a1628' : '#f0f6ff';
  const iconColor = targetDark ? '#248CCC' : '#f5a623';
  const subtextColor = targetDark ? '#248CCC' : '#6b9fd4';

  const spin = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      pointerEvents={isSwitching ? "auto" : "none"}
      style={[themeSplashStyles.container, { opacity, backgroundColor: bgColor }]}
    >
      <Animated.View style={[themeSplashStyles.content, { transform: [{ scale }] }]}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <View style={[themeSplashStyles.iconCircle, { backgroundColor: iconColor + '20' }]}>
            <Text style={{ fontSize: 48 }}>{targetDark ? '🌙' : '☀️'}</Text>
          </View>
        </Animated.View>
        <XmartLogoSvg width={Math.min(LOGO_SCREEN_W * 0.6, 300)} isDark={targetDark} />
        <Text style={[themeSplashStyles.subtitle, { color: subtextColor }]}>
          {targetDark
            ? (language === 'ar' ? 'الوضع الليلي' : 'Night Mode')
            : (language === 'ar' ? 'الوضع النهاري' : 'Day Mode')}
        </Text>
        <View style={themeSplashStyles.dotsRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[themeSplashStyles.dot, { backgroundColor: iconColor, opacity: 0.4 + i * 0.3 }]} />
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const themeSplashStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: Math.min(LOGO_SCREEN_W * 0.9, 440),
    height: Math.min(LOGO_SCREEN_W * 0.9, 440) * 0.42,
    marginTop: 8,
  },
  logoText: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 72,
    letterSpacing: 2,
    marginTop: 8,
  },
  subtitle: {
    fontFamily: 'Cairo_600SemiBold',
    fontSize: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

const USE_NATIVE = Platform.OS !== 'web';

function AppSplashScreen({ onFinish }: { onFinish: () => void }) {
  const { language } = useLanguage();
  const logoUrl = useLogoUrl(true);

  const containerOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTransY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 800, useNativeDriver: USE_NATIVE }),
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: USE_NATIVE }),
      ]),
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 600, useNativeDriver: USE_NATIVE }),
        Animated.timing(taglineTransY, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE }),
      ]),
      Animated.delay(1000),
      Animated.timing(containerOpacity, { toValue: 0, duration: 500, easing: Easing.in(Easing.cubic), useNativeDriver: USE_NATIVE }),
    ]);

    anim.start(() => onFinish());
    return () => anim.stop();
  }, []);

  const tagline = language === 'ar' ? 'كل ما تحتاجه في تطبيق واحد' : 'Everything You Need, One App';

  return (
    <Animated.View
      pointerEvents="none"
      style={[splashStyles.container, { opacity: containerOpacity }]}
    >
      <LinearGradient
        colors={['#000000', '#0d1b2a'] as any}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={splashStyles.content}>
        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
          <XmartLogoSvg width={Math.min(LOGO_SCREEN_W * 0.7, 320)} isDark={true} />
        </Animated.View>

        <Animated.View
          style={{
            opacity: taglineOpacity,
            transform: [{ translateY: taglineTransY }],
          }}
        >
          <Text style={[
            splashStyles.tagline,
            language === 'ar'
              ? { writingDirection: 'rtl', fontFamily: 'Cairo_600SemiBold', fontSize: 22 }
              : { writingDirection: 'ltr', fontFamily: 'Cairo_400Regular', fontSize: 20, letterSpacing: 1 },
          ]}>
            {tagline}
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 25,
  },
  tagline: {
    fontFamily: 'Cairo_600SemiBold',
    fontSize: 22,
    color: '#ffffff',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

function RootLayoutNav() {
  const { colors, isDark } = useTheme();
  const { isRTL } = useLanguage();
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  const slideAnimation = Platform.OS === "ios" ? "default" as const : (isRTL ? "slide_from_left" as const : "slide_from_right" as const);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      {showSplash && <AppSplashScreen onFinish={handleSplashFinish} />}
      <ThemeSwitchOverlay />
      <LanguageSwitchOverlay />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: slideAnimation,
          animationDuration: 250,
          contentStyle: { backgroundColor: colors.background },
          ...(Platform.OS === "ios" ? {
            gestureEnabled: true,
            gestureDirection: "horizontal" as const,
          } : {}),
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: "none" }} />
        <Stack.Screen
          name="product/[handle]"
          options={{
            headerShown: false,
            animation: slideAnimation,
          }}
        />
        <Stack.Screen
          name="collection/[handle]"
          options={{
            headerShown: false,
            animation: slideAnimation,
          }}
        />
        <Stack.Screen
          name="search"
          options={{
            headerShown: false,
            animation: Platform.OS === "ios" ? "default" : "fade_from_bottom",
          }}
        />
        <Stack.Screen
          name="orders"
          options={{
            headerShown: false,
            animation: slideAnimation,
          }}
        />
        <Stack.Screen
          name="checkout"
          options={{
            headerShown: false,
            animation: slideAnimation,
          }}
        />
        <Stack.Screen
          name="(auth)"
          options={{
            presentation: "modal",
            headerShown: false,
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen
          name="brand/[vendor]"
          options={{
            headerShown: false,
            animation: slideAnimation,
          }}
        />
        <Stack.Screen
          name="cod-order"
          options={{
            headerShown: false,
            animation: slideAnimation,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="account"
          options={{
            headerShown: false,
            animation: slideAnimation,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (__DEV__) return;
    async function checkForUpdates() {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (e) {
        console.log('[OTA] Update check error:', e);
      }
    }
    checkForUpdates();
  }, []);

  useEffect(() => {
    async function lockOrientation() {
      try {
        const SO = await import("expo-screen-orientation");
        await SO.lockAsync(SO.OrientationLock.PORTRAIT_UP);
      } catch (e) {}
    }
    lockOrientation();
  }, []);

  // Meta (Facebook) SDK: init + ATT prompt (iOS) + App Open event
  // Runs once on app launch — fires `fb_mobile_activate_app` after permission flow
  useEffect(() => {
    (async () => {
      try {
        await requestTrackingPermission();
        await initMetaSdk();
        logAppOpen();
      } catch (e) {
        console.log('[Meta] init flow error:', e);
      }
    })();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <CartProvider>
                <WishlistProvider>
                  <RecentlyViewedProvider>
                    <NotificationProvider>
                      <SalesCountProvider>
                        <GestureHandlerRootView style={{ flex: 1, direction: 'ltr' as any }}>
                          <KeyboardProvider>
                            <RootLayoutNav />
                          </KeyboardProvider>
                        </GestureHandlerRootView>
                      </SalesCountProvider>
                    </NotificationProvider>
                  </RecentlyViewedProvider>
                </WishlistProvider>
              </CartProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
