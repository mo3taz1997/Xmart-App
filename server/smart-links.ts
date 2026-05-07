import type { Express, Request, Response } from "express";
import { shopifyFetch, QUERIES } from "./shopify";

const IOS_BUNDLE_ID = "com.xmart.jo";
const ANDROID_PACKAGE = "com.xmart.jo";
const IOS_APP_STORE_ID = "6760316670";
const APP_NAME = "XMART";
const SMART_LINK_HOST = "product.xmart.me";

const APPLE_TEAM_ID = (process.env.APPLE_TEAM_ID || "").trim();
const ANDROID_SHA256_FINGERPRINT = (process.env.ANDROID_SHA256_FINGERPRINT || "").trim();

const APP_STORE_URL = `https://apps.apple.com/jo/app/id${IOS_APP_STORE_ID}`;
const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

const STORE_WEB_HOST = (process.env.STORE_WEB_HOST || "xmart.me").replace(/^https?:\/\//, "").replace(/\/+$/, "");

function isMobileUserAgent(ua: string): boolean {
  if (!ua) return false;
  return /iPhone|iPad|iPod|Android|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

function isCrawlerUserAgent(ua: string): boolean {
  if (!ua) return false;
  return /bot|crawler|spider|facebookexternalhit|whatsapp|telegrambot|twitterbot|slackbot|linkedinbot|googlebot|bingbot|applebot|embedly|pinterest|skypeuripreview|discordbot|preview/i.test(ua);
}

type CacheEntry<T> = { data: T; ts: number };
const linkCache = new Map<string, CacheEntry<any>>();

function getCache<T>(key: string, ttlMs: number): T | null {
  const e = linkCache.get(key);
  if (e && Date.now() - e.ts < ttlMs) return e.data as T;
  return null;
}
function setCache<T>(key: string, data: T) {
  linkCache.set(key, { data, ts: Date.now() });
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function escapeXml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!));
}
function stripHtml(s: string): string {
  return String(s || "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

interface ProductSummary {
  id: string;
  numericId: string;
  title: string;
  description: string;
  handle: string;
  image: string | null;
  price: string;
  currency: string;
  available: boolean;
  compareAtPrice: string | null;
  vendor: string | null;
  productType: string | null;
}

function summarizeProduct(p: any): ProductSummary | null {
  if (!p || !p.handle) return null;
  const numericId = String(p.id || "").split("/").pop() || "";
  const image = p.images?.edges?.[0]?.node?.url || null;
  const price = p.priceRange?.minVariantPrice?.amount || "0";
  const currency = p.priceRange?.minVariantPrice?.currencyCode || "JOD";
  const compareAtPrice = p.compareAtPriceRange?.minVariantPrice?.amount && Number(p.compareAtPriceRange.minVariantPrice.amount) > 0
    ? p.compareAtPriceRange.minVariantPrice.amount
    : null;
  return {
    id: p.id,
    numericId,
    title: p.title || "",
    description: stripHtml(p.descriptionHtml || p.description || "").slice(0, 5000),
    handle: p.handle,
    image,
    price,
    currency,
    available: !!p.availableForSale,
    compareAtPrice,
    vendor: p.vendor || null,
    productType: p.productType || null,
  };
}

async function fetchProductByHandle(handle: string): Promise<ProductSummary | null> {
  const cacheKey = `prod:${handle}`;
  const cached = getCache<ProductSummary | null>(cacheKey, 5 * 60 * 1000);
  if (cached !== null) return cached;
  try {
    const data: any = await shopifyFetch(QUERIES.PRODUCT_BY_HANDLE, { handle, language: "EN" });
    const summary = summarizeProduct(data?.product);
    setCache(cacheKey, summary);
    return summary;
  } catch (e: any) {
    console.warn("[SmartLinks] fetch product failed:", e?.message);
    return null;
  }
}

async function fetchAllProducts(): Promise<ProductSummary[]> {
  const cacheKey = "catalog:all";
  const cached = getCache<ProductSummary[]>(cacheKey, 60 * 60 * 1000);
  if (cached) return cached;

  const all: ProductSummary[] = [];
  let after: string | null = null;
  let pages = 0;
  const MAX_PAGES = 40;

  try {
    while (pages < MAX_PAGES) {
      const data: any = await shopifyFetch(QUERIES.PRODUCTS, {
        first: 250,
        after,
        language: "EN",
      });
      const conn = data?.products;
      if (!conn) break;
      for (const edge of conn.edges || []) {
        const s = summarizeProduct(edge.node);
        if (s) all.push(s);
      }
      if (!conn.pageInfo?.hasNextPage) break;
      after = conn.pageInfo.endCursor;
      pages++;
    }
    setCache(cacheKey, all);
  } catch (e: any) {
    console.warn("[SmartLinks] fetch all products failed:", e?.message);
  }
  return all;
}

function renderSmartLinkPage(handle: string, product: ProductSummary | null, baseUrl: string): string {
  const title = product?.title || `XMART Product`;
  const description = product?.description?.slice(0, 200) || "تسوّق على XMART - كل ما تحتاجه في تطبيق واحد";
  const image = product?.image || `${baseUrl}/assets/images/icon.png`;
  const price = product?.price ? Number(product.price).toFixed(3) : null;
  const currency = product?.currency || "JOD";
  const deepLink = `xmart://product/${encodeURIComponent(handle)}`;
  const canonicalUrl = `https://${SMART_LINK_HOST}/p/${encodeURIComponent(handle)}`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>${escapeHtml(title)} - XMART</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonicalUrl)}">
<link rel="icon" type="image/png" href="/favicon.png">

<meta property="og:type" content="product">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonicalUrl)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:site_name" content="${APP_NAME}">
${price ? `<meta property="product:price:amount" content="${escapeHtml(price)}">
<meta property="product:price:currency" content="${escapeHtml(currency)}">` : ""}

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">

<meta property="al:ios:url" content="${escapeHtml(deepLink)}">
<meta property="al:ios:app_store_id" content="${IOS_APP_STORE_ID}">
<meta property="al:ios:app_name" content="${APP_NAME}">
<meta property="al:android:url" content="${escapeHtml(deepLink)}">
<meta property="al:android:package" content="${ANDROID_PACKAGE}">
<meta property="al:android:app_name" content="${APP_NAME}">
<meta property="al:web:url" content="${escapeHtml(canonicalUrl)}">
<meta property="al:web:should_fallback" content="false">

<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo',sans-serif;background:#0A0A0A;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background-image:radial-gradient(at 20% 0%,#163259 0,transparent 50%),radial-gradient(at 80% 100%,#248CCC 0,transparent 50%);background-attachment:fixed}
.card{background:rgba(20,20,30,0.85);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:28px 24px;max-width:420px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5)}
.brand{display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:24px;font-size:24px;font-weight:800;letter-spacing:1px}
.brand-x{color:#fff}
.brand-mart{color:#248CCC}
.product-image{width:200px;height:200px;border-radius:16px;object-fit:cover;margin:0 auto 20px;background:#1a1a2e;display:block}
.product-image-placeholder{width:200px;height:200px;border-radius:16px;background:linear-gradient(135deg,#163259,#248CCC);margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:64px;color:#fff;font-weight:800}
.product-title{font-size:20px;font-weight:700;margin-bottom:8px;line-height:1.4;color:#fff}
.product-price{font-size:26px;font-weight:800;color:#248CCC;margin-bottom:4px}
.product-compare{font-size:15px;color:#888;text-decoration:line-through;margin-bottom:20px}
.spacer{height:24px}
.btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:16px;border-radius:14px;font-family:'Cairo',sans-serif;font-size:16px;font-weight:700;border:none;cursor:pointer;text-decoration:none;transition:transform 0.15s,opacity 0.15s;margin-bottom:10px}
.btn:active{transform:scale(0.98)}
.btn-primary{background:linear-gradient(135deg,#248CCC,#163259);color:#fff}
.btn-secondary{background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(255,255,255,0.12)}
.btn-store{background:#000;color:#fff;border:1px solid rgba(255,255,255,0.2)}
.divider{display:flex;align-items:center;gap:12px;margin:20px 0 16px;color:#666;font-size:13px}
.divider::before,.divider::after{content:'';flex:1;height:1px;background:rgba(255,255,255,0.08)}
.store-buttons{display:flex;gap:10px;flex-direction:column}
.hint{font-size:12px;color:#666;margin-top:14px;line-height:1.6}
.icon{width:20px;height:20px;flex-shrink:0}
@media (max-width:380px){
  .card{padding:22px 18px}
  .product-image,.product-image-placeholder{width:160px;height:160px}
  .product-title{font-size:18px}
  .product-price{font-size:22px}
}
</style>
</head>
<body>
<div class="card">
  <div class="brand"><span class="brand-x">X</span><span class="brand-mart">mart</span></div>
  ${product?.image
    ? `<img class="product-image" src="${escapeHtml(image)}" alt="${escapeHtml(title)}" onerror="this.outerHTML='<div class=\\'product-image-placeholder\\'>X</div>'">`
    : `<div class="product-image-placeholder">X</div>`}
  <div class="product-title">${escapeHtml(title)}</div>
  ${price ? `<div class="product-price">${escapeHtml(price)} ${escapeHtml(currency)}</div>` : ""}
  ${product?.compareAtPrice ? `<div class="product-compare">${Number(product.compareAtPrice).toFixed(3)} ${escapeHtml(currency)}</div>` : `<div class="spacer"></div>`}

  <button class="btn btn-primary" onclick="openApp()">
    <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
    افتح في تطبيق XMART
  </button>

  <div class="divider">أو حمّل التطبيق</div>

  <div class="store-buttons">
    <a class="btn btn-store" href="${APP_STORE_URL}" id="appstore-btn">
      <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
      تحميل من App Store
    </a>
    <a class="btn btn-store" href="${PLAY_STORE_URL}" id="playstore-btn">
      <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5V3.5c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.25-.84-.76-.84-1.35zM5.69 22l8.78-8.78 2.96 2.96-10.18 5.81c-.55.32-.84.13-1.56-.01v.02zM18.81 13.85L15.1 17.05l-7.41-4.22 7.41-4.22 3.71 3.21c.46.46.46 1.21 0 1.67l-.01.01-.01.01v-.66z"/></svg>
      تحميل من Google Play
    </a>
  </div>

  <div class="hint">
    إذا كان التطبيق مثبتاً، رح يفتح المنتج تلقائياً.<br>
    وإلا، حمّل التطبيق ورح يفتح المنتج بعد التثبيت.
  </div>
</div>

<script>
(function(){
  var deepLink = ${JSON.stringify(deepLink)};
  var iosUrl = ${JSON.stringify(APP_STORE_URL)};
  var androidUrl = ${JSON.stringify(PLAY_STORE_URL)};
  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/i.test(ua);
  var isAndroid = /Android/i.test(ua);
  var isMobile = isIOS || isAndroid;
  var appStoreFallback = isIOS ? iosUrl : (isAndroid ? androidUrl : null);

  function openApp() {
    if (!isMobile) {
      window.location.href = isIOS ? iosUrl : androidUrl || iosUrl;
      return;
    }
    var openedAt = Date.now();
    var visibilityChanged = false;
    var onVis = function(){ if (document.visibilityState === 'hidden') visibilityChanged = true; };
    document.addEventListener('visibilitychange', onVis);

    window.location.href = deepLink;

    setTimeout(function(){
      document.removeEventListener('visibilitychange', onVis);
      var elapsed = Date.now() - openedAt;
      if (!visibilityChanged && elapsed < 2500 && appStoreFallback) {
        window.location.href = appStoreFallback;
      }
    }, 1500);
  }
  window.openApp = openApp;

  if (isMobile) {
    setTimeout(openApp, 100);
  }
})();
</script>
</body>
</html>`;
}

export function registerSmartLinkRoutes(app: Express) {
  app.get("/.well-known/apple-app-site-association", (_req: Request, res: Response) => {
    if (!APPLE_TEAM_ID) {
      console.warn("[SmartLinks] APPLE_TEAM_ID env var not set - AASA file is unavailable");
      return res.status(503).json({ error: "APPLE_TEAM_ID not configured on server" });
    }
    const aasa = {
      applinks: {
        apps: [],
        details: [
          {
            appID: `${APPLE_TEAM_ID}.${IOS_BUNDLE_ID}`,
            paths: ["/p/*"],
          },
        ],
      },
    };
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(JSON.stringify(aasa));
  });

  app.get("/.well-known/assetlinks.json", (_req: Request, res: Response) => {
    if (!ANDROID_SHA256_FINGERPRINT) {
      console.warn("[SmartLinks] ANDROID_SHA256_FINGERPRINT env var not set - assetlinks.json is unavailable");
      return res.status(503).json({ error: "ANDROID_SHA256_FINGERPRINT not configured on server" });
    }
    const fingerprints = ANDROID_SHA256_FINGERPRINT
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const assetlinks = [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: ANDROID_PACKAGE,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ];
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(JSON.stringify(assetlinks));
  });

  app.get("/p/:handle", async (req: Request, res: Response) => {
    try {
      const handle = String(req.params.handle || "").trim();
      if (!handle) return res.status(400).send("Missing product handle");

      const ua = String(req.headers["user-agent"] || "");
      const forceApp = String(req.query.app || "") === "1";
      if (!forceApp && !isMobileUserAgent(ua) && !isCrawlerUserAgent(ua)) {
        const target = `https://${STORE_WEB_HOST}/products/${encodeURIComponent(handle)}`;
        res.setHeader("Cache-Control", "public, max-age=300");
        return res.redirect(302, target);
      }

      const fwdProto = (req.headers["x-forwarded-proto"] as string || req.protocol || "https").split(",")[0].trim();
      const fwdHost = ((req.headers["x-forwarded-host"] as string) || "").split(",")[0].trim() || (req.headers.host as string) || SMART_LINK_HOST;
      const baseUrl = `${fwdProto}://${fwdHost}`;

      const product = await fetchProductByHandle(handle);
      const html = renderSmartLinkPage(handle, product, baseUrl);

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=300");
      res.status(product ? 200 : 404).send(html);
    } catch (e: any) {
      console.error("[SmartLinks] /p/:handle error:", e?.message);
      res.status(500).send("Server error");
    }
  });

  app.get("/api/catalog-feed.xml", async (_req: Request, res: Response) => {
    try {
      const products = await fetchAllProducts();

      const items = products
        .filter((p) => p.handle && p.title)
        .map((p) => {
          const link = `https://${SMART_LINK_HOST}/p/${encodeURIComponent(p.handle)}`;
          const currentPrice = Number(p.price);
          const compareAt = p.compareAtPrice ? Number(p.compareAtPrice) : 0;
          const onSale = compareAt > 0 && compareAt > currentPrice;
          // Meta convention: g:price = original (highest) price, g:sale_price = discounted current price
          const priceTag = onSale ? `${compareAt.toFixed(3)} ${p.currency}` : `${currentPrice.toFixed(3)} ${p.currency}`;
          const salePriceTag = onSale ? `${currentPrice.toFixed(3)} ${p.currency}` : null;
          const description = (p.description || p.title || "").slice(0, 4900);
          return `    <item>
      <g:id>${escapeXml(p.numericId)}</g:id>
      <g:title>${escapeXml(p.title)}</g:title>
      <g:description>${escapeXml(description)}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(p.image || "")}</g:image_link>
      <g:availability>${p.available ? "in stock" : "out of stock"}</g:availability>
      <g:price>${escapeXml(priceTag)}</g:price>${salePriceTag ? `\n      <g:sale_price>${escapeXml(salePriceTag)}</g:sale_price>` : ""}
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(p.vendor || APP_NAME)}</g:brand>${p.productType ? `\n      <g:product_type>${escapeXml(p.productType)}</g:product_type>` : ""}
      <g:identifier_exists>no</g:identifier_exists>
    </item>`;
        })
        .join("\n");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${APP_NAME} Catalog</title>
    <link>https://${SMART_LINK_HOST}</link>
    <description>${APP_NAME} product catalog feed for Meta Commerce Manager</description>
${items}
  </channel>
</rss>`;

      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.status(200).send(xml);
    } catch (e: any) {
      console.error("[SmartLinks] catalog feed error:", e?.message);
      res.status(500).send(`<?xml version="1.0"?><error>${escapeXml(e?.message || "error")}</error>`);
    }
  });

  console.log(`[SmartLinks] Routes registered. APPLE_TEAM_ID: ${APPLE_TEAM_ID ? "set" : "MISSING"}, ANDROID_SHA256_FINGERPRINT: ${ANDROID_SHA256_FINGERPRINT ? "set" : "MISSING"}`);
}
