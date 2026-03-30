import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label, Badge } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, Pressable, Animated as RNAnimated, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useCallback } from "react";
import { useNavigation } from "expo-router";
import * as Haptics from "expo-haptics";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { tabEvents } from "@/lib/tabEvents";

const TAB_CONFIGS = [
  { name: 'index', icon: 'home', iconOutline: 'home-outline', activeColor: '#C4A265', event: 'homeTabPress' },
  { name: 'categories', icon: 'grid', iconOutline: 'grid-outline', activeColor: '#4CAF50', event: 'categoriesTabPress' },
  { name: 'wishlist', icon: 'heart', iconOutline: 'heart-outline', activeColor: '#E53935', event: 'wishlistTabPress' },
  { name: 'cart', icon: 'cart', iconOutline: 'cart-outline', activeColor: '#FFC107', event: 'cartTabPress' },
  { name: 'profile', icon: 'person', iconOutline: 'person-outline', activeColor: '#248CCC', event: 'profileTabPress' },
] as const;

function AnimatedTabButton({ children, onPress, onLongPress, accessibilityState, style, activeColor }: any) {
  const focused = accessibilityState?.selected;
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;
  const bgAnim = useRef(new RNAnimated.Value(focused ? 1 : 0)).current;

  React.useEffect(() => {
    RNAnimated.timing(bgAnim, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [focused]);

  const handlePressIn = useCallback(() => {
    RNAnimated.spring(scaleAnim, {
      toValue: 0.85,
      useNativeDriver: true,
      friction: 8,
      tension: 200,
    }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    RNAnimated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
      tension: 150,
    }).start();
  }, []);

  const handlePress = useCallback(() => {
    onPress?.();
  }, [onPress]);

  const pillBg = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', activeColor + '18'],
  });

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}
    >
      <RNAnimated.View style={{
        transform: [{ scale: scaleAnim }],
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
      }}>
        <RNAnimated.View style={{
          backgroundColor: pillBg,
          borderRadius: 16,
          paddingHorizontal: 8,
          paddingVertical: 4,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {children}
        </RNAnimated.View>
      </RNAnimated.View>
    </Pressable>
  );
}

const NATIVE_TABS = [
  { name: 'index', sf: { default: "house", selected: "house.fill" }, labelKey: 'tab.home' },
  { name: 'categories', sf: { default: "square.grid.2x2", selected: "square.grid.2x2.fill" }, labelKey: 'tab.categories' },
  { name: 'wishlist', sf: { default: "heart", selected: "heart.fill" }, labelKey: 'tab.wishlist' },
  { name: 'cart', sf: { default: "cart", selected: "cart.fill" }, labelKey: 'tab.cart' },
  { name: 'profile', sf: { default: "person", selected: "person.fill" }, labelKey: 'tab.profile' },
] as const;

function NativeTabLayout() {
  const { cartCount } = useCart();
  const { t, isRTL } = useLanguage();
  const navigation = useNavigation();

  const handleTriggerPress = useCallback((tabName: string) => {
    const state = (navigation as any).getState?.();
    const currentRouteName = state?.routes?.[state?.index]?.name;
    if (currentRouteName === tabName) {
      const tab = TAB_CONFIGS.find(tc => tc.name === tabName);
      if (tab?.event) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        tabEvents.emit(tab.event);
      }
    }
  }, [navigation]);

  const tabs = isRTL ? [...NATIVE_TABS].reverse() : NATIVE_TABS;

  return (
    <NativeTabs>
      {tabs.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name} onPress={() => handleTriggerPress(tab.name)}>
          <Icon sf={tab.sf} />
          <Label>{t(tab.labelKey as any)}</Label>
          {tab.name === 'cart' && cartCount > 0 ? <Badge>{String(cartCount)}</Badge> : null}
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const { cartCount } = useCart();
  const { t, isRTL } = useLanguage();
  const { colors, isDark } = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.surface,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          paddingBottom: isWeb ? 0 : safeAreaInsets.bottom,
          direction: isRTL ? "rtl" : "ltr",
          ...(isWeb ? { height: 84 } : {}),
          ...(Dimensions.get('window').width >= 768 ? { paddingHorizontal: Math.round(Dimensions.get('window').width * 0.15) } : {}),
        } as any,
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]} />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Cairo_600SemiBold",
          fontSize: 9,
          flexShrink: 0,
        },
      }}
    >
      {TAB_CONFIGS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(`tab.${tab.name === 'index' ? 'home' : tab.name}` as any),
            tabBarActiveTintColor: tab.activeColor,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? tab.icon : tab.iconOutline}
                size={size}
                color={color}
              />
            ),
            ...(tab.name === 'cart' ? {
              tabBarBadge: cartCount > 0 ? cartCount : undefined,
              tabBarBadgeStyle: {
                backgroundColor: '#FFC107',
                color: '#000',
                fontSize: 10,
                fontFamily: 'Cairo_600SemiBold',
              },
            } : {}),
            tabBarButton: (props: any) => (
              <AnimatedTabButton {...props} activeColor={tab.activeColor} />
            ),
          }}
          listeners={({ navigation }) => ({
            tabPress: () => {
              if (navigation.isFocused() && tab.event) {
                tabEvents.emit(tab.event);
              }
            },
          })}
        />
      ))}
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
