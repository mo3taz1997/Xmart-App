import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/colors';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  colors: typeof Colors.dark;
  setMode: (mode: ThemeMode) => void;
  isSwitching: boolean;
  switchingTo: 'light' | 'dark' | null;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_KEY = 'xmart_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [isReady, setIsReady] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<'light' | 'dark' | null>(null);
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
      setIsReady(true);
    }).catch(() => setIsReady(true));
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    const currentIsDark = mode === 'system' ? (systemScheme !== 'light') : mode === 'dark';
    const newIsDark = m === 'system' ? (systemScheme !== 'light') : m === 'dark';
    if (currentIsDark !== newIsDark) {
      setSwitchingTo(newIsDark ? 'dark' : 'light');
      setIsSwitching(true);
      if (switchTimer.current) clearTimeout(switchTimer.current);
      switchTimer.current = setTimeout(() => {
        setModeState(m);
        AsyncStorage.setItem(THEME_KEY, m);
        setTimeout(() => {
          setIsSwitching(false);
          setTimeout(() => {
            setSwitchingTo(null);
          }, 500);
        }, 600);
      }, 500);
    } else {
      setModeState(m);
      AsyncStorage.setItem(THEME_KEY, m);
    }
  }, [mode, systemScheme]);

  const isDark = mode === 'system' ? (systemScheme !== 'light') : mode === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const value = useMemo(() => ({
    mode,
    isDark,
    colors,
    setMode,
    isSwitching,
    switchingTo,
  }), [mode, isDark, colors, setMode, isSwitching, switchingTo]);

  if (!isReady) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}
