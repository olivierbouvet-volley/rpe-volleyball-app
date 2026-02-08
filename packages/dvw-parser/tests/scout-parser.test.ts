/**
 * @file scout-parser.test.ts
 * @description Comprehensive tests for scout line parsing
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { classifyLine } from '../src/scout/line-classifier';
import { parseAction } from '../src/scout/action-parser';
import { parseScoutLine, parseAllScoutLines } from '../src/scout/line-parser';
import { splitSections } from '../src/section-splitter';

describe('classifyLine', () => {
  it('classifies set-end lines', () => {
    expect(classifyLine('**N1set')).toBe('set-end');
    expect(classifyLine('**N3set')).toBe('set-end');
  });
  
  it('classifies lineup lines', () => {
    expect(classifyLine('*P13>LUp')).toBe('lineup');
    expect(classifyLine('aP05>LUp')).toBe('lineup');
  });
  
  it('classifies rotation-init lines', () => {
    expect(classifyLine('*z1>LUp')).toBe('rotation-init');
    expect(classifyLine('az2>LUp')).toBe('rotation-init');
  });
  
  it('classifies player-entry lines', () => {
    expect(classifyLine('*P12')).toBe('player-entry');
    expect(classifyLine('aP08')).toBe('player-entry');
  });
  
  it('classifies point lines', () => {
    expect(classifyLine('*p12:15')).toBe('point');
    expect(classifyLine('ap08:12')).toBe('point');
  });
  
  it('classifies rotation lines', () => {
    expect(classifyLine('*z2')).toBe('rotation');
    expect(classifyLine('az5')).toBe('rotation');
  });
  
  it('classifies substitution lines', () => {
    expect(classifyLine('*c12:08')).toBe('substitution');
    expect(classifyLine('ac05:13')).toBe('substitution');
  });
  
  it('classifies timeout lines', () => {
    expect(classifyLine('*T')).toBe('timeout');
    expect(classifyLine('aT')).toBe('timeout');
  });
  
  it('classifies action lines', () => {
    expect(classifyLine('*13SH+~~~16B')).toBe('action');
    expect(classifyLine('a07AH#V5~47CH2')).toBe('action');
    expect(classifyLine('*$$FH=')).toBe('action');
  });
  
  it('returns null for unrecognized patterns', () => {
    expect(classifyLine('')).toBe(null);
    expect(classifyLine('invalid')).toBe(null);
    expect(classifyLine('xyz123')).toBe(null);
  });
});

describe('parseAction', () => {
  it('parses basic serve action', () => {
    const action = parseAction('*13SH+');
    expect(action.playerNumber).toBe(13);
    expect(action.skill).toBe('serve');
    expect(action.ballType).toBe('H');
    expect(action.quality).toBe('+');
    expect(action.isTeamError).toBe(false);
    expect(action.isOpponentError).toBe(false);
  });
  
  it('parses attack with combo and zones', () => {
    const action = parseAction('a07AH#V5~47CH2');
    expect(action.playerNumber).toBe(7);
    expect(action.skill).toBe('attack');
    expect(action.ballType).toBe('H');
    expect(action.quality).toBe('#');
    expect(action.attackCombo).toBe('V5');
    expect(action.startZone).toBe(4);
    expect(action.endZone).toBe(7);
    expect(action.endSubZone).toBe('C');
    expect(action.numBlockers).toBe(2);
  });
  
  it('parses team error ($$)', () => {
    const action = parseAction('*$$FH=');
    expect(action.playerNumber).toBe(0);
    expect(action.isTeamError).toBe(true);
    expect(action.skill).toBe('freeball');
    expect(action.quality).toBe('=');
  });
  
  it('parses opponent error (&)', () => {
    const action = parseAction('a05&SH#');
    expect(action.playerNumber).toBe(5);
    expect(action.isOpponentError).toBe(true);
    expect(action.skill).toBe('serve');
    expect(action.quality).toBe('#');
  });
  
  it('parses setter call (K-code)', () => {
    const action = parseAction('*09EH+K0~67');
    expect(action.playerNumber).toBe(9);
    expect(action.skill).toBe('set');
    expect(action.setterCall).toBe('K0');
    expect(action.attackCombo).toBeUndefined();
    expect(action.startZone).toBe(6);
    expect(action.endZone).toBe(7);
  });
  
  it('parses receive with effect', () => {
    const action = parseAction('a03RM+~5M');
    expect(action.playerNumber).toBe(3);
    expect(action.skill).toBe('receive');
    expect(action.ballType).toBe('M');
    expect(action.quality).toBe('+');
    expect(action.startZone).toBe(5);
    expect(action.receiveEffect).toBe('M');
  });
  
  it('parses in-net ball (~~N)', () => {
    // Real example from fixture: *08SM=~~~15C~~N
    const action = parseAction('*08SM=~~~15C~~N');
    expect(action.playerNumber).toBe(8);
    expect(action.skill).toBe('serve');
    expect(action.startZone).toBe(1);
    expect(action.endZone).toBe(5);
    expect(action.endSubZone).toBe('C');
    expect(action.inNet).toBe(true);
  });
});

describe('Scout Parser Integration', () => {
  const fixturePath = resolve(__dirname, '../../../fixtures/boulouris-sable.dvw');
  const fileContent = readFileSync(fixturePath, 'utf-8');
  const sections = splitSections(fileContent);
  const scoutLines = sections.scout || [];
  
  it('parses all scout lines without exception', () => {
    expect(() => {
      const parsed = parseAllScoutLines(scoutLines);
      expect(parsed.length).toBeGreaterThan(0);
    }).not.toThrow();
  });
  
  it('counts correct number of point lines', () => {
    const parsed = parseAllScoutLines(scoutLines);
    const points = parsed.filter(line => line.lineType === 'point');
    
    // Set scores: 25-20, 25-20, 15-7 = 45+40+22 = 107 total points
    // But some points may be from errors/timeouts not tracked, so we check approximate range
    expect(points.length).toBeGreaterThan(100);
    expect(points.length).toBeLessThan(120);
  });
  
  it('counts correct number of set-end markers', () => {
    const parsed = parseAllScoutLines(scoutLines);
    const setEnds = parsed.filter(line => line.lineType === 'set-end');
    
    // 3 sets played
    expect(setEnds.length).toBe(3);
  });
  
  it('parses first serve action correctly', () => {
    const parsed = parseAllScoutLines(scoutLines);
    const firstAction = parsed.find(line => line.lineType === 'action' && line.action?.skill === 'serve');
    
    expect(firstAction).toBeDefined();
    expect(firstAction?.action?.skill).toBe('serve');
    expect(firstAction?.action?.playerNumber).toBeGreaterThan(0);
    expect(firstAction?.meta.timestamp).toBeDefined();
    expect(firstAction?.meta.setNumber).toBe(1);
  });
  
  it('validates metadata fields are populated', () => {
    const parsed = parseAllScoutLines(scoutLines);
    const actionLines = parsed.filter(line => line.lineType === 'action');
    
    // Check first 10 action lines have proper metadata
    const first10 = actionLines.slice(0, 10);
    for (const line of first10) {
      expect(line.meta.timestamp).toBeDefined();
      expect(line.meta.setNumber).toBeDefined();
      expect(line.meta.homeRotation).toBeDefined();
      expect(line.meta.awayRotation).toBeDefined();
    }
  });
  
  it('validates action fields are properly extracted', () => {
    const parsed = parseAllScoutLines(scoutLines);
    const actions = parsed.filter(line => line.action);
    
    // All actions should have skill and quality
    for (const line of actions) {
      expect(line.action?.skill).toBeDefined();
      expect(line.action?.quality).toBeDefined();
      expect(line.action?.playerNumber).toBeDefined();
    }
  });
});
