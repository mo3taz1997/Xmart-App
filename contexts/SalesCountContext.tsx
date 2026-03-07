import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type SalesCountMap = Record<string, number>;

const SalesCountContext = createContext<SalesCountMap>({});

export function SalesCountProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery<SalesCountMap>({
    queryKey: ['sales-counts'],
    queryFn: () => api.getSalesCounts() as Promise<SalesCountMap>,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return (
    <SalesCountContext.Provider value={data || {}}>
      {children}
    </SalesCountContext.Provider>
  );
}

export function useSalesCount(handle: string): number {
  const map = useContext(SalesCountContext);
  return map[handle] || 0;
}
