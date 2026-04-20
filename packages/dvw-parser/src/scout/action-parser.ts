/**
 * @file action-parser.ts
 * @description Parses DVW action codes into structured DVWAction objects
 */

import type { DVWAction, Skill, BallType, QualityPro, ReceiveEffect } from '@volleyvision/data-model';
import { SKILL_CODE_MAP } from '@volleyvision/data-model';

/**
 * Parses a DVW action code into a structured DVWAction object
 * 
 * Format: {team}{player}{&?}{skill}{ballType}{quality}{combo?}~{zones}{extras}
 * 
 * Examples:
 * - "a07AH#V5~47CH2" → attack, player 7, quality #, combo V5, zones 4→7, subzone C, 2 blockers
 * - "*13SM-~~~16C" → serve, player 13, quality -, zones ?→1→6, subzone C
 * - "a$$&H#" → team error, opponent error flag
 * 
 * @param actionCode - The action code (first field before ;)
 * @returns Parsed DVWAction object
 * 
 * @example
 * ```typescript
 * const action = parseAction("a07AH#V5~47CH2");
 * console.log(action.playerNumber); // 7
 * console.log(action.skill); // 'attack'
 * console.log(action.quality); // '#'
 * console.log(action.attackCombo); // 'V5'
 * console.log(action.startZone); // 4
 * console.log(action.endZone); // 7
 * console.log(action.numBlockers); // 2
 * ```
 */
export function parseAction(actionCode: string): DVWAction {
  let pos = 0;
  
  // Extract team prefix (position 0)
  const teamPrefix = actionCode[pos];
  pos++;
  
  // Extract player number (positions 1-2)
  const playerStr = actionCode.substring(pos, pos + 2);
  const isTeamError = playerStr === '$$';
  const playerNumber = isTeamError ? 0 : parseInt(playerStr, 10);
  pos += 2;
  
  // Check for opponent error flag (position 3)
  const isOpponentError = actionCode[pos] === '&';
  if (isOpponentError) {
    pos++;
  }
  
  // Extract skill code (next character)
  // Special case: team errors with opponent error ($$&) skip skill code
  let skill: Skill = 'serve';
  let ballType: BallType = 'H';
  let quality: QualityPro = '!';
  
  if (isTeamError && isOpponentError) {
    // For $$&, no skill code, goes straight to ball type
    skill = 'freeball'; // Default to freeball for team errors
    const ballTypeChar = actionCode[pos] as BallType;
    ballType = ['H', 'M', 'Q', 'T', 'O', 'U'].includes(ballTypeChar) 
      ? ballTypeChar 
      : 'H';
    pos++;
  } else {
    // Normal case: extract skill, ball type, quality
    const skillCode = actionCode[pos];
    skill = SKILL_CODE_MAP[skillCode] || 'serve';
    pos++;
    
    const ballTypeChar = actionCode[pos] as BallType;
    ballType = ['H', 'M', 'Q', 'T', 'O', 'U'].includes(ballTypeChar) 
      ? ballTypeChar 
      : 'H';
    pos++;
  }
  
  // Extract quality (next character)
  const qualityChar = actionCode[pos] as QualityPro;
  quality = ['#', '+', '!', '-', '/', '='].includes(qualityChar)
    ? qualityChar
    : '!';
  pos++;
  
  // Extract attack combo or setter call (next 2 characters, if not ~ or end)
  let attackCombo: string | undefined;
  let setterCall: string | undefined;
  
  if (pos < actionCode.length && actionCode[pos] !== '~') {
    const comboCode = actionCode.substring(pos, pos + 2);
    if (comboCode.length === 2) {
      // Setter calls start with 'K'
      if (comboCode[0] === 'K') {
        setterCall = comboCode;
      } else {
        attackCombo = comboCode;
      }
      pos += 2;
    }
  }
  
  // Find the tilde separator(s) for zones
  const tildeIndex = actionCode.indexOf('~', pos);
  if (tildeIndex === -1) {
    // No zones section
    return {
      playerNumber,
      isTeamError,
      isOpponentError,
      skill,
      ballType,
      quality,
      attackCombo,
      setterCall,
      modifiers: {},
    };
  }
  
  pos = tildeIndex + 1;
  
  // Parse zones section
  let startZone: number | undefined;
  let endZone: number | undefined;
  let endSubZone: string | undefined;
  let endEffect: string | undefined;
  let numBlockers: number | undefined;
  let inNet = false;
  let receiveEffect: ReceiveEffect | undefined;
  
  // Zones can be:
  // - "~~~" or "~~~~" = no zones
  // - "XX" = two digits (startZone, endZone)
  // - Single digit = endZone only
  // Special case: "~~N" = in net (before zones or instead of zones)
  
  // Check for ~~N FIRST (before skipping tildes)
  const zonesSection = actionCode.substring(tildeIndex);
  if (zonesSection.startsWith('~~~N')) {
    inNet = true;
    pos = tildeIndex + 4; // Skip ~, ~, ~, N
  } else {
    // Skip leading tildes
    while (pos < actionCode.length && actionCode[pos] === '~') {
      pos++;
    }
    
    // Extract zone digits
    let zoneStr = '';
    while (pos < actionCode.length && /\d/.test(actionCode[pos])) {
      zoneStr += actionCode[pos];
      pos++;
    }
    
    if (zoneStr.length === 2) {
      startZone = parseInt(zoneStr[0], 10);
      endZone = parseInt(zoneStr[1], 10);
    } else if (zoneStr.length === 1) {
      // Single digit - for receives, this is the startZone; for attacks, it's the endZone
      if (skill === 'receive' || skill === 'dig') {
        startZone = parseInt(zoneStr[0], 10);
      } else {
        endZone = parseInt(zoneStr[0], 10);
      }
    }
    
    // Extract sub-zone (A-D)
    if (pos < actionCode.length && /[A-D]/.test(actionCode[pos])) {
      endSubZone = actionCode[pos];
      pos++;
    }
    
    // Check for ~~N AFTER zones/subzones (like ~~~15C~~N)
    if (pos < actionCode.length && actionCode.substring(pos, pos + 3) === '~~N') {
      inNet = true;
      pos += 3;
    } else {
      // Extract end effect or receive effect (single char after subzone) only if not ~~N
      if (pos < actionCode.length && /[A-Z]/.test(actionCode[pos])) {
        const effectChar = actionCode[pos];
        
        // Check if it's a receive effect
        if (['M', 'W', 'L', 'R', 'O'].includes(effectChar)) {
          receiveEffect = effectChar as ReceiveEffect;
        } else {
          endEffect = effectChar;
        }
        pos++;
      }
    }
    
    // After all special patterns, skip any remaining tildes
    while (pos < actionCode.length && actionCode[pos] === '~') {
      pos++;
    }
    
    // Extract number of blockers (0-3)
    if (pos < actionCode.length && /\d/.test(actionCode[pos])) {
      numBlockers = parseInt(actionCode[pos], 10);
    }
  }
  
  return {
    playerNumber,
    isTeamError,
    isOpponentError,
    skill,
    ballType,
    quality,
    attackCombo,
    setterCall,
    startZone,
    endZone,
    endSubZone,
    endEffect,
    numBlockers,
    receiveEffect,
    inNet,
    modifiers: {},
  };
}
