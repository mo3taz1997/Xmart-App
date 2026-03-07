# Xmart Mobile E-Commerce App

## Overview

Xmart is a mobile e-commerce application for the Xmart.jo electronics brand, built with React Native (Expo) and an Express.js backend server. The app connects to a Shopify store via the Storefront GraphQL API to display products, manage carts, handle customer authentication, and process orders. The app is designed with Arabic as the primary language, full RTL support, and day/night theme modes with brand colors (#163259 dark navy, #248CCC bright blue, white).

The architecture follows a client-server pattern where the Express server acts as a proxy/middleware layer between the mobile app and Shopify's Storefront API. The server handles all Shopify GraphQL queries, while the mobile client communicates with the Express server via REST API endpoints.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Mobile App)
- **Framework**: React Native with Expo SDK 54, using Expo Router for file-based navigation
- **Navigation**: Tab-based layout with 5 main tabs (Home, Categories, Wishlist, Cart, Profile) plus stack screens for product details, collection browsing, search, orders, and authentication
- **State Management**: React Context API for Auth, Cart, Wishlist, and Language state. TanStack React Query for server data fetching and caching
- **Styling**: StyleSheet API with a centralized color constants file (`constants/colors.ts`). Day/night theme modes managed by `contexts/ThemeContext.tsx` with AsyncStorage persistence. Brand colors: #163259 (navy), #248CCC (blue), white
- **RTL Support**: Full manual RTL layout without `I18nManager.forceRTL`. The app dynamically adjusts flexDirection, textAlign, writingDirection, direction, and chevron icons based on language via `isRTL` from LanguageContext. This ensures consistent behavior across web and native platforms
- **Internationalization**: Custom i18n system in `lib/i18n.ts` with Arabic and English translations. Server-side translation endpoint (`/api/translate`) for dynamic Shopify content translation
- **Fonts**: Cairo font family (Regular, SemiBold, Bold) loaded via `@expo-google-fonts/cairo`
- **Authentication Storage**: `expo-secure-store` on native, `AsyncStorage` on web for storing Shopify customer access tokens

### Backend (Express Server)
- **Framework**: Express.js v5 running on the same deployment as the mobile app
- **Purpose**: Acts as an API proxy to Shopify's Storefront GraphQL API. This avoids exposing Shopify credentials to the client
- **API Pattern**: RESTful endpoints under `/api/` that translate to Shopify GraphQL queries
- **Key Routes** (defined in `server/routes.ts`):
  - `GET /api/collections` - List all collections
  - `GET /api/collections/:handle/products` - Products in a collection with sorting/filtering
  - `GET /api/products` - List products
  - `GET /api/products/:handle` - Single product details
  - `GET /api/search?q=` - Product search
  - `POST /api/cart/create`, `/api/cart/add`, `/api/cart/update` - Cart operations
  - Auth endpoints for login, register, password recovery, customer profile update (`PUT /api/customer/update`)
  - `POST /api/orders` - Place order (COD) with optional discount/shipping, creates Shopify draft order + saves to DB
  - `GET /api/orders?email=` - Fetch orders by customer email
  - `GET /api/shipping-rates` - Fetch shipping rates from Shopify shipping zones (price-based tiers)
  - `POST /api/validate-discount` - Validate discount code via Storefront API cart
  - `POST /api/translate` - Text translation endpoint
  - `GET /api/homepage` - Homepage sections and banners (from database)
- **Admin Panel** (`server/admin-routes.ts`): Control panel served at `/admin` on port 5000 for managing:
  - Homepage sections (banner sliders, product grids, category rows, collection sliders)
  - Banners within sections (image URL, link type, link value, ordering, visibility)
  - Categories (3-level hierarchy: main categories → sub-categories → sub-sub-categories, each with AR/EN titles, images, Shopify collection handles)
  - Notifications (send to all app users with AR/EN title/body, optional image, optional link)
  - App settings (logo URL day/night variants, store name, contact info, announcement bar)
  - Admin API routes: `GET/POST /api/admin/sections`, `PUT/DELETE /api/admin/sections/:id`, `POST /api/admin/banners`, `PUT/DELETE /api/admin/banners/:id`, `GET/PUT /api/admin/settings`, `GET/POST/PUT/DELETE /api/admin/categories`, `GET/POST/DELETE /api/admin/notifications`
- **Shopify Integration**: `server/shopify.ts` handles all GraphQL communication with Shopify using the Storefront API (version 2024-01)
- **Static Serving**: In production, serves the Expo web build as static files

### Database
- **Schema**: Drizzle ORM with PostgreSQL (`shared/schema.ts`) with tables:
  - `users` - Basic user accounts
  - `homepage_sections` - Homepage sections with type, titles (AR/EN), sort order, visibility
  - `homepage_banners` - Banners linked to sections with image URLs, link type/value, sort order
  - `app_settings` - Key-value store for app configuration (logo, store info, announcements)
  - `customer_addresses` - Saved customer shipping addresses with label, name, phone, address, city, default flag
  - `orders` - Customer orders with shipping info, payment method (COD), status, totals
  - `order_items` - Individual items within each order (product/variant info, quantity, price)
  - `categories` - 3-level category hierarchy (parentId for nesting, titles AR/EN, imageUrl, collectionHandle, sortOrder, visible)
  - `suggested_products` - Admin-curated product picks shown on categories level 1 (productHandle, titles AR/EN, imageUrl, sortOrder, visible)
- **3-Level Category System**: `categories` table with `parentId` for nesting — level 1 (parentId=null), level 2, level 3. Admin CRUD at `/api/admin/categories`. Public tree endpoint at `/api/categories`. Frontend: circles grid (L1) → horizontal circles + products (L2/L3) with drill-down navigation
- **multi_collection section**: New homepage section type "مجموعات متعددة (تابات)" — admin manages tabs (handle, AR/EN title); metadata `{ tabs: [...] }` stored in homepage_sections; frontend `MultiCollectionSection` in index.tsx shows animated pill tab switcher + horizontal product FlatList per tab
- **static_banner section**: Single static banner — admin sets image URL, link type (none/collection/product/url), link value with search picker; metadata `{ imageUrl, linkType, linkValue }`; frontend `StaticBannerSection` in index.tsx renders full-width image with dynamic height based on aspect ratio, `contentFit="contain"`
- **brands_strip section**: Infinite scrolling brand ticker — admin picks vendors from Shopify products via `/api/admin/search-vendors?q=`; metadata `{ brands: [{name, imageUrl}] }`; frontend `BrandsStripSection` in index.tsx uses `Animated.loop` + `Easing.linear` translateX for seamless RTL-compatible infinite scroll
  - `notifications` - App notifications with AR/EN titles, body, optional image and link
- **Connection**: `server/db.ts` manages the database connection pool
- **Order Flow**: Checkout collects shipping info in-app, updates cart buyer identity on Shopify, then opens Shopify's secure checkout page for payment. Supports all payment methods configured in Shopify (COD, cards, etc.). Orders appear in Shopify admin. A local copy is also saved to PostgreSQL for in-app tracking
- **COD Order Flow**: COD checkout form collects shipping info, validates discount codes via Storefront API cart, fetches shipping rates from Shopify shipping zones. Creates Shopify draft order with discount + shipping → completes as real order with `payment_pending: true`. Also saves to PostgreSQL

### Key Environment Variables
- `SHOPIFY_STORE_DOMAIN` - The Shopify store domain (e.g., `store-name.myshopify.com`)
- `SHOPIFY_STOREFRONT_ACCESS_TOKEN` - Shopify Storefront API access token
- `DATABASE_URL` - PostgreSQL connection string (for Drizzle)
- `EXPO_PUBLIC_DOMAIN` - The public domain for the Express server API (auto-set from Replit environment)

### Build & Development
- **Development**: Two processes run simultaneously - Expo dev server (`expo:dev`) and Express server (`server:dev`)
- **Production Build**: Custom build script (`scripts/build.js`) bundles the Expo web app, then Express serves static files
- **Server Build**: Uses esbuild to bundle the server for production
- **OTA Updates**: `expo-updates` is configured. EAS project ID: `3e6b6783-234b-4908-9292-c1396a2444f9`. Channels: `preview` (APK builds), `production` (Play Store). Push frontend updates with: `eas update --branch preview --message "description"`. The app auto-checks and applies updates on cold start.

## External Dependencies

### Shopify Storefront GraphQL API
- Primary data source for all e-commerce functionality
- Handles: products, collections, cart, checkout, customer auth, orders
- Configured via `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_STOREFRONT_ACCESS_TOKEN` environment variables
- API version: 2024-01

### PostgreSQL Database
- Connected via `DATABASE_URL` environment variable
- Managed with Drizzle ORM and drizzle-kit for migrations
- Currently minimal usage (basic users table); Shopify serves as the primary data store

### Key NPM Packages
- `expo` (SDK 54) - Cross-platform mobile framework
- `expo-router` - File-based navigation
- `@tanstack/react-query` - Data fetching and caching
- `express` v5 - Backend API server
- `drizzle-orm` + `pg` - Database ORM and PostgreSQL client
- `expo-secure-store` - Secure token storage on native
- `expo-image` - Optimized image rendering
- `react-native-reanimated` - Animations
- `expo-haptics` - Haptic feedback
- `expo-web-browser` - Opening checkout URLs
- `expo-localization` - Device language detection