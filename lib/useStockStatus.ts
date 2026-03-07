import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { api } from '@/lib/api';

const REFRESH_INTERVAL = 60 * 1000;

export function useStockStatus(products: Array<{ handle: string; availableForSale?: boolean }>) {
  const [stockMap, setStockMap] = useState<Record<string, boolean>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handlesKey = useMemo(() => {
    const unique = [...new Set(products.map(p => p.handle).filter(Boolean))];
    unique.sort();
    return unique.join(',');
  }, [products.map(p => p.handle).join(',')]);

  const fetchStock = useCallback(async () => {
    if (!handlesKey) return;
    const handles = handlesKey.split(',');
    try {
      const result = await api.batchStockStatus(handles);
      if (result && typeof result === 'object') {
        setStockMap(prev => {
          const next = { ...prev };
          let changed = false;
          for (const [h, v] of Object.entries(result)) {
            if (next[h] !== v) {
              next[h] = v as boolean;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }
    } catch {}
  }, [handlesKey]);

  useEffect(() => {
    if (!handlesKey) return;

    fetchStock();

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchStock, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [handlesKey, fetchStock]);

  const getAvailability = useCallback((handle: string, fallback?: boolean): boolean => {
    if (handle in stockMap) return stockMap[handle];
    return fallback ?? true;
  }, [stockMap]);

  return { stockMap, getAvailability };
}
