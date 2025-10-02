# Google Apps Script - Spreadsheet Data Transfer Tool

## Overview

This project contains Google Apps Script files for transferring data between Google Sheets with filtering capabilities including date range and status filtering.

## Files

### GAS_code.gs
The main Google Apps Script code file containing all server-side functions:
- `getSpreadsheets()` - Get all accessible spreadsheets
- `getSheets()` - Get sheets from a spreadsheet
- `getFilteredData()` - Filter data by date range and status
- `validateHeaders()` - Validate headers between sheets
- `executeDataTransfer()` - Execute the data transfer operation
- Supporting functions for duplicate detection and data manipulation

### GAS_index.html
The HTML user interface file with:
- Modern dark theme UI
- Source data section with:
  - Spreadsheet selector
  - Sheet selector
  - Date range picker
  - **Status filter dropdown** (Pending, Shipped, Delivered, Returned, Cancelled)
- Destination section
- Transfer mode toggle (Copy/Move)
- Progress tracking and notifications

## Features Added

✅ **Status Criteria Filter** - Filter source data by status values in addition to date range

## Deployment Instructions

1. Go to [script.google.com](https://script.google.com)
2. Create a new project
3. Replace default Code.gs content with **GAS_code.gs**
4. Add HTML file named exactly **"index"** (not index.html)
5. Copy content from **GAS_index.html** to the index file
6. Deploy as web app with execute permissions set to "Anyone"

## How Status Filtering Works

- The Status column in your Google Sheet will be automatically detected
- Users can optionally filter data by selecting a status from the dropdown
- If "All Statuses" is selected, no status filtering is applied
- Status filtering works in combination with date range filtering

## User Preferences

Preferred communication style: Simple, everyday language.
