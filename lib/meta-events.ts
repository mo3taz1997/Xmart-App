import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let Settings: any = null;
let AppEventsLogger: any = null;
let AEMReporter: any = null;

console.log('[Meta] module loading on platform:', Platform.OS);

if (Platform.OS !== 'web') {
  try {
    const fbsdk = require('react-native-fbsdk-next');
    Settings = fbsdk.Settings;
    AppEventsLogger = fbsdk.AppEventsLogger;
    AEMReporter = fbsdk.AEMReporter;
    console.log('[Meta] FBSDK module loaded — Settings:', !!Settings, 'AppEventsLogger:', !!AppEventsLogger, 'AEMReporter:', !!AEMReporter);
  } catch (e) {
    console.log('[Meta] FBSDK NOT available (likely Expo Go):', (e as Error).message);
  }
} else {
  console.log('[Meta] Skipping FBSDK on web');
}

const CURRENCY = 'JOD';
const PURCHASE_DEDUPE_KEY = '@meta_purchased_order_ids_v1';
const PURCHASE_DEDUPE_MAX = 200;
const purchasedOrderIds = new Set<string>();
let dedupeHydrated = false;

// Optional Test Events code from Meta Events Manager → Test Events.
// When set (e.g. "TEST12345"), every event is tagged so it appears INSTANTLY in the Test Events tab.
// Set EXPO_PUBLIC_META_TEST_EVENT_CODE in eas.json env or .env for preview builds; leave empty in production.
const TEST_EVENT_CODE = process.env.EXPO_PUBLIC_META_TEST_EVENT_CODE || '';

function withTestCode(params: Record<string, any>): Record<string, any> {
  return TEST_EVENT_CODE ? { ...params, test_event_code: TEST_EVENT_CODE } : params;
}

async function hydrateDedupe(): Promise<void> {
  if (dedupeHydrated) return;
  dedupeHydrated = true;
  try {
    const raw = await AsyncStorage.getItem(PURCHASE_DEDUPE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) arr.forEach((id) => typeof id === 'string' && purchasedOrderIds.add(id));
    }
  } catch {}
}

async function persistDedupe(): Promise<void> {
  try {
    let arr = Array.from(purchasedOrderIds);
    if (arr.length > PURCHASE_DEDUPE_MAX) arr = arr.slice(-PURCHASE_DEDUPE_MAX);
    await AsyncStorage.setItem(PURCHASE_DEDUPE_KEY, JSON.stringify(arr));
  } catch {}
}

function isReady(): boolean {
  return Platform.OS !== 'web' && AppEventsLogger != null;
}

export async function initMetaSdk(): Promise<void> {
  console.log('[Meta] initMetaSdk() CALLED. platform=', Platform.OS, 'AppEventsLogger=', !!AppEventsLogger, 'Settings=', !!Settings);
  // Hydrate purchase dedupe set even on web so subsequent native installs share key behavior — cheap, safe.
  await hydrateDedupe();
  if (!isReady() || !Settings) {
    console.log('[Meta] SDK init SKIPPED (web or unavailable). isReady=', isReady(), 'Settings=', !!Settings);
    return;
  }
  try {
    console.log('[Meta] calling Settings.initializeSDK() ...');
    await Settings.initializeSDK();
    console.log('[Meta] Settings.initializeSDK() resolved');
    Settings.setAutoLogAppEventsEnabled(true);
    Settings.setAdvertiserIDCollectionEnabled(true);
    if (AEMReporter && Platform.OS === 'ios') {
      try { await AEMReporter.enable(); } catch {}
    }
    console.log('[Meta] SDK initialized');
  } catch (e) {
    console.log('[Meta] SDK init ERROR:', (e as Error).message, (e as Error).stack);
  }
}

export async function requestTrackingPermission(): Promise<'granted' | 'denied' | 'unavailable'> {
  if (Platform.OS !== 'ios') return 'unavailable';
  try {
    const tt = await import('expo-tracking-transparency');
    const { status: cur } = await tt.getTrackingPermissionsAsync();
    if (cur !== 'undetermined') {
      const granted = cur === 'granted';
      try {
        if (Settings) await Settings.setAdvertiserTrackingEnabled(granted);
      } catch {}
      console.log('[Meta] ATT already determined:', cur);
      return granted ? 'granted' : 'denied';
    }
    const { status } = await tt.requestTrackingPermissionsAsync();
    const granted = status === 'granted';
    try {
      if (Settings) await Settings.setAdvertiserTrackingEnabled(granted);
    } catch {}
    console.log('[Meta] ATT prompt result:', status);
    return granted ? 'granted' : 'denied';
  } catch (e) {
    console.log('[Meta] ATT error:', (e as Error).message);
    return 'unavailable';
  }
}

// EVENT: App Open — fired once when the app launches (after SDK init)
export function logAppOpen(): void {
  console.log('[Meta] logAppOpen() called, isReady=', isReady());
  if (!isReady()) {
    console.log('[Meta] App Open SKIPPED (SDK not ready)');
    return;
  }
  try {
    console.log('[Meta] firing event: fb_mobile_activate_app');
    if (TEST_EVENT_CODE) {
      AppEventsLogger.logEvent('fb_mobile_activate_app', 0, withTestCode({}));
    } else {
      AppEventsLogger.logEvent('fb_mobile_activate_app');
    }
    console.log('[Meta] App Open fired');
  } catch (e) {
    console.log('[Meta] App Open error:', (e as Error).message);
  }
}

// EVENT: View Content — fired on product detail screen mount
export function logViewContent(params: {
  contentId: string;
  contentName?: string;
  price?: number;
  currency?: string;
}): void {
  if (!isReady()) {
    console.log('[Meta] ViewContent SKIPPED (SDK not ready)');
    return;
  }
  try {
    const valueToSum = params.price && !isNaN(params.price) ? params.price : 0;
    console.log('[Meta] firing event: fb_mobile_content_view', { id: params.contentId, value: valueToSum });
    AppEventsLogger.logEvent('fb_mobile_content_view', valueToSum, withTestCode({
      fb_content_type: 'product',
      fb_content_id: params.contentId,
      fb_content: JSON.stringify([{ id: params.contentId, quantity: 1 }]),
      fb_currency: params.currency || CURRENCY,
      ...(params.contentName ? { fb_description: params.contentName } : {}),
    }));
    console.log('[Meta] ViewContent fired');
  } catch (e) {
    console.log('[Meta] ViewContent error:', (e as Error).message);
  }
}

// EVENT: Add To Cart — fired from CartContext.addToCart (centralized)
export function logAddToCart(params: {
  contentId: string;
  contentName?: string;
  price?: number;
  quantity?: number;
  currency?: string;
}): void {
  if (!isReady()) {
    console.log('[Meta] AddToCart SKIPPED (SDK not ready)');
    return;
  }
  try {
    const qty = params.quantity || 1;
    const unitPrice = params.price && !isNaN(params.price) ? params.price : 0;
    const valueToSum = unitPrice * qty;
    console.log('[Meta] firing event: fb_mobile_add_to_cart', { id: params.contentId, qty, value: valueToSum });
    AppEventsLogger.logEvent('fb_mobile_add_to_cart', valueToSum, withTestCode({
      fb_content_type: 'product',
      fb_content_id: params.contentId,
      fb_content: JSON.stringify([{ id: params.contentId, quantity: qty }]),
      fb_currency: params.currency || CURRENCY,
      ...(params.contentName ? { fb_description: params.contentName } : {}),
    }));
    console.log('[Meta] AddToCart fired');
  } catch (e) {
    console.log('[Meta] AddToCart error:', (e as Error).message);
  }
}

// EVENT: Initiate Checkout — fired when user starts the checkout/payment flow
export function logInitiateCheckout(params: {
  contentIds: string[];
  numItems: number;
  totalValue: number;
  currency?: string;
}): void {
  if (!isReady()) {
    console.log('[Meta] InitiateCheckout SKIPPED (SDK not ready)');
    return;
  }
  try {
    const value = params.totalValue && !isNaN(params.totalValue) ? params.totalValue : 0;
    console.log('[Meta] firing event: fb_mobile_initiated_checkout', { items: params.numItems, value });
    AppEventsLogger.logEvent('fb_mobile_initiated_checkout', value, withTestCode({
      fb_content_type: 'product',
      fb_content_id: JSON.stringify(params.contentIds),
      fb_content: JSON.stringify(params.contentIds.map(id => ({ id, quantity: 1 }))),
      fb_num_items: params.numItems,
      fb_currency: params.currency || CURRENCY,
    }));
    console.log('[Meta] InitiateCheckout fired');
  } catch (e) {
    console.log('[Meta] InitiateCheckout error:', (e as Error).message);
  }
}

// EVENT: Purchase — ONLY after order is confirmed in Shopify; deduped per orderId
export async function logPurchase(params: {
  orderId: string;
  totalValue: number;
  contentIds: string[];
  currency?: string;
}): Promise<void> {
  if (!isReady()) return;
  if (!params.orderId) {
    console.log('[Meta] Purchase blocked: missing orderId');
    return;
  }
  if (!params.totalValue || isNaN(params.totalValue) || params.totalValue <= 0) {
    console.log('[Meta] Purchase blocked: invalid value', params.totalValue);
    return;
  }
  // Make sure we've loaded persisted dedupe set before checking — prevents double-fire after app relaunch.
  await hydrateDedupe();
  if (purchasedOrderIds.has(params.orderId)) {
    console.log('[Meta] Purchase blocked: duplicate orderId', params.orderId);
    return;
  }
  try {
    purchasedOrderIds.add(params.orderId);
    persistDedupe();
    console.log('[Meta] firing event: Purchase', { orderId: params.orderId, value: params.totalValue });
    AppEventsLogger.logPurchase(params.totalValue, params.currency || CURRENCY, withTestCode({
      fb_content_type: 'product',
      fb_content_id: JSON.stringify(params.contentIds),
      fb_content: JSON.stringify(params.contentIds.map(id => ({ id, quantity: 1 }))),
      fb_order_id: params.orderId,
    }));
    console.log('[Meta] Purchase fired', {
      orderId: params.orderId,
      value: params.totalValue,
      currency: params.currency || CURRENCY,
    });
  } catch (e) {
    console.log('[Meta] Purchase error:', (e as Error).message);
  }
}
