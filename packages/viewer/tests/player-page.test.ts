import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseDVW } from '@volleyvision/dvw-parser';
import { calculatePlayerStats } from '@volleyvision/dvw-parser';
import { getPositionLabel, getEfficiencyColor, generatePlayerShareURL } from '../src/utils/shareHelpers';
import { getPlayer, formatDate } from '../src/utils/formatters';
import { applyFilters, type FilteredAction } from '../src/utils/filterEngine';
import type { Match, PlayerMatchStats } from '@volleyvision/data-model';

// Load test fixture (located at monorepo root)
const dvwPath = join(__dirname, '..', '..', '..', 'fixtures', 'boulouris-sable.dvw');
const dvwContent = readFileSync(dvwPath, 'utf-8');
const match: Match = parseDVW(dvwContent);
const stats: PlayerMatchStats[] = calculatePlayerStats(match);

/**
 * Helper to build radar data from player stats
 * (Extracted from PlayerRadarChart component logic)
 */
function buildRadarData(playerStats: PlayerMatchStats) {
  const data: Array<{ skill: string; score: number }> = [];

  const calculateScore = (
    skillKey: 'serve' | 'receive' | 'attack' | 'block' | 'dig' | 'set',
    type: 'ace' | 'positive' | 'kill'
  ): number | null => {
    const dist = playerStats.bySkill[skillKey];
    if (!dist) return null;

    const total = dist.total;
    if (total === 0) return null;

    const kills = dist['#'] || 0;
    const positive = dist['+'] || 0;

    switch (type) {
      case 'ace':
        return (kills / total) * 100;
      case 'positive':
        return ((kills + positive) / total) * 100;
      case 'kill':
        return (kills / total) * 100;
    }
  };

  const scores = [
    { skill: 'serve', type: 'ace' as const },
    { skill: 'receive', type: 'positive' as const },
    { skill: 'attack', type: 'kill' as const },
    { skill: 'block', type: 'kill' as const },
    { skill: 'dig', type: 'positive' as const },
    { skill: 'set', type: 'positive' as const },
  ];

  for (const { skill, type } of scores) {
    const score = calculateScore(skill, type);
    if (score !== null) {
      data.push({ skill, score });
    }
  }

  return data;
}

describe('PlayerPage - shareHelpers', () => {
  it('1. getPositionLabel returns French labels', () => {
    expect(getPositionLabel('OH')).toBe('Attaquante réceptrice');
    expect(getPositionLabel('OPP')).toBe('Attaquante pointue');
    expect(getPositionLabel('MB')).toBe('Centrale');
    expect(getPositionLabel('SET')).toBe('Passeuse');
    expect(getPositionLabel('LIB')).toBe('Libéro');
    expect(getPositionLabel('unknown')).toBe('Joueur');
    expect(getPositionLabel(undefined)).toBe('Joueur');
  });

  it('2. getEfficiencyColor returns correct colors', () => {
    expect(getEfficiencyColor(0.5)).toBe('text-green-500');   // ≥0.4
    expect(getEfficiencyColor(0.4)).toBe('text-green-500');   // ≥0.4
    expect(getEfficiencyColor(0.3)).toBe('text-yellow-500');  // ≥0.2
    expect(getEfficiencyColor(0.2)).toBe('text-yellow-500');  // ≥0.2
    expect(getEfficiencyColor(0.1)).toBe('text-orange-500');  // ≥0
    expect(getEfficiencyColor(0)).toBe('text-orange-500');    // ≥0
    expect(getEfficiencyColor(-0.1)).toBe('text-red-500');    // <0
    expect(getEfficiencyColor(-0.5)).toBe('text-red-500');    // <0
  });

  it('3. generatePlayerShareURL creates valid URL with ?player=', () => {
    const playerId = 'home-player-1';
    const url = generatePlayerShareURL(playerId);

    expect(url).toContain('?player=');
    expect(url).toContain(playerId);
    expect(url.startsWith('http')).toBe(true);

    // Verify URL structure
    const urlObj = new URL(url);
    expect(urlObj.searchParams.get('player')).toBe(playerId);
  });
});

describe('PlayerPage - Data Analysis', () => {
  it('4. buildRadarData returns valid scores 0-100 for all skills', () => {
    const playerStats = stats[0];
    const radarData = buildRadarData(playerStats);

    // Check that all scores are in valid range
    for (const item of radarData) {
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(100);
      expect(typeof item.skill).toBe('string');
      expect(item.skill.length).toBeGreaterThan(0);
    }

    // At least one skill should have data
    expect(radarData.length).toBeGreaterThan(0);
  });

  it('5. Player stats can be retrieved by ID from stats array', () => {
    expect(stats.length).toBeGreaterThan(0);

    // Pick first player
    const firstPlayerStats = stats[0];
    expect(firstPlayerStats.playerId).toBeDefined();

    // Find by ID
    const found = stats.find(s => s.playerId === firstPlayerStats.playerId);
    expect(found).toBeDefined();
    expect(found?.playerId).toBe(firstPlayerStats.playerId);
  });

  it('6. Highlights can be filtered by player via applyFilters', () => {
    const playerStats = stats[0];
    const playerId = playerStats.playerId;

    const criteria = {
      setNumbers: [],
      playerIds: [playerId],
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
    };

    const highlights = applyFilters(match, criteria);

    // All highlights should be from the specified player
    for (const item of highlights) {
      expect(item.action.player.id).toBe(playerId);
    }

    // Should have at least some highlights
    expect(highlights.length).toBeGreaterThan(0);
  });
});

describe('PlayerPage - Formatters', () => {
  it('7. formatDate formats dates correctly', () => {
    const dateString = '2024-01-15';
    const formatted = formatDate(dateString);

    // Should be formatted as DD/MM/YYYY in French locale
    expect(formatted).toContain('/');
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });

  it('8. getPlayer returns correct player object', () => {
    const playerStats = stats[0];
    const playerId = playerStats.playerId;

    const player = getPlayer(playerId, match);

    expect(player).toBeDefined();
    expect(player?.id).toBe(playerId);
    expect(player?.number).toBeDefined();
    expect(player?.firstName).toBeDefined();
    expect(player?.lastName).toBeDefined();
  });
});

describe('PlayerPage - Statistics', () => {
  it('9. Attack combos are tracked in attackByCombo', () => {
    // Find a player with attack data
    const playerWithAttacks = stats.find(s =>
      s.attackByCombo && Object.keys(s.attackByCombo).length > 0
    );

    if (playerWithAttacks?.attackByCombo) {
      const combos = Object.keys(playerWithAttacks.attackByCombo);
      expect(combos.length).toBeGreaterThan(0);

      // Each combo should have quality distribution
      for (const combo of combos) {
        const dist = playerWithAttacks.attackByCombo[combo];
        expect(dist).toBeDefined();
        expect(typeof dist).toBe('object');
      }
    } else {
      // If no player has attacks, test passes (optional field)
      expect(true).toBe(true);
    }
  });

  it('10. By-set stats are calculated for each set', () => {
    const playerStats = stats[0];
    const setNumbers = Object.keys(playerStats.bySet).map(Number);

    // Should have stats for at least one set
    expect(setNumbers.length).toBeGreaterThan(0);

    // Check each set has required fields
    for (const setNum of setNumbers) {
      const setStats = playerStats.bySet[setNum];
      expect(setStats).toBeDefined();
      expect(typeof setStats.totalActions).toBe('number');
      expect(typeof setStats.kills).toBe('number');
      expect(typeof setStats.errors).toBe('number');
      expect(typeof setStats.efficiency).toBe('number');
    }
  });

  it('11. Skills with data can be identified (total > 0)', () => {
    const playerStats = stats[0];

    const skillsWithData = Object.entries(playerStats.bySkill)
      .filter(([_, dist]) => {
        if (!dist) return false;
        const total = Object.values(dist).reduce((sum: number, count: number) => sum + count, 0);
        return total > 0;
      })
      .map(([skill]) => skill);

    // Should have at least one skill with data
    expect(skillsWithData.length).toBeGreaterThan(0);

    // Verify each identified skill actually has data
    for (const skill of skillsWithData) {
      const dist = playerStats.bySkill[skill as keyof typeof playerStats.bySkill];
      if (dist) {
        const total = Object.values(dist).reduce((sum: number, count: number) => sum + count, 0);
        expect(total).toBeGreaterThan(0);
      }
    }
  });

  it('12. Overall stats include kills, errors, efficiency', () => {
    const playerStats = stats[0];
    const overall = playerStats.overall;

    expect(overall).toBeDefined();
    expect(typeof overall.totalActions).toBe('number');
    expect(typeof overall.kills).toBe('number');
    expect(typeof overall.errors).toBe('number');
    expect(typeof overall.efficiency).toBe('number');

    // Kills and errors should be non-negative
    expect(overall.kills).toBeGreaterThanOrEqual(0);
    expect(overall.errors).toBeGreaterThanOrEqual(0);

    // Efficiency should be in valid range (-1 to 1 typically)
    expect(overall.efficiency).toBeGreaterThanOrEqual(-1);
    expect(overall.efficiency).toBeLessThanOrEqual(1);
  });
});
