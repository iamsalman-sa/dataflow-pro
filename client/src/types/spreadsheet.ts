export interface Spreadsheet {
  id: string;
  name: string;
}

export interface Sheet {
  id: string;
  name: string;
  spreadsheetId: string;
}

export interface TransferData {
  sourceSpreadsheetId: string;
  sourceSheetName: string;
  destinationSpreadsheetId: string;
  destinationSheetName: string;
  fromDate: string;
  toDate: string;
  mode: 'copy' | 'move';
}

export interface PreviewData {
  headers: string[];
  rows: string[][];
  rowCount: number;
  dateRange: string;
}

export interface TransferProgress {
  percentage: number;
  message: string;
  details: string;
  processed: string;
  duplicates: number;
}

export interface TransferStats {
  sourceRows: number;
  transferredRows: number;
  duplicates: number;
}

export interface HeaderMismatch {
  expected: string[];
  missing: string[];
  extra: string[];
}
