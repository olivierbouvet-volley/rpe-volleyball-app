/**
 * @file meta-parser.ts
 * @description Parses metadata fields from DVW scout lines
 */

/**
 * Metadata extracted from a scout line
 */
export interface DVWLineMeta {
  timestamp?: string;          // HH.MM.SS
  setNumber?: number;
  homeRotation?: number;
  awayRotation?: number;
  videoSeconds?: number;
  homePositions?: number[];
  awayPositions?: number[];
  modifiers: {
    skillFocus?: boolean;
    pointScored?: boolean;
    rallyContinuation?: boolean;
  };
}

/**
 * Parses metadata fields from a scout line
 * 
 * Field layout (after splitting by ;):
 * [0] = action code (already parsed)
 * [1-6] = modifiers (s, r, p, or empty)
 * [7] = timestamp HH.MM.SS
 * [8] = set number
 * [9] = home rotation (1-6)
 * [10] = away rotation (1-6)
 * [11] = ? (always 1)
 * [12] = video frame/seconds
 * [13] = empty
 * [14-19] = home positions P1-P6 (player numbers)
 * [20-25] = away positions P1-P6 (player numbers)
 * 
 * @param fields - Array of semicolon-separated fields
 * @returns Parsed metadata object
 * 
 * @example
 * ```typescript
 * const line = "*13SH+~~~16B;;;;;;;18.17.04;1;1;2;1;72;;13;9;2;8;5;3;3;5;9;17;16;7;";
 * const fields = line.split(';');
 * const meta = parseMeta(fields);
 * console.log(meta.timestamp); // "18.17.04"
 * console.log(meta.setNumber); // 1
 * console.log(meta.homeRotation); // 1
 * console.log(meta.awayRotation); // 2
 * console.log(meta.videoSeconds); // 72
 * console.log(meta.homePositions); // [13, 9, 2, 8, 5, 3]
 * console.log(meta.awayPositions); // [3, 5, 9, 17, 16, 7]
 * ```
 */
export function parseMeta(fields: string[]): DVWLineMeta {
  // Parse modifiers (fields 1-6)
  const modifiers: DVWLineMeta['modifiers'] = {};
  for (let i = 1; i <= 6; i++) {
    const mod = fields[i]?.trim();
    if (mod === 's') modifiers.skillFocus = true;
    if (mod === 'p') modifiers.pointScored = true;
    if (mod === 'r') modifiers.rallyContinuation = true;
  }
  
  // Parse timestamp (field 7)
  const timestamp = fields[7]?.trim() || undefined;
  
  // Parse set number (field 8)
  const setNumberStr = fields[8]?.trim();
  const setNumber = setNumberStr ? parseInt(setNumberStr, 10) : undefined;
  
  // Parse home rotation (field 9)
  const homeRotationStr = fields[9]?.trim();
  const homeRotation = homeRotationStr ? parseInt(homeRotationStr, 10) : undefined;
  
  // Parse away rotation (field 10)
  const awayRotationStr = fields[10]?.trim();
  const awayRotation = awayRotationStr ? parseInt(awayRotationStr, 10) : undefined;
  
  // Parse video seconds (field 12)
  const videoSecondsStr = fields[12]?.trim();
  const videoSeconds = videoSecondsStr ? parseInt(videoSecondsStr, 10) : undefined;
  
  // Parse home positions (fields 14-19)
  const homePositions: number[] = [];
  for (let i = 14; i <= 19; i++) {
    const posStr = fields[i]?.trim();
    if (posStr) {
      homePositions.push(parseInt(posStr, 10));
    }
  }
  
  // Parse away positions (fields 20-25)
  const awayPositions: number[] = [];
  for (let i = 20; i <= 25; i++) {
    const posStr = fields[i]?.trim();
    if (posStr) {
      awayPositions.push(parseInt(posStr, 10));
    }
  }
  
  return {
    timestamp,
    setNumber,
    homeRotation,
    awayRotation,
    videoSeconds,
    homePositions: homePositions.length > 0 ? homePositions : undefined,
    awayPositions: awayPositions.length > 0 ? awayPositions : undefined,
    modifiers,
  };
}
