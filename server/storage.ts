import type { 
  User,
  Order, 
  ConnectedSpreadsheet,
  FilterPreset,
  Notification,
  InsertUser,
  InsertOrder,
  InsertSpreadsheet,
  InsertFilterPreset,
  InsertNotification,
  DashboardKPIs,
  ChartData,
  FilterCriteria
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Authentication methods
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateLastLogin(userId: string): Promise<void>;
  validatePassword(password: string, hashedPassword: string): Promise<boolean>;
  hashPassword(password: string): Promise<string>;
  
  // User management methods
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // Order management methods
  getOrders(filters?: FilterCriteria): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<boolean>;
  bulkUpdateOrders(orderIds: string[], updates: Partial<Order>): Promise<number>;
  
  // Spreadsheet connectivity methods
  getConnectedSpreadsheets(userId?: string): Promise<ConnectedSpreadsheet[]>;
  getSpreadsheet(id: string): Promise<ConnectedSpreadsheet | undefined>;
  createSpreadsheet(spreadsheet: InsertSpreadsheet): Promise<ConnectedSpreadsheet>;
  updateSpreadsheet(id: string, updates: Partial<ConnectedSpreadsheet>): Promise<ConnectedSpreadsheet | undefined>;
  deleteSpreadsheet(id: string): Promise<boolean>;
  
  // Filter preset methods
  getFilterPresets(userId: string): Promise<FilterPreset[]>;
  createFilterPreset(preset: InsertFilterPreset): Promise<FilterPreset>;
  updateFilterPreset(id: string, updates: Partial<FilterPreset>): Promise<FilterPreset | undefined>;
  deleteFilterPreset(id: string): Promise<boolean>;
  
  // Notification methods
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<boolean>;
  markAllNotificationsAsRead(userId: string): Promise<number>;
  
  // Dashboard and analytics methods
  getDashboardKPIs(userId: string, role: string): Promise<DashboardKPIs>;
  getChartData(userId: string, role: string): Promise<ChartData>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private orders: Map<string, Order> = new Map();
  private spreadsheets: Map<string, ConnectedSpreadsheet> = new Map();
  private filterPresets: Map<string, FilterPreset> = new Map();
  private notifications: Map<string, Notification> = new Map();

  constructor() {
    this.initSampleData();
  }

  private async initSampleData() {
    // Create sample users
    const adminUser: User = {
      id: "user1",
      email: "admin@company.com",
      passwordHash: await bcrypt.hash("admin123", 10),
      name: "Admin User",
      role: "admin",
      isActive: true,
      createdAt: new Date(),
      lastLogin: null
    };

    const managerUser: User = {
      id: "user2", 
      email: "manager@company.com",
      passwordHash: await bcrypt.hash("manager123", 10),
      name: "Manager User",
      role: "manager",
      isActive: true,
      createdAt: new Date(),
      lastLogin: null
    };

    const employeeUser: User = {
      id: "user3",
      email: "employee@company.com", 
      passwordHash: await bcrypt.hash("employee123", 10),
      name: "Employee User",
      role: "employee",
      isActive: true,
      createdAt: new Date(),
      lastLogin: null
    };

    this.users.set(adminUser.id, adminUser);
    this.users.set(managerUser.id, managerUser);
    this.users.set(employeeUser.id, employeeUser);

    // Create sample orders
    const sampleOrders: Order[] = [
      {
        id: "order1",
        date: new Date('2024-01-15'),
        orderId: "ORD-001",
        trackingId: "TRK-12345",
        customerName: "John Smith",
        phone: "+1234567890",
        city: "New York",
        cod: "299.99",
        remarksOnStatus: "Customer called to confirm",
        agentName: "Agent Smith",
        status: "delivered",
        export: "USA",
        deliveryType: "express",
        returnReason: null,
        remarksIfReturned: null,
        spreadsheetId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "order2",
        date: new Date('2024-01-16'),
        orderId: "ORD-002", 
        trackingId: "TRK-12346",
        customerName: "Jane Doe",
        phone: "+1234567891",
        city: "Los Angeles",
        cod: "149.99",
        remarksOnStatus: "Package in transit",
        agentName: "Agent Johnson",
        status: "shipped",
        export: "USA",
        deliveryType: "standard",
        returnReason: null,
        remarksIfReturned: null,
        spreadsheetId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "order3",
        date: new Date('2024-01-17'),
        orderId: "ORD-003",
        trackingId: "TRK-12347", 
        customerName: "Mike Wilson",
        phone: "+1234567892",
        city: "Chicago",
        cod: "79.99",
        remarksOnStatus: "Waiting for customer pickup",
        agentName: "Agent Brown",
        status: "pending",
        export: "USA",
        deliveryType: "overnight",
        returnReason: null,
        remarksIfReturned: null,
        spreadsheetId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    sampleOrders.forEach(order => {
      this.orders.set(order.id, order);
    });

    // Create sample notifications
    const notification1: Notification = {
      id: "notif1",
      userId: "user1",
      type: "bulk_update",
      title: "Bulk Update Complete",
      message: "Successfully updated 25 orders",
      isRead: false,
      createdAt: new Date()
    };

    this.notifications.set(notification1.id, notification1);
  }

  // Authentication methods
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const hashedPassword = await this.hashPassword(insertUser.passwordHash);
    
    const user: User = {
      id,
      email: insertUser.email,
      passwordHash: hashedPassword,
      name: insertUser.name,
      role: insertUser.role || 'employee',
      isActive: insertUser.isActive ?? true,
      createdAt: new Date(),
      lastLogin: null
    };
    
    this.users.set(id, user);
    return user;
  }

  async updateLastLogin(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.lastLogin = new Date();
    }
  }

  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  // User management methods
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      Object.assign(user, updates);
      return user;
    }
    return undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  // Order management methods
  async getOrders(filters?: FilterCriteria): Promise<Order[]> {
    let orders = Array.from(this.orders.values());
    
    if (filters) {
      orders = orders.filter(order => {
        if (filters.dateRange?.from && filters.dateRange?.to) {
          const orderDate = new Date(order.date);
          const fromDate = new Date(filters.dateRange.from);
          const toDate = new Date(filters.dateRange.to);
          if (orderDate < fromDate || orderDate > toDate) return false;
        }
        
        if (filters.orderId && !order.orderId.toLowerCase().includes(filters.orderId.toLowerCase())) return false;
        if (filters.trackingId && !order.trackingId?.toLowerCase().includes(filters.trackingId.toLowerCase())) return false;
        if (filters.customerName && !order.customerName.toLowerCase().includes(filters.customerName.toLowerCase())) return false;
        if (filters.phone && !order.phone.includes(filters.phone)) return false;
        if (filters.agentName && !order.agentName?.toLowerCase().includes(filters.agentName.toLowerCase())) return false;
        if (filters.status && order.status !== filters.status) return false;
        if (filters.city && !order.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
        
        return true;
      });
    }
    
    return orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = {
      id,
      date: insertOrder.date,
      orderId: insertOrder.orderId,
      trackingId: insertOrder.trackingId || null,
      customerName: insertOrder.customerName,
      phone: insertOrder.phone,
      city: insertOrder.city,
      cod: insertOrder.cod || null,
      remarksOnStatus: insertOrder.remarksOnStatus || null,
      agentName: insertOrder.agentName || null,
      status: insertOrder.status,
      export: insertOrder.export || null,
      deliveryType: insertOrder.deliveryType || null,
      returnReason: insertOrder.returnReason || null,
      remarksIfReturned: insertOrder.remarksIfReturned || null,
      spreadsheetId: insertOrder.spreadsheetId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.orders.set(id, order);
    return order;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (order) {
      Object.assign(order, { ...updates, updatedAt: new Date() });
      return order;
    }
    return undefined;
  }

  async deleteOrder(id: string): Promise<boolean> {
    return this.orders.delete(id);
  }

  async bulkUpdateOrders(orderIds: string[], updates: Partial<Order>): Promise<number> {
    let updatedCount = 0;
    
    orderIds.forEach(id => {
      const order = this.orders.get(id);
      if (order) {
        Object.assign(order, { ...updates, updatedAt: new Date() });
        updatedCount++;
      }
    });
    
    return updatedCount;
  }

  // Spreadsheet connectivity methods
  async getConnectedSpreadsheets(userId?: string): Promise<ConnectedSpreadsheet[]> {
    let spreadsheets = Array.from(this.spreadsheets.values());
    if (userId) {
      spreadsheets = spreadsheets.filter(s => s.userId === userId);
    }
    return spreadsheets;
  }

  async getSpreadsheet(id: string): Promise<ConnectedSpreadsheet | undefined> {
    return this.spreadsheets.get(id);
  }

  async createSpreadsheet(insertSpreadsheet: InsertSpreadsheet): Promise<ConnectedSpreadsheet> {
    const id = randomUUID();
    const spreadsheet: ConnectedSpreadsheet = {
      id,
      userId: insertSpreadsheet.userId || null,
      name: insertSpreadsheet.name,
      spreadsheetId: insertSpreadsheet.spreadsheetId,
      sheetName: insertSpreadsheet.sheetName,
      isActive: insertSpreadsheet.isActive ?? true,
      createdAt: new Date()
    };
    this.spreadsheets.set(id, spreadsheet);
    return spreadsheet;
  }

  async updateSpreadsheet(id: string, updates: Partial<ConnectedSpreadsheet>): Promise<ConnectedSpreadsheet | undefined> {
    const spreadsheet = this.spreadsheets.get(id);
    if (spreadsheet) {
      Object.assign(spreadsheet, updates);
      return spreadsheet;
    }
    return undefined;
  }

  async deleteSpreadsheet(id: string): Promise<boolean> {
    return this.spreadsheets.delete(id);
  }

  // Filter preset methods
  async getFilterPresets(userId: string): Promise<FilterPreset[]> {
    return Array.from(this.filterPresets.values()).filter(preset => preset.userId === userId);
  }

  async createFilterPreset(insertPreset: InsertFilterPreset): Promise<FilterPreset> {
    const id = randomUUID();
    const preset: FilterPreset = {
      id,
      userId: insertPreset.userId || null,
      name: insertPreset.name,
      filters: insertPreset.filters,
      isDefault: insertPreset.isDefault ?? false,
      createdAt: new Date()
    };
    this.filterPresets.set(id, preset);
    return preset;
  }

  async updateFilterPreset(id: string, updates: Partial<FilterPreset>): Promise<FilterPreset | undefined> {
    const preset = this.filterPresets.get(id);
    if (preset) {
      Object.assign(preset, updates);
      return preset;
    }
    return undefined;
  }

  async deleteFilterPreset(id: string): Promise<boolean> {
    return this.filterPresets.delete(id);
  }

  // Notification methods
  async getNotifications(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notif => notif.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const notification: Notification = {
      id,
      userId: insertNotification.userId || null,
      type: insertNotification.type,
      title: insertNotification.title,
      message: insertNotification.message,
      isRead: insertNotification.isRead ?? false,
      createdAt: new Date()
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.isRead = true;
      return true;
    }
    return false;
  }

  async markAllNotificationsAsRead(userId: string): Promise<number> {
    let markedCount = 0;
    Array.from(this.notifications.values()).forEach(notif => {
      if (notif.userId === userId && !notif.isRead) {
        notif.isRead = true;
        markedCount++;
      }
    });
    return markedCount;
  }

  // Dashboard and analytics methods
  async getDashboardKPIs(userId: string, role: string): Promise<DashboardKPIs> {
    const orders = await this.getOrders();
    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const returnedOrders = orders.filter(o => o.status === 'returned').length;
    
    const totalSalesAmount = orders
      .filter(o => o.cod)
      .reduce((sum, o) => sum + parseFloat(o.cod || '0'), 0);

    const deliveredOrdersPercent = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;
    const pendingOrdersPercent = totalOrders > 0 ? (pendingOrders / totalOrders) * 100 : 0;
    const returnRatio = totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0;

    // Get unique customers to calculate returning customers
    const customerOrders = orders.reduce((acc, order) => {
      const phone = order.phone;
      if (!acc[phone]) acc[phone] = [];
      acc[phone].push(order);
      return acc;
    }, {} as Record<string, Order[]>);

    const returningCustomersCount = Object.values(customerOrders).filter(orderList => orderList.length > 1).length;

    // Calculate agent performance
    const agentStats = orders.reduce((acc, order) => {
      const agent = order.agentName || 'Unassigned';
      if (!acc[agent]) {
        acc[agent] = { total: 0, delivered: 0 };
      }
      acc[agent].total++;
      if (order.status === 'delivered') {
        acc[agent].delivered++;
      }
      return acc;
    }, {} as Record<string, { total: number; delivered: number }>);

    const agentPerformance = Object.entries(agentStats)
      .map(([agentName, stats]) => ({
        agentName,
        ordersProcessed: stats.total,
        deliveryRate: stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0,
        ranking: 0
      }))
      .sort((a, b) => b.deliveryRate - a.deliveryRate)
      .map((agent, index) => ({ ...agent, ranking: index + 1 }));

    return {
      totalOrders,
      totalSalesAmount,
      deliveredOrdersPercent,
      pendingOrdersPercent,
      returnRatio,
      returningCustomersCount,
      agentPerformance
    };
  }

  async getChartData(userId: string, role: string): Promise<ChartData> {
    const orders = await this.getOrders();
    
    // Status-wise orders
    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusWiseOrders = Object.entries(statusCounts).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count
    }));

    // Daily trends (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyTrends = last7Days.map(date => {
      const dayOrders = orders.filter(o => o.date.toISOString().split('T')[0] === date);
      const sales = dayOrders.reduce((sum, o) => sum + parseFloat(o.cod || '0'), 0);
      
      return {
        date,
        orders: dayOrders.length,
        sales
      };
    });

    // Sales by agent
    const agentSales = orders.reduce((acc, order) => {
      const agent = order.agentName || 'Unassigned';
      acc[agent] = (acc[agent] || 0) + parseFloat(order.cod || '0');
      return acc;
    }, {} as Record<string, number>);

    const salesByAgent = Object.entries(agentSales).map(([agent, sales]) => ({
      agent,
      sales
    }));

    // City-wise sales
    const citySales = orders.reduce((acc, order) => {
      if (!acc[order.city]) {
        acc[order.city] = { orders: 0, sales: 0 };
      }
      acc[order.city].orders++;
      acc[order.city].sales += parseFloat(order.cod || '0');
      return acc;
    }, {} as Record<string, { orders: number; sales: number }>);

    const cityWiseSales = Object.entries(citySales).map(([city, data]) => ({
      city,
      orders: data.orders,
      sales: data.sales
    }));

    // Mock customer retention data
    const customerRetention = [
      { period: 'Jan', new: 120, returning: 45 },
      { period: 'Feb', new: 98, returning: 67 },
      { period: 'Mar', new: 154, returning: 89 }
    ];

    return {
      statusWiseOrders,
      dailyTrends,
      customerRetention,
      salesByAgent,
      cityWiseSales
    };
  }
}

export const storage = new MemStorage();