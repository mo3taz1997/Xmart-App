function getApiUrl(): string {
  let host = process.env.EXPO_PUBLIC_DOMAIN;
  if (!host) {
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }
  return `https://${host}`;
}

function addLang(path: string, lang?: string): string {
  if (!lang) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}lang=${lang}`;
}

async function request(method: string, path: string, body?: any, token?: string) {
  const baseUrl = getApiUrl();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || json.errors?.[0]?.message || "Request failed");
  }

  return json;
}

export const api = {
  getHomepage: (lang?: string) => request("GET", lang ? `/api/homepage?lang=${lang}` : "/api/homepage"),
  getCollections: (lang?: string) => request("GET", addLang("/api/collections", lang)),
  getCollectionProducts: (handle: string, params?: Record<string, string>, lang?: string) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request("GET", addLang(`/api/collections/${handle}/products${qs}`, lang));
  },
  getCollectionFilters: (handle: string, lang?: string) =>
    request("GET", addLang(`/api/collections/${handle}/filters`, lang)),
  getProducts: (params?: Record<string, string>, lang?: string) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request("GET", addLang(`/api/products${qs}`, lang));
  },
  getProduct: (handle: string, lang?: string) => request("GET", addLang(`/api/products/${handle}`, lang)),
  getProductRecommendations: (productId: string, lang?: string) => request("GET", addLang(`/api/products/${encodeURIComponent(productId)}/recommendations`, lang)),
  searchProducts: (query: string, lang?: string, filters?: { minPrice?: number; maxPrice?: number; brand?: string; inStock?: boolean; limit?: number; offset?: number }) => {
    let path = `/api/search?q=${encodeURIComponent(query)}`;
    if (filters?.minPrice !== undefined) path += `&minPrice=${filters.minPrice}`;
    if (filters?.maxPrice !== undefined) path += `&maxPrice=${filters.maxPrice}`;
    if (filters?.brand) path += `&brand=${encodeURIComponent(filters.brand)}`;
    if (filters?.inStock) path += `&inStock=true`;
    if (filters?.limit !== undefined) path += `&limit=${filters.limit}`;
    if (filters?.offset !== undefined) path += `&offset=${filters.offset}`;
    return request("GET", addLang(path, lang));
  },
  searchSuggest: (query: string, lang?: string) =>
    request("GET", addLang(`/api/search/suggest?q=${encodeURIComponent(query)}`, lang)),
  translateText: (text: string, targetLang: string) => request("POST", "/api/translate", { text, targetLang }),

  getCart: (cartId: string) => request("GET", `/api/cart/${encodeURIComponent(cartId)}`),
  createCart: (lines?: any[]) => request("POST", "/api/cart/create", { lines }),
  addToCart: (cartId: string, lines: any[]) => request("POST", "/api/cart/add", { cartId, lines }),
  updateCart: (cartId: string, lines: any[]) => request("POST", "/api/cart/update", { cartId, lines }),
  removeFromCart: (cartId: string, lineIds: string[]) => request("POST", "/api/cart/remove", { cartId, lineIds }),
  applyDiscount: (cartId: string, discountCodes: string[]) => request("POST", "/api/cart/discount", { cartId, discountCodes }),
  updateBuyerIdentity: (data: {
    cartId: string;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    address?: string;
    city?: string;
    countryCode?: string;
  }) => request("POST", "/api/cart/buyer-identity", data),
  updateCartNote: (cartId: string, note: string) => request("POST", "/api/cart/note", { cartId, note }),
  autoCompleteCheckout: (data: {
    checkoutUrl: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    address?: string;
    city?: string;
    notes?: string;
  }) => request("POST", "/api/checkout/auto-complete", data),

  createCheckout: (data: {
    items: Array<{ variantId: string; quantity: number }>;
    email: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    address?: string;
    city?: string;
    notes?: string;
  }) => request("POST", "/api/checkout/create", data),

  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    request("POST", "/api/auth/register", data),
  login: (data: { email: string; password: string }) =>
    request("POST", "/api/auth/login", data),
  recover: (email: string) => request("POST", "/api/auth/recover", { email }),
  getCustomer: (token: string, lang?: string) => request("GET", addLang("/api/customer", lang), undefined, token),
  updateCustomer: (token: string, data: { firstName?: string; lastName?: string; email?: string; phone?: string; password?: string }) =>
    request("PUT", "/api/customer/update", data, token),
  deleteAccount: (token: string) => request("DELETE", "/api/customer", undefined, token),

  getShippingRates: () => request("GET", "/api/shipping-rates"),
  validateDiscount: (code: string, cartId: string, items?: Array<{ variantId: string; quantity: number }>) => request("POST", "/api/validate-discount", { code, cartId, items }),

  placeOrder: (data: {
    cartId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address?: string;
    city?: string;
    notes?: string;
    items: Array<{
      productTitle: string;
      variantTitle?: string;
      variantId: string;
      quantity: number;
      price: string;
      currency: string;
      imageUrl?: string;
    }>;
    subtotal: string;
    total: string;
    currency: string;
    discountCode?: string;
    discountType?: string;
    discountValue?: string;
    shippingCost?: string;
    shippingName?: string;
  }) => request("POST", "/api/orders", data),

  getOrders: (email: string, token?: string) => request("GET", `/api/orders?email=${encodeURIComponent(email)}`, undefined, token),
  getDeliveryCodes: (orderNames: string[]) => request("POST", `/api/orders/delivery-codes`, { orderNames }),


  getCustomerAddresses: (token: string) => request("GET", "/api/customer/addresses", undefined, token),
  createCustomerAddress: (token: string, data: { firstName: string; lastName: string; phone: string; address1?: string; city?: string; company?: string }) =>
    request("POST", "/api/customer/addresses", data, token),
  updateCustomerAddress: (token: string, addressId: string, data: { firstName: string; lastName: string; phone: string; address1?: string; city?: string; company?: string }) =>
    request("PUT", `/api/customer/addresses/${addressId}`, data, token),
  deleteCustomerAddress: (token: string, addressId: string) =>
    request("DELETE", `/api/customer/addresses/${addressId}`, undefined, token),
  setDefaultAddress: (token: string, addressId: string) =>
    request("POST", `/api/customer/addresses/${addressId}/default`, {}, token),

  getCartUpsell: (handles: string[], lang?: string) =>
    request("POST", addLang("/api/cart-upsell", lang), { handles }),
  getTrendingProducts: (lang?: string) =>
    request("GET", addLang("/api/trending-products?limit=12", lang)),
  getSalesCounts: () => request("GET", "/api/sales-counts"),
  getCategories: () => request("GET", "/api/categories"),
  getSuggestedProducts: (lang?: string) => request("GET", addLang("/api/suggested-products", lang)),
  getNotifications: () => request("GET", "/api/notifications"),
  registerPushToken: (token: string, platform: string) => request("POST", "/api/push-token", { token, platform }),
  getLatestOrder: (email: string) => request("GET", `/api/latest-order?email=${encodeURIComponent(email)}`),
  batchStockStatus: (handles: string[]) => request("POST", "/api/stock-status", { handles }),
};
