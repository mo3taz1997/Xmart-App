import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ToastType = 'error' | 'success' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

const TYPE_CONFIG = {
  error: {
    bg: '#FF3B30',
    icon: 'close-circle' as const,
    iconColor: '#fff',
  },
  success: {
    bg: '#34C759',
    icon: 'checkmark-circle' as const,
    iconColor: '#fff',
  },
  info: {
    bg: '#248CCC',
    icon: 'information-circle' as const,
    iconColor: '#fff',
  },
};

export default function Toast({ message, type = 'error', visible, onHide, duration = 3500 }: ToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const config = TYPE_CONFIG[type];

  useEffect(() => {
    if (visible) {
      if (timerRef.current) clearTimeout(timerRef.current);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: Platform.OS !== 'web', tension: 80, friction: 12 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
      timerRef.current = setTimeout(() => hide(), duration);
    } else {
      hide();
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [visible, message]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
    ]).start(() => onHide());
  };

  if (!visible && opacity._value === 0) return null;

  const topOffset = Platform.OS === 'web' ? 67 + insets.top + 12 : insets.top + 12;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: config.bg, top: topOffset, transform: [{ translateY }], opacity },
      ]}
    >
      <Ionicons name={config.icon} size={22} color={config.iconColor} />
      <Text style={styles.message} numberOfLines={3}>{message}</Text>
      <Pressable onPress={hide} hitSlop={12}>
        <Ionicons name="close" size={18} color="rgba(255,255,255,0.8)" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  message: {
    flex: 1,
    fontFamily: 'Cairo_600SemiBold',
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
    writingDirection: 'rtl',
  },
});
