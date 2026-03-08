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
