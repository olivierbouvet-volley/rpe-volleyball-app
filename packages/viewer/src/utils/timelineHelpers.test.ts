/**
 * @file timelineHelpers.test.ts
 * @description Unit tests for timeline helper functions
 */

import { describe, it, expect } from 'vitest';
import {
  getSkillIcon,
  getSkillLabel,
  getQualityColorClass,
  isActionInTimeRange,
  isRallyInTimeRange,
  getRalliesForSet,
  SKILL_FILTERS,
} from './timelineHelpers';
import type { Action, Rally, Match } from '@volleyvision/data-model';

describe('Timeline Helpers', () => {
  describe('getSkillIcon', () => {
    it('retourne un emoji pour chaque skill', () => {
      expect(getSkillIcon('serve')).toBe('');
      expect(getSkillIcon('receive')).toBe('');
      expect(getSkillIcon('set')).toBe('');
      expect(getSkillIcon('attack')).toBe('');
      expect(getSkillIcon('block')).toBe('');
      expect(getSkillIcon('dig')).toBe('⬇');
      expect(getSkillIcon('freeball')).toBe('');
    });

    it('retourne un emoji par défaut pour un skill inconnu', () => {
      expect(getSkillIcon('unknown' as any)).toBe('');
    });
  });

  describe('getQualityColorClass', () => {
    it('retourne la bonne classe pour chaque qualité', () => {
      expect(getQualityColorClass('#')).toContain('bg-quality-kill');
      expect(getQualityColorClass('+')).toContain('bg-quality-positive');
      expect(getQualityColorClass('!')).toContain('bg-quality-neutral');
      expect(getQualityColorClass('-')).toContain('bg-quality-negative');
      expect(getQualityColorClass('/')).toContain('bg-quality-poor');
      expect(getQualityColorClass('=')).toContain('bg-quality-error');
    });

    it('retourne une classe par défaut pour une qualité inconnue', () => {
      expect(getQualityColorClass('X' as any)).toContain('bg-slate-600');
    });
  });

  describe('isRallyInTimeRange', () => {
    it('détecte un rally actif', () => {
      const rally: Rally = {
        id: 'rally1',
        setNumber: 1,
        rallyNumber: 1,
        videoTimestamp: 100,
        endVideoTimestamp: 115,
        actions: [],
        scoreAfter: { home: 0, away: 0 },
        winningTeam: 'home',
      };

      expect(isRallyInTimeRange(rally, 110, 0)).toBe(true);
      expect(isRallyInTimeRange(rally, 100, 0)).toBe(true);
      expect(isRallyInTimeRange(rally, 115, 0)).toBe(true);
      expect(isRallyInTimeRange(rally, 50, 0)).toBe(false);
      expect(isRallyInTimeRange(rally, 120, 0)).toBe(false);
    });

    it('gère l\'offset', () => {
      const rally: Rally = {
        id: 'rally1',
        setNumber: 1,
        rallyNumber: 1,
        videoTimestamp: 100,
        endVideoTimestamp: 115,
        actions: [],
        scoreAfter: { home: 0, away: 0 },
        winningTeam: 'home',
      };

      // rally.videoTimestamp=100, currentTime=130, offset=30 → rallyStart=130 → true
      expect(isRallyInTimeRange(rally, 130, 30)).toBe(true);
      // rally.videoTimestamp=100, currentTime=130, offset=0 → rallyStart=100, rallyEnd=115 → false
      expect(isRallyInTimeRange(rally, 130, 0)).toBe(false);
    });

    it('retourne false si pas de videoTimestamp', () => {
      const rally: Rally = {
        id: 'rally1',
        setNumber: 1,
        rallyNumber: 1,
        videoTimestamp: null,
        actions: [],
        scoreAfter: { home: 0, away: 0 },
        winningTeam: 'home',
      };

      expect(isRallyInTimeRange(rally, 100, 0)).toBe(false);
    });

    it('utilise une durée par défaut si endVideoTimestamp est absent', () => {
      const rally: Rally = {
        id: 'rally1',
        setNumber: 1,
        rallyNumber: 1,
        videoTimestamp: 100,
        endVideoTimestamp: null,
        actions: [],
        scoreAfter: { home: 0, away: 0 },
        winningTeam: 'home',
      };

      // Default duration is 15 seconds, so range is 100 to 115
      expect(isRallyInTimeRange(rally, 110, 0)).toBe(true);
      expect(isRallyInTimeRange(rally, 120, 0)).toBe(false);
    });
  });

  describe('isActionInTimeRange', () => {
    it('détecte une action avec tolérance', () => {
      const action: Partial<Action> = {
        id: 'action1',
        videoTimestamp: 100,
      };

      // action.videoTimestamp=100, currentTime=101, offset=0, tolerance=2 → true
      expect(isActionInTimeRange(action as Action, 101, 0, 2)).toBe(true);
      // action.videoTimestamp=100, currentTime=102, offset=0, tolerance=2 → true
      expect(isActionInTimeRange(action as Action, 102, 0, 2)).toBe(true);
      // action.videoTimestamp=100, currentTime=105, offset=0, tolerance=2 → false
      expect(isActionInTimeRange(action as Action, 105, 0, 2)).toBe(false);
    });

    it('gère l\'offset', () => {
      const action: Partial<Action> = {
        id: 'action1',
        videoTimestamp: 100,
      };

      // action.videoTimestamp=100, offset=30 → actionYTTime=130
      // currentTime=131, tolerance=2 → diff=1 → true
      expect(isActionInTimeRange(action as Action, 131, 30, 2)).toBe(true);
    });

    it('retourne false si pas de videoTimestamp', () => {
      const action: Partial<Action> = {
        id: 'action1',
        videoTimestamp: null,
      };

      expect(isActionInTimeRange(action as Action, 100, 0, 2)).toBe(false);
    });
  });

  describe('getRalliesForSet', () => {
    const mockMatch: Match = {
      metadata: {
        date: '2024-01-01',
        championship: 'Test',
        season: '2024',
        homeTeam: 'Home',
        visitingTeam: 'Away',
      },
      homeTeam: {
        name: 'Home Team',
        players: [],
      },
      awayTeam: {
        name: 'Away Team',
        players: [],
      },
      sets: [
        {
          number: 1,
          rallies: [
            {
              id: 'r1',
              setNumber: 1,
              rallyNumber: 1,
              videoTimestamp: 10,
              actions: [],
              scoreAfter: { home: 1, away: 0 },
              winningTeam: 'home',
            },
            {
              id: 'r2',
              setNumber: 1,
              rallyNumber: 2,
              videoTimestamp: 20,
              actions: [],
              scoreAfter: { home: 2, away: 0 },
              winningTeam: 'home',
            },
          ],
        },
        {
          number: 2,
          rallies: [
            {
              id: 'r3',
              setNumber: 2,
              rallyNumber: 1,
              videoTimestamp: 100,
              actions: [],
              scoreAfter: { home: 0, away: 1 },
              winningTeam: 'away',
            },
          ],
        },
      ],
    };

    it('retourne tous les rallies quand setNumber=null', () => {
      const rallies = getRalliesForSet(mockMatch, null);
      expect(rallies.length).toBe(3);
      expect(rallies.map((r) => r.id)).toEqual(['r1', 'r2', 'r3']);
    });

    it('filtre par set', () => {
      const ralliesSet1 = getRalliesForSet(mockMatch, 1);
      expect(ralliesSet1.length).toBe(2);
      expect(ralliesSet1.every((r) => r.setNumber === 1)).toBe(true);

      const ralliesSet2 = getRalliesForSet(mockMatch, 2);
      expect(ralliesSet2.length).toBe(1);
      expect(ralliesSet2.every((r) => r.setNumber === 2)).toBe(true);
    });

    it('retourne un tableau vide pour un set inexistant', () => {
      const rallies = getRalliesForSet(mockMatch, 99);
      expect(rallies).toEqual([]);
    });
  });

  describe('SKILL_FILTERS', () => {
    it('contient 6 filtres', () => {
      expect(SKILL_FILTERS.length).toBe(6);
    });

    it('contient les bons skills', () => {
      const skills = SKILL_FILTERS.map((f) => f.skill);
      expect(skills).toContain('serve');
      expect(skills).toContain('receive');
      expect(skills).toContain('attack');
      expect(skills).toContain('block');
      expect(skills).toContain('dig');
      expect(skills).toContain('set');
    });
  });

  describe('getSkillLabel', () => {
    it('retourne le label français', () => {
      expect(getSkillLabel('serve')).toBe('Service');
      expect(getSkillLabel('attack')).toBe('Attaque');
      expect(getSkillLabel('receive')).toBe('Réception');
      expect(getSkillLabel('block')).toBe('Block');
      expect(getSkillLabel('dig')).toBe('Défense');
      expect(getSkillLabel('set')).toBe('Passe');
      expect(getSkillLabel('freeball')).toBe('Free ball');
    });

    it('retourne le skill lui-même pour un skill inconnu', () => {
      expect(getSkillLabel('unknown' as any)).toBe('unknown');
    });
  });
});
