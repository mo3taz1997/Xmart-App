import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/lib/api';

interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  orders?: any;
}

interface AuthContextValue {
  customer: Customer | null;
  token: string | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  recover: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshCustomer: () => Promise<void>;
  updateCustomer: (data: { firstName?: string; lastName?: string; email?: string; phone?: string; password?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function saveToken(token: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem('shopify_token', token);
  } else {
    await SecureStore.setItemAsync('shopify_token', token);
  }
}

async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem('shopify_token');
  }
  return SecureStore.getItemAsync('shopify_token');
}

async function removeToken() {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem('shopify_token');
  } else {
    await SecureStore.deleteItemAsync('shopify_token');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const storedToken = await getToken();
      if (storedToken) {
        const customerData = await api.getCustomer(storedToken);
        setToken(storedToken);
        setCustomer(customerData);
      }
    } catch {
      await removeToken();
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const result = await api.login({ email, password });
    const accessToken = result.accessToken.accessToken;
    await saveToken(accessToken);
    setToken(accessToken);
    if (result.customer) {
      setCustomer(result.customer);
    } else {
      const customerData = await api.getCustomer(accessToken);
      setCustomer(customerData);
    }
  }

  async function register(data: { email: string; password: string; firstName: string; lastName: string }) {
    const result = await api.register(data);
    const accessToken = result.accessToken.accessToken;
    await saveToken(accessToken);
    setToken(accessToken);
    if (result.customer) {
      setCustomer(result.customer);
    } else {
      const customerData = await api.getCustomer(accessToken);
      setCustomer(customerData);
    }
  }

  async function recover(email: string) {
    await api.recover(email);
  }

  async function logout() {
    await removeToken();
    setToken(null);
    setCustomer(null);
  }

  async function refreshCustomer() {
    if (!token) return;
    try {
      const customerData = await api.getCustomer(token);
      setCustomer(customerData);
    } catch {
      await logout();
    }
  }

  async function updateCustomer(data: { firstName?: string; lastName?: string; email?: string; phone?: string; password?: string }) {
    if (!token) throw new Error('Not logged in');
    const result = await api.updateCustomer(token, data);
    if (result.customer) {
      setCustomer(prev => prev ? { ...prev, ...result.customer } : result.customer);
    }
    if (result.accessToken?.accessToken) {
      const newToken = result.accessToken.accessToken;
      await saveToken(newToken);
      setToken(newToken);
    }
  }

  const value = useMemo(() => ({
    customer,
    token,
    isLoading,
    isLoggedIn: !!customer,
    login,
    register,
    recover,
    logout,
    refreshCustomer,
    updateCustomer,
  }), [customer, token, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
