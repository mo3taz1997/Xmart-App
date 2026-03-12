import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { shopifyFetch, shopifyAdminFetch, shopifyAdminGraphQL, extractNumericId, QUERIES, ADMIN_QUERIES, mapAdminProduct } from "./shopify";
import { autoCompleteCheckout } from "./checkout-complete";
import { db } from "./db";
import { homepageSections, homepageBanners, appSettings, orders, orderItems, notifications, categories, suggestedProducts, pushTokens } from "../shared/schema";
import { asc, desc, eq, sql, inArray } from "drizzle-orm";
import { advancedSearch, getAutocompleteSuggestions, trackSearch, syncProductIndex, startPeriodicSync, getSearchAnalytics, quickStockRefresh, batchStockStatus } from "./search-engine";

function fixCheckoutUrl(cart: any): any {
  if (cart?.checkoutUrl && cart.checkoutUrl.startsWith('http://')) {
    cart.checkoutUrl = cart.checkoutUrl.replace('http://', 'https://');
  }
  return cart;
}

function toAbsoluteUrl(url: string | null | undefined, req: Request): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) {
    const fwdProto = (req.headers['x-forwarded-proto'] as string || req.protocol || 'https').split(',')[0].trim();
    const fwdHost = ((req.headers['x-forwarded-host'] as string) || '').split(',')[0].trim() || (req.headers.host as string) || '';
    return `${fwdProto}://${fwdHost}${url}`;
  }
  return url;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/collections", async (req: Request, res: Response) => {
    try {
      const lang = ((req.query.lang as string) || "AR").toUpperCase();
      const language = lang === 'EN' ? 'EN' : 'AR';
      const data = await shopifyFetch(QUERIES.COLLECTIONS, { first: 250, language });
      const collections = data.collections.edges.map((edge: any) => edge.node);
      res.json(collections);
    } catch (error: any) {
      console.error("Error fetching collections:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  let _salesCountCache: { data: Record<string, number>; at: number } | null = null;
  const SALES_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  app.get("/api/sales-counts", async (_req: Request, res: Response) => {
    try {
      if (_salesCountCache && Date.now() - _salesCountCache.at < SALES_CACHE_TTL) {
        return res.json(_salesCountCache.data);
      }

      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const map: Record<string, number> = {};
      let cursor: string | null = null;

      while (true) {
        const afterClause = cursor ? `, after: "${cursor}"` : '';
        const data = await shopifyAdminGraphQL(`
          query {
            orders(first: 250${afterClause}, query: "created_at:>${since}") {
              pageInfo { hasNextPage endCursor }
              edges {
                node {
                  lineItems(first: 100) {
                    edges {
                      node {
                        quantity
                        product { handle }
                      }
                    }
                  }
                }
              }
            }
          }
        `);

        const orders = data?.orders?.edges || [];
        for (const { node: order } of orders) {
          for (const { node: item } of (order.lineItems?.edges || [])) {
            const handle = item.product?.handle;
            if (handle) map[handle] = (map[handle] || 0) + item.quantity;
          }
        }

        if (data?.orders?.pageInfo?.hasNextPage) {
          cursor = data.orders.pageInfo.endCursor;
        } else {
          break;
        }
      }

      _salesCountCache = { data: map, at: Date.now() };
      res.json(map);
    } catch (error: any) {
      console.error('[sales-counts]', error.message);
      res.json({});
    }
  });

  app.get("/api/trending-products", async (req: Request, res: Response) => {
    try {
      const lang = (req.query.lang as string) || 'AR';
      const shopifyLang = lang.toUpperCase() === 'EN' ? 'EN' : 'AR';
      const limit = parseInt(req.query.limit as string) || 12;

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const salesMap: Record<string, number> = {};
      let cursor: string | null = null;

      while (true) {
        const afterClause = cursor ? `, after: "${cursor}"` : '';
        const data = await shopifyAdminGraphQL(`
          query {
            orders(first: 100${afterClause}, query: "created_at:>${since}") {
              pageInfo { hasNextPage endCursor }
              edges {
                node {
                  lineItems(first: 50) {
                    edges {
                      node {
                        quantity
                        product { handle }
                      }
                    }
                  }
                }
              }
            }
          }
        `);
        const orders = data?.orders?.edges || [];
        for (const { node: order } of orders) {
          for (const { node: item } of (order.lineItems?.edges || [])) {
            const handle = item.product?.handle;
            if (handle) salesMap[handle] = (salesMap[handle] || 0) + item.quantity;
          }
        }
        if (data?.orders?.pageInfo?.hasNextPage) {
          cursor = data.orders.pageInfo.endCursor;
        } else {
          break;
        }
      }

      const topHandles = Object.entries(salesMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([handle]) => handle);

      if (topHandles.length === 0) {
        const fallback = await shopifyFetch(QUERIES.GET_PRODUCTS, {
          first: limit, sortKey: 'BEST_SELLING', reverse: false, language: shopifyLang
        });
        return res.json(fallback?.products?.edges?.map((e: any) => e.node) || []);
      }

      const productFetches = topHandles.map(h =>
        shopifyFetch(QUERIES.PRODUCT_BY_HANDLE, { handle: h, language: shopifyLang })
          .then(d => d?.product || null)
          .catch(() => null)
      );
      const products = (await Promise.all(productFetches)).filter(
        (p: any) => p && p.availableForSale
      );

      res.json(products);
    } catch (error: any) {
      console.error('[trending-products]', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/collections/:handle/products", async (req: Request, res: Response) => {
    try {
      const { handle } = req.params;
      const first = parseInt(req.query.first as string) || 20;
      const after = (req.query.after as string) || undefined;
      const rawSortKey = (req.query.sortKey as string) || "RANDOM";
      const isRandom = rawSortKey === "RANDOM";
      const sortKey = isRandom ? "BEST_SELLING" : rawSortKey;
      const reverse = req.query.reverse === "true";
      const lang = ((req.query.lang as string) || "AR").toUpperCase();
      const language = lang === 'EN' ? 'EN' : 'AR';
      const filters: any[] = [];

      if (req.query.minPrice || req.query.maxPrice) {
        const priceFilter: any = {};
        if (req.query.minPrice) priceFilter.min = parseFloat(req.query.minPrice as string);
        if (req.query.maxPrice) priceFilter.max = parseFloat(req.query.maxPrice as string);
        filters.push({ price: priceFilter });
      }

      if (req.query.available === "true") {
        filters.push({ available: true });
      }
      if (req.query.available === "false") {
        filters.push({ available: false });
      }

      const data = await shopifyFetch(QUERIES.COLLECTION_PRODUCTS, {
        handle,
        first,
        after,
        sortKey,
        reverse,
        filters: filters.length > 0 ? filters : undefined,
        language,
      });

      const collection = data.collection;
      if (!collection) {
        return res.status(404).json({ error: "Collection not found" });
      }

      let products = collection.products.edges.map((edge: any) => edge.node);
      if (isRandom) {
        for (let i = products.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [products[i], products[j]] = [products[j], products[i]];
        }
      }
      const pageInfo = collection.products.pageInfo;
      res.json({
        collection: {
          id: collection.id,
          title: collection.title,
          handle: collection.handle,
          description: collection.description,
        },
        products,
        pageInfo,
      });
    } catch (error: any) {
      console.error("Error fetching collection products:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products", async (req: Request, res: Response) => {
    try {
      const first = parseInt(req.query.first as string) || 20;
      const after = (req.query.after as string) || undefined;
      const rawSortKey2 = (req.query.sortKey as string) || "RANDOM";
      const isRandom2 = rawSortKey2 === "RANDOM";
      const sortKey = isRandom2 ? "BEST_SELLING" : rawSortKey2;
      const reverse = req.query.reverse === "true";
      const query = (req.query.query as string) || '';
      const withPageInfo = req.query.pageInfo === "true";
      const lang = ((req.query.lang as string) || "AR").toUpperCase();
      const language = lang === 'EN' ? 'EN' : 'AR';
      const availableFilter = req.query.available as string | undefined;

      const data = await shopifyFetch(QUERIES.PRODUCTS, {
        first,
        after,
        sortKey,
        reverse,
        query: query || undefined,
        language,
      });

      let products = data.products.edges.map((edge: any) => edge.node);

      if (availableFilter === 'true') {
        products = products.filter((p: any) => p.availableForSale !== false);
      } else if (availableFilter === 'false') {
        products = products.filter((p: any) => p.availableForSale === false);
      }

      if (isRandom2) {
        for (let i = products.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [products[i], products[j]] = [products[j], products[i]];
        }
      }
      if (withPageInfo) {
        res.json({ products, pageInfo: data.products.pageInfo });
      } else {
        res.json(products);
      }
    } catch (error: any) {
      console.error("Error fetching products:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/:handle", async (req: Request, res: Response) => {
    try {
      const { handle } = req.params;
      const lang = ((req.query.lang as string) || "AR").toUpperCase();
      const language = lang === 'EN' ? 'EN' : 'AR';
      const data = await shopifyFetch(QUERIES.PRODUCT_BY_HANDLE, { handle, language });
      const product = data.product;
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      console.error("Error fetching product:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/:productId/recommendations", async (req: Request, res: Response) => {
    try {
      const lang = ((req.query.lang as string) || "AR").toUpperCase();
      const language = lang === 'EN' ? 'EN' : 'AR';
      const { productId } = req.params;
      const data = await shopifyFetch(QUERIES.PRODUCT_RECOMMENDATIONS, { productId, language });
      const products = data.productRecommendations || [];
      res.json(products);
    } catch (error: any) {
      console.error("Error fetching product recommendations:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/cart-upsell", async (req: Request, res: Response) => {
    try {
      const { handles } = req.body;
      const lang = (req.query.lang as string) || 'AR';
      const shopifyLang = lang.toUpperCase() === 'EN' ? 'EN' : 'AR';
      const excludeSet = new Set<string>(handles || []);

      const productIdFetches = (handles || []).slice(0, 5).map((h: string) =>
        shopifyFetch(QUERIES.PRODUCT_BY_HANDLE, { handle: h, language: shopifyLang })
          .then(d => d?.product?.id as string | null)
          .catch(() => null)
      );
      const productIds = (await Promise.all(productIdFetches)).filter(Boolean) as string[];

      const perProduct: Map<string, any[]> = new Map();
      if (productIds.length > 0) {
        const recFetches = productIds.map((pid: string) =>
          shopifyFetch(QUERIES.PRODUCT_RECOMMENDATIONS, {
            productId: pid,
            language: shopifyLang,
          }).then(data => ({ pid, data })).catch(() => ({ pid, data: null }))
        );
        const results = await Promise.all(recFetches);
        for (const { pid, data } of results) {
          if (data?.productRecommendations) {
            const valid = data.productRecommendations.filter(
              (p: any) => p.availableForSale && !excludeSet.has(p.handle)
            );
            perProduct.set(pid, valid);
          }
        }
      }

      const seen = new Set<string>();
      const diverse: any[] = [];
      const maxRounds = 12;
      for (let round = 0; round < maxRounds && diverse.length < 12; round++) {
        for (const [, recs] of perProduct) {
          if (round < recs.length) {
            const p = recs[round];
            if (!seen.has(p.handle)) {
              seen.add(p.handle);
              diverse.push(p);
              if (diverse.length >= 12) break;
            }
          }
        }
      }

      for (let i = diverse.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [diverse[i], diverse[j]] = [diverse[j], diverse[i]];
      }

      res.json(diverse);
    } catch (error: any) {
      console.error("Error fetching cart upsell:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json({ products: [], totalCount: 0, suggestions: [], brands: [], priceRange: { min: 0, max: 0 } });
      }
      const language = (req.query.lang as string)?.toLowerCase() || 'en';
      const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
      const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
      const brand = req.query.brand as string | undefined;
      const inStock = req.query.inStock === 'true';
      const limit = parseInt(req.query.limit as string) || 30;
      const offset = parseInt(req.query.offset as string) || 0;

      const results = await advancedSearch({
        query, language, minPrice, maxPrice, brand, inStock, limit, offset,
      });

      trackSearch(query, results.totalCount, language).catch(() => {});

      if (results.products.length === 0) {
        try {
          const [enData, arData] = await Promise.all([
            shopifyFetch(QUERIES.SEARCH_PRODUCTS, { query, first: limit, language: 'EN' }),
            shopifyFetch(QUERIES.SEARCH_PRODUCTS, { query, first: limit, language: 'AR' }),
          ]);
          const enProducts = (enData.products?.edges || []).map((edge: any) => edge.node);
          const arProducts = (arData.products?.edges || []).map((edge: any) => edge.node);

          const arMap = new Map<string, any>();
          arProducts.forEach((p: any) => { if (p.id) arMap.set(p.id, p); });

          const mergedProducts = enProducts.map((p: any) => {
            const ar = arMap.get(p.id);
            return {
              ...p,
              titleAr: ar?.title || p.title,
              titleEn: p.title,
              title: language === 'ar' && ar?.title ? ar.title : p.title,
              description: language === 'ar' && ar?.description ? ar.description : p.description,
            };
          });

          if (mergedProducts.length === 0 && arProducts.length > 0) {
            arProducts.forEach((p: any) => {
              if (!mergedProducts.find((m: any) => m.id === p.id)) {
                mergedProducts.push({ ...p, titleAr: p.title, titleEn: p.title });
              }
            });
          }

          if (mergedProducts.length > 0) {
            for (let i = mergedProducts.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [mergedProducts[i], mergedProducts[j]] = [mergedProducts[j], mergedProducts[i]];
            }
            const sfLang = language === 'ar' ? 'AR' : 'EN';
            const collectionData = await shopifyFetch(QUERIES.COLLECTIONS, { first: 250, language: sfLang });
            const allCollections = collectionData.collections.edges.map((edge: any) => edge.node);
            const q = query.toLowerCase();
            const matchingCollections = allCollections
              .filter((c: any) =>
                c.title?.toLowerCase().includes(q) ||
                c.handle?.toLowerCase().includes(q)
              )
              .slice(0, 8);

            const vendorMap = new Map<string, number>();
            mergedProducts.forEach((p: any) => {
              if (p.vendor) vendorMap.set(p.vendor, (vendorMap.get(p.vendor) || 0) + 1);
            });

            return res.json({
              products: mergedProducts,
              totalCount: mergedProducts.length,
              suggestions: [],
              brands: Array.from(vendorMap.entries()).map(([name, count]) => ({ name, count })),
              collections: matchingCollections,
              priceRange: { min: 0, max: 0 },
              source: 'shopify_fallback',
            });
          }
        } catch (fallbackErr: any) {
          console.warn("[Search] Shopify fallback also failed:", fallbackErr.message);
        }
      }

      if (results.products.length > 0) {
        try {
          const handles = results.products.map((p: any) => p.handle).filter(Boolean).slice(0, 20);
          if (handles.length > 0) {
            const handleFilter = handles.map((h: string) => `handle:${h}`).join(' OR ');
            const stockData = await shopifyFetch(`query CheckStock($query: String!) { products(first: 50, query: $query) { edges { node { handle availableForSale } } } }`, { query: handleFilter });
            const stockMap: Record<string, boolean> = {};
            (stockData.products?.edges || []).forEach((e: any) => { stockMap[e.node.handle] = e.node.availableForSale; });
            results.products = results.products.map((p: any) => ({
              ...p,
              availableForSale: p.handle in stockMap ? stockMap[p.handle] : p.availableForSale,
            }));
          }
        } catch (stockErr: any) {
          console.warn("[Search] Stock verification failed:", stockErr.message);
        }
      }
      res.json(results);
    } catch (error: any) {
      console.error("Error searching products:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/search/suggest", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      const language = (req.query.lang as string)?.toLowerCase() || 'en';
      if (!query || query.length < 1) {
        return res.json({ products: [], categories: [], popular: [] });
      }
      const suggestions = await getAutocompleteSuggestions(query, language);
      if (suggestions.products.length === 0 && query.length >= 2) {
        try {
          const sfLang = language === 'ar' ? 'AR' : 'EN';
          const sfData = await shopifyFetch(QUERIES.SEARCH_PRODUCTS, { query, first: 8, language: sfLang });
          const sfProducts = (sfData.products?.edges || []).map((e: any) => {
            const n = e.node;
            return {
              title: n.title,
              handle: n.handle,
              imageUrl: n.images?.edges?.[0]?.node?.url || null,
              price: n.priceRange?.minVariantPrice?.amount || '0',
              vendor: n.vendor || null,
            };
          });
          if (sfProducts.length > 0) {
            suggestions.products = sfProducts;
          }
        } catch (sfErr: any) {
          console.warn("[Suggest] Shopify fallback failed:", sfErr.message);
        }
      }
      res.json(suggestions);
    } catch (error: any) {
      console.error("Error getting suggestions:", error.message);
      res.json({ products: [], categories: [], popular: [] });
    }
  });

  app.post("/api/search/sync", async (_req: Request, res: Response) => {
    try {
      const count = await syncProductIndex();
      res.json({ success: true, productsIndexed: count });
    } catch (error: any) {
      console.error("Error syncing search index:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/search/analytics", async (_req: Request, res: Response) => {
    try {
      const analytics = await getSearchAnalytics();
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stock-status", async (req: Request, res: Response) => {
    try {
      const { handles } = req.body;
      if (!handles || !Array.isArray(handles) || handles.length === 0) {
        return res.json({});
      }
      const statusMap = await batchStockStatus(handles);
      res.json(statusMap);
    } catch (error: any) {
      console.error("Error fetching stock status:", error.message);
      res.json({});
    }
  });

  app.get("/api/cart/:cartId", async (req: Request, res: Response) => {
    try {
      const { cartId } = req.params;
      const data = await shopifyFetch(QUERIES.GET_CART, { cartId });
      if (!data.cart) {
        return res.status(404).json({ error: "Cart not found" });
      }
      res.json(fixCheckoutUrl(data.cart));
    } catch (error: any) {
      console.error("Error fetching cart:", error.message);
      res.status(404).json({ error: error.message });
    }
  });

  app.post("/api/cart/create", async (req: Request, res: Response) => {
    try {
      const { lines } = req.body;
      const data = await shopifyFetch(QUERIES.CREATE_CART, {
        input: { lines: lines || [] },
      });

      if (data.cartCreate.userErrors?.length > 0) {
        return res.status(400).json({ errors: data.cartCreate.userErrors });
      }

      const cart = fixCheckoutUrl(data.cartCreate.cart);
      console.log("[Cart Create] checkoutUrl:", cart?.checkoutUrl);
      res.json(cart);
    } catch (error: any) {
      console.error("Error creating cart:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/cart/add", async (req: Request, res: Response) => {
    try {
      const { cartId, lines } = req.body;
      const data = await shopifyFetch(QUERIES.ADD_TO_CART, { cartId, lines });

      if (data.cartLinesAdd.userErrors?.length > 0) {
        return res.status(400).json({ errors: data.cartLinesAdd.userErrors });
      }

      res.json(fixCheckoutUrl(data.cartLinesAdd.cart));
    } catch (error: any) {
      console.error("Error adding to cart:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/cart/update", async (req: Request, res: Response) => {
    try {
      const { cartId, lines } = req.body;
      const data = await shopifyFetch(QUERIES.UPDATE_CART_LINES, { cartId, lines });

      if (data.cartLinesUpdate.userErrors?.length > 0) {
        return res.status(400).json({ errors: data.cartLinesUpdate.userErrors });
      }

      res.json(fixCheckoutUrl(data.cartLinesUpdate.cart));
    } catch (error: any) {
      console.error("Error updating cart:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/cart/remove", async (req: Request, res: Response) => {
    try {
      const { cartId, lineIds } = req.body;
      const data = await shopifyFetch(QUERIES.REMOVE_CART_LINES, { cartId, lineIds });

      if (data.cartLinesRemove.userErrors?.length > 0) {
        return res.status(400).json({ errors: data.cartLinesRemove.userErrors });
      }

      res.json(fixCheckoutUrl(data.cartLinesRemove.cart));
    } catch (error: any) {
      console.error("Error removing from cart:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/cart/discount", async (req: Request, res: Response) => {
    try {
      const { cartId, discountCodes } = req.body;
      const data = await shopifyFetch(QUERIES.APPLY_DISCOUNT, { cartId, discountCodes });

      if (data.cartDiscountCodesUpdate.userErrors?.length > 0) {
        return res.status(400).json({ errors: data.cartDiscountCodesUpdate.userErrors });
      }

      res.json(fixCheckoutUrl(data.cartDiscountCodesUpdate.cart));
    } catch (error: any) {
      console.error("Error applying discount:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      const data = await shopifyFetch(QUERIES.CUSTOMER_CREATE, {
        input: { email, password, firstName, lastName },
      });

      if (data.customerCreate.customerUserErrors?.length > 0) {
        return res.status(400).json({ errors: data.customerCreate.customerUserErrors });
      }

      const tokenData = await shopifyFetch(QUERIES.CUSTOMER_ACCESS_TOKEN_CREATE, {
        input: { email, password },
      });

      if (tokenData.customerAccessTokenCreate.customerUserErrors?.length > 0) {
        return res.status(400).json({ errors: tokenData.customerAccessTokenCreate.customerUserErrors });
      }

      res.json({
        customer: data.customerCreate.customer,
        accessToken: tokenData.customerAccessTokenCreate.customerAccessToken,
      });
    } catch (error: any) {
      console.error("Error registering:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const data = await shopifyFetch(QUERIES.CUSTOMER_ACCESS_TOKEN_CREATE, {
        input: { email, password },
      });

      if (data.customerAccessTokenCreate.customerUserErrors?.length > 0) {
        return res.status(400).json({ errors: data.customerAccessTokenCreate.customerUserErrors });
      }

      const token = data.customerAccessTokenCreate.customerAccessToken;
      const customerData = await shopifyFetch(QUERIES.GET_CUSTOMER, {
        customerAccessToken: token.accessToken,
      });

      res.json({
        customer: customerData.customer,
        accessToken: token,
      });
    } catch (error: any) {
      console.error("Error logging in:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/recover", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const data = await shopifyFetch(QUERIES.CUSTOMER_RECOVER, { email });

      if (data.customerRecover.customerUserErrors?.length > 0) {
        return res.status(400).json({ errors: data.customerRecover.customerUserErrors });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error recovering:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/customer", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return res.status(401).json({ error: "No token provided" });
      }

      const lang = ((req.query.lang as string) || "EN").toUpperCase();

      const data = await shopifyFetch(QUERIES.GET_CUSTOMER, {
        customerAccessToken: token,
        language: lang,
      });

      if (!data.customer) {
        console.error("[Customer] No customer returned. Data:", JSON.stringify(data).substring(0, 500));
        return res.status(401).json({ error: "Invalid token" });
      }

      const orderCount = data.customer?.orders?.edges?.length || 0;
      console.log(`[Customer] Fetched customer ${data.customer.email} with ${orderCount} orders`);

      res.json(data.customer);
    } catch (error: any) {
      console.error("Error fetching customer:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/customer/update", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return res.status(401).json({ error: "No token provided" });
      }

      const { firstName, lastName, email, phone, password } = req.body;
      const customerInput: Record<string, string> = {};
      if (firstName !== undefined) customerInput.firstName = firstName;
      if (lastName !== undefined) customerInput.lastName = lastName;
      if (email !== undefined) customerInput.email = email;
      if (phone !== undefined && phone.trim() !== '') {
        let cleanPhone = phone.trim().replace(/\s+/g, '');
        if (!cleanPhone.startsWith('+')) {
          cleanPhone = '+' + cleanPhone;
        }
        customerInput.phone = cleanPhone;
      } else if (phone === '') {
        customerInput.phone = '';
      }
      if (password !== undefined) customerInput.password = password;

      console.log("[CustomerUpdate] Updating fields:", Object.keys(customerInput));

      const data = await shopifyFetch(QUERIES.CUSTOMER_UPDATE, {
        customerAccessToken: token,
        customer: customerInput,
      });

      if (data.customerUpdate?.customerUserErrors?.length > 0) {
        const errors = data.customerUpdate.customerUserErrors;
        console.log("[CustomerUpdate] Shopify errors:", JSON.stringify(errors));
        const errorMsg = errors.map((e: any) => {
          const field = e.field?.join?.('.') || e.field || '';
          return `${field}: ${e.message}`;
        }).join('; ');
        return res.status(400).json({ errors, error: errorMsg });
      }

      if (!data.customerUpdate?.customer) {
        console.log("[CustomerUpdate] No customer returned:", JSON.stringify(data));
        return res.status(500).json({ error: "Update failed" });
      }

      console.log("[CustomerUpdate] Success");
      res.json({
        customer: data.customerUpdate.customer,
        accessToken: data.customerUpdate.customerAccessToken,
      });
    } catch (error: any) {
      console.error("[CustomerUpdate] Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  const translationCache: Record<string, string> = {};

  async function translateWithGoogle(text: string, sourceLang: string, targetLang: string): Promise<string> {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) return text;
    const data = await response.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      return data[0].map((seg: any) => seg[0]).join('');
    }
    return text;
  }

  app.post("/api/translate", async (req: Request, res: Response) => {
    try {
      const { text, targetLang } = req.body;
      if (!text || !targetLang) {
        return res.status(400).json({ error: "Missing text or targetLang" });
      }

      const cacheKey = `${targetLang}:${text.substring(0, 200)}`;
      if (translationCache[cacheKey]) {
        return res.json({ translatedText: translationCache[cacheKey] });
      }

      const sourceLang = "en";
      const translated = await translateWithGoogle(text, sourceLang, targetLang);

      if (translated && translated !== text) {
        translationCache[cacheKey] = translated;
      }

      res.json({ translatedText: translated });
    } catch (error: any) {
      console.error("Translation error:", error.message);
      res.json({ translatedText: req.body.text });
    }
  });

  app.get("/api/homepage", async (req: Request, res: Response) => {
    try {
      const lang = ((req.query.lang as string) || "").toLowerCase();

      const allSections = await db
        .select()
        .from(homepageSections)
        .orderBy(asc(homepageSections.sortOrder));

      const specialTypes = ['best_selling', 'new_arrivals', 'hero_banner', 'mid_banner', 'category_row', 'selected_categories'];

      const filteredSections = allSections.filter(s => {
        if (specialTypes.includes(s.type)) return true;
        return s.visible;
      });

      const sectionsWithBanners = await Promise.all(
        filteredSections.map(async (section) => {
          const allBanners = await db
            .select()
            .from(homepageBanners)
            .where(sql`${homepageBanners.sectionId} = ${section.id} AND ${homepageBanners.visible} = true`)
            .orderBy(asc(homepageBanners.sortOrder));
          const banners = allBanners.filter(b => {
            const bLang = ((b as any).language ?? 'both').trim();
            if (bLang === 'both' || bLang === '') return true;
            if (!lang || lang === '') return true;
            return bLang === lang;
          });

          let selectedCategories: any[] = [];
          if (section.type === 'selected_categories' && (section as any).metadata) {
            try {
              const meta = JSON.parse((section as any).metadata);
              const handles: string[] = meta.collectionHandles || [];
              const legacyIds: string[] = meta.categoryIds || [];
              if (handles.length > 0) {
                // Fetch collection info from Shopify (AR + EN)
                const [arData, enData] = await Promise.all([
                  shopifyFetch(QUERIES.COLLECTIONS, { first: 250, language: 'AR' }),
                  shopifyFetch(QUERIES.COLLECTIONS, { first: 250, language: 'EN' }),
                ]);
                const arCols: any[] = arData.collections.edges.map((e: any) => e.node);
                const enCols: any[] = enData.collections.edges.map((e: any) => e.node);
                const arByHandle: Record<string, any> = {};
                arCols.forEach((c: any) => { arByHandle[c.handle] = c; });
                selectedCategories = handles
                  .map(h => {
                    const en = enCols.find((c: any) => c.handle === h);
                    const ar = arByHandle[h];
                    return en ? {
                      id: h,
                      titleAr: ar?.title || en.title,
                      titleEn: en.title,
                      imageUrl: en.image?.url || ar?.image?.url || null,
                      collectionHandle: h,
                    } : null;
                  })
                  .filter(Boolean);
              } else if (legacyIds.length > 0) {
                // Backward compat: old format using DB category IDs
                const allCats = await db.select().from(categories).where(inArray(categories.id, legacyIds));
                selectedCategories = legacyIds
                  .map(id => allCats.find((c: any) => String(c.id) === String(id)))
                  .filter(Boolean)
                  .map((c: any) => ({
                    id: c.id,
                    titleAr: c.titleAr,
                    titleEn: c.titleEn,
                    imageUrl: c.imageUrl,
                    collectionHandle: c.collectionHandle,
                  }));
              }
            } catch {}
          }

          // Parse multi_collection tabs
          let multiTabs: any[] = [];
          if (section.type === 'multi_collection' && (section as any).metadata) {
            try { multiTabs = JSON.parse((section as any).metadata).tabs || []; } catch {}
          }

          // Parse collection_showcase collections
          let showcaseCollections: any[] = [];
          if (section.type === 'collection_showcase' && (section as any).metadata) {
            try { showcaseCollections = JSON.parse((section as any).metadata).collections || []; } catch {}
          }

          // Parse brands_strip
          let brands: any[] = [];
          if (section.type === 'brands_strip' && (section as any).metadata) {
            try {
              brands = (JSON.parse((section as any).metadata).brands || []).map((b: any) => ({
                ...b,
                imageUrl: toAbsoluteUrl(b.imageUrl, req) || b.imageUrl,
              }));
            } catch {}
          }

          // Parse featured_products / product_slider
          let featuredProducts: any[] = [];
          if ((section.type === 'featured_products' || section.type === 'product_slider') && (section as any).metadata) {
            try { featuredProducts = JSON.parse((section as any).metadata).products || []; } catch {}

            // Auto-enrich: fetch vendor from Shopify for products missing it
            const missingVendor = featuredProducts.filter((p: any) => !p.vendor && p.handle);
            if (missingVendor.length > 0) {
              try {
                const vendorResults = await Promise.all(
                  missingVendor.map((p: any) =>
                    shopifyFetch(QUERIES.PRODUCT_BY_HANDLE, { handle: p.handle, language: 'EN' })
                      .then((d: any) => ({ handle: p.handle, vendor: d?.product?.vendor || '' }))
                      .catch(() => ({ handle: p.handle, vendor: '' }))
                  )
                );
                const vendorMap: Record<string, string> = {};
                vendorResults.forEach((r: any) => { if (r.vendor) vendorMap[r.handle] = r.vendor; });
                let changed = false;
                featuredProducts = featuredProducts.map((p: any) => {
                  if (!p.vendor && vendorMap[p.handle]) { changed = true; return { ...p, vendor: vendorMap[p.handle] }; }
                  return p;
                });
                if (changed) {
                  const existingMeta = (() => { try { return JSON.parse((section as any).metadata || '{}'); } catch { return {}; } })();
                  const newMeta = JSON.stringify({ ...existingMeta, products: featuredProducts });
                  await db.update(homepageSections).set({ metadata: newMeta } as any).where(eq(homepageSections.id, section.id));
                  console.log('[Vendor enrich] Updated vendors for section:', section.id, vendorMap);
                }
              } catch (enrichErr: any) {
                console.error('[Vendor enrich] error:', enrichErr.message);
              }
            }
          }

          return {
            id: section.id,
            type: section.type,
            titleAr: section.titleAr,
            titleEn: section.titleEn,
            language: (section as any).language || "both",
            sortOrder: section.sortOrder,
            visible: section.visible,
            metadata: (section as any).metadata || null,
            selectedCategories,
            tabs: multiTabs,
            showcaseCollections,
            featuredProducts,
            brands,
            banners: banners.map((b) => ({
              id: b.id,
              imageUrl: b.imageUrl,
              linkType: b.linkType,
              linkValue: b.linkValue,
              sortOrder: b.sortOrder,
            })),
          };
        })
      );

      const settingsRows = await db.select().from(appSettings);
      const settingsMap: Record<string, string> = {};
      settingsRows.forEach((s) => {
        settingsMap[s.key] = s.value;
      });

      const heroBanners: Array<{ imageUrl: string; linkType: string; linkValue: string }> = [];
      const midBanners: Array<{ imageUrl: string; linkType: string; linkValue: string }> = [];

      for (const section of sectionsWithBanners) {
        if (section.type === 'banner_slider') {
          const targetList = heroBanners.length === 0 ? heroBanners : midBanners;
          for (const b of section.banners) {
            targetList.push({
              imageUrl: b.imageUrl,
              linkType: b.linkType || 'collection',
              linkValue: b.linkValue || '',
            });
          }
        }
      }

      const finalSections = sectionsWithBanners.filter(s => {
        if (s.type === 'static_banner' && lang) {
          try {
            const meta = JSON.parse(s.metadata || '{}');
            const bLang = (meta.language || 'both').trim();
            if (bLang !== 'both' && bLang !== '' && bLang !== lang) return false;
          } catch {}
        }
        return true;
      });

      res.json({
        sections: finalSections,
        settings: settingsMap,
        heroBanners,
        midBanners,
        featuredCollectionHandles: [],
      });
    } catch (error: any) {
      console.error("Error fetching homepage:", error.message);
      res.json({
        sections: [],
        settings: {},
        heroBanners: [],
        midBanners: [],
        featuredCollectionHandles: [],
      });
    }
  });

  app.post("/api/cart/buyer-identity", async (req: Request, res: Response) => {
    try {
      const { cartId, email, phone, firstName, lastName, address, city, countryCode } = req.body;
      if (!cartId) {
        return res.status(400).json({ error: "cartId is required" });
      }

      let formattedPhone = phone || "";
      if (formattedPhone) {
        formattedPhone = formattedPhone.replace(/\s+/g, "").replace(/-/g, "");
        if (formattedPhone.startsWith("07")) {
          formattedPhone = "+962" + formattedPhone.substring(1);
        } else if (formattedPhone.startsWith("7") && formattedPhone.length === 9) {
          formattedPhone = "+962" + formattedPhone;
        } else if (!formattedPhone.startsWith("+")) {
          formattedPhone = "+962" + formattedPhone;
        }
      }

      const deliveryAddress: any = {};
      if (firstName) deliveryAddress.firstName = firstName;
      if (lastName) deliveryAddress.lastName = lastName;
      if (address) deliveryAddress.address1 = address;
      if (city) deliveryAddress.city = city;
      deliveryAddress.country = countryCode || "JO";
      if (formattedPhone) deliveryAddress.phone = formattedPhone;

      const buyerIdentity: any = {};
      if (email) buyerIdentity.email = email;
      if (formattedPhone) buyerIdentity.phone = formattedPhone;
      buyerIdentity.deliveryAddressPreferences = [{ deliveryAddress }];

      const data = await shopifyFetch(QUERIES.CART_BUYER_IDENTITY_UPDATE, {
        cartId,
        buyerIdentity,
      });

      if (data.cartBuyerIdentityUpdate.userErrors?.length > 0) {
        console.error("Buyer identity errors:", data.cartBuyerIdentityUpdate.userErrors);
        return res.status(400).json({ errors: data.cartBuyerIdentityUpdate.userErrors });
      }

      res.json(fixCheckoutUrl(data.cartBuyerIdentityUpdate.cart));
    } catch (error: any) {
      console.error("Error updating buyer identity:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/cart/note", async (req: Request, res: Response) => {
    try {
      const { cartId, note } = req.body;
      if (!cartId) {
        return res.status(400).json({ error: "cartId is required" });
      }

      const data = await shopifyFetch(QUERIES.CART_NOTE_UPDATE, {
        cartId,
        note: note || "",
      });

      if (data.cartNoteUpdate.userErrors?.length > 0) {
        return res.status(400).json({ errors: data.cartNoteUpdate.userErrors });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating cart note:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  async function getShopifyCustomerId(storeFrontToken: string): Promise<string> {
    const data = await shopifyFetch(QUERIES.GET_CUSTOMER, {
      customerAccessToken: storeFrontToken,
      language: "EN",
    });
    if (!data.customer?.id) throw new Error("Customer not found");
    const gid = data.customer.id;
    const numericId = gid.replace(/.*\//, '');
    return numericId;
  }

  app.get("/api/customer/addresses", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return res.status(401).json({ error: "Authentication required" });

      const lang = ((req.query.lang as string) || "EN").toUpperCase();
      const data = await shopifyFetch(QUERIES.GET_CUSTOMER, {
        customerAccessToken: token,
        language: lang,
      });
      if (!data.customer) return res.status(401).json({ error: "Invalid token" });

      const defaultAddrId = data.customer.defaultAddress?.id || null;
      const addresses = (data.customer.addresses?.edges || []).map((edge: any) => {
        const addr = edge.node;
        const numericId = (addr.id || '').replace(/.*\//, '').replace(/\?.*/, '');
        return {
          id: numericId,
          firstName: addr.firstName || '',
          lastName: addr.lastName || '',
          phone: addr.phone || '',
          address1: addr.address1 || '',
          address2: addr.address2 || '',
          city: addr.city || '',
          country: addr.country || '',
          province: addr.province || '',
          zip: addr.zip || '',
          company: addr.company || '',
          isDefault: addr.id === defaultAddrId,
        };
      });
      res.json(addresses);
    } catch (error: any) {
      console.error("[Addresses] GET error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/customer/addresses", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return res.status(401).json({ error: "Authentication required" });

      const customerId = await getShopifyCustomerId(token);
      const { firstName, lastName, phone, address1, city, company } = req.body;

      let formattedPhone = phone || '';
      if (formattedPhone) {
        formattedPhone = formattedPhone.replace(/\s+/g, '');
        if (formattedPhone.startsWith("07") && formattedPhone.length === 10) {
          formattedPhone = "+962" + formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith("+")) {
          formattedPhone = "+962" + formattedPhone;
        }
      }

      const result = await shopifyAdminFetch(`customers/${customerId}/addresses.json`, 'POST', {
        address: {
          first_name: firstName || '',
          last_name: lastName || '',
          phone: formattedPhone,
          address1: address1 || '',
          city: city || '',
          country: 'Jordan',
          company: company || '',
        },
      });

      const addr = result.customer_address;
      res.json({
        id: String(addr.id),
        firstName: addr.first_name,
        lastName: addr.last_name,
        phone: addr.phone,
        address1: addr.address1,
        city: addr.city,
        company: addr.company,
        isDefault: addr.default || false,
      });
    } catch (error: any) {
      console.error("[Addresses] POST error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/customer/addresses/:addressId", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return res.status(401).json({ error: "Authentication required" });

      const customerId = await getShopifyCustomerId(token);
      const { addressId } = req.params;
      const { firstName, lastName, phone, address1, city, company } = req.body;

      let formattedPhone = phone || '';
      if (formattedPhone) {
        formattedPhone = formattedPhone.replace(/\s+/g, '');
        if (formattedPhone.startsWith("07") && formattedPhone.length === 10) {
          formattedPhone = "+962" + formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith("+")) {
          formattedPhone = "+962" + formattedPhone;
        }
      }

      const result = await shopifyAdminFetch(`customers/${customerId}/addresses/${addressId}.json`, 'PUT', {
        address: {
          first_name: firstName || '',
          last_name: lastName || '',
          phone: formattedPhone,
          address1: address1 || '',
          city: city || '',
          country: 'Jordan',
          company: company || '',
        },
      });

      const addr = result.customer_address;
      res.json({
        id: String(addr.id),
        firstName: addr.first_name,
        lastName: addr.last_name,
        phone: addr.phone,
        address1: addr.address1,
        city: addr.city,
        company: addr.company,
        isDefault: addr.default || false,
      });
    } catch (error: any) {
      console.error("[Addresses] PUT error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/customer/addresses/:addressId", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return res.status(401).json({ error: "Authentication required" });

      const customerId = await getShopifyCustomerId(token);
      const { addressId } = req.params;

      await shopifyAdminFetch(`customers/${customerId}/addresses/${addressId}.json`, 'DELETE');
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Addresses] DELETE error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/customer/addresses/:addressId/default", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return res.status(401).json({ error: "Authentication required" });

      const customerId = await getShopifyCustomerId(token);
      const { addressId } = req.params;

      await shopifyAdminFetch(`customers/${customerId}/addresses/${addressId}/default.json`, 'PUT');
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Addresses] SET DEFAULT error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/checkout/auto-complete", async (req: Request, res: Response) => {
    try {
      const { checkoutUrl, email, firstName, lastName, phone, address, city, notes } = req.body;
      if (!checkoutUrl || !email) {
        return res.status(400).json({ error: "checkoutUrl and email are required" });
      }

      const result = await autoCompleteCheckout(checkoutUrl, {
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        phone: phone || '',
        address,
        city,
        notes,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error auto-completing checkout:", error.message);
      res.status(500).json({ success: false, error: error.message, redirectUrl: req.body.checkoutUrl });
    }
  });

  app.post("/api/checkout/create", async (req: Request, res: Response) => {
    try {
      const { items, email, phone, firstName, lastName, address, city, notes } = req.body;
      if (!items?.length || !email) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      let formattedPhone = phone || "";
      if (formattedPhone) {
        formattedPhone = formattedPhone.replace(/\s+/g, "").replace(/-/g, "");
        if (formattedPhone.startsWith("07")) {
          formattedPhone = "+962" + formattedPhone.substring(1);
        } else if (formattedPhone.startsWith("7") && formattedPhone.length === 9) {
          formattedPhone = "+962" + formattedPhone;
        } else if (!formattedPhone.startsWith("+")) {
          formattedPhone = "+962" + formattedPhone;
        }
      }

      const lineItems = items.map((item: any) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      }));

      const input: any = {
        lineItems,
        email,
      };

      if (firstName || lastName || address || city || formattedPhone) {
        input.shippingAddress = {
          firstName: firstName || "",
          lastName: lastName || "",
          address1: address || "",
          city: city || "Amman",
          country: "JO",
          phone: formattedPhone || "",
        };
      }

      if (notes) {
        input.note = notes;
      }

      const data = await shopifyFetch(QUERIES.CHECKOUT_CREATE, { input });

      if (data.checkoutCreate.checkoutUserErrors?.length > 0) {
        console.error("Checkout errors:", data.checkoutCreate.checkoutUserErrors);
        return res.status(400).json({ errors: data.checkoutCreate.checkoutUserErrors });
      }

      const checkout = data.checkoutCreate.checkout;
      res.json({
        checkoutId: checkout.id,
        webUrl: checkout.webUrl,
        totalPrice: checkout.totalPriceV2,
      });
    } catch (error: any) {
      console.error("Error creating checkout:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/orders", async (req: Request, res: Response) => {
    try {
      const {
        cartId,
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        notes,
        items,
        subtotal,
        total,
        currency,
        discountCode,
        discountType,
        discountValue,
        shippingCost,
        shippingName,
      } = req.body;

      if (!firstName || !lastName || !email || !phone || !items?.length) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      let shopifyOrderId: string | null = null;
      let shopifyOrderNumber: number | null = null;
      let shopifyOrderName: string | null = null;
      let shopifyOrderStatusUrl: string | null = null;
      let deliveryCode: string | null = null;

      try {
        const lineItems = items.map((item: any) => {
          let variantId = item.variantId;
          if (variantId && variantId.startsWith("gid://")) {
            variantId = extractNumericId(variantId);
          }
          return {
            variant_id: parseInt(variantId, 10),
            quantity: item.quantity,
          };
        });

        const formattedPhone = phone.startsWith('+') ? phone : (phone.startsWith('0') ? `+962${phone.slice(1)}` : `+962${phone}`);
        const draftOrderData: any = {
          line_items: lineItems,
          email: email,
          phone: formattedPhone,
          customer: {
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: formattedPhone,
          },
          shipping_address: {
            first_name: firstName,
            last_name: lastName,
            address1: address || "N/A",
            city: city || "Amman",
            country: "JO",
            phone: phone,
          },
          billing_address: {
            first_name: firstName,
            last_name: lastName,
            address1: address || "N/A",
            city: city || "Amman",
            country: "JO",
            phone: phone,
          },
          note: notes || '',
          tags: ["cod", "xmart-app"].join(', '),
          payment_terms: null,
        };

        if (discountCode) {
          try {
            const discCartLines = items.map((item: any) => ({
              merchandiseId: item.variantId,
              quantity: item.quantity || 1,
            }));
            const discCartData = await shopifyFetch(QUERIES.CREATE_CART, { input: { lines: discCartLines } });
            const discCartId = discCartData.cartCreate?.cart?.id;
            if (discCartId) {
              const discApplyData = await shopifyFetch(QUERIES.APPLY_DISCOUNT, {
                cartId: discCartId,
                discountCodes: [discountCode],
              });
              const discCart = discApplyData.cartDiscountCodesUpdate?.cart;

              let totalLineDiscount = 0;
              const discCartLines2 = discCart?.lines?.edges || [];
              for (const edge of discCartLines2) {
                const lineAllocs = edge.node?.discountAllocations || [];
                for (const alloc of lineAllocs) {
                  totalLineDiscount += parseFloat(alloc.discountedAmount?.amount || '0');
                }
              }
              const cartLevelAllocs = discCart?.discountAllocations || [];
              let totalCartDiscount = 0;
              for (const alloc of cartLevelAllocs) {
                totalCartDiscount += parseFloat(alloc.discountedAmount?.amount || '0');
              }
              const shopifyDiscount = Math.max(totalLineDiscount, totalCartDiscount);

              console.log(`Order discount "${discountCode}": lineDiscount=${totalLineDiscount}, cartDiscount=${totalCartDiscount}, finalDiscount=${shopifyDiscount.toFixed(3)}`);

              if (shopifyDiscount > 0) {
                draftOrderData.applied_discount = {
                  description: discountCode,
                  value_type: "fixed_amount",
                  value: shopifyDiscount.toFixed(3),
                  title: discountCode,
                };
              }
            }
          } catch (discErr: any) {
            console.log(`Discount calculation failed for "${discountCode}": ${discErr.message}`);
          }
        }

        if (shippingCost && parseFloat(shippingCost) > 0) {
          draftOrderData.shipping_line = {
            title: shippingName || "Standard Delivery",
            price: parseFloat(shippingCost),
            custom: true,
          };
        } else if (shippingCost !== undefined) {
          draftOrderData.shipping_line = {
            title: shippingName || "Free Delivery",
            price: 0,
            custom: true,
          };
        }

        const draftOrderPayload = { draft_order: draftOrderData };

        console.log("Creating Shopify draft order...");
        const draftResult = await shopifyAdminFetch("draft_orders.json", "POST", draftOrderPayload);

        if (draftResult.draft_order?.id) {
          const draftId = draftResult.draft_order.id;
          console.log(`Draft order created: ${draftId}, completing...`);

          const completeResult = await shopifyAdminFetch(
            `draft_orders/${draftId}/complete.json`,
            "PUT",
            { payment_pending: true }
          );
          if (completeResult.draft_order?.order_id) {
            shopifyOrderId = String(completeResult.draft_order.order_id);

            // Fetch delivery_code metafield — try after 3s and 5s
            try {
              await new Promise(resolve => setTimeout(resolve, 3000));
              let orderWithMeta = await shopifyAdminFetch(`orders/${shopifyOrderId}/metafields.json`);
              let deliveryCodeMeta = orderWithMeta.metafields?.find(
                (m: any) => m.namespace === 'private' && m.key === 'delivery_code'
              );
              if (!deliveryCodeMeta) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                orderWithMeta = await shopifyAdminFetch(`orders/${shopifyOrderId}/metafields.json`);
                deliveryCodeMeta = orderWithMeta.metafields?.find(
                  (m: any) => m.namespace === 'private' && m.key === 'delivery_code'
                );
              }
              if (deliveryCodeMeta) {
                deliveryCode = deliveryCodeMeta.value;
                console.log(`[Order] Found delivery_code: ${deliveryCode}`);
              }
            } catch (e) {
              console.log("Error fetching delivery_code metafield:", e);
            }

            try {
              await shopifyAdminFetch(`orders/${shopifyOrderId}.json`, "PUT", {
                order: { id: shopifyOrderId, phone: formattedPhone }
              });
            } catch {}

            try {
              const orderDetail = await shopifyAdminFetch(`orders/${shopifyOrderId}.json`);
              shopifyOrderNumber = orderDetail.order?.order_number || null;
              shopifyOrderName = orderDetail.order?.name || null;
              shopifyOrderStatusUrl = orderDetail.order?.order_status_url || null;
              console.log(`Shopify order created: ${shopifyOrderName} (#${shopifyOrderNumber})`);
            } catch (detailErr: any) {
              console.error("Could not fetch order details:", detailErr.message);
            }
          } else {
            console.error("Draft order completed but no order_id found in response");
          }
        } else {
          console.error("Draft order creation failed - no draft_order.id in response");
        }
      } catch (shopifyErr: any) {
        console.error("Shopify order creation failed:", shopifyErr.message);
      }

      const lastOrder = await db
        .select({ orderNumber: orders.orderNumber })
        .from(orders)
        .orderBy(desc(orders.orderNumber))
        .limit(1);

      const nextOrderNumber = shopifyOrderNumber || (lastOrder[0]?.orderNumber || 1000) + 1;

      const [newOrder] = await db
        .insert(orders)
        .values({
          orderNumber: nextOrderNumber,
          shopifyCheckoutId: shopifyOrderId,
          customerEmail: email,
          customerFirstName: firstName,
          customerLastName: lastName,
          customerPhone: phone,
          shippingAddress: address || null,
          shippingCity: city || null,
          notes: notes || null,
          paymentMethod: "cod",
          status: shopifyOrderId ? "confirmed" : "pending",
          subtotal: subtotal || total,
          total,
          currency: currency || "JOD",
          deliveryCode: deliveryCode || null,
          shopifyOrderName: shopifyOrderName || null,
          shopifyOrderId: shopifyOrderId || null,
        })
        .returning();

      if (items.length > 0) {
        await db.insert(orderItems).values(
          items.map((item: any) => ({
            orderId: newOrder.id,
            productTitle: item.productTitle,
            productHandle: item.productHandle || item.handle || null,
            variantTitle: item.variantTitle || null,
            variantId: item.variantId || null,
            quantity: item.quantity,
            price: item.price,
            currency: item.currency || currency || "JOD",
            imageUrl: item.imageUrl || null,
          }))
        );
      }

      const orderItemsList = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, newOrder.id));

      res.json({
        order: {
          ...newOrder,
          items: orderItemsList,
          deliveryCode,
          shopifyOrderName,
          shopifyOrderNumber,
          shopifyOrderStatusUrl,
        },
      });
    } catch (error: any) {
      console.error("Error placing order:", error.message);
      res.status(500).json({ error: "Failed to place order" });
    }
  });

  app.get("/api/orders", async (req: Request, res: Response) => {
    try {
      const email = req.query.email as string;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Fetch from Shopify - Primary Source
      let shopifyOrders: any[] = [];
      try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : authHeader;
        console.log(`[OrdersAPI] Request email: ${email}, token: ${token ? token.substring(0, 10) + '...' : 'none'}`);
        
        if (token && token !== 'undefined' && token !== 'null' && token !== '') {
          const lang = ((req.query.lang as string) || "EN").toUpperCase();
          const shopifyData = await shopifyFetch(QUERIES.GET_CUSTOMER, {
            customerAccessToken: token,
            language: lang,
          });
          
          if (shopifyData?.customer?.orders?.edges) {
            shopifyOrders = shopifyData.customer.orders.edges.map((e: any) => e.node);
            console.log(`[OrdersAPI] Success for ${email}: ${shopifyOrders.length} orders`);
          } else {
            console.warn(`[OrdersAPI] No customer/orders in Shopify response for ${email}`);
          }
        } else {
          console.error(`[OrdersAPI] Invalid token for ${email}: ${token}`);
        }
      } catch (err: any) {
        console.error("[OrdersAPI] Shopify fetch error:", err.message);
      }

      res.json(shopifyOrders);
    } catch (error: any) {
      console.error("Error fetching orders:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/orders/delivery-codes", async (req: Request, res: Response) => {
    try {
      const { orderNames } = req.body;
      if (!orderNames || !Array.isArray(orderNames) || orderNames.length === 0) {
        return res.json({});
      }
      const codeMap: Record<string, string> = {};

      const localOrders = await db
        .select({
          shopifyOrderName: orders.shopifyOrderName,
          deliveryCode: orders.deliveryCode,
        })
        .from(orders);
      for (const o of localOrders) {
        if (o.shopifyOrderName && o.deliveryCode) {
          codeMap[o.shopifyOrderName] = o.deliveryCode;
        }
      }

      const missing = orderNames.filter((n: string) => !codeMap[n]);
      if (missing.length > 0) {
        for (const name of missing.slice(0, 20)) {
          try {
            const orderNum = name.replace('#', '');
            const searchResult = await shopifyAdminFetch(`orders.json?name=${encodeURIComponent(name)}&fields=id,name&limit=1`);
            const foundOrder = searchResult?.orders?.[0];
            if (foundOrder) {
              const metaResult = await shopifyAdminFetch(`orders/${foundOrder.id}/metafields.json`);
              const dcMeta = metaResult?.metafields?.find(
                (m: any) => m.namespace === 'private' && m.key === 'delivery_code'
              );
              if (dcMeta?.value) {
                codeMap[name] = dcMeta.value;
              }
            }
          } catch (e) {
          }
        }
      }

      res.json(codeMap);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/suggested-products", async (req: Request, res: Response) => {
    try {
      const language = (req.query.lang as string)?.toUpperCase() === 'EN' ? 'EN' : 'AR';
      const items = await db.select().from(suggestedProducts)
        .where(eq(suggestedProducts.visible, true))
        .orderBy(asc(suggestedProducts.sortOrder));
      if (items.length === 0) return res.json([]);

      const handles = items.map(i => i.productHandle);
      const results = await Promise.all(
        handles.map(async (dbItem, idx) => {
          const handle = handles[idx];
          try {
            const data = await shopifyFetch(QUERIES.PRODUCT_BY_HANDLE, { handle, language });
            const product = data?.product || null;
            if (!product) return null;
            const adminImage = items[idx]?.imageUrl;
            if (adminImage && !product.images?.edges?.[0]?.node?.url) {
              product._adminImageUrl = adminImage;
            }
            return product;
          } catch {
            return null;
          }
        })
      );

      res.json(results.filter(Boolean));
    } catch (error: any) {
      console.error("Error fetching suggested products:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/latest-order", async (req: Request, res: Response) => {
    try {
      const email = (req.query.email as string || '').trim();
      if (!email) return res.status(400).json({ error: 'Email required' });
      const result = await shopifyAdminFetch(`orders.json?email=${encodeURIComponent(email)}&status=any&limit=1&order=created_at+desc&fields=id,name,order_number,total_price,currency,created_at,financial_status`);
      const order = result.orders?.[0];
      if (!order) {
        console.log(`[LatestOrder] No orders found for email: ${email}`);
        return res.json({ order: null });
      }

      let deliveryCode: string | null = null;
      try {
        const metaResult = await shopifyAdminFetch(`orders/${order.id}/metafields.json`);
        const meta = (metaResult.metafields || []).find(
          (m: any) => m.namespace === 'private' && m.key === 'delivery_code'
        );
        if (meta) deliveryCode = meta.value;
      } catch {}

      console.log(`[LatestOrder] Found order ${order.name} for ${email}, total: ${order.total_price}, deliveryCode: ${deliveryCode || 'none'}`);

      res.json({
        order: {
          name: order.name,
          orderNumber: order.order_number,
          totalPrice: order.total_price,
          currency: order.currency || 'JOD',
          deliveryCode,
          financialStatus: order.financial_status,
        }
      });
    } catch (error: any) {
      console.error("Error fetching latest order:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/shipping-rates", async (req: Request, res: Response) => {
    try {
      const zones = await shopifyAdminFetch("shipping_zones.json");
      const rates: Array<{ name: string; price: string; currency: string; minSubtotal: number | null; maxSubtotal: number | null }> = [];
      for (const zone of zones.shipping_zones || []) {
        for (const rate of zone.price_based_shipping_rates || []) {
          rates.push({
            name: rate.name,
            price: rate.price,
            currency: "JOD",
            minSubtotal: rate.min_order_subtotal ?? null,
            maxSubtotal: rate.max_order_subtotal ?? null,
          });
        }
        for (const rate of zone.weight_based_shipping_rates || []) {
          rates.push({
            name: rate.name,
            price: rate.price,
            currency: "JOD",
            minSubtotal: null,
            maxSubtotal: null,
          });
        }
      }
      res.json(rates);
    } catch (error: any) {
      console.error("Error fetching shipping rates:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/validate-discount", async (req: Request, res: Response) => {
    try {
      const { code, cartId, items } = req.body;
      if (!code) return res.status(400).json({ error: "Discount code required" });

      let cartLines: any[] = [];
      if (items && Array.isArray(items) && items.length > 0) {
        cartLines = items.map((item: any) => ({
          merchandiseId: item.merchandiseId || item.variantId,
          quantity: item.quantity || 1,
        }));
      } else {
        try {
          const productsData = await shopifyFetch(QUERIES.PRODUCTS, { first: 10 });
          const products = productsData.products?.edges || [];
          for (const edge of products) {
            const variant = edge.node?.variants?.edges?.[0]?.node;
            if (variant?.id && edge.node?.availableForSale) {
              cartLines.push({ merchandiseId: variant.id, quantity: 1 });
              break;
            }
          }
        } catch (e) {
          console.error("Failed to fetch products for discount cart:", e);
        }
      }
      if (cartLines.length === 0) {
        return res.status(400).json({ error: "No products available for discount validation" });
      }

      const createData = await shopifyFetch(QUERIES.CREATE_CART, { input: { lines: cartLines } });
      const resolvedCartId = createData.cartCreate?.cart?.id;
      if (!resolvedCartId) {
        return res.status(400).json({ error: "Failed to create cart for discount validation" });
      }

      const data = await shopifyFetch(QUERIES.APPLY_DISCOUNT, {
        cartId: resolvedCartId,
        discountCodes: [code],
      });

      const cart = data.cartDiscountCodesUpdate?.cart;
      const appliedCodes = cart?.discountCodes || [];
      const matchedCode = appliedCodes.find(
        (dc: any) => dc.code.toLowerCase() === code.toLowerCase()
      );

      if (!matchedCode) {
        return res.json({ valid: false, reason: "invalid" });
      }

      if (!matchedCode.applicable) {
        return res.json({ valid: true, applicable: false, code: matchedCode.code, reason: "not_applicable" });
      }

      let totalLineDiscount = 0;
      const discLines = cart?.lines?.edges || [];
      for (const edge of discLines) {
        const lineAllocs = edge.node?.discountAllocations || [];
        for (const alloc of lineAllocs) {
          totalLineDiscount += parseFloat(alloc.discountedAmount?.amount || '0');
        }
      }

      const cartLevelAllocs = cart?.discountAllocations || [];
      let totalCartDiscount = 0;
      for (const alloc of cartLevelAllocs) {
        totalCartDiscount += parseFloat(alloc.discountedAmount?.amount || '0');
      }

      const totalDiscount = Math.max(totalLineDiscount, totalCartDiscount);

      const shopifySubtotal = cart?.cost?.subtotalAmount?.amount || '0';
      const shopifyTotal = cart?.cost?.totalAmount?.amount || '0';

      const isFreeShip = totalDiscount === 0 && matchedCode.applicable;

      console.log(`Discount "${code}": applicable=${matchedCode.applicable}, lineDiscount=${totalLineDiscount}, cartDiscount=${totalCartDiscount}, totalDiscount=${totalDiscount}, isFreeShip=${isFreeShip}, subtotal=${shopifySubtotal}, total=${shopifyTotal}`);

      res.json({
        valid: true,
        code: matchedCode.code,
        applicable: true,
        discountAmount: totalDiscount.toFixed(3),
        discountType: isFreeShip ? 'free_shipping' : 'fixed_amount',
        isFreeShipping: isFreeShip,
        newTotal: shopifyTotal,
        newSubtotal: shopifySubtotal,
      });
    } catch (error: any) {
      console.error("Error validating discount:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/categories", async (_req: Request, res: Response) => {
    try {
      const allCats = await db
        .select()
        .from(categories)
        .where(eq(categories.visible, true))
        .orderBy(asc(categories.sortOrder));

      function buildTree(parentId: string | null): any[] {
        return allCats
          .filter(c => c.parentId === parentId)
          .map(cat => ({ ...cat, children: buildTree(cat.id) }));
      }

      res.json(buildTree(null));
    } catch (error: any) {
      console.error("Error fetching categories:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/notifications", async (_req: Request, res: Response) => {
    try {
      const allNotifications = await db
        .select()
        .from(notifications)
        .orderBy(desc(notifications.createdAt));
      res.json(allNotifications);
    } catch (error: any) {
      console.error("Error fetching notifications:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/push-token", async (req: Request, res: Response) => {
    try {
      const { token, platform } = req.body;
      if (!token) return res.status(400).json({ error: "Token is required" });
      await db
        .insert(pushTokens)
        .values({ token, platform: platform || 'unknown' })
        .onConflictDoNothing();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error saving push token:", error.message);
      res.status(500).json({ error: error.message });
    }
  });


  setInterval(() => quickStockRefresh().catch(e => console.error("[StockRefresh] Error:", e.message)), 5 * 60 * 1000);
  setTimeout(() => quickStockRefresh().catch(e => console.error("[StockRefresh] Error:", e.message)), 2 * 60 * 1000);

  startPeriodicSync(30 * 60 * 1000);

  const httpServer = createServer(app);
  return httpServer;
}
