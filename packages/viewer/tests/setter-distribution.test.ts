/**
 * @file setter-distribution.test.ts
 * @description Tests for Setter Distribution analysis
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseDVW } from '@volleyvision/dvw-parser';
import {
  analyzeSetterDistribution,
  getSetterCallLabel,
  getZoneLabel,
  getEfficiencyColor,
  getArrowThickness,
} from '../src/utils/setterAnalysis';

// Load test fixture
const dvwContent = fs.readFileSync(
  path.resolve(__dirname, '../../../fixtures/boulouris-sable.dvw'),
  'utf-8'
);
const match = parseDVW(dvwContent);

describe('Setter Distribution Analysis', () => {
  const data = analyzeSetterDistribution(match, { teamSide: 'home' });

  it('analyzeSetterDistribution retourne des données pour les attaques du match', () => {
    expect(data.totalSets).toBeGreaterThan(0);
  });

  it('la distribution par zone couvre les zones principales (2, 3, 4)', () => {
    // At least some of the main zones should have attacks
    const hasMainZones =
      data.byZone.has(2) || data.byZone.has(3) || data.byZone.has(4);
    expect(hasMainZones).toBe(true);
  });

  it('les pourcentages par zone totalisent ~100%', () => {
    const totalPercentage = Array.from(data.byZone.values()).reduce(
      (sum, z) => sum + z.percentage,
      0
    );
    // Allow ±5% for rounding (each zone is individually rounded)
    expect(totalPercentage).toBeGreaterThanOrEqual(90);
    expect(totalPercentage).toBeLessThanOrEqual(110);
  });

  it("l'efficacité d'attaque est entre -1 et 1", () => {
    for (const [, zone] of data.byZone) {
      expect(zone.attackEfficiency).toBeGreaterThanOrEqual(-1);
      expect(zone.attackEfficiency).toBeLessThanOrEqual(1);
    }
  });

  it('le filtre par set réduit le nombre total', () => {
    const dataSet1 = analyzeSetterDistribution(match, {
      teamSide: 'home',
      setFilter: 1,
    });
    expect(dataSet1.totalSets).toBeLessThan(data.totalSets);
    expect(dataSet1.totalSets).toBeGreaterThan(0);
  });

  it('le filtre par qualité de réception fonctionne', () => {
    const dataRec = analyzeSetterDistribution(match, {
      teamSide: 'home',
      receptionQualityFilter: '#',
    });
    // Should have fewer or equal attacks
    expect(dataRec.totalSets).toBeLessThanOrEqual(data.totalSets);
  });

  it('getSetterCallLabel retourne le bon label', () => {
    expect(getSetterCallLabel('K0')).toBe('Passe parfaite (#)');
    expect(getSetterCallLabel('KA')).toBe('Transition après attaque adverse');
    expect(getSetterCallLabel('KB')).toBe('Free ball');
  });

  it('byRotation contient 6 rotations maximum', () => {
    expect(data.byRotation.size).toBeLessThanOrEqual(6);
  });

  it('la zone avec le plus haut count a un percentage cohérent', () => {
    const zones = Array.from(data.byZone.values());
    if (zones.length >= 2) {
      const sorted = zones.sort((a, b) => b.count - a.count);
      // The zone with the most attacks should have a higher percentage than the least
      expect(sorted[0].percentage).toBeGreaterThanOrEqual(
        sorted[sorted.length - 1].percentage
      );
    }
  });

  it('playerBreakdown contient des joueurs identifiés', () => {
    let foundPlayer = false;
    for (const [, zone] of data.byZone) {
      if (Object.keys(zone.playerBreakdown).length > 0) {
        foundPlayer = true;
        break;
      }
    }
    expect(foundPlayer).toBe(true);
  });

  it('getEfficiencyColor retourne des couleurs valides', () => {
    expect(getEfficiencyColor(0.5)).toBe('#22c55e');
    expect(getEfficiencyColor(0.3)).toBe('#f59e0b');
    expect(getEfficiencyColor(0.1)).toBe('#f97316');
    expect(getEfficiencyColor(-0.1)).toBe('#ef4444');
  });

  it('getArrowThickness est entre 1 et 8', () => {
    expect(getArrowThickness(5)).toBeGreaterThanOrEqual(1);
    expect(getArrowThickness(5)).toBeLessThanOrEqual(8);
    expect(getArrowThickness(80)).toBe(8);
    expect(getArrowThickness(0)).toBe(1);
  });

  it('getZoneLabel retourne un label descriptif', () => {
    expect(getZoneLabel(4)).toContain('avant gauche');
    expect(getZoneLabel(1)).toContain('arrière droite');
    expect(getZoneLabel(8)).toContain('Pipe');
  });

  it('analyzeSetterDistribution fonctionne aussi pour away', () => {
    const awayData = analyzeSetterDistribution(match, { teamSide: 'away' });
    expect(awayData.totalSets).toBeGreaterThan(0);
  });
});
