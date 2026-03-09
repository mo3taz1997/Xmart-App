import React, { createContext, useContext, useState, useEffect, useRef, useMemo, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from './LanguageContext';
import { api } from '@/lib/api';

interface CartLine {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    price: { amount: string; currencyCode: string };
    product: {
      title: string;
      handle: string;
      images: { edges: { node: { url: string } }[] };
    };
  };
}

interface Cart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    totalAmount: { amount: string; currencyCode: string };
    subtotalAmount: { amount: string; currencyCode: string };
  };
  lines: { edges: { node: CartLine }[] };
  discountCodes?: { code: string; applicable: boolean }[];
}

export interface CartItemInfo {
  productTitle: string;
  productHandle: string;
  variantTitle?: string;
  price: string;
  currencyCode: string;
  imageUrl?: string | null;
  maxQuantity?: number;
}

interface CartContextValue {
  cart: Cart | null;
  isLoading: boolean;
  cartCount: number;
  addToCart: (variantId: string, quantity?: number, info?: CartItemInfo) => Promise<Cart>;
  updateQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeFromCart: (lineId: string) => Promise<void>;
  applyDiscount: (code: string) => Promise<void>;
  getCheckoutUrl: () => string | null;
  clearCart: () => void;
  replaceCartWith: (variantId: string, quantity?: number, info?: CartItemInfo) => Promise<Cart>;
}

type StoredLine = {
  lineId: string;
  variantId: string;
  quantity: number;
  productTitle: string;
  productTitleAr?: string;
  productTitleEn?: string;
  productHandle: string;
  variantTitle: string;
  price: string;
  currencyCode: string;
  imageUrl: string | null;
  maxQuantity?: number;
};

const CART_KEY = 'local_cart_v2';

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function getDisplayTitle(line: StoredLine, language: string): string {
  if (language === 'ar' && line.productTitleAr) return line.productTitleAr;
  if (language === 'en' && line.productTitleEn) return line.productTitleEn;
  return line.productTitle;
}

function buildCartFromLines(lines: StoredLine[], language: string, discountCodes?: { code: string; applicable: boolean }[]): Cart {
  const totalQuantity = lines.reduce((s, l) => s + l.quantity, 0);
  const currency = lines[0]?.currencyCode || 'JOD';
  const subtotal = lines.reduce((s, l) => s + parseFloat(l.price || '0') * l.quantity, 0);
  return {
    id: 'local-cart',
    checkoutUrl: '',
    totalQuantity,
    cost: {
      totalAmount: { amount: subtotal.toFixed(3), currencyCode: currency },
      subtotalAmount: { amount: subtotal.toFixed(3), currencyCode: currency },
    },
    lines: {
      edges: lines.map(l => ({
        node: {
          id: l.lineId,
          quantity: l.quantity,
          merchandise: {
            id: l.variantId,
            title: l.variantTitle,
            price: { amount: l.price, currencyCode: l.currencyCode },
            product: {
              title: getDisplayTitle(l, language),
              handle: l.productHandle,
              images: l.imageUrl ? { edges: [{ node: { url: l.imageUrl } }] } : { edges: [] },
            },
          },
        },
      })),
    },
    discountCodes: discountCodes || [],
  };
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<StoredLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const restoredRef = useRef(false);
  const { language } = useLanguage();

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    AsyncStorage.getItem(CART_KEY).then(raw => {
      if (raw) {
        try { setLines(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(CART_KEY, JSON.stringify(lines));
  }, [lines]);

  useEffect(() => {
    if (lines.length === 0) return;
    const needsUpdate = lines.some(l => {
      if (language === 'ar' && !l.productTitleAr) return true;
      if (language === 'en' && !l.productTitleEn) return true;
      return false;
    });
    if (!needsUpdate) return;

    const handles = [...new Set(lines.filter(l => {
      if (language === 'ar' && !l.productTitleAr) return true;
      if (language === 'en' && !l.productTitleEn) return true;
      return false;
    }).map(l => l.productHandle))];

    if (handles.length === 0) return;

    let cancelled = false;
    (async () => {
      const titleMap: Record<string, string> = {};
      await Promise.all(handles.map(async (handle) => {
        try {
          const data = await api.getProduct(handle, language);
          const title = data?.title || data?.product?.title;
          if (title) {
            titleMap[handle] = title;
          }
        } catch {}
      }));
      if (cancelled || Object.keys(titleMap).length === 0) return;
      setLines(prev => {
        const updated = prev.map(l => {
          const newTitle = titleMap[l.productHandle];
          if (!newTitle) return l;
          if (language === 'ar') {
            return { ...l, productTitleAr: newTitle };
          } else {
            return { ...l, productTitleEn: newTitle };
          }
        });
        return updated;
      });
    })();
    return () => { cancelled = true; };
  }, [language, lines.length]);

  const cart = useMemo(() => {
    if (lines.length === 0) return null;
    return buildCartFromLines(lines, language);
  }, [lines, language]);

  const cartCount = useMemo(() => lines.reduce((s, l) => s + l.quantity, 0), [lines]);

  const addToCart = useCallback(async (variantId: string, quantity = 1, info?: CartItemInfo): Promise<Cart> => {
    setIsLoading(true);
    let resultCart!: Cart;
    try {
      setLines(prev => {
        const existing = prev.find(l => l.variantId === variantId);
        let next: StoredLine[];
        if (existing) {
          const max = info?.maxQuantity ?? existing.maxQuantity;
          let newQty = existing.quantity + quantity;
          if (max != null && max > 0 && newQty > max) newQty = max;
          next = prev.map(l =>
            l.variantId === variantId ? { ...l, quantity: newQty, ...(max != null ? { maxQuantity: max } : {}) } : l
          );
        } else {
          const max = info?.maxQuantity;
          let finalQty = quantity;
          if (max != null && max > 0 && finalQty > max) finalQty = max;
          const newLine: StoredLine = {
            lineId: genId(),
            variantId,
            quantity: finalQty,
            productTitle: info?.productTitle || '',
            productHandle: info?.productHandle || '',
            variantTitle: info?.variantTitle || 'Default Title',
            price: info?.price || '0',
            currencyCode: info?.currencyCode || 'JOD',
            imageUrl: info?.imageUrl ?? null,
            maxQuantity: max,
            ...(language === 'ar'
              ? { productTitleAr: info?.productTitle || '' }
              : { productTitleEn: info?.productTitle || '' }),
          };
          next = [...prev, newLine];
        }
        resultCart = buildCartFromLines(next, language);
        return next;
      });
      return resultCart;
    } finally {
      setIsLoading(false);
    }
  }, [language]);

  const updateQuantity = useCallback(async (lineId: string, quantity: number) => {
    setIsLoading(true);
    try {
      setLines(prev => {
        if (quantity <= 0) return prev.filter(l => l.lineId !== lineId);
        return prev.map(l => {
          if (l.lineId !== lineId) return l;
          let finalQty = quantity;
          if (l.maxQuantity != null && l.maxQuantity > 0 && finalQty > l.maxQuantity) finalQty = l.maxQuantity;
          return { ...l, quantity: finalQty };
        });
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeFromCart = useCallback(async (lineId: string) => {
    setIsLoading(true);
    try {
      setLines(prev => prev.filter(l => l.lineId !== lineId));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const applyDiscount = useCallback(async (_code: string) => {
  }, []);

  const getCheckoutUrl = useCallback(() => null, []);

  const clearCart = useCallback(() => {
    setLines([]);
    AsyncStorage.removeItem(CART_KEY);
  }, []);

  const replaceCartWith = useCallback(async (variantId: string, quantity = 1, info?: CartItemInfo): Promise<Cart> => {
    setIsLoading(true);
    let resultCart!: Cart;
    try {
      const max = info?.maxQuantity;
      let finalQty = quantity;
      if (max != null && max > 0 && finalQty > max) finalQty = max;
      const newLine: StoredLine = {
        lineId: genId(),
        variantId,
        quantity: finalQty,
        productTitle: info?.productTitle || '',
        productHandle: info?.productHandle || '',
        variantTitle: info?.variantTitle || 'Default Title',
        price: info?.price || '0',
        currencyCode: info?.currencyCode || 'JOD',
        imageUrl: info?.imageUrl ?? null,
        maxQuantity: max,
        ...(language === 'ar'
          ? { productTitleAr: info?.productTitle || '' }
          : { productTitleEn: info?.productTitle || '' }),
      };
      setLines([newLine]);
      resultCart = buildCartFromLines([newLine], language);
      return resultCart;
    } finally {
      setIsLoading(false);
    }
  }, [language]);

  const value = useMemo(() => ({
    cart,
    isLoading,
    cartCount,
    addToCart,
    updateQuantity,
    removeFromCart,
    applyDiscount,
    getCheckoutUrl,
    clearCart,
    replaceCartWith,
  }), [cart, isLoading, cartCount, addToCart, updateQuantity, removeFromCart, applyDiscount, getCheckoutUrl, clearCart, replaceCartWith]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
}
