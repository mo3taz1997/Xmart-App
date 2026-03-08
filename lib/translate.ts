import AsyncStorage from '@react-native-async-storage/async-storage';
const CACHE_PREFIX = 'translate_cache_';
const memoryCache: Record<string, string> = {};

function getApiUrl(): string {
  let host = process.env.EXPO_PUBLIC_DOMAIN;
  if (!host) throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  return `https://${host}`;
}

function isArabic(text: string): boolean {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  return arabicRegex.test(text);
}

export async function translateToArabic(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return text;
  if (isArabic(text)) return text;
  if (text.length < 3) return text;

  const cacheKey = CACHE_PREFIX + text.substring(0, 100);

  if (memoryCache[cacheKey]) return memoryCache[cacheKey];

  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      memoryCache[cacheKey] = cached;
      return cached;
    }
  } catch {}

  try {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang: 'ar' }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.translatedText) {
        memoryCache[cacheKey] = data.translatedText;
        try {
          await AsyncStorage.setItem(cacheKey, data.translatedText);
        } catch {}
        return data.translatedText;
      }
    }
  } catch {}

  return text;
}

export async function translateProduct(product: any, language: string): Promise<any> {
  if (language !== 'ar') return product;

  const titleNeedsTranslation = product.title && !isArabic(product.title);
  const descNeedsTranslation = product.description && !isArabic(product.description);

  if (!titleNeedsTranslation && !descNeedsTranslation) return product;

  const [translatedTitle, translatedDescription] = await Promise.all([
    titleNeedsTranslation ? translateToArabic(product.title) : Promise.resolve(product.title),
    descNeedsTranslation ? translateToArabic(product.description) : Promise.resolve(product.description),
  ]);

  return {
    ...product,
    title: translatedTitle,
    description: translatedDescription,
    originalTitle: product.title,
    originalDescription: product.description,
  };
}

export async function translateProducts(products: any[], language: string): Promise<any[]> {
  if (language !== 'ar') return products;
  return Promise.all(products.map(p => translateProduct(p, language)));
}

export async function translateText(text: string, language: string): Promise<string> {
  if (language !== 'ar') return text;
  return translateToArabic(text);
}
