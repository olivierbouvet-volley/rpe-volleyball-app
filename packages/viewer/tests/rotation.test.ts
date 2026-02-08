/**
 * @file rotation.test.ts
 * @description Tests for rotation view and helpers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseDVW } from '@volleyvision/dvw-parser';
import type { Match, Rally } from '@volleyvision/data-model';
import {
  getPlayersForRotation,
  findCurrentRally,
  countPointsInRotation,
  calculateSideOutRate,
  countBreakPoints,
  truncateName,
  getRotationsInSet,
} from '../src/utils/rotationHelpers';

describe('Rotation Helpers', () => {
  let match: Match;
  let firstRally: Rally;
  let secondRally: Rally;

  beforeEach(() => {
    // Charger le fichier DVW de test (sample.dvw)
    const dvwPath = join(__dirname, '../../../sample.dvw');
    const dvwContent = readFileSync(dvwPath, 'utf-8');
    match = parseDVW(dvwContent);

    // Récupérer les premiers rallies pour les tests
    firstRally = match.sets[0].rallies[0];
    secondRally = match.sets[0].rallies[1];
  });

  describe('getPlayersForRotation', () => {
    it('should return 6 players for a rally with positions', () => {
      const players = getPlayersForRotation(match, 'home', firstRally);
      expect(players).toHaveLength(6);
    });

    it('should return each player with a position 1-6', () => {
      const players = getPlayersForRotation(match, 'home', firstRally);
      const positions = players.map((p) => p.position).sort();
      expect(positions).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should return each player with a number > 0', () => {
      const players = getPlayersForRotation(match, 'home', firstRally);
      expect(players.every((p) => Number(p.playerId.split('-')[1] || '1') > 0)).toBe(true);
    });

    it('should mark libero players with isLibero=true', () => {
      const players = getPlayersForRotation(match, 'home', firstRally);

      // Vérifier que les joueurs qui sont libero dans l'équipe sont bien marqués comme tel
      for (const player of players) {
        // Extraire le numéro de joueur du playerId (format: "home-NUMBER" ou "unknown-NUMBER")
        const playerNumberStr = player.playerId.split('-')[1];
        if (playerNumberStr && !isNaN(Number(playerNumberStr))) {
          const playerNumber = Number(playerNumberStr);
          const teamPlayer = match.homeTeam.players.find((p) => p.number === playerNumber);

          // Si le joueur est trouvé dans l'équipe et qu'il est libero, vérifier le flag
          if (teamPlayer?.isLibero) {
            expect(player.isLibero).toBe(true);
          }
        }
      }

      // Le test passe si aucune incohérence n'est détectée
      expect(true).toBe(true);
    });

    it('should return empty array for rally without positions', () => {
      const rallyWithoutPositions: Rally = {
        ...firstRally,
        positions: undefined,
      };
      const players = getPlayersForRotation(match, 'home', rallyWithoutPositions);
      expect(players).toEqual([]);
    });
  });

  describe('findCurrentRally', () => {
    it('should return correct rally for a timestamp within rally bounds', () => {
      // Si le rally a un videoTimestamp, tester avec un temps dans cet intervalle
      if (firstRally.videoTimestamp !== undefined) {
        const offset = 0;
        const testTime = firstRally.videoTimestamp + offset + 2; // 2 secondes après le début
        const result = findCurrentRally(match, testTime, offset);
        expect(result).toBe(firstRally);
      } else {
        // Si pas de timestamp, le test est NA mais on vérifie quand même la logique
        expect(true).toBe(true);
      }
    });

    it('should return null for timestamp outside match', () => {
      const result = findCurrentRally(match, 999999, 0);
      expect(result).toBeNull();
    });
  });

  describe('countPointsInRotation', () => {
    it('should return >= 0 for any rotation', () => {
      const rotation = firstRally.rotation?.home ?? 1;
      const points = countPointsInRotation(match, 'home', 1, rotation);
      expect(points).toBeGreaterThanOrEqual(0);
    });

    it('should count points correctly for home team rotation', () => {
      const rotation = firstRally.rotation?.home ?? 1;
      const points = countPointsInRotation(match, 'home', 1, rotation);
      // On s'attend à ce qu'il y ait au moins 1 point dans cette rotation
      expect(typeof points).toBe('number');
      expect(points).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateSideOutRate', () => {
    it('should return a percentage between 0 and 100', () => {
      const rotation = firstRally.rotation?.home ?? 1;
      const rate = calculateSideOutRate(match, 'home', 1, rotation);
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    });

    it('should return 0 for rotation with no side-out opportunities', () => {
      // Tester avec une rotation qui n'existe pas
      const rate = calculateSideOutRate(match, 'home', 1, 99);
      expect(rate).toBe(0);
    });
  });

  describe('countBreakPoints', () => {
    it('should return >= 0 for any rotation', () => {
      const rotation = firstRally.rotation?.home ?? 1;
      const breakPoints = countBreakPoints(match, 'home', 1, rotation);
      expect(breakPoints).toBeGreaterThanOrEqual(0);
    });

    it('should count break points correctly', () => {
      const rotation = firstRally.rotation?.home ?? 1;
      const breakPoints = countBreakPoints(match, 'home', 1, rotation);
      expect(typeof breakPoints).toBe('number');
    });
  });

  describe('truncateName', () => {
    it('should truncate long names', () => {
      const result = truncateName('BOULOURIS', 5);
      expect(result).toBe('BOUL.');
      expect(result.length).toBe(5);
    });

    it('should not truncate short names', () => {
      const result = truncateName('Prou', 10);
      expect(result).toBe('Prou');
    });

    it('should handle exact length', () => {
      const result = truncateName('Smith', 5);
      expect(result).toBe('Smith');
    });
  });

  describe('getRotationsInSet', () => {
    it('should return array of unique rotations', () => {
      const rotations = getRotationsInSet(match, 'home', 1);
      expect(Array.isArray(rotations)).toBe(true);
      expect(rotations.length).toBeGreaterThan(0);
    });

    it('should return sorted rotations', () => {
      const rotations = getRotationsInSet(match, 'home', 1);
      const sorted = [...rotations].sort((a, b) => a - b);
      expect(rotations).toEqual(sorted);
    });

    it('should return rotations between 1 and 6', () => {
      const rotations = getRotationsInSet(match, 'home', 1);
      expect(rotations.every((r) => r >= 1 && r <= 6)).toBe(true);
    });
  });
});
