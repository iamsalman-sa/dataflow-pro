import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, integer, boolean, decimal, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Users table for authentication and role management
export const users = pgTable('users', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'manager', 'employee'] }).notNull().default('employee'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').default(sql`now()`).notNull(),
  lastLogin: timestamp('last_login')
});

// Connected spreadsheets table
export const connectedSpreadsheets = pgTable('connected_spreadsheets', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id').references(() => users.id),
  name: text('name').notNull(),
  spreadsheetId: text('spreadsheet_id').notNull(),
  sheetName: text('sheet_name').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').default(sql`now()`).notNull()
});

// Orders table - main data structure
export const orders = pgTable('orders', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp('date').notNull(),
  orderId: text('order_id').unique().notNull(),
  trackingId: text('tracking_id'),
  customerName: text('customer_name').notNull(),
  phone: text('phone').notNull(),
  city: text('city').notNull(),
  cod: decimal('cod', { precision: 10, scale: 2 }),
  remarksOnStatus: text('remarks_on_status'),
  agentName: text('agent_name'),
  status: text('status', { enum: ['pending', 'shipped', 'delivered', 'returned', 'cancelled'] }).notNull(),
  export: text('export'),
  deliveryType: text('delivery_type', { enum: ['standard', 'express', 'overnight'] }),
  returnReason: text('return_reason'),
  remarksIfReturned: text('remarks_if_returned'),
  spreadsheetId: varchar('spreadsheet_id').references(() => connectedSpreadsheets.id),
  createdAt: timestamp('created_at').default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`now()`).notNull()
});

// Filter presets for saved searches
export const filterPresets = pgTable('filter_presets', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id').references(() => users.id),
  name: text('name').notNull(),
  filters: text('filters').notNull(), // JSON string of filter criteria
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').default(sql`now()`).notNull()
});

// Notifications table
export const notifications = pgTable('notifications', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id').references(() => users.id),
  type: text('type', { enum: ['bulk_update', 'status_change', 'overdue_order', 'performance_alert'] }).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').default(sql`now()`).notNull()
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, lastLogin: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSpreadsheetSchema = createInsertSchema(connectedSpreadsheets).omit({ id: true, createdAt: true });
export const insertFilterPresetSchema = createInsertSchema(filterPresets).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type ConnectedSpreadsheet = typeof connectedSpreadsheets.$inferSelect;
export type InsertSpreadsheet = z.infer<typeof insertSpreadsheetSchema>;
export type FilterPreset = typeof filterPresets.$inferSelect;
export type InsertFilterPreset = z.infer<typeof insertFilterPresetSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type LoginData = z.infer<typeof loginSchema>;

// Enums for dropdowns
export const ROLES = ['admin', 'manager', 'employee'] as const;
export const ORDER_STATUSES = ['pending', 'shipped', 'delivered', 'returned', 'cancelled'] as const;
export const DELIVERY_TYPES = ['standard', 'express', 'overnight'] as const;
export const NOTIFICATION_TYPES = ['bulk_update', 'status_change', 'overdue_order', 'performance_alert'] as const;

// Filter criteria type
export type FilterCriteria = {
  dateRange?: { from: string; to: string };
  orderId?: string;
  trackingId?: string;
  customerName?: string;
  phone?: string;
  agentName?: string;
  status?: string;
  city?: string;
};

// KPI types
export type DashboardKPIs = {
  totalOrders: number;
  totalSalesAmount: number;
  deliveredOrdersPercent: number;
  pendingOrdersPercent: number;
  returnRatio: number;
  returningCustomersCount: number;
  agentPerformance: Array<{
    agentName: string;
    ordersProcessed: number;
    deliveryRate: number;
    ranking: number;
  }>;
};

export type ChartData = {
  statusWiseOrders: Array<{ status: string; count: number }>;
  dailyTrends: Array<{ date: string; orders: number; sales: number }>;
  customerRetention: Array<{ period: string; new: number; returning: number }>;
  salesByAgent: Array<{ agent: string; sales: number }>;
  cityWiseSales: Array<{ city: string; orders: number; sales: number }>;
};