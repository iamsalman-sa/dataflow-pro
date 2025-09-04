import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertOrderSchema, 
  insertSpreadsheetSchema,
  insertFilterPresetSchema,
  insertNotificationSchema,
  loginSchema,
  type FilterCriteria
} from "@shared/schema";
import { z } from "zod";

// Configure session store
declare module 'express-session' {
  interface SessionData {
    userId: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  }
}

// Validation schemas
const orderUpdateSchema = z.object({
  status: z.enum(['pending', 'shipped', 'delivered', 'returned', 'cancelled']).optional(),
  agentName: z.string().optional(),
  deliveryType: z.enum(['standard', 'express', 'overnight']).optional(),
  returnReason: z.string().optional(),
  remarksOnStatus: z.string().optional(),
  remarksIfReturned: z.string().optional(),
});

const bulkUpdateSchema = z.object({
  orderIds: z.array(z.string()),
  updates: orderUpdateSchema
});

const filterSchema = z.object({
  dateRange: z.object({
    from: z.string(),
    to: z.string()
  }).optional(),
  orderId: z.string().optional(),
  trackingId: z.string().optional(),
  customerName: z.string().optional(),
  phone: z.string().optional(),
  agentName: z.string().optional(),
  status: z.string().optional(),
  city: z.string().optional()
});

// Middleware for authentication
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Middleware for role-based access
const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.session?.user || !roles.includes(req.session.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Configure session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // ============ AUTHENTICATION ROUTES ============
  
  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      const isValidPassword = await storage.validatePassword(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      if (!user.isActive) {
        return res.status(401).json({ message: 'Account is deactivated' });
      }
      
      // Update last login
      await storage.updateLastLogin(user.id);
      
      // Create session
      req.session.userId = user.id;
      req.session.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      };
      
      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Login failed" 
      });
    }
  });
  
  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to logout' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });
  
  // Get current user
  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json({ user: req.session.user });
  });

  // ============ USER MANAGEMENT ROUTES ============
  
  // Get all users (admin only)
  app.get("/api/users", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const users = await storage.getUsers();
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }));
      
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch users" 
      });
    }
  });
  
  // Create user (admin only)
  app.post("/api/users", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create user" 
      });
    }
  });
  
  // Update user (admin only)
  app.patch("/api/users/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive
      });
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to update user" 
      });
    }
  });
  
  // Delete user (admin only)
  app.delete("/api/users/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteUser(id);
      
      if (!success) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to delete user" 
      });
    }
  });

  // ============ ORDER MANAGEMENT ROUTES ============
  
  // Get all orders with optional filtering
  app.get("/api/orders", requireAuth, async (req, res) => {
    try {
      const filters: FilterCriteria = {};
      
      // Parse query parameters into filters
      if (req.query.dateFrom && req.query.dateTo) {
        filters.dateRange = {
          from: req.query.dateFrom as string,
          to: req.query.dateTo as string
        };
      }
      
      if (req.query.orderId) filters.orderId = req.query.orderId as string;
      if (req.query.trackingId) filters.trackingId = req.query.trackingId as string;
      if (req.query.customerName) filters.customerName = req.query.customerName as string;
      if (req.query.phone) filters.phone = req.query.phone as string;
      if (req.query.agentName) filters.agentName = req.query.agentName as string;
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.city) filters.city = req.query.city as string;
      
      const orders = await storage.getOrders(filters);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch orders" 
      });
    }
  });
  
  // Get single order
  app.get("/api/orders/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      res.json(order);
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch order" 
      });
    }
  });
  
  // Create order
  app.post("/api/orders", requireAuth, async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      
      res.json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create order" 
      });
    }
  });
  
  // Update order
  app.patch("/api/orders/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = orderUpdateSchema.parse(req.body);
      
      const order = await storage.updateOrder(id, updates);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Create notification for status changes
      if (updates.status) {
        await storage.createNotification({
          userId: req.session.userId,
          type: 'status_change',
          title: 'Order Status Updated',
          message: `Order ${order.orderId} status changed to ${updates.status}`
        });
      }
      
      res.json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to update order" 
      });
    }
  });
  
  // Bulk update orders
  app.post("/api/orders/bulk-update", requireAuth, async (req, res) => {
    try {
      const { orderIds, updates } = bulkUpdateSchema.parse(req.body);
      
      const updatedCount = await storage.bulkUpdateOrders(orderIds, updates);
      
      // Create notification for bulk updates
      await storage.createNotification({
        userId: req.session.userId,
        type: 'bulk_update',
        title: 'Bulk Update Complete',
        message: `Successfully updated ${updatedCount} orders`
      });
      
      res.json({ updatedCount, message: `${updatedCount} orders updated successfully` });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to bulk update orders" 
      });
    }
  });
  
  // Delete order
  app.delete("/api/orders/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteOrder(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      res.json({ message: 'Order deleted successfully' });
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to delete order" 
      });
    }
  });

  // ============ DASHBOARD & ANALYTICS ROUTES ============
  
  // Get dashboard KPIs
  app.get("/api/dashboard/kpis", requireAuth, async (req, res) => {
    try {
      const kpis = await storage.getDashboardKPIs(req.session.userId, req.session.user.role);
      res.json(kpis);
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch KPIs" 
      });
    }
  });
  
  // Get chart data
  app.get("/api/dashboard/charts", requireAuth, async (req, res) => {
    try {
      const chartData = await storage.getChartData(req.session.userId, req.session.user.role);
      res.json(chartData);
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch chart data" 
      });
    }
  });

  // ============ NOTIFICATION ROUTES ============
  
  // Get notifications for current user
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifications = await storage.getNotifications(req.session.userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch notifications" 
      });
    }
  });
  
  // Mark notification as read
  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.markNotificationAsRead(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      
      res.json({ message: 'Notification marked as read' });
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to mark notification as read" 
      });
    }
  });
  
  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", requireAuth, async (req, res) => {
    try {
      const markedCount = await storage.markAllNotificationsAsRead(req.session.userId);
      res.json({ markedCount, message: `${markedCount} notifications marked as read` });
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to mark all notifications as read" 
      });
    }
  });

  // ============ FILTER PRESETS ROUTES ============
  
  // Get filter presets for current user
  app.get("/api/filter-presets", requireAuth, async (req, res) => {
    try {
      const presets = await storage.getFilterPresets(req.session.userId);
      res.json(presets);
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch filter presets" 
      });
    }
  });
  
  // Create filter preset
  app.post("/api/filter-presets", requireAuth, async (req, res) => {
    try {
      const presetData = {
        ...insertFilterPresetSchema.parse(req.body),
        userId: req.session.userId
      };
      
      const preset = await storage.createFilterPreset(presetData);
      res.json(preset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create filter preset" 
      });
    }
  });
  
  // Delete filter preset
  app.delete("/api/filter-presets/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteFilterPreset(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Filter preset not found' });
      }
      
      res.json({ message: 'Filter preset deleted successfully' });
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to delete filter preset" 
      });
    }
  });

  // ============ SPREADSHEET CONNECTIVITY ROUTES ============
  
  // Get connected spreadsheets
  app.get("/api/spreadsheets", requireAuth, async (req, res) => {
    try {
      const spreadsheets = await storage.getConnectedSpreadsheets(req.session.userId);
      res.json(spreadsheets);
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch spreadsheets" 
      });
    }
  });
  
  // Connect spreadsheet
  app.post("/api/spreadsheets", requireAuth, async (req, res) => {
    try {
      const spreadsheetData = {
        ...insertSpreadsheetSchema.parse(req.body),
        userId: req.session.userId
      };
      
      const spreadsheet = await storage.createSpreadsheet(spreadsheetData);
      res.json(spreadsheet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to connect spreadsheet" 
      });
    }
  });

  // ============ REPORTS ROUTES ============
  
  // Generate status report
  app.get("/api/reports/status", requireAuth, async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      const filters: FilterCriteria = {};
      
      if (dateFrom && dateTo) {
        filters.dateRange = { from: dateFrom as string, to: dateTo as string };
      }
      
      const orders = await storage.getOrders(filters);
      
      const statusReport = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      res.json({
        reportType: 'status',
        dateRange: filters.dateRange,
        data: statusReport,
        totalOrders: orders.length
      });
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to generate status report" 
      });
    }
  });
  
  // Generate agent performance report
  app.get("/api/reports/agents", requireAuth, async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      const filters: FilterCriteria = {};
      
      if (dateFrom && dateTo) {
        filters.dateRange = { from: dateFrom as string, to: dateTo as string };
      }
      
      const orders = await storage.getOrders(filters);
      
      const agentReport = orders.reduce((acc, order) => {
        const agent = order.agentName || 'Unassigned';
        if (!acc[agent]) {
          acc[agent] = { total: 0, delivered: 0, pending: 0, returned: 0 };
        }
        acc[agent].total++;
        acc[agent][order.status as keyof typeof acc[agent]]++;
        return acc;
      }, {} as Record<string, any>);
      
      res.json({
        reportType: 'agents',
        dateRange: filters.dateRange,
        data: agentReport
      });
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to generate agent report" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}