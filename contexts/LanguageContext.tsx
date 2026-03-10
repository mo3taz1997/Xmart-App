import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { getTranslation, Language, LANGUAGES } from '@/lib/i18n';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

interface LanguageContextValue {
  language: Language;
  isRTL: boolean;
  isSwitching: boolean;
  switchCount: number;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
  formatCurrency: (amount: string, currencyCode: string) => string;
  languages: typeof LANGUAGES;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const LANG_KEY = 'xmart_language';

function detectDeviceLanguage(): Language {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const langCode = locales[0].languageCode;
      if (langCode === 'ar') return 'ar';
    }
  } catch {}
  return 'ar';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<Language>('ar');
  const [isReady, setIsReady] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchCount, setSwitchCount] = useState(0);

  useEffect(() => {
    loadLanguage();
  }, []);

  async function loadLanguage() {
    try {
      const stored = await AsyncStorage.getItem(LANG_KEY);
      if (stored === 'ar' || stored === 'en') {
        setLang(stored);
      } else {
        const detected = detectDeviceLanguage();
        setLang(detected);
        await AsyncStorage.setItem(LANG_KEY, detected);
      }
    } catch {
      setLang('ar');
    }
    setIsReady(true);
  }

  const setLanguage = useCallback(async (lang: Language) => {
    setIsSwitching(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    setLang(lang);
    setSwitchCount(c => c + 1);
    await AsyncStorage.setItem(LANG_KEY, lang);
    setTimeout(() => setIsSwitching(false), 350);
  }, []);

  const t = useCallback((key: string) => {
    return getTranslation(language, key);
  }, [language]);

  const formatCurrency = useCallback((amount: string, currencyCode: string) => {
    const num = parseFloat(amount).toFixed(2);
    const label = currencyCode === 'JOD'
      ? getTranslation(language, 'common.currency.JOD')
      : currencyCode;
    return language === 'ar' ? `${num} ${label}` : `${label} ${num}`;
  }, [language]);

  const isRTL = language === 'ar';

  const value = useMemo(() => ({
    language,
    isRTL,
    isSwitching,
    switchCount,
    setLanguage,
    t,
    formatCurrency,
    languages: LANGUAGES,
  }), [language, isRTL, isSwitching, switchCount, setLanguage, t, formatCurrency]);

  if (!isReady) return null;

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be inside LanguageProvider');
  return ctx;
}
