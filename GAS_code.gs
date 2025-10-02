/**
 * Google Apps Script functions for Spreadsheet Data Transfer Tool
 * Deploy this as a Google Apps Script project
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Go to script.google.com
 * 2. Create new project
 * 3. Replace default Code.gs content with this file
 * 4. Add HTML file named exactly 'index' (not index.html)
 * 5. Deploy as web app with execute permissions "Anyone"
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
 * Serves the HTML file when the web app is accessed
 * This function is called when someone visits your web app URL
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Spreadsheet Data Transfer Tool')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

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
      throw new Error('Spreadsheet name and sheet name are required');
    }
    
    // Create new spreadsheet
    const spreadsheet = SpreadsheetApp.create(ssName);
    const sheet = spreadsheet.getActiveSheet();
    
    // Rename the default sheet
    sheet.setName(sheetName);
    
    // Add headers
    const range = sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length);
    range.setValues([REQUIRED_HEADERS]);
    
    // Format header row
    range.setFontWeight('bold');
    range.setBackground('#f3f4f6');
    
    console.log(`Created new spreadsheet: ${ssName} with sheet: ${sheetName}`);
    
    return {
      id: spreadsheet.getId(),
      name: ssName
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
      throw new Error('Spreadsheet ID and sheet name are required');
    }
    
    const spreadsheet = SpreadsheetApp.openById(ssId);
    const sheet = spreadsheet.insertSheet(sheetName);
    
    // Add headers
    const range = sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length);
    range.setValues([REQUIRED_HEADERS]);
    
    // Format header row
    range.setFontWeight('bold');
    range.setBackground('#f3f4f6');
    
    console.log(`Created new sheet: ${sheetName} in spreadsheet: ${ssId}`);
    
    return {
      id: sheet.getSheetId().toString(),
      name: sheetName,
      spreadsheetId: ssId
    };
  } catch (error) {
    console.error('Error creating sheet:', error);
    throw new Error('Failed to create sheet: ' + error.message);
  }
}

/**
 * Get filtered data from a sheet based on date range and optional status
 * @param {string} ssId - Spreadsheet ID
 * @param {string} sheetName - Sheet name
 * @param {string} fromDate - Start date (YYYY-MM-DD)
 * @param {string} toDate - End date (YYYY-MM-DD)
 * @param {string} status - Optional status filter
 * @return {Object} Filtered data with headers, rows, and row count
 */
function getFilteredData(ssId, sheetName, fromDate, toDate, status) {
  try {
    if (!ssId || !sheetName || !fromDate || !toDate) {
      throw new Error('All parameters are required for data filtering');
    }
    
    const spreadsheet = SpreadsheetApp.openById(ssId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found in spreadsheet`);
    }
    
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    if (lastRow < 2) {
      return {
        headers: REQUIRED_HEADERS,
        rows: [],
        rowCount: 0
      };
    }
    
    // Get all data
    const allData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    const headers = allData[0];
    const dataRows = allData.slice(1);
    
    // Find date column index
    const dateColIndex = headers.findIndex(header => 
      header.toString().toLowerCase().includes('date')
    );
    
    if (dateColIndex === -1) {
      throw new Error('Date column not found. Please ensure your sheet has a DATE column.');
    }
    
    // Find status column index
    const statusColIndex = headers.findIndex(header => 
      header.toString().toLowerCase().includes('status')
    );
    
    // Filter data by date range and status
    const fromDateObj = new Date(fromDate);
    const toDateObj = new Date(toDate);
    
    const filteredRows = dataRows.filter(row => {
      const cellDate = new Date(row[dateColIndex]);
      const dateMatch = cellDate >= fromDateObj && cellDate <= toDateObj;
      
      // If status is provided and status column exists, filter by status too
      if (status && statusColIndex !== -1) {
        const rowStatus = row[statusColIndex].toString().trim();
        const statusMatch = rowStatus.toLowerCase() === status.toLowerCase();
        return dateMatch && statusMatch;
      }
      
      return dateMatch;
    });
    
    console.log(`Filtered ${filteredRows.length} rows from ${dataRows.length} total rows (Status: ${status || 'All'})`);
    
    return {
      headers: headers,
      rows: filteredRows,
      rowCount: filteredRows.length,
      sourceRowNumbers: filteredRows.map((_, index) => index + 2) // +2 because of header and 1-based indexing
    };
  } catch (error) {
    console.error('Error filtering data:', error);
    throw new Error('Failed to filter data: ' + error.message);
  }
}

/**
 * Validate headers between source and destination sheets
 * @param {string} sourceSpreadsheetId - Source spreadsheet ID
 * @param {string} sourceSheetName - Source sheet name
 * @param {string} destSpreadsheetId - Destination spreadsheet ID
 * @param {string} destSheetName - Destination sheet name
 * @return {Object|null} Header mismatch details or null if headers match
 */
function validateHeaders(sourceSpreadsheetId, sourceSheetName, destSpreadsheetId, destSheetName) {
  try {
    // Get source headers
    const sourceSpreadsheet = SpreadsheetApp.openById(sourceSpreadsheetId);
    const sourceSheet = sourceSpreadsheet.getSheetByName(sourceSheetName);
    
    if (!sourceSheet) {
      throw new Error(`Source sheet "${sourceSheetName}" not found`);
    }
    
    const sourceHeaders = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
    
    // Get destination headers
    const destSpreadsheet = SpreadsheetApp.openById(destSpreadsheetId);
    const destSheet = destSpreadsheet.getSheetByName(destSheetName);
    
    if (!destSheet) {
      throw new Error(`Destination sheet "${destSheetName}" not found`);
    }
    
    const destHeaders = destSheet.getRange(1, 1, 1, destSheet.getLastColumn()).getValues()[0];
    
    // Convert to strings and normalize
    const sourceHeadersStr = sourceHeaders.map(h => h.toString().trim().toUpperCase());
    const destHeadersStr = destHeaders.map(h => h.toString().trim().toUpperCase());
    const requiredHeadersStr = REQUIRED_HEADERS.map(h => h.toString().trim().toUpperCase());
    
    // Check for mismatches
    const missing = requiredHeadersStr.filter(header => !destHeadersStr.includes(header));
    const extra = destHeadersStr.filter(header => !requiredHeadersStr.includes(header));
    
    if (missing.length > 0 || extra.length > 0) {
      return {
        expected: REQUIRED_HEADERS,
        missing: missing,
        extra: extra
      };
    }
    
    return null; // Headers match
  } catch (error) {
    console.error('Error validating headers:', error);
    throw new Error('Failed to validate headers: ' + error.message);
  }
}

/**
 * Append data chunk to a sheet
 * @param {string} ssId - Spreadsheet ID
 * @param {string} sheetName - Sheet name
 * @param {Array} chunk - Array of data rows to append
 * @param {Array} headers - Array of header names for column mapping
 */
function appendDataChunk(ssId, sheetName, chunk, headers) {
  try {
    if (!ssId || !sheetName || !chunk || chunk.length === 0) {
      throw new Error('Invalid parameters for append operation');
    }
    
    const spreadsheet = SpreadsheetApp.openById(ssId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found in spreadsheet`);
    }
    
    // Get current last row
    const lastRow = sheet.getLastRow();
    const startRow = lastRow + 1;
    
    // Ensure all rows have the same number of columns
    const numCols = Math.max(headers.length, ...chunk.map(row => row.length));
    
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
 * Check for duplicate rows based on ORDER ID
 * @param {Array} newData - New data rows to check
 * @param {Array} existingData - Existing data rows in destination
 * @return {Object} Object with unique and duplicate row indices
 */
function findDuplicates(newData, existingData) {
  try {
    const existingOrderIds = new Set();
    
    // Extract existing ORDER IDs (assuming it's in column 2 based on REQUIRED_HEADERS)
    const orderIdColIndex = REQUIRED_HEADERS.indexOf('ORDER ID');
    
    if (orderIdColIndex === -1) {
      console.warn('ORDER ID column not found, skipping duplicate check');
      return {
        uniqueRows: Array.from({length: newData.length}, (_, i) => i),
        duplicateRows: []
      };
    }
    
    existingData.forEach(row => {
      if (row[orderIdColIndex]) {
        existingOrderIds.add(row[orderIdColIndex].toString().trim());
      }
    });
    
    const uniqueRows = [];
    const duplicateRows = [];
    
    newData.forEach((row, index) => {
      const orderId = row[orderIdColIndex] ? row[orderIdColIndex].toString().trim() : '';
      
      if (orderId && existingOrderIds.has(orderId)) {
        duplicateRows.push(index);
      } else {
        uniqueRows.push(index);
        if (orderId) {
          existingOrderIds.add(orderId); // Add to set to check against remaining rows
        }
      }
    });
    
    console.log(`Found ${duplicateRows.length} duplicates out of ${newData.length} rows`);
    
    return { uniqueRows, duplicateRows };
  } catch (error) {
    console.error('Error finding duplicates:', error);
    // If duplicate detection fails, return all rows as unique to avoid blocking transfer
    return {
      uniqueRows: Array.from({length: newData.length}, (_, i) => i),
      duplicateRows: []
    };
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
      status,
      mode = 'copy'
    } = transferParams;
    
    console.log(`Starting ${mode} operation from ${sourceSheetName} to ${destSheetName} (Status: ${status || 'All'})`);
    
    // Step 1: Get filtered source data
    const sourceData = getFilteredData(sourceSpreadsheetId, sourceSheetName, fromDate, toDate, status);
    
    if (sourceData.rowCount === 0) {
      return {
        success: true,
        transferredRows: 0,
        duplicatesFound: 0,
        message: 'No data found for the selected date range.'
      };
    }
    
    // Step 2: Get existing destination data for duplicate checking
    const destSpreadsheet = SpreadsheetApp.openById(destSpreadsheetId);
    const destSheet = destSpreadsheet.getSheetByName(destSheetName);
    
    if (!destSheet) {
      throw new Error(`Destination sheet "${destSheetName}" not found`);
    }
    
    const destLastRow = destSheet.getLastRow();
    let existingData = [];
    
    if (destLastRow > 1) {
      existingData = destSheet.getRange(2, 1, destLastRow - 1, destSheet.getLastColumn()).getValues();
    }
    
    // Step 3: Find duplicates
    const duplicateCheck = findDuplicates(sourceData.rows, existingData);
    const { uniqueRows, duplicateRows } = duplicateCheck;
    
    if (uniqueRows.length === 0) {
      return {
        success: true,
        transferredRows: 0,
        duplicatesFound: duplicateRows.length,
        message: 'All rows are duplicates. No data was transferred.'
      };
    }
    
    // Step 4: Prepare unique data for transfer
    const dataToTransfer = uniqueRows.map(index => sourceData.rows[index]);
    const sourceRowNumbers = uniqueRows.map(index => sourceData.sourceRowNumbers[index]);
    
    // Step 5: Transfer data in chunks
    let transferredCount = 0;
    
    for (let i = 0; i < dataToTransfer.length; i += CHUNK_SIZE) {
      const chunk = dataToTransfer.slice(i, i + CHUNK_SIZE);
      
      try {
        appendDataChunk(destSpreadsheetId, destSheetName, chunk, sourceData.headers);
        transferredCount += chunk.length;
        console.log(`Transferred chunk ${Math.floor(i / CHUNK_SIZE) + 1}, total: ${transferredCount}/${dataToTransfer.length}`);
      } catch (chunkError) {
        console.error(`Error transferring chunk ${i / CHUNK_SIZE + 1}:`, chunkError);
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
      transferredRows: transferredCount,
      duplicatesFound: duplicateRows.length,
      message: message
    };
    
  } catch (error) {
    console.error('Error executing data transfer:', error);
    return {
      success: false,
      transferredRows: 0,
      duplicatesFound: 0,
      message: 'Transfer failed: ' + error.message
    };
  }
}

/**
 * Test function to validate the setup
 * @return {Object} Test results
 */
function testSetup() {
  try {
    const spreadsheets = getSpreadsheets();
    return {
      success: true,
      message: `Setup successful. Found ${spreadsheets.length} spreadsheets.`,
      data: spreadsheets
    };
  } catch (error) {
    return {
      success: false,
      message: 'Setup test failed: ' + error.message,
      data: null
    };
  }
}