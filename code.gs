/**
 * Google Apps Script functions for Spreadsheet Data Transfer Tool
 * This file contains all the backend functionality for the transfer application
 */

// Configuration
const REQUIRED_HEADERS = [
  'DATE',
  'ORDER ID',
  'TRACKING ID',
  'CUSTOMER NAME',
  'PHONE',
  'CITY',
  'COD',
  'REMARKS ON STATUS',
  'AGENT NAME',
  'STATUS',
  'EXPORT',
  'DELIVERY TYPE',
  'RETURN REASON',
  'REMARKS IF RETURNED'
];

const CHUNK_SIZE = 100; // Process data in chunks of 100 rows

/**
 * Get list of all spreadsheets accessible to the user
 * @return {Array} Array of spreadsheet objects with id and name
 */
function getSpreadsheets() {
  try {
    const files = DriveApp.searchFiles('mimeType="application/vnd.google-apps.spreadsheet"');
    const spreadsheets = [];
    
    while (files.hasNext()) {
      const file = files.next();
      spreadsheets.push({
        id: file.getId(),
        name: file.getName()
      });
    }
    
    // Sort by name for better UX
    return spreadsheets.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error getting spreadsheets:', error);
    throw new Error('Failed to retrieve spreadsheets: ' + error.message);
  }
}

/**
 * Get sheets from a specific spreadsheet
 * @param {string} ssId - Spreadsheet ID
 * @return {Array} Array of sheet objects with id and name
 */
function getSheets(ssId) {
  try {
    if (!ssId) {
      throw new Error('Spreadsheet ID is required');
    }
    
    const spreadsheet = SpreadsheetApp.openById(ssId);
    const sheets = spreadsheet.getSheets();
    
    return sheets.map(sheet => ({
      id: sheet.getSheetId().toString(),
      name: sheet.getName(),
      spreadsheetId: ssId
    }));
  } catch (error) {
    console.error('Error getting sheets:', error);
    throw new Error('Failed to retrieve sheets: ' + error.message);
  }
}

/**
 * Create a new spreadsheet with an initial sheet
 * @param {string} ssName - Name for the new spreadsheet
 * @param {string} sheetName - Name for the initial sheet
 * @return {Object} Created spreadsheet object
 */
function createNewSpreadsheet(ssName, sheetName) {
  try {
    if (!ssName || !sheetName) {
      throw new Error('Both spreadsheet name and sheet name are required');
    }
    
    const spreadsheet = SpreadsheetApp.create(ssName);
    const sheet = spreadsheet.getActiveSheet();
    sheet.setName(sheetName);
    
    // Set up required headers
    const headerRange = sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length);
    headerRange.setValues([REQUIRED_HEADERS]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f0f0f0');
    
    return {
      id: spreadsheet.getId(),
      name: spreadsheet.getName()
    };
  } catch (error) {
    console.error('Error creating spreadsheet:', error);
    throw new Error('Failed to create spreadsheet: ' + error.message);
  }
}

/**
 * Create a new sheet in an existing spreadsheet
 * @param {string} ssId - Spreadsheet ID
 * @param {string} sheetName - Name for the new sheet
 * @return {Object} Created sheet object
 */
function createNewSheet(ssId, sheetName) {
  try {
    if (!ssId || !sheetName) {
      throw new Error('Both spreadsheet ID and sheet name are required');
    }
    
    const spreadsheet = SpreadsheetApp.openById(ssId);
    const sheet = spreadsheet.insertSheet(sheetName);
    
    // Set up required headers
    const headerRange = sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length);
    headerRange.setValues([REQUIRED_HEADERS]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f0f0f0');
    
    return {
      id: sheet.getSheetId().toString(),
      name: sheet.getName(),
      spreadsheetId: ssId
    };
  } catch (error) {
    console.error('Error creating sheet:', error);
    throw new Error('Failed to create sheet: ' + error.message);
  }
}

/**
 * Get filtered data from a sheet within a date range
 * @param {string} ssId - Spreadsheet ID
 * @param {string} sheetName - Sheet name
 * @param {string} fromDate - Start date (YYYY-MM-DD)
 * @param {string} toDate - End date (YYYY-MM-DD)
 * @return {Object} Filtered data with headers, rows, and count
 */
function getFilteredData(ssId, sheetName, fromDate, toDate) {
  try {
    if (!ssId || !sheetName || !fromDate || !toDate) {
      throw new Error('All parameters are required: ssId, sheetName, fromDate, toDate');
    }
    
    const spreadsheet = SpreadsheetApp.openById(ssId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found in spreadsheet`);
    }
    
    const data = sheet.getDataRange().getValues();
    
    if (data.length === 0) {
      return {
        headers: [],
        rows: [],
        rowCount: 0
      };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    // Find the date column index
    const dateColumnIndex = headers.findIndex(header => 
      header.toString().toLowerCase().includes('date')
    );
    
    if (dateColumnIndex === -1) {
      throw new Error('Date column not found in the sheet');
    }
    
    // Convert date strings to Date objects for comparison
    const fromDateObj = new Date(fromDate);
    const toDateObj = new Date(toDate);
    toDateObj.setHours(23, 59, 59, 999); // Include the entire end date
    
    // Filter rows by date range
    const filteredRows = rows.filter(row => {
      const cellDate = new Date(row[dateColumnIndex]);
      return cellDate >= fromDateObj && cellDate <= toDateObj;
    });
    
    // Convert dates to strings for JSON serialization
    const serializedRows = filteredRows.map(row => 
      row.map(cell => {
        if (cell instanceof Date) {
          return Utilities.formatDate(cell, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }
        return cell.toString();
      })
    );
    
    return {
      headers: headers.map(h => h.toString()),
      rows: serializedRows,
      rowCount: filteredRows.length
    };
  } catch (error) {
    console.error('Error getting filtered data:', error);
    throw new Error('Failed to retrieve filtered data: ' + error.message);
  }
}

/**
 * Get existing ORDER ID + TRACKING ID combinations for duplicate detection
 * @param {string} ssId - Spreadsheet ID
 * @param {string} sheetName - Sheet name
 * @return {Array} Array of existing key combinations
 */
function getExistingKeys(ssId, sheetName) {
  try {
    if (!ssId || !sheetName) {
      throw new Error('Both spreadsheet ID and sheet name are required');
    }
    
    const spreadsheet = SpreadsheetApp.openById(ssId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found in spreadsheet`);
    }
    
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return [];
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const orderIdIndex = headers.findIndex(h => h.toString().toLowerCase().includes('order') && h.toString().toLowerCase().includes('id'));
    const trackingIdIndex = headers.findIndex(h => h.toString().toLowerCase().includes('tracking') && h.toString().toLowerCase().includes('id'));
    
    if (orderIdIndex === -1 || trackingIdIndex === -1) {
      throw new Error('ORDER ID or TRACKING ID column not found');
    }
    
    const keys = rows
      .filter(row => row[orderIdIndex] && row[trackingIdIndex])
      .map(row => `${row[orderIdIndex]}_${row[trackingIdIndex]}`);
    
    return [...new Set(keys)]; // Remove duplicates
  } catch (error) {
    console.error('Error getting existing keys:', error);
    throw new Error('Failed to retrieve existing keys: ' + error.message);
  }
}

/**
 * Validate headers between source and destination sheets
 * @param {string} sourceSpreadsheetId - Source spreadsheet ID
 * @param {string} sourceSheetName - Source sheet name  
 * @param {string} destSpreadsheetId - Destination spreadsheet ID
 * @param {string} destSheetName - Destination sheet name
 * @return {Object|null} Header mismatch details or null if valid
 */
function validateHeaders(sourceSpreadsheetId, sourceSheetName, destSpreadsheetId, destSheetName) {
  try {
    // Get source headers
    const sourceSpreadsheet = SpreadsheetApp.openById(sourceSpreadsheetId);
    const sourceSheet = sourceSpreadsheet.getSheetByName(sourceSheetName);
    
    if (!sourceSheet) {
      throw new Error(`Source sheet "${sourceSheetName}" not found`);
    }
    
    // Get destination headers
    const destSpreadsheet = SpreadsheetApp.openById(destSpreadsheetId);
    const destSheet = destSpreadsheet.getSheetByName(destSheetName);
    
    if (!destSheet) {
      throw new Error(`Destination sheet "${destSheetName}" not found`);
    }
    
    const sourceHeaders = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
    const destHeaders = destSheet.getRange(1, 1, 1, destSheet.getLastColumn()).getValues()[0];
    
    // Convert to strings and normalize
    const normalizeHeader = (header) => header.toString().trim().toUpperCase();
    const normalizedSource = sourceHeaders.map(normalizeHeader);
    const normalizedDest = destHeaders.map(normalizeHeader);
    const normalizedRequired = REQUIRED_HEADERS.map(normalizeHeader);
    
    // Check for missing required headers in destination
    const missing = normalizedRequired.filter(reqHeader => 
      !normalizedDest.includes(reqHeader)
    );
    
    // Check for extra headers in source that aren't in destination  
    const extra = normalizedSource.filter(srcHeader => 
      !normalizedDest.includes(srcHeader) && normalizedRequired.includes(srcHeader)
    );
    
    if (missing.length > 0 || extra.length > 0) {
      return {
        expected: REQUIRED_HEADERS,
        missing: missing.map(h => {
          const index = normalizedRequired.indexOf(h);
          return REQUIRED_HEADERS[index];
        }),
        extra: extra.map(h => {
          const index = normalizedSource.indexOf(h);
          return sourceHeaders[index].toString();
        })
      };
    }
    
    return null; // Headers are valid
  } catch (error) {
    console.error('Error validating headers:', error);
    throw new Error('Failed to validate headers: ' + error.message);
  }
}

/**
 * Append data chunk to destination sheet
 * @param {string} ssId - Spreadsheet ID
 * @param {string} sheetName - Sheet name
 * @param {Array} chunk - Data chunk to append
 */
function appendChunk(ssId, sheetName, chunk) {
  try {
    if (!ssId || !sheetName || !chunk || chunk.length === 0) {
      throw new Error('Invalid parameters for append operation');
    }
    
    const spreadsheet = SpreadsheetApp.openById(ssId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found in spreadsheet`);
    }
    
    // Find the next empty row
    const lastRow = sheet.getLastRow();
    const startRow = lastRow + 1;
    
    // Ensure the chunk data matches the number of columns
    const numCols = sheet.getLastColumn() || chunk[0].length;
    
    // Pad or trim rows to match column count
    const normalizedChunk = chunk.map(row => {
      const normalizedRow = [...row];
      while (normalizedRow.length < numCols) {
        normalizedRow.push('');
      }
      return normalizedRow.slice(0, numCols);
    });
    
    // Append the data
    const range = sheet.getRange(startRow, 1, normalizedChunk.length, numCols);
    range.setValues(normalizedChunk);
    
    console.log(`Appended ${chunk.length} rows to ${sheetName} starting at row ${startRow}`);
  } catch (error) {
    console.error('Error appending chunk:', error);
    throw new Error('Failed to append data chunk: ' + error.message);
  }
}

/**
 * Delete specific rows from a sheet (used in move operations)
 * @param {string} ssId - Spreadsheet ID
 * @param {string} sheetName - Sheet name
 * @param {Array} rowNums - Array of row numbers to delete (1-based)
 */
function deleteRows(ssId, sheetName, rowNums) {
  try {
    if (!ssId || !sheetName || !rowNums || rowNums.length === 0) {
      throw new Error('Invalid parameters for delete operation');
    }
    
    const spreadsheet = SpreadsheetApp.openById(ssId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found in spreadsheet`);
    }
    
    // Sort row numbers in descending order to avoid index shifting issues
    const sortedRows = [...rowNums].sort((a, b) => b - a);
    
    // Delete rows one by one from bottom to top
    sortedRows.forEach(rowNum => {
      if (rowNum > 1 && rowNum <= sheet.getLastRow()) { // Don't delete header row
        sheet.deleteRow(rowNum);
      }
    });
    
    console.log(`Deleted ${sortedRows.length} rows from ${sheetName}`);
  } catch (error) {
    console.error('Error deleting rows:', error);
    throw new Error('Failed to delete rows: ' + error.message);
  }
}

/**
 * Main function to execute data transfer with progress tracking
 * @param {Object} transferParams - Transfer configuration
 * @return {Object} Transfer result with success status and message
 */
function executeDataTransfer(transferParams) {
  try {
    const {
      sourceSpreadsheetId,
      sourceSheetName,
      destSpreadsheetId,
      destSheetName,
      fromDate,
      toDate,
      mode = 'copy'
    } = transferParams;
    
    console.log(`Starting ${mode} operation from ${sourceSheetName} to ${destSheetName}`);
    
    // Step 1: Get filtered source data
    const sourceData = getFilteredData(sourceSpreadsheetId, sourceSheetName, fromDate, toDate);
    
    if (sourceData.rowCount === 0) {
      return {
        success: true,
        message: 'No data found in the specified date range.',
        transferredRows: 0,
        duplicatesFound: 0
      };
    }
    
    // Step 2: Get existing keys for duplicate detection
    const existingKeys = getExistingKeys(destSpreadsheetId, destSheetName);
    
    // Step 3: Filter out duplicates
    const orderIdIndex = sourceData.headers.findIndex(h => h.toLowerCase().includes('order') && h.toLowerCase().includes('id'));
    const trackingIdIndex = sourceData.headers.findIndex(h => h.toLowerCase().includes('tracking') && h.toLowerCase().includes('id'));
    
    if (orderIdIndex === -1 || trackingIdIndex === -1) {
      throw new Error('ORDER ID or TRACKING ID columns not found in source data');
    }
    
    const uniqueRows = [];
    const duplicateRows = [];
    const sourceRowNumbers = [];
    
    sourceData.rows.forEach((row, index) => {
      const key = `${row[orderIdIndex]}_${row[trackingIdIndex]}`;
      
      if (existingKeys.includes(key)) {
        duplicateRows.push(row);
      } else {
        uniqueRows.push(row);
        sourceRowNumbers.push(index + 2); // +2 because index is 0-based and row 1 is headers
      }
    });
    
    if (uniqueRows.length === 0) {
      return {
        success: true,
        message: 'All rows are duplicates. No data transferred.',
        transferredRows: 0,
        duplicatesFound: duplicateRows.length
      };
    }
    
    // Step 4: Process data in chunks
    const chunks = [];
    for (let i = 0; i < uniqueRows.length; i += CHUNK_SIZE) {
      chunks.push(uniqueRows.slice(i, i + CHUNK_SIZE));
    }
    
    // Step 5: Transfer chunks
    let transferredCount = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        appendChunk(destSpreadsheetId, destSheetName, chunk);
        transferredCount += chunk.length;
        
        // Progress logging
        const progress = Math.round(((i + 1) / chunks.length) * 100);
        console.log(`Transfer progress: ${progress}% (${transferredCount}/${uniqueRows.length} rows)`);
        
      } catch (chunkError) {
        console.error(`Error processing chunk ${i + 1}:`, chunkError);
        throw new Error(`Failed to transfer chunk ${i + 1}: ${chunkError.message}`);
      }
    }
    
    // Step 6: Delete source rows if move mode
    if (mode === 'move' && transferredCount > 0) {
      try {
        const rowsToDelete = sourceRowNumbers.slice(0, transferredCount);
        deleteRows(sourceSpreadsheetId, sourceSheetName, rowsToDelete);
        console.log(`Deleted ${rowsToDelete.length} rows from source sheet`);
      } catch (deleteError) {
        console.error('Error deleting source rows:', deleteError);
        // Don't fail the entire operation if delete fails
        console.warn('Data was copied successfully but source rows could not be deleted');
      }
    }
    
    const message = mode === 'move' 
      ? `Successfully moved ${transferredCount} rows. ${duplicateRows.length} duplicates were skipped.`
      : `Successfully copied ${transferredCount} rows. ${duplicateRows.length} duplicates were skipped.`;
    
    return {
      success: true,
      message: message,
      transferredRows: transferredCount,
      duplicatesFound: duplicateRows.length
    };
    
  } catch (error) {
    console.error('Error executing data transfer:', error);
    return {
      success: false,
      message: 'Transfer failed: ' + error.message,
      transferredRows: 0,
      duplicatesFound: 0
    };
  }
}

/**
 * Serves the HTML file when the web app is accessed
 * This function is called when someone visits your web app URL
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Spreadsheet Data Transfer Tool')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Web app entry point for handling HTTP requests
 * This function should be deployed as a web app with execute permissions set to "Anyone"
 */
function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    
    let result;
    
    switch (action) {
      case 'getSpreadsheets':
        result = getSpreadsheets();
        break;
        
      case 'getSheets':
        result = getSheets(requestData.ssId);
        break;
        
      case 'createNewSpreadsheet':
        result = createNewSpreadsheet(requestData.ssName, requestData.sheetName);
        break;
        
      case 'createNewSheet':
        result = createNewSheet(requestData.ssId, requestData.sheetName);
        break;
        
      case 'getFilteredData':
        result = getFilteredData(requestData.ssId, requestData.sheetName, requestData.fromDate, requestData.toDate);
        break;
        
      case 'getExistingKeys':
        result = getExistingKeys(requestData.ssId, requestData.sheetName);
        break;
        
      case 'validateHeaders':
        result = validateHeaders(requestData.sourceSpreadsheetId, requestData.sourceSheetName, requestData.destSpreadsheetId, requestData.destSheetName);
        break;
        
      case 'executeDataTransfer':
        result = executeDataTransfer(requestData.transferParams);
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in doPost:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred' 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Test function to verify all functions work correctly
 * Run this function in the Apps Script editor to test functionality
 */
function testAllFunctions() {
  try {
    console.log('Testing getSpreadsheets...');
    const spreadsheets = getSpreadsheets();
    console.log(`Found ${spreadsheets.length} spreadsheets`);
    
    if (spreadsheets.length > 0) {
      const testSpreadsheetId = spreadsheets[0].id;
      console.log(`Testing with spreadsheet: ${spreadsheets[0].name}`);
      
      console.log('Testing getSheets...');
      const sheets = getSheets(testSpreadsheetId);
      console.log(`Found ${sheets.length} sheets`);
      
      if (sheets.length > 0) {
        const testSheetName = sheets[0].name;
        console.log(`Testing with sheet: ${testSheetName}`);
        
        console.log('Testing getFilteredData...');
        const data = getFilteredData(testSpreadsheetId, testSheetName, '2024-01-01', '2024-12-31');
        console.log(`Found ${data.rowCount} rows`);
        
        console.log('Testing getExistingKeys...');
        const keys = getExistingKeys(testSpreadsheetId, testSheetName);
        console.log(`Found ${keys.length} existing keys`);
      }
    }
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}
