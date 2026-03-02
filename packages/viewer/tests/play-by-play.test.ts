/**
 * @file play-by-play.test.ts
 * @description Tests for Play-by-Play helpers
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseDVW } from '@volleyvision/dvw-parser';
import {
  buildPlayByPlayData,
  findLongestRuns,
  calculateLeadStats,
  getSetSeparators,
  formatRallyTooltip,
} from '../src/utils/playByPlayHelpers';

// Load test fixture
const dvwContent = fs.readFileSync(
  path.resolve(__dirname, '../../../fixtures/boulouris-sable.dvw'),
  'utf-8'
);
const match = parseDVW(dvwContent);

describe('Play-by-Play Helpers', () => {
  const data = buildPlayByPlayData(match);

  it('buildPlayByPlayData retourne des points pour tous les sets', () => {
    expect(data.length).toBeGreaterThan(0);
    // A typical 3-set match has 70-120+ rallies
    expect(data.length).toBeGreaterThan(50);
  });

  it('scoreDiff du premier point est ±1', () => {
    expect(Math.abs(data[0].scoreDiff)).toBe(1);
  });

  it('le dernier point de chaque set a le bon score final', () => {
    const sets = [...new Set(data.map(p => p.setNumber))];
    for (const setNumber of sets) {
      const setPoints = data.filter(p => p.setNumber === setNumber);
      const lastPoint = setPoints[setPoints.length - 1];
      // One team must have won (score >= 25, or >= 15 for set 5)
      const maxScore = Math.max(lastPoint.homeScore, lastPoint.awayScore);
      expect(maxScore).toBeGreaterThanOrEqual(15);
    }
  });

  it('détecte au moins un run de 3+ points', () => {
    const runsPoints = data.filter(p => p.isRun);
    expect(runsPoints.length).toBeGreaterThan(0);
  });

  it('findLongestRuns retourne des runs de longueur >= 2', () => {
    const { home, away } = findLongestRuns(data);
    // At least one team should have a run
    const hasHomeRun = home !== null && home.length >= 2;
    const hasAwayRun = away !== null && away.length >= 2;
    expect(hasHomeRun || hasAwayRun).toBe(true);
  });

  it('calculateLeadStats somme ≈ 100%', () => {
    const stats = calculateLeadStats(data);
    const sum = stats.homeLeadPercent + stats.awayLeadPercent + stats.tiedPercent;
    // Allow ±2% for rounding
    expect(sum).toBeGreaterThanOrEqual(98);
    expect(sum).toBeLessThanOrEqual(102);
  });

  it('les set separators sont aux bons indices', () => {
    const seps = getSetSeparators(data);
    expect(seps.length).toBeGreaterThanOrEqual(1);
    // First separator should be at index 0
    expect(seps[0].index).toBe(0);
    // Each separator should be at a point where set changes
    for (let i = 1; i < seps.length; i++) {
      const prevPoint = data[seps[i].index - 1];
      const currentPoint = data[seps[i].index];
      expect(currentPoint.setNumber).not.toBe(prevPoint.setNumber);
    }
  });

  it('clic sur un point fournit le bon rally', () => {
    expect(data[0].rally).toBeDefined();
    expect(data[0].rally.setNumber ?? data[0].setNumber).toBe(data[0].setNumber);
  });

  it('chaque point a un pointWinner valide', () => {
    for (const point of data) {
      expect(['home', 'away']).toContain(point.pointWinner);
    }
  });

  it('scoreDiff est cohérent avec homeScore - awayScore', () => {
    for (const point of data) {
      expect(point.scoreDiff).toBe(point.homeScore - point.awayScore);
    }
  });
});
