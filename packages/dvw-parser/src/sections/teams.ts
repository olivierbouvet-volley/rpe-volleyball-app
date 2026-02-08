/**
 * @file teams.ts
 * @description Parsers for team and player data from [3TEAMS] and [3PLAYERS-H/V] sections
 */

import type { Team, Player } from '@volleyvision/data-model';

/**
 * Parses the [3TEAMS] section (2 lines: home and away teams)
 * 
 * Format: CODE;NAME;?;COACH;ASSISTANT_COACH;FED_ID;HEX_NAME;...
 * 
 * @param teamLines - Array of 2 lines (home, away)
 * @returns Object with home and away team info
 * 
 * @example
 * ```typescript
 * const lines = [
 *   'BOU;POLE BOULOURIS;2;VIAL FABRICE;LAVAL LAURENT;16016139;...',
 *   'SAB;POLE SABLE;0;BOUVET OLIVIER;;15728880;...'
 * ];
 * const { home, away } = parseTeams(lines);
 * console.log(home.name); // "POLE BOULOURIS"
 * console.log(home.coach); // "VIAL FABRICE"
 * console.log(away.assistantCoach); // undefined (empty field)
 * ```
 */
export function parseTeams(teamLines: string[]): {
  home: Pick<Team, 'name' | 'code' | 'coach' | 'assistantCoach'>;
  away: Pick<Team, 'name' | 'code' | 'coach' | 'assistantCoach'>;
} {
  if (teamLines.length < 2) {
    throw new Error('parseTeams: expected 2 lines (home, away)');
  }
  
  const homeFields = teamLines[0].split(';');
  const awayFields = teamLines[1].split(';');
  
  return {
    home: {
      code: homeFields[0]?.trim() || '',
      name: homeFields[1]?.trim() || '',
      coach: homeFields[3]?.trim() || undefined,
      assistantCoach: homeFields[4]?.trim() || undefined,
    },
    away: {
      code: awayFields[0]?.trim() || '',
      name: awayFields[1]?.trim() || '',
      coach: awayFields[3]?.trim() || undefined,
      assistantCoach: awayFields[4]?.trim() || undefined,
    },
  };
}

/**
 * Parses player lines from [3PLAYERS-H] or [3PLAYERS-V]
 * 
 * Format (21+ fields):
 * TEAM;JERSEY;INDEX;ROT_SET1;ROT_SET2;ROT_SET3;;;ABBR;LAST;FIRST;;POSITION;ROLE_CODE;STARTER;...
 * 
 * Field mapping:
 * - 0: team index (0=home, 1=away) — ignored (we use `side` param)
 * - 1: jersey number → player.number
 * - 8: abbreviation (e.g., "PRO-JUL")
 * - 9: last name → player.lastName
 * - 10: first name → player.firstName
 * - 12: "L" if libero, empty otherwise → player.isLibero
 * 
 * Player ID format: `${side}-${jerseyNumber}` (e.g., "away-7")
 * 
 * @param playerLines - Array of player data lines
 * @param side - 'home' or 'away'
 * @returns Array of parsed Player objects
 * 
 * @example
 * ```typescript
 * const lines = [
 *   '1;7;19;6;5;6;;;PRO-JUL;PROU;JULIA;;;2;False;;;...',
 *   '1;2;14;;*;*;;;ZIM-MEL;ZIMAGLIA;MELINA;;L;1;False;;;...'
 * ];
 * const players = parsePlayers(lines, 'away');
 * console.log(players[0].id); // "away-7"
 * console.log(players[0].lastName); // "PROU"
 * console.log(players[1].isLibero); // true
 * ```
 */
export function parsePlayers(
  playerLines: string[],
  side: 'home' | 'away'
): Player[] {
  const players: Player[] = [];
  
  for (const line of playerLines) {
    const fields = line.split(';');
    
    // Extract fields
    const jerseyNumber = parseInt(fields[1] || '0', 10);
    const lastName = fields[9]?.trim() || '';
    const firstName = fields[10]?.trim() || '';
    const positionField = fields[12]?.trim() || '';
    const isLibero = positionField === 'L';
    
    // Generate player ID
    const id = `${side}-${jerseyNumber}`;
    
    // Determine position
    let position: Player['position'] = 'unknown';
    if (isLibero) {
      position = 'LIB';
    }
    // Note: DVW doesn't provide detailed position info (OH, OPP, MB, SET)
    // This would need to be inferred or added manually
    
    players.push({
      id,
      number: jerseyNumber,
      firstName,
      lastName,
      position,
      isLibero,
    });
  }
  
  return players;
}
