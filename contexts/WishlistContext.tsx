import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WishlistItem {
  handle: string;
  title: string;
  price: string;
  currencyCode: string;
  compareAtPrice?: string;
  imageUrl?: string;
}

interface WishlistContextValue {
  items: WishlistItem[];
  isInWishlist: (handle: string) => boolean;
  toggleWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (handle: string) => void;
  clearWishlist: () => void;
  count: number;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);
const STORAGE_KEY = 'xmart_wishlist';

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) setItems(JSON.parse(data));
    });
  }, []);

  const persist = useCallback((newItems: WishlistItem[]) => {
    setItems(newItems);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
  }, []);

  const isInWishlist = useCallback((handle: string) => {
    return items.some((item) => item.handle === handle);
  }, [items]);

  const toggleWishlist = useCallback((item: WishlistItem) => {
    const exists = items.some((i) => i.handle === item.handle);
    if (exists) {
      persist(items.filter((i) => i.handle !== item.handle));
    } else {
      persist([...items, item]);
    }
  }, [items, persist]);

  const removeFromWishlist = useCallback((handle: string) => {
    persist(items.filter((i) => i.handle !== handle));
  }, [items, persist]);

  const clearWishlist = useCallback(() => {
    persist([]);
  }, [persist]);

  const value = useMemo(() => ({
    items,
    isInWishlist,
    toggleWishlist,
    removeFromWishlist,
    clearWishlist,
    count: items.length,
  }), [items, isInWishlist, toggleWishlist, removeFromWishlist, clearWishlist]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be inside WishlistProvider');
  return ctx;
}
