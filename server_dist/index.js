var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  appSettings: () => appSettings,
  categories: () => categories,
  customerAddresses: () => customerAddresses,
  homepageBanners: () => homepageBanners,
  homepageSections: () => homepageSections,
  insertUserSchema: () => insertUserSchema,
  notifications: () => notifications,
  orderItems: () => orderItems,
  orders: () => orders,
  pushTokens: () => pushTokens,
  suggestedProducts: () => suggestedProducts,
  uploadedImages: () => uploadedImages,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, customType } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var bytea, uploadedImages, users, insertUserSchema, homepageSections, homepageBanners, appSettings, orders, customerAddresses, orderItems, categories, suggestedProducts, pushTokens, notifications;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    bytea = customType({
      dataType() {
        return "bytea";
      },
      toDriver(value) {
        return value;
      },
      fromDriver(value) {
        return Buffer.from(value);
      }
    });
    uploadedImages = pgTable("uploaded_images", {
      filename: varchar("filename").primaryKey(),
      data: bytea("data").notNull(),
      mimeType: text("mime_type").notNull().default("image/png"),
      createdAt: timestamp("created_at").defaultNow()
    });
    users = pgTable("users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      username: text("username").notNull().unique(),
      password: text("password").notNull()
    });
    insertUserSchema = createInsertSchema(users).pick({
      username: true,
      password: true
    });
    homepageSections = pgTable("homepage_sections", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      type: text("type").notNull(),
      titleAr: text("title_ar"),
      titleEn: text("title_en"),
      language: text("language").notNull().default("both"),
      sortOrder: integer("sort_order").notNull().default(0),
      visible: boolean("visible").notNull().default(true),
      metadata: text("metadata"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    homepageBanners = pgTable("homepage_banners", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      sectionId: varchar("section_id").notNull(),
      imageUrl: text("image_url").notNull(),
      linkType: text("link_type").default("collection"),
      linkValue: text("link_value"),
      sortOrder: integer("sort_order").notNull().default(0),
      visible: boolean("visible").notNull().default(true),
      language: text("language").default("both"),
      createdAt: timestamp("created_at").defaultNow()
    });
    appSettings = pgTable("app_settings", {
      key: varchar("key").primaryKey(),
      value: text("value").notNull(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    orders = pgTable("orders", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      orderNumber: integer("order_number").notNull(),
      shopifyCheckoutId: text("shopify_checkout_id"),
      customerEmail: text("customer_email").notNull(),
      customerFirstName: text("customer_first_name").notNull(),
      customerLastName: text("customer_last_name").notNull(),
      customerPhone: text("customer_phone").notNull(),
      shippingAddress: text("shipping_address"),
      shippingCity: text("shipping_city"),
      notes: text("notes"),
      paymentMethod: text("payment_method").notNull().default("cod"),
      status: text("status").notNull().default("pending"),
      subtotal: text("subtotal").notNull(),
      shippingCost: text("shipping_cost").notNull().default("0"),
      total: text("total").notNull(),
      currency: text("currency").notNull().default("JOD"),
      deliveryCode: text("delivery_code"),
      shopifyOrderName: text("shopify_order_name"),
      shopifyOrderId: text("shopify_order_id"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    customerAddresses = pgTable("customer_addresses", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      customerEmail: text("customer_email").notNull(),
      label: text("label"),
      firstName: text("first_name").notNull(),
      lastName: text("last_name").notNull(),
      phone: text("phone").notNull(),
      address: text("address"),
      city: text("city"),
      country: text("country").default("JO"),
      isDefault: boolean("is_default").notNull().default(false),
      shopifyAddressId: text("shopify_address_id"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    orderItems = pgTable("order_items", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      orderId: varchar("order_id").notNull(),
      productTitle: text("product_title").notNull(),
      productHandle: text("product_handle"),
      variantTitle: text("variant_title"),
      variantId: text("variant_id"),
      quantity: integer("quantity").notNull(),
      price: text("price").notNull(),
      currency: text("currency").notNull().default("JOD"),
      imageUrl: text("image_url")
    });
    categories = pgTable("categories", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      parentId: varchar("parent_id"),
      titleAr: text("title_ar").notNull(),
      titleEn: text("title_en").notNull(),
      imageUrl: text("image_url"),
      collectionHandle: text("collection_handle"),
      sortOrder: integer("sort_order").notNull().default(0),
      visible: boolean("visible").notNull().default(true),
      createdAt: timestamp("created_at").defaultNow()
    });
    suggestedProducts = pgTable("suggested_products", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      productHandle: text("product_handle").notNull(),
      titleAr: text("title_ar"),
      titleEn: text("title_en"),
      imageUrl: text("image_url"),
      sortOrder: integer("sort_order").notNull().default(0),
      visible: boolean("visible").notNull().default(true),
      createdAt: timestamp("created_at").defaultNow()
    });
    pushTokens = pgTable("push_tokens", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      token: text("token").notNull().unique(),
      platform: text("platform"),
      createdAt: timestamp("created_at").defaultNow()
    });
    notifications = pgTable("notifications", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      titleAr: text("title_ar").notNull(),
      titleEn: text("title_en").notNull(),
      bodyAr: text("body_ar"),
      bodyEn: text("body_en"),
      imageUrl: text("image_url"),
      linkType: text("link_type").default("none"),
      linkValue: text("link_value"),
      createdAt: timestamp("created_at").defaultNow()
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db
});
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
var pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 3e4,
      connectionTimeoutMillis: 1e4
    });
    pool.on("error", (err) => {
      console.error("[DB Pool] Unexpected error on idle client:", err.message);
    });
    db = drizzle(pool, { schema: schema_exports });
  }
});

// server/index.ts
import express from "express";
import session from "express-session";
import bcrypt from "bcryptjs";

// server/routes.ts
import { createServer } from "node:http";

// server/shopify.ts
var SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || "";
var SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || "";
var SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "";
async function shopifyAdminFetch(endpoint, method = "GET", body) {
  let adminDomain = SHOPIFY_STORE_DOMAIN;
  if (!adminDomain.includes(".myshopify.com")) {
    adminDomain = await resolveShopifyAdminDomain(adminDomain);
  }
  const url = `https://${adminDomain}/admin/api/2024-01/${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": SHOPIFY_ADMIN_ACCESS_TOKEN
  };
  const fetchOptions = {
    method,
    headers
  };
  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    fetchOptions.body = JSON.stringify(body);
  }
  console.log(`[Admin API] ${method} ${url}`);
  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    const text2 = await response.text();
    throw new Error(`Shopify Admin API error: ${response.status} - ${text2}`);
  }
  return response.json();
}
async function shopifyAdminGraphQL(query, variables) {
  let adminDomain = SHOPIFY_STORE_DOMAIN;
  if (!adminDomain.includes(".myshopify.com")) {
    adminDomain = await resolveShopifyAdminDomain(adminDomain);
  }
  const url = `https://${adminDomain}/admin/api/2024-01/graphql.json`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": SHOPIFY_ADMIN_ACCESS_TOKEN
    },
    body: JSON.stringify({ query, variables })
  });
  if (!response.ok) {
    const text2 = await response.text();
    throw new Error(`Shopify Admin GraphQL error: ${response.status} - ${text2}`);
  }
  const json = await response.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}
var _resolvedAdminDomain = null;
async function resolveShopifyAdminDomain(domain) {
  if (_resolvedAdminDomain) return _resolvedAdminDomain;
  try {
    const res = await fetch(`https://${domain}/admin/api/2024-01/shop.json`, {
      method: "GET",
      headers: { "X-Shopify-Access-Token": SHOPIFY_ADMIN_ACCESS_TOKEN },
      redirect: "manual"
    });
    const location = res.headers.get("location");
    if (location) {
      const match = location.match(/https:\/\/([^/]+)\//);
      if (match) {
        _resolvedAdminDomain = match[1];
        console.log(`[Admin API] Resolved admin domain: ${_resolvedAdminDomain}`);
        return _resolvedAdminDomain;
      }
    }
  } catch (e) {
  }
  _resolvedAdminDomain = domain;
  return domain;
}
function extractNumericId(gid) {
  const match = gid.match(/(\d+)$/);
  return match ? match[1] : gid;
}
async function shopifyFetch(query, variables = {}) {
  let storefrontDomain = SHOPIFY_STORE_DOMAIN;
  if (!storefrontDomain.includes(".myshopify.com")) {
    storefrontDomain = await resolveShopifyAdminDomain(storefrontDomain);
  }
  const url = `https://${storefrontDomain}/api/2024-01/graphql.json`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_ACCESS_TOKEN
    },
    body: JSON.stringify({ query, variables })
  });
  if (!response.ok) {
    const text2 = await response.text();
    throw new Error(`Shopify API error: ${response.status} - ${text2}`);
  }
  const json = await response.json();
  if (json.errors) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}
var QUERIES = {
  COLLECTIONS: `
    query GetCollections($first: Int!, $query: String, $language: LanguageCode) @inContext(language: $language) {
      collections(first: $first, query: $query) {
        edges {
          node {
            id
            title
            handle
            description
            image {
              url
              altText
            }
          }
        }
      }
    }
  `,
  COLLECTION_PRODUCTS: `
    query GetCollectionProducts($handle: String!, $first: Int!, $after: String, $sortKey: ProductCollectionSortKeys, $reverse: Boolean, $filters: [ProductFilter!], $language: LanguageCode) @inContext(language: $language) {
      collection(handle: $handle) {
        id
        title
        handle
        description
        products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, filters: $filters) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              handle
              description
              descriptionHtml
              productType
              vendor
              availableForSale
              compareAtPriceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 5) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    availableForSale
                    price {
                      amount
                      currencyCode
                    }
                    compareAtPrice {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `,
  PRODUCTS: `
    query GetProducts($first: Int!, $after: String, $sortKey: ProductSortKeys, $reverse: Boolean, $query: String, $language: LanguageCode) @inContext(language: $language) {
      products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, query: $query) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            title
            handle
            description
            descriptionHtml
            productType
            vendor
            availableForSale
            compareAtPriceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
              maxVariantPrice {
                amount
                currencyCode
              }
            }
            images(first: 5) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  availableForSale
                  quantityAvailable
                  price {
                    amount
                    currencyCode
                  }
                  compareAtPrice {
                    amount
                    currencyCode
                  }
                  image {
                    url
                    altText
                  }
                }
              }
            }
          }
        }
      }
    }
  `,
  PRODUCT_BY_HANDLE: `
    query GetProductByHandle($handle: String!, $language: LanguageCode) @inContext(language: $language) {
      product(handle: $handle) {
        id
        title
        handle
        description
        descriptionHtml
        productType
        vendor
        availableForSale
        tags
        compareAtPriceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
          maxVariantPrice {
            amount
            currencyCode
          }
        }
        images(first: 50) {
          edges {
            node {
              url
              altText
            }
          }
        }
        ratingValue: metafield(namespace: "reviews", key: "rating") {
          value
        }
        ratingCount: metafield(namespace: "reviews", key: "rating_count") {
          value
        }
        variants(first: 30) {
          edges {
            node {
              id
              title
              sku
              availableForSale
              quantityAvailable
              price {
                amount
                currencyCode
              }
              compareAtPrice {
                amount
                currencyCode
              }
              image {
                url
                altText
              }
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
  `,
  SEARCH_PRODUCTS: `
    query SearchProducts($query: String!, $first: Int!, $language: LanguageCode) @inContext(language: $language) {
      products(first: $first, query: $query) {
        edges {
          node {
            id
            title
            handle
            vendor
            productType
            tags
            description
            availableForSale
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            compareAtPriceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  `,
  VENDOR_PRODUCTS: `
    query GetVendorProducts($first: Int!, $query: String!) {
      products(first: $first, query: $query) {
        edges {
          node {
            vendor
            featuredImage { url }
            images(first: 1) { edges { node { url } } }
            metafield(namespace: "brand", key: "logo") {
              reference {
                ... on MediaImage {
                  image { url }
                }
              }
            }
          }
        }
      }
    }
  `,
  GET_CART: `
    query GetCart($cartId: ID!) {
      cart(id: $cartId) {
        id
        checkoutUrl
        totalQuantity
        cost {
          totalAmount {
            amount
            currencyCode
          }
          subtotalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 50) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    id
                    title
                    handle
                    vendor
                    images(first: 1) {
                      edges {
                        node {
                          url
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        discountCodes {
          code
          applicable
        }
      }
    }
  `,
  CREATE_CART: `
    mutation CartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
            subtotalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      id
                      title
                      handle
                      vendor
                      images(first: 1) {
                        edges {
                          node {
                            url
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
  ADD_TO_CART: `
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          id
          checkoutUrl
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
            subtotalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      id
                      title
                      handle
                      vendor
                      images(first: 1) {
                        edges {
                          node {
                            url
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
  UPDATE_CART_LINES: `
    mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart {
          id
          checkoutUrl
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
            subtotalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      id
                      title
                      handle
                      vendor
                      images(first: 1) {
                        edges {
                          node {
                            url
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
  REMOVE_CART_LINES: `
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart {
          id
          checkoutUrl
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
            subtotalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      id
                      title
                      handle
                      vendor
                      images(first: 1) {
                        edges {
                          node {
                            url
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
  APPLY_DISCOUNT: `
    mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!) {
      cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
        cart {
          id
          checkoutUrl
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
            subtotalAmount {
              amount
              currencyCode
            }
          }
          discountCodes {
            code
            applicable
          }
          discountAllocations {
            discountedAmount {
              amount
              currencyCode
            }
            ... on CartCodeDiscountAllocation {
              code
            }
          }
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                cost {
                  totalAmount {
                    amount
                    currencyCode
                  }
                  subtotalAmount {
                    amount
                    currencyCode
                  }
                  amountPerQuantity {
                    amount
                    currencyCode
                  }
                  compareAtAmountPerQuantity {
                    amount
                    currencyCode
                  }
                }
                discountAllocations {
                  discountedAmount {
                    amount
                    currencyCode
                  }
                  ... on CartCodeDiscountAllocation {
                    code
                  }
                }
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      id
                      title
                      handle
                      vendor
                      images(first: 1) {
                        edges {
                          node {
                            url
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
  CART_BUYER_IDENTITY_UPDATE: `
    mutation cartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
      cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
        cart {
          id
          checkoutUrl
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
            subtotalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      id
                      title
                      handle
                      vendor
                      images(first: 1) {
                        edges {
                          node {
                            url
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
  CART_NOTE_UPDATE: `
    mutation cartNoteUpdate($cartId: ID!, $note: String!) {
      cartNoteUpdate(cartId: $cartId, note: $note) {
        cart {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
  CHECKOUT_CREATE: `
    mutation checkoutCreate($input: CheckoutCreateInput!) {
      checkoutCreate(input: $input) {
        checkout {
          id
          webUrl
          totalPriceV2 {
            amount
            currencyCode
          }
          lineItems(first: 50) {
            edges {
              node {
                title
                quantity
                variant {
                  id
                  title
                  priceV2 {
                    amount
                    currencyCode
                  }
                  product {
                    title
                  }
                }
              }
            }
          }
        }
        checkoutUserErrors {
          code
          field
          message
        }
      }
    }
  `,
  CHECKOUT_SHIPPING_ADDRESS_UPDATE: `
    mutation checkoutShippingAddressUpdateV2($checkoutId: ID!, $shippingAddress: MailingAddressInput!) {
      checkoutShippingAddressUpdateV2(checkoutId: $checkoutId, shippingAddress: $shippingAddress) {
        checkout {
          id
          webUrl
        }
        checkoutUserErrors {
          code
          field
          message
        }
      }
    }
  `,
  CHECKOUT_EMAIL_UPDATE: `
    mutation checkoutEmailUpdateV2($checkoutId: ID!, $email: String!) {
      checkoutEmailUpdateV2(checkoutId: $checkoutId, email: $email) {
        checkout {
          id
        }
        checkoutUserErrors {
          code
          field
          message
        }
      }
    }
  `,
  CUSTOMER_CREATE: `
    mutation CustomerCreate($input: CustomerCreateInput!) {
      customerCreate(input: $input) {
        customer {
          id
          email
          firstName
          lastName
        }
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `,
  CUSTOMER_ACCESS_TOKEN_CREATE: `
    mutation CustomerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
      customerAccessTokenCreate(input: $input) {
        customerAccessToken {
          accessToken
          expiresAt
        }
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `,
  CUSTOMER_RECOVER: `
    mutation CustomerRecover($email: String!) {
      customerRecover(email: $email) {
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `,
  GET_CUSTOMER: `
    query GetCustomer($customerAccessToken: String!, $language: LanguageCode) @inContext(language: $language) {
      customer(customerAccessToken: $customerAccessToken) {
        id
        email
        firstName
        lastName
        phone
        defaultAddress {
          id
        }
        addresses(first: 20) {
          edges {
            node {
              id
              address1
              address2
              city
              company
              country
              firstName
              lastName
              phone
              province
              zip
            }
          }
        }
        orders(first: 50, sortKey: PROCESSED_AT, reverse: true) {
          edges {
            node {
              id
              name
              orderNumber
              processedAt
              canceledAt
              financialStatus
              fulfillmentStatus
              statusUrl
              totalPrice {
                amount
                currencyCode
              }
              subtotalPrice {
                amount
                currencyCode
              }
              totalShippingPrice {
                amount
                currencyCode
              }
              totalTax {
                amount
                currencyCode
              }
              currentTotalPrice {
                amount
                currencyCode
              }
              shippingAddress {
                city
                address1
                phone
                firstName
                lastName
              }
          lineItems(first: 100) {
            edges {
              node {
                title
                quantity
                originalTotalPrice {
                  amount
                  currencyCode
                }
                variant {
                  id
                  title
                  availableForSale
                  image {
                    url
                  }
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    handle
                  }
                }
              }
            }
          }
            }
          }
        }
      }
    }
  `,
  CUSTOMER_UPDATE: `
    mutation CustomerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
      customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
        customer {
          id
          email
          firstName
          lastName
          phone
        }
        customerAccessToken {
          accessToken
          expiresAt
        }
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `,
  PRODUCT_RECOMMENDATIONS: `
    query GetProductRecommendations($productId: ID!, $language: LanguageCode) @inContext(language: $language) {
      productRecommendations(productId: $productId) {
        id
        title
        handle
        vendor
        availableForSale
        productType
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        compareAtPriceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        images(first: 1) {
          edges {
            node {
              url
              altText
            }
          }
        }
        variants(first: 1) {
          edges {
            node {
              id
              title
              availableForSale
              quantityAvailable
              price {
                amount
                currencyCode
              }
              image {
                url
                altText
              }
            }
          }
        }
      }
    }
  `
};
var ADMIN_QUERIES = {
  COLLECTIONS: `
    query GetCollections($first: Int!) {
      collections(first: $first) {
        edges {
          node {
            id
            title
            handle
            description
            image { url altText }
          }
        }
      }
    }
  `,
  COLLECTION_PRODUCTS: `
    query GetCollectionProducts($query: String!, $first: Int!, $after: String, $sortKey: ProductCollectionSortKeys, $reverse: Boolean) {
      collections(first: 1, query: $query) {
        edges {
          node {
            id
            title
            handle
            description
            products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse) {
              pageInfo { hasNextPage endCursor }
              edges {
                node {
                  id title handle description descriptionHtml productType vendor
                  priceRangeV2 { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
                  images(first: 5) { edges { node { url altText } } }
                  variants(first: 10) {
                    edges { node { id title availableForSale price compareAtPrice } }
                  }
                }
              }
            }
          }
        }
      }
    }
  `,
  PRODUCTS: `
    query GetProducts($first: Int!, $after: String, $sortKey: ProductSortKeys, $reverse: Boolean, $query: String) {
      products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, query: $query) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id title handle description descriptionHtml productType vendor
            priceRangeV2 { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
            images(first: 5) { edges { node { url altText } } }
            variants(first: 10) {
              edges { node { id title availableForSale price compareAtPrice } }
            }
          }
        }
      }
    }
  `,
  PRODUCT_BY_HANDLE: `
    query GetProductByHandle($query: String!) {
      products(first: 1, query: $query) {
        edges {
          node {
            id title handle description descriptionHtml productType vendor tags
            priceRangeV2 { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
            images(first: 50) { edges { node { url altText } } }
            ratingValue: metafield(namespace: "reviews", key: "rating") { value }
            ratingCount: metafield(namespace: "reviews", key: "rating_count") { value }
            variants(first: 30) {
              edges { node { id title availableForSale price compareAtPrice image { url altText } selectedOptions { name value } } }
            }
          }
        }
      }
    }
  `,
  SEARCH_PRODUCTS: `
    query SearchProducts($query: String!, $first: Int!) {
      products(first: $first, query: $query) {
        edges {
          node {
            id title handle vendor productType tags description
            priceRangeV2 { minVariantPrice { amount currencyCode } }
            images(first: 1) { edges { node { url altText } } }
            variants(first: 1) { edges { node { id title availableForSale price compareAtPrice } } }
          }
        }
      }
    }
  `
};
function mapAdminProduct(p) {
  const currencyCode = p.priceRangeV2?.minVariantPrice?.currencyCode || "JOD";
  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    description: p.description,
    descriptionHtml: p.descriptionHtml,
    productType: p.productType,
    vendor: p.vendor,
    tags: p.tags || [],
    availableForSale: p.variants?.edges?.some((e) => e.node.availableForSale) ?? true,
    priceRange: p.priceRangeV2 || { minVariantPrice: { amount: "0", currencyCode }, maxVariantPrice: { amount: "0", currencyCode } },
    compareAtPriceRange: (() => {
      const compareAtPrices = (p.variants?.edges || []).map((e) => e.node.compareAtPrice ? parseFloat(e.node.compareAtPrice) : null).filter((v) => v !== null && !isNaN(v));
      if (compareAtPrices.length === 0) return { minVariantPrice: null };
      const minCat = Math.min(...compareAtPrices);
      return { minVariantPrice: { amount: String(minCat), currencyCode } };
    })(),
    images: p.images,
    ratingValue: p.ratingValue,
    ratingCount: p.ratingCount,
    variants: {
      edges: (p.variants?.edges || []).map((e) => ({
        node: {
          id: e.node.id,
          title: e.node.title,
          availableForSale: e.node.availableForSale,
          image: e.node.image,
          selectedOptions: e.node.selectedOptions,
          price: { amount: String(e.node.price || "0"), currencyCode },
          compareAtPrice: e.node.compareAtPrice ? { amount: String(e.node.compareAtPrice), currencyCode } : null
        }
      }))
    }
  };
}

// server/checkout-complete.ts
var SHOPIFY_STORE_DOMAIN2 = process.env.SHOPIFY_STORE_DOMAIN || "";
var CookieJar = class {
  cookies = /* @__PURE__ */ new Map();
  update(headers) {
    const raw = headers.getSetCookie?.();
    if (raw) {
      for (const cookieStr of raw) {
        const nameValue = cookieStr.split(";")[0];
        const eqIndex = nameValue.indexOf("=");
        if (eqIndex > 0) {
          const name = nameValue.substring(0, eqIndex).trim();
          const value = nameValue.substring(eqIndex + 1).trim();
          this.cookies.set(name, value);
        }
      }
    }
  }
  toString() {
    return Array.from(this.cookies.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
  }
};
function extractAuthToken(html) {
  const match = html.match(/name="authenticity_token"[^>]*value="([^"]+)"/);
  if (match) return match[1];
  const match2 = html.match(/value="([^"]+)"[^>]*name="authenticity_token"/);
  return match2?.[1] || null;
}
function detectCurrentStep(html) {
  const stepMatch = html.match(/data-step="([^"]+)"/);
  if (stepMatch) return stepMatch[1];
  if (html.includes('step="contact_information"') || html.includes('data-step="contact_information"'))
    return "contact_information";
  if (html.includes('step="shipping_method"') || html.includes('data-step="shipping_method"'))
    return "shipping_method";
  if (html.includes('step="payment_method"') || html.includes('data-step="payment_method"'))
    return "payment_method";
  if (html.includes('step="processing"') || html.includes('step="thank_you"'))
    return "complete";
  if (html.includes("Thank you") || html.includes("order-confirmation") || html.includes("os-order-number"))
    return "complete";
  return "unknown";
}
function extractShippingRateId(html) {
  const match = html.match(/name="checkout\[shipping_rate\]\[id\]"[^>]*value="([^"]+)"/);
  if (match) return match[1];
  const match2 = html.match(/value="([^"]+)"[^>]*name="checkout\[shipping_rate\]\[id\]"/);
  if (match2) return match2[1];
  const match3 = html.match(/data-shipping-method="([^"]+)"/);
  if (match3) return match3[1];
  const match4 = html.match(/shipping_rate[^"]*"[^>]*value="([^"]+)"/);
  return match4?.[1] || null;
}
function extractPaymentGatewayId(html) {
  const codMatch = html.match(/data-gateway-name="(manual|cash|cod)"[^>]*data-select-gateway="(\d+)"/i);
  if (codMatch) return codMatch[2];
  const codMatch2 = html.match(/data-select-gateway="(\d+)"[^>]*data-gateway-name="(manual|cash|cod)"/i);
  if (codMatch2) return codMatch2[1];
  const gatewayMatch = html.match(/name="checkout\[payment_gateway\]"[^>]*value="(\d+)"/);
  if (gatewayMatch) return gatewayMatch[1];
  const radioMatch = html.match(/data-select-gateway="(\d+)"/);
  return radioMatch?.[1] || null;
}
function extractOrderNumber(html) {
  const match = html.match(/os-order-number[^>]*>.*?#(\d+)/s);
  if (match) return match[1];
  const match2 = html.match(/order_number[^>]*>.*?(\d+)/s);
  if (match2) return match2[1];
  const match3 = html.match(/#(\d{4,})/);
  return match3?.[1] || null;
}
async function followRedirects(url, jar, headers, maxRedirects = 10) {
  let currentUrl = url;
  for (let i = 0; i < maxRedirects; i++) {
    const response = await fetch(currentUrl, {
      headers: { ...headers, Cookie: jar.toString() },
      redirect: "manual"
    });
    jar.update(response.headers);
    const status = response.status;
    if (status >= 300 && status < 400) {
      const location = response.headers.get("location");
      if (!location) break;
      currentUrl = location.startsWith("http") ? location : new URL(location, currentUrl).toString();
      await response.text();
      continue;
    }
    const html = await response.text();
    return { url: currentUrl, html };
  }
  throw new Error("Too many redirects");
}
async function autoCompleteCheckout(checkoutUrl, customer) {
  const jar = new CookieJar();
  const baseHeaders = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
    "Accept-Encoding": "identity",
    "Cache-Control": "no-cache"
  };
  try {
    console.log("[AutoCheckout] Starting checkout automation...");
    console.log("[AutoCheckout] URL:", checkoutUrl);
    const step1 = await followRedirects(checkoutUrl, jar, baseHeaders);
    let html = step1.html;
    let currentUrl = step1.url;
    console.log("[AutoCheckout] Loaded page, length:", html.length);
    const authToken = extractAuthToken(html);
    if (!authToken) {
      console.log("[AutoCheckout] No authenticity_token found - SPA or non-standard checkout");
      return {
        success: false,
        redirectUrl: checkoutUrl,
        error: "Could not parse checkout page"
      };
    }
    let step = detectCurrentStep(html);
    console.log("[AutoCheckout] Detected step:", step);
    const baseCheckoutUrl = currentUrl.split("?")[0];
    if (step === "contact_information" || step === "unknown") {
      console.log("[AutoCheckout] Submitting contact information...");
      let formattedPhone = customer.phone || "";
      formattedPhone = formattedPhone.replace(/\s+/g, "").replace(/-/g, "");
      if (formattedPhone.startsWith("07")) {
        formattedPhone = "+962" + formattedPhone.substring(1);
      } else if (formattedPhone.startsWith("7") && formattedPhone.length === 9) {
        formattedPhone = "+962" + formattedPhone;
      } else if (formattedPhone && !formattedPhone.startsWith("+")) {
        formattedPhone = "+962" + formattedPhone;
      }
      const formData = new URLSearchParams();
      formData.append("_method", "patch");
      formData.append("authenticity_token", authToken);
      formData.append("previous_step", "contact_information");
      formData.append("step", "shipping_method");
      formData.append("checkout[email]", customer.email);
      formData.append("checkout[buyer_accepts_marketing]", "0");
      formData.append("checkout[shipping_address][first_name]", customer.firstName);
      formData.append("checkout[shipping_address][last_name]", customer.lastName);
      formData.append("checkout[shipping_address][address1]", customer.address || "");
      formData.append("checkout[shipping_address][address2]", "");
      formData.append("checkout[shipping_address][city]", customer.city || "Amman");
      formData.append("checkout[shipping_address][country]", "JO");
      formData.append("checkout[shipping_address][province]", "");
      formData.append("checkout[shipping_address][zip]", "");
      formData.append("checkout[shipping_address][phone]", formattedPhone);
      formData.append("checkout[client_details][browser_width]", "412");
      formData.append("checkout[client_details][browser_height]", "915");
      formData.append("checkout[client_details][javascript_enabled]", "1");
      if (customer.notes) {
        formData.append("checkout[note]", customer.notes);
      }
      const contactResponse = await fetch(baseCheckoutUrl, {
        method: "POST",
        headers: {
          ...baseHeaders,
          "Cookie": jar.toString(),
          "Content-Type": "application/x-www-form-urlencoded",
          "Origin": `https://${SHOPIFY_STORE_DOMAIN2}`,
          "Referer": currentUrl
        },
        body: formData.toString(),
        redirect: "manual"
      });
      jar.update(contactResponse.headers);
      if (contactResponse.status >= 300 && contactResponse.status < 400) {
        const location = contactResponse.headers.get("location") || "";
        await contactResponse.text();
        const nextStep = await followRedirects(
          location.startsWith("http") ? location : new URL(location, baseCheckoutUrl).toString(),
          jar,
          baseHeaders
        );
        html = nextStep.html;
        currentUrl = nextStep.url;
      } else {
        html = await contactResponse.text();
      }
      step = detectCurrentStep(html);
      console.log("[AutoCheckout] After contact info, step:", step);
      if (step === "contact_information" || step === "unknown") {
        const errorMatch = html.match(/field__message[^>]*>([^<]+)/);
        const errorMsg = errorMatch ? errorMatch[1].trim() : "Contact information rejected";
        console.log("[AutoCheckout] Contact info rejected:", errorMsg);
        return {
          success: false,
          redirectUrl: checkoutUrl,
          error: errorMsg
        };
      }
    }
    if (step === "shipping_method") {
      console.log("[AutoCheckout] Submitting shipping method...");
      const newAuthToken = extractAuthToken(html) || authToken;
      const shippingRateId = extractShippingRateId(html);
      console.log("[AutoCheckout] Shipping rate ID:", shippingRateId);
      const formData = new URLSearchParams();
      formData.append("_method", "patch");
      formData.append("authenticity_token", newAuthToken);
      formData.append("previous_step", "shipping_method");
      formData.append("step", "payment_method");
      if (shippingRateId) {
        formData.append("checkout[shipping_rate][id]", shippingRateId);
      }
      formData.append("checkout[client_details][browser_width]", "412");
      formData.append("checkout[client_details][browser_height]", "915");
      formData.append("checkout[client_details][javascript_enabled]", "1");
      const shippingResponse = await fetch(baseCheckoutUrl, {
        method: "POST",
        headers: {
          ...baseHeaders,
          "Cookie": jar.toString(),
          "Content-Type": "application/x-www-form-urlencoded",
          "Origin": `https://${SHOPIFY_STORE_DOMAIN2}`,
          "Referer": currentUrl
        },
        body: formData.toString(),
        redirect: "manual"
      });
      jar.update(shippingResponse.headers);
      if (shippingResponse.status >= 300 && shippingResponse.status < 400) {
        const location = shippingResponse.headers.get("location") || "";
        await shippingResponse.text();
        const nextStep = await followRedirects(
          location.startsWith("http") ? location : new URL(location, baseCheckoutUrl).toString(),
          jar,
          baseHeaders
        );
        html = nextStep.html;
        currentUrl = nextStep.url;
      } else {
        html = await shippingResponse.text();
      }
      step = detectCurrentStep(html);
      console.log("[AutoCheckout] After shipping, step:", step);
    }
    if (step === "payment_method") {
      console.log("[AutoCheckout] Processing payment step...");
      const newAuthToken = extractAuthToken(html) || authToken;
      const gatewayId = extractPaymentGatewayId(html);
      console.log("[AutoCheckout] Payment gateway ID:", gatewayId);
      const needsCardInfo = html.includes("card-fields-container") || html.includes("credit-card") || html.includes('data-gateway-group="direct"');
      const hasCodOption = html.toLowerCase().includes("cash on delivery") || html.toLowerCase().includes("\u0627\u0644\u062F\u0641\u0639 \u0639\u0646\u062F \u0627\u0644\u0627\u0633\u062A\u0644\u0627\u0645") || html.toLowerCase().includes("manual") || html.toLowerCase().includes("cod");
      if (!gatewayId) {
        console.log("[AutoCheckout] No payment gateway found, redirecting...");
        return {
          success: false,
          redirectUrl: currentUrl || checkoutUrl,
          error: "No payment gateway found"
        };
      }
      const formData = new URLSearchParams();
      formData.append("_method", "patch");
      formData.append("authenticity_token", newAuthToken);
      formData.append("previous_step", "payment_method");
      formData.append("step", "");
      formData.append("s", "");
      formData.append("checkout[payment_gateway]", gatewayId);
      formData.append("checkout[credit_card][vault]", "false");
      formData.append("checkout[different_billing_address]", "false");
      formData.append("checkout[remember_me]", "false");
      formData.append("checkout[remember_me]", "0");
      formData.append("checkout[vault_phone]", "");
      formData.append("checkout[total_price]", "");
      formData.append("complete", "1");
      formData.append("checkout[client_details][browser_width]", "412");
      formData.append("checkout[client_details][browser_height]", "915");
      formData.append("checkout[client_details][javascript_enabled]", "1");
      console.log("[AutoCheckout] Submitting payment form (gateway:", gatewayId, ")...");
      const paymentResponse = await fetch(baseCheckoutUrl, {
        method: "POST",
        headers: {
          ...baseHeaders,
          "Cookie": jar.toString(),
          "Content-Type": "application/x-www-form-urlencoded",
          "Origin": `https://${SHOPIFY_STORE_DOMAIN2}`,
          "Referer": currentUrl
        },
        body: formData.toString(),
        redirect: "manual"
      });
      jar.update(paymentResponse.headers);
      if (paymentResponse.status >= 300 && paymentResponse.status < 400) {
        const location = paymentResponse.headers.get("location") || "";
        await paymentResponse.text();
        if (location.includes("processing") || location.includes("thank_you") || location.includes("orders/")) {
          const finalPage = await followRedirects(
            location.startsWith("http") ? location : new URL(location, baseCheckoutUrl).toString(),
            jar,
            baseHeaders
          );
          html = finalPage.html;
          const orderNum = extractOrderNumber(html);
          console.log("[AutoCheckout] Order completed! Number:", orderNum);
          return {
            success: true,
            orderConfirmed: true,
            orderNumber: orderNum || void 0,
            redirectUrl: finalPage.url
          };
        }
        const nextPage = await followRedirects(
          location.startsWith("http") ? location : new URL(location, baseCheckoutUrl).toString(),
          jar,
          baseHeaders
        );
        html = nextPage.html;
        currentUrl = nextPage.url;
        step = detectCurrentStep(html);
        if (step === "complete" || html.includes("Thank you") || html.includes("os-order-number")) {
          const orderNum = extractOrderNumber(html);
          console.log("[AutoCheckout] Order completed! Number:", orderNum);
          return {
            success: true,
            orderConfirmed: true,
            orderNumber: orderNum || void 0,
            redirectUrl: currentUrl
          };
        }
        return {
          success: false,
          redirectUrl: currentUrl,
          error: "Payment requires additional information"
        };
      }
      html = await paymentResponse.text();
      step = detectCurrentStep(html);
      if (step === "complete" || html.includes("Thank you") || html.includes("os-order-number")) {
        const orderNum = extractOrderNumber(html);
        console.log("[AutoCheckout] Order completed! Number:", orderNum);
        return {
          success: true,
          orderConfirmed: true,
          orderNumber: orderNum || void 0
        };
      }
      if (step === "payment_method") {
        const errorMatch = html.match(/notice--error[^>]*>([^<]+)/);
        const errorMsg = errorMatch ? errorMatch[1].trim() : "";
        console.log("[AutoCheckout] Payment step returned error:", errorMsg);
        return {
          success: false,
          redirectUrl: currentUrl || checkoutUrl,
          error: errorMsg || "Payment requires additional information"
        };
      }
    }
    if (step === "complete" || html.includes("Thank you") || html.includes("os-order-number")) {
      const orderNum = extractOrderNumber(html);
      console.log("[AutoCheckout] Order already complete! Number:", orderNum);
      return {
        success: true,
        orderConfirmed: true,
        orderNumber: orderNum || void 0
      };
    }
    return {
      success: false,
      redirectUrl: currentUrl || checkoutUrl,
      error: "Checkout requires additional interaction"
    };
  } catch (error) {
    console.error("[AutoCheckout] Error:", error.message);
    return {
      success: false,
      redirectUrl: checkoutUrl,
      error: error.message
    };
  }
}

// server/routes.ts
init_db();
init_schema();
import { asc, desc, eq, sql as sql2, inArray } from "drizzle-orm";

// server/search-engine.ts
import pg2 from "pg";
var pool2 = new pg2.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 3e4,
  connectionTimeoutMillis: 1e4
});
pool2.on("error", (err) => {
  console.error("[SearchEngine DB] Unexpected error on idle client:", err.message);
});
var SYNONYM_GROUPS = [
  // ===== ELECTRONICS & DEVICES =====
  ["earbuds", "headphones", "earphones", "\u0633\u0645\u0627\u0639\u0627\u062A", "\u0633\u0645\u0627\u0639\u0629", "\u0633\u0645\u0627\u0639\u0647", "\u0647\u064A\u062F\u0641\u0648\u0646", "\u0627\u064A\u0631\u0628\u0648\u062F\u0632", "earphone", "headphone", "headset", "\u0647\u064A\u062F\u0633\u062A", "\u0633\u0645\u0639\u0627\u062A", "\u0633\u0645\u0639\u0647", "\u0633\u0645\u0639\u0629", "\u0647\u062F\u0641\u0648\u0646", "\u0633\u0645\u0627\u0639\u0627\u062A \u0627\u0630\u0646", "\u0633\u0645\u0627\u0639\u0627\u062A \u0628\u0644\u0648\u062A\u0648\u062B", "\u0633\u0645\u0627\u0639\u0627\u062A \u0631\u0627\u0633", "\u0647\u0646\u062F\u0632 \u0641\u0631\u064A", "\u0647\u0627\u0646\u062F\u0632 \u0641\u0631\u064A", "handsfree"],
  ["charger", "\u0634\u0627\u062D\u0646", "\u0634\u0648\u0627\u062D\u0646", "charging", "\u0634\u062D\u0646", "\u0634\u0627\u062C\u0646", "\u0634\u0627\u0631\u062C\u0631", "\u062A\u0634\u0627\u0631\u062C", "\u0634\u062D\u0646\u0647", "\u0634\u062D\u0646\u0629", "\u0634\u0627\u062D\u0646\u0647", "\u0634\u062D\u0627\u0646"],
  ["cable", "cord", "wire", "\u0643\u064A\u0628\u0644", "\u0643\u0627\u0628\u0644", "\u0633\u0644\u0643", "\u0648\u0635\u0644\u0629", "\u0648\u0635\u0644\u0647", "\u0643\u0627\u0628\u0644\u0627\u062A", "\u0643\u064A\u0628\u0644\u0627\u062A", "\u0627\u0633\u0644\u0627\u0643", "\u062A\u0648\u0635\u064A\u0644\u0629", "\u062A\u0648\u0635\u064A\u0644\u0647", "\u0633\u0644\u0648\u0643"],
  ["phone", "mobile", "smartphone", "\u062C\u0648\u0627\u0644", "\u0647\u0627\u062A\u0641", "\u0645\u0648\u0628\u0627\u064A\u0644", "\u062A\u0644\u0641\u0648\u0646", "\u062A\u0644\u064A\u0641\u0648\u0646", "\u062C\u0647\u0627\u0632", "\u062E\u0644\u0648\u064A", "\u0645\u062D\u0645\u0648\u0644", "cellphone", "\u062A\u0644\u0641\u0648\u0646\u0627\u062A", "\u062C\u0648\u0627\u0644\u0627\u062A", "\u0645\u0648\u0628\u0627\u064A\u0644\u0627\u062A", "\u062E\u0644\u064A\u0648\u064A", "\u0641\u0648\u0646", "\u062C\u0647\u0627\u0632 \u062E\u0644\u0648\u064A"],
  ["laptop", "notebook", "\u0644\u0627\u0628\u062A\u0648\u0628", "\u0644\u0627\u0628 \u062A\u0648\u0628", "\u062D\u0627\u0633\u0648\u0628", "\u0643\u0645\u0628\u064A\u0648\u062A\u0631", "\u062D\u0627\u0633\u0628", "computer", "pc", "\u0644\u0627\u0628\u062A\u0648\u0628\u0627\u062A", "\u0643\u0645\u0628\u064A\u0648\u062A\u0631\u0627\u062A", "\u0644\u0627\u067E\u062A\u0648\u0628", "\u0643\u0648\u0645\u0628\u064A\u0648\u062A\u0631", "\u062D\u0627\u0633\u0628 \u0645\u062D\u0645\u0648\u0644"],
  ["tablet", "ipad", "\u062A\u0627\u0628\u0644\u062A", "\u062A\u0627\u0628\u0644\u064A\u062A", "\u0622\u064A\u0628\u0627\u062F", "\u0627\u064A\u0628\u0627\u062F", "\u062A\u0627\u0628", "\u062A\u0627\u0628\u0644\u062A\u0627\u062A", "\u0622\u064A \u0628\u0627\u062F", "\u062A\u0627\u0628 \u0644\u062A"],
  ["tv", "television", "\u062A\u0644\u0641\u0632\u064A\u0648\u0646", "\u062A\u0644\u0641\u0627\u0632", "\u062A\u064A \u0641\u064A", "\u0634\u0627\u0634\u0629 \u062A\u0644\u0641\u0632\u064A\u0648\u0646", "\u0634\u0627\u0634\u0647 \u062A\u0644\u0641\u0632\u064A\u0648\u0646", "\u062A\u0644\u0641\u0632\u064A\u0648\u0646\u0627\u062A", "\u062A\u0644\u0641\u0627\u0632", "\u062A\u0644\u0641\u0632\u0648\u0646", "\u062A\u0644\u0641\u0632\u064A\u0648\u0646 \u0630\u0643\u064A", "smart tv", "\u062A\u0644\u064A\u0641\u0632\u064A\u0648\u0646", "\u062A\u0644\u064A\u0641\u0632\u0648\u0646"],
  ["watch", "smartwatch", "\u0633\u0627\u0639\u0629", "\u0633\u0627\u0639\u0647", "\u0633\u0627\u0639\u0629 \u0630\u0643\u064A\u0629", "smart watch", "\u0633\u0627\u0639\u0627\u062A", "\u0633\u0645\u0627\u0631\u062A \u0648\u0648\u062A\u0634", "\u0633\u0627\u0639\u0647 \u0630\u0643\u064A\u0647", "\u0633\u0627\u0639\u0629 \u064A\u062F"],
  ["speaker", "\u0633\u0645\u0627\u0639\u0629 \u0628\u0644\u0648\u062A\u0648\u062B", "\u0633\u0628\u064A\u0643\u0631", "\u0645\u0643\u0628\u0631 \u0635\u0648\u062A", "speakers", "bluetooth speaker", "\u0633\u0628\u064A\u0643\u0631\u0627\u062A", "\u0645\u0643\u0628\u0631\u0627\u062A", "\u0645\u0643\u0628\u0631", "\u0635\u0648\u062A\u064A\u0627\u062A", "\u0633\u0645\u0627\u0639\u0629 \u062E\u0627\u0631\u062C\u064A\u0629"],
  ["monitor", "screen", "display", "\u0634\u0627\u0634\u0629", "\u0634\u0627\u0634\u0647", "\u0634\u0627\u0634\u0627\u062A", "\u0645\u0648\u0646\u064A\u062A\u0648\u0631", "\u0634\u0627\u0634\u0629 \u0643\u0645\u0628\u064A\u0648\u062A\u0631", "\u062F\u064A\u0633\u0628\u0644\u0627\u064A"],
  ["camera", "\u0643\u0627\u0645\u064A\u0631\u0627", "\u0643\u0627\u0645", "cam", "\u0643\u0627\u0645\u064A\u0631\u0627\u062A", "\u062A\u0635\u0648\u064A\u0631", "\u0643\u0627\u0645\u064A\u0631\u0647"],
  ["printer", "\u0637\u0627\u0628\u0639\u0629", "\u0637\u0627\u0628\u0639\u0647", "\u0628\u0631\u0646\u062A\u0631", "\u0637\u0627\u0628\u0639\u0627\u062A", "\u0637\u0628\u0639\u0647", "\u0637\u0628\u0627\u0639\u0629", "\u0637\u0628\u0651\u0627\u0639\u0629"],
  ["scanner", "\u0645\u0627\u0633\u062D", "\u0645\u0627\u0633\u062D \u0636\u0648\u0626\u064A", "\u0633\u0643\u0627\u0646\u0631"],
  ["router", "\u0631\u0627\u0648\u062A\u0631", "\u0645\u0648\u062C\u0647", "\u0631\u0648\u062A\u0631", "routers", "\u0631\u0627\u0648\u062A\u0631\u0627\u062A", "\u0645\u0648\u062F\u0645", "modem", "\u0627\u0646\u062A\u0631\u0646\u062A"],
  ["microphone", "mic", "\u0645\u0627\u064A\u0643", "\u0645\u0627\u064A\u0643\u0631\u0648\u0641\u0648\u0646", "\u0645\u064A\u0643\u0631\u0648\u0641\u0648\u0646", "\u0645\u0627\u064A\u0643\u0627\u062A", "\u0645\u0627\u064A\u0643\u0631\u0641\u0648\u0646"],
  ["projector", "\u0628\u0631\u0648\u062C\u0643\u062A\u0631", "\u0628\u0631\u0648\u062C\u0643\u062A\u0648\u0631", "\u0639\u0627\u0631\u0636", "\u0628\u0631\u0648\u062C\u064A\u0643\u062A\u0648\u0631", "\u0628\u0631\u0648\u062C\u064A\u0643\u062A\u0631", "\u062F\u0627\u062A\u0627 \u0634\u0648", "\u062F\u0627\u062A\u0627\u0634\u0648", "\u0628\u0631\u0648\u062C\u064A\u0643\u062A\u0631"],
  ["controller", "\u064A\u062F \u062A\u062D\u0643\u0645", "\u064A\u062F\u0629 \u062A\u062D\u0643\u0645", "\u062C\u0648\u064A \u0633\u062A\u064A\u0643", "\u062C\u0648\u064A\u0633\u062A\u064A\u0643", "\u064A\u062F\u0629 \u0628\u0644\u0627\u064A \u0633\u062A\u064A\u0634\u0646", "\u064A\u062F\u0629", "\u064A\u062F\u0647", "\u0630\u0631\u0627\u0639 \u062A\u062D\u0643\u0645", "\u062C\u0648\u064A\u0633\u062A\u0643"],
  // ===== ACCESSORIES =====
  ["case", "cover", "\u0643\u0641\u0631", "\u062C\u0631\u0627\u0628", "\u062D\u0627\u0641\u0638\u0629", "\u062D\u0627\u0641\u0638\u0647", "\u063A\u0637\u0627\u0621", "\u0643\u064A\u0633", "\u0643\u0641\u0631\u0627\u062A", "\u062C\u0631\u0627\u0628\u0627\u062A", "\u063A\u0637\u0627", "\u0643\u0641\u0631\u0629", "\u0643\u064A\u0633\u0629", "\u063A\u0644\u0627\u0641"],
  ["screen protector", "tempered glass", "\u0648\u0627\u0642\u064A \u0634\u0627\u0634\u0629", "\u0648\u0627\u0642\u064A \u0634\u0627\u0634\u0647", "\u062D\u0645\u0627\u064A\u0629 \u0634\u0627\u0634\u0629", "\u062D\u0645\u0627\u064A\u0629 \u0634\u0627\u0634\u0647", "\u0632\u062C\u0627\u062C", "glass", "\u062D\u0645\u0627\u064A\u0647", "\u0648\u0627\u0642\u064A", "\u0633\u0643\u0631\u064A\u0646", "\u0644\u0632\u0642\u0629", "\u0644\u0632\u0642\u0647", "\u062D\u0645\u0627\u064A\u0629", "\u0633\u0643\u0631\u064A\u0646 \u0628\u0631\u0648\u062A\u0643\u062A\u0631"],
  ["power bank", "battery", "\u0628\u0637\u0627\u0631\u064A\u0629", "\u0628\u0637\u0627\u0631\u064A\u0647", "\u0634\u0627\u062D\u0646 \u0645\u062A\u0646\u0642\u0644", "\u0628\u0627\u0648\u0631 \u0628\u0627\u0646\u0643", "\u0628\u0646\u0643 \u0637\u0627\u0642\u0629", "powerbank", "\u0628\u0648\u0631 \u0628\u0627\u0646\u0643", "\u0628\u0627\u0648\u0631\u0628\u0627\u0646\u0643", "\u0628\u0637\u0627\u0631\u064A\u0627\u062A", "\u0634\u0627\u062D\u0646 \u062A\u0646\u0642\u0644", "\u0628\u0646\u0643 \u0634\u062D\u0646"],
  ["mouse", "\u0645\u0627\u0648\u0633", "\u0641\u0623\u0631\u0629", "\u0641\u0627\u0631\u0629", "\u0641\u0627\u0631\u0647", "\u0645\u0627\u0648\u0633\u0627\u062A", "\u0645\u0627\u0648\u0633 \u0644\u0627\u0633\u0644\u0643\u064A"],
  ["keyboard", "\u0643\u064A\u0628\u0648\u0631\u062F", "\u0644\u0648\u062D\u0629 \u0645\u0641\u0627\u062A\u064A\u062D", "\u0644\u0648\u062D\u0647 \u0645\u0641\u0627\u062A\u064A\u062D", "\u0643\u064A\u0628\u0648\u0648\u0631\u062F", "\u0643\u064A\u0628\u0648\u0631\u062F\u0627\u062A"],
  ["adapter", "\u0645\u062D\u0648\u0644", "\u0645\u062D\u0648\u0644\u0629", "\u0645\u062D\u0648\u0644\u0647", "\u0627\u062F\u0627\u0628\u062A\u0631", "\u0623\u062F\u0627\u0628\u062A\u0631", "\u0627\u062F\u0628\u062A\u0631", "power adapter", "\u0645\u062D\u0648\u0644 \u0643\u0647\u0631\u0628\u0627", "\u0645\u062D\u0648\u0644 \u0634\u062D\u0646"],
  ["hub", "\u0647\u0628", "\u0645\u0648\u0632\u0639", "\u062F\u0648\u0646\u0642\u0644", "dongle", "dock", "\u0645\u062D\u0637\u0629", "\u062F\u0648\u0643", "\u0645\u062D\u0637\u0629 \u062A\u0648\u0635\u064A\u0644"],
  ["stand", "holder", "mount", "\u062D\u0627\u0645\u0644", "\u0633\u062A\u0627\u0646\u062F", "\u062D\u0627\u0645\u0644 \u062C\u0648\u0627\u0644", "\u0642\u0627\u0639\u062F\u0629", "\u0642\u0627\u0639\u062F\u0647", "\u062D\u0645\u0627\u0644\u0629", "\u062D\u0645\u0627\u0644\u0647", "\u0633\u062A\u0627\u0646\u062F\u0627\u062A", "\u062D\u0627\u0645\u0644 \u062A\u0644\u0641\u0648\u0646", "\u062D\u0627\u0645\u0644 \u0644\u0627\u0628\u062A\u0648\u0628"],
  ["tripod", "\u062A\u0631\u0627\u064A\u0628\u0648\u062F", "\u062D\u0627\u0645\u0644 \u0643\u0627\u0645\u064A\u0631\u0627", "\u062B\u0644\u0627\u062B\u064A", "\u062A\u0631\u0627\u064A \u0628\u0648\u062F"],
  ["remote", "\u0631\u064A\u0645\u0648\u062A", "\u0631\u064A\u0645\u0648\u062A\u0627\u062A", "\u062A\u062D\u0643\u0645", "\u062C\u0647\u0627\u0632 \u062A\u062D\u0643\u0645", "\u0631\u064A\u0645\u0648\u062A \u0643\u0646\u062A\u0631\u0648\u0644"],
  ["sticker", "\u0633\u062A\u064A\u0643\u0631", "\u0645\u0644\u0635\u0642", "\u0644\u0627\u0635\u0642", "\u0633\u062A\u0643\u0631", "\u0633\u062A\u064A\u0643\u0631\u0627\u062A"],
  // ===== STORAGE =====
  ["storage", "memory", "ssd", "hard drive", "\u062A\u062E\u0632\u064A\u0646", "\u0630\u0627\u0643\u0631\u0629", "\u0630\u0627\u0643\u0631\u0647", "\u0647\u0627\u0631\u062F", "\u0641\u0644\u0627\u0634\u0629", "\u0641\u0644\u0627\u0634\u0647", "flash", "usb drive", "memory card", "sd card", "\u0647\u0627\u0631\u062F\u0633\u0643", "\u0647\u0627\u0631\u062F \u062F\u0633\u0643", "\u0647\u0627\u0631\u062F\u064A\u0633\u0643", "\u0645\u064A\u0645\u0648\u0631\u064A", "\u0641\u0644\u0627\u0634 \u0645\u064A\u0645\u0648\u0631\u064A", "\u0647\u0627\u0631\u062F \u062F\u064A\u0633\u0643"],
  ["usb", "\u064A\u0648 \u0627\u0633 \u0628\u064A", "\u064A\u0648\u0627\u0633\u0628\u064A", "\u064A\u0648 \u0625\u0633 \u0628\u064A"],
  // ===== CONNECTIVITY =====
  ["wireless", "bluetooth", "wifi", "\u0644\u0627\u0633\u0644\u0643\u064A", "\u0628\u0644\u0648\u062A\u0648\u062B", "\u0648\u0627\u064A \u0641\u0627\u064A", "wi-fi", "\u0628\u0644\u0648\u062A\u0648\u0633", "\u0648\u0627\u064A\u0631\u0644\u0633"],
  ["cable", "\u0633\u0644\u0643", "\u0643\u064A\u0628\u0644", "\u0643\u0627\u0628\u0644", "\u0648\u0635\u0644\u0629", "\u0648\u0635\u0644\u0647"],
  // ===== GAMING =====
  ["gaming", "\u0642\u064A\u0645\u0646\u0642", "\u0642\u064A\u0645\u0646\u062C", "\u0627\u0644\u0639\u0627\u0628", "game", "gamer", "\u062C\u064A\u0645\u0646\u0642", "\u0627\u0644\u0639\u0627\u0628 \u0641\u064A\u062F\u064A\u0648", "\u0642\u064A\u0645\u064A\u0646\u0642", "\u062C\u064A\u0645\u0646\u062C", "\u0642\u064A\u0645\u064A\u0646\u062C", "\u0644\u0639\u0628\u0629", "\u0644\u0639\u0628\u0647", "\u0642\u064A\u0645\u064A\u0646\u0642\u0627\u062A"],
  ["airpods", "\u0627\u064A\u0631\u0628\u0648\u062F\u0632", "\u0633\u0645\u0627\u0639\u0627\u062A \u0627\u0628\u0644", "airpod", "air pods", "\u0627\u064A\u0631\u0628\u0648\u062F", "\u0627\u064A\u0631 \u0628\u0648\u062F\u0632", "\u0627\u064A\u0631\u0628\u0648\u062F\u0633"],
  // ===== BAGS & CARRYING =====
  ["bag", "backpack", "\u0634\u0646\u0637\u0629", "\u0634\u0646\u0637\u0647", "\u062D\u0642\u064A\u0628\u0629", "\u062D\u0642\u064A\u0628\u0647", "\u0628\u0627\u0642", "\u0628\u0627\u0643", "\u0634\u0646\u062A\u0647", "\u0634\u0646\u062A\u0629", "\u0634\u0646\u062A", "\u062C\u0646\u0637\u0629", "\u062C\u0646\u0637\u0647", "\u0634\u0646\u0637\u0627\u062A", "\u062D\u0642\u0627\u0626\u0628", "\u0628\u0627\u0643\u0628\u0627\u0643", "\u0628\u0627\u0643 \u0628\u0627\u0643", "\u0634\u0646\u062A\u0627", "\u062C\u0646\u0637", "\u062C\u0646\u0637\u0627\u062A", "\u0634\u0646\u0637", "\u0634\u0646\u062A\u0627\u062A", "\u062C\u0646\u0637\u0647", "\u0634\u0646\u0637\u0629 \u0638\u0647\u0631", "\u062D\u0642\u064A\u0628\u0629 \u0638\u0647\u0631", "\u0631\u062D\u0627\u0644"],
  ["sleeve", "laptop sleeve", "\u062D\u0627\u0641\u0638\u0629 \u0644\u0627\u0628\u062A\u0648\u0628", "\u062C\u0631\u0627\u0628 \u0644\u0627\u0628\u062A\u0648\u0628", "\u0643\u064A\u0633 \u0644\u0627\u0628\u062A\u0648\u0628", "\u0633\u0644\u064A\u0641"],
  ["pouch", "\u0645\u062D\u0641\u0638\u0629", "\u0645\u062D\u0641\u0638\u0647", "\u0628\u0627\u0648\u062A\u0634", "\u0643\u064A\u0633 \u0635\u063A\u064A\u0631"],
  // ===== HOME & KITCHEN =====
  ["heater", "\u0635\u0648\u0628\u0629", "\u0635\u0648\u0628\u0647", "\u0645\u062F\u0641\u0623\u0629", "\u0645\u062F\u0641\u0623\u0647", "\u0645\u062F\u0641\u0627\u0629", "\u0645\u062F\u0641\u0627\u0647", "\u062F\u0641\u0627\u064A\u0629", "\u062F\u0641\u0627\u064A\u0647", "\u062F\u0641\u0627\u064A", "\u0633\u062E\u0627\u0646", "\u062A\u062F\u0641\u0626\u0629", "\u062A\u062F\u0641\u0626\u0647", "\u0647\u064A\u062A\u0631", "\u0635\u0648\u0628\u0627\u062A", "\u062F\u0641\u0627\u064A\u0627\u062A", "\u0645\u062F\u0641\u0626\u0629", "\u0645\u062F\u0641\u0626\u0647", "\u0635\u0648\u0628\u0627", "radiator", "\u0631\u0627\u062F\u064A\u0627\u062A\u0648\u0631"],
  ["fan", "\u0645\u0631\u0648\u062D\u0629", "\u0645\u0631\u0648\u062D\u0647", "\u0645\u0631\u0627\u0648\u062D", "\u0645\u0631\u0648\u062D\u0627\u062A", "\u0645\u0631\u0648\u062D\u0629 \u0633\u0642\u0641", "\u0645\u0631\u0648\u062D\u0629 \u0637\u0627\u0648\u0644\u0629"],
  ["air conditioner", "ac", "\u062A\u0643\u064A\u064A\u0641", "\u0645\u0643\u064A\u0641", "\u0645\u0643\u064A\u0641\u0627\u062A", "\u062A\u0628\u0631\u064A\u062F", "\u0645\u0628\u0631\u062F", "\u0645\u0628\u0631\u062F\u0647", "\u0645\u0628\u0631\u062F\u0629", "\u0645\u0628\u0631\u062F \u0647\u0648\u0627\u0621", "air cooler", "\u0627\u064A\u0631 \u0643\u0648\u0646\u062F\u0634\u0646", "\u0627\u064A \u0633\u064A", "\u0643\u0646\u062F\u0634\u0646", "\u0643\u0648\u0646\u062F\u0634\u0646\u0631", "\u062A\u0643\u064A\u0641"],
  ["cleaner", "vacuum", "\u0645\u0643\u0646\u0633\u0629", "\u0645\u0643\u0646\u0633\u0647", "\u0645\u0643\u0646\u0633\u0629 \u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629", "\u0645\u0643\u0627\u0646\u0633", "\u062A\u0646\u0638\u064A\u0641", "\u0645\u0643\u0646\u0633\u0647 \u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0647", "\u0641\u0627\u0643\u064A\u0648\u0645", "\u0647\u0648\u0641\u0631"],
  ["iron", "\u0645\u0643\u0648\u0627\u0629", "\u0645\u0643\u0648\u0627\u0647", "\u0645\u0643\u0648\u0649", "\u0645\u0643\u0648\u0627", "\u0643\u0648\u064A", "\u0645\u0643\u0648\u0629", "\u0643\u0648\u0627\u064A\u0647", "\u0643\u0648\u0627\u064A\u0627", "\u0645\u0643\u0648\u0627\u064A\u0647", "steam iron", "\u0643\u0648\u064A \u0628\u062E\u0627\u0631"],
  ["blender", "mixer", "\u062E\u0644\u0627\u0637", "\u062E\u0644\u0627\u0637\u0629", "\u062E\u0644\u0627\u0637\u0647", "\u0639\u0635\u0627\u0631\u0629", "\u0639\u0635\u0627\u0631\u0647", "\u062C\u0648\u0633\u0631", "juicer", "\u062E\u0644\u0627\u0637\u0627\u062A", "\u0639\u0635\u0627\u0631\u0627\u062A", "\u0628\u0644\u0646\u062F\u0631"],
  ["kettle", "\u063A\u0644\u0627\u064A\u0629", "\u063A\u0644\u0627\u064A\u0647", "\u0643\u0627\u062A\u0644", "\u063A\u0644\u0627\u064A", "\u063A\u0644\u0627\u064A\u0629 \u0645\u0627\u0621", "\u063A\u0644\u0627\u064A\u0647 \u0645\u0627\u064A", "\u063A\u0644\u0627\u064A\u0627\u062A", "\u0627\u0628\u0631\u064A\u0642", "\u0627\u0628\u0631\u064A\u0642 \u0643\u0647\u0631\u0628\u0627\u0626\u064A"],
  ["thermos", "\u062A\u0631\u0645\u0633", "\u062D\u0627\u0641\u0638\u0629 \u062D\u0631\u0627\u0631\u0629", "\u062D\u0627\u0641\u0638\u0647 \u062D\u0631\u0627\u0631\u0647", "\u062B\u064A\u0631\u0645\u0648\u0633", "\u062A\u0631\u0627\u0645\u0633", "\u062A\u0631\u0645\u0632"],
  ["coffee maker", "\u0645\u0627\u0643\u064A\u0646\u0629 \u0642\u0647\u0648\u0629", "\u0645\u0627\u0643\u0646\u0629 \u0642\u0647\u0648\u0629", "\u0642\u0647\u0648\u0629", "\u0643\u0648\u0641\u064A \u0645\u064A\u0643\u0631", "\u0645\u0627\u0643\u064A\u0646\u0629 \u0627\u0633\u0628\u0631\u0633\u0648", "\u0627\u0633\u0628\u0631\u0633\u0648", "espresso", "\u0645\u0627\u0643\u0646\u0629 \u0643\u0648\u0641\u064A", "\u0645\u062D\u0636\u0631\u0629 \u0642\u0647\u0648\u0629"],
  ["toaster", "\u0645\u062D\u0645\u0635\u0629", "\u0645\u062D\u0645\u0635\u0647", "\u062A\u0648\u0633\u062A\u0631", "\u0645\u062D\u0645\u0635\u0629 \u062E\u0628\u0632", "\u062A\u0648\u0633\u062A"],
  ["oven", "\u0641\u0631\u0646", "\u0641\u0631\u0646\u0627\u062A", "\u0627\u0641\u0631\u0627\u0646", "\u0641\u0631\u0646 \u0643\u0647\u0631\u0628\u0627\u0626\u064A", "\u0645\u0627\u064A\u0643\u0631\u0648\u064A\u0641", "microwave", "\u0645\u064A\u0643\u0631\u0648\u064A\u0641"],
  ["air fryer", "\u0642\u0644\u0627\u064A\u0629 \u0647\u0648\u0627\u0626\u064A\u0629", "\u0642\u0644\u0627\u064A\u0647 \u0647\u0648\u0627\u0626\u064A\u0647", "\u0627\u064A\u0631 \u0641\u0631\u0627\u064A\u0631", "\u0642\u0644\u0627\u064A\u0629", "\u0642\u0644\u0627\u064A\u0647", "\u0642\u0644\u0627\u064A\u0629 \u0647\u0648\u0627\u0621", "\u0642\u0644\u0627\u064A\u0629 \u0628\u062F\u0648\u0646 \u0632\u064A\u062A", "\u0627\u064A\u0631 \u0641\u0631\u0627\u064A\u0631\u0632", "\u0641\u0631\u0627\u064A\u0631"],
  ["scale", "\u0645\u064A\u0632\u0627\u0646", "\u0645\u0648\u0627\u0632\u064A\u0646", "\u0645\u064A\u0632\u0627\u0646 \u0631\u0642\u0645\u064A", "\u0645\u064A\u0632\u0627\u0646 \u0645\u0637\u0628\u062E"],
  ["water purifier", "\u0641\u0644\u062A\u0631", "\u0641\u0644\u062A\u0631 \u0645\u0627\u0621", "\u0641\u0644\u0627\u062A\u0631", "\u062A\u0635\u0641\u064A\u0629", "\u062A\u0646\u0642\u064A\u0629 \u0645\u0627\u0621", "\u0641\u0644\u062A\u0631 \u0645\u064A\u0627\u0647"],
  // ===== PERSONAL CARE =====
  ["shaver", "razor", "\u0645\u0627\u0643\u064A\u0646\u0629 \u062D\u0644\u0627\u0642\u0629", "\u0645\u0627\u0643\u0646\u0629 \u062D\u0644\u0627\u0642\u0629", "\u0634\u0641\u0631\u0629", "\u0634\u0641\u0631\u0647", "\u062D\u0644\u0627\u0642\u0629", "\u062D\u0644\u0627\u0642\u0647", "\u0634\u064A\u0641\u0631", "\u0645\u0648\u0633 \u062D\u0644\u0627\u0642\u0629", "\u0631\u064A\u0632\u0631", "\u0645\u0627\u0643\u064A\u0646\u0629 \u062D\u0644\u0627\u0642\u0647"],
  ["hair dryer", "\u0633\u0634\u0648\u0627\u0631", "\u0633\u064A\u0634\u0648\u0627\u0631", "\u0645\u062C\u0641\u0641 \u0634\u0639\u0631", "\u0645\u062C\u0641\u0641", "\u0641\u064A\u0646", "\u0627\u0633\u062A\u0634\u0648\u0627\u0631", "\u0633\u0634\u0648\u064A\u0631", "\u062F\u0631\u0627\u064A\u064A\u0631", "dryer", "\u0647\u064A\u0631 \u062F\u0631\u0627\u064A\u0631"],
  ["hair straightener", "\u0645\u0643\u0648\u0627\u0629 \u0634\u0639\u0631", "\u0641\u0631\u062F \u0634\u0639\u0631", "\u0633\u062A\u0631\u064A\u062A\u0646\u0631", "straightener", "\u0641\u064A\u0631", "\u0645\u0645\u0644\u0633 \u0634\u0639\u0631", "\u0645\u0643\u0648\u0629 \u0634\u0639\u0631", "\u0641\u0631\u062F"],
  ["trimmer", "\u062A\u0631\u064A\u0645\u0631", "\u0645\u0647\u0630\u0628", "\u0645\u0627\u0643\u064A\u0646\u0629 \u062A\u0647\u0630\u064A\u0628", "\u0642\u0635 \u0634\u0639\u0631", "\u0645\u0627\u0643\u064A\u0646\u0629 \u0634\u0639\u0631", "\u0643\u0644\u064A\u0628\u0631", "clipper", "\u0645\u0627\u0643\u0646\u0629 \u0634\u0639\u0631"],
  ["electric toothbrush", "\u0641\u0631\u0634\u0627\u0629 \u0627\u0633\u0646\u0627\u0646", "\u0641\u0631\u0634\u0627\u0629 \u0627\u0633\u0646\u0627\u0646 \u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629", "\u0641\u0631\u0634\u0629 \u0633\u0646\u0627\u0646", "\u0641\u0631\u0634\u0627\u0647", "\u0641\u0631\u0634\u0647 \u0627\u0633\u0646\u0627\u0646"],
  ["massager", "\u0645\u0633\u0627\u062C", "\u062C\u0647\u0627\u0632 \u0645\u0633\u0627\u062C", "\u062A\u062F\u0644\u064A\u0643", "\u0645\u062F\u0644\u0643", "\u0645\u0633\u0651\u0627\u062C", "\u0645\u0633\u0627\u062C\u0631"],
  // ===== TOOLS & HARDWARE =====
  ["drill", "\u062F\u0631\u064A\u0644", "\u0645\u062B\u0642\u0627\u0628", "\u0634\u0646\u064A\u0648\u0631", "\u062F\u0631\u064A\u0644\u0627\u062A", "\u0645\u062B\u0642\u0628", "\u062E\u0631\u0627\u0645\u0629", "\u062E\u0631\u0627\u0645", "\u062F\u0631\u064A\u0644 \u0643\u0647\u0631\u0628\u0627\u0626\u064A"],
  ["tool", "tools", "\u0639\u062F\u0629", "\u0639\u062F\u0647", "\u0627\u062F\u0648\u0627\u062A", "\u0623\u062F\u0648\u0627\u062A", "\u0639\u062F\u062F", "\u0639\u062F\u0629 \u064A\u062F\u0648\u064A\u0629", "\u0637\u0642\u0645 \u0639\u062F\u0629"],
  ["screw", "screwdriver", "\u0645\u0641\u0643", "\u0645\u0641\u0643\u0627\u062A", "\u0628\u0631\u0627\u063A\u064A", "\u0633\u0643\u0631\u0648", "\u0645\u0641\u0643 \u0628\u0631\u0627\u063A\u064A"],
  ["saw", "\u0645\u0646\u0634\u0627\u0631", "\u0645\u0646\u0627\u0634\u064A\u0631", "\u0642\u0635", "\u0645\u0646\u0634\u0627\u0631 \u0643\u0647\u0631\u0628\u0627\u0626\u064A"],
  ["wrench", "\u0645\u0641\u062A\u0627\u062D", "\u0645\u0641\u062A\u0627\u062D \u0631\u0628\u0637", "\u0645\u0641\u0627\u062A\u064A\u062D", "\u0631\u0646\u062C", "\u0645\u0641\u062A\u0627\u062D \u0631\u0628\u0637"],
  ["tape", "\u0634\u0631\u064A\u0637", "\u0644\u0627\u0635\u0642", "\u062A\u064A\u0628", "\u0634\u0631\u0627\u0626\u0637", "\u0633\u0644\u0648\u062A\u064A\u0628", "\u0634\u0631\u064A\u0637 \u0642\u064A\u0627\u0633", "\u0645\u062A\u0631", "\u0645\u064A\u062A\u0631", "tape measure"],
  ["level", "\u0645\u064A\u0632\u0627\u0646 \u0645\u0627\u0621", "\u0644\u064A\u0641\u0644", "\u0645\u064A\u0632\u0627\u0646 \u062D\u0631\u0627\u0631\u0629"],
  ["glue", "glue gun", "\u0645\u0633\u062F\u0633 \u0634\u0645\u0639", "\u063A\u0631\u0627\u0621", "\u0644\u0627\u0635\u0642", "\u0635\u0645\u063A", "\u0645\u0633\u062F\u0633 \u063A\u0631\u0627\u0621", "\u0642\u0644\u0648 \u0642\u0646"],
  ["paint", "spray", "\u0628\u0648\u064A\u0629", "\u062F\u0647\u0627\u0646", "\u0631\u0634", "\u0633\u0628\u0631\u0627\u064A", "\u0637\u0644\u0627\u0621", "\u0631\u0634\u0627\u0634"],
  ["generator", "\u0645\u0648\u0644\u062F", "\u0645\u0648\u0644\u062F \u0643\u0647\u0631\u0628\u0627\u0621", "\u0645\u0648\u0644\u062F\u0627\u062A", "\u062C\u0646\u0631\u064A\u062A\u0631", "\u062C\u0646\u0631\u062A\u0631"],
  ["compressor", "\u0643\u0645\u0628\u0631\u064A\u0633\u0631", "\u0636\u0627\u063A\u0637", "\u0636\u0627\u063A\u0637 \u0647\u0648\u0627\u0621", "\u0643\u0648\u0645\u0628\u0631\u064A\u0633\u0631", "\u0636\u063A\u0637", "\u0646\u0627\u0641\u062E"],
  ["welding", "\u0644\u062D\u0627\u0645", "\u0645\u0627\u0643\u064A\u0646\u0629 \u0644\u062D\u0627\u0645", "\u0644\u062D\u0651\u0627\u0645", "\u0648\u0644\u062F\u0646\u0642"],
  ["grinder", "\u062C\u0644\u0627\u062E\u0629", "\u062C\u0644\u0627\u062E\u0647", "\u0642\u0635 \u062D\u062F\u064A\u062F", "\u062C\u0631\u0627\u064A\u0646\u062F\u0631", "\u0635\u0627\u0631\u0648\u062E", "\u0635\u0627\u0631\u0648\u062E \u0642\u0635"],
  ["hammer", "\u0634\u0627\u0643\u0648\u0634", "\u0645\u0637\u0631\u0642\u0629", "\u0645\u0637\u0631\u0642\u0647", "\u0647\u0627\u0645\u0631"],
  ["plier", "pliers", "\u0632\u0631\u062F\u064A\u0629", "\u0632\u0631\u062F\u064A\u0647", "\u0643\u0645\u0627\u0634\u0629", "\u0643\u0645\u0627\u0634\u0647", "\u0628\u0644\u0627\u064A\u0631\u0632"],
  // ===== ELECTRICAL =====
  ["light", "lamp", "\u0627\u0636\u0627\u0621\u0629", "\u0625\u0636\u0627\u0621\u0629", "\u0627\u0636\u0627\u0621\u0647", "\u0636\u0648\u0621", "\u0644\u0645\u0628\u0629", "\u0644\u0645\u0628\u0647", "\u0645\u0635\u0628\u0627\u062D", "\u0644\u0645\u0628\u0627\u062A", "\u0627\u0646\u0627\u0631\u0629", "\u0625\u0646\u0627\u0631\u0629", "\u0627\u0646\u0627\u0631\u0647", "\u0644\u0645\u0628\u0647 \u0644\u064A\u062F", "led", "\u0644\u064A\u062F", "\u0646\u0648\u0631", "\u0627\u0646\u0648\u0627\u0631"],
  ["extension", "\u062A\u0648\u0635\u064A\u0644\u0629 \u0643\u0647\u0631\u0628\u0627\u0621", "\u0645\u0634\u062A\u0631\u0643", "\u062A\u0648\u0635\u064A\u0644\u0647", "\u0645\u0642\u0633\u0645", "\u0627\u0643\u0633\u062A\u0646\u0634\u0646", "\u0641\u064A\u0634\u0629", "\u0641\u064A\u0634\u0647", "\u0628\u0644\u0643", "\u0641\u064A\u0634", "\u062A\u0648\u0635\u064A\u0644\u0629", "\u0645\u0634\u062A\u0631\u0643\u0627\u062A", "power strip"],
  ["solar", "\u0637\u0627\u0642\u0629 \u0634\u0645\u0633\u064A\u0629", "\u0637\u0627\u0642\u0647 \u0634\u0645\u0633\u064A\u0647", "\u0633\u0648\u0644\u0627\u0631", "\u0644\u0648\u062D \u0634\u0645\u0633\u064A", "\u0627\u0644\u0648\u0627\u062D \u0634\u0645\u0633\u064A\u0629", "\u0634\u0645\u0633\u064A"],
  ["inverter", "\u0627\u0646\u0641\u0631\u062A\u0631", "\u0645\u062D\u0648\u0644 \u0643\u0647\u0631\u0628\u0627\u0626\u064A", "\u064A\u0648 \u0628\u064A \u0627\u0633", "ups"],
  // ===== AUTOMOTIVE =====
  ["car", "\u0633\u064A\u0627\u0631\u0629", "\u0633\u064A\u0627\u0631\u0627\u062A", "\u0633\u064A\u0627\u0631\u0647", "\u0627\u0643\u0633\u0633\u0648\u0627\u0631\u0627\u062A \u0633\u064A\u0627\u0631\u0629", "\u0627\u0643\u0633\u0633\u0648\u0627\u0631\u0627\u062A \u0633\u064A\u0627\u0631\u0627\u062A", "car accessories"],
  ["dash cam", "\u0643\u0627\u0645\u064A\u0631\u0627 \u0633\u064A\u0627\u0631\u0629", "\u0643\u0627\u0645\u064A\u0631\u0627 \u0633\u064A\u0627\u0631\u0647", "\u062F\u0627\u0634 \u0643\u0627\u0645", "\u0643\u0627\u0645\u064A\u0631\u0627 \u0637\u0628\u0644\u0648\u0646", "\u0643\u0627\u0645\u064A\u0631\u0627 \u062F\u0627\u0634"],
  ["car charger", "\u0634\u0627\u062D\u0646 \u0633\u064A\u0627\u0631\u0629", "\u0634\u0627\u062D\u0646 \u0633\u064A\u0627\u0631\u0647", "\u0634\u0627\u062D\u0646 \u0648\u0644\u0627\u0639\u0629", "\u0634\u0627\u062D\u0646 \u0642\u062F\u0627\u062D\u0629"],
  ["car holder", "\u062D\u0627\u0645\u0644 \u0633\u064A\u0627\u0631\u0629", "\u062D\u0627\u0645\u0644 \u062C\u0648\u0627\u0644 \u0633\u064A\u0627\u0631\u0629", "\u062D\u0627\u0645\u0644 \u062A\u0644\u0641\u0648\u0646 \u0633\u064A\u0627\u0631\u0647"],
  ["tire", "\u0627\u0637\u0627\u0631", "\u0627\u0637\u0627\u0631\u0627\u062A", "\u062A\u0627\u064A\u0631", "\u0643\u0641\u0631\u0627\u062A \u0633\u064A\u0627\u0631\u0629", "\u062F\u0648\u0627\u0644\u064A\u0628", "\u0639\u062C\u0644\u0627\u062A"],
  ["pump", "\u0645\u0636\u062E\u0629", "\u0645\u0636\u062E\u0647", "\u0645\u0646\u0641\u0627\u062E", "\u0646\u0641\u0627\u062E", "\u0628\u0627\u0645\u0628", "\u0645\u0646\u0641\u0627\u062E \u0627\u0637\u0627\u0631\u0627\u062A", "\u0643\u0645\u0628\u0631\u0633\u0648\u0631 \u0647\u0648\u0627\u0621"],
  // ===== OUTDOOR & SPORTS =====
  ["bicycle", "bike", "\u062F\u0631\u0627\u062C\u0629", "\u062F\u0631\u0627\u062C\u0647", "\u0628\u0633\u0643\u0644\u064A\u062A", "\u0628\u0633\u0643\u0644\u064A\u062A\u0629", "\u0633\u064A\u0643\u0644", "\u062F\u0631\u0627\u062C\u0629 \u0647\u0648\u0627\u0626\u064A\u0629"],
  ["scooter", "\u0633\u0643\u0648\u062A\u0631", "\u0627\u0633\u0643\u0648\u062A\u0631", "\u0633\u0643\u0648\u062A\u0631 \u0643\u0647\u0631\u0628\u0627\u0626\u064A"],
  ["tent", "\u062E\u064A\u0645\u0629", "\u062E\u064A\u0645\u0647", "\u062A\u0646\u062A", "\u062E\u064A\u0627\u0645"],
  ["grill", "\u0634\u0648\u0627\u064A\u0629", "\u0634\u0648\u0627\u064A\u0647", "\u0645\u0646\u0642\u0644", "\u0628\u0627\u0631\u0628\u0643\u064A\u0648", "\u0634\u0648\u064A", "bbq"],
  ["cooler", "\u062B\u0644\u0627\u062C\u0629 \u062A\u0646\u0642\u0644", "\u0643\u0648\u0644\u0631", "\u062D\u0627\u0641\u0638\u0629 \u0628\u0627\u0631\u062F\u0629", "\u062B\u0644\u0627\u062C\u0629 \u0633\u064A\u0627\u0631\u0629", "\u062B\u0644\u0627\u062C\u0629 \u0635\u063A\u064A\u0631\u0629"],
  // ===== SAFETY & SECURITY =====
  ["security camera", "\u0643\u0627\u0645\u064A\u0631\u0627 \u0645\u0631\u0627\u0642\u0628\u0629", "\u0643\u0627\u0645\u064A\u0631\u0627 \u0645\u0631\u0627\u0642\u0628\u0647", "\u0643\u0627\u0645\u064A\u0631\u0627 \u062D\u0645\u0627\u064A\u0629", "\u0643\u0627\u0645\u064A\u0631\u0627\u062A \u0645\u0631\u0627\u0642\u0628\u0629", "\u0643\u0627\u0645\u064A\u0631\u0627 \u0648\u0627\u064A \u0641\u0627\u064A", "\u0643\u0627\u0645\u064A\u0631\u0627 \u0627\u0645\u0646\u064A\u0629"],
  ["safe", "\u062E\u0632\u0646\u0629", "\u062E\u0632\u0646\u0647", "\u062E\u0632\u0627\u0626\u0646", "\u0635\u0646\u062F\u0648\u0642 \u0627\u0645\u0627\u0646"],
  ["lock", "\u0642\u0641\u0644", "\u0627\u0642\u0641\u0627\u0644", "\u0642\u0641\u0644 \u0630\u0643\u064A", "smart lock", "\u0642\u0641\u0644 \u0627\u0644\u0643\u062A\u0631\u0648\u0646\u064A"],
  ["alarm", "\u0627\u0646\u0630\u0627\u0631", "\u0625\u0646\u0630\u0627\u0631", "\u062C\u0631\u0633 \u0627\u0646\u0630\u0627\u0631", "\u0645\u0646\u0628\u0647", "\u0633\u064A\u0631\u064A\u0646"],
  // ===== BRANDS =====
  ["iphone", "\u0622\u064A\u0641\u0648\u0646", "\u0627\u064A\u0641\u0648\u0646", "\u0627\u064A\u0641\u0648\u0646\u0627\u062A"],
  ["samsung", "\u0633\u0627\u0645\u0633\u0648\u0646\u062C", "\u0633\u0627\u0645\u0633\u0646\u062C", "\u0633\u0645\u0633\u0646\u062C", "\u0633\u0645\u0633\u0648\u0646\u062C", "samung", "samsug", "samsong", "\u0633\u0627\u0645\u0633\u0648\u0646\u0642"],
  ["apple", "\u0627\u0628\u0644", "\u0622\u0628\u0644", "\u0627\u067E\u0644", "aple", "appl", "appel"],
  ["huawei", "\u0647\u0648\u0627\u0648\u064A", "\u0647\u0648\u0648\u0627\u064A", "huawi", "hawai", "hauwei", "\u0647\u0648\u0627\u0648\u0627\u064A"],
  ["anker", "\u0627\u0646\u0643\u0631", "\u0623\u0646\u0643\u0631", "\u0625\u0646\u0643\u0631", "ankr", "ankor", "ancker"],
  ["xiaomi", "\u0634\u0627\u0648\u0645\u064A", "\u0634\u0627\u0648\u0645\u0649", "xaomi", "xiomi", "xioami", "\u0632\u0627\u0648\u0645\u064A"],
  ["baseus", "\u0628\u0627\u0633\u064A\u0648\u0633", "\u0628\u064A\u0633\u0648\u0633", "baesus", "bases", "basus"],
  ["sony", "\u0633\u0648\u0646\u064A", "\u0633\u0648\u0646\u0649", "soni"],
  ["lenovo", "\u0644\u064A\u0646\u0648\u0641\u0648", "\u0644\u0646\u0648\u0641\u0648", "lenovoo", "lenov"],
  ["dell", "\u062F\u0644", "\u062F\u064A\u0644"],
  ["hp", "\u0627\u062A\u0634 \u0628\u064A", "\u0647\u0627\u0634 \u0628\u064A", "\u0627\u062C \u0628\u064A"],
  ["asus", "\u0627\u0633\u0648\u0633", "\u0622\u0633\u0648\u0633", "asuz"],
  ["jbl", "\u062C\u064A \u0628\u064A \u0627\u0644", "\u062C\u064A\u0628\u064A\u0627\u0644"],
  ["philips", "\u0641\u064A\u0644\u064A\u0628\u0633", "\u0641\u064A\u0644\u0628\u0633", "philp", "\u0641\u064A\u0644\u0628\u0635"],
  ["dyson", "\u062F\u0627\u064A\u0633\u0648\u0646", "\u062F\u0627\u064A\u0633\u0646"],
  ["bosch", "\u0628\u0648\u0634", "bosh"],
  ["lg", "\u0627\u0644 \u062C\u064A", "\u0627\u0644\u062C\u064A"],
  ["realme", "\u0631\u064A\u0644\u0645\u064A", "\u0631\u064A\u0644\u0645\u0649", "relme", "realmi"],
  ["oppo", "\u0627\u0648\u0628\u0648", "\u0623\u0648\u0628\u0648", "opo"],
  ["oneplus", "\u0648\u0646 \u0628\u0644\u0633", "\u0648\u0646\u0628\u0644\u0633", "one plus", "1+"],
  ["vivo", "\u0641\u064A\u0641\u0648"],
  ["acer", "\u0627\u064A\u0633\u0631", "\u0622\u064A\u0633\u0631", "accer"],
  ["nikon", "\u0646\u064A\u0643\u0648\u0646"],
  ["canon", "\u0643\u0627\u0646\u0648\u0646", "\u0643\u0627\u0646\u0646", "cannon"],
  ["logitech", "\u0644\u0648\u062C\u064A\u062A\u0643", "\u0644\u0648\u062C\u064A\u062A\u064A\u0643", "logitec"],
  ["beats", "\u0628\u064A\u062A\u0633"],
  ["hyperx", "\u0647\u0627\u064A\u0628\u0631 \u0627\u0643\u0633", "\u0647\u0627\u064A\u0628\u0631\u0627\u0643\u0633"],
  ["razer", "\u0631\u064A\u0632\u0631"],
  ["corsair", "\u0643\u0648\u0631\u0633\u064A\u0631"],
  ["wd", "western digital", "\u0648\u064A\u0633\u062A\u0631\u0646 \u062F\u064A\u062C\u064A\u062A\u0627\u0644"],
  ["seagate", "\u0633\u064A\u062C\u064A\u062A"],
  ["sandisk", "\u0633\u0627\u0646\u062F\u064A\u0633\u0643", "\u0633\u0627\u0646 \u062F\u064A\u0633\u0643", "san disk"],
  ["joyroom", "\u062C\u0648\u064A\u0631\u0648\u0645", "\u062C\u0648\u064A \u0631\u0648\u0645", "\u062C\u0648\u064A \u0631\u0648\u0648\u0645", "joyrrom", "joyrom", "joiroom"],
  ["eufy", "\u064A\u0648\u0641\u064A", "eufi"],
  ["soundcore", "\u0633\u0627\u0648\u0646\u062F\u0643\u0648\u0631", "sound core"],
  ["ugreen", "\u064A\u0648\u062C\u0631\u064A\u0646", "\u064A\u0648 \u062C\u0631\u064A\u0646"],
  ["momax", "\u0645\u0648\u0645\u0627\u0643\u0633"],
  ["ravpower", "\u0631\u0627\u0641 \u0628\u0627\u0648\u0631", "rav power"],
  ["powerology", "\u0628\u0627\u0648\u0631\u0648\u0644\u0648\u062C\u064A", "\u0628\u0648\u0631\u0648\u0644\u062C\u064A"],
  ["green lion", "\u062C\u0631\u064A\u0646 \u0644\u0627\u064A\u0648\u0646", "greenlion"],
  ["hoco", "\u0647\u0648\u0643\u0648"],
  ["remax", "\u0631\u064A\u0645\u0627\u0643\u0633"],
  ["ldnio", "\u0627\u0644 \u062F\u064A \u0627\u0646"],
  ["mcdodo", "\u0645\u0643\u062F\u0648\u062F\u0648", "\u0645\u0627\u0643\u062F\u0648\u062F\u0648"],
  ["oraimo", "\u0627\u0648\u0631\u0627\u064A\u0645\u0648"],
  ["porodo", "\u0628\u0648\u0631\u0648\u062F\u0648"],
  ["acefast", "\u0627\u064A\u0633 \u0641\u0627\u0633\u062A"],
  ["nintendo", "\u0646\u064A\u0646\u062A\u0646\u062F\u0648", "\u0646\u0646\u062A\u0646\u062F\u0648"],
  ["playstation", "\u0628\u0644\u0627\u064A\u0633\u062A\u064A\u0634\u0646", "\u0628\u0644\u0627\u064A \u0633\u062A\u064A\u0634\u0646", "ps5", "ps4", "\u0628\u0644\u064A\u0633\u062A\u064A\u0634\u0646", "\u0633\u0648\u0646\u064A \u0628\u0644\u0627\u064A\u0633\u062A\u064A\u0634\u0646", "\u0628\u0644\u0627\u064A \u0633\u062A\u064A\u0634\u064A\u0646"],
  ["xbox", "\u0627\u0643\u0633 \u0628\u0648\u0643\u0633", "\u0625\u0643\u0633 \u0628\u0648\u0643\u0633"],
  ["milwaukee", "\u0645\u0644\u0648\u0627\u0643\u064A", "\u0645\u064A\u0644\u0648\u0648\u0643\u064A", "\u0645\u0644\u0648\u0648\u0643\u064A"],
  ["dewalt", "\u062F\u064A\u0648\u0627\u0644\u062A", "\u062F\u0648\u0627\u0644\u062A", "\u062F\u064A\u0648\u0648\u0644\u062A"],
  ["makita", "\u0645\u0627\u0643\u064A\u062A\u0627", "\u0645\u0643\u064A\u062A\u0627"],
  ["stanley", "\u0633\u062A\u0627\u0646\u0644\u064A", "\u0633\u062A\u0646\u0644\u064A"],
  ["hikoki", "\u0647\u064A\u0643\u0648\u0643\u064A", "hitachi", "\u0647\u064A\u062A\u0627\u0634\u064A"],
  ["total", "\u062A\u0648\u062A\u0627\u0644"],
  ["ingco", "\u0627\u064A\u0646\u0643\u0648", "\u0627\u0646\u0643\u0648"],
  ["marshall", "\u0645\u0627\u0631\u0634\u0627\u0644"],
  ["bose", "\u0628\u0648\u0632"],
  ["harman kardon", "\u0647\u0627\u0631\u0645\u0627\u0646 \u0643\u0627\u0631\u062F\u0648\u0646", "\u0647\u0627\u0631\u0645\u0646 \u0643\u0627\u0631\u062F\u0646", "harman"],
  ["google", "\u062C\u0648\u062C\u0644", "\u0642\u0648\u0642\u0644"],
  ["microsoft", "\u0645\u0627\u064A\u0643\u0631\u0648\u0633\u0648\u0641\u062A"],
  ["nothing", "\u0646\u0627\u062B\u0646\u062C", "\u0646\u062B\u0646\u0642"],
  ["honor", "\u0647\u0648\u0646\u0631", "\u0627\u0648\u0646\u0631"],
  ["motorola", "\u0645\u0648\u062A\u0648\u0631\u0648\u0644\u0627"],
  ["nokia", "\u0646\u0648\u0643\u064A\u0627"],
  ["tcl", "\u062A\u064A \u0633\u064A \u0627\u0644"],
  ["hisense", "\u0647\u0627\u064A\u0633\u0646\u0633"],
  ["dji", "\u062F\u064A \u062C\u064A \u0627\u064A"],
  ["gopro", "\u062C\u0648\u0628\u0631\u0648", "\u0642\u0648\u0628\u0631\u0648"],
  ["tp-link", "\u062A\u064A \u0628\u064A \u0644\u0646\u0643", "tplink"],
  ["netgear", "\u0646\u062A\u062C\u064A\u0631"],
  ["black and decker", "\u0628\u0644\u0627\u0643 \u0627\u0646\u062F \u062F\u064A\u0643\u0631", "\u0628\u0644\u0627\u0643 \u062F\u064A\u0643\u0631", "black decker", "\u0628\u0644\u0627\u0643 \u0622\u0646\u062F \u062F\u064A\u0643\u0631"],
  ["midea", "\u0645\u064A\u062F\u064A\u0627"],
  ["dreame", "\u062F\u0631\u064A\u0645\u064A", "\u062F\u0631\u064A\u0645"],
  ["roborock", "\u0631\u0648\u0628\u0648\u0631\u0648\u0643"],
  ["ecovacs", "\u0627\u064A\u0643\u0648\u0641\u0627\u0643\u0633"],
  ["tefal", "\u062A\u064A\u0641\u0627\u0644"],
  ["braun", "\u0628\u0631\u0627\u0648\u0646"],
  ["panasonic", "\u0628\u0627\u0646\u0627\u0633\u0648\u0646\u064A\u0643", "\u0628\u0646\u0627\u0633\u0648\u0646\u064A\u0643"],
  ["kenwood", "\u0643\u064A\u0646\u0648\u0648\u062F"],
  ["moulinex", "\u0645\u0648\u0644\u064A\u0646\u0643\u0633"],
  ["toshiba", "\u062A\u0648\u0634\u064A\u0628\u0627"],
  // ===== GENERAL TERMS =====
  ["original", "\u0627\u0635\u0644\u064A", "\u0627\u0635\u0644\u064A\u0647", "\u0623\u0635\u0644\u064A", "\u0627\u0648\u0631\u062C\u0646\u0627\u0644", "\u0627\u0648\u0631\u062C\u064A\u0646\u0627\u0644", "original"],
  ["new", "\u062C\u062F\u064A\u062F", "\u062C\u062F\u064A\u062F\u0647", "\u062C\u062F\u064A\u062F\u0629"],
  ["offer", "\u0639\u0631\u0636", "\u0639\u0631\u0648\u0636", "\u062A\u062E\u0641\u064A\u0636", "\u062A\u062E\u0641\u064A\u0636\u0627\u062A", "\u062E\u0635\u0645", "\u062E\u0635\u0648\u0645\u0627\u062A", "sale", "\u062A\u0646\u0632\u064A\u0644\u0627\u062A", "\u0627\u0648\u0641\u0631", "\u0639\u0631\u0648\u0636\u0627\u062A", "discount"],
  ["accessories", "\u0627\u0643\u0633\u0633\u0648\u0627\u0631\u0627\u062A", "\u0627\u0643\u0633\u0633\u0648\u0627\u0631", "\u0645\u0644\u062D\u0642\u0627\u062A", "\u0627\u0643\u0633\u0633\u0648\u0627\u0631", "\u0625\u0643\u0633\u0633\u0648\u0627\u0631\u0627\u062A", "\u0627\u0643\u0633\u0633\u0648\u0631\u0627\u062A"],
  ["portable", "\u0645\u062A\u0646\u0642\u0644", "\u0645\u062D\u0645\u0648\u0644", "\u0645\u062A\u0646\u0642\u0644\u0647", "\u0628\u0648\u0631\u062A\u0628\u0644"],
  ["smart", "\u0630\u0643\u064A", "\u0630\u0643\u064A\u0647", "\u0630\u0643\u064A\u0629", "\u0633\u0645\u0627\u0631\u062A"],
  ["mini", "\u0635\u063A\u064A\u0631", "\u0635\u063A\u064A\u0631\u0647", "\u0635\u063A\u064A\u0631\u0629", "\u0645\u064A\u0646\u064A"],
  ["pro", "\u0628\u0631\u0648", "\u0627\u062D\u062A\u0631\u0627\u0641\u064A", "\u0628\u0631\u0648\u0641\u0634\u0646\u0627\u0644", "professional"],
  ["set", "\u0637\u0642\u0645", "\u0645\u062C\u0645\u0648\u0639\u0629", "\u0633\u064A\u062A", "\u0645\u062C\u0645\u0648\u0639\u0647"],
  ["spare", "\u0642\u0637\u0639 \u063A\u064A\u0627\u0631", "\u0642\u0637\u0639 \u0628\u062F\u064A\u0644\u0629", "\u0633\u0628\u064A\u0631", "\u0628\u062F\u064A\u0644", "\u0628\u062F\u064A\u0644\u0647"]
];
function buildSynonymMap(groups) {
  const map = {};
  for (const group of groups) {
    for (const term of group) {
      const lower = term.toLowerCase();
      if (!map[lower]) map[lower] = [];
      for (const other of group) {
        const otherLower = other.toLowerCase();
        if (otherLower !== lower && !map[lower].includes(otherLower)) {
          map[lower].push(otherLower);
        }
      }
    }
  }
  return map;
}
var SYNONYM_MAP = buildSynonymMap(SYNONYM_GROUPS);
var autoSynonymsBuilt = false;
async function buildAutoSynonyms() {
  if (autoSynonymsBuilt) return;
  try {
    const res = await pool2.query(`
      SELECT DISTINCT vendor FROM search_index WHERE vendor IS NOT NULL AND vendor != ''
    `);
    const vendors = res.rows.map((r) => r.vendor);
    const titleRes = await pool2.query(`
      SELECT title, title_ar, vendor, product_type, tags FROM search_index
      WHERE title IS NOT NULL LIMIT 5000
    `);
    const wordPairs = /* @__PURE__ */ new Map();
    for (const row of titleRes.rows) {
      const enTitle = (row.title || "").toLowerCase();
      const arTitle = (row.title_ar || "").toLowerCase();
      if (!arTitle || arTitle === enTitle) continue;
      const enWords = enTitle.split(/[\s\-–—()[\]{},;:'"!?./]+/).filter((w) => w.length >= 3);
      const arWords = arTitle.split(/[\s\-–—()[\]{},;:'"!?./]+/).filter((w) => w.length >= 2 && /[\u0600-\u06FF]/.test(w));
      for (const ew of enWords) {
        for (const aw of arWords) {
          if (!wordPairs.has(ew)) wordPairs.set(ew, /* @__PURE__ */ new Set());
          wordPairs.get(ew).add(aw);
        }
      }
    }
    const autoGroups = [];
    for (const v of vendors) {
      const vLower = v.toLowerCase();
      if (!SYNONYM_MAP[vLower]) {
        autoGroups.push([vLower]);
      }
    }
    const commonPairs = /* @__PURE__ */ new Map();
    for (const [en, arSet] of wordPairs) {
      for (const ar of arSet) {
        if (!commonPairs.has(en)) commonPairs.set(en, /* @__PURE__ */ new Map());
        const count = commonPairs.get(en).get(ar) || 0;
        commonPairs.get(en).set(ar, count + 1);
      }
    }
    for (const [en, arMap] of commonPairs) {
      if (SYNONYM_MAP[en]) continue;
      const topAr = [...arMap.entries()].filter(([_, count]) => count >= 3).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([word]) => word);
      if (topAr.length > 0 && en.length >= 3) {
        autoGroups.push([en, ...topAr]);
      }
    }
    if (autoGroups.length > 0) {
      const combined = [...SYNONYM_GROUPS, ...autoGroups];
      SYNONYM_MAP = buildSynonymMap(combined);
      console.log(`[SearchEngine] Auto-built ${autoGroups.length} synonym groups from product data`);
    }
    autoSynonymsBuilt = true;
  } catch (err) {
    console.error("[SearchEngine] Auto-synonym build failed:", err);
  }
}
var SHOPIFY_SYNC_QUERY = `
  query SyncProducts($first: Int!, $after: String) {
    products(first: $first, after: $after, query: "status:active") {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id title handle vendor productType tags description status
          priceRangeV2 { minVariantPrice { amount currencyCode } }
          images(first: 1) { edges { node { url } } }
          variants(first: 1) { edges { node { availableForSale compareAtPrice } } }
        }
      }
    }
  }
`;
async function ensureSearchTables() {
  const client = await pool2.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS search_index (
        id SERIAL PRIMARY KEY,
        shopify_id TEXT UNIQUE NOT NULL,
        handle TEXT NOT NULL,
        title TEXT,
        title_ar TEXT,
        description TEXT,
        description_ar TEXT,
        vendor TEXT,
        product_type TEXT,
        tags TEXT[] DEFAULT '{}',
        available_for_sale BOOLEAN DEFAULT true,
        price NUMERIC(10,2),
        compare_at_price NUMERIC(10,2),
        currency TEXT DEFAULT 'JOD',
        image_url TEXT,
        tsv_en TSVECTOR,
        tsv_ar TSVECTOR,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS search_index_tsv_en ON search_index USING gin(tsv_en);
      CREATE INDEX IF NOT EXISTS search_index_tsv_ar ON search_index USING gin(tsv_ar);
      CREATE INDEX IF NOT EXISTS search_index_handle ON search_index(handle);
      CREATE INDEX IF NOT EXISTS search_index_vendor ON search_index(vendor);
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS popular_searches (
        term TEXT PRIMARY KEY,
        search_count INTEGER DEFAULT 1,
        language TEXT DEFAULT 'ar',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS search_analytics (
        id SERIAL PRIMARY KEY,
        query TEXT NOT NULL,
        results_count INTEGER DEFAULT 0,
        language TEXT DEFAULT 'ar',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log("[SearchEngine] Tables ensured.");
  } catch (err) {
    console.error("[SearchEngine] ensureSearchTables error:", err.message);
  } finally {
    client.release();
  }
}
async function syncProductIndex() {
  console.log("[SearchEngine] Starting product sync from Shopify...");
  const startTime = Date.now();
  let allProducts = [];
  let hasNext = true;
  let cursor = null;
  let mainRetries = 0;
  while (hasNext) {
    try {
      const vars = { first: 250 };
      if (cursor) vars.after = cursor;
      const data = await shopifyAdminGraphQL(SHOPIFY_SYNC_QUERY, vars);
      const edges = data.products.edges;
      allProducts.push(...edges.map((e) => e.node));
      hasNext = data.products.pageInfo.hasNextPage;
      cursor = data.products.pageInfo.endCursor;
      mainRetries = 0;
    } catch (err) {
      const msg = typeof err === "string" ? err : err?.message || JSON.stringify(err);
      if (mainRetries < 5 && (msg.includes("Throttled") || msg.includes("throttl") || msg.includes("THROTTLED"))) {
        mainRetries++;
        console.log(`[SearchEngine] Product fetch throttled, retry ${mainRetries}/5 in 5s... (${allProducts.length} products so far)`);
        await new Promise((r) => setTimeout(r, 5e3));
      } else {
        throw err;
      }
    }
  }
  const arMap = /* @__PURE__ */ new Map();
  const AR_QUERY = `
    query ArProducts($first: Int!, $after: String, $language: LanguageCode) @inContext(language: $language) {
      products(first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id
            title
            description
          }
        }
      }
    }
  `;
  try {
    let arHasNext = true;
    let arCursor = null;
    let arRetries = 0;
    while (arHasNext) {
      try {
        const arVars = { first: 250, language: "AR" };
        if (arCursor) arVars.after = arCursor;
        const arData = await shopifyFetch(AR_QUERY, arVars);
        const arEdges = arData.products?.edges || [];
        for (const edge of arEdges) {
          const node = edge.node;
          if (node.id && node.title) {
            arMap.set(node.id, { title: node.title, description: node.description || "" });
          }
        }
        arHasNext = arData.products?.pageInfo?.hasNextPage || false;
        arCursor = arData.products?.pageInfo?.endCursor || null;
        arRetries = 0;
      } catch (pageErr) {
        const msg = typeof pageErr === "string" ? pageErr : pageErr?.message || JSON.stringify(pageErr);
        if (arRetries < 5 && (msg.includes("Throttled") || msg.includes("throttl") || msg.includes("THROTTLED"))) {
          arRetries++;
          console.log(`[SearchEngine] Arabic fetch throttled, retry ${arRetries}/5 in 5s... (${arMap.size} translations so far)`);
          await new Promise((r) => setTimeout(r, 5e3));
        } else {
          throw pageErr;
        }
      }
    }
    console.log(`[SearchEngine] Fetched ${arMap.size} Arabic translations`);
  } catch (err) {
    console.error("[SearchEngine] Failed to fetch Arabic translations:", err);
  }
  const client = await pool2.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM search_index");
    let skippedDraft = 0;
    for (const p of allProducts) {
      if (p.status && p.status !== "ACTIVE") {
        skippedDraft++;
        continue;
      }
      const price = p.priceRangeV2?.minVariantPrice?.amount ? parseFloat(p.priceRangeV2.minVariantPrice.amount) : null;
      const compareAtRaw = p.variants?.edges?.[0]?.node?.compareAtPrice;
      const compareAt = compareAtRaw ? parseFloat(compareAtRaw) : null;
      const currency = p.priceRangeV2?.minVariantPrice?.currencyCode || "JOD";
      const imageUrl = p.images?.edges?.[0]?.node?.url || null;
      const tags = p.tags || [];
      const availableForSale = p.variants?.edges?.some((e) => e.node.availableForSale) ?? true;
      const arData = arMap.get(p.id);
      const enText = [p.title, p.vendor, p.productType, p.description, ...tags].filter(Boolean).join(" ");
      const arText = [arData?.title, arData?.description, p.vendor].filter(Boolean).join(" ");
      await client.query(
        `INSERT INTO search_index 
         (shopify_id, handle, title, title_ar, description, description_ar, vendor, product_type, tags,
          available_for_sale, price, compare_at_price, currency, image_url, tsv_en, tsv_ar)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
           setweight(to_tsvector('english', COALESCE($3,'')), 'A') ||
           setweight(to_tsvector('english', COALESCE($7,'')), 'B') ||
           setweight(to_tsvector('english', COALESCE($8,'')), 'B') ||
           setweight(to_tsvector('english', COALESCE($5,'')), 'C') ||
           setweight(to_tsvector('english', COALESCE(array_to_string($9::text[], ' '),'')), 'C'),
           setweight(to_tsvector('simple', COALESCE($4,'')), 'A') ||
           setweight(to_tsvector('simple', COALESCE($6,'')), 'C')
         )
         ON CONFLICT (shopify_id) DO UPDATE SET
           title=EXCLUDED.title, title_ar=EXCLUDED.title_ar, description=EXCLUDED.description,
           description_ar=EXCLUDED.description_ar, vendor=EXCLUDED.vendor, product_type=EXCLUDED.product_type,
           tags=EXCLUDED.tags, available_for_sale=EXCLUDED.available_for_sale, price=EXCLUDED.price,
           compare_at_price=EXCLUDED.compare_at_price, currency=EXCLUDED.currency, image_url=EXCLUDED.image_url,
           tsv_en=EXCLUDED.tsv_en, tsv_ar=EXCLUDED.tsv_ar, updated_at=NOW()`,
        [
          p.id,
          p.handle,
          p.title,
          arData?.title || null,
          p.description || null,
          arData?.description || null,
          p.vendor || null,
          p.productType || null,
          tags,
          availableForSale,
          price,
          compareAt,
          currency,
          imageUrl
        ]
      );
    }
    await client.query("COMMIT");
    const elapsed = Date.now() - startTime;
    console.log(`[SearchEngine] Synced ${allProducts.length - skippedDraft} active products in ${elapsed}ms (skipped ${skippedDraft} draft/archived)`);
    autoSynonymsBuilt = false;
    await buildAutoSynonyms();
    return allProducts.length;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[SearchEngine] Sync failed:", err);
    throw err;
  } finally {
    client.release();
  }
}
async function quickStockRefresh() {
  console.log("[SearchEngine] Quick stock refresh starting...");
  const startTime = Date.now();
  let updated = 0;
  let hasNext = true;
  let cursor = null;
  const STOCK_QUERY = `
    query StockCheck($after: String) {
      products(first: 250, after: $after, query: "status:active") {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id
            status
            totalInventory
          }
        }
      }
    }
  `;
  const stockMap = /* @__PURE__ */ new Map();
  while (hasNext) {
    const vars = {};
    if (cursor) vars.after = cursor;
    const data = await shopifyAdminGraphQL(STOCK_QUERY, vars);
    const edges = data.products?.edges || [];
    for (const e of edges) {
      const available = e.node.totalInventory > 0 && e.node.status === "ACTIVE";
      stockMap.set(e.node.id, available);
    }
    hasNext = data.products?.pageInfo?.hasNextPage || false;
    cursor = data.products?.pageInfo?.endCursor || null;
  }
  const client = await pool2.connect();
  try {
    for (const [shopifyId, available] of stockMap) {
      const res = await client.query(
        "UPDATE search_index SET available_for_sale = $1, updated_at = NOW() WHERE shopify_id = $2 AND available_for_sale != $1",
        [available, shopifyId]
      );
      updated += res.rowCount || 0;
    }
  } finally {
    client.release();
  }
  const elapsed = Date.now() - startTime;
  console.log(`[SearchEngine] Stock refresh done in ${elapsed}ms \u2014 checked ${stockMap.size} products, updated ${updated}`);
  return updated;
}
function normalizeArabic(text2) {
  return text2.replace(/[\u064B-\u065F\u0670]/g, "").replace(/[أإآٱ]/g, "\u0627").replace(/ة/g, "\u0647").replace(/ى/g, "\u064A").replace(/ؤ/g, "\u0648").replace(/ئ/g, "\u064A").trim();
}
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
var cachedVendors = [];
var vendorCacheTime = 0;
async function getVendorList() {
  if (Date.now() - vendorCacheTime < 10 * 60 * 1e3 && cachedVendors.length > 0) {
    return cachedVendors;
  }
  try {
    const res = await pool2.query("SELECT DISTINCT vendor FROM search_index WHERE vendor IS NOT NULL AND vendor != ''");
    cachedVendors = res.rows.map((r) => r.vendor);
    vendorCacheTime = Date.now();
  } catch {
  }
  return cachedVendors;
}
function findFuzzyVendorMatches(query, vendors) {
  const q = query.toLowerCase().trim();
  const matches = [];
  for (const vendor of vendors) {
    const v = vendor.toLowerCase();
    const dist = levenshtein(q, v);
    const maxLen = Math.max(q.length, v.length);
    const threshold = maxLen <= 4 ? 1 : maxLen <= 7 ? 2 : 3;
    if (dist <= threshold && dist > 0) {
      matches.push(vendor);
    }
    if (q.length >= 3 && (v.includes(q) || q.includes(v))) {
      matches.push(vendor);
    }
  }
  return [...new Set(matches)];
}
function arabicSimilarity(a, b) {
  if (a === b) return 1;
  const na = normalizeArabic(a);
  const nb = normalizeArabic(b);
  if (na === nb) return 0.95;
  const longer = na.length > nb.length ? na : nb;
  const shorter = na.length > nb.length ? nb : na;
  if (longer.length === 0) return 0;
  if (longer.includes(shorter) && shorter.length >= 3) return 0.8;
  let matches = 0;
  const len = Math.min(na.length, nb.length);
  for (let i = 0; i < len; i++) {
    if (na[i] === nb[i]) matches++;
  }
  return matches / Math.max(na.length, nb.length);
}
function expandQueryWithSynonyms(query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const expanded = /* @__PURE__ */ new Set();
  expanded.add(query.toLowerCase());
  const normalizedQuery = normalizeArabic(query.toLowerCase());
  if (normalizedQuery !== query.toLowerCase()) {
    expanded.add(normalizedQuery);
  }
  for (const word of words) {
    const normalizedWord = normalizeArabic(word);
    if (SYNONYM_MAP[word]) {
      for (const syn of SYNONYM_MAP[word]) expanded.add(syn);
    }
    if (normalizedWord !== word && SYNONYM_MAP[normalizedWord]) {
      for (const syn of SYNONYM_MAP[normalizedWord]) expanded.add(syn);
    }
    for (const [term, syns] of Object.entries(SYNONYM_MAP)) {
      const normalizedTerm = normalizeArabic(term);
      if (term.length > 3 && (word.includes(term) || normalizedWord.includes(normalizedTerm))) {
        for (const syn of syns) expanded.add(syn);
      }
      if (syns.includes(word) || syns.map((s) => normalizeArabic(s)).includes(normalizedWord)) {
        expanded.add(term);
        for (const syn of syns) expanded.add(syn);
      }
      if (word.length >= 3 && arabicSimilarity(word, term) >= 0.7) {
        expanded.add(term);
        for (const syn of syns) expanded.add(syn);
      }
      for (const syn of syns) {
        if (word.length >= 3 && syn.length >= 3 && arabicSimilarity(word, syn) >= 0.7) {
          expanded.add(term);
          for (const s of syns) expanded.add(s);
          break;
        }
      }
    }
  }
  return Array.from(expanded);
}
function buildTsQuery(terms) {
  return terms.filter((t) => t.length >= 2).map((t) => t.replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, "").trim()).filter(Boolean).map((t) => t.split(/\s+/).map((w) => `${w}:*`).join(" & ")).join(" | ");
}
async function advancedSearch(options) {
  const {
    query,
    language = "en",
    minPrice,
    maxPrice,
    brand,
    inStock,
    limit = 30,
    offset = 0
  } = options;
  const q = query.trim();
  if (!q) return { products: [], totalCount: 0, suggestions: [], brands: [], priceRange: { min: 0, max: 0 } };
  await buildAutoSynonyms();
  const normalizedQ = normalizeArabic(q);
  const synonymTerms = expandQueryWithSynonyms(q);
  const vendors = await getVendorList();
  const fuzzyVendors = findFuzzyVendorMatches(q, vendors);
  for (const fv of fuzzyVendors) {
    synonymTerms.push(fv.toLowerCase());
  }
  for (const word of q.toLowerCase().split(/\s+/)) {
    const wordFuzzy = findFuzzyVendorMatches(word, vendors);
    for (const fv of wordFuzzy) {
      if (!synonymTerms.includes(fv.toLowerCase())) synonymTerms.push(fv.toLowerCase());
    }
  }
  const tsQuery = buildTsQuery(synonymTerms);
  const isArabic = language === "ar" || /[\u0600-\u06FF]/.test(q);
  const allSynonymLikes = [...new Set(synonymTerms.filter((t) => t.length >= 2).map((t) => t.toLowerCase()))];
  const conditions = [];
  const params = [];
  let paramIdx = 1;
  if (tsQuery) {
    const normalizedLike = `%${normalizedQ}%`;
    const synLikeConditions = allSynonymLikes.map((syn, i) => {
      const idx = paramIdx + 4 + i;
      return `LOWER(COALESCE(vendor,'')) = $${idx} OR COALESCE(vendor,'') ILIKE $${idx} || '%' OR title ILIKE '%' || $${idx} || '%' OR COALESCE(title_ar,'') ILIKE '%' || $${idx} || '%'`;
    }).join("\n      OR ");
    conditions.push(`(
      tsv_ar @@ to_tsquery('simple', $${paramIdx})
      OR tsv_en @@ to_tsquery('english', $${paramIdx})
      OR similarity(title, $${paramIdx + 1}) > 0.1
      OR similarity(COALESCE(title_ar,''), $${paramIdx + 1}) > 0.1
      OR similarity(COALESCE(vendor,''), $${paramIdx + 1}) > 0.08
      OR title ILIKE $${paramIdx + 2}
      OR COALESCE(title_ar,'') ILIKE $${paramIdx + 2}
      OR COALESCE(vendor,'') ILIKE $${paramIdx + 2}
      OR COALESCE(product_type,'') ILIKE $${paramIdx + 2}
      OR EXISTS (SELECT 1 FROM unnest(tags) AS t WHERE t ILIKE $${paramIdx + 2})
      OR TRANSLATE(COALESCE(title_ar,''), '\u0623\u0625\u0622\u0671\u0629\u0649\u0624\u0626', '\u0627\u0627\u0627\u0647\u0647\u064A\u0648\u064A') ILIKE $${paramIdx + 3}
      OR TRANSLATE(COALESCE(title,''), '\u0623\u0625\u0622\u0671\u0629\u0649\u0624\u0626', '\u0627\u0627\u0627\u0647\u0647\u064A\u0648\u064A') ILIKE $${paramIdx + 3}
      OR TRANSLATE(COALESCE(vendor,''), '\u0623\u0625\u0622\u0671\u0629\u0649\u0624\u0626', '\u0627\u0627\u0627\u0647\u0647\u064A\u0648\u064A') ILIKE $${paramIdx + 3}
      ${synLikeConditions ? `OR ${synLikeConditions}` : ""}
    )`);
    params.push(tsQuery, q, `%${q}%`, normalizedLike, ...allSynonymLikes);
    paramIdx += 4 + allSynonymLikes.length;
  }
  if (minPrice !== void 0) {
    conditions.push(`price >= $${paramIdx}`);
    params.push(minPrice);
    paramIdx++;
  }
  if (maxPrice !== void 0) {
    conditions.push(`price <= $${paramIdx}`);
    params.push(maxPrice);
    paramIdx++;
  }
  if (brand) {
    conditions.push(`vendor ILIKE $${paramIdx}`);
    params.push(brand);
    paramIdx++;
  }
  if (inStock) {
    conditions.push(`available_for_sale = true`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const baseConditions = [];
  const baseParams = [];
  let baseParamIdx = 1;
  if (tsQuery) {
    const normalizedLikeBase = `%${normalizedQ}%`;
    const baseSynLikeConditions = allSynonymLikes.map((syn, i) => {
      const idx = baseParamIdx + 4 + i;
      return `LOWER(COALESCE(vendor,'')) = $${idx} OR COALESCE(vendor,'') ILIKE $${idx} || '%' OR title ILIKE '%' || $${idx} || '%' OR COALESCE(title_ar,'') ILIKE '%' || $${idx} || '%'`;
    }).join("\n      OR ");
    baseConditions.push(`(
      tsv_ar @@ to_tsquery('simple', $${baseParamIdx})
      OR tsv_en @@ to_tsquery('english', $${baseParamIdx})
      OR similarity(title, $${baseParamIdx + 1}) > 0.1
      OR similarity(COALESCE(title_ar,''), $${baseParamIdx + 1}) > 0.1
      OR similarity(COALESCE(vendor,''), $${baseParamIdx + 1}) > 0.08
      OR title ILIKE $${baseParamIdx + 2}
      OR COALESCE(title_ar,'') ILIKE $${baseParamIdx + 2}
      OR COALESCE(vendor,'') ILIKE $${baseParamIdx + 2}
      OR COALESCE(product_type,'') ILIKE $${baseParamIdx + 2}
      OR EXISTS (SELECT 1 FROM unnest(tags) AS t WHERE t ILIKE $${baseParamIdx + 2})
      OR TRANSLATE(COALESCE(title_ar,''), '\u0623\u0625\u0622\u0671\u0629\u0649\u0624\u0626', '\u0627\u0627\u0627\u0647\u0647\u064A\u0648\u064A') ILIKE $${baseParamIdx + 3}
      OR TRANSLATE(COALESCE(title,''), '\u0623\u0625\u0622\u0671\u0629\u0649\u0624\u0626', '\u0627\u0627\u0627\u0647\u0647\u064A\u0648\u064A') ILIKE $${baseParamIdx + 3}
      OR TRANSLATE(COALESCE(vendor,''), '\u0623\u0625\u0622\u0671\u0629\u0649\u0624\u0626', '\u0627\u0627\u0627\u0647\u0647\u064A\u0648\u064A') ILIKE $${baseParamIdx + 3}
      ${baseSynLikeConditions ? `OR ${baseSynLikeConditions}` : ""}
    )`);
    baseParams.push(tsQuery, q, `%${q}%`, normalizedLikeBase, ...allSynonymLikes);
    baseParamIdx += 4 + allSynonymLikes.length;
  }
  if (minPrice !== void 0) {
    baseConditions.push(`price >= $${baseParamIdx}`);
    baseParams.push(minPrice);
    baseParamIdx++;
  }
  if (maxPrice !== void 0) {
    baseConditions.push(`price <= $${baseParamIdx}`);
    baseParams.push(maxPrice);
    baseParamIdx++;
  }
  if (inStock) {
    baseConditions.push(`available_for_sale = true`);
  }
  const whereClauseNoBrand = baseConditions.length > 0 ? `WHERE ${baseConditions.join(" AND ")}` : "";
  const rankExpr = `(
    COALESCE(ts_rank_cd(tsv_en, to_tsquery('english', $1)), 0) * 3.0 +
    COALESCE(ts_rank_cd(tsv_ar, to_tsquery('simple', $1)), 0) * 3.0 +
    GREATEST(similarity(title, $2), similarity(COALESCE(title_ar,''), $2)) * 2.5 +
    similarity(COALESCE(vendor,''), $2) * 8.0 +
    CASE WHEN LOWER(COALESCE(vendor,'')) = LOWER($2) THEN 20.0
         WHEN COALESCE(vendor,'') ILIKE $3 THEN 12.0
         WHEN title ILIKE $2 THEN 10.0
         WHEN COALESCE(title_ar,'') ILIKE $2 THEN 10.0
         WHEN title ILIKE $3 AND LENGTH($2) >= 4 AND LOWER(title) NOT LIKE '%' || LOWER($2) || 's%' THEN 2.0
         WHEN COALESCE(title_ar,'') ILIKE $3 THEN 2.0
         ELSE 0 END +
    CASE WHEN available_for_sale THEN 1.0 ELSE -3.0 END +
    CASE WHEN compare_at_price IS NOT NULL AND compare_at_price > price THEN 0.5 ELSE 0 END
  )`;
  const searchQuery = `
    SELECT *, ${rankExpr} as relevance_score
    FROM search_index
    ${whereClause}
    ORDER BY
      CASE WHEN available_for_sale THEN 0 ELSE 1 END,
      ROUND(${rankExpr}::numeric, 0) DESC,
      RANDOM()
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;
  params.push(limit, offset);
  const countQuery = `SELECT COUNT(*) as total FROM search_index ${whereClause}`;
  const brandQuery = `
    SELECT vendor as name, COUNT(*) as count
    FROM search_index ${whereClauseNoBrand}
    GROUP BY vendor
    HAVING vendor IS NOT NULL AND vendor != ''
    ORDER BY count DESC
    LIMIT 50
  `;
  const priceQuery = `
    SELECT COALESCE(MIN(price), 0) as min_price, COALESCE(MAX(price), 0) as max_price
    FROM search_index ${whereClause}
  `;
  try {
    const [results, countResult, brandResult, priceResult] = await Promise.all([
      pool2.query(searchQuery, params),
      pool2.query(countQuery, params.slice(0, paramIdx - 1)),
      pool2.query(brandQuery, baseParams),
      pool2.query(priceQuery, params.slice(0, paramIdx - 1))
    ]);
    const products = results.rows.map((r) => ({
      id: r.shopify_id,
      handle: r.handle,
      title: isArabic && r.title_ar ? r.title_ar : r.title,
      titleEn: r.title,
      titleAr: r.title_ar,
      vendor: r.vendor,
      productType: r.product_type,
      tags: r.tags || [],
      description: isArabic && r.description_ar ? r.description_ar : r.description,
      availableForSale: r.available_for_sale,
      relevanceScore: parseFloat(r.relevance_score) || 0,
      priceRange: {
        minVariantPrice: { amount: r.price?.toString() || "0", currencyCode: r.currency || "JOD" }
      },
      compareAtPriceRange: {
        minVariantPrice: {
          amount: r.compare_at_price?.toString() || r.price?.toString() || "0",
          currencyCode: r.currency || "JOD"
        }
      },
      images: { edges: r.image_url ? [{ node: { url: r.image_url } }] : [] }
    }));
    return {
      products,
      totalCount: parseInt(countResult.rows[0]?.total || "0"),
      suggestions: synonymTerms.slice(0, 5),
      brands: brandResult.rows.map((r) => ({ name: r.name, count: parseInt(r.count) })),
      priceRange: {
        min: parseFloat(priceResult.rows[0]?.min_price || "0"),
        max: parseFloat(priceResult.rows[0]?.max_price || "0")
      }
    };
  } catch (err) {
    console.error("[SearchEngine] Search error:", err.message);
    return { products: [], totalCount: 0, suggestions: [], brands: [], priceRange: { min: 0, max: 0 } };
  }
}
async function getAutocompleteSuggestions(query, language = "en") {
  const q = query.trim();
  if (!q || q.length < 1) return { products: [], categories: [], popular: [] };
  const isArabic = language === "ar" || /[\u0600-\u06FF]/.test(q);
  const titleCol = isArabic ? "COALESCE(title_ar, title)" : "title";
  try {
    const [productResults, categoryResults, popularResults] = await Promise.all([
      pool2.query(
        `SELECT handle, title, title_ar, vendor, price, currency, image_url,
           similarity(${titleCol}, $1) as sim
         FROM search_index
         WHERE (${titleCol} ILIKE $2
           OR similarity(${titleCol}, $1) > 0.08
           OR COALESCE(vendor,'') ILIKE $2
           OR COALESCE(title_ar,'') ILIKE $2)
         ORDER BY
           CASE WHEN lower(${titleCol}) = lower($1) THEN 0
                WHEN ${titleCol} ILIKE $1 THEN 1
                WHEN ${titleCol} ILIKE $3 THEN 2
                WHEN ${titleCol} ILIKE $2 THEN 3
                ELSE 4 END,
           sim DESC
         LIMIT 8`,
        [q, `%${q}%`, `${q}%`]
      ),
      pool2.query(
        `SELECT ${isArabic ? "title_ar" : "title_en"} as title, collection_handle as handle
         FROM categories
         WHERE visible = true
           AND collection_handle IS NOT NULL
           AND (${isArabic ? "title_ar" : "title_en"} ILIKE $1
             OR ${isArabic ? "title_en" : "title_ar"} ILIKE $1)
         ORDER BY sort_order
         LIMIT 4`,
        [`%${q}%`]
      ),
      pool2.query(
        `SELECT term FROM popular_searches
         WHERE term ILIKE $1
         ORDER BY search_count DESC
         LIMIT 5`,
        [`%${q}%`]
      )
    ]);
    return {
      products: productResults.rows.map((r) => ({
        title: isArabic && r.title_ar ? r.title_ar : r.title,
        handle: r.handle,
        imageUrl: r.image_url,
        price: r.price?.toString() || "0",
        vendor: r.vendor
      })),
      categories: categoryResults.rows.map((r) => ({
        title: r.title || "",
        handle: r.handle || ""
      })),
      popular: popularResults.rows.map((r) => r.term)
    };
  } catch (err) {
    console.error("[SearchEngine] Autocomplete error:", err.message);
    return { products: [], categories: [], popular: [] };
  }
}
async function trackSearch(query, resultsCount, language = "en") {
  try {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return;
    await Promise.all([
      pool2.query(
        `INSERT INTO search_analytics (query, results_count, language) VALUES ($1, $2, $3)`,
        [q, resultsCount, language]
      ),
      pool2.query(
        `INSERT INTO popular_searches (term, search_count, language, updated_at)
         VALUES ($1, 1, $2, NOW())
         ON CONFLICT (term) DO UPDATE SET
           search_count = popular_searches.search_count + 1,
           updated_at = NOW()`,
        [q, language]
      )
    ]);
  } catch (err) {
    console.warn("[SearchEngine] Analytics tracking error:", err);
  }
}
async function getSearchAnalytics() {
  try {
    const [topSearches, zeroResults, recentSearches] = await Promise.all([
      pool2.query(
        `SELECT term, search_count FROM popular_searches
         ORDER BY search_count DESC LIMIT 20`
      ),
      pool2.query(
        `SELECT query, COUNT(*) as count FROM search_analytics
         WHERE results_count = 0
         AND created_at > NOW() - INTERVAL '30 days'
         GROUP BY query ORDER BY count DESC LIMIT 20`
      ),
      pool2.query(
        `SELECT query, results_count, created_at FROM search_analytics
         ORDER BY created_at DESC LIMIT 50`
      )
    ]);
    return {
      topSearches: topSearches.rows,
      zeroResultSearches: zeroResults.rows,
      recentSearches: recentSearches.rows
    };
  } catch (err) {
    console.error("[SearchEngine] Analytics fetch error:", err);
    return { topSearches: [], zeroResultSearches: [], recentSearches: [] };
  }
}
var syncInterval = null;
function startPeriodicSync(intervalMs = 30 * 60 * 1e3) {
  ensureSearchTables().then(() => syncProductIndex()).catch((err) => console.error("[SearchEngine] Initial sync failed:", err));
  syncInterval = setInterval(() => {
    syncProductIndex().catch((err) => console.error("[SearchEngine] Periodic sync failed:", err));
  }, intervalMs);
  console.log(`[SearchEngine] Periodic sync started (every ${intervalMs / 6e4} minutes)`);
}
async function batchStockStatus(handles) {
  if (handles.length === 0) return {};
  const unique = [...new Set(handles)].slice(0, 100);
  const placeholders = unique.map((_, i) => `$${i + 1}`).join(",");
  const result = await pool2.query(
    `SELECT handle, available_for_sale FROM search_index WHERE handle IN (${placeholders})`,
    unique
  );
  const statusMap = {};
  for (const row of result.rows) {
    statusMap[row.handle] = row.available_for_sale;
  }
  return statusMap;
}

// server/routes.ts
function fixCheckoutUrl(cart) {
  if (cart?.checkoutUrl && cart.checkoutUrl.startsWith("http://")) {
    cart.checkoutUrl = cart.checkoutUrl.replace("http://", "https://");
  }
  return cart;
}
var apiCache = /* @__PURE__ */ new Map();
function getCached(key, ttlMs) {
  const entry = apiCache.get(key);
  if (entry && Date.now() - entry.ts < ttlMs) return entry.data;
  return null;
}
function setCache(key, data) {
  apiCache.set(key, { data, ts: Date.now() });
}
function toAbsoluteUrl(url, req) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) {
    const fwdProto = (req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim();
    const fwdHost = (req.headers["x-forwarded-host"] || "").split(",")[0].trim() || req.headers.host || "";
    return `${fwdProto}://${fwdHost}${url}`;
  }
  return url;
}
async function registerRoutes(app2) {
  app2.get("/api/collections", async (req, res) => {
    try {
      const lang = (req.query.lang || "AR").toUpperCase();
      const language = lang === "EN" ? "EN" : "AR";
      const cacheKey = `collections-${language}`;
      const cached = getCached(cacheKey, 5 * 60 * 1e3);
      if (cached) return res.json(cached);
      const data = await shopifyFetch(QUERIES.COLLECTIONS, { first: 250, language });
      const collections = data.collections.edges.map((edge) => edge.node);
      setCache(cacheKey, collections);
      res.json(collections);
    } catch (error) {
      console.error("Error fetching collections:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  let _salesCountCache = null;
  const SALES_CACHE_TTL = 10 * 60 * 1e3;
  app2.get("/api/sales-counts", async (_req, res) => {
    try {
      if (_salesCountCache && Date.now() - _salesCountCache.at < SALES_CACHE_TTL) {
        return res.json(_salesCountCache.data);
      }
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
      const map = {};
      let cursor = null;
      while (true) {
        const afterClause = cursor ? `, after: "${cursor}"` : "";
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
        const orders2 = data?.orders?.edges || [];
        for (const { node: order } of orders2) {
          for (const { node: item } of order.lineItems?.edges || []) {
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
    } catch (error) {
      console.error("[sales-counts]", error.message);
      res.json({});
    }
  });
  app2.get("/api/trending-products", async (req, res) => {
    try {
      const lang = req.query.lang || "AR";
      const shopifyLang = lang.toUpperCase() === "EN" ? "EN" : "AR";
      const limit = parseInt(req.query.limit) || 12;
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
      const salesMap = {};
      let cursor = null;
      while (true) {
        const afterClause = cursor ? `, after: "${cursor}"` : "";
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
        const orders2 = data?.orders?.edges || [];
        for (const { node: order } of orders2) {
          for (const { node: item } of order.lineItems?.edges || []) {
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
      const topHandles = Object.entries(salesMap).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([handle]) => handle);
      if (topHandles.length === 0) {
        const fallback = await shopifyFetch(QUERIES.GET_PRODUCTS, {
          first: limit,
          sortKey: "BEST_SELLING",
          reverse: false,
          language: shopifyLang
        });
        return res.json(fallback?.products?.edges?.map((e) => e.node) || []);
      }
      const productFetches = topHandles.map(
        (h) => shopifyFetch(QUERIES.PRODUCT_BY_HANDLE, { handle: h, language: shopifyLang }).then((d) => d?.product || null).catch(() => null)
      );
      const products = (await Promise.all(productFetches)).filter(
        (p) => p && p.availableForSale
      );
      res.json(products);
    } catch (error) {
      console.error("[trending-products]", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/collections/:handle/products", async (req, res) => {
    try {
      const { handle } = req.params;
      const first = parseInt(req.query.first) || 20;
      const after = req.query.after || void 0;
      const rawSortKey = req.query.sortKey || "RANDOM";
      const isRandom = rawSortKey === "RANDOM";
      const sortKey = isRandom ? "BEST_SELLING" : rawSortKey;
      const reverse = req.query.reverse === "true";
      const lang = (req.query.lang || "AR").toUpperCase();
      const language = lang === "EN" ? "EN" : "AR";
      if (!after && first <= 12) {
        const cacheKey = `col-${handle}-${language}-${first}-${req.query.available || ""}`;
        const cached = getCached(cacheKey, 3 * 60 * 1e3);
        if (cached) return res.json(cached);
      }
      const filters = [];
      if (req.query.minPrice || req.query.maxPrice) {
        const priceFilter = {};
        if (req.query.minPrice) priceFilter.min = parseFloat(req.query.minPrice);
        if (req.query.maxPrice) priceFilter.max = parseFloat(req.query.maxPrice);
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
        filters: filters.length > 0 ? filters : void 0,
        language
      });
      const collection = data.collection;
      if (!collection) {
        return res.status(404).json({ error: "Collection not found" });
      }
      let products = collection.products.edges.map((edge) => edge.node);
      if (isRandom) {
        for (let i = products.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [products[i], products[j]] = [products[j], products[i]];
        }
      }
      const pageInfo = collection.products.pageInfo;
      const result = {
        collection: {
          id: collection.id,
          title: collection.title,
          handle: collection.handle,
          description: collection.description
        },
        products,
        pageInfo
      };
      if (!after && first <= 12) {
        const cacheKey = `col-${handle}-${language}-${first}-${req.query.available || ""}`;
        setCache(cacheKey, result);
      }
      res.json(result);
    } catch (error) {
      console.error("Error fetching collection products:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/products", async (req, res) => {
    try {
      const first = parseInt(req.query.first) || 20;
      const after = req.query.after || void 0;
      const rawSortKey2 = req.query.sortKey || "RANDOM";
      const isRandom2 = rawSortKey2 === "RANDOM";
      const sortKey = isRandom2 ? "BEST_SELLING" : rawSortKey2;
      const reverse = req.query.reverse === "true";
      const query = req.query.query || "";
      const withPageInfo = req.query.pageInfo === "true";
      const lang = (req.query.lang || "AR").toUpperCase();
      const language = lang === "EN" ? "EN" : "AR";
      const availableFilter = req.query.available;
      const data = await shopifyFetch(QUERIES.PRODUCTS, {
        first,
        after,
        sortKey,
        reverse,
        query: query || void 0,
        language
      });
      let products = data.products.edges.map((edge) => edge.node);
      if (availableFilter === "true") {
        products = products.filter((p) => p.availableForSale !== false);
      } else if (availableFilter === "false") {
        products = products.filter((p) => p.availableForSale === false);
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
    } catch (error) {
      console.error("Error fetching products:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/products/:handle", async (req, res) => {
    try {
      const { handle } = req.params;
      const lang = (req.query.lang || "AR").toUpperCase();
      const language = lang === "EN" ? "EN" : "AR";
      const data = await shopifyFetch(QUERIES.PRODUCT_BY_HANDLE, { handle, language });
      const product = data.product;
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/products/:productId/recommendations", async (req, res) => {
    try {
      const lang = (req.query.lang || "AR").toUpperCase();
      const language = lang === "EN" ? "EN" : "AR";
      const { productId } = req.params;
      const data = await shopifyFetch(QUERIES.PRODUCT_RECOMMENDATIONS, { productId, language });
      const products = data.productRecommendations || [];
      res.json(products);
    } catch (error) {
      console.error("Error fetching product recommendations:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/cart-upsell", async (req, res) => {
    try {
      const { handles } = req.body;
      const lang = req.query.lang || "AR";
      const shopifyLang = lang.toUpperCase() === "EN" ? "EN" : "AR";
      const excludeSet = new Set(handles || []);
      const productIdFetches = (handles || []).slice(0, 5).map(
        (h) => shopifyFetch(QUERIES.PRODUCT_BY_HANDLE, { handle: h, language: shopifyLang }).then((d) => d?.product?.id).catch(() => null)
      );
      const productIds = (await Promise.all(productIdFetches)).filter(Boolean);
      const perProduct = /* @__PURE__ */ new Map();
      if (productIds.length > 0) {
        const recFetches = productIds.map(
          (pid) => shopifyFetch(QUERIES.PRODUCT_RECOMMENDATIONS, {
            productId: pid,
            language: shopifyLang
          }).then((data) => ({ pid, data })).catch(() => ({ pid, data: null }))
        );
        const results = await Promise.all(recFetches);
        for (const { pid, data } of results) {
          if (data?.productRecommendations) {
            const valid = data.productRecommendations.filter(
              (p) => p.availableForSale && !excludeSet.has(p.handle)
            );
            perProduct.set(pid, valid);
          }
        }
      }
      const seen = /* @__PURE__ */ new Set();
      const diverse = [];
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
    } catch (error) {
      console.error("Error fetching cart upsell:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q;
      if (!query) {
        return res.json({ products: [], totalCount: 0, suggestions: [], brands: [], priceRange: { min: 0, max: 0 } });
      }
      const language = req.query.lang?.toLowerCase() || "en";
      const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : void 0;
      const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : void 0;
      const brand = req.query.brand;
      const inStock = req.query.inStock === "true";
      const limit = parseInt(req.query.limit) || 30;
      const offset = parseInt(req.query.offset) || 0;
      const results = await advancedSearch({
        query,
        language,
        minPrice,
        maxPrice,
        brand,
        inStock,
        limit,
        offset
      });
      trackSearch(query, results.totalCount, language).catch(() => {
      });
      if (results.products.length === 0) {
        try {
          const [enData, arData] = await Promise.all([
            shopifyFetch(QUERIES.SEARCH_PRODUCTS, { query, first: limit, language: "EN" }),
            shopifyFetch(QUERIES.SEARCH_PRODUCTS, { query, first: limit, language: "AR" })
          ]);
          const enProducts = (enData.products?.edges || []).map((edge) => edge.node);
          const arProducts = (arData.products?.edges || []).map((edge) => edge.node);
          const arMap = /* @__PURE__ */ new Map();
          arProducts.forEach((p) => {
            if (p.id) arMap.set(p.id, p);
          });
          const mergedProducts = enProducts.map((p) => {
            const ar = arMap.get(p.id);
            return {
              ...p,
              titleAr: ar?.title || p.title,
              titleEn: p.title,
              title: language === "ar" && ar?.title ? ar.title : p.title,
              description: language === "ar" && ar?.description ? ar.description : p.description
            };
          });
          if (mergedProducts.length === 0 && arProducts.length > 0) {
            arProducts.forEach((p) => {
              if (!mergedProducts.find((m) => m.id === p.id)) {
                mergedProducts.push({ ...p, titleAr: p.title, titleEn: p.title });
              }
            });
          }
          if (mergedProducts.length > 0) {
            for (let i = mergedProducts.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [mergedProducts[i], mergedProducts[j]] = [mergedProducts[j], mergedProducts[i]];
            }
            const sfLang = language === "ar" ? "AR" : "EN";
            const collectionData = await shopifyFetch(QUERIES.COLLECTIONS, { first: 250, language: sfLang });
            const allCollections = collectionData.collections.edges.map((edge) => edge.node);
            const q = query.toLowerCase();
            const matchingCollections = allCollections.filter(
              (c) => c.title?.toLowerCase().includes(q) || c.handle?.toLowerCase().includes(q)
            ).slice(0, 8);
            const vendorMap = /* @__PURE__ */ new Map();
            mergedProducts.forEach((p) => {
              if (p.vendor) vendorMap.set(p.vendor, (vendorMap.get(p.vendor) || 0) + 1);
            });
            return res.json({
              products: mergedProducts,
              totalCount: mergedProducts.length,
              suggestions: [],
              brands: Array.from(vendorMap.entries()).map(([name, count]) => ({ name, count })),
              collections: matchingCollections,
              priceRange: { min: 0, max: 0 },
              source: "shopify_fallback"
            });
          }
        } catch (fallbackErr) {
          console.warn("[Search] Shopify fallback also failed:", fallbackErr.message);
        }
      }
      if (results.products.length > 0) {
        try {
          const handles = results.products.map((p) => p.handle).filter(Boolean).slice(0, 20);
          if (handles.length > 0) {
            const handleFilter = handles.map((h) => `handle:${h}`).join(" OR ");
            const stockData = await shopifyFetch(`query CheckStock($query: String!) { products(first: 50, query: $query) { edges { node { handle availableForSale } } } }`, { query: handleFilter });
            const stockMap = {};
            (stockData.products?.edges || []).forEach((e) => {
              stockMap[e.node.handle] = e.node.availableForSale;
            });
            results.products = results.products.map((p) => ({
              ...p,
              availableForSale: p.handle in stockMap ? stockMap[p.handle] : p.availableForSale
            }));
          }
        } catch (stockErr) {
          console.warn("[Search] Stock verification failed:", stockErr.message);
        }
      }
      res.json(results);
    } catch (error) {
      console.error("Error searching products:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/search/suggest", async (req, res) => {
    try {
      const query = req.query.q;
      const language = req.query.lang?.toLowerCase() || "en";
      if (!query || query.length < 1) {
        return res.json({ products: [], categories: [], popular: [] });
      }
      const suggestions = await getAutocompleteSuggestions(query, language);
      if (suggestions.products.length === 0 && query.length >= 2) {
        try {
          const sfLang = language === "ar" ? "AR" : "EN";
          const sfData = await shopifyFetch(QUERIES.SEARCH_PRODUCTS, { query, first: 8, language: sfLang });
          const sfProducts = (sfData.products?.edges || []).map((e) => {
            const n = e.node;
            return {
              title: n.title,
              handle: n.handle,
              imageUrl: n.images?.edges?.[0]?.node?.url || null,
              price: n.priceRange?.minVariantPrice?.amount || "0",
              vendor: n.vendor || null
            };
          });
          if (sfProducts.length > 0) {
            suggestions.products = sfProducts;
          }
        } catch (sfErr) {
          console.warn("[Suggest] Shopify fallback failed:", sfErr.message);
        }
      }
      res.json(suggestions);
    } catch (error) {
      console.error("Error getting suggestions:", error.message);
      res.json({ products: [], categories: [], popular: [] });
    }
  });
  app2.post("/api/search/sync", async (_req, res) => {
    try {
      const count = await syncProductIndex();
      res.json({ success: true, productsIndexed: count });
    } catch (error) {
      console.error("Error syncing search index:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/search/analytics", async (_req, res) => {
    try {
      const analytics = await getSearchAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/stock-status", async (req, res) => {
    try {
      const { handles } = req.body;
      if (!handles || !Array.isArray(handles) || handles.length === 0) {
        return res.json({});
      }
      const statusMap = await batchStockStatus(handles);
      res.json(statusMap);
    } catch (error) {
      console.error("Error fetching stock status:", error.message);
      res.json({});
    }
  });
  app2.get("/api/cart/:cartId", async (req, res) => {
    try {
      const { cartId } = req.params;
      const data = await shopifyFetch(QUERIES.GET_CART, { cartId });
      if (!data.cart) {
        return res.status(404).json({ error: "Cart not found" });
      }
      res.json(fixCheckoutUrl(data.cart));
    } catch (error) {
      console.error("Error fetching cart:", error.message);
      res.status(404).json({ error: error.message });
    }
  });
  app2.post("/api/cart/create", async (req, res) => {
    try {
      const { lines } = req.body;
      const data = await shopifyFetch(QUERIES.CREATE_CART, {
        input: { lines: lines || [] }
      });
      if (data.cartCreate.userErrors?.length > 0) {
        return res.status(400).json({ errors: data.cartCreate.userErrors });
      }
      const cart = fixCheckoutUrl(data.cartCreate.cart);
      console.log("[Cart Create] checkoutUrl:", cart?.checkoutUrl);
      res.json(cart);
    } catch (error) {
      console.error("Error creating cart:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/cart/add", async (req, res) => {
    try {
      const { cartId, lines } = req.body;
      const data = await shopifyFetch(QUERIES.ADD_TO_CART, { cartId, lines });
      if (data.cartLinesAdd.userErrors?.length > 0) {
        return res.status(400).json({ errors: data.cartLinesAdd.userErrors });
      }
      res.json(fixCheckoutUrl(data.cartLinesAdd.cart));
    } catch (error) {
      console.error("Error adding to cart:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/cart/update", async (req, res) => {
    try {
      const { cartId, lines } = req.body;
      const data = await shopifyFetch(QUERIES.UPDATE_CART_LINES, { cartId, lines });
      if (data.cartLinesUpdate.userErrors?.length > 0) {
        return res.status(400).json({ errors: data.cartLinesUpdate.userErrors });
      }
      res.json(fixCheckoutUrl(data.cartLinesUpdate.cart));
    } catch (error) {
      console.error("Error updating cart:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/cart/remove", async (req, res) => {
    try {
      const { cartId, lineIds } = req.body;
      const data = await shopifyFetch(QUERIES.REMOVE_CART_LINES, { cartId, lineIds });
      if (data.cartLinesRemove.userErrors?.length > 0) {
        return res.status(400).json({ errors: data.cartLinesRemove.userErrors });
      }
      res.json(fixCheckoutUrl(data.cartLinesRemove.cart));
    } catch (error) {
      console.error("Error removing from cart:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/cart/discount", async (req, res) => {
    try {
      const { cartId, discountCodes } = req.body;
      const data = await shopifyFetch(QUERIES.APPLY_DISCOUNT, { cartId, discountCodes });
      if (data.cartDiscountCodesUpdate.userErrors?.length > 0) {
        return res.status(400).json({ errors: data.cartDiscountCodesUpdate.userErrors });
      }
      res.json(fixCheckoutUrl(data.cartDiscountCodesUpdate.cart));
    } catch (error) {
      console.error("Error applying discount:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      const data = await shopifyFetch(QUERIES.CUSTOMER_CREATE, {
        input: { email, password, firstName, lastName }
      });
      if (data.customerCreate.customerUserErrors?.length > 0) {
        return res.status(400).json({ errors: data.customerCreate.customerUserErrors });
      }
      const tokenData = await shopifyFetch(QUERIES.CUSTOMER_ACCESS_TOKEN_CREATE, {
        input: { email, password }
      });
      if (tokenData.customerAccessTokenCreate.customerUserErrors?.length > 0) {
        return res.status(400).json({ errors: tokenData.customerAccessTokenCreate.customerUserErrors });
      }
      res.json({
        customer: data.customerCreate.customer,
        accessToken: tokenData.customerAccessTokenCreate.customerAccessToken
      });
    } catch (error) {
      console.error("Error registering:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const data = await shopifyFetch(QUERIES.CUSTOMER_ACCESS_TOKEN_CREATE, {
        input: { email, password }
      });
      if (data.customerAccessTokenCreate.customerUserErrors?.length > 0) {
        return res.status(400).json({ errors: data.customerAccessTokenCreate.customerUserErrors });
      }
      const token = data.customerAccessTokenCreate.customerAccessToken;
      const customerData = await shopifyFetch(QUERIES.GET_CUSTOMER, {
        customerAccessToken: token.accessToken
      });
      res.json({
        customer: customerData.customer,
        accessToken: token
      });
    } catch (error) {
      console.error("Error logging in:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/auth/recover", async (req, res) => {
    try {
      const { email } = req.body;
      const data = await shopifyFetch(QUERIES.CUSTOMER_RECOVER, { email });
      if (data.customerRecover.customerUserErrors?.length > 0) {
        return res.status(400).json({ errors: data.customerRecover.customerUserErrors });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error recovering:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/customer", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return res.status(401).json({ error: "No token provided" });
      }
      const lang = (req.query.lang || "EN").toUpperCase();
      const data = await shopifyFetch(QUERIES.GET_CUSTOMER, {
        customerAccessToken: token,
        language: lang
      });
      if (!data.customer) {
        console.error("[Customer] No customer returned. Data:", JSON.stringify(data).substring(0, 500));
        return res.status(401).json({ error: "Invalid token" });
      }
      const orderCount = data.customer?.orders?.edges?.length || 0;
      console.log(`[Customer] Fetched customer ${data.customer.email} with ${orderCount} orders`);
      res.json(data.customer);
    } catch (error) {
      console.error("Error fetching customer:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.put("/api/customer/update", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return res.status(401).json({ error: "No token provided" });
      }
      const { firstName, lastName, email, phone, password } = req.body;
      const customerInput = {};
      if (firstName !== void 0) customerInput.firstName = firstName;
      if (lastName !== void 0) customerInput.lastName = lastName;
      if (email !== void 0) customerInput.email = email;
      if (phone !== void 0 && phone.trim() !== "") {
        let cleanPhone = phone.trim().replace(/\s+/g, "");
        if (!cleanPhone.startsWith("+")) {
          cleanPhone = "+" + cleanPhone;
        }
        customerInput.phone = cleanPhone;
      } else if (phone === "") {
        customerInput.phone = "";
      }
      if (password !== void 0) customerInput.password = password;
      console.log("[CustomerUpdate] Updating fields:", Object.keys(customerInput));
      const data = await shopifyFetch(QUERIES.CUSTOMER_UPDATE, {
        customerAccessToken: token,
        customer: customerInput
      });
      if (data.customerUpdate?.customerUserErrors?.length > 0) {
        const errors = data.customerUpdate.customerUserErrors;
        console.log("[CustomerUpdate] Shopify errors:", JSON.stringify(errors));
        const errorMsg = errors.map((e) => {
          const field = e.field?.join?.(".") || e.field || "";
          return `${field}: ${e.message}`;
        }).join("; ");
        return res.status(400).json({ errors, error: errorMsg });
      }
      if (!data.customerUpdate?.customer) {
        console.log("[CustomerUpdate] No customer returned:", JSON.stringify(data));
        return res.status(500).json({ error: "Update failed" });
      }
      console.log("[CustomerUpdate] Success");
      res.json({
        customer: data.customerUpdate.customer,
        accessToken: data.customerUpdate.customerAccessToken
      });
    } catch (error) {
      console.error("[CustomerUpdate] Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  const translationCache = {};
  async function translateWithGoogle(text2, sourceLang, targetLang) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text2)}`;
    const response = await fetch(url);
    if (!response.ok) return text2;
    const data = await response.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      return data[0].map((seg) => seg[0]).join("");
    }
    return text2;
  }
  app2.post("/api/translate", async (req, res) => {
    try {
      const { text: text2, targetLang } = req.body;
      if (!text2 || !targetLang) {
        return res.status(400).json({ error: "Missing text or targetLang" });
      }
      const cacheKey = `${targetLang}:${text2.substring(0, 200)}`;
      if (translationCache[cacheKey]) {
        return res.json({ translatedText: translationCache[cacheKey] });
      }
      const sourceLang = "en";
      const translated = await translateWithGoogle(text2, sourceLang, targetLang);
      if (translated && translated !== text2) {
        translationCache[cacheKey] = translated;
      }
      res.json({ translatedText: translated });
    } catch (error) {
      console.error("Translation error:", error.message);
      res.json({ translatedText: req.body.text });
    }
  });
  app2.get("/api/homepage", async (req, res) => {
    try {
      const lang = (req.query.lang || "").toLowerCase();
      const allSections = await db.select().from(homepageSections).orderBy(asc(homepageSections.sortOrder));
      const specialTypes = ["best_selling", "new_arrivals", "hero_banner", "mid_banner", "category_row", "selected_categories"];
      const filteredSections = allSections.filter((s) => {
        if (specialTypes.includes(s.type)) return true;
        return s.visible;
      });
      const sectionsWithBanners = await Promise.all(
        filteredSections.map(async (section) => {
          const allBanners = await db.select().from(homepageBanners).where(sql2`${homepageBanners.sectionId} = ${section.id} AND ${homepageBanners.visible} = true`).orderBy(asc(homepageBanners.sortOrder));
          const banners = allBanners.filter((b) => {
            const bLang = (b.language ?? "both").trim();
            if (bLang === "both" || bLang === "") return true;
            if (!lang || lang === "") return true;
            return bLang === lang;
          });
          let selectedCategories = [];
          if (section.type === "selected_categories" && section.metadata) {
            try {
              const meta = JSON.parse(section.metadata);
              const handles = meta.collectionHandles || [];
              const legacyIds = meta.categoryIds || [];
              if (handles.length > 0) {
                const [arData, enData] = await Promise.all([
                  shopifyFetch(QUERIES.COLLECTIONS, { first: 250, language: "AR" }),
                  shopifyFetch(QUERIES.COLLECTIONS, { first: 250, language: "EN" })
                ]);
                const arCols = arData.collections.edges.map((e) => e.node);
                const enCols = enData.collections.edges.map((e) => e.node);
                const arByHandle = {};
                arCols.forEach((c) => {
                  arByHandle[c.handle] = c;
                });
                selectedCategories = handles.map((h) => {
                  const en = enCols.find((c) => c.handle === h);
                  const ar = arByHandle[h];
                  return en ? {
                    id: h,
                    titleAr: ar?.title || en.title,
                    titleEn: en.title,
                    imageUrl: en.image?.url || ar?.image?.url || null,
                    collectionHandle: h
                  } : null;
                }).filter(Boolean);
              } else if (legacyIds.length > 0) {
                const allCats = await db.select().from(categories).where(inArray(categories.id, legacyIds));
                selectedCategories = legacyIds.map((id) => allCats.find((c) => String(c.id) === String(id))).filter(Boolean).map((c) => ({
                  id: c.id,
                  titleAr: c.titleAr,
                  titleEn: c.titleEn,
                  imageUrl: c.imageUrl,
                  collectionHandle: c.collectionHandle
                }));
              }
            } catch {
            }
          }
          let multiTabs = [];
          if (section.type === "multi_collection" && section.metadata) {
            try {
              multiTabs = JSON.parse(section.metadata).tabs || [];
            } catch {
            }
          }
          let showcaseCollections = [];
          if (section.type === "collection_showcase" && section.metadata) {
            try {
              showcaseCollections = JSON.parse(section.metadata).collections || [];
            } catch {
            }
          }
          let brands = [];
          if (section.type === "brands_strip" && section.metadata) {
            try {
              brands = (JSON.parse(section.metadata).brands || []).map((b) => ({
                ...b,
                imageUrl: toAbsoluteUrl(b.imageUrl, req) || b.imageUrl
              }));
            } catch {
            }
          }
          let featuredProducts = [];
          if ((section.type === "featured_products" || section.type === "product_slider") && section.metadata) {
            try {
              featuredProducts = JSON.parse(section.metadata).products || [];
            } catch {
            }
            const missingVendor = featuredProducts.filter((p) => !p.vendor && p.handle);
            if (missingVendor.length > 0) {
              try {
                const vendorResults = await Promise.all(
                  missingVendor.map(
                    (p) => shopifyFetch(QUERIES.PRODUCT_BY_HANDLE, { handle: p.handle, language: "EN" }).then((d) => ({ handle: p.handle, vendor: d?.product?.vendor || "" })).catch(() => ({ handle: p.handle, vendor: "" }))
                  )
                );
                const vendorMap = {};
                vendorResults.forEach((r) => {
                  if (r.vendor) vendorMap[r.handle] = r.vendor;
                });
                let changed = false;
                featuredProducts = featuredProducts.map((p) => {
                  if (!p.vendor && vendorMap[p.handle]) {
                    changed = true;
                    return { ...p, vendor: vendorMap[p.handle] };
                  }
                  return p;
                });
                if (changed) {
                  const existingMeta = (() => {
                    try {
                      return JSON.parse(section.metadata || "{}");
                    } catch {
                      return {};
                    }
                  })();
                  const newMeta = JSON.stringify({ ...existingMeta, products: featuredProducts });
                  await db.update(homepageSections).set({ metadata: newMeta }).where(eq(homepageSections.id, section.id));
                  console.log("[Vendor enrich] Updated vendors for section:", section.id, vendorMap);
                }
              } catch (enrichErr) {
                console.error("[Vendor enrich] error:", enrichErr.message);
              }
            }
          }
          const slimFeaturedProducts = featuredProducts.map((p) => ({
            handle: p.handle,
            titleEn: p.titleEn,
            titleAr: p.titleAr,
            vendor: p.vendor,
            imageUrl: p.imageUrl,
            price: p.price,
            compareAtPrice: p.compareAtPrice,
            currency: p.currency
          }));
          let cleanMetadata = section.metadata || null;
          if (cleanMetadata && (section.type === "product_slider" || section.type === "featured_products")) {
            try {
              const parsed = JSON.parse(cleanMetadata);
              if (parsed.products) {
                parsed.products = parsed.products.map((p) => ({
                  handle: p.handle,
                  titleEn: p.titleEn,
                  titleAr: p.titleAr,
                  vendor: p.vendor,
                  imageUrl: p.imageUrl,
                  price: p.price,
                  compareAtPrice: p.compareAtPrice,
                  currency: p.currency
                }));
                cleanMetadata = JSON.stringify(parsed);
              }
            } catch {
            }
          }
          return {
            id: section.id,
            type: section.type,
            titleAr: section.titleAr,
            titleEn: section.titleEn,
            language: section.language || "both",
            sortOrder: section.sortOrder,
            visible: section.visible,
            metadata: cleanMetadata,
            selectedCategories,
            tabs: multiTabs,
            showcaseCollections,
            featuredProducts: slimFeaturedProducts,
            brands,
            banners: banners.map((b) => ({
              id: b.id,
              imageUrl: b.imageUrl,
              linkType: b.linkType,
              linkValue: b.linkValue,
              sortOrder: b.sortOrder
            }))
          };
        })
      );
      const settingsRows = await db.select().from(appSettings);
      const settingsMap = {};
      settingsRows.forEach((s) => {
        settingsMap[s.key] = s.value;
      });
      const heroBanners = [];
      const midBanners = [];
      for (const section of sectionsWithBanners) {
        if (section.type === "banner_slider") {
          const targetList = heroBanners.length === 0 ? heroBanners : midBanners;
          for (const b of section.banners) {
            targetList.push({
              imageUrl: b.imageUrl,
              linkType: b.linkType || "collection",
              linkValue: b.linkValue || ""
            });
          }
        }
      }
      const finalSections = sectionsWithBanners.filter((s) => {
        if (s.type === "static_banner" && lang) {
          try {
            const meta = JSON.parse(s.metadata || "{}");
            const bLang = (meta.language || "both").trim();
            if (bLang !== "both" && bLang !== "" && bLang !== lang) return false;
          } catch {
          }
        }
        return true;
      });
      res.json({
        sections: finalSections,
        settings: settingsMap,
        heroBanners,
        midBanners,
        featuredCollectionHandles: []
      });
    } catch (error) {
      console.error("Error fetching homepage:", error.message);
      res.json({
        sections: [],
        settings: {},
        heroBanners: [],
        midBanners: [],
        featuredCollectionHandles: []
      });
    }
  });
  app2.post("/api/cart/buyer-identity", async (req, res) => {
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
      const deliveryAddress = {};
      if (firstName) deliveryAddress.firstName = firstName;
      if (lastName) deliveryAddress.lastName = lastName;
      if (address) deliveryAddress.address1 = address;
      if (city) deliveryAddress.city = city;
      deliveryAddress.country = countryCode || "JO";
      if (formattedPhone) deliveryAddress.phone = formattedPhone;
      const buyerIdentity = {};
      if (email) buyerIdentity.email = email;
      if (formattedPhone) buyerIdentity.phone = formattedPhone;
      buyerIdentity.deliveryAddressPreferences = [{ deliveryAddress }];
      const data = await shopifyFetch(QUERIES.CART_BUYER_IDENTITY_UPDATE, {
        cartId,
        buyerIdentity
      });
      if (data.cartBuyerIdentityUpdate.userErrors?.length > 0) {
        console.error("Buyer identity errors:", data.cartBuyerIdentityUpdate.userErrors);
        return res.status(400).json({ errors: data.cartBuyerIdentityUpdate.userErrors });
      }
      res.json(fixCheckoutUrl(data.cartBuyerIdentityUpdate.cart));
    } catch (error) {
      console.error("Error updating buyer identity:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/cart/note", async (req, res) => {
    try {
      const { cartId, note } = req.body;
      if (!cartId) {
        return res.status(400).json({ error: "cartId is required" });
      }
      const data = await shopifyFetch(QUERIES.CART_NOTE_UPDATE, {
        cartId,
        note: note || ""
      });
      if (data.cartNoteUpdate.userErrors?.length > 0) {
        return res.status(400).json({ errors: data.cartNoteUpdate.userErrors });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating cart note:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  async function getShopifyCustomerId(storeFrontToken) {
    const data = await shopifyFetch(QUERIES.GET_CUSTOMER, {
      customerAccessToken: storeFrontToken,
      language: "EN"
    });
    if (!data.customer?.id) throw new Error("Customer not found");
    const gid = data.customer.id;
    const numericId = gid.replace(/.*\//, "");
    return numericId;
  }
  app2.get("/api/customer/addresses", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return res.status(401).json({ error: "Authentication required" });
      const lang = (req.query.lang || "EN").toUpperCase();
      const data = await shopifyFetch(QUERIES.GET_CUSTOMER, {
        customerAccessToken: token,
        language: lang
      });
      if (!data.customer) return res.status(401).json({ error: "Invalid token" });
      const defaultAddrId = data.customer.defaultAddress?.id || null;
      const addresses = (data.customer.addresses?.edges || []).map((edge) => {
        const addr = edge.node;
        const numericId = (addr.id || "").replace(/.*\//, "").replace(/\?.*/, "");
        return {
          id: numericId,
          firstName: addr.firstName || "",
          lastName: addr.lastName || "",
          phone: addr.phone || "",
          address1: addr.address1 || "",
          address2: addr.address2 || "",
          city: addr.city || "",
          country: addr.country || "",
          province: addr.province || "",
          zip: addr.zip || "",
          company: addr.company || "",
          isDefault: addr.id === defaultAddrId
        };
      });
      res.json(addresses);
    } catch (error) {
      console.error("[Addresses] GET error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/customer/addresses", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return res.status(401).json({ error: "Authentication required" });
      const customerId = await getShopifyCustomerId(token);
      const { firstName, lastName, phone, address1, city, company } = req.body;
      let formattedPhone = phone || "";
      if (formattedPhone) {
        formattedPhone = formattedPhone.replace(/\s+/g, "");
        if (formattedPhone.startsWith("07") && formattedPhone.length === 10) {
          formattedPhone = "+962" + formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith("+")) {
          formattedPhone = "+962" + formattedPhone;
        }
      }
      const result = await shopifyAdminFetch(`customers/${customerId}/addresses.json`, "POST", {
        address: {
          first_name: firstName || "",
          last_name: lastName || "",
          phone: formattedPhone,
          address1: address1 || "",
          city: city || "",
          country: "Jordan",
          company: company || ""
        }
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
        isDefault: addr.default || false
      });
    } catch (error) {
      console.error("[Addresses] POST error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.put("/api/customer/addresses/:addressId", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return res.status(401).json({ error: "Authentication required" });
      const customerId = await getShopifyCustomerId(token);
      const { addressId } = req.params;
      const { firstName, lastName, phone, address1, city, company } = req.body;
      let formattedPhone = phone || "";
      if (formattedPhone) {
        formattedPhone = formattedPhone.replace(/\s+/g, "");
        if (formattedPhone.startsWith("07") && formattedPhone.length === 10) {
          formattedPhone = "+962" + formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith("+")) {
          formattedPhone = "+962" + formattedPhone;
        }
      }
      const result = await shopifyAdminFetch(`customers/${customerId}/addresses/${addressId}.json`, "PUT", {
        address: {
          first_name: firstName || "",
          last_name: lastName || "",
          phone: formattedPhone,
          address1: address1 || "",
          city: city || "",
          country: "Jordan",
          company: company || ""
        }
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
        isDefault: addr.default || false
      });
    } catch (error) {
      console.error("[Addresses] PUT error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/customer/addresses/:addressId", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return res.status(401).json({ error: "Authentication required" });
      const customerId = await getShopifyCustomerId(token);
      const { addressId } = req.params;
      await shopifyAdminFetch(`customers/${customerId}/addresses/${addressId}.json`, "DELETE");
      res.json({ success: true });
    } catch (error) {
      console.error("[Addresses] DELETE error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/customer/addresses/:addressId/default", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return res.status(401).json({ error: "Authentication required" });
      const customerId = await getShopifyCustomerId(token);
      const { addressId } = req.params;
      await shopifyAdminFetch(`customers/${customerId}/addresses/${addressId}/default.json`, "PUT");
      res.json({ success: true });
    } catch (error) {
      console.error("[Addresses] SET DEFAULT error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/checkout/auto-complete", async (req, res) => {
    try {
      const { checkoutUrl, email, firstName, lastName, phone, address, city, notes } = req.body;
      if (!checkoutUrl || !email) {
        return res.status(400).json({ error: "checkoutUrl and email are required" });
      }
      const result = await autoCompleteCheckout(checkoutUrl, {
        email,
        firstName: firstName || "",
        lastName: lastName || "",
        phone: phone || "",
        address,
        city,
        notes
      });
      res.json(result);
    } catch (error) {
      console.error("Error auto-completing checkout:", error.message);
      res.status(500).json({ success: false, error: error.message, redirectUrl: req.body.checkoutUrl });
    }
  });
  app2.post("/api/checkout/create", async (req, res) => {
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
      const lineItems = items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity
      }));
      const input = {
        lineItems,
        email
      };
      if (firstName || lastName || address || city || formattedPhone) {
        input.shippingAddress = {
          firstName: firstName || "",
          lastName: lastName || "",
          address1: address || "",
          city: city || "Amman",
          country: "JO",
          phone: formattedPhone || ""
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
        totalPrice: checkout.totalPriceV2
      });
    } catch (error) {
      console.error("Error creating checkout:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/orders", async (req, res) => {
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
        shippingName
      } = req.body;
      if (!firstName || !lastName || !email || !phone || !items?.length) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      let shopifyOrderId = null;
      let shopifyOrderNumber = null;
      let shopifyOrderName = null;
      let shopifyOrderStatusUrl = null;
      let deliveryCode = null;
      try {
        const lineItems = items.map((item) => {
          let variantId = item.variantId;
          if (variantId && variantId.startsWith("gid://")) {
            variantId = extractNumericId(variantId);
          }
          return {
            variant_id: parseInt(variantId, 10),
            quantity: item.quantity
          };
        });
        const formattedPhone = phone.startsWith("+") ? phone : phone.startsWith("0") ? `+962${phone.slice(1)}` : `+962${phone}`;
        const draftOrderData = {
          line_items: lineItems,
          email,
          phone: formattedPhone,
          customer: {
            first_name: firstName,
            last_name: lastName,
            email,
            phone: formattedPhone
          },
          shipping_address: {
            first_name: firstName,
            last_name: lastName,
            address1: address || "N/A",
            city: city || "Amman",
            country: "JO",
            phone
          },
          billing_address: {
            first_name: firstName,
            last_name: lastName,
            address1: address || "N/A",
            city: city || "Amman",
            country: "JO",
            phone
          },
          note: notes || "",
          tags: ["cod", "xmart-app"].join(", "),
          payment_terms: null
        };
        if (discountCode) {
          try {
            const discCartLines = items.map((item) => ({
              merchandiseId: item.variantId,
              quantity: item.quantity || 1
            }));
            const discCartData = await shopifyFetch(QUERIES.CREATE_CART, { input: { lines: discCartLines } });
            const discCartId = discCartData.cartCreate?.cart?.id;
            if (discCartId) {
              const discApplyData = await shopifyFetch(QUERIES.APPLY_DISCOUNT, {
                cartId: discCartId,
                discountCodes: [discountCode]
              });
              const discCart = discApplyData.cartDiscountCodesUpdate?.cart;
              let totalLineDiscount = 0;
              const discCartLines2 = discCart?.lines?.edges || [];
              for (const edge of discCartLines2) {
                const lineAllocs = edge.node?.discountAllocations || [];
                for (const alloc of lineAllocs) {
                  totalLineDiscount += parseFloat(alloc.discountedAmount?.amount || "0");
                }
              }
              const cartLevelAllocs = discCart?.discountAllocations || [];
              let totalCartDiscount = 0;
              for (const alloc of cartLevelAllocs) {
                totalCartDiscount += parseFloat(alloc.discountedAmount?.amount || "0");
              }
              const shopifyDiscount = Math.max(totalLineDiscount, totalCartDiscount);
              console.log(`Order discount "${discountCode}": lineDiscount=${totalLineDiscount}, cartDiscount=${totalCartDiscount}, finalDiscount=${shopifyDiscount.toFixed(3)}`);
              if (shopifyDiscount > 0) {
                draftOrderData.applied_discount = {
                  description: discountCode,
                  value_type: "fixed_amount",
                  value: shopifyDiscount.toFixed(3),
                  title: discountCode
                };
              }
            }
          } catch (discErr) {
            console.log(`Discount calculation failed for "${discountCode}": ${discErr.message}`);
          }
        }
        if (shippingCost && parseFloat(shippingCost) > 0) {
          draftOrderData.shipping_line = {
            title: shippingName || "Standard Delivery",
            price: parseFloat(shippingCost),
            custom: true
          };
        } else if (shippingCost !== void 0) {
          draftOrderData.shipping_line = {
            title: shippingName || "Free Delivery",
            price: 0,
            custom: true
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
            try {
              await new Promise((resolve3) => setTimeout(resolve3, 3e3));
              let orderWithMeta = await shopifyAdminFetch(`orders/${shopifyOrderId}/metafields.json`);
              let deliveryCodeMeta = orderWithMeta.metafields?.find(
                (m) => m.namespace === "private" && m.key === "delivery_code"
              );
              if (!deliveryCodeMeta) {
                await new Promise((resolve3) => setTimeout(resolve3, 2e3));
                orderWithMeta = await shopifyAdminFetch(`orders/${shopifyOrderId}/metafields.json`);
                deliveryCodeMeta = orderWithMeta.metafields?.find(
                  (m) => m.namespace === "private" && m.key === "delivery_code"
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
            } catch {
            }
            try {
              const orderDetail = await shopifyAdminFetch(`orders/${shopifyOrderId}.json`);
              shopifyOrderNumber = orderDetail.order?.order_number || null;
              shopifyOrderName = orderDetail.order?.name || null;
              shopifyOrderStatusUrl = orderDetail.order?.order_status_url || null;
              console.log(`Shopify order created: ${shopifyOrderName} (#${shopifyOrderNumber})`);
            } catch (detailErr) {
              console.error("Could not fetch order details:", detailErr.message);
            }
          } else {
            console.error("Draft order completed but no order_id found in response");
          }
        } else {
          console.error("Draft order creation failed - no draft_order.id in response");
        }
      } catch (shopifyErr) {
        console.error("Shopify order creation failed:", shopifyErr.message);
      }
      const lastOrder = await db.select({ orderNumber: orders.orderNumber }).from(orders).orderBy(desc(orders.orderNumber)).limit(1);
      const nextOrderNumber = shopifyOrderNumber || (lastOrder[0]?.orderNumber || 1e3) + 1;
      const [newOrder] = await db.insert(orders).values({
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
        shopifyOrderId: shopifyOrderId || null
      }).returning();
      if (items.length > 0) {
        await db.insert(orderItems).values(
          items.map((item) => ({
            orderId: newOrder.id,
            productTitle: item.productTitle,
            productHandle: item.productHandle || item.handle || null,
            variantTitle: item.variantTitle || null,
            variantId: item.variantId || null,
            quantity: item.quantity,
            price: item.price,
            currency: item.currency || currency || "JOD",
            imageUrl: item.imageUrl || null
          }))
        );
      }
      const orderItemsList = await db.select().from(orderItems).where(eq(orderItems.orderId, newOrder.id));
      res.json({
        order: {
          ...newOrder,
          items: orderItemsList,
          deliveryCode,
          shopifyOrderName,
          shopifyOrderNumber,
          shopifyOrderStatusUrl
        }
      });
    } catch (error) {
      console.error("Error placing order:", error.message);
      res.status(500).json({ error: "Failed to place order" });
    }
  });
  app2.get("/api/orders", async (req, res) => {
    try {
      const email = req.query.email;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      let shopifyOrders = [];
      try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : authHeader;
        console.log(`[OrdersAPI] Request email: ${email}, token: ${token ? token.substring(0, 10) + "..." : "none"}`);
        if (token && token !== "undefined" && token !== "null" && token !== "") {
          const lang = (req.query.lang || "EN").toUpperCase();
          const shopifyData = await shopifyFetch(QUERIES.GET_CUSTOMER, {
            customerAccessToken: token,
            language: lang
          });
          if (shopifyData?.customer?.orders?.edges) {
            shopifyOrders = shopifyData.customer.orders.edges.map((e) => e.node);
            console.log(`[OrdersAPI] Success for ${email}: ${shopifyOrders.length} orders`);
          } else {
            console.warn(`[OrdersAPI] No customer/orders in Shopify response for ${email}`);
          }
        } else {
          console.error(`[OrdersAPI] Invalid token for ${email}: ${token}`);
        }
      } catch (err) {
        console.error("[OrdersAPI] Shopify fetch error:", err.message);
      }
      res.json(shopifyOrders);
    } catch (error) {
      console.error("Error fetching orders:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/orders/delivery-codes", async (req, res) => {
    try {
      const { orderNames } = req.body;
      if (!orderNames || !Array.isArray(orderNames) || orderNames.length === 0) {
        return res.json({});
      }
      const codeMap = {};
      const localOrders = await db.select({
        shopifyOrderName: orders.shopifyOrderName,
        deliveryCode: orders.deliveryCode
      }).from(orders);
      for (const o of localOrders) {
        if (o.shopifyOrderName && o.deliveryCode) {
          codeMap[o.shopifyOrderName] = o.deliveryCode;
        }
      }
      const missing = orderNames.filter((n) => !codeMap[n]);
      if (missing.length > 0) {
        for (const name of missing.slice(0, 20)) {
          try {
            const orderNum = name.replace("#", "");
            const searchResult = await shopifyAdminFetch(`orders.json?name=${encodeURIComponent(name)}&fields=id,name&limit=1`);
            const foundOrder = searchResult?.orders?.[0];
            if (foundOrder) {
              const metaResult = await shopifyAdminFetch(`orders/${foundOrder.id}/metafields.json`);
              const dcMeta = metaResult?.metafields?.find(
                (m) => m.namespace === "private" && m.key === "delivery_code"
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
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/suggested-products", async (req, res) => {
    try {
      const language = req.query.lang?.toUpperCase() === "EN" ? "EN" : "AR";
      const items = await db.select().from(suggestedProducts).where(eq(suggestedProducts.visible, true)).orderBy(asc(suggestedProducts.sortOrder));
      if (items.length === 0) return res.json([]);
      const handles = items.map((i) => i.productHandle);
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
    } catch (error) {
      console.error("Error fetching suggested products:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/latest-order", async (req, res) => {
    try {
      const email = (req.query.email || "").trim();
      if (!email) return res.status(400).json({ error: "Email required" });
      const result = await shopifyAdminFetch(`orders.json?email=${encodeURIComponent(email)}&status=any&limit=1&order=created_at+desc&fields=id,name,order_number,total_price,currency,created_at,financial_status`);
      const order = result.orders?.[0];
      if (!order) {
        console.log(`[LatestOrder] No orders found for email: ${email}`);
        return res.json({ order: null });
      }
      let deliveryCode = null;
      try {
        const metaResult = await shopifyAdminFetch(`orders/${order.id}/metafields.json`);
        const meta = (metaResult.metafields || []).find(
          (m) => m.namespace === "private" && m.key === "delivery_code"
        );
        if (meta) deliveryCode = meta.value;
      } catch {
      }
      console.log(`[LatestOrder] Found order ${order.name} for ${email}, total: ${order.total_price}, deliveryCode: ${deliveryCode || "none"}`);
      res.json({
        order: {
          name: order.name,
          orderNumber: order.order_number,
          totalPrice: order.total_price,
          currency: order.currency || "JOD",
          deliveryCode,
          financialStatus: order.financial_status
        }
      });
    } catch (error) {
      console.error("Error fetching latest order:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/shipping-rates", async (req, res) => {
    try {
      const zones = await shopifyAdminFetch("shipping_zones.json");
      const rates = [];
      for (const zone of zones.shipping_zones || []) {
        for (const rate of zone.price_based_shipping_rates || []) {
          rates.push({
            name: rate.name,
            price: rate.price,
            currency: "JOD",
            minSubtotal: rate.min_order_subtotal ?? null,
            maxSubtotal: rate.max_order_subtotal ?? null
          });
        }
        for (const rate of zone.weight_based_shipping_rates || []) {
          rates.push({
            name: rate.name,
            price: rate.price,
            currency: "JOD",
            minSubtotal: null,
            maxSubtotal: null
          });
        }
      }
      res.json(rates);
    } catch (error) {
      console.error("Error fetching shipping rates:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/validate-discount", async (req, res) => {
    try {
      const { code, cartId, items } = req.body;
      if (!code) return res.status(400).json({ error: "Discount code required" });
      let cartLines = [];
      if (items && Array.isArray(items) && items.length > 0) {
        cartLines = items.map((item) => ({
          merchandiseId: item.merchandiseId || item.variantId,
          quantity: item.quantity || 1
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
        discountCodes: [code]
      });
      const cart = data.cartDiscountCodesUpdate?.cart;
      const appliedCodes = cart?.discountCodes || [];
      const matchedCode = appliedCodes.find(
        (dc) => dc.code.toLowerCase() === code.toLowerCase()
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
          totalLineDiscount += parseFloat(alloc.discountedAmount?.amount || "0");
        }
      }
      const cartLevelAllocs = cart?.discountAllocations || [];
      let totalCartDiscount = 0;
      for (const alloc of cartLevelAllocs) {
        totalCartDiscount += parseFloat(alloc.discountedAmount?.amount || "0");
      }
      const totalDiscount = Math.max(totalLineDiscount, totalCartDiscount);
      const shopifySubtotal = cart?.cost?.subtotalAmount?.amount || "0";
      const shopifyTotal = cart?.cost?.totalAmount?.amount || "0";
      const isFreeShip = totalDiscount === 0 && matchedCode.applicable;
      console.log(`Discount "${code}": applicable=${matchedCode.applicable}, lineDiscount=${totalLineDiscount}, cartDiscount=${totalCartDiscount}, totalDiscount=${totalDiscount}, isFreeShip=${isFreeShip}, subtotal=${shopifySubtotal}, total=${shopifyTotal}`);
      res.json({
        valid: true,
        code: matchedCode.code,
        applicable: true,
        discountAmount: totalDiscount.toFixed(3),
        discountType: isFreeShip ? "free_shipping" : "fixed_amount",
        isFreeShipping: isFreeShip,
        newTotal: shopifyTotal,
        newSubtotal: shopifySubtotal
      });
    } catch (error) {
      console.error("Error validating discount:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/categories", async (_req, res) => {
    try {
      let buildTree2 = function(parentId) {
        return allCats.filter((c) => c.parentId === parentId).map((cat) => ({ ...cat, children: buildTree2(cat.id) }));
      };
      var buildTree = buildTree2;
      const allCats = await db.select().from(categories).where(eq(categories.visible, true)).orderBy(asc(categories.sortOrder));
      res.json(buildTree2(null));
    } catch (error) {
      console.error("Error fetching categories:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/notifications", async (_req, res) => {
    try {
      const allNotifications = await db.select().from(notifications).orderBy(desc(notifications.createdAt));
      res.json(allNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/push-token", async (req, res) => {
    try {
      const { token, platform } = req.body;
      if (!token) return res.status(400).json({ error: "Token is required" });
      await db.insert(pushTokens).values({ token, platform: platform || "unknown" }).onConflictDoNothing();
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving push token:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  setInterval(() => quickStockRefresh().catch((e) => console.error("[StockRefresh] Error:", e.message)), 5 * 60 * 1e3);
  setTimeout(() => quickStockRefresh().catch((e) => console.error("[StockRefresh] Error:", e.message)), 2 * 60 * 1e3);
  startPeriodicSync(30 * 60 * 1e3);
  const httpServer = createServer(app2);
  return httpServer;
}

// server/admin-routes.ts
init_db();
init_schema();
import { eq as eq2, asc as asc2, desc as desc2, sql as sql3 } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";
async function sendPushNotifications(notification) {
  try {
    const tokens = await db.select().from(pushTokens);
    if (tokens.length === 0) return;
    const messages = tokens.map((t) => ({
      to: t.token,
      sound: "default",
      title: notification.titleAr,
      body: notification.bodyAr || "",
      priority: "high",
      channelId: "default",
      _contentAvailable: true,
      data: {
        notificationId: notification.id,
        linkType: notification.linkType,
        linkValue: notification.linkValue,
        titleAr: notification.titleAr,
        titleEn: notification.titleEn,
        bodyAr: notification.bodyAr,
        bodyEn: notification.bodyEn
      }
    }));
    const chunks = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }
    for (const chunk of chunks) {
      try {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chunk)
        });
        const result = await response.json();
        if (result.data) {
          const invalidTokens = [];
          result.data.forEach((item, index) => {
            if (item.status === "error" && (item.details?.error === "DeviceNotRegistered" || item.details?.error === "InvalidCredentials")) {
              invalidTokens.push(chunk[index].to);
            }
          });
          if (invalidTokens.length > 0) {
            for (const token of invalidTokens) {
              await db.delete(pushTokens).where(eq2(pushTokens.token, token)).catch(() => {
              });
            }
          }
        }
      } catch (err) {
        console.error("Error sending push chunk:", err);
      }
    }
  } catch (err) {
    console.error("Error in sendPushNotifications:", err);
  }
}
function registerAdminRoutes(app2) {
  const uploadsDir = path.resolve(process.cwd(), "server", "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const MIME_MAP = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml" };
  async function saveImageToDb(filename, buffer, ext) {
    const mime = MIME_MAP[ext] || "image/png";
    try {
      await db.insert(uploadedImages).values({ filename, data: buffer, mimeType: mime }).onConflictDoUpdate({ target: uploadedImages.filename, set: { data: buffer, mimeType: mime, createdAt: /* @__PURE__ */ new Date() } });
      console.log(`[ImageDB] Saved ${filename} (${buffer.length} bytes) to database`);
    } catch (err) {
      console.error(`[ImageDB] FAILED to save ${filename}: ${err.message}`);
      throw err;
    }
    return `/uploads/${filename}`;
  }
  app2.get("/uploads/:filename", async (req, res) => {
    try {
      const row = await db.select().from(uploadedImages).where(eq2(uploadedImages.filename, req.params.filename)).limit(1);
      if (row.length === 0) {
        const filePath = path.join(uploadsDir, req.params.filename);
        if (fs.existsSync(filePath)) return res.sendFile(filePath);
        return res.status(404).send("Not found");
      }
      res.setHeader("Content-Type", row[0].mimeType);
      res.setHeader("Cache-Control", "public, max-age=31536000");
      res.send(row[0].data);
    } catch {
      res.status(500).send("Error");
    }
  });
  app2.post("/api/admin/upload-image", async (req, res) => {
    try {
      const { data, filename } = req.body;
      if (!data || !filename) return res.status(400).json({ error: "Missing data or filename" });
      const ext = path.extname(filename).toLowerCase();
      const allowed = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
      if (!allowed.includes(ext)) return res.status(400).json({ error: "Unsupported file type" });
      const base64Data = data.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const savedFilename = `img-${Date.now()}${ext}`;
      const url = await saveImageToDb(savedFilename, buffer, ext);
      res.json({ url });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/admin/download-external-image", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== "string") return res.status(400).json({ error: "Missing url" });
      if (url.startsWith("/uploads/")) {
        const fname = url.split("/uploads/")[1]?.split("?")[0];
        if (fname) {
          const exists = await db.select({ filename: uploadedImages.filename }).from(uploadedImages).where(eq2(uploadedImages.filename, fname)).limit(1);
          if (exists.length > 0) return res.json({ url });
        }
      }
      const https = __require("https");
      const http = __require("http");
      const client = url.startsWith("https") ? https : http;
      const imageData = await new Promise((resolve3, reject) => {
        const request = client.get(url, { timeout: 15e3, headers: { "User-Agent": "Mozilla/5.0" } }, (response) => {
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            const redirectClient = response.headers.location.startsWith("https") ? https : http;
            redirectClient.get(response.headers.location, { timeout: 15e3, headers: { "User-Agent": "Mozilla/5.0" } }, (res2) => {
              const chunks2 = [];
              res2.on("data", (c) => chunks2.push(c));
              res2.on("end", () => resolve3(Buffer.concat(chunks2)));
              res2.on("error", reject);
            }).on("error", reject);
            return;
          }
          if (response.statusCode !== 200) return reject(new Error(`HTTP ${response.statusCode}`));
          const chunks = [];
          response.on("data", (c) => chunks.push(c));
          response.on("end", () => resolve3(Buffer.concat(chunks)));
          response.on("error", reject);
        });
        request.on("error", reject);
        request.on("timeout", () => {
          request.destroy();
          reject(new Error("Timeout"));
        });
      });
      const contentType = url.match(/\.(png|jpg|jpeg|webp|gif)/i);
      let ext = ".jpg";
      if (contentType) ext = "." + contentType[1].toLowerCase();
      if (ext === ".jpeg") ext = ".jpg";
      const savedFilename = `img-${Date.now()}${ext}`;
      const savedUrl = await saveImageToDb(savedFilename, imageData, ext);
      res.json({ url: savedUrl });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/admin/upload-logo", async (req, res) => {
    try {
      const { data, filename, mode } = req.body;
      if (!data || !filename) {
        return res.status(400).json({ error: "Missing data or filename" });
      }
      const isIcon = mode === "icon";
      const isDarkMode = mode === "dark";
      const prefix = isIcon ? "app-icon" : isDarkMode ? "logo-dark" : "logo";
      const settingKey = isIcon ? "appIconUrl" : isDarkMode ? "logoDarkUrl" : "logoUrl";
      const ext = path.extname(filename).toLowerCase();
      const allowed = [".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif", ".ai"];
      if (!allowed.includes(ext)) {
        return res.status(400).json({ error: "Unsupported file type. Allowed: PNG, JPG, SVG, WebP, GIF, AI" });
      }
      const base64Data = data.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      let savedFilename;
      let finalBuffer;
      if (ext === ".svg") {
        savedFilename = `${prefix}.png`;
        finalBuffer = await sharp(buffer).resize(800, null, { withoutEnlargement: true }).png({ quality: 90 }).toBuffer();
      } else if (ext === ".ai") {
        savedFilename = `${prefix}.png`;
        try {
          finalBuffer = await sharp(buffer).resize(800, null, { withoutEnlargement: true }).png({ quality: 90 }).toBuffer();
        } catch {
          return res.status(400).json({ error: "Could not process this AI file. Please convert it to PNG or SVG first." });
        }
      } else {
        savedFilename = `${prefix}${ext}`;
        finalBuffer = buffer;
      }
      const finalExt = ext === ".svg" || ext === ".ai" ? ".png" : ext;
      await saveImageToDb(savedFilename, finalBuffer, finalExt);
      const logoUrl = `/uploads/${savedFilename}?t=${Date.now()}`;
      await db.insert(appSettings).values({ key: settingKey, value: logoUrl, updatedAt: /* @__PURE__ */ new Date() }).onConflictDoUpdate({
        target: appSettings.key,
        set: { value: logoUrl, updatedAt: /* @__PURE__ */ new Date() }
      });
      res.json({ success: true, logoUrl });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/admin/sections", async (req, res) => {
    try {
      const sections = await db.select().from(homepageSections).orderBy(asc2(homepageSections.sortOrder));
      const sectionsWithBanners = await Promise.all(
        sections.map(async (section) => {
          const banners = await db.select().from(homepageBanners).where(sql3`${homepageBanners.sectionId} = ${section.id}`).orderBy(asc2(homepageBanners.sortOrder));
          return {
            ...section,
            banners: banners.map((b) => ({ ...b }))
          };
        })
      );
      res.json(sectionsWithBanners);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/admin/sections", async (req, res) => {
    try {
      const { type, titleAr, titleEn, sortOrder, visible, language, metadata } = req.body;
      let finalMetadata = metadata;
      if (finalMetadata && finalMetadata.imageUrl) {
        finalMetadata.imageUrl = await persistImageOnServer(finalMetadata.imageUrl);
      }
      const [section] = await db.insert(homepageSections).values({
        type,
        titleAr: titleAr || null,
        titleEn: titleEn || null,
        language: language || "both",
        sortOrder: sortOrder ?? 0,
        visible: visible ?? true,
        metadata: finalMetadata ? JSON.stringify(finalMetadata) : null
      }).returning();
      res.json(section);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.put("/api/admin/sections/reorder", async (req, res) => {
    try {
      const { order } = req.body;
      for (let i = 0; i < order.length; i++) {
        await db.update(homepageSections).set({ sortOrder: i, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(homepageSections.id, order[i]));
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.put("/api/admin/sections/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { type, titleAr, titleEn, sortOrder, visible, language, metadata } = req.body;
      let finalMetadata = metadata;
      if (finalMetadata && finalMetadata.imageUrl) {
        finalMetadata.imageUrl = await persistImageOnServer(finalMetadata.imageUrl);
      }
      const [section] = await db.update(homepageSections).set({
        type,
        titleAr: titleAr || null,
        titleEn: titleEn || null,
        language: language || "both",
        sortOrder,
        visible,
        metadata: finalMetadata !== void 0 ? finalMetadata ? JSON.stringify(finalMetadata) : null : void 0,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(sql3`${homepageSections.id} = ${id}`).returning();
      res.json(section);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/admin/sections/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(homepageBanners).where(sql3`${homepageBanners.sectionId} = ${id}`);
      await db.delete(homepageSections).where(sql3`${homepageSections.id} = ${id}`);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  async function persistImageOnServer(url) {
    if (!url || url.startsWith("/uploads/") || url.startsWith("data:")) return url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) return url;
    try {
      const https = __require("https");
      const http = __require("http");
      const client = url.startsWith("https") ? https : http;
      const imageData = await new Promise((resolve3, reject) => {
        const request = client.get(url, { timeout: 15e3, headers: { "User-Agent": "Mozilla/5.0" } }, (response) => {
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            const redirectClient = response.headers.location.startsWith("https") ? https : http;
            redirectClient.get(response.headers.location, { timeout: 15e3, headers: { "User-Agent": "Mozilla/5.0" } }, (res2) => {
              const chunks2 = [];
              res2.on("data", (c) => chunks2.push(c));
              res2.on("end", () => resolve3(Buffer.concat(chunks2)));
              res2.on("error", reject);
            }).on("error", reject);
            return;
          }
          if (response.statusCode !== 200) return reject(new Error(`HTTP ${response.statusCode}`));
          const chunks = [];
          response.on("data", (c) => chunks.push(c));
          response.on("end", () => resolve3(Buffer.concat(chunks)));
          response.on("error", reject);
        });
        request.on("error", reject);
        request.on("timeout", () => {
          request.destroy();
          reject(new Error("Timeout"));
        });
      });
      const contentMatch = url.match(/\.(png|jpg|jpeg|webp|gif)/i);
      let ext = ".jpg";
      if (contentMatch) ext = "." + contentMatch[1].toLowerCase();
      if (ext === ".jpeg") ext = ".jpg";
      const savedFilename = `img-${Date.now()}${ext}`;
      return await saveImageToDb(savedFilename, imageData, ext);
    } catch (e) {
      console.warn("persistImageOnServer failed for:", url, e.message);
      return url;
    }
  }
  app2.post("/api/admin/banners", async (req, res) => {
    try {
      const { sectionId, imageUrl, linkType, linkValue, sortOrder, visible, language } = req.body;
      const persistedUrl = await persistImageOnServer(imageUrl);
      const [banner] = await db.insert(homepageBanners).values({
        sectionId,
        imageUrl: persistedUrl,
        linkType: linkType || "collection",
        linkValue: linkValue || null,
        sortOrder: sortOrder ?? 0,
        visible: visible ?? true,
        language: language || "both"
      }).returning();
      res.json(banner);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.put("/api/admin/banners/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { imageUrl, linkType, linkValue, sortOrder, visible, language } = req.body;
      const persistedUrl = await persistImageOnServer(imageUrl);
      const [banner] = await db.update(homepageBanners).set({ imageUrl: persistedUrl, linkType, linkValue, sortOrder, visible, language: language || "both" }).where(sql3`${homepageBanners.id} = ${id}`).returning();
      res.json(banner);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/admin/banners/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(homepageBanners).where(sql3`${homepageBanners.id} = ${id}`);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/admin/settings", async (_req, res) => {
    try {
      const settings = await db.select().from(appSettings);
      const settingsMap = {};
      settings.forEach((s) => {
        settingsMap[s.key] = s.value;
      });
      res.json(settingsMap);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.put("/api/admin/settings", async (req, res) => {
    try {
      const entries = Object.entries(req.body);
      for (const [key, value] of entries) {
        await db.insert(appSettings).values({ key, value, updatedAt: /* @__PURE__ */ new Date() }).onConflictDoUpdate({
          target: appSettings.key,
          set: { value, updatedAt: /* @__PURE__ */ new Date() }
        });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/admin/notifications", async (_req, res) => {
    try {
      const all = await db.select().from(notifications).orderBy(desc2(notifications.createdAt));
      res.json(all);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/admin/notifications", async (req, res) => {
    try {
      const { titleAr, titleEn, bodyAr, bodyEn, imageUrl, linkType, linkValue } = req.body;
      if (!titleAr || !titleEn) {
        return res.status(400).json({ error: "Title AR and EN are required" });
      }
      const [created] = await db.insert(notifications).values({ titleAr, titleEn, bodyAr, bodyEn, imageUrl, linkType: linkType || "none", linkValue }).returning();
      sendPushNotifications(created).catch((err) => console.error("Push notification error:", err));
      res.json(created);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/admin/notifications/:id", async (req, res) => {
    try {
      await db.delete(notifications).where(eq2(notifications.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/admin/shopify-collections", async (_req, res) => {
    try {
      const pagedQuery = `query($first: Int!, $after: String) {
        collections(first: $first, after: $after) {
          pageInfo { hasNextPage endCursor }
          edges { node { id title handle description image { url altText } } }
        }
      }`;
      const allNodes = [];
      let hasNext = true;
      let cursor = null;
      while (hasNext) {
        const vars = { first: 250 };
        if (cursor) vars.after = cursor;
        const data = await shopifyAdminGraphQL(pagedQuery, vars);
        const edges = data.collections?.edges || [];
        edges.forEach((e) => allNodes.push(e.node));
        hasNext = data.collections?.pageInfo?.hasNextPage || false;
        cursor = data.collections?.pageInfo?.endCursor || null;
      }
      const merged = allNodes.map((c) => ({
        handle: c.handle,
        titleEn: c.title,
        titleAr: c.title,
        imageUrl: c.image?.url || null,
        descriptionEn: c.description,
        descriptionAr: c.description
      }));
      res.json(merged);
    } catch (error) {
      console.error("Error fetching Shopify collections:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/admin/search-products", async (req, res) => {
    try {
      const q = req.query.q || "";
      const activeQuery = q ? `${q} status:active` : "status:active";
      const data = await shopifyAdminGraphQL(ADMIN_QUERIES.PRODUCTS, { first: 20, query: activeQuery, sortKey: "TITLE" });
      const products = data.products.edges.map((e) => mapAdminProduct(e.node));
      const result = products.map((p) => ({
        handle: p.handle,
        titleEn: p.title,
        titleAr: p.title,
        vendor: p.vendor || "",
        imageUrl: p.images?.edges?.[0]?.node?.url || null,
        price: p.priceRange?.minVariantPrice?.amount || "0",
        compareAtPrice: p.compareAtPriceRange?.minVariantPrice?.amount || null,
        currency: p.priceRange?.minVariantPrice?.currencyCode || "JOD",
        description: p.description || "",
        descriptionAr: p.description || ""
      }));
      res.json(result);
    } catch (error) {
      console.error("Error searching products:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/admin/search-vendors", async (req, res) => {
    try {
      const q = (req.query.q || "").trim();
      if (!q || q.length < 1) return res.json([]);
      const data = await shopifyAdminGraphQL(`query { products(first: 50, query: "vendor:${q} status:active") { edges { node { vendor featuredImage { url } images(first:1){edges{node{url}}} metafield(namespace:"brand", key:"logo") { reference { ... on MediaImage { image { url } } } } } } } }`);
      const products = data.products.edges.map((e) => e.node);
      const vendorMap = /* @__PURE__ */ new Map();
      for (const p of products) {
        if (!p.vendor) continue;
        if (!vendorMap.has(p.vendor)) {
          const brandLogo = p.metafield?.reference?.image?.url || null;
          const productImg = p.images?.edges?.[0]?.node?.url || p.featuredImage?.url || null;
          vendorMap.set(p.vendor, { name: p.vendor, imageUrl: brandLogo || productImg });
        }
      }
      res.json(Array.from(vendorMap.values()));
    } catch (error) {
      console.error("Error searching vendors:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  let _collectionsCache = null;
  const COLLECTIONS_CACHE_TTL = 5 * 60 * 1e3;
  async function fetchAllAdminCollections() {
    if (_collectionsCache && Date.now() - _collectionsCache.timestamp < COLLECTIONS_CACHE_TTL) {
      return _collectionsCache.data;
    }
    async function fetchPage(_language) {
      const allNodes = [];
      let hasNext = true;
      let cursor = null;
      const query = `query($first:Int!,$after:String) {
        collections(first:$first, after:$after) {
          pageInfo { hasNextPage endCursor }
          edges { node { id handle title image { url } } }
        }
      }`;
      while (hasNext) {
        const vars = { first: 250 };
        if (cursor) vars.after = cursor;
        const data = await shopifyAdminGraphQL(query, vars);
        const edges = data.collections?.edges || [];
        edges.forEach((e) => allNodes.push(e.node));
        hasNext = data.collections?.pageInfo?.hasNextPage || false;
        cursor = data.collections?.pageInfo?.endCursor || null;
      }
      return allNodes;
    }
    const enCols = await fetchPage("en");
    console.log(`[Collections] Fetched ${enCols.length} collections from Shopify`);
    let arCols = [];
    try {
      const arQuery = `query($first:Int!,$after:String) {
        translatableResources(resourceType: COLLECTION, first: $first, after: $after) {
          pageInfo { hasNextPage endCursor }
          edges { node { resourceId translations(locale:"ar") { key value } } }
        }
      }`;
      const arTranslations = {};
      let hasNext = true;
      let cursor = null;
      while (hasNext) {
        const vars = { first: 250 };
        if (cursor) vars.after = cursor;
        try {
          const data = await shopifyAdminGraphQL(arQuery, vars);
          const edges = data.translatableResources?.edges || [];
          for (const e of edges) {
            const titleTranslation = e.node.translations?.find((t) => t.key === "title");
            if (titleTranslation) {
              const gid = e.node.resourceId;
              arTranslations[gid] = titleTranslation.value;
            }
          }
          hasNext = data.translatableResources?.pageInfo?.hasNextPage || false;
          cursor = data.translatableResources?.pageInfo?.endCursor || null;
        } catch {
          hasNext = false;
        }
      }
      arCols = enCols.map((c) => {
        const arTitle = arTranslations[c.id] || null;
        return { ...c, arTitle };
      });
    } catch {
      arCols = enCols.map((c) => ({ ...c, arTitle: null }));
    }
    const all = enCols.map((en, i) => ({
      handle: en.handle,
      titleEn: en.title,
      titleAr: arCols[i]?.arTitle || en.title,
      imageUrl: en.image?.url || null
    }));
    _collectionsCache = { data: all, timestamp: Date.now() };
    return all;
  }
  app2.get("/api/admin/search-collections", async (req, res) => {
    try {
      const q = (req.query.q || "").trim().toLowerCase();
      let all = await fetchAllAdminCollections();
      if (q) {
        all = all.filter(
          (c) => (c.titleEn || "").toLowerCase().includes(q) || (c.titleAr || "").toLowerCase().includes(q) || (c.handle || "").toLowerCase().includes(q)
        );
      }
      all.sort((a, b) => (a.titleAr || a.titleEn).localeCompare(b.titleAr || b.titleEn, "ar"));
      res.json(all);
    } catch (error) {
      console.error("Error searching collections:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/admin/search-products", async (req, res) => {
    try {
      const q = (req.query.q || "").trim();
      if (!q || q.length < 1) return res.json([]);
      const activeQuery = `${q} status:active`;
      const data = await shopifyAdminGraphQL(ADMIN_QUERIES.SEARCH_PRODUCTS, { query: activeQuery, first: 12 });
      const products = data.products.edges.map((e) => mapAdminProduct(e.node));
      const result = products.map((p) => {
        const price = p.priceRange?.minVariantPrice?.amount || "0";
        const compareAt = p.compareAtPriceRange?.minVariantPrice?.amount || null;
        return {
          handle: p.handle,
          titleEn: p.title,
          titleAr: p.title,
          imageUrl: p.images?.edges?.[0]?.node?.url || null,
          price,
          compareAtPrice: compareAt && parseFloat(compareAt) > parseFloat(price) ? compareAt : null,
          currency: p.priceRange?.minVariantPrice?.currencyCode || "JOD",
          description: p.description || "",
          descriptionAr: p.description || ""
        };
      });
      res.json(result);
    } catch (error) {
      console.error("Error searching products:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/admin/suggested-products", async (_req, res) => {
    try {
      const all = await db.select().from(suggestedProducts).orderBy(asc2(suggestedProducts.sortOrder));
      res.json(all);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/admin/suggested-products", async (req, res) => {
    try {
      const { productHandle, titleAr, titleEn, imageUrl, sortOrder, visible } = req.body;
      if (!productHandle) return res.status(400).json({ error: "productHandle is required" });
      const [item] = await db.insert(suggestedProducts).values({
        productHandle,
        titleAr: titleAr || null,
        titleEn: titleEn || null,
        imageUrl: imageUrl || null,
        sortOrder: sortOrder || 0,
        visible: visible !== false
      }).returning();
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.put("/api/admin/suggested-products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { productHandle, titleAr, titleEn, imageUrl, sortOrder, visible } = req.body;
      const [item] = await db.update(suggestedProducts).set({ productHandle, titleAr, titleEn, imageUrl, sortOrder, visible }).where(eq2(suggestedProducts.id, id)).returning();
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/admin/suggested-products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(suggestedProducts).where(eq2(suggestedProducts.id, id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/admin/categories/sync-names", async (_req, res) => {
    try {
      const collQuery = `query($first:Int!,$language:LanguageCode) @inContext(language:$language) {collections(first:$first){edges{node{handle title image{url}}}}}`;
      const [arData, enData] = await Promise.all([
        shopifyFetch(collQuery, { first: 250, language: "AR" }),
        shopifyFetch(collQuery, { first: 250, language: "EN" })
      ]);
      const arByHandle = {};
      const enByHandle = {};
      const imgByHandle = {};
      (arData.collections?.edges || []).forEach((e) => {
        arByHandle[e.node.handle] = e.node.title;
        if (e.node.image?.url) imgByHandle[e.node.handle] = e.node.image.url;
      });
      (enData.collections?.edges || []).forEach((e) => {
        enByHandle[e.node.handle] = e.node.title;
        if (e.node.image?.url && !imgByHandle[e.node.handle]) imgByHandle[e.node.handle] = e.node.image.url;
      });
      async function translateToAr(text2) {
        try {
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(text2)}`;
          const resp = await fetch(url);
          if (!resp.ok) return text2;
          const data = await resp.json();
          if (Array.isArray(data) && Array.isArray(data[0])) {
            return data[0].map((seg) => seg[0]).join("");
          }
          return text2;
        } catch {
          return text2;
        }
      }
      const allCats = await db.select().from(categories);
      let updated = 0;
      for (const cat of allCats) {
        if (!cat.collectionHandle) continue;
        const arTitle = arByHandle[cat.collectionHandle];
        const enTitle = enByHandle[cat.collectionHandle];
        const img = imgByHandle[cat.collectionHandle];
        if (!arTitle && !enTitle) continue;
        const updates = {};
        if (enTitle) updates.titleEn = enTitle;
        if (arTitle && arTitle !== enTitle) {
          updates.titleAr = arTitle;
        } else if (enTitle) {
          const translated = await translateToAr(enTitle);
          updates.titleAr = translated;
        }
        if (img && !cat.imageUrl) updates.imageUrl = img;
        if (Object.keys(updates).length > 0) {
          await db.update(categories).set(updates).where(eq2(categories.id, cat.id));
          updated++;
        }
      }
      res.json({ success: true, updated, total: allCats.length });
    } catch (error) {
      console.error("Error syncing category names:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/admin/categories", async (_req, res) => {
    try {
      const all = await db.select().from(categories).orderBy(asc2(categories.sortOrder));
      res.json(all);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.put("/api/admin/categories/reorder", async (req, res) => {
    try {
      const { order } = req.body;
      if (!order || !Array.isArray(order)) return res.status(400).json({ error: "order array required" });
      for (let i = 0; i < order.length; i++) {
        await db.update(categories).set({ sortOrder: i }).where(eq2(categories.id, order[i]));
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/admin/categories", async (req, res) => {
    try {
      const { parentId, titleAr, titleEn, imageUrl, collectionHandle, sortOrder, visible } = req.body;
      if (!titleAr || !titleEn) {
        return res.status(400).json({ error: "Title AR and EN are required" });
      }
      const [created] = await db.insert(categories).values({
        parentId: parentId || null,
        titleAr,
        titleEn,
        imageUrl: imageUrl || null,
        collectionHandle: collectionHandle || null,
        sortOrder: sortOrder || 0,
        visible: visible !== false
      }).returning();
      res.json(created);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.put("/api/admin/categories/:id", async (req, res) => {
    try {
      const { titleAr, titleEn, imageUrl, collectionHandle, sortOrder, visible, parentId } = req.body;
      const [updated] = await db.update(categories).set({
        titleAr,
        titleEn,
        imageUrl: imageUrl || null,
        collectionHandle: collectionHandle || null,
        sortOrder: sortOrder || 0,
        visible: visible !== false,
        parentId: parentId || null
      }).where(eq2(categories.id, req.params.id)).returning();
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/admin/categories/:id", async (req, res) => {
    try {
      const id = req.params.id;
      async function deleteRecursive(catId) {
        const children = await db.select().from(categories).where(eq2(categories.parentId, catId));
        for (const child of children) {
          await deleteRecursive(child.id);
        }
        await db.delete(categories).where(eq2(categories.id, catId));
      }
      await deleteRecursive(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

// server/index.ts
init_db();
init_schema();
import { eq as eq3 } from "drizzle-orm";
import * as fs2 from "fs";
import * as path2 from "path";
var app = express();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      limit: "10mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path3 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path3.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path2.resolve(process.cwd(), "app.json");
    const appJsonContent = fs2.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path2.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs2.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs2.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function configureExpoAndLanding(app2) {
  const templatePath = path2.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs2.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return res.redirect("/admin");
    }
    next();
  });
  app2.get("/favicon.png", async (_req, res) => {
    try {
      const { db: appDb } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { appSettings: appSettingsTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eqOp } = await import("drizzle-orm");
      const rows = await appDb.select().from(appSettingsTable).where(eqOp(appSettingsTable.key, "logoUrl"));
      if (rows.length && rows[0].value) {
        const logoUrl = rows[0].value.split("?")[0];
        if (logoUrl.startsWith("/uploads/")) {
          return res.redirect(logoUrl);
        }
      }
    } catch {
    }
    res.sendFile(path2.resolve(process.cwd(), "assets", "images", "favicon.png"));
  });
  app2.get("/favicon.ico", async (_req, res) => {
    try {
      const { db: appDb } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { appSettings: appSettingsTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eqOp } = await import("drizzle-orm");
      const rows = await appDb.select().from(appSettingsTable).where(eqOp(appSettingsTable.key, "logoUrl"));
      if (rows.length && rows[0].value) {
        const logoUrl = rows[0].value.split("?")[0];
        if (logoUrl.startsWith("/uploads/")) {
          return res.redirect(logoUrl);
        }
      }
    } catch {
    }
    res.sendFile(path2.resolve(process.cwd(), "assets", "images", "favicon.png"));
  });
  app2.use("/assets", express.static(path2.resolve(process.cwd(), "assets")));
  app2.use(express.static(path2.resolve(process.cwd(), "static-build"), { index: false }));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
var DEFAULT_ADMIN_USERNAME = "admin";
var DEFAULT_ADMIN_PASSWORD = "xmart2026";
async function getAdminCredentials() {
  try {
    const rows = await db.select().from(appSettings).where(eq3(appSettings.key, "admin_credentials"));
    if (rows.length > 0 && rows[0].value) {
      const creds = JSON.parse(rows[0].value);
      return { username: creds.username, passwordHash: creds.passwordHash };
    }
  } catch {
  }
  const hash = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10);
  await db.insert(appSettings).values({ key: "admin_credentials", value: JSON.stringify({ username: DEFAULT_ADMIN_USERNAME, passwordHash: hash }) }).onConflictDoUpdate({ target: appSettings.key, set: { value: JSON.stringify({ username: DEFAULT_ADMIN_USERNAME, passwordHash: hash }) } });
  return { username: DEFAULT_ADMIN_USERNAME, passwordHash: hash };
}
function requireAdminAuth(req, res, next) {
  if (req.session && req.session.adminLoggedIn) {
    return next();
  }
  if (req.originalUrl.startsWith("/api/admin")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return res.redirect("/admin/login");
}
var adminLoginPageHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xmart - \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644</title>
  <link rel="icon" type="image/png" href="/favicon.png">
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Cairo', sans-serif; background: linear-gradient(135deg, #0d1b2a 0%, #163259 50%, #1a3a6b 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .login-card { background: #fff; border-radius: 20px; padding: 40px 36px; width: 380px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; }
    .logo-container { margin-bottom: 24px; }
    .logo-container svg { width: 120px; height: auto; }
    h1 { font-size: 22px; color: #163259; margin-bottom: 8px; font-weight: 700; }
    .subtitle { font-size: 14px; color: #888; margin-bottom: 28px; }
    .form-group { margin-bottom: 18px; text-align: right; }
    .form-group label { display: block; font-size: 13px; color: #555; margin-bottom: 6px; font-weight: 600; }
    .form-group input { width: 100%; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 12px; font-size: 15px; font-family: 'Cairo', sans-serif; outline: none; transition: border-color 0.3s; direction: ltr; text-align: right; }
    .form-group input:focus { border-color: #248CCC; }
    .login-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #248CCC, #163259); color: #fff; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; font-family: 'Cairo', sans-serif; cursor: pointer; transition: opacity 0.3s; margin-top: 8px; }
    .login-btn:hover { opacity: 0.9; }
    .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .error-msg { background: #fff0f0; color: #d32f2f; padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 16px; display: none; border: 1px solid #ffd0d0; }
    .error-msg.show { display: block; }
  </style>
</head>
<body>
  <div class="login-card">
    <div class="logo-container">
      <svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
        <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="Cairo, sans-serif" font-weight="700" font-size="36" fill="#163259">X<tspan fill="#248CCC">mart</tspan></text>
      </svg>
    </div>
    <h1>\u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645</h1>
    <p class="subtitle">\u0633\u062C\u0651\u0644 \u062F\u062E\u0648\u0644\u0643 \u0644\u0644\u0645\u062A\u0627\u0628\u0639\u0629</p>
    <div id="errorMsg" class="error-msg"></div>
    <form id="loginForm">
      <div class="form-group">
        <label>\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645</label>
        <input type="text" id="username" autocomplete="username" required>
      </div>
      <div class="form-group">
        <label>\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631</label>
        <input type="password" id="password" autocomplete="current-password" required>
      </div>
      <button type="submit" class="login-btn" id="loginBtn">\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644</button>
    </form>
  </div>
  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('loginBtn');
      const errEl = document.getElementById('errorMsg');
      btn.disabled = true;
      btn.textContent = '\u062C\u0627\u0631\u064D \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644...';
      errEl.classList.remove('show');
      try {
        const res = await fetch('/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: document.getElementById('username').value,
            password: document.getElementById('password').value
          })
        });
        const data = await res.json();
        if (data.success) {
          window.location.href = '/admin';
        } else {
          errEl.textContent = data.error || '\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629';
          errEl.classList.add('show');
        }
      } catch {
        errEl.textContent = '\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u0627\u062A\u0635\u0627\u0644';
        errEl.classList.add('show');
      }
      btn.disabled = false;
      btn.textContent = '\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644';
    });
  </script>
</body>
</html>`;
(async () => {
  app.set("trust proxy", 1);
  setupCors(app);
  setupBodyParsing(app);
  app.use(session({
    secret: process.env.SESSION_SECRET || "xmart-admin-secret-key-2026",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1e3,
      sameSite: "lax"
    }
  }));
  setupRequestLogging(app);
  const adminTemplatePath = path2.resolve(process.cwd(), "server", "templates", "admin.html");
  const adminRawHtml = fs2.readFileSync(adminTemplatePath, "utf-8");
  const isDev = process.env.NODE_ENV !== "production";
  const replitDomain = isDev ? process.env.REPLIT_DEV_DOMAIN || "" : "";
  const imageBase = replitDomain ? `https://${replitDomain}:5000` : "";
  const imageBaseScript = imageBase ? `<script>window.IMAGE_BASE = '${imageBase}';</script>` : "";
  const adminPageHtml = adminRawHtml.replace("<!-- __IMAGE_BASE__ -->", imageBaseScript);
  app.get("/admin/login", (req, res) => {
    if (req.session && req.session.adminLoggedIn) {
      return res.redirect("/admin");
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(adminLoginPageHtml);
  });
  app.post("/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const creds = await getAdminCredentials();
      if (username === creds.username && bcrypt.compareSync(password, creds.passwordHash)) {
        req.session.adminLoggedIn = true;
        return res.json({ success: true });
      }
      return res.status(401).json({ success: false, error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
    } catch {
      return res.status(500).json({ success: false, error: "\u062D\u062F\u062B \u062E\u0637\u0623" });
    }
  });
  app.get("/admin/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/admin/login");
    });
  });
  app.post("/api/admin/change-password", requireAdminAuth, async (req, res) => {
    try {
      const { currentPassword, newUsername, newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 6 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644" });
      }
      const creds = await getAdminCredentials();
      if (!bcrypt.compareSync(currentPassword, creds.passwordHash)) {
        return res.status(401).json({ error: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      }
      const newHash = bcrypt.hashSync(newPassword, 10);
      const updatedUsername = newUsername?.trim() || creds.username;
      await db.update(appSettings).set({ value: JSON.stringify({ username: updatedUsername, passwordHash: newHash }) }).where(eq3(appSettings.key, "admin_credentials"));
      return res.json({ success: true });
    } catch {
      return res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623" });
    }
  });
  app.get("/icon-preview", (_req, res) => {
    const previewPath = path2.resolve(process.cwd(), "assets/images/icon-preview.html");
    res.sendFile(previewPath);
  });
  app.get("/admin", requireAdminAuth, (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.send(adminPageHtml);
  });
  app.use("/api/admin", requireAdminAuth);
  registerAdminRoutes(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();
