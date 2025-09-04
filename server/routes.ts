import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { gasService } from "./services/google-apps-script";
import { insertSpreadsheetSchema, insertSheetSchema, insertTransferSchema } from "@shared/schema";
import { z } from "zod";

const filterDataSchema = z.object({
  spreadsheetId: z.string(),
  sheetName: z.string(),
  fromDate: z.string(),
  toDate: z.string(),
});

const validateHeadersSchema = z.object({
  sourceSpreadsheetId: z.string(),
  sourceSheetName: z.string(),
  destSpreadsheetId: z.string(),
  destSheetName: z.string(),
});

const transferDataSchema = z.object({
  sourceSpreadsheetId: z.string(),
  sourceSheetName: z.string(),
  destinationSpreadsheetId: z.string(),
  destinationSheetName: z.string(),
  fromDate: z.string(),
  toDate: z.string(),
  mode: z.enum(['copy', 'move']),
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get all spreadsheets
  app.get("/api/spreadsheets", async (req, res) => {
    try {
      const gasSpreadsheets = await gasService.getSpreadsheets();
      
      // Convert to our format
      const spreadsheets = gasSpreadsheets.map(gas => ({
        id: gas.id,
        name: gas.name,
        googleId: gas.id,
        createdAt: new Date(),
      }));
      
      res.json(spreadsheets);
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch spreadsheets" 
      });
    }
  });

  // Get sheets for a spreadsheet
  app.get("/api/spreadsheets/:id/sheets", async (req, res) => {
    try {
      const { id } = req.params;
      const gasSheets = await gasService.getSheets(id);
      
      // Convert to our format
      const sheets = gasSheets.map(gas => ({
        id: gas.id,
        name: gas.name,
        spreadsheetId: gas.spreadsheetId,
        googleId: gas.id,
        createdAt: new Date(),
      }));
      
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
      const { name, sheetName } = req.body;
      
      if (!name || !sheetName) {
        return res.status(400).json({ message: "Name and sheet name are required" });
      }
      
      const gasSpreadsheet = await gasService.createNewSpreadsheet(name, sheetName);
      
      const spreadsheet = {
        id: gasSpreadsheet.id,
        name: gasSpreadsheet.name,
        googleId: gasSpreadsheet.id,
        createdAt: new Date(),
      };
      
      res.json(spreadsheet);
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create spreadsheet" 
      });
    }
  });

  // Create new sheet
  app.post("/api/spreadsheets/sheets", async (req, res) => {
    try {
      const { spreadsheetId, sheetName } = req.body;
      
      if (!spreadsheetId || !sheetName) {
        return res.status(400).json({ message: "Spreadsheet ID and sheet name are required" });
      }
      
      const gasSheet = await gasService.createNewSheet(spreadsheetId, sheetName);
      
      const sheet = {
        id: gasSheet.id,
        name: gasSheet.name,
        spreadsheetId: gasSheet.spreadsheetId,
        googleId: gasSheet.id,
        createdAt: new Date(),
      };
      
      res.json(sheet);
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create sheet" 
      });
    }
  });

  // Get filtered data
  app.post("/api/spreadsheets/filtered-data", async (req, res) => {
    try {
      const validatedData = filterDataSchema.parse(req.body);
      
      const data = await gasService.getFilteredData(
        validatedData.spreadsheetId,
        validatedData.sheetName,
        validatedData.fromDate,
        validatedData.toDate
      );
      
      res.json({
        headers: data.headers,
        rows: data.rows,
        rowCount: data.rowCount,
        dateRange: `${validatedData.fromDate} to ${validatedData.toDate}`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch filtered data" 
      });
    }
  });

  // Validate headers
  app.post("/api/spreadsheets/validate-headers", async (req, res) => {
    try {
      const validatedData = validateHeadersSchema.parse(req.body);
      
      const validation = await gasService.validateHeaders(
        validatedData.sourceSpreadsheetId,
        validatedData.sourceSheetName,
        validatedData.destSpreadsheetId,
        validatedData.destSheetName
      );
      
      if (validation.isValid) {
        res.json(null); // No mismatches
      } else {
        res.json({
          expected: validation.expected,
          missing: validation.missing,
          extra: validation.extra,
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

  // Transfer data
  app.post("/api/spreadsheets/transfer", async (req, res) => {
    try {
      const validatedData = transferDataSchema.parse(req.body);
      
      // Get the data to transfer
      const sourceData = await gasService.getFilteredData(
        validatedData.sourceSpreadsheetId,
        validatedData.sourceSheetName,
        validatedData.fromDate,
        validatedData.toDate
      );
      
      // Execute the transfer
      const result = await gasService.executeTransfer(
        validatedData.sourceSpreadsheetId,
        validatedData.sourceSheetName,
        validatedData.destinationSpreadsheetId,
        validatedData.destinationSheetName,
        validatedData.mode,
        sourceData.rows
      );
      
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to execute transfer" 
      });
    }
  });

  // Get transfer progress
  app.get("/api/transfers/:id/progress", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Simulate progress data
      const progress = {
        percentage: Math.floor(Math.random() * 100),
        message: "Processing data...",
        details: `Chunk ${Math.floor(Math.random() * 5) + 1} of 5`,
        processed: `${Math.floor(Math.random() * 200) + 50} / 250 rows`,
        duplicates: Math.floor(Math.random() * 5),
      };
      
      res.json(progress);
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to get transfer progress" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
