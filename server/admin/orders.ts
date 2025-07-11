import { Request, Response } from "express";
import { db } from "../db";
import {
  orders,
  orderItems,
  products,
  users,
  farmers,
  Order,
  OrderItem,
} from "@shared/schema";
import { eq, like, desc, asc, and, gte, lte, sql, ne } from "drizzle-orm";

// abhi
// Get monthly sales for current year
const getMonth = (date: Date) => date.getMonth() + 1;

export const getMonthlySalesData = async () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = getMonth(new Date());

  // 1. Get all non-cancelled orders from this year
  const validOrders = await db
    .select({
      total: orders.total,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, new Date(`${currentYear}-01-01`)),
        ne(orders.status, "cancelled")
      )
    );

  // 2. Aggregate revenue per month
  const revenueByMonth: Record<number, number> = {};

  validOrders.forEach((order) => {
    const month = getMonth(new Date(order.createdAt));
    const total = Number(order.total);
    revenueByMonth[month] = (revenueByMonth[month] || 0) + total;
  });

  // 3. Format result for frontend
  return Array.from({ length: currentMonth }, (_, i) => {
    const month = i + 1;
    return {
      name: new Date(0, i).toLocaleString("en-US", { month: "short" }),
      sales: revenueByMonth[month] || 0,
    };
  });
};

// GET all orders with pagination, sorting and filtering
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      limit = "10",
      sort = "id",
      order = "asc",
      search = "",
      status = "",
      startDate = "",
      endDate = "",
    } = req.query as Record<string, string>;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const offset = (pageNumber - 1) * limitNumber;

    let query = db
      .select({
        id: orders.id,
        userId: orders.userId,
        sessionId: orders.sessionId,
        total: orders.total,
        status: orders.status,
        shippingAddress: orders.shippingAddress,
        paymentMethod: orders.paymentMethod,
        cancellationReason: orders.cancellationReason,
        deliveredAt: orders.deliveredAt,
        createdAt: orders.createdAt,
        trackingId: orders.trackingId,
        updatedAt: orders.updatedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id));

    // Apply search filter if provided
    if (search) {
      query = query.where(like(users.name, `%${search}%`));
    }

    // Apply status filter if provided
    if (status) {
      query = query.where(eq(orders.status, status));
    }

    // Apply date range filters if provided
    if (startDate && endDate) {
      query = query.where(
        and(
          gte(orders.createdAt, new Date(startDate)),
          lte(orders.createdAt, new Date(endDate))
        )
      );
    } else if (startDate) {
      query = query.where(gte(orders.createdAt, new Date(startDate)));
    } else if (endDate) {
      query = query.where(lte(orders.createdAt, new Date(endDate)));
    }

    // Count total records for pagination
    const totalQuery = db.select({ count: sql<number>`count(*)` }).from(orders);

    // Apply the same filters to the count query
    if (search) {
      totalQuery
        .leftJoin(users, eq(orders.userId, users.id))
        .where(like(users.name, `%${search}%`));
    }
    if (status) {
      totalQuery.where(eq(orders.status, status));
    }
    if (startDate && endDate) {
      totalQuery.where(
        and(
          gte(orders.createdAt, new Date(startDate)),
          lte(orders.createdAt, new Date(endDate))
        )
      );
    } else if (startDate) {
      totalQuery.where(gte(orders.createdAt, new Date(startDate)));
    } else if (endDate) {
      totalQuery.where(lte(orders.createdAt, new Date(endDate)));
    }

    const [countResult] = await totalQuery;
    const count = countResult?.count || 0;

    // Apply sorting
    if (sort === "userName") {
      if (order === "asc") {
        query = query.orderBy(asc(users.name));
      } else {
        query = query.orderBy(desc(users.name));
      }
    } else {
      if (order === "asc") {
        query = query.orderBy(asc(orders[sort as keyof typeof orders]));
      } else {
        query = query.orderBy(desc(orders[sort as keyof typeof orders]));
      }
    }

    // Apply pagination
    query = query.limit(limitNumber).offset(offset);

    // Execute query
    const ordersList = await query;

    // Return orders with pagination metadata
    res.json({
      orders: ordersList,
      pagination: {
        total: Number(count),
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(Number(count) / limitNumber),
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch orders", error: String(error) });
  }
};

// GET a single order by ID with its items
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get order details
    const [orderData] = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        sessionId: orders.sessionId,
        total: orders.total,
        status: orders.status,
        shippingAddress: orders.shippingAddress,
        paymentMethod: orders.paymentMethod,
        cancellationReason: orders.cancellationReason,
        deliveredAt: orders.deliveredAt,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.id, parseInt(id)));

    if (!orderData) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Get order items with product details
    const orderItemsWithProducts = await db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        price: orderItems.price,
        productName: products.name,
        productImageUrl: products.imageUrl,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, parseInt(id)));

    // Return order with its items
    res.json({
      ...orderData,
      items: orderItemsWithProducts,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch order", error: String(error) });
  }
};

// Update order status
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, cancellationReason } = req.body;

    // Validate status
    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    // Prepare update data
    const updateData: Partial<Order> = { status };

    // Add additional fields based on status
    if (status === "cancelled" && cancellationReason) {
      updateData.cancellationReason = cancellationReason;
    }

    if (status === "delivered") {
      updateData.deliveredAt = new Date();
    }

    // Update order in database
    const [updatedOrder] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, parseInt(id)))
      .returning();

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res
      .status(500)
      .json({ message: "Failed to update order status", error: String(error) });
  }
};

// Delete an order
export const deleteOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Start a transaction to delete order items first, then the order
    const deletedOrder = await db.transaction(async (tx) => {
      // Delete order items
      await tx.delete(orderItems).where(eq(orderItems.orderId, parseInt(id)));

      // Delete the order and return it
      const [deletedOrder] = await tx
        .delete(orders)
        .where(eq(orders.id, parseInt(id)))
        .returning();

      return deletedOrder;
    });

    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({
      message: "Order deleted successfully",
      order: deletedOrder,
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    res
      .status(500)
      .json({ message: "Failed to delete order", error: String(error) });
  }
};

// Get order statistics data without sending response
export const getOrderStatisticsData = async (): Promise<any> => {
  try {
    // Get counts by status
    const allOrders = await db.select().from(orders);

    // Calculate statistics
    const totalOrders = allOrders.length;
    const pendingOrders = allOrders.filter(
      (o) => o.status === "pending"
    ).length;
    const processingOrders = allOrders.filter(
      (o) => o.status === "processing"
    ).length;
    const shippedOrders = allOrders.filter(
      (o) => o.status === "shipped"
    ).length;
    const deliveredOrders = allOrders.filter(
      (o) => o.status === "delivered"
    ).length;
    const cancelledOrders = allOrders.filter(
      (o) => o.status === "cancelled"
    ).length;

    // Calculate total revenue
    const totalRevenue = allOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, order) => sum + Number(order.total), 0);

    // Get recent orders (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentOrders = allOrders.filter(
      (o) => new Date(o.createdAt) >= thirtyDaysAgo
    ).length;

    return {
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
      recentOrders,
    };
  } catch (error) {
    console.error("Error fetching order statistics:", error);
    throw error;
  }
};

// Get order statistics with response
export const getOrderStatistics = async (req: Request, res: Response) => {
  try {
    const statistics = await getOrderStatisticsData();
    res.json(statistics);
  } catch (error) {
    console.error("Error fetching order statistics:", error);
    res.status(500).json({
      message: "Failed to fetch order statistics",
      error: String(error),
    });
  }
};

// Export all orders with complete details for CSV/Excel
export const exportOrders = async (req: Request, res: Response) => {
  try {
    // Get all orders with user information
    const ordersData = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        sessionId: orders.sessionId,
        total: orders.total,
        status: orders.status,
        shippingAddress: orders.shippingAddress,
        paymentMethod: orders.paymentMethod,
        cancellationReason: orders.cancellationReason,
        deliveredAt: orders.deliveredAt,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .orderBy(desc(orders.createdAt));

    // Get all order items with product details
    const allOrderItems = await db
      .select({
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        price: orderItems.price,
        productName: products.name,
        productSku: products.sku,
        productCategory: products.category,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id));

    // Group order items by order ID
    const itemsByOrderId: Record<number, any[]> = {};
    allOrderItems.forEach((item) => {
      if (!itemsByOrderId[item.orderId]) {
        itemsByOrderId[item.orderId] = [];
      }
      itemsByOrderId[item.orderId].push({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        productName: item.productName,
        productSku: item.productSku,
        productCategory: item.productCategory,
      });
    });

    // Combine orders with their items
    const ordersWithItems = ordersData.map((order) => ({
      ...order,
      items: itemsByOrderId[order.id] || [],
    }));

    res.json({
      orders: ordersWithItems,
      exportedAt: new Date().toISOString(),
      totalOrders: ordersWithItems.length,
    });
  } catch (error) {
    console.error("Error exporting orders:", error);
    res
      .status(500)
      .json({ message: "Failed to export orders", error: String(error) });
  }
};

export const updateOrderTracking = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { trackingId } = req.body;
    console.log("raaj", orderId, trackingId);
    // Validate input
    if (!trackingId || typeof trackingId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid tracking ID is required",
      });
    }

    // Update the order with Drizzle ORM
    const [updatedOrder] = await db
      .update(orders)
      .set({
        trackingId,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, parseInt(orderId)))
      .returning();

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      order: updatedOrder,
      message: "Tracking ID updated successfully",
    });
  } catch (error) {
    console.error("Error updating tracking ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update tracking ID",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
