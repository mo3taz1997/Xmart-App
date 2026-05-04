# Xmart Mobile E-Commerce App

## Overview

Xmart is a mobile e-commerce application for the Xmart.jo electronics brand, built with React Native (Expo) and an Express.js backend server. The app connects to a Shopify store via the Storefront GraphQL API to display products, manage carts, handle customer authentication, and process orders. The app is designed with Arabic as the primary language, full RTL support, and day/night theme modes with brand colors (#163259 dark navy, #248CCC bright blue, white).

The architecture follows a client-server pattern where the Express server acts as a proxy/middleware layer between the mobile app and Shopify's Storefront API. The server handles all Shopify GraphQL queries, while the mobile client communicates with the Express server via REST API endpoints.

## User Preferences

Preferred communication style: Simple, everyday language (Arabic).

## System Architecture

### Frontend (Mobile App)
- **Framework**: React Native with Expo SDK 54, using Expo Router for file-based navigation
- **Navigation**: Tab-based layout with 5 main tabs (Home, Categories, Wishlist, Cart, Profile) plus stack screens for product details, collection browsing, search, orders, and authentication
- **State Management**: React Context API for Auth, Cart, Wishlist, and Language state. TanStack React Query for server data fetching and caching
- **Styling**: StyleSheet API with a centralized color constants file (`constants/colors.ts`). Day/night theme modes managed by `contexts/ThemeContext.tsx` with AsyncStorage persistence. Brand colors: #163259 (navy), #248CCC (blue), white
- **RTL Support**: Full manual RTL layout without `I18nManager.forceRTL`. The app dynamically adjusts flexDirection, textAlign, writingDirection, direction, and chevron icons based on language via `isRTL` from LanguageContext
- **Internationalization**: Custom i18n system in `lib/i18n.ts` with Arabic and English translations. Server-side translation endpoint (`/api/translate`) for dynamic Shopify content translation
- **Fonts**: Cairo font family (Regular, SemiBold, Bold) loaded via `@expo-google-fonts/cairo`
- **Authentication Storage**: `expo-secure-store` on native, `AsyncStorage` on web for storing Shopify customer access tokens
- **API Client**: `lib/api.ts` and `lib/query-client.ts` use `EXPO_PUBLIC_DOMAIN` env var for all API requests

### Backend (Express Server)
- **Framework**: Express.js v5 running on port 5000
- **Purpose**: Acts as an API proxy to Shopify's Storefront GraphQL API + serves admin dashboard
- **API Pattern**: RESTful endpoints under `/api/` that translate to Shopify GraphQL queries
- **Key Routes** (defined in `server/routes.ts`):
  - `GET /api/collections` - List all collections (250 from Shopify)
  - `GET /api/collections/:handle/products` - Products in a collection with sorting/filtering
  - `GET /api/products` - List products
  - `GET /api/products/:handle` - Single product details
  - `GET /api/search?q=` - Product search (local search engine + Shopify fallback)
  - `POST /api/cart/create`, `/api/cart/add`, `/api/cart/update` - Cart operations
  - Auth endpoints for login, register, password recovery
  - `POST /api/orders` - Place order (COD) with Shopify draft order creation
  - `GET /api/orders?email=` - Fetch orders by customer email
  - `GET /api/shipping-rates` - Fetch shipping rates from Shopify
  - `POST /api/validate-discount` - Validate discount code
  - `GET /api/homepage` - Homepage sections and banners
  - `GET /api/categories` - Category tree
  - `GET /api/suggested-products` - Curated product picks
  - `GET /api/trending-products` - Most sold products (last 30 days)
  - `GET /api/sales-counts` - Product sales data
  - `GET /api/notifications` - App notifications
- **Admin Panel** (`server/admin-routes.ts`): Control panel served at `/admin` on port 5000
  - Login: admin / xmart2026
  - Homepage sections management (banner sliders, product grids, static banners, multi-collection tabs, brands strip)
  - Categories (3-level hierarchy with AR/EN titles, images, Shopify collection handles)
  - Notifications (push to all users)
  - App settings (logo, store name, contact info, announcements)
  - Image upload support
- **Shopify Integration**: `server/shopify.ts` handles all GraphQL communication (Storefront + Admin APIs, version 2024-01)
- **Search Engine**: `server/search-engine.ts` with local PostgreSQL search index + pg_trgm for fuzzy matching

### Database
- **Engine**: PostgreSQL with Drizzle ORM
- **Schema** (`shared/schema.ts`): 14 tables
  - `users` - Basic user accounts
  - `homepage_sections` - Homepage layout sections
  - `homepage_banners` - Banners within sections
  - `app_settings` - Key-value configuration store (12 settings)
  - `customer_addresses` - Legacy table (no longer used, addresses now managed via Shopify Admin API)
  - `orders` - Customer orders
  - `order_items` - Individual order items
  - `categories` - 3-level category hierarchy (6 categories)
  - `suggested_products` - Admin-curated products (2 products)
  - `push_tokens` - Device push notification tokens
  - `notifications` - App notifications
  - `search_index` - Local product search index (managed by search-engine.ts)
  - `search_analytics` - Search performance data
  - `popular_searches` - Popular search terms
- **Connection**: `server/db.ts` manages the database connection pool

### Key Environment Variables
- `SHOPIFY_STORE_DOMAIN` - The Shopify store domain (without https://)
- `SHOPIFY_STOREFRONT_ACCESS_TOKEN` - Shopify Storefront API access token
- `SHOPIFY_ADMIN_ACCESS_TOKEN` - Shopify Admin API access token
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Express session secret
- `EXPO_PUBLIC_DOMAIN` - Auto-set from Replit environment for API URL

### Build & Development
- **Development**: Two workflows - "Start Backend" (npm run server:dev) and "Start Frontend" (npm run expo:dev)
- **Production Build**: `npm run server:build` uses esbuild to bundle server to `server_dist/`
- **Deployment**: Autoscale target, build with `npm run server:build`, run with `node server_dist/index.js`
- **OTA Updates**: `expo-updates` configured with EAS project ID `3e6b6783-234b-4908-9292-c1396a2444f9`

## External Dependencies

### Shopify Storefront GraphQL API
- Primary data source for all e-commerce functionality
- API version: 2024-01

### PostgreSQL Database
- Connected via `DATABASE_URL`
- Drizzle ORM for schema management
- pg_trgm extension enabled for fuzzy search

### Key NPM Packages
- `expo` (SDK 54) - Cross-platform mobile framework
- `expo-router` - File-based navigation
- `@tanstack/react-query` - Data fetching and caching
- `express` v5 - Backend API server
- `drizzle-orm` + `pg` - Database ORM and PostgreSQL client
- `bcryptjs` - Password hashing
- `sharp` - Image processing for logo uploads
- `esbuild` - Server bundling for production

## Meta (Facebook) SDK — App Events (April 2026)
- **Native build required**: Android `versionCode 10`, iOS `buildNumber "10"`. Not OTA-deliverable.
- **Packages**: `react-native-fbsdk-next` (^13.4.3), `expo-tracking-transparency` (~6.0.8), `expo-build-properties` (~1.0.10).
- **app.json**: Configured plugins for `react-native-fbsdk-next` (App ID `1000504526488987`, scheme `fb1000504526488987`, AdvertiserIDCollection enabled, AutoLogAppEvents enabled, AdvertiserTrackingEnabled gated by ATT) and `expo-tracking-transparency` (custom Arabic prompt). iOS `LSApplicationQueriesSchemes` whitelists `fbapi` + `fb-messenger-share-api`.
- **Module**: `lib/meta-events.ts` — single entry for all events. Web-safe via `Platform.OS !== 'web'` + try/require. AEM enabled on iOS for SKAdNetwork conversions.
- **Currency**: JOD across all events. Param naming uses `fb_` prefix convention.
- **Events wired**:
  - **App Open** — `app/_layout.tsx` once on launch (after ATT prompt + SDK init).
  - **ATT prompt** — iOS only. Fires once via `expo-tracking-transparency`; result mirrored to `Settings.setAdvertiserTrackingEnabled`.
  - **ViewContent** — `app/product/[handle].tsx` on product mount.
  - **AddToCart** — Centralized in `contexts/CartContext.tsx` (`addToCart` + `replaceCartWith` for Buy Now). Every entry point covered.
  - **InitiateCheckout** — `app/checkout.tsx` and `app/cod-order.tsx` (`handlePlaceOrder`) when user starts the order flow.
  - **Purchase** — Fired ONLY after Shopify confirms. Strict gating:
    - `app/checkout.tsx`: requires `result.orderNumber` (no synthetic IDs).
    - `app/cod-order.tsx` COD direct buy + cart paths: require `result.order.shopifyOrderName || shopifyOrderId` AND `status === 'confirmed'`. Local DB id is never used.
    - `app/cod-order.tsx` Online Card via WebView `/thank_you`: prefers Shopify orderName; falls back to URL token (extracted from `/orders/<token>`, `/checkouts/c/<id>`, or `/checkouts/<token>/thank`) so guest checkouts are still tracked.
- **Dedupe**: `purchasedOrderIds` Set persisted to AsyncStorage (`@meta_purchased_order_ids_v1`, capped at 200). Survives app relaunch.
- **Build & validate**: After merge, run `npm run server:build` (esbuild) before deploy. Test events via Meta Events Manager → Test Events using device IDFA/IDFV.

## Publishing State (May 2026) — CRITICAL

### iOS — App Store
- **Bundle ID**: `com.xmart.jo` | **App ID**: `6760316670` | **Team**: `WMJ2XWFP53` (Speed Of Excellence E-Commerce LLC)
- **Apple ID**: development@xmart.me | **Distribution Cert**: `JGNX3HQPAJ` | **Cert Password**: `xmart2026`
- **ASC API Key**: `622NA8R3C7` (saved on EAS, role: ADMIN, name: `[Expo] EAS Submit eAc5okNK9J`)
- **Last Build**: `ed19e6fd-4e03-4b3e-8128-ef417c6f9b96` — version 2.3.0 (build 20) — uploaded to TestFlight ✅ May 2, 2026
- **Status**: Build 20 "Ready to Submit" in TestFlight. User filling App Privacy form before Submit for Review.
- **App Privacy answers** (must match — Facebook SDK detected by Apple):
  - Collect data: **YES**
  - Contact Info: ☑ Name, Email, Phone, Physical Address (NOT "Other")
  - Identifiers: ☑ User ID, ☑ **Device ID** (FB SDK)
  - Purchases: ☑ Purchases
  - Usage Data: ☑ **Product Interaction**, ☑ **Advertising Data** (FB SDK)
  - Location: ❌ NONE (app doesn't use GPS)
  - Tracking="Yes" for: Device ID, Advertising Data, Product Interaction, Purchases

### Android — Google Play
- **Package**: `com.xmart.jo`
- **Upload Key Reset**: APPROVED by Google. New key SHA1 `6C:BD:15:DD:55:50:8D:5F:26:4F:6F:F9:C9:16:88:C8:84:23:A7:E1` becomes active **May 4, 2026 at 3:02 PM UTC** (6:02 PM Jordan time).
- **Until May 4**: Google rejects all AAB uploads. DO NOT attempt.
- **Keystore**: `credentials/android/keystore.jks` (gitignored), keyAlias `de52ad50fa775ae8d96c099131c5f9be`. Credentials in `credentials.json` (gitignored).
- **After May 4**: bump versionCode 22→23 in app.json, run `npx eas-cli build --platform android --profile production`, then upload AAB via Play Console.

### Force Update Feature (added May 4, 2026)
- **Component**: `components/ForceUpdateModal.tsx` — bilingual (AR/EN) modal shown on app launch.
- **Wired in**: `app/_layout.tsx` inside `RootLayoutNav`, alongside other overlays.
- **Backend endpoint**: `GET /api/app-version` (in `server/routes.ts`) — reads from `app_settings` table.
- **Native version source**: `expo-application` → `Application.nativeBuildVersion` (matches versionCode on Android, buildNumber on iOS).
- **Settings keys** (in `app_settings` table — set via `PUT /api/admin/settings`):
  - `min_android_version_code` (number) — show modal if device versionCode < this
  - `min_ios_build_number` (number) — show modal if device buildNumber < this
  - `force_update_enabled` ("true"/"false") — if true, hides "Later" button (mandatory update)
  - `play_store_url` (optional) — defaults to `https://play.google.com/store/apps/details?id=com.xmart.jo`
  - `app_store_url` (optional) — defaults to `https://apps.apple.com/app/id6760316670`
- **Web safe**: returns null on `Platform.OS === 'web'`.
- **Activation flow**: After new build (e.g. vc 23) is approved on stores, set `min_android_version_code=23` and `force_update_enabled=true` to force older users to update. Button opens correct store via `Linking.openURL`.

### Hard Rules
- Never run EAS CLI directly from agent shell — user runs `npx eas ...` from local Shell.
- Never add `android/` to `.easignore` (breaks Facebook SDK build).
- Never commit `credentials.json` or `credentials/` (already gitignored).
- Git remote is `github` not `origin`. Destructive git ops must go through Project Tasks.

## Performance Optimizations (March 2026)
- **Lazy Loading Sections**: Home screen sections below the fold are lazy-loaded via `LazySection` wrapper. Only the first 3 sections render immediately; the rest mount when scrolled near viewport. Uses a scroll-driven registry pattern (no polling intervals).
- **Memoization**: All home section components wrapped in `React.memo()` (SelectedCategories, BrandsStrip, MultiCollection, CollectionShowcase, PromoBannerSlider, StaticBanner, FeaturedProducts, CollectionProducts, ProductSliderSection). `ProductCard` callbacks (`handlePress`, `handleWishlist`) wrapped in `useCallback`. Styles computed via `useMemo`.
- **Query Caching**: Homepage and collection queries use `staleTime: 2min`, `gcTime: 10-15min`. Removed `refetchOnMount: 'always'` to avoid bypassing cache on lazy section mount. Pull-to-refresh still forces refetch.
- **Image Prefetch**: Priority prefetch for above-fold images (hero banners + first 3 sections); deferred prefetch after 2s for below-fold images. URL deduplication via `Set`.
- **FlatList Separators**: Moved inline `ItemSeparatorComponent` arrow functions to module-level constants to avoid re-creation on each render.
