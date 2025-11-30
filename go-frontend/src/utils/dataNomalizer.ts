/**
 * Data normalization utilities for AI API calls
 * Converts JSON data to more token-efficient formats (CSV/TSV)
 */

export interface NormalizedData {
  format: 'csv' | 'tsv' | 'json';
  data: string;
  rowCount: number;
  columnCount: number;
  tokenEstimate: number;
}

/**
 * Converts any data structure to CSV format for AI analysis
 * Significantly reduces token usage compared to JSON
 */
export function normalizeDataForAI(data: any, maxRows: number = 100): NormalizedData {
  if (!data) {
    return {
      format: 'csv',
      data: '',
      rowCount: 0,
      columnCount: 0,
      tokenEstimate: 0
    };
  }

  // Handle array data (most common case)
  if (Array.isArray(data)) {
    return normalizeArrayToCSV(data, maxRows);
  }

  // Handle single object
  if (typeof data === 'object') {
    return normalizeObjectToCSV(data);
  }

  // Handle primitive values
  return {
    format: 'csv',
    data: String(data),
    rowCount: 1,
    columnCount: 1,
    tokenEstimate: estimateTokens(String(data))
  };
}

/**
 * Convert array of objects to CSV format
 */
function normalizeArrayToCSV(data: any[], maxRows: number): NormalizedData {
  if (data.length === 0) {
    return {
      format: 'csv',
      data: '',
      rowCount: 0,
      columnCount: 0,
      tokenEstimate: 0
    };
  }

  // Get all unique columns from all objects
  const columns = getUniqueColumns(data);
  
  // Limit the number of rows to prevent excessive token usage
  const limitedData = data.slice(0, maxRows);
  
  // Create CSV header
  const header = columns.join(',');
  
  // Create CSV rows
  const rows = limitedData.map(item => 
    columns.map(col => {
      const value = getNestedValue(item, col);
      return formatCSVValue(value);
    }).join(',')
  );

  // Combine header and rows
  const csvData = [header, ...rows].join('\n');
  
  // Add metadata if we truncated the data
  let finalData = csvData;
  if (data.length > maxRows) {
    finalData = `# Data truncated to ${maxRows} rows out of ${data.length} total rows\n` + csvData;
  }

  return {
    format: 'csv',
    data: finalData,
    rowCount: limitedData.length,
    columnCount: columns.length,
    tokenEstimate: estimateTokens(finalData)
  };
}

/**
 * Convert single object to CSV format
 */
function normalizeObjectToCSV(data: any): NormalizedData {
  const flattened = flattenObject(data);
  const keys = Object.keys(flattened);
  const values = Object.values(flattened);

  const header = keys.join(',');
  const row = values.map(v => formatCSVValue(v)).join(',');
  const csvData = header + '\n' + row;

  return {
    format: 'csv',
    data: csvData,
    rowCount: 1,
    columnCount: keys.length,
    tokenEstimate: estimateTokens(csvData)
  };
}

/**
 * Get all unique column names from array of objects
 */
function getUniqueColumns(data: any[]): string[] {
  const columnSet = new Set<string>();
  
  // Sample first few objects to get column names efficiently
  const sampleSize = Math.min(data.length, 10);
  for (let i = 0; i < sampleSize; i++) {
    const flattened = flattenObject(data[i]);
    Object.keys(flattened).forEach(key => columnSet.add(key));
  }
  
  return Array.from(columnSet).sort();
}

/**
 * Flatten nested objects for CSV conversion
 */
function flattenObject(obj: any, prefix: string = ''): Record<string, any> {
  const flattened: Record<string, any> = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // Recursive flattening for nested objects
        Object.assign(flattened, flattenObject(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    }
  }
  
  return flattened;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : '';
  }, obj);
}

/**
 * Format value for CSV (handle quotes, commas, etc.)
 */
function formatCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  
  // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  
  return str;
}

/**
 * Rough token estimation (1 token ≈ 4 characters on average)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Convert normalized data back to a format suitable for AI prompt
 */
export function createDataPrompt(normalized: NormalizedData): string {
  if (!normalized.data) {
    return 'No data available.';
  }

  let prompt = '';
  
  if (normalized.format === 'csv') {
    prompt = `Data in CSV format (${normalized.rowCount} rows, ${normalized.columnCount} columns):\n\n`;
    prompt += normalized.data;
  } else {
    prompt = normalized.data;
  }
  
  return prompt;
}

/**
 * Get data efficiency metrics for comparison
 */
export function getCompressionMetrics(originalData: any, normalizedData: NormalizedData): {
  originalSize: number;
  normalizedSize: number;
  compressionRatio: number;
  tokenSavings: number;
} {
  const originalJson = JSON.stringify(originalData, null, 2);
  const originalSize = originalJson.length;
  const normalizedSize = normalizedData.data.length;
  
  return {
    originalSize,
    normalizedSize,
    compressionRatio: originalSize > 0 ? normalizedSize / originalSize : 0,
    tokenSavings: Math.ceil(originalSize / 4) - normalizedData.tokenEstimate
  };
}