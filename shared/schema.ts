import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const spreadsheets = pgTable("spreadsheets", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  googleId: text("google_id").notNull().unique(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const sheets = pgTable("sheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  spreadsheetId: varchar("spreadsheet_id").references(() => spreadsheets.id).notNull(),
  googleId: text("google_id").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const transfers = pgTable("transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceSpreadsheetId: varchar("source_spreadsheet_id").references(() => spreadsheets.id).notNull(),
  sourceSheetName: text("source_sheet_name").notNull(),
  destSpreadsheetId: varchar("dest_spreadsheet_id").references(() => spreadsheets.id).notNull(),
  destSheetName: text("dest_sheet_name").notNull(),
  mode: text("mode").notNull(), // 'copy' or 'move'
  status: text("status").notNull(), // 'pending', 'in_progress', 'completed', 'failed'
  progress: integer("progress").default(0).notNull(),
  totalRows: integer("total_rows").default(0).notNull(),
  processedRows: integer("processed_rows").default(0).notNull(),
  duplicateRows: integer("duplicate_rows").default(0).notNull(),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

export const insertSpreadsheetSchema = createInsertSchema(spreadsheets).pick({
  name: true,
  googleId: true,
});

export const insertSheetSchema = createInsertSchema(sheets).pick({
  name: true,
  spreadsheetId: true,
  googleId: true,
});

export const insertTransferSchema = createInsertSchema(transfers).pick({
  sourceSpreadsheetId: true,
  sourceSheetName: true,
  destSpreadsheetId: true,
  destSheetName: true,
  mode: true,
  status: true,
  totalRows: true,
});

export type InsertSpreadsheet = z.infer<typeof insertSpreadsheetSchema>;
export type InsertSheet = z.infer<typeof insertSheetSchema>;
export type InsertTransfer = z.infer<typeof insertTransferSchema>;

export type Spreadsheet = typeof spreadsheets.$inferSelect;
export type Sheet = typeof sheets.$inferSelect;
export type Transfer = typeof transfers.$inferSelect;
