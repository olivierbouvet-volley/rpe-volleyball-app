import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseDVW } from '../src';
import { calculatePlayerStats } from '../src';
import { MatchSchema } from '@volleyvision/data-model';

describe('Full DVW Parse Integration', () => {
  const fixturePath = join(__dirname, '../../../fixtures/boulouris-sable.dvw');
  const content = readFileSync(fixturePath, 'utf-8');

  let match: ReturnType<typeof parseDVW>;

  it('should parse DVW file without throwing', () => {
    expect(() => {
      match = parseDVW(content);
    }).not.toThrow();
  });

  describe('Match Metadata', () => {
    it('should have a valid match ID containing team codes', () => {
      match = parseDVW(content);
      expect(match.id).toContain('BOU');
      expect(match.id).toContain('SAB');
      expect(match.id).toMatch(/^\d{4}-\d{2}-\d{2}-\w+-\w+$/); // Date-TeamA-TeamB format
    });

    it('should have the correct date', () => {
      match = parseDVW(content);
      expect(match.date).toBe('2026-01-27');
    });

    it('should have the correct competition', () => {
      match = parseDVW(content);
      expect(match.competition).toBe('INTERPOLE SUD');
    });
  });

  describe('Teams', () => {
    it('should have correct home team name', () => {
      match = parseDVW(content);
      expect(match.homeTeam.name).toBe('POLE BOULOURIS');
      expect(match.homeTeam.code).toBe('BOU');
    });

    it('should have correct away team name', () => {
      match = parseDVW(content);
      expect(match.awayTeam.name).toBe('POLE SABLE');
      expect(match.awayTeam.code).toBe('SAB');
    });

    it('should parse 12 home players', () => {
      match = parseDVW(content);
      expect(match.homeTeam.players.length).toBe(12);
    });

    it('should parse 14 away players (Sablé)', () => {
      match = parseDVW(content);
      expect(match.awayTeam.players.length).toBe(14);
    });

    it('should identify Julia Prou (#7) in away team', () => {
      match = parseDVW(content);
      const julia = match.awayTeam.players.find((p) => p.number === 7);
      expect(julia).toBeDefined();
      expect(julia?.lastName).toBe('PROU');
      expect(julia?.firstName).toBe('JULIA');
    });

    it('should identify liberos', () => {
      match = parseDVW(content);
      const homeLibero = match.homeTeam.players.find((p) => p.isLibero);
      const awayLibero = match.awayTeam.players.find((p) => p.isLibero);
      expect(homeLibero).toBeDefined();
      expect(awayLibero).toBeDefined();
    });
  });

  describe('Sets and Rallies', () => {
    it('should have 3 sets', () => {
      match = parseDVW(content);
      expect(match.sets.length).toBe(3);
    });

    it('should have correct scores for set 1 (25-20)', () => {
      match = parseDVW(content);
      const set1 = match.sets[0];
      expect(set1.homeScore).toBe(25);
      expect(set1.awayScore).toBe(20);
      expect(set1.winner).toBe('home');
    });

    it('should have rallies adding up to total points in set 1', () => {
      match = parseDVW(content);
      const set1 = match.sets[0];
      const totalPoints = set1.homeScore + set1.awayScore;
      // Rallies count should be close to total points (±1 tolerance)
      expect(set1.rallies.length).toBeGreaterThanOrEqual(totalPoints - 1);
      expect(set1.rallies.length).toBeLessThanOrEqual(totalPoints + 1);
    });

    it('should have rallies in all 3 sets', () => {
      match = parseDVW(content);
      match.sets.forEach((set) => {
        expect(set.rallies.length).toBeGreaterThan(0);
      });
    });

    it('should have each rally with at least one action', () => {
      match = parseDVW(content);
      match.sets.forEach((set) => {
        set.rallies.forEach((rally) => {
          expect(rally.actions.length).toBeGreaterThanOrEqual(1);
        });
      });
    });
  });

  describe('Match Result', () => {
    it('should show Boulouris winning 3-0', () => {
      match = parseDVW(content);
      expect(match.result.homeWins).toBe(3);
      expect(match.result.awayWins).toBe(0);
      expect(match.result.winner).toBe('home');
    });
  });

  describe('DVW Metadata', () => {
    it('should parse attack combinations (>15)', () => {
      match = parseDVW(content);
      expect(match.dvwMetadata?.attackCombinations.length).toBeGreaterThan(15);
    });

    it('should have common attack codes', () => {
      match = parseDVW(content);
      const codes = match.dvwMetadata?.attackCombinations.map((c) => c.code) || [];
      expect(codes).toContain('V5');
      expect(codes).toContain('X1');
      expect(codes).toContain('C1');
    });

    it('should parse setter calls', () => {
      match = parseDVW(content);
      expect(match.dvwMetadata?.setterCalls.length).toBeGreaterThan(5);
    });

    it('should have video path if present', () => {
      match = parseDVW(content);
      // Video path is optional, but if present should be a string
      if (match.dvwMetadata?.videoPath) {
        expect(typeof match.dvwMetadata.videoPath).toBe('string');
      }
    });
  });

  describe('Timeouts and Substitutions', () => {
    it('should capture timeouts', () => {
      match = parseDVW(content);
      expect(match.timeouts.length).toBeGreaterThan(0);
    });

    it('should capture substitutions', () => {
      match = parseDVW(content);
      expect(match.substitutions.length).toBeGreaterThan(0);
    });
  });

  describe('Stats Calculation', () => {
    it('should calculate stats for all players with actions', () => {
      match = parseDVW(content);
      const stats = calculatePlayerStats(match);
      // Both teams have players, so should have stats for many players
      expect(stats.length).toBeGreaterThan(20);
    });

    it('should calculate stats for Julia Prou (#7 away)', () => {
      match = parseDVW(content);
      const stats = calculatePlayerStats(match);
      const juliaStats = stats.find((s) => s.playerId === 'away-7');
      expect(juliaStats).toBeDefined();
      expect(juliaStats?.overall.totalActions).toBeGreaterThan(10);
    });

    it('should have attack stats for players', () => {
      match = parseDVW(content);
      const stats = calculatePlayerStats(match);
      // At least some players should have attack actions
      const playersWithAttacks = stats.filter((s) => s.bySkill.attack);
      expect(playersWithAttacks.length).toBeGreaterThan(5);
    });

    it('should calculate efficiency correctly', () => {
      match = parseDVW(content);
      const stats = calculatePlayerStats(match);
      stats.forEach((playerStats) => {
        // Efficiency should be between -1 and 1
        expect(playerStats.overall.efficiency).toBeGreaterThanOrEqual(-1);
        expect(playerStats.overall.efficiency).toBeLessThanOrEqual(1);
      });
    });

    it('should have bySet stats', () => {
      match = parseDVW(content);
      const stats = calculatePlayerStats(match);
      const firstPlayerStats = stats[0];
      expect(firstPlayerStats.bySet).toBeDefined();
      // Should have stats for at least one set
      expect(Object.keys(firstPlayerStats.bySet).length).toBeGreaterThan(0);
    });

    it('should have bySetAndSkill stats', () => {
      match = parseDVW(content);
      const stats = calculatePlayerStats(match);
      const firstPlayerStats = stats[0];
      expect(firstPlayerStats.bySetAndSkill).toBeDefined();
      // Should have at least one set-skill combination
      expect(Object.keys(firstPlayerStats.bySetAndSkill).length).toBeGreaterThan(0);
    });
  });

  describe('Zod Validation', () => {
    it('should pass Zod schema validation', () => {
      match = parseDVW(content);
      // This will throw if validation fails
      expect(() => {
        MatchSchema.parse(match);
      }).not.toThrow();
    });
  });

  describe('Data Integrity', () => {
    it('should have consistent player IDs across actions', () => {
      match = parseDVW(content);
      const playerIdsInTeams = new Set([
        ...match.homeTeam.players.map((p) => p.id),
        ...match.awayTeam.players.map((p) => p.id),
      ]);

      const playerIdsInActions = new Set<string>();
      match.sets.forEach((set) => {
        set.rallies.forEach((rally) => {
          rally.actions.forEach((action) => {
            playerIdsInActions.add(action.player.id);
          });
        });
      });

      // All player IDs in actions should exist in team rosters
      // (except for team errors which use "home-team" or "away-team")
      playerIdsInActions.forEach((actionPlayerId) => {
        if (!actionPlayerId.endsWith('-team')) {
          expect(playerIdsInTeams.has(actionPlayerId)).toBe(true);
        }
      });
    });

    it('should have rally IDs matching pattern', () => {
      match = parseDVW(content);
      match.sets.forEach((set) => {
        set.rallies.forEach((rally) => {
          expect(rally.id).toMatch(/^set\d+-rally\d+$/);
        });
      });
    });

    it('should have actions with rallyId matching parent rally', () => {
      match = parseDVW(content);
      match.sets.forEach((set) => {
        set.rallies.forEach((rally) => {
          rally.actions.forEach((action) => {
            expect(action.rallyId).toBe(rally.id);
          });
        });
      });
    });
  });
});
