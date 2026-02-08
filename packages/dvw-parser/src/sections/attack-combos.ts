/**
 * @file attack-combos.ts
 * @description Parser for attack combination definitions from [3ATTACKCOMBINATION] section
 */

import type { AttackCombination } from '@volleyvision/data-model';

/**
 * Parses the [3ATTACKCOMBINATION] section
 * 
 * Format: CODE;ZONE;SIDE;TEMPO;DESCRIPTION;;COLOR;COORDS;POSITION_CAT;;
 * 
 * Field mapping:
 * - 0: code (2-char code like "CA", "V5", "Z1")
 * - 1: startZone (1-9, may be empty)
 * - 2: side ("L"=Left, "R"=Right, "C"=Center)
 * - 3: tempo ("Q"=Quick, "H"=High, "T"=Tempo, "O"=Other, "U"=Unknown)
 * - 4: description (English name)
 * - 8: positionCategory ("F"=Front, "B"=Back, "C"=Center, "P"=Pipe, "-"=Other)
 * 
 * @param lines - Array of attack combination lines
 * @returns Array of parsed AttackCombination objects
 * 
 * @example
 * ```typescript
 * const lines = [
 *   'CA;3;L;Q;Fix back / tete;;8388608;4857;C;;',
 *   'V5;4;R;H;Hight set in 4;;32896;4713;F;;',
 *   'Z1;8;C;T;Pipe;;8421504;3650;P;1;'
 * ];
 * const combos = parseAttackCombinations(lines);
 * console.log(combos[0].code); // "CA"
 * console.log(combos[0].startZone); // 3
 * console.log(combos[0].side); // "L"
 * console.log(combos[0].tempo); // "Q"
 * console.log(combos[2].positionCategory); // "P" (Pipe)
 * ```
 */
export function parseAttackCombinations(lines: string[]): AttackCombination[] {
  const combos: AttackCombination[] = [];
  
  for (const line of lines) {
    const fields = line.split(';');
    
    const code = fields[0]?.trim() || '';
    if (!code) continue; // Skip empty lines
    
    const startZoneStr = fields[1]?.trim();
    const startZone = startZoneStr ? parseInt(startZoneStr, 10) : undefined;
    
    const sideStr = fields[2]?.trim() as 'L' | 'R' | 'C' | '';
    const side = sideStr || undefined;
    
    const tempoStr = fields[3]?.trim() as 'Q' | 'H' | 'T' | 'O' | 'U' | '';
    const tempo = tempoStr || undefined;
    
    const description = fields[4]?.trim() || '';
    
    const positionCategoryStr = fields[8]?.trim() as 'F' | 'B' | 'C' | 'P' | '-' | '';
    const positionCategory = positionCategoryStr || undefined;
    
    combos.push({
      code,
      description,
      startZone: isNaN(startZone!) ? undefined : startZone,
      side,
      tempo,
      positionCategory,
    });
  }
  
  return combos;
}
