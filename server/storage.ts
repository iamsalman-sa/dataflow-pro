import type { 
  Spreadsheet, 
  Sheet, 
  Transfer,
  InsertSpreadsheet, 
  InsertSheet, 
  InsertTransfer 
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Spreadsheet methods
  getSpreadsheets(): Promise<Spreadsheet[]>;
  getSpreadsheet(id: string): Promise<Spreadsheet | undefined>;
  createSpreadsheet(spreadsheet: InsertSpreadsheet): Promise<Spreadsheet>;
  
  // Sheet methods
  getSheets(spreadsheetId: string): Promise<Sheet[]>;
  getSheet(id: string): Promise<Sheet | undefined>;
  createSheet(sheet: InsertSheet): Promise<Sheet>;
  
  // Transfer methods
  getTransfer(id: string): Promise<Transfer | undefined>;
  createTransfer(transfer: InsertTransfer): Promise<Transfer>;
  updateTransferProgress(id: string, progress: number, processedRows: number, duplicateRows?: number): Promise<void>;
  updateTransferStatus(id: string, status: string, errorMessage?: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private spreadsheets: Map<string, Spreadsheet> = new Map();
  private sheets: Map<string, Sheet> = new Map();
  private transfers: Map<string, Transfer> = new Map();

  constructor() {
    // Initialize with some sample data
    this.initSampleData();
  }

  private initSampleData() {
    // Sample spreadsheets
    const spreadsheet1: Spreadsheet = {
      id: "ss1",
      name: "Orders Database",
      googleId: "1abc123",
      createdAt: new Date(),
    };
    
    const spreadsheet2: Spreadsheet = {
      id: "ss2", 
      name: "Customer Data",
      googleId: "2def456",
      createdAt: new Date(),
    };

    this.spreadsheets.set(spreadsheet1.id, spreadsheet1);
    this.spreadsheets.set(spreadsheet2.id, spreadsheet2);

    // Sample sheets
    const sheet1: Sheet = {
      id: "sh1",
      name: "January Orders",
      spreadsheetId: "ss1",
      googleId: "sheet1_gid",
      createdAt: new Date(),
    };

    const sheet2: Sheet = {
      id: "sh2",
      name: "February Orders",
      spreadsheetId: "ss1",
      googleId: "sheet2_gid",
      createdAt: new Date(),
    };

    const sheet3: Sheet = {
      id: "sh3",
      name: "Customer Info",
      spreadsheetId: "ss2",
      googleId: "sheet3_gid",
      createdAt: new Date(),
    };

    this.sheets.set(sheet1.id, sheet1);
    this.sheets.set(sheet2.id, sheet2);
    this.sheets.set(sheet3.id, sheet3);
  }

  async getSpreadsheets(): Promise<Spreadsheet[]> {
    return Array.from(this.spreadsheets.values());
  }

  async getSpreadsheet(id: string): Promise<Spreadsheet | undefined> {
    return this.spreadsheets.get(id);
  }

  async createSpreadsheet(insertSpreadsheet: InsertSpreadsheet): Promise<Spreadsheet> {
    const id = randomUUID();
    const spreadsheet: Spreadsheet = {
      ...insertSpreadsheet,
      id,
      createdAt: new Date(),
    };
    this.spreadsheets.set(id, spreadsheet);
    return spreadsheet;
  }

  async getSheets(spreadsheetId: string): Promise<Sheet[]> {
    return Array.from(this.sheets.values()).filter(
      sheet => sheet.spreadsheetId === spreadsheetId
    );
  }

  async getSheet(id: string): Promise<Sheet | undefined> {
    return this.sheets.get(id);
  }

  async createSheet(insertSheet: InsertSheet): Promise<Sheet> {
    const id = randomUUID();
    const sheet: Sheet = {
      ...insertSheet,
      id,
      createdAt: new Date(),
    };
    this.sheets.set(id, sheet);
    return sheet;
  }

  async getTransfer(id: string): Promise<Transfer | undefined> {
    return this.transfers.get(id);
  }

  async createTransfer(insertTransfer: InsertTransfer): Promise<Transfer> {
    const id = randomUUID();
    const transfer: Transfer = {
      ...insertTransfer,
      id,
      progress: 0,
      processedRows: 0,
      duplicateRows: 0,
      errorMessage: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.transfers.set(id, transfer);
    return transfer;
  }

  async updateTransferProgress(id: string, progress: number, processedRows: number, duplicateRows = 0): Promise<void> {
    const transfer = this.transfers.get(id);
    if (transfer) {
      transfer.progress = progress;
      transfer.processedRows = processedRows;
      transfer.duplicateRows = duplicateRows;
      transfer.updatedAt = new Date();
    }
  }

  async updateTransferStatus(id: string, status: string, errorMessage?: string): Promise<void> {
    const transfer = this.transfers.get(id);
    if (transfer) {
      transfer.status = status;
      transfer.errorMessage = errorMessage || null;
      transfer.updatedAt = new Date();
    }
  }
}

export const storage = new MemStorage();
