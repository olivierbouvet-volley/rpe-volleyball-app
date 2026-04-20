/**
 * @file line-parser.ts
 * @description Orchestrates parsing of all scout line types
 */

import { classifyLine } from './line-classifier';
import { parseAction } from './action-parser';
import { parseMeta, DVWLineMeta } from './meta-parser';
import type { DVWAction, DVWLineType } from '@volleyvision/data-model';

/**
 * Parsed scout line with all extracted data
 */
export interface DVWScoutLine {
  lineNumber: number;
  rawLine: string;
  lineType: DVWLineType;
  actionCode: string;
  meta: DVWLineMeta;
  
  // Type-specific fields
  action?: DVWAction;
  homeScore?: number;
  awayScore?: number;
  rotation?: number;
  playerOut?: number;
  playerIn?: number;
  setNumber?: number;
  timeout?: boolean;
  homeLineup?: number[];
  awayLineup?: number[];
  homeRotationInit?: number[];
  awayRotationInit?: number[];
  playerEntry?: {
    team: 'home' | 'away';
    playerNumber: number;
  };
}

/**
 * Parses a single scout line into structured data
 * 
 * @param rawLine - Raw scout line from DVW file
 * @param lineNumber - Line number for debugging
 * @returns Parsed line or null if unparseable
 * 
 * @example
 * ```typescript
 * const line = "*13SH+~~~16B;;;;;;;18.17.04;1;1;2;1;72;;13;9;2;8;5;3;3;5;9;17;16;7;";
 * const parsed = parseScoutLine(line, 108);
 * console.log(parsed.lineType); // "action"
 * console.log(parsed.action?.skill); // "serve"
 * console.log(parsed.meta.timestamp); // "18.17.04"
 * ```
 */
export function parseScoutLine(rawLine: string, lineNumber: number): DVWScoutLine | null {
  try {
    // Split by semicolon
    const fields = rawLine.split(';');
    const actionCode = fields[0]?.trim() || '';
    
    if (!actionCode) {
      return null;
    }
    
    // Classify line type
    const lineType = classifyLine(actionCode);
    if (!lineType) {
      console.warn(`[line-parser] Could not classify line ${lineNumber}: ${actionCode}`);
      return null;
    }
    
    // Parse metadata (common to all lines)
    const meta = parseMeta(fields);
    
    // Base result
    const result: DVWScoutLine = {
      lineNumber,
      rawLine,
      lineType,
      actionCode,
      meta,
    };
    
    // Parse type-specific data
    switch (lineType) {
      case 'action': {
        const action = parseAction(actionCode);
        result.action = action;
        break;
      }
      
      case 'point': {
        // Extract scores: [a*]p12:15
        // Format: the scores are ALWAYS in order home:away, regardless of who scored
        // The prefix (* or a) indicates which team scored the point
        const match = actionCode.match(/[a*]p(\d+):(\d+)/);
        if (match) {
          const [, score1, score2] = match;
          result.homeScore = parseInt(score1, 10);
          result.awayScore = parseInt(score2, 10);
        }
        break;
      }
      
      case 'rotation': {
        // Extract rotation: [a*]z2
        const match = actionCode.match(/[a*]z(\d)/);
        if (match) {
          result.rotation = parseInt(match[1], 10);
        }
        break;
      }
      
      case 'substitution': {
        // Extract players: [a*]c12:08
        const match = actionCode.match(/[a*]c(\d{2}):(\d{2})/);
        if (match) {
          result.playerOut = parseInt(match[1], 10);
          result.playerIn = parseInt(match[2], 10);
        }
        break;
      }
      
      case 'set-end': {
        // Extract set number: **N3set
        const match = actionCode.match(/\*\*N(\d)/);
        if (match) {
          result.setNumber = parseInt(match[1], 10);
        }
        break;
      }
      
      case 'timeout': {
        result.timeout = true;
        break;
      }
      
      case 'lineup': {
        // Extract lineups from >LUp section: *01P01;a03P06;
        const lineupParts = actionCode.split(';').filter(p => p.includes('>LUp'));
        const homeLineup: number[] = [];
        const awayLineup: number[] = [];
        
        for (const part of lineupParts) {
          const matches = part.matchAll(/([a*])(\d{2})P(\d{2})/g);
          for (const match of matches) {
            const [, team, , playerNum] = match;
            const playerNumber = parseInt(playerNum, 10);
            if (team === '*') {
              homeLineup.push(playerNumber);
            } else {
              awayLineup.push(playerNumber);
            }
          }
        }
        
        result.homeLineup = homeLineup.length > 0 ? homeLineup : undefined;
        result.awayLineup = awayLineup.length > 0 ? awayLineup : undefined;
        break;
      }
      
      case 'rotation-init': {
        // Extract rotation positions from >LUp section: *01z1;a03z2;
        const rotParts = actionCode.split(';').filter(p => p.includes('>LUp'));
        const homeRotation: number[] = [];
        const awayRotation: number[] = [];
        
        for (const part of rotParts) {
          const matches = part.matchAll(/([a*])(\d{2})z(\d)/g);
          for (const match of matches) {
            const [, team, playerNum, ] = match;
            const playerNumber = parseInt(playerNum, 10);
            if (team === '*') {
              homeRotation.push(playerNumber);
            } else {
              awayRotation.push(playerNumber);
            }
          }
        }
        
        result.homeRotationInit = homeRotation.length > 0 ? homeRotation : undefined;
        result.awayRotationInit = awayRotation.length > 0 ? awayRotation : undefined;
        break;
      }
      
      case 'player-entry': {
        // Extract player entry: [a*]P12
        const match = actionCode.match(/([a*])P(\d{2})/);
        if (match) {
          const [, team, playerNum] = match;
          result.playerEntry = {
            team: team === '*' ? 'home' : 'away',
            playerNumber: parseInt(playerNum, 10),
          };
        }
        break;
      }
    }
    
    return result;
    
  } catch (error) {
    console.warn(`[line-parser] Error parsing line ${lineNumber}:`, error);
    return null;
  }
}

/**
 * Parses all scout lines from the [3SCOUT] section
 * 
 * @param lines - Array of raw scout lines
 * @returns Array of parsed scout lines (nulls filtered out)
 * 
 * @example
 * ```typescript
 * const scoutLines = sections['3SCOUT'] || [];
 * const parsed = parseAllScoutLines(scoutLines);
 * console.log(`Parsed ${parsed.length} lines`);
 * const actions = parsed.filter(l => l.lineType === 'action');
 * console.log(`Found ${actions.length} actions`);
 * ```
 */
export function parseAllScoutLines(lines: string[]): DVWScoutLine[] {
  const parsed: DVWScoutLine[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) {
      continue;
    }
    
    const parsedLine = parseScoutLine(line, i + 1);
    if (parsedLine) {
      parsed.push(parsedLine);
    }
  }
  
  return parsed;
}
