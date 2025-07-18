import { relations } from "drizzle-orm";
import { int } from "drizzle-orm/mysql-core";
import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  doublePrecision,
  timestamp,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Product Categories Enum
export const ProductCategory = {
  COFFEE_TEA: "Coffee & Tea",
  SPICES: "Spices",
  GRAINS: "Grains",
  OTHERS: "Others",
} as const;

export type ProductCategoryType =
  (typeof ProductCategory)[keyof typeof ProductCategory];

// Categories table for managing categories and subcategories
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  parentId: integer("parent_id"), // null for main categories, references id for subcategories
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// User Role Enum
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

// Subscription Status Enum
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "expired",
  "past_due",
]);
export const unitEnum = pgEnum("unit", ["kg", "l", "gram", "pcs"]);
// Product Schema
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  shortDescription: text("short_description").notNull(),
  description: text("description").notNull(),
  price: doublePrecision("price").notNull(),
  discountPrice: doublePrecision("discount_price"),
  category: text("category").notNull(),
  subcategory: text("subcategory"), // Optional subcategory
  sku: text("sku"),
  unit: unitEnum("unit"), // ✅ Fixed line
  quantity: doublePrecision("quantity"),
  imageUrl: text("image_url").notNull(),
  imageUrls: text("image_urls").array(),
  thumbnailUrl: text("thumbnail_url"),
  localImagePaths: text("local_image_paths").array(),
  videoUrl: text("video_url"),
  farmerId: integer("farmer_id").notNull(),
  stockQuantity: integer("stock_quantity").notNull().default(100),
  featured: boolean("featured").default(false),
  // Product Attributes
  naturallyGrown: boolean("naturally_grown").default(false),
  chemicalFree: boolean("chemical_free").default(false),
  premiumQuality: boolean("premium_quality").default(false),
  // SEO Fields
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  slug: text("slug"),
  // Social Sharing Options
  enableShareButtons: boolean("enable_share_buttons").default(true),
  enableWhatsappShare: boolean("enable_whatsapp_share").default(true),
  enableFacebookShare: boolean("enable_facebook_share").default(true),
  enableInstagramShare: boolean("enable_instagram_share").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Farmer Schema
export const farmers = pgTable("farmers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  specialty: text("specialty").notNull(),

  story: text("story").notNull(),
  location: text("location").notNull(),
  farmName: text("farm_name"),
  certificationStatus: text("certification_status").default("none"), // none, organic, certified, pending
  certificationDetails: text("certification_details"),
  farmSize: text("farm_size"),
  experienceYears: integer("experience_years"),
  website: text("website"),
  socialMedia: text("social_media"), // JSON string for social links
  bankAccount: text("bank_account"),
  panNumber: text("pan_number"),
  aadharNumber: text("aadhar_number"),
  imageUrl: text("image_url").notNull(),
  featured: boolean("featured").default(false),
  verified: boolean("verified").default(false),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFarmerSchema = createInsertSchema(farmers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Cart Schema
export const carts = pgTable("carts", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCartSchema = createInsertSchema(carts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Cart Items Schema
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  cartId: integer("cart_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
});

// Testimonials Schema
export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  rating: doublePrecision("rating").notNull(),
  imageInitials: text("image_initials").notNull(),
});

export const insertTestimonialSchema = createInsertSchema(testimonials).omit({
  id: true,
});

// Newsletter Subscription Schema
export const newsletterSubscriptions = pgTable("newsletter_subscriptions", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  agreedToTerms: boolean("agreed_to_terms").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNewsletterSubscriptionSchema = createInsertSchema(
  newsletterSubscriptions
).omit({
  id: true,
  createdAt: true,
});

// Order Schema
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: text("session_id").notNull(),
  paymentId: text("payment_id"),
  total: doublePrecision("total").notNull(),
  status: text("status").notNull().default("pending"),
  shippingAddress: text("shipping_address").notNull(),
  billingAddress: text("billing_address"),
  paymentMethod: text("payment_method").notNull().default("razorpay"),
  discountId: integer("discount_id").references(() => discounts.id),
  cancellationReason: text("cancellation_reason"),
  trackingId: text("tracking_id"),
  statusTimeline:
    jsonb("status_timeline").$type<
      { status: string; message: string; date: string; location?: string }[]
    >(),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

// Order Items Schema
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull(),
  price: doublePrecision("price").notNull(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

// Product Reviews Schema
export const productReviews = pgTable("product_reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  userId: integer("user_id").notNull(),
  orderId: integer("order_id").notNull(),
  customerName: text("customer_name").notNull(),
  rating: doublePrecision("rating").notNull(),
  reviewText: text("review_text").notNull(),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProductReviewSchema = createInsertSchema(
  productReviews
).omit({
  id: true,
  createdAt: true,
});

// Contact Messages Schema
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("unread"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertContactMessageSchema = createInsertSchema(
  contactMessages
).omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

// User Schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  mobile: text("mobile").notNull().unique(),
  role: userRoleEnum("role").notNull().default("user"),
  emailVerified: boolean("email_verified").default(false),
  mobileVerified: boolean("mobile_verified").default(false),
  codEnabled: boolean("cod_enabled").default(true),
  verificationToken: text("verification_token"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// SMS Verification Schema
export const smsVerifications = pgTable("sms_verifications", {
  id: serial("id").primaryKey(),
  mobile: text("mobile").notNull(),
  otp: text("otp").notNull(),
  purpose: text("purpose").notNull(), // 'registration' or 'password_reset'
  verified: boolean("verified").default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSmsVerificationSchema = createInsertSchema(
  smsVerifications
).omit({
  id: true,
  createdAt: true,
});

// Payment Schema
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  orderId: integer("order_id"),
  razorpayPaymentId: text("razorpay_payment_id").notNull(),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").notNull().default("INR"),
  status: text("status").notNull(),
  method: text("method"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

// Subscription Schema
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  razorpaySubscriptionId: text("razorpay_subscription_id").notNull(),
  planName: text("plan_name").notNull(),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Export types
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertFarmer = z.infer<typeof insertFarmerSchema>;
export type Farmer = typeof farmers.$inferSelect;

export type InsertProductReview = z.infer<typeof insertProductReviewSchema>;
export type ProductReview = typeof productReviews.$inferSelect;

export type InsertCart = z.infer<typeof insertCartSchema>;
export type Cart = typeof carts.$inferSelect;

export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;

export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type Testimonial = typeof testimonials.$inferSelect;

export type InsertNewsletterSubscription = z.infer<
  typeof insertNewsletterSubscriptionSchema
>;
export type NewsletterSubscription =
  typeof newsletterSubscriptions.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;

// Team Members Schema
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  jobTitle: text("job_title").notNull(),
  description: text("description").notNull(),
  profileImageUrl: text("profile_image_url").notNull(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

// Discounts/Coupons Schema
export const discountTypeEnum = pgEnum("discount_type", [
  "percentage",
  "fixed",
  "shipping",
]);
export const discountStatusEnum = pgEnum("discount_status", [
  "active",
  "scheduled",
  "expired",
  "disabled",
]);

export const discounts = pgTable("discounts", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  type: discountTypeEnum("type").notNull(),
  value: doublePrecision("value").notNull(),
  description: text("description").notNull(),
  minPurchase: doublePrecision("min_purchase").default(0),
  usageLimit: integer("usage_limit").default(0), // 0 means unlimited
  perUser: boolean("per_user").default(false),
  used: integer("used").default(0),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: discountStatusEnum("status").notNull().default("active"),
  applicableProducts: text("applicable_products").default("all"), // 'all', 'selected', or JSON array
  applicableCategories: text("applicable_categories").default("all"), // 'all' or comma-separated
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDiscountSchema = createInsertSchema(discounts)
  .omit({
    id: true,
    used: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    startDate: z.union([
      z.date(),
      z.string().transform((str) => new Date(str)),
    ]),
    endDate: z.union([z.date(), z.string().transform((str) => new Date(str))]),
  });

export type InsertDiscount = z.infer<typeof insertDiscountSchema>;
export type Discount = typeof discounts.$inferSelect;

// Discount Usage Tracking
export const discountUsage = pgTable("discount_usage", {
  id: serial("id").primaryKey(),
  // discountId: integer("discount_id")
  //   .notNull()
  //   .references(() => discounts.id),
  // abhi
  discountId: integer("discount_id").references(() => discounts.id),
  userId: integer("user_id").references(() => users.id),
  orderId: integer("order_id").references(() => orders.id),
  sessionId: text("session_id"),
  usedAt: timestamp("used_at").notNull().defaultNow(),
});

export const insertDiscountUsageSchema = createInsertSchema(discountUsage).omit(
  {
    id: true,
    usedAt: true,
  }
);

export type InsertDiscountUsage = z.infer<typeof insertDiscountUsageSchema>;
export type DiscountUsage = typeof discountUsage.$inferSelect;

// Site Settings Schema for store information and social media
export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  type: text("type").notNull().default("text"), // text, image, json
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSiteSettingSchema = createInsertSchema(siteSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertSiteSetting = z.infer<typeof insertSiteSettingSchema>;
export type SiteSetting = typeof siteSettings.$inferSelect;
// Order -> OrderItems
export const ordersRelations = relations(orders, ({ many, one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

// OrderItem -> Product
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));
// Cart with items
export interface CartWithItems extends Cart {
  items: (CartItem & { product: Product })[];
  totalItems: number;
  subtotal: number;
  shipping: number;
  discount?: {
    code: string;
    amount: number;
    type: string;
  };
  total: number;
}
