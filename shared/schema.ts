import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, customType } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() { return 'bytea'; },
  toDriver(value: Buffer): Buffer { return value; },
  fromDriver(value: Buffer): Buffer { return Buffer.from(value); },
});

export const uploadedImages = pgTable("uploaded_images", {
  filename: varchar("filename").primaryKey(),
  data: bytea("data").notNull(),
  mimeType: text("mime_type").notNull().default("image/png"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const homepageSections = pgTable("homepage_sections", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  titleAr: text("title_ar"),
  titleEn: text("title_en"),
  language: text("language").notNull().default("both"),
  sortOrder: integer("sort_order").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const homepageBanners = pgTable("homepage_banners", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sectionId: varchar("section_id").notNull(),
  imageUrl: text("image_url").notNull(),
  linkType: text("link_type").default("collection"),
  linkValue: text("link_value"),
  sortOrder: integer("sort_order").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  language: text("language").default("both"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  key: varchar("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const customerAddresses = pgTable("customer_addresses", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  productTitle: text("product_title").notNull(),
  productHandle: text("product_handle"),
  variantTitle: text("variant_title"),
  variantId: text("variant_id"),
  quantity: integer("quantity").notNull(),
  price: text("price").notNull(),
  currency: text("currency").notNull().default("JOD"),
  imageUrl: text("image_url"),
});

export const categories = pgTable("categories", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id"),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  imageUrl: text("image_url"),
  collectionHandle: text("collection_handle"),
  sortOrder: integer("sort_order").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const suggestedProducts = pgTable("suggested_products", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  productHandle: text("product_handle").notNull(),
  titleAr: text("title_ar"),
  titleEn: text("title_en"),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});


export const pushTokens = pgTable("push_tokens", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  platform: text("platform"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  bodyAr: text("body_ar"),
  bodyEn: text("body_en"),
  imageUrl: text("image_url"),
  linkType: text("link_type").default("none"),
  linkValue: text("link_value"),
  createdAt: timestamp("created_at").defaultNow(),
});
