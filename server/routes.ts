import type { Express } from "express";
import { createServer, type Server } from "http";
import { gasService } from "./services/google-apps-script";
import { z } from "zod";

// Validation schemas
const filteredDataSchema = z.object({
  spreadsheetId: z.string(),
  sheetName: z.string(),
  fromDate: z.string(),
  toDate: z.string()
});

const createSpreadsheetSchema = z.object({
  name: z.string(),
  sheetName: z.string()
});

const createSheetSchema = z.object({
  spreadsheetId: z.string(),
  sheetName: z.string()
});

const validateHeadersSchema = z.object({
  sourceSpreadsheetId: z.string(),
  sourceSheetName: z.string(),
  destSpreadsheetId: z.string(),
  destSheetName: z.string()
});

const transferDataSchema = z.object({
  sourceSpreadsheetId: z.string(),
  sourceSheetName: z.string(),
  destinationSpreadsheetId: z.string(),
  destinationSheetName: z.string(),
  fromDate: z.string(),
  toDate: z.string(),
  mode: z.enum(['copy', 'move']).default('move'),
  duplicateHandling: z.enum(['skip', 'update', 'add_all']).default('skip')
});

// In-memory storage for transfer progress tracking
const transferProgress = new Map<string, {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  stats: {
    totalRows: number;
    processedRows: number;
    duplicates: number;
    errors: number;
  };
}>();

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ============ SPREADSHEET ROUTES ============
  
  // Get all available spreadsheets
  app.get("/api/spreadsheets", async (req, res) => {
    try {
      const spreadsheets = await gasService.getSpreadsheets();
      res.json(spreadsheets);
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch spreadsheets" 
      });
    }
  });

  // Get sheets for a specific spreadsheet
  app.get("/api/spreadsheets/:spreadsheetId/sheets", async (req, res) => {
    try {
      const { spreadsheetId } = req.params;
      const sheets = await gasService.getSheets(spreadsheetId);
      res.json(sheets);
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch sheets" 
      });
    }
  });

  // Create new spreadsheet
  app.post("/api/spreadsheets", async (req, res) => {
    try {
      const { name, sheetName } = createSpreadsheetSchema.parse(req.body);
      const spreadsheet = await gasService.createNewSpreadsheet(name, sheetName);
      res.json(spreadsheet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create spreadsheet" 
      });
    }
  });

  // Create new sheet in existing spreadsheet
  app.post("/api/spreadsheets/sheets", async (req, res) => {
    try {
      const { spreadsheetId, sheetName } = createSheetSchema.parse(req.body);
      const sheet = await gasService.createNewSheet(spreadsheetId, sheetName);
      res.json(sheet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create sheet" 
      });
    }
  });

  // Get filtered data preview
  app.post("/api/spreadsheets/filtered-data", async (req, res) => {
    try {
      const { spreadsheetId, sheetName, fromDate, toDate } = filteredDataSchema.parse(req.body);
      const data = await gasService.getFilteredData(spreadsheetId, sheetName, fromDate, toDate);
      res.json(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch filtered data" 
      });
    }
  });

  // Validate headers between source and destination
  app.post("/api/spreadsheets/validate-headers", async (req, res) => {
    try {
      const { 
        sourceSpreadsheetId, 
        sourceSheetName, 
        destSpreadsheetId, 
        destSheetName 
      } = validateHeadersSchema.parse(req.body);
      
      const validation = await gasService.validateHeaders(
        sourceSpreadsheetId,
        sourceSheetName,
        destSpreadsheetId,
        destSheetName
      );

      if (validation.isValid) {
        res.json(null);
      } else {
        res.json({
          expected: validation.expected,
          missing: validation.missing,
          extra: validation.extra
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to validate headers" 
      });
    }
  });

  // Execute data transfer
  app.post("/api/spreadsheets/transfer", async (req, res) => {
    try {
      const transferData = transferDataSchema.parse(req.body);
      
      // Get the data to transfer
      const data = await gasService.getFilteredData(
        transferData.sourceSpreadsheetId,
        transferData.sourceSheetName,
        transferData.fromDate,
        transferData.toDate
      );

      // Get existing keys for duplicate detection
      const existingKeys = await gasService.getExistingKeys(
        transferData.destinationSpreadsheetId,
        transferData.destinationSheetName
      );

      // Filter duplicates based on handling strategy
      let rowsToTransfer = data.rows;
      let duplicateCount = 0;

      if (transferData.duplicateHandling === 'skip') {
        rowsToTransfer = data.rows.filter(row => {
          const key = `${row[0]}_${row[1]}`; // ORDER ID + TRACKING ID
          const isDuplicate = existingKeys.includes(key);
          if (isDuplicate) duplicateCount++;
          return !isDuplicate;
        });
      }

      // Execute the transfer
      const result = await gasService.executeTransfer(
        transferData.sourceSpreadsheetId,
        transferData.sourceSheetName,
        transferData.destinationSpreadsheetId,
        transferData.destinationSheetName,
        transferData.mode,
        rowsToTransfer
      );

      // Store transfer progress
      transferProgress.set(result.transferId, {
        status: 'completed',
        progress: 100,
        message: result.message,
        stats: {
          totalRows: data.rowCount,
          processedRows: rowsToTransfer.length,
          duplicates: duplicateCount,
          errors: 0
        }
      });

      res.json({
        success: result.success,
        message: result.message,
        transferId: result.transferId
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to transfer data" 
      });
    }
  });

  // Get transfer progress
  app.get("/api/transfers/:transferId/progress", async (req, res) => {
    try {
      const { transferId } = req.params;
      const progress = transferProgress.get(transferId);

      if (!progress) {
        return res.status(404).json({ message: 'Transfer not found' });
      }

      res.json(progress);
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch transfer progress" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
