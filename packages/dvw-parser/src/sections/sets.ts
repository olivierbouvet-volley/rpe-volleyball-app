/**
 * @file sets.ts
 * @description Parser for set scores from [3SET] section
 */

import type { SetData, TeamSide } from '@volleyvision/data-model';

/**
 * Parses the [3SET] section (5 lines, one per potential set)
 * 
 * Format: True; 8- 5;13-16;21-19;25-20;25;
 * - "True" = set was played
 * - Scores at 8, 16, 21 points (format may have spaces like " 8- 5")
 * - Final score (field 4): "25-20"
 * - Losing team score alone (field 5): "25" or "23"
 * 
 * Only sets with a valid final score are included in the result.
 * 
 * @param setLines - Array of exactly 5 lines (one per set)
 * @returns Array of parsed SetData (only for played sets)
 * 
 * @example
 * ```typescript
 * const lines = [
 *   'True; 8- 5;13-16;21-19;25-20;25;',
 *   'True; 2- 8;16-15;21-15;25-20;23;',
 *   'True; 8- 3;;;15- 7;;',
 *   'True;;;;;;',
 *   'True;;;;;;'
 * ];
 * const sets = parseSets(lines);
 * console.log(sets.length); // 3
 * console.log(sets[0].homeScore); // 25
 * console.log(sets[0].awayScore); // 20
 * console.log(sets[2].homeScore); // 15
 * console.log(sets[2].awayScore); // 7
 * ```
 */
export function parseSets(setLines: string[]): SetData[] {
  const sets: SetData[] = [];
  
  for (let i = 0; i < setLines.length; i++) {
    const line = setLines[i];
    const fields = line.split(';');
    
    // Check if set was played
    const played = fields[0]?.trim() === 'True';
    if (!played) continue;
    
    // Extract final score (field 4)
    const finalScoreStr = fields[4]?.trim() || '';
    if (!finalScoreStr) continue; // No final score = set not played
    
    // Parse final score (format: "25-20" or "15-7")
    const scoreParts = finalScoreStr.split('-').map(s => s.trim());
    if (scoreParts.length !== 2) continue;
    
    const score1 = parseInt(scoreParts[0], 10);
    const score2 = parseInt(scoreParts[1], 10);
    
    if (isNaN(score1) || isNaN(score2)) continue;
    
    // Determine winner (higher score wins)
    const homeScore = score1;
    const awayScore = score2;
    const winner: TeamSide = homeScore > awayScore ? 'home' : 'away';
    
    // Extract partial scores (at 8, 16, 21 points)
    const at8 = fields[1]?.trim() || undefined;
    const at16 = fields[2]?.trim() || undefined;
    const at21 = fields[3]?.trim() || undefined;
    
    sets.push({
      number: i + 1, // Set number: 1-indexed
      homeScore,
      awayScore,
      winner,
      partialScores: {
        at8,
        at16,
        at21,
      },
      rallies: [], // Will be populated later by rally builder
    });
  }
  
  return sets;
}
