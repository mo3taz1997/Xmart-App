import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let Settings: any = null;
let AppEventsLogger: any = null;
let AEMReporter: any = null;
let AppEvents: any = {};
let AppEventParams: any = {};

console.log('[Meta] module loading on platform:', Platform.OS);

if (Platform.OS !== 'web') {
  try {
    const fbsdk = require('react-native-fbsdk-next');
    Settings = fbsdk.Settings;
    AppEventsLogger = fbsdk.AppEventsLogger;
    AEMReporter = fbsdk.AEMReporter;
    // Pull native standard-event/param name constants from SDK (these map to the official Meta Standard Events).
    AppEvents = fbsdk.AppEvents || {};
    AppEventParams = fbsdk.AppEventParams || {};
    console.log('[Meta] FBSDK loaded — AppEventsLogger:', !!AppEventsLogger, 'AppEvents.InitiatedCheckout=', AppEvents.InitiatedCheckout, 'AppEvents.Purchased=', AppEvents.Purchased);
  } catch (e) {
    console.log('[Meta] FBSDK NOT available (likely Expo Go):', (e as Error).message);
  }
} else {
  console.log('[Meta] Skipping FBSDK on web');
}

// Standard event names — prefer SDK constants, fall back to documented raw strings if SDK constants are unavailable.
const EVT_ACTIVATE_APP = AppEvents.ActivatedApp || 'fb_mobile_activate_app';
const EVT_VIEWED_CONTENT = AppEvents.ViewedContent || 'fb_mobile_content_view';
const EVT_ADDED_TO_CART = AppEvents.AddedToCart || 'fb_mobile_add_to_cart';
const EVT_INITIATED_CHECKOUT = AppEvents.InitiatedCheckout || 'fb_mobile_initiated_checkout';
const EVT_PURCHASED = AppEvents.Purchased || 'fb_mobile_purchase';

// Standard parameter keys
const P_CONTENT = AppEventParams.Content || 'fb_content';
const P_CONTENT_ID = AppEventParams.ContentID || 'fb_content_id';
const P_CONTENT_TYPE = AppEventParams.ContentType || 'fb_content_type';
const P_CURRENCY = AppEventParams.Currency || 'fb_currency';
const P_NUM_ITEMS = AppEventParams.NumItems || 'fb_num_items';
const P_ORDER_ID = AppEventParams.OrderId || 'fb_order_id';
const P_DESCRIPTION = AppEventParams.Description || 'fb_description';

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
    console.log('[Meta] firing standard event:', EVT_ACTIVATE_APP);
    if (TEST_EVENT_CODE) {
      AppEventsLogger.logEvent(EVT_ACTIVATE_APP, 0, withTestCode({}));
    } else {
      AppEventsLogger.logEvent(EVT_ACTIVATE_APP);
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
    console.log('[Meta] firing standard event:', EVT_VIEWED_CONTENT, { id: params.contentId, value: valueToSum });
    AppEventsLogger.logEvent(EVT_VIEWED_CONTENT, valueToSum, withTestCode({
      [P_CONTENT_TYPE]: 'product',
      [P_CONTENT_ID]: params.contentId,
      [P_CONTENT]: JSON.stringify([{ id: params.contentId, quantity: 1 }]),
      [P_CURRENCY]: params.currency || CURRENCY,
      ...(params.contentName ? { [P_DESCRIPTION]: params.contentName } : {}),
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
    console.log('[Meta] firing standard event:', EVT_ADDED_TO_CART, { id: params.contentId, qty, value: valueToSum });
    AppEventsLogger.logEvent(EVT_ADDED_TO_CART, valueToSum, withTestCode({
      [P_CONTENT_TYPE]: 'product',
      [P_CONTENT_ID]: params.contentId,
      [P_CONTENT]: JSON.stringify([{ id: params.contentId, quantity: qty }]),
      [P_CURRENCY]: params.currency || CURRENCY,
      ...(params.contentName ? { [P_DESCRIPTION]: params.contentName } : {}),
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
    console.log('[Meta] firing standard event:', EVT_INITIATED_CHECKOUT, { items: params.numItems, value });
    AppEventsLogger.logEvent(EVT_INITIATED_CHECKOUT, value, withTestCode({
      [P_CONTENT_TYPE]: 'product',
      [P_CONTENT_ID]: JSON.stringify(params.contentIds),
      [P_CONTENT]: JSON.stringify(params.contentIds.map(id => ({ id, quantity: 1 }))),
      [P_NUM_ITEMS]: params.numItems,
      [P_CURRENCY]: params.currency || CURRENCY,
    }));
    console.log('[Meta] InitiateCheckout fired');
  } catch (e) {
    console.log('[Meta] InitiateCheckout error:', (e as Error).message);
  }
}

// EVENT: Purchase — ONLY after order is confirmed in Shopify; deduped per orderId.
// Uses AppEventsLogger.logPurchase() which natively fires the Meta Standard "Purchase" event
// (event name fb_mobile_purchase under the hood).
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
    const currency = params.currency || CURRENCY;
    console.log('[Meta] firing standard event: Purchase (logPurchase →', EVT_PURCHASED, ')', { orderId: params.orderId, value: params.totalValue, currency });

    // Primary: native logPurchase fires the official "Purchase" Standard Event.
    AppEventsLogger.logPurchase(params.totalValue, currency, withTestCode({
      [P_CONTENT_TYPE]: 'product',
      [P_CONTENT_ID]: JSON.stringify(params.contentIds),
      [P_CONTENT]: JSON.stringify(params.contentIds.map(id => ({ id, quantity: 1 }))),
      [P_ORDER_ID]: params.orderId,
      [P_NUM_ITEMS]: params.contentIds.length,
      [P_CURRENCY]: currency,
    }));

    console.log('[Meta] Purchase fired', {
      orderId: params.orderId,
      value: params.totalValue,
      currency,
    });
  } catch (e) {
    console.log('[Meta] Purchase error:', (e as Error).message);
  }
}
