import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'recently_viewed';
const MAX_ITEMS = 20;

interface RecentProduct {
  handle: string;
  title: string;
  imageUrl?: string;
  price: string;
  currencyCode: string;
  compareAtPrice?: string;
  availableForSale?: boolean;
  vendor?: string;
}

interface RecentlyViewedContextValue {
  recentProducts: RecentProduct[];
  addToRecentlyViewed: (product: RecentProduct) => void;
}

const RecentlyViewedContext = createContext<RecentlyViewedContextValue | null>(null);

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setRecentProducts(JSON.parse(stored));
      } catch {}
    })();
  }, []);

  const addToRecentlyViewed = useCallback((product: RecentProduct) => {
    setRecentProducts(prev => {
      const filtered = prev.filter(p => p.handle !== product.handle);
      const updated = [product, ...filtered].slice(0, MAX_ITEMS);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  return (
    <RecentlyViewedContext.Provider value={{ recentProducts, addToRecentlyViewed }}>
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewed() {
  const ctx = useContext(RecentlyViewedContext);
  if (!ctx) throw new Error('useRecentlyViewed must be inside RecentlyViewedProvider');
  return ctx;
}
