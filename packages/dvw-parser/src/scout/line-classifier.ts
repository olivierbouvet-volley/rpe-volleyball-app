/**
 * @file line-classifier.ts
 * @description Classifies DVW scout lines into types (action, point, rotation, etc.)
 */

import type { DVWLineType } from '@volleyvision/data-model';

/**
 * Classifies a scout line by its pattern
 * 
 * Classification rules (in order):
 * 1. Starts with "**" and ends with "set" → 'set-end'
 * 2. Contains ">LUp" → 'lineup' or 'rotation-init'
 * 3. Starts with [a*]P\d{2} (without >LUp) → 'player-entry'
 * 4. Pattern [a*]p\d{2}:\d{2} → 'point'
 * 5. Pattern [a*]z\d → 'rotation'
 * 6. Pattern [a*]c\d{2}:\d{2} → 'substitution'
 * 7. Pattern [a*]T → 'timeout'
 * 8. Pattern [a*]\d{2} or [a*]$$ → 'action'
 * 9. Otherwise → null
 * 
 * @param line - Raw scout line
 * @returns DVWLineType or null if unrecognized
 * 
 * @example
 * ```typescript
 * classifyLine("**1set"); // 'set-end'
 * classifyLine("*p25:20"); // 'point'
 * classifyLine("*z4"); // 'rotation'
 * classifyLine("*P13>LUp"); // 'lineup'
 * classifyLine("*z1>LUp"); // 'rotation-init'
 * classifyLine("a07AH#V5~47CH2;s;r;..."); // 'action'
 * classifyLine("*T"); // 'timeout'
 * ```
 */
export function classifyLine(line: string): DVWLineType | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  
  // Extract the action code (first field before ;)
  const actionCode = trimmed.split(';')[0];
  
  // 1. Set end: **1set, **2set, **3set
  if (actionCode.startsWith('**') && actionCode.endsWith('set')) {
    return 'set-end';
  }
  
  // 2. Lineup or rotation-init (contains >LUp)
  if (actionCode.includes('>LUp')) {
    // *P13>LUp → lineup (player)
    // *z1>LUp → rotation-init (rotation number)
    if (/^[a*]P\d{2}>LUp/.test(actionCode)) {
      return 'lineup';
    }
    if (/^[a*]z\d+>LUp/.test(actionCode)) {
      return 'rotation-init';
    }
  }
  
  // 3. Player entry (without >LUp): *P08, aP05
  if (/^[a*]P\d{2}$/.test(actionCode)) {
    return 'player-entry';
  }
  
  // 4. Point: *p25:20, ap00:01
  if (/^[a*]p\d+:\d+/.test(actionCode)) {
    return 'point';
  }
  
  // 5. Rotation: *z4, az1
  if (/^[a*]z\d+$/.test(actionCode)) {
    return 'rotation';
  }
  
  // 6. Substitution: *c08:06
  if (/^[a*]c\d{2}:\d{2}/.test(actionCode)) {
    return 'substitution';
  }
  
  // 7. Timeout: *T, aT
  if (/^[a*]T$/.test(actionCode)) {
    return 'timeout';
  }
  
  // 8. Action: *13SH+~~~16B, a07AH#V5~47CH2, a$$&H#
  // Must start with team prefix [a*] followed by player number (2 digits or $$)
  if (/^[a*](\d{2}|\$\$)/.test(actionCode)) {
    return 'action';
  }
  
  // Unrecognized pattern
  return null;
}
