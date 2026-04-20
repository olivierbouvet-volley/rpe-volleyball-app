/**
 * @file setter-calls.ts
 * @description Parser for setter call definitions from [3SETTERCALL] section
 */

import type { SetterCall } from '@volleyvision/data-model';

/**
 * Parses the [3SETTERCALL] section
 * 
 * Format: CODE;;DESCRIPTION;;COLOR;COORD1;COORD2;COORD3;[POLYGON_COORDS;]COLOR2;
 * 
 * Field mapping:
 * - 0: code (2-char code like "K1", "K8", "KC")
 * - 2: description (French name)
 * 
 * @param lines - Array of setter call lines
 * @returns Array of parsed SetterCall objects
 * 
 * @example
 * ```typescript
 * const lines = [
 *   'K1;;Fixe Avant;;0;3949;4349;4952;;255;',
 *   'K8;;Middle court;;65280;0000;0000;0000;6068,6759,6739,5930,;12632256;',
 *   'KC;;Basket Mire;;32768;4159;4185;4986;;255;'
 * ];
 * const calls = parseSetterCalls(lines);
 * console.log(calls[0].code); // "K1"
 * console.log(calls[0].description); // "Fixe Avant"
 * console.log(calls[1].code); // "K8"
 * ```
 */
export function parseSetterCalls(lines: string[]): SetterCall[] {
  const calls: SetterCall[] = [];
  
  for (const line of lines) {
    const fields = line.split(';');
    
    const code = fields[0]?.trim() || '';
    if (!code) continue; // Skip empty lines
    
    const description = fields[2]?.trim() || '';
    
    calls.push({
      code,
      description,
    });
  }
  
  return calls;
}
