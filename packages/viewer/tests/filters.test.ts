/**
 * @file filters.test.ts
 * @description Tests for Filter Engine (PROMPT 2C)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { parseDVW } from '@volleyvision/dvw-parser';
import { readFileSync } from 'fs';
import { join } from 'path';
import { applyFilters, buildPreset } from '../src/utils/filterEngine';
import { DEFAULT_CRITERIA } from '../src/store/filterStore';
import type { Match } from '@volleyvision/data-model';

// ============================================================================
// Test 1: applyFilters sans critère retourne toutes les actions
// ============================================================================

describe('Filter Engine', () => {
  let match: Match;

  beforeAll(() => {
    // Charger le fichier DVW de test
    const dvwPath = join(__dirname, '..', '..', '..', 'fixtures', 'boulouris-sable.dvw');
    const dvwContent = readFileSync(dvwPath, 'utf-8');
    match = parseDVW(dvwContent);
  });

  it('applyFilters sans critère retourne toutes les actions', () => {
    const results = applyFilters(match, DEFAULT_CRITERIA);

    // Calculer le nombre total d actions dans le match
    const totalActions = match.sets.reduce(
      (sum, set) => sum + set.rallies.reduce(
        (rallySum, rally) => rallySum + rally.actions.length,
        0
      ),
      0
    );

    expect(results.length).toBe(totalActions);
    expect(results.length).toBeGreaterThan(500); // Le fichier contient beaucoup d actions
  });

  // ============================================================================
  // Test 2: filtre par skill=attack retourne uniquement les attaques
  // ============================================================================

  it('filtre par skill=attack retourne uniquement les attaques', () => {
    const results = applyFilters(match, {
      ...DEFAULT_CRITERIA,
      skills: ['attack'],
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.action.skill === 'attack')).toBe(true);
  });

  // ============================================================================
  // Test 3: filtre par set réduit les résultats
  // ============================================================================

  it('filtre par set réduit les résultats', () => {
    const all = applyFilters(match, DEFAULT_CRITERIA);
    const set1 = applyFilters(match, {
      ...DEFAULT_CRITERIA,
      setNumbers: [1],
    });

    expect(set1.length).toBeGreaterThan(0);
    expect(set1.length).toBeLessThan(all.length);
    expect(set1.every(r => r.setNumber === 1)).toBe(true);
  });

  // ============================================================================
  // Test 4: filtre par joueur retourne ses actions uniquement
  // ============================================================================

  it('filtre par joueur retourne ses actions uniquement', () => {
    // Prendre un joueur de l équipe away
    const awayPlayer = match.awayTeam.players[0];
    const results = applyFilters(match, {
      ...DEFAULT_CRITERIA,
      playerIds: [awayPlayer.id],
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.action.player.id === awayPlayer.id)).toBe(true);
  });

  // ============================================================================
  // Test 5: filtre combiné skill+quality
  // ============================================================================

  it('filtre combiné skill+quality fonctionne', () => {
    const results = applyFilters(match, {
      ...DEFAULT_CRITERIA,
      skills: ['attack'],
      qualities: ['#'],
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r =>
      r.action.skill === 'attack' && r.action.quality === '#'
    )).toBe(true);
  });

  // ============================================================================
  // Test 6: filtre par zone de départ
  // ============================================================================

  it('filtre par startZone fonctionne', () => {
    const results = applyFilters(match, {
      ...DEFAULT_CRITERIA,
      startZones: [4],
    });

    // Certaines actions peuvent ne pas avoir de startZone
    expect(results.every(r => r.action.startZone === 4)).toBe(true);
  });

  // ============================================================================
  // Test 7: buildPreset('kills-only') retourne les bons critères
  // ============================================================================

  it('buildPreset kills-only retourne les bons critères', () => {
    const preset = buildPreset('kills-only', match);

    expect(preset.skills).toEqual(['attack']);
    expect(preset.qualities).toEqual(['#']);
  });

  // ============================================================================
  // Test 8: buildPreset avec playerId filtre par joueur
  // ============================================================================

  it('buildPreset avec playerId filtre par joueur', () => {
    const player = match.awayTeam.players[0];
    const preset = buildPreset('all-attacks', match, player.id);

    expect(preset.skills).toEqual(['attack']);
    expect(preset.playerIds).toEqual([player.id]);
  });

  // ============================================================================
  // Test 9: filtre par teamSide=home
  // ============================================================================

  it('filtre par teamSide=home retourne uniquement les actions home', () => {
    const results = applyFilters(match, {
      ...DEFAULT_CRITERIA,
      teamSide: 'home',
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.action.player.team === 'home')).toBe(true);
  });

  // ============================================================================
  // Test 10: filtre hasVideoTimestamp=true
  // ============================================================================

  it('filtre hasVideoTimestamp=true filtre les actions sans timestamp', () => {
    const results = applyFilters(match, {
      ...DEFAULT_CRITERIA,
      hasVideoTimestamp: true,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.action.videoTimestamp != null)).toBe(true);
  });

  // ============================================================================
  // Test 11: filtres vides retournent toutes les actions
  // ============================================================================

  it('filtres vides ne filtrent rien', () => {
    const emptyResults = applyFilters(match, {
      setNumbers: [],
      playerIds: [],
      teamSide: null,
      skills: [],
      qualities: [],
      attackCombos: [],
      startZones: [],
      endZones: [],
      minBlockers: null,
      maxBlockers: null,
      rotations: [],
      servingTeam: null,
      setterCalls: [],
      hasVideoTimestamp: false,
    });

    const totalActions = match.sets.reduce(
      (sum, set) => sum + set.rallies.reduce(
        (rallySum, rally) => rallySum + rally.actions.length,
        0
      ),
      0
    );

    expect(emptyResults.length).toBe(totalActions);
  });

  // ============================================================================
  // Test 12: formatMatchTime contient le set et le rally
  // ============================================================================

  it('formatMatchTime contient le set et le rally', () => {
    const results = applyFilters(match, {
      ...DEFAULT_CRITERIA,
      setNumbers: [1],
    });

    expect(results.length).toBeGreaterThan(0);

    const firstResult = results[0];
    expect(firstResult.matchTime).toContain('Set 1');
    expect(firstResult.matchTime).toContain('Rally #');
    expect(firstResult.matchTime).toMatch(/\d+-\d+/); // Score format
  });
});
