/**
 * @file header.ts
 * @description Parsers for DVW file header sections ([3DATAVOLLEYSCOUT] and [3MATCH])
 */

export interface DVWHeader {
  fileFormat: string;           // "2.0"
  software: string;             // "Data Volley Professional Release 4.03.17"
  editor: string;               // "FEDERATION FRANCAISE DE VOLLEYBALL"
  createdAt: string;            // "27/01/2026 18.13.18"
  modifiedAt: string;           // "28/01/2026 19.10.39"
}

export interface DVWMatchInfo {
  date: string;                 // ISO: "2026-01-27"
  season: string;               // "2015/2016"
  competition: string;          // "INTERPOLE SUD"
}

/**
 * Parses the [3DATAVOLLEYSCOUT] section into header metadata
 * 
 * @param lines - Array of "KEY: VALUE" formatted lines
 * @returns Parsed header information
 * 
 * @example
 * ```typescript
 * const lines = [
 *   'FILEFORMAT: 2.0',
 *   'GENERATOR-PRG: Data Volley',
 *   'GENERATOR-REL: Release 4.03.17',
 *   'GENERATOR-NAM: FEDERATION FRANCAISE DE VOLLEYBALL',
 *   'GENERATOR-DAY: 27/01/2026 18.13.18',
 *   'LASTCHANGE-DAY: 28/01/2026 19.10.39'
 * ];
 * const header = parseHeader(lines);
 * console.log(header.fileFormat); // "2.0"
 * ```
 */
export function parseHeader(lines: string[]): DVWHeader {
  const data: Record<string, string> = {};
  
  // Parse key-value pairs
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();
    data[key] = value;
  }
  
  // Extract software info
  const program = data['GENERATOR-PRG'] || '';
  const version = data['GENERATOR-VER'] || '';
  const release = data['GENERATOR-REL'] || '';
  const software = [program, version, release].filter(Boolean).join(' ');
  
  return {
    fileFormat: data['FILEFORMAT'] || '2.0',
    software,
    editor: data['GENERATOR-NAM'] || '',
    createdAt: data['GENERATOR-DAY'] || '',
    modifiedAt: data['LASTCHANGE-DAY'] || '',
  };
}

/**
 * Parses the [3MATCH] section into match metadata
 * 
 * Format: DATE;empty;SEASON;COMPETITION;...
 * Date format: DD/MM/YYYY → converted to ISO YYYY-MM-DD
 * 
 * @param lines - Array of semicolon-separated lines (typically 2 lines)
 * @returns Parsed match information
 * 
 * @example
 * ```typescript
 * const lines = ['27/01/2026;;2015/2016;INTERPOLE SUD;;;;;1252;1;Z;0;...'];
 * const info = parseMatchInfo(lines);
 * console.log(info.date); // "2026-01-27"
 * console.log(info.competition); // "INTERPOLE SUD"
 * ```
 */
export function parseMatchInfo(lines: string[]): DVWMatchInfo {
  if (lines.length === 0) {
    throw new Error('parseMatchInfo: no lines provided');
  }
  
  const firstLine = lines[0];
  const fields = firstLine.split(';');
  
  // Field 0: Date (DD/MM/YYYY)
  const dateDDMMYYYY = fields[0]?.trim() || '';
  const dateISO = convertDDMMYYYYToISO(dateDDMMYYYY);
  
  // Field 2: Season
  const season = fields[2]?.trim() || '';
  
  // Field 3: Competition
  const competition = fields[3]?.trim() || '';
  
  return {
    date: dateISO,
    season,
    competition,
  };
}

/**
 * Converts DD/MM/YYYY date format to ISO YYYY-MM-DD
 * @param dateDDMMYYYY - Date string in DD/MM/YYYY format
 * @returns ISO date string (YYYY-MM-DD)
 */
function convertDDMMYYYYToISO(dateDDMMYYYY: string): string {
  if (!dateDDMMYYYY) return '';
  
  const parts = dateDDMMYYYY.split('/');
  if (parts.length !== 3) return dateDDMMYYYY; // Return as-is if not parseable
  
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}
