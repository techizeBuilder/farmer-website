import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { v4 as uuidv4 } from "uuid";
import * as bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as crypto from "crypto";
import * as nodemailer from "nodemailer";
import Razorpay from "razorpay";
import { emailService } from "./emailService";
import { smsService } from "./smsService";
import {
  insertNewsletterSubscriptionSchema,
  insertUserSchema,
  insertPaymentSchema,
  insertSubscriptionSchema,
  insertProductReviewSchema,
  insertContactMessageSchema,
  insertTeamMemberSchema,
  insertDiscountSchema,
  products,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, asc } from "drizzle-orm";
import adminRouter from "./admin";
import imageRouter from "./imageRoutes";
import { exportDatabase, exportTable } from "./databaseExport";
import path from "path";
import express from "express";

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRY = "24h";

// Initialize Razorpay
let razorpay: Razorpay;

// Email configuration
let transporter: nodemailer.Transporter;

// Auth middleware - Proper JWT verification
const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };

    const user = await storage.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "Invalid user" });
    }

    console.log("Authenticated user:", {
      id: user.id,
      email: user.email,
      name: user.name,
    });

    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ message: "Authentication failed" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // API route prefix
  const apiPrefix = "/api";

  // Get session ID middleware
  const getSessionId = (req: Request, res: Response, next: Function) => {
    let sessionId = req.headers["x-session-id"] as string;

    if (!sessionId) {
      sessionId = uuidv4();
      res.setHeader("X-Session-Id", sessionId);
    }

    (req as any).sessionId = sessionId;
    next();
  };

  app.use(getSessionId);

  // Serve uploaded images statically
  app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "public/uploads")),
  );

  // Register admin routes
  app.use(`${apiPrefix}/admin`, adminRouter);

  // Register image upload routes
  app.use(`${apiPrefix}/images`, imageRouter);

  // Get all products with pagination (user-facing)
  app.get(`${apiPrefix}/products`, async (req, res) => {
    try {
      // Add cache-busting headers
      res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      });

      const allProducts = await storage.getAllProducts();
      const {
        page = "1",
        limit = "12",
        search = "",
        category = "",
        minPrice = "",
        maxPrice = "",
        sortBy = "id",
        sortOrder = "desc",
      } = req.query as Record<string, string>;

      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);

      // Apply filters
      let filteredProducts = allProducts.filter((product) => {
        // Search filter
        if (search) {
          const searchTerm = search.toLowerCase();
          const matchesSearch =
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm) ||
            product.shortDescription.toLowerCase().includes(searchTerm);
          if (!matchesSearch) return false;
        }

        // Category filter
        if (category && category !== "all") {
          if (product.category !== category) return false;
        }

        // Price filters
        if (minPrice) {
          const min = parseFloat(minPrice);
          if (!isNaN(min) && product.price < min) return false;
        }

        if (maxPrice) {
          const max = parseFloat(maxPrice);
          if (!isNaN(max) && product.price > max) return false;
        }

        return true;
      });

      // Apply sorting
      filteredProducts.sort((a, b) => {
        let comparison = 0;

        if (sortBy === "price") {
          comparison = a.price - b.price;
        } else if (sortBy === "name") {
          comparison = a.name.localeCompare(b.name);
        } else {
          comparison = a.id - b.id;
        }

        return sortOrder === "asc" ? comparison : -comparison;
      });

      // Calculate pagination
      const total = filteredProducts.length;
      const totalPages = Math.ceil(total / limitNumber);
      const offset = (pageNumber - 1) * limitNumber;
      const paginatedProducts = filteredProducts.slice(
        offset,
        offset + limitNumber,
      );

      res.json({
        products: paginatedProducts,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          totalPages,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Get featured products
  app.get(`${apiPrefix}/products/featured`, async (req, res) => {
    try {
      const products = await storage.getFeaturedProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch featured products" });
    }
  });

  // Get products by category
  app.get(`${apiPrefix}/products/category/:category`, async (req, res) => {
    try {
      const { category } = req.params;
      const products = await storage.getProductsByCategory(category);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products by category" });
    }
  });

  // Get product by ID
  app.get(`${apiPrefix}/products/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const product = await storage.getProductById(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Get all farmers
  app.get(`${apiPrefix}/farmers`, async (req, res) => {
    try {
      const farmers = await storage.getAllFarmers();
      res.json(farmers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch farmers" });
    }
  });

  // Get featured farmers
  app.get(`${apiPrefix}/farmers/featured`, async (req, res) => {
    try {
      const farmers = await storage.getFeaturedFarmers();
      res.json(farmers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch featured farmers" });
    }
  });

  // Get farmer by ID
  app.get(`${apiPrefix}/farmers/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid farmer ID" });
      }

      const farmer = await storage.getFarmerById(id);
      if (!farmer) {
        return res.status(404).json({ message: "Farmer not found" });
      }

      res.json(farmer);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch farmer" });
    }
  });

  // Categories and Subcategories API
  app.get(`${apiPrefix}/categories`, async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.get(`${apiPrefix}/categories/main`, async (req, res) => {
    try {
      const mainCategories = await storage.getMainCategories();
      res.json(mainCategories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch main categories" });
    }
  });

  app.get(
    `${apiPrefix}/categories/:parentId/subcategories`,
    async (req, res) => {
      try {
        const parentId = parseInt(req.params.parentId);
        if (isNaN(parentId)) {
          return res
            .status(400)
            .json({ message: "Invalid parent category ID" });
        }

        const subcategories = await storage.getSubcategoriesByParent(parentId);
        res.json(subcategories);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch subcategories" });
      }
    },
  );

  app.get(`${apiPrefix}/categories/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      const category = await storage.getCategoryById(id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  // Product reviews endpoints
  app.get(`${apiPrefix}/products/:id/reviews`, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const reviews = await storage.getProductReviews(productId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product reviews" });
    }
  });

  app.post(`${apiPrefix}/products/:id/reviews`, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const reviewData = {
        ...req.body,
        productId,
      };

      const newReview = await storage.addProductReview(reviewData);
      res.status(201).json(newReview);
    } catch (error) {
      res.status(500).json({ message: "Failed to add product review" });
    }
  });

  // Get cart
  app.get(`${apiPrefix}/cart`, async (req, res) => {
    try {
      const sessionId = (req as any).sessionId;
      const cart = await storage.getCart(sessionId);
      res.json(cart);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cart" });
    }
  });

  // Add item to cart
  app.post(`${apiPrefix}/cart/items`, async (req, res) => {
    try {
      const { productId, quantity } = req.body;
      const sessionId = (req as any).sessionId;

      if (
        typeof productId !== "number" ||
        typeof quantity !== "number" ||
        quantity <= 0
      ) {
        return res
          .status(400)
          .json({ message: "Invalid product ID or quantity" });
      }

      const cart = await storage.addToCart(sessionId, productId, quantity);
      res.json(cart);
    } catch (error) {
      res.status(500).json({ message: "Failed to add item to cart" });
    }
  });

  // Update cart item
  app.put(`${apiPrefix}/cart/items/:productId`, async (req, res) => {
    try {
      const productId = parseInt(req.params.productId);
      const { quantity } = req.body;
      const sessionId = (req as any).sessionId;

      if (isNaN(productId) || typeof quantity !== "number") {
        return res
          .status(400)
          .json({ message: "Invalid product ID or quantity" });
      }

      const cart = await storage.updateCartItem(sessionId, productId, quantity);
      res.json(cart);
    } catch (error) {
      res.status(500).json({ message: "Failed to update cart item" });
    }
  });

  // Remove item from cart
  app.delete(`${apiPrefix}/cart/items/:productId`, async (req, res) => {
    try {
      const productId = parseInt(req.params.productId);
      const sessionId = (req as any).sessionId;

      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const cart = await storage.removeFromCart(sessionId, productId);
      res.json(cart);
    } catch (error) {
      res.status(500).json({ message: "Failed to remove item from cart" });
    }
  });

  // Clear entire cart
  app.delete(`${apiPrefix}/cart`, async (req, res) => {
    try {
      const sessionId = (req as any).sessionId;

      await storage.clearCart(sessionId);
      res.json({ message: "Cart cleared successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear cart" });
    }
  });

  // Get testimonials
  app.get(`${apiPrefix}/testimonials`, async (req, res) => {
    try {
      const testimonials = await storage.getAllTestimonials();
      res.json(testimonials);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch testimonials" });
    }
  });

  // Subscribe to newsletter
  app.post(`${apiPrefix}/newsletter/subscribe`, async (req, res) => {
    try {
      const subscriptionData = insertNewsletterSubscriptionSchema.parse(
        req.body,
      );
      const subscription =
        await storage.addNewsletterSubscription(subscriptionData);
      res.json({ message: "Subscription successful", subscription });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to subscribe to newsletter" });
      }
    }
  });

  // SMS Verification Routes

  // Send OTP for registration
  app.post(`${apiPrefix}/auth/send-otp`, async (req, res) => {
    try {
      const { mobile, purpose } = req.body;
console.log("nisdhi",mobile,purpose)
      if (!mobile || !purpose) {
        return res
          .status(400)
          .json({ message: "Mobile number and purpose are required" });
      }

      if (purpose !== "registration" && purpose !== "password_reset") {
        return res.status(400).json({ message: "Invalid purpose" });
      }

      const result = await smsService.sendOTP(mobile, purpose);

      if (result.success) {
        res.json({ message: result.message });
      } else {
        res.status(400).json({ message: result.message });
      }
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  // Verify OTP
  app.post(`${apiPrefix}/auth/verify-otp`, async (req, res) => {
    try {
      const { mobile, otp, purpose } = req.body;

      if (!mobile || !otp || !purpose) {
        return res
          .status(400)
          .json({ message: "Mobile number, OTP, and purpose are required" });
      }

      if (purpose !== "registration" && purpose !== "password_reset") {
        return res.status(400).json({ message: "Invalid purpose" });
      }

      const result = await smsService.verifyOTP(mobile, otp, purpose);

      if (result.success) {
        res.json({ message: result.message, verified: true });
      } else {
        res.status(400).json({ message: result.message, verified: false });
      }
    } catch (error) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ message: "Failed to verify OTP" });
    }
  });

  // User Authentication Routes

  // Register a new user (with mobile verification)
  app.post(`${apiPrefix}/auth/register`, async (req, res) => {
    try {
      // Validate user data
      const userData = insertUserSchema.parse(req.body);
      const { mobile, otp } = req.body;

      if (!mobile || !otp) {
        return res
          .status(400)
          .json({ message: "Mobile number and OTP are required" });
      }

      // Verify OTP first
      const otpResult = await smsService.verifyOTP(mobile, otp, "registration");
      if (!otpResult.success) {
        return res.status(400).json({ message: otpResult.message });
      }

      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Create user with hashed password and mark mobile as verified
      const user = await storage.createUser({
        ...userData,
        mobile,
        password: hashedPassword,
        emailVerified: true,
        mobileVerified: true,
      });

      // Return success message without exposing password
      const { password, ...userWithoutPassword } = user;
      res.status(201).json({
        message: "Registration successful. You can now log in.",
        user: userWithoutPassword,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to register user" });
      }
    }
  });

  // Verify email
  app.get(`${apiPrefix}/auth/verify/:token`, async (req, res) => {
    try {
      const { token } = req.params;
      const success = await storage.verifyUserEmail(token);

      if (success) {
        res.json({ message: "Email verified successfully" });
      } else {
        res
          .status(400)
          .json({ message: "Invalid or expired verification token" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  // Login
  app.post(`${apiPrefix}/auth/login`, async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log(`Login attempt for email: ${email}`);

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log("User not found in database");
        return res.status(400).json({ message: "Invalid email or password" });
      }

      console.log("User found, verifying password");

      try {
        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          console.log("Password verification failed");
          return res.status(400).json({ message: "Invalid email or password" });
        }

        console.log("Password verified, generating token");

        // Generate JWT token
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
          expiresIn: JWT_EXPIRY,
        });

        // Return token and user data without password
        const { password: _, ...userWithoutPassword } = user;
        console.log("Login successful");

        return res.json({
          message: "Login successful",
          token,
          user: userWithoutPassword,
        });
      } catch (pwError) {
        console.error("Error during password verification:", pwError);
        return res
          .status(400)
          .json({ message: "Password verification failed" });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Request password reset
  app.post(`${apiPrefix}/auth/reset-request`, async (req, res) => {
    try {
      const { email } = req.body;
      const success = await storage.resetPasswordRequest(email);

      if (success && transporter) {
        const user = await storage.getUserByEmail(email);
        const resetUrl = `${req.protocol}://${req.get("host")}/reset-password/${user?.resetToken}`;

        await transporter.sendMail({
          from: "noreply@yourstore.com",
          to: email,
          subject: "Reset Your Password",
          html: `<p>Please click <a href="${resetUrl}">here</a> to reset your password.</p>`,
        });
      }

      // Always return success to prevent email enumeration
      res.json({
        message:
          "If your email is registered, you will receive a password reset link",
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to process password reset request" });
    }
  });

  // Reset password
  app.post(`${apiPrefix}/auth/reset-password/:token`, async (req, res) => {
    try {
      const { token } = req.params;
      const { newPassword } = req.body;

      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      const success = await storage.resetPassword(token, hashedPassword);

      if (success) {
        res.json({ message: "Password reset successful" });
      } else {
        res.status(400).json({ message: "Invalid or expired reset token" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // User Profile Routes (protected)

  // Get user profile
  app.get(`${apiPrefix}/user/profile`, authenticate, async (req, res) => {
    try {
      const user = (req as any).user;
      const { password, ...userWithoutPassword } = user;

      res.json({ user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Update user profile
  app.put(`${apiPrefix}/user/profile`, authenticate, async (req, res) => {
    try {
      const user = (req as any).user;
      const { name } = req.body;

      const updatedUser = await storage.updateUser(user.id, { name });
      const { password, ...userWithoutPassword } = updatedUser;

      res.json({
        message: "Profile updated successfully",
        user: userWithoutPassword,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Change password with OTP verification
  app.post(
    `${apiPrefix}/auth/change-password`,
    authenticate,
    async (req, res) => {
      try {
        const user = (req as any).user;
        const { currentPassword, newPassword, otp } = req.body;

        if (!currentPassword || !newPassword || !otp) {
          return res
            .status(400)
            .json({
              message: "Current password, new password, and OTP are required",
            });
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(
          currentPassword,
          user.password,
        );
        if (!isCurrentPasswordValid) {
          return res
            .status(400)
            .json({ message: "Current password is incorrect" });
        }

        // Verify OTP
        const otpResult = await smsService.verifyOTP(
          user.mobile,
          otp,
          "password_reset",
        );
        if (!otpResult.success) {
          return res.status(400).json({ message: otpResult.message });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password in database
        await storage.updateUser(user.id, { password: hashedPassword });

        res.json({ message: "Password changed successfully" });
      } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ message: "Failed to change password" });
      }
    },
  );

  // Check user's COD access status
  app.get(`${apiPrefix}/user/cod-access`, authenticate, async (req, res) => {
    try {
      const user = (req as any).user;

      // Check if user has COD access enabled (default to true if not set)
      const codEnabled = user.codEnabled !== false;

      res.json({
        codEnabled,
        message: codEnabled
          ? "COD access is enabled"
          : "COD access is disabled",
      });
    } catch (error) {
      console.error("COD access check error:", error);
      res.status(500).json({ message: "Failed to check COD access" });
    }
  });

  // Payment Routes

  // Initialize Razorpay
  app.post(
    `${apiPrefix}/payments/initialize`,
    authenticate,
    async (req, res) => {
      try {
        // Check if Razorpay is initialized
        if (!razorpay) {
          // Initialize Razorpay with API keys
          const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
          const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

          if (!razorpayKeyId || !razorpayKeySecret) {
            return res
              .status(500)
              .json({ message: "Razorpay API keys not configured" });
          }

          try {
            razorpay = new Razorpay({
              key_id: razorpayKeyId,
              key_secret: razorpayKeySecret,
            });
            console.log("Razorpay initialized successfully for payment");
          } catch (initError) {
            console.error("Failed to initialize Razorpay instance:", initError);
            return res
              .status(500)
              .json({
                message: "Failed to initialize payment gateway",
                error: String(initError),
              });
          }
        }

        const user = (req as any).user;
        const { amount, currency = "INR" } = req.body;

        if (!amount || isNaN(amount) || amount <= 0) {
          return res
            .status(400)
            .json({
              message: "Invalid amount specified",
              error: "Amount must be a positive number",
            });
        }

        // Create Razorpay order
        const options = {
          amount: Math.round(amount * 100), // Razorpay expects amount in smallest currency unit (paise)
          currency,
          receipt: `receipt_order_${Date.now()}`,
          payment_capture: 1,
        };

        console.log("Creating Razorpay order with options:", options);

        try {
          const order = await razorpay.orders.create(options);
          console.log("Razorpay order created:", order);

          res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
          });
        } catch (orderError) {
          console.error("Failed to create Razorpay order:", orderError);
          return res
            .status(500)
            .json({
              message: "Failed to create payment order",
              error: String(orderError),
            });
        }
      } catch (error) {
        console.error("Payment initialization error:", error);
        res
          .status(500)
          .json({
            message: "Failed to initialize payment",
            error: error instanceof Error ? error.message : String(error),
          });
      }
    },
  );

  // Verify payment and create order
  app.post(`${apiPrefix}/payments/verify`, authenticate, async (req, res) => {
    try {
      const user = (req as any).user;
      const sessionId = (req as any).sessionId;
      const {
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature,
        amount,
        currency = "INR",
        shippingAddress,
      } = req.body;

      console.log("Payment verification request:", {
        userId: user.id,
        sessionId,
        razorpayPaymentId,
        razorpayOrderId,
        amount,
        currency,
      });

      // Validate required fields
      if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
        return res
          .status(400)
          .json({ message: "Missing required payment fields" });
      }

      // Verify the payment signature
      const body = razorpayOrderId + "|" + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
        .update(body)
        .digest("hex");

      if (expectedSignature !== razorpaySignature) {
        console.error("Payment signature verification failed:", {
          expected: expectedSignature,
          received: razorpaySignature,
        });
        return res.status(400).json({ message: "Invalid payment signature" });
      }

      console.log("Payment signature verified successfully");

      // Get the current cart
      const cart = await storage.getCart(sessionId);

      if (!cart.items || cart.items.length === 0) {
        return res
          .status(400)
          .json({ message: "No items in cart to create order" });
      }

      // Validate stock availability for all items before creating order
      const stockValidationPromises = cart.items.map(async (item) => {
        const isAvailable = await storage.validateStockAvailability(
          item.product.id,
          item.quantity
        );
        if (!isAvailable) {
          const product = await storage.getProductById(item.product.id);
          throw new Error(
            `Insufficient stock for ${item.product.name}. Available: ${
              product?.stockQuantity || 0
            }, Requested: ${item.quantity}`
          );
        }
        return true;
      });

      try {
        await Promise.all(stockValidationPromises);
      } catch (stockError) {
        return res.status(400).json({
          message:
            stockError instanceof Error
              ? stockError.message
              : "Stock validation failed",
        });
      }

      console.log("Starting order creation process...");
      // Create the order
      console.log("Creating order with data:", {
        userId: user.id,
        sessionId,
        paymentId: razorpayPaymentId,
        total: amount / 100,
        status: "confirmed",
        shippingAddress: shippingAddress || "No address provided",
        paymentMethod: "razorpay",
      });

      const generateRandomId = () => {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const numbers = "0123456789";

        let result = "";
        for (let i = 0; i < 3; i++) {
          result += letters.charAt(Math.floor(Math.random() * letters.length));
        }

        for (let i = 0; i < 3; i++) {
          result += numbers.charAt(Math.floor(Math.random() * numbers.length));
        }

        return result;
      };

      const randomId = generateRandomId();
      const order = await storage.createOrder({
        userId: user.id,
        sessionId,
        paymentId: razorpayPaymentId,
        total: amount / 100,
        status: "confirmed",
        shippingAddress: shippingAddress || "No address provided",
        paymentMethod: "razorpay",
        trackingId: randomId,
      });

      console.log("Order created successfully:", order);

      // Create order items with automatic stock deduction
      console.log("Creating order items for", cart.items.length, "items");
      for (const item of cart.items) {
        console.log("Processing order item:", {
          orderId: order.id,
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
        });

        await storage.createOrderItem({
          orderId: order.id,
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
        });
      }

      console.log("All order items created successfully");

      // Record the payment with order reference
      console.log("Recording payment with order reference");
      const payment = await storage.createPayment({
        userId: user.id,
        orderId: order.id,
        razorpayPaymentId,
        amount: amount / 100,
        currency,
        status: "completed",
      });

      console.log("Payment recorded successfully:", payment);

      // Send order notification email to admin
      try {
        const orderItems = await storage.getOrderItemsByOrderId(order.id);
        const orderItemsWithProducts = await Promise.all(
          orderItems.map(async (item) => {
            const product = await storage.getProductById(item.productId);
            return {
              ...item,
              product: product,
            };
          })
        );

        // Debug: Log actual user data being sent in email
        console.log("Sending email with user data:", {
          userId: user.id,
          customerEmail: user.email,
          customerName: user.name,
          orderId: order.id,
        });

        await emailService.sendOrderNotificationToAdmin({
          order,
          orderItems: orderItemsWithProducts,
          customerEmail: user.email,
          customerName: user.name || "Customer",
          totalAmount: amount / 100,
        });

        console.log("Order notification email sent to admin successfully");
      } catch (emailError) {
        console.error("Failed to send order notification email:", emailError);
        // Don't fail the order creation if email fails
      }

      // Clear the cart after successful order creation
      console.log("Clearing cart for sessionId:", sessionId);
      await storage.clearCart(sessionId);
      console.log("Cart cleared successfully");

      res.json({
        message: "Payment successful and order created",
        payment,
        order,
      });
    } catch (error) {
      console.error("Payment verification error:", error);

      // Provide detailed error information for debugging
      let errorMessage = "Payment verification failed";
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error("Detailed error:", {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      }

      res.status(500).json({
        message: errorMessage,
        details:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  // Password Reset Routes

  // Forgot password - Send reset email
  app.post(`${apiPrefix}/auth/forgot-password`, async (req, res) => {
    try {
      const { email,number } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      if (!number || typeof number !== 'string' || number.length < 10) {
        return res.status(400).json({ message: "Valid number is required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email,number);
      if (!user) {
        // Don't reveal if email exists for security
        return res.json({
          message:
            "If your email is registered, you will receive a password reset link shortly.",
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Save reset token to user
      await storage.updateUserResetToken(user.id, resetToken, resetTokenExpiry);

      // Send reset email
      await emailService.sendPasswordResetEmail(user, resetToken);

      res.json({
        message:
          "If your email is registered, you will receive a password reset link shortly.",
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res
        .status(500)
        .json({ message: "Failed to process password reset request" });
    }
  });

  // Reset password with token
  app.post(`${apiPrefix}/auth/reset-password`, async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res
          .status(400)
          .json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters long" });
      }

      // Find user with valid reset token
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res
          .status(400)
          .json({ message: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (!user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
        return res.status(400).json({ message: "Reset token has expired" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password and clear reset token
      await storage.updateUserPassword(user.id, hashedPassword);
      await storage.clearUserResetToken(user.id);

      // Send confirmation email
      try {
        await emailService.sendPasswordResetConfirmation(user);
      } catch (emailError) {
        console.error(
          "Failed to send password reset confirmation email:",
          emailError,
        );
        // Don't fail the password reset if email fails
      }

      res.json({ message: "Password successfully reset" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Get payment history
  app.get(`${apiPrefix}/payments/history`, authenticate, async (req, res) => {
    try {
      const user = (req as any).user;
      const payments = await storage.getPaymentsByUserId(user.id);

      res.json({ payments });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment history" });
    }
  });

  // Subscription Routes

  // Create subscription
  app.post(
    `${apiPrefix}/subscriptions/create`,
    authenticate,
    async (req, res) => {
      try {
        // Check if Razorpay is initialized
        if (!razorpay) {
          // Initialize Razorpay with API keys
          const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
          const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

          if (!razorpayKeyId || !razorpayKeySecret) {
            return res
              .status(500)
              .json({ message: "Razorpay API keys not configured" });
          }

          razorpay = new Razorpay({
            key_id: razorpayKeyId,
            key_secret: razorpayKeySecret,
          });
        }

        const user = (req as any).user;
        const { planId, planName, intervalInMonths = 1 } = req.body;

        // Create Razorpay subscription
        const subscription = await razorpay.subscriptions.create({
          plan_id: planId,
          customer_notify: 1,
          total_count: 12, // 12 billing cycles
          quantity: 1,
        });

        // Calculate end date based on interval
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + intervalInMonths * 12); // 12 billing cycles

        // Record subscription in our database
        const createdSubscription = await storage.createSubscription({
          userId: user.id,
          razorpaySubscriptionId: subscription.id,
          planName,
          status: "active",
          startDate,
          endDate,
        });

        res.json({
          message: "Subscription created successfully",
          subscription: createdSubscription,
          razorpaySubscription: subscription,
        });
      } catch (error) {
        res.status(500).json({ message: "Failed to create subscription" });
      }
    },
  );

  // Get user subscriptions
  app.get(`${apiPrefix}/subscriptions`, authenticate, async (req, res) => {
    try {
      const user = (req as any).user;
      const subscriptions = await storage.getSubscriptionsByUserId(user.id);

      res.json({ subscriptions });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  // Get all user orders with complete details
  app.get(`${apiPrefix}/orders/history`, authenticate, async (req, res) => {
    try {
      const user = (req as any).user;
      console.log("Fetching orders for user ID:", user.id);
      const orders = await storage.getOrdersByUserId(user.id);
      console.log("Retrieved orders:", orders.length, "for user", user.id);

      // Fetch comprehensive order details for each order
      const ordersWithDetails = await Promise.all(
        orders.map(async (order) => {
          // Get order items with product details
          const orderItems = await storage.getOrderItemsByOrderId(order.id);
          const itemsWithProducts = await Promise.all(
            orderItems.map(async (item) => {
              const product = await storage.getProductById(item.productId);
              return {
                ...item,
                product: product
                  ? {
                      id: product.id,
                      name: product.name,
                      sku: product.sku,
                      imageUrl: product.imageUrl,
                      category: product.category,
                    }
                  : null,
              };
            }),
          );

          // Get payment details
          let payment = null;
          try {
            const payments = await storage.getPaymentsByUserId(user.id);
            payment = payments.find((p) => p.orderId === order.id);
          } catch (error) {
            console.log("Payment details not found for order:", order.id);
          }

          // Get applied discounts
          let appliedDiscounts = [];
          try {
            if (order.discountId) {
              const discount = await storage.getDiscountById(order.discountId);
              if (discount) {
                appliedDiscounts.push({
                  id: discount.id,
                  code: discount.code,
                  type: discount.type,
                  value: discount.value,
                  description: discount.description,
                });
              }
            }
          } catch (error) {
            console.log("Discount details not found for order:", order.id);
          }

          return {
            ...order,
            items: itemsWithProducts,
            payment: payment
              ? {
                  id: payment.id,
                  amount: payment.amount,
                  status: payment.status,
                  method: payment.razorpayPaymentId ? "Razorpay" : "Unknown",
                  razorpayPaymentId: payment.razorpayPaymentId,
                }
              : null,
            appliedDiscounts,
            shippingAddress: order.shippingAddress || "Default address",
            billingAddress:
              order.billingAddress ||
              order.shippingAddress ||
              "Default address",
          };
        }),
      );

      res.json({ orders: ordersWithDetails });
    } catch (error) {
      console.error("Order history fetch error:", error);
      res.status(500).json({ message: "Failed to fetch order history" });
    }
  });

  // Get cancelled orders
  app.get(`${apiPrefix}/orders/cancelled`, authenticate, async (req, res) => {
    try {
      const user = (req as any).user;
      // Sample data for demonstration purposes
      const cancelledOrders = [
        {
          id: 1003,
          userId: user.id,
          createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 21 days ago
          total: 45.95,
          status: "cancelled",
          cancellationReason: "Changed my mind",
          items: [
            { productName: "Handcrafted Cheese", quantity: 1, price: 45.95 },
          ],
        },
        {
          id: 1005,
          userId: user.id,
          createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
          total: 95.8,
          status: "cancelled",
          cancellationReason: "Found a better deal elsewhere",
          items: [
            { productName: "Organic Spice Mix", quantity: 2, price: 30.01 },
            { productName: "Fresh Valley Honey", quantity: 1, price: 35.78 },
          ],
        },
      ];

      res.json({ orders: cancelledOrders });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cancelled orders" });
    }
  });

  // Get delivered orders
  app.get(`${apiPrefix}/orders/delivered`, authenticate, async (req, res) => {
    try {
      const user = (req as any).user;

      // Get delivered orders from database
      const deliveredOrders = await storage.getOrdersByUserId(user.id);
      const filteredDeliveredOrders = deliveredOrders.filter(
        (order) => order.status === "delivered",
      );

      // Fetch order items for each delivered order with rating status
      const ordersWithItems = await Promise.all(
        filteredDeliveredOrders.map(async (order) => {
          const items = await storage.getOrderItemsByOrderId(order.id);

          // Check if user has already rated each product in this order
          const itemsWithRatingStatus = await Promise.all(
            items.map(async (item) => {
              const canRate = await storage.canUserReviewProduct(
                user.id,
                item.productId,
              );
              const hasRated = !canRate; // If can't rate, means already rated
              return {
                ...item,
                canRate,
                hasRated,
              };
            }),
          );

          return {
            ...order,
            items: itemsWithRatingStatus,
          };
        }),
      );

      res.json({ orders: ordersWithItems });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch delivered orders" });
    }
  });

  // Submit product rating for delivered order
  app.post(
    `${apiPrefix}/orders/:orderId/rate-product`,
    authenticate,
    async (req, res) => {
      try {
        const user = (req as any).user;
        const { orderId } = req.params;
        const { productId, rating, reviewText } = req.body;

        // Validate input
        if (!productId || !rating || rating < 1 || rating > 5) {
          return res
            .status(400)
            .json({ message: "Invalid product ID or rating" });
        }

        // Check if order exists and belongs to user
        const order = await storage.getOrderById(parseInt(orderId));
        if (!order || order.userId !== user.id) {
          return res.status(404).json({ message: "Order not found" });
        }

        // Check if order is delivered
        if (order.status !== "delivered") {
          return res
            .status(400)
            .json({ message: "Can only rate products from delivered orders" });
        }

        // Check if user can rate this product (hasn't rated it before)
        const canRate = await storage.canUserReviewProduct(user.id, productId);
        if (!canRate) {
          return res
            .status(400)
            .json({ message: "You have already rated this product" });
        }

        // Create the review
        const review = await storage.addProductReview({
          productId,
          userId: user.id,
          orderId: parseInt(orderId),
          customerName: user.name,
          rating,
          reviewText: reviewText || "",
          verified: true, // Mark as verified since it's from a delivered order
        });

        res.json({ message: "Rating submitted successfully", review });
      } catch (error) {
        console.error("Rating submission error:", error);
        res.status(500).json({ message: "Failed to submit rating" });
      }
    },
  );

  // Cancel subscription
  app.post(
    `${apiPrefix}/subscriptions/:id/cancel`,
    authenticate,
    async (req, res) => {
      try {
        const user = (req as any).user;
        const subscriptionId = parseInt(req.params.id);

        // Verify ownership
        const subscription = await storage.getSubscriptionById(subscriptionId);
        if (!subscription || subscription.userId !== user.id) {
          return res
            .status(403)
            .json({ message: "Unauthorized access to subscription" });
        }

        // Cancel in Razorpay
        if (razorpay) {
          await razorpay.subscriptions.cancel(
            subscription.razorpaySubscriptionId,
          );
        }

        // Update status in our database
        const updatedSubscription = await storage.updateSubscriptionStatus(
          subscriptionId,
          "canceled",
        );

        res.json({
          message: "Subscription canceled successfully",
          subscription: updatedSubscription,
        });
      } catch (error) {
        res.status(500).json({ message: "Failed to cancel subscription" });
      }
    },
  );

  // Product Review System for Delivered Orders
  // Get product reviews
  app.get(`${apiPrefix}/products/:id/reviews`, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const reviews = await storage.getProductReviews(productId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product reviews" });
    }
  });

  // Check if user can review a product (has purchased and received it)
  app.get(
    `${apiPrefix}/products/:id/can-review`,
    authenticate,
    async (req, res) => {
      try {
        const productId = parseInt(req.params.id);
        const userId = (req as any).user.id;

        const canReview = await storage.canUserReviewProduct(userId, productId);
        res.json(canReview);
      } catch (error) {
        res.status(500).json({ message: "Failed to check review eligibility" });
      }
    },
  );

  // Add product review
  app.post(`${apiPrefix}/products/:id/reviews`, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const reviewData = req.body;

      // Validate the review data
      const validatedData = insertProductReviewSchema.parse({
        ...reviewData,
        productId,
      });

      const newReview = await storage.addProductReview(validatedData);
      res.status(201).json(newReview);
    } catch (error) {
      res.status(500).json({ message: "Failed to add product review" });
    }
  });

  // Contact Form Handling
  // Submit contact form
  app.post(`${apiPrefix}/contact`, async (req, res) => {
    try {
      const contactData = req.body;

      // Validate the contact form data
      const validatedData = insertContactMessageSchema.parse(contactData);

      const newContactMessage = await storage.addContactMessage(validatedData);
      res.status(201).json({
        message: "Contact message submitted successfully",
        id: newContactMessage.id,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to submit contact message" });
    }
  });

  // Team Members API Routes
  // Get all team members (public endpoint)
  app.get(`${apiPrefix}/team-members`, async (req, res) => {
    try {
      const teamMembers = await storage.getActiveTeamMembers();
      res.json(teamMembers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // Admin routes for team member management
  app.get(`${apiPrefix}/admin/team-members`, async (req, res) => {
    try {
      const teamMembers = await storage.getAllTeamMembers();
      res.json(teamMembers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.get(`${apiPrefix}/admin/team-members/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const teamMember = await storage.getTeamMemberById(id);

      if (!teamMember) {
        return res.status(404).json({ message: "Team member not found" });
      }

      res.json(teamMember);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team member" });
    }
  });

  app.post(`${apiPrefix}/admin/team-members`, async (req, res) => {
    try {
      const teamMemberData = req.body;

      // Validate the team member data
      const validatedData = insertTeamMemberSchema.parse(teamMemberData);

      const newTeamMember = await storage.createTeamMember(validatedData);
      res.status(201).json(newTeamMember);
    } catch (error) {
      res.status(500).json({ message: "Failed to create team member" });
    }
  });

  app.put(`${apiPrefix}/admin/team-members/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const teamMemberData = req.body;

      // Validate the team member data
      const validatedData = insertTeamMemberSchema
        .partial()
        .parse(teamMemberData);

      const updatedTeamMember = await storage.updateTeamMember(
        id,
        validatedData,
      );
      res.json(updatedTeamMember);
    } catch (error) {
      res.status(500).json({ message: "Failed to update team member" });
    }
  });

  app.delete(`${apiPrefix}/admin/team-members/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTeamMember(id);
      res.json({ message: "Team member deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete team member" });
    }
  });

  // Inventory Management API Endpoints

  // Update product stock quantity (Enhanced Products & Inventory sync)
  app.put(`${apiPrefix}/admin/products/:id/stock`, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const { stockQuantity } = req.body;

      if (typeof stockQuantity !== "number" || stockQuantity < 0) {
        return res.status(400).json({ message: "Invalid stock quantity" });
      }

      const updatedProduct = await storage.updateProductStock(
        productId,
        stockQuantity,
      );
      res.json({
        message: "Stock updated successfully",
        product: updatedProduct,
      });
    } catch (error) {
      console.error("Stock update error:", error);
      res.status(500).json({ message: "Failed to update stock" });
    }
  });

  // Validate stock availability before order placement
  app.post(`${apiPrefix}/admin/validate-stock`, async (req, res) => {
    try {
      const { productId, quantity } = req.body;

      if (!productId || !quantity || quantity <= 0) {
        return res
          .status(400)
          .json({ message: "Invalid product ID or quantity" });
      }

      const isAvailable = await storage.validateStockAvailability(
        productId,
        quantity,
      );
      const product = await storage.getProductById(productId);

      res.json({
        available: isAvailable,
        currentStock: product?.stockQuantity || 0,
        requestedQuantity: quantity,
      });
    } catch (error) {
      console.error("Stock validation error:", error);
      res.status(500).json({ message: "Failed to validate stock" });
    }
  });

  // Get low stock products alert
  app.get(`${apiPrefix}/admin/low-stock`, async (req, res) => {
    try {
      const threshold = parseInt(req.query.threshold as string) || 10;
      const allProducts = await storage.getAllProducts();
      const lowStockProducts = allProducts.filter(
        (product) => product.stockQuantity <= threshold,
      );

      res.json({
        lowStockProducts,
        threshold,
        count: lowStockProducts.length,
      });
    } catch (error) {
      console.error("Low stock check error:", error);
      res.status(500).json({ message: "Failed to check low stock products" });
    }
  });

  // Get detailed order information for admin
  app.get(`${apiPrefix}/admin/orders/:id/details`, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);

      if (!orderId) {
        return res.status(400).json({ message: "Invalid order ID" });
      }

      // Get the order details
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Get order items with product details
      const orderItems = await storage.getOrderItemsByOrderId(orderId);

      // Get user details if userId exists
      let user = null;
      if (order.userId) {
        user = await storage.getUserById(order.userId);
      }

      // Get payment details if available
      let payment = null;
      try {
        const payments = await storage.getPaymentsByUserId(order.userId || 0);
        payment = payments.find((p) => p.orderId === orderId);
      } catch (error) {
        console.log("Payment details not found for order:", orderId);
      }

      // Build comprehensive order details response
      const orderDetails = {
        ...order,
        user: user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
            }
          : null,
        payment: payment
          ? {
              id: payment.id,
              amount: payment.amount,
              status: payment.status,
              razorpayPaymentId: payment.razorpayPaymentId,
            }
          : null,
        items: await Promise.all(
          orderItems.map(async (item) => {
            const product = await storage.getProductById(item.productId);
            return {
              ...item,
              product: product
                ? {
                    id: product.id,
                    name: product.name,
                    sku: product.sku,
                    imageUrl: product.imageUrl,
                  }
                : null,
            };
          }),
        ),
      };

      res.json(orderDetails);
    } catch (error) {
      console.error("Order details fetch error:", error);
      res.status(500).json({ message: "Failed to fetch order details" });
    }
  });

  // Discount API Routes
  app.get("/api/admin/discounts", async (req, res) => {
    try {
      const discounts = await storage.getAllDiscounts();
      res.json(discounts);
    } catch (error) {
      console.error("Discounts fetch error:", error);
      res.status(500).json({ message: "Failed to fetch discounts" });
    }
  });

  app.post("/api/admin/discounts", async (req, res) => {
    try {
      // Convert date strings to Date objects
      const requestData = {
        ...req.body,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
      };

      const validationResult = insertDiscountSchema.safeParse(requestData);
      if (!validationResult.success) {
        console.error(
          "Discount validation error:",
          validationResult.error.issues,
        );
        return res
          .status(400)
          .json({
            message: "Invalid discount data",
            errors: validationResult.error.issues,
          });
      }

      const discount = await storage.createDiscount(validationResult.data);
      res.json(discount);
    } catch (error) {
      console.error("Discount creation error:", error);
      res.status(500).json({ message: "Failed to create discount" });
    }
  });

  app.put("/api/admin/discounts/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Convert date strings to Date objects
      const requestData = {
        ...req.body,
        ...(req.body.startDate && { startDate: new Date(req.body.startDate) }),
        ...(req.body.endDate && { endDate: new Date(req.body.endDate) }),
      };

      const validationResult = insertDiscountSchema
        .partial()
        .safeParse(requestData);
      if (!validationResult.success) {
        console.error(
          "Discount update validation error:",
          validationResult.error.issues,
        );
        return res
          .status(400)
          .json({
            message: "Invalid discount data",
            errors: validationResult.error.issues,
          });
      }

      const discount = await storage.updateDiscount(
        parseInt(id),
        validationResult.data,
      );
      res.json(discount);
    } catch (error) {
      console.error("Discount update error:", error);
      res.status(500).json({ message: "Failed to update discount" });
    }
  });

  app.delete("/api/admin/discounts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteDiscount(parseInt(id));
      res.json({ message: "Discount deleted successfully" });
    } catch (error) {
      console.error("Discount deletion error:", error);
      res.status(500).json({ message: "Failed to delete discount" });
    }
  });

  // Site Settings Routes for Store Information & Social Media
  app.get("/api/site-settings", async (req, res) => {
    try {
      const settings = await storage.getAllSiteSettings();
      res.json(settings);
    } catch (error) {
      console.error("Site settings fetch error:", error);
      res.status(500).json({ message: "Failed to fetch site settings" });
    }
  });

  app.get("/api/admin/site-settings", async (req, res) => {
    try {
      const settings = await storage.getAllSiteSettings();
      res.json(settings);
    } catch (error) {
      console.error("Admin site settings fetch error:", error);
      res.status(500).json({ message: "Failed to fetch site settings" });
    }
  });

  app.post("/api/admin/site-settings", async (req, res) => {
    try {
      const setting = await storage.upsertSiteSetting(req.body);
      res.json(setting);
    } catch (error) {
      console.error("Site setting update error:", error);
      res.status(500).json({ message: "Failed to update site setting" });
    }
  });

  app.delete("/api/admin/site-settings/:key", async (req, res) => {
    try {
      const { key } = req.params;
      await storage.deleteSiteSetting(key);
      res.json({ message: "Setting deleted successfully" });
    } catch (error) {
      console.error("Site setting deletion error:", error);
      res.status(500).json({ message: "Failed to delete site setting" });
    }
  });

  // Get active discounts for checkout
  app.get("/api/discounts/active", async (req, res) => {
    try {
      const discounts = await storage.getActiveDiscounts();
      res.json(discounts);
    } catch (error) {
      console.error("Active discounts fetch error:", error);
      res.status(500).json({ message: "Failed to fetch active discounts" });
    }
  });

  // Discount validation and application for checkout
  app.post("/api/discounts/validate", async (req, res) => {
    try {
      const { code, id, cartTotal, userId } = req.body;
      let validation;

      if (id) {
        // Validate by discount ID
        validation = await storage.validateDiscountById(id, userId, cartTotal);
      } else {
        // Validate by discount code (fallback)
        validation = await storage.validateDiscount(code, userId, cartTotal);
      }

      res.json(validation);
    } catch (error) {
      console.error("Discount validation error:", error);
      res.status(500).json({ message: "Failed to validate discount" });
    }
  });

  app.post("/api/discounts/apply", async (req, res) => {
    try {
      const { discountId, userId, sessionId, orderId } = req.body;
      const usage = await storage.applyDiscount(
        discountId,
        userId,
        sessionId,
        orderId,
      );
      res.json(usage);
    } catch (error) {
      console.error("Discount application error:", error);
      res.status(500).json({ message: "Failed to apply discount" });
    }
  });

  // Public route to get active discounts for customer view
  app.get("/api/discounts/active", async (req, res) => {
    try {
      const activeDiscounts = await storage.getActiveDiscounts();
      // Only return essential info for public view
      const publicDiscounts = activeDiscounts.map((discount) => ({
        id: discount.id,
        code: discount.code,
        type: discount.type,
        value: discount.value,
        description: discount.description,
        minPurchase: discount.minPurchase,
        endDate: discount.endDate,
      }));
      res.json(publicDiscounts);
    } catch (error) {
      console.error("Active discounts fetch error:", error);
      res.status(500).json({ message: "Failed to fetch active discounts" });
    }
  });

  // ===== CATEGORY MANAGEMENT ROUTES =====

  // Helper function to generate slug from name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
      .trim()
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-"); // Replace multiple hyphens with single hyphen
  };

  // Get all categories (main categories only)
  app.get("/api/admin/categories", authenticate, async (req, res) => {
    try {
      const categories = await storage.getMainCategories();
      res.json(categories);
    } catch (error) {
      console.error("Get categories error:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Get all categories with subcategories
  app.get("/api/admin/categories/all", authenticate, async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error("Get all categories error:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Create a new category
  app.post("/api/admin/categories", authenticate, async (req, res) => {
    try {
      const categoryData = req.body;

      // Validate required fields
      if (!categoryData.name) {
        return res.status(400).json({ message: "Category name is required" });
      }

      // Generate slug if not provided
      if (!categoryData.slug) {
        categoryData.slug = generateSlug(categoryData.name);
      }

      const newCategory = await storage.createCategory(categoryData);
      res.status(201).json(newCategory);
    } catch (error) {
      console.error("Create category error:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Update a category
  app.put("/api/admin/categories/:id", authenticate, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const updateData = req.body;

      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      // Generate slug if name is being updated and slug is not provided
      if (updateData.name && !updateData.slug) {
        updateData.slug = generateSlug(updateData.name);
      }

      const updatedCategory = await storage.updateCategory(
        categoryId,
        updateData,
      );
      res.json(updatedCategory);
    } catch (error) {
      console.error("Update category error:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  // Delete a category
  app.delete("/api/admin/categories/:id", authenticate, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);

      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      // Check if category has products
      const allProducts = await storage.getAllEnhancedProducts();
      const category = await storage.getCategoryById(categoryId);

      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      const productsUsingCategory = allProducts.filter(
        (product) => product.category === category.name,
      );

      if (productsUsingCategory.length > 0) {
        return res.status(400).json({
          message: `Cannot delete category. ${productsUsingCategory.length} products are using this category.`,
          productsCount: productsUsingCategory.length,
        });
      }

      await storage.deleteCategory(categoryId);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Delete category error:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Get subcategories for a specific category
  app.get(
    "/api/admin/categories/:id/subcategories",
    authenticate,
    async (req, res) => {
      try {
        const categoryId = parseInt(req.params.id);

        if (isNaN(categoryId)) {
          return res.status(400).json({ message: "Invalid category ID" });
        }

        const subcategories =
          await storage.getSubcategoriesByParent(categoryId);
        res.json(subcategories);
      } catch (error) {
        console.error("Get subcategories error:", error);
        res.status(500).json({ message: "Failed to fetch subcategories" });
      }
    },
  );

  // Create a new subcategory
  app.post(
    "/api/admin/categories/:id/subcategories",
    authenticate,
    async (req, res) => {
      try {
        const parentId = parseInt(req.params.id);
        const subcategoryData = req.body;

        if (isNaN(parentId)) {
          return res
            .status(400)
            .json({ message: "Invalid parent category ID" });
        }

        if (!subcategoryData.name) {
          return res
            .status(400)
            .json({ message: "Subcategory name is required" });
        }

        // Verify parent category exists
        const parentCategory = await storage.getCategoryById(parentId);
        if (!parentCategory) {
          return res.status(404).json({ message: "Parent category not found" });
        }

        // Generate slug if not provided
        if (!subcategoryData.slug) {
          subcategoryData.slug = generateSlug(subcategoryData.name);
        }

        const newSubcategory = await storage.createCategory({
          ...subcategoryData,
          parentId: parentId,
        });

        res.status(201).json(newSubcategory);
      } catch (error) {
        console.error("Create subcategory error:", error);
        res.status(500).json({ message: "Failed to create subcategory" });
      }
    },
  );

  // Update a subcategory
  app.put("/api/admin/subcategories/:id", authenticate, async (req, res) => {
    try {
      const subcategoryId = parseInt(req.params.id);
      const updateData = req.body;

      if (isNaN(subcategoryId)) {
        return res.status(400).json({ message: "Invalid subcategory ID" });
      }

      // Generate slug if name is being updated and slug is not provided
      if (updateData.name && !updateData.slug) {
        updateData.slug = generateSlug(updateData.name);
      }

      const updatedSubcategory = await storage.updateCategory(
        subcategoryId,
        updateData,
      );
      res.json(updatedSubcategory);
    } catch (error) {
      console.error("Update subcategory error:", error);
      res.status(500).json({ message: "Failed to update subcategory" });
    }
  });

  // Delete a subcategory
  app.delete("/api/admin/subcategories/:id", authenticate, async (req, res) => {
    try {
      const subcategoryId = parseInt(req.params.id);

      if (isNaN(subcategoryId)) {
        return res.status(400).json({ message: "Invalid subcategory ID" });
      }

      // Check if subcategory has products
      const allProducts = await storage.getAllEnhancedProducts();
      const subcategory = await storage.getCategoryById(subcategoryId);

      if (!subcategory) {
        return res.status(404).json({ message: "Subcategory not found" });
      }

      const productsUsingSubcategory = allProducts.filter(
        (product) => product.subcategory === subcategory.name,
      );

      if (productsUsingSubcategory.length > 0) {
        return res.status(400).json({
          message: `Cannot delete subcategory. ${productsUsingSubcategory.length} products are using this subcategory.`,
          productsCount: productsUsingSubcategory.length,
        });
      }

      await storage.deleteCategory(subcategoryId);
      res.json({ message: "Subcategory deleted successfully" });
    } catch (error) {
      console.error("Delete subcategory error:", error);
      res.status(500).json({ message: "Failed to delete subcategory" });
    }
  });

  // Database Export API Routes
  app.get("/api/admin/database/export", async (req, res) => {
    try {
      console.log("Starting database export...");
      const exportPath = await exportDatabase();

      res.json({
        message: "Database exported successfully",
        filePath: exportPath,
        downloadUrl: `/api/admin/database/download/${path.basename(exportPath)}`,
      });
    } catch (error) {
      console.error("Database export error:", error);
      res.status(500).json({ message: "Failed to export database" });
    }
  });

  // Download exported database file
  app.get("/api/admin/database/download/:filename", (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(process.cwd(), "exports", filename);

      // Security check - ensure file is in exports directory
      if (!filePath.startsWith(path.join(process.cwd(), "exports"))) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if file exists
      if (!require("fs").existsSync(filePath)) {
        return res.status(404).json({ message: "Export file not found" });
      }

      res.download(filePath, filename, (err) => {
        if (err) {
          console.error("File download error:", err);
          res.status(500).json({ message: "Failed to download file" });
        }
      });
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ message: "Failed to download export file" });
    }
  });

  // Export specific table
  app.get("/api/admin/database/export/:tableName", async (req, res) => {
    try {
      const tableName = req.params.tableName;
      const exportPath = await exportTable(tableName);

      res.json({
        message: `Table ${tableName} exported successfully`,
        filePath: exportPath,
        downloadUrl: `/api/admin/database/download/${path.basename(exportPath)}`,
      });
    } catch (error) {
      console.error(`Table export error for ${req.params.tableName}:`, error);
      res
        .status(500)
        .json({ message: `Failed to export table ${req.params.tableName}` });
    }
  });

  // Initialize Razorpay and Email service when environment variables are available
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log("Razorpay payment gateway initialized");
  }

  if (
    process.env.EMAIL_HOST &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS
  ) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    console.log("Email service initialized");
  }

  const httpServer = createServer(app);

  return httpServer;
}
