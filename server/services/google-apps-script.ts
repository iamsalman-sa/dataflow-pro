// This service simulates Google Apps Script functionality
// In a real implementation, this would make actual API calls to Google Sheets

export interface GASSpreadsheet {
  id: string;
  name: string;
}

export interface GASSheet {
  id: string;
  name: string;
  spreadsheetId: string;
}

export interface GASFilteredDataResponse {
  headers: string[];
  rows: string[][];
  rowCount: number;
}

export interface GASHeaderValidationResponse {
  isValid: boolean;
  expected: string[];
  missing: string[];
  extra: string[];
}

export interface GASTransferResponse {
  success: boolean;
  transferId: string;
  message: string;
}

class GoogleAppsScriptService {
  // Simulated required headers for validation
  private readonly REQUIRED_HEADERS = [
    'ORDER ID',
    'TRACKING ID', 
    'DATE',
    'CUSTOMER',
    'AMOUNT',
    'STATUS'
  ];

  async getSpreadsheets(): Promise<GASSpreadsheet[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return [
      { id: "ss1", name: "Orders Database" },
      { id: "ss2", name: "Customer Data" },
      { id: "ss3", name: "Product Inventory" },
      { id: "ss4", name: "Financial Reports" },
      { id: "ss5", name: "Marketing Analytics" },
    ];
  }

  async getSheets(spreadsheetId: string): Promise<GASSheet[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Return different sheets based on spreadsheet ID
    const sheetsMap: Record<string, GASSheet[]> = {
      "ss1": [
        { id: "sh1", name: "January Orders", spreadsheetId },
        { id: "sh2", name: "February Orders", spreadsheetId },
        { id: "sh3", name: "March Orders", spreadsheetId },
      ],
      "ss2": [
        { id: "sh4", name: "Customer Info", spreadsheetId },
        { id: "sh5", name: "Customer Preferences", spreadsheetId },
      ],
      "ss3": [
        { id: "sh6", name: "Current Inventory", spreadsheetId },
        { id: "sh7", name: "Reorder Alerts", spreadsheetId },
      ],
    };

    return sheetsMap[spreadsheetId] || [];
  }

  async createNewSpreadsheet(name: string, sheetName: string): Promise<GASSpreadsheet> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      id: `ss_${Date.now()}`,
      name: name,
    };
  }

  async createNewSheet(spreadsheetId: string, sheetName: string): Promise<GASSheet> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      id: `sh_${Date.now()}`,
      name: sheetName,
      spreadsheetId: spreadsheetId,
    };
  }

  async getFilteredData(
    spreadsheetId: string, 
    sheetName: string, 
    fromDate: string, 
    toDate: string
  ): Promise<GASFilteredDataResponse> {
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Generate sample data
    const headers = this.REQUIRED_HEADERS;
    const rows: string[][] = [];
    
    const rowCount = Math.floor(Math.random() * 200) + 50; // 50-250 rows
    
    for (let i = 0; i < Math.min(rowCount, 100); i++) { // Return max 100 rows for preview
      rows.push([
        `ORD-${String(i + 1).padStart(3, '0')}`,
        `TRK-${12345 + i}`,
        `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
        `Customer ${i + 1}`,
        `$${(Math.random() * 500 + 50).toFixed(2)}`,
        Math.random() > 0.5 ? 'Delivered' : 'Shipped'
      ]);
    }
    
    return {
      headers,
      rows,
      rowCount,
    };
  }

  async getExistingKeys(spreadsheetId: string, sheetName: string): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Return some sample existing keys for duplicate detection
    return ['ORD-001_TRK-12345', 'ORD-015_TRK-12359', 'ORD-032_TRK-12376'];
  }

  async validateHeaders(
    sourceSpreadsheetId: string,
    sourceSheetName: string,
    destSpreadsheetId: string,
    destSheetName: string
  ): Promise<GASHeaderValidationResponse> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Simulate header validation - sometimes return mismatches for demo
    const shouldHaveMismatch = Math.random() > 0.7;
    
    if (shouldHaveMismatch) {
      return {
        isValid: false,
        expected: this.REQUIRED_HEADERS,
        missing: ['CUSTOMER'],
        extra: ['NOTES'],
      };
    }
    
    return {
      isValid: true,
      expected: this.REQUIRED_HEADERS,
      missing: [],
      extra: [],
    };
  }

  async appendChunk(
    spreadsheetId: string, 
    sheetName: string, 
    chunk: string[][]
  ): Promise<void> {
    // Simulate chunk processing time
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // In real implementation, this would append data to the sheet
    console.log(`Appending ${chunk.length} rows to ${sheetName} in ${spreadsheetId}`);
  }

  async deleteRows(
    spreadsheetId: string, 
    sheetName: string, 
    rowNumbers: number[]
  ): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // In real implementation, this would delete rows from the sheet
    console.log(`Deleting ${rowNumbers.length} rows from ${sheetName} in ${spreadsheetId}`);
  }

  async executeTransfer(
    sourceSpreadsheetId: string,
    sourceSheetName: string,
    destSpreadsheetId: string,
    destSheetName: string,
    mode: 'copy' | 'move',
    data: string[][]
  ): Promise<GASTransferResponse> {
    const transferId = `transfer_${Date.now()}`;
    
    // Simulate chunked processing
    const chunkSize = 50;
    const chunks = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    
    // Process chunks (this would be done asynchronously in real implementation)
    for (let i = 0; i < chunks.length; i++) {
      await this.appendChunk(destSpreadsheetId, destSheetName, chunks[i]);
      
      // Simulate progress updates
      const progress = Math.round(((i + 1) / chunks.length) * 100);
      console.log(`Transfer ${transferId} progress: ${progress}%`);
    }
    
    // If move mode, delete source rows
    if (mode === 'move') {
      const rowNumbers = data.map((_, index) => index + 2); // +2 because row 1 is headers
      await this.deleteRows(sourceSpreadsheetId, sourceSheetName, rowNumbers);
    }
    
    return {
      success: true,
      transferId,
      message: `Successfully ${mode === 'move' ? 'moved' : 'copied'} ${data.length} rows.`
    };
  }
}

export const gasService = new GoogleAppsScriptService();
