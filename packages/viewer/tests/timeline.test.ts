/**
 * @file timeline.test.ts
 * @description Tests for Action Timeline helpers (PROMPT 2B)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  getSkillIcon,
  getQualityColorClass,
  isRallyInTimeRange,
  isActionInTimeRange,
  getRalliesForSet,
  SKILL_FILTERS,
  getSkillLabel,
} from '../src/utils/timelineHelpers';
import type { Rally, Action, Skill, QualityPro } from '@volleyvision/data-model';
import { parseDVW } from '@volleyvision/dvw-parser';
import { readFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Test 1: getSkillIcon retourne un emoji pour chaque skill
// ============================================================================

describe('getSkillIcon', () => {
  it('retourne un emoji pour chaque skill', () => {
    const skills: Skill[] = ['serve', 'receive', 'set', 'attack', 'block', 'dig', 'freeball'];

    skills.forEach(skill => {
      const icon = getSkillIcon(skill);
      expect(icon).toBeTruthy();
      expect(typeof icon).toBe('string');
      expect(icon.length).toBeGreaterThan(0);
    });
  });

  it('retourne des emojis spécifiques pour les skills courants', () => {
    expect(getSkillIcon('serve')).toBe('🎯');
    expect(getSkillIcon('receive')).toBe('🛡️');
    expect(getSkillIcon('attack')).toBe('💥');
    expect(getSkillIcon('block')).toBe('🧱');
  });
});

// ============================================================================
// Test 2: getQualityColorClass retourne la bonne classe pour chaque qualité
// ============================================================================

describe('getQualityColorClass', () => {
  it('retourne la classe kill pour #', () => {
    const className = getQualityColorClass('#');
    expect(className).toContain('bg-quality-kill');
  });

  it('retourne la classe error pour =', () => {
    const className = getQualityColorClass('=');
    expect(className).toContain('bg-quality-error');
  });

  it('retourne une classe pour chaque qualité', () => {
    const qualities: QualityPro[] = ['#', '+', '!', '-', '/', '='];

    qualities.forEach(quality => {
      const className = getQualityColorClass(quality);
      expect(className).toBeTruthy();
      expect(typeof className).toBe('string');
      expect(className).toContain('bg-quality-');
    });
  });
});

// ============================================================================
// Test 3: isRallyInTimeRange détecte un rally actif
// ============================================================================

describe('isRallyInTimeRange', () => {
  it('détecte un rally actif dans la plage de temps', () => {
    const rally: Rally = {
      id: 'test-rally',
      setNumber: 1,
      rallyNumber: 1,
      homeScoreBefore: 0,
      awayScoreBefore: 0,
      homeScoreAfter: 1,
      awayScoreAfter: 0,
      servingTeam: 'home',
      pointWinner: 'home',
      actions: [],
      videoTimestamp: 100,
      endVideoTimestamp: 115,
      rotation: { home: 1, away: 1 },
      positions: { home: undefined!, away: undefined! },
    };

    // currentTime=110 est entre 100 et 115 → true
    expect(isRallyInTimeRange(rally, 110, 0)).toBe(true);

    // currentTime=50 est avant 100 → false
    expect(isRallyInTimeRange(rally, 50, 0)).toBe(false);

    // currentTime=120 est après 115 → false
    expect(isRallyInTimeRange(rally, 120, 0)).toBe(false);
  });

  it('retourne false si pas de videoTimestamp', () => {
    const rally: Rally = {
      id: 'test-rally',
      setNumber: 1,
      rallyNumber: 1,
      homeScoreBefore: 0,
      awayScoreBefore: 0,
      homeScoreAfter: 1,
      awayScoreAfter: 0,
      servingTeam: 'home',
      pointWinner: 'home',
      actions: [],
      videoTimestamp: undefined,
      rotation: { home: 1, away: 1 },
      positions: { home: undefined!, away: undefined! },
    };

    expect(isRallyInTimeRange(rally, 110, 0)).toBe(false);
  });
});

// ============================================================================
// Test 4: isRallyInTimeRange gère l'offset
// ============================================================================

describe('isRallyInTimeRange avec offset', () => {
  it('gère correctement l offset positif', () => {
    const rally: Rally = {
      id: 'test-rally',
      setNumber: 1,
      rallyNumber: 1,
      homeScoreBefore: 0,
      awayScoreBefore: 0,
      homeScoreAfter: 1,
      awayScoreAfter: 0,
      servingTeam: 'home',
      pointWinner: 'home',
      actions: [],
      videoTimestamp: 100,
      endVideoTimestamp: 115,
      rotation: { home: 1, away: 1 },
      positions: { home: undefined!, away: undefined! },
    };

    // rally.videoTimestamp=100, offset=30 → rallyStart=130
    // currentTime=130 → true
    expect(isRallyInTimeRange(rally, 130, 30)).toBe(true);

    // rally.videoTimestamp=100, offset=0 → rallyStart=100
    // currentTime=130 → false (hors plage)
    expect(isRallyInTimeRange(rally, 130, 0)).toBe(false);
  });
});

// ============================================================================
// Test 5: isActionInTimeRange avec tolérance
// ============================================================================

describe('isActionInTimeRange', () => {
  const mockAction: Action = {
    id: 'test-action',
    rallyId: 'test-rally',
    sequenceOrder: 0,
    player: {
      id: 'home-1',
      number: 1,
      team: 'home',
      isTeamAction: false,
    },
    skill: 'serve',
    quality: '#',
    ballType: 'H',
    videoTimestamp: 100,
    source: 'dvw',
    modifiers: {},
  };

  it('détecte une action dans la tolérance', () => {
    // action.videoTimestamp=100, currentTime=101, tolerance=2
    // diff=1, dans tolérance → true
    expect(isActionInTimeRange(mockAction, 101, 0, 2)).toBe(true);

    // currentTime=102, diff=2, à la limite → true
    expect(isActionInTimeRange(mockAction, 102, 0, 2)).toBe(true);
  });

  it('retourne false si hors tolérance', () => {
    // action.videoTimestamp=100, currentTime=105, tolerance=2
    // diff=5, hors tolérance → false
    expect(isActionInTimeRange(mockAction, 105, 0, 2)).toBe(false);
  });

  it('gère l offset', () => {
    // action.videoTimestamp=100, offset=10 → actionTime=110
    // currentTime=111, tolerance=2 → true
    expect(isActionInTimeRange(mockAction, 111, 10, 2)).toBe(true);
  });
});

// ============================================================================
// Test 10: isActionInTimeRange retourne false si pas de videoTimestamp
// ============================================================================

describe('isActionInTimeRange sans videoTimestamp', () => {
  it('retourne false si action.videoTimestamp est undefined', () => {
    const actionWithoutTimestamp: Action = {
      id: 'test-action',
      rallyId: 'test-rally',
      sequenceOrder: 0,
      player: {
        id: 'home-1',
        number: 1,
        team: 'home',
        isTeamAction: false,
      },
      skill: 'serve',
      quality: '#',
      ballType: 'H',
      videoTimestamp: undefined,
      source: 'dvw',
      modifiers: {},
    };

    expect(isActionInTimeRange(actionWithoutTimestamp, 100, 0, 2)).toBe(false);
  });
});

// ============================================================================
// Test 6-7: getRalliesForSet avec données réelles
// ============================================================================

describe('getRalliesForSet', () => {
  let match: ReturnType<typeof parseDVW>;

  beforeAll(() => {
    // Charger le fichier DVW de test
    const dvwPath = join(__dirname, '..', '..', '..', 'fixtures', 'boulouris-sable.dvw');
    const dvwContent = readFileSync(dvwPath, 'utf-8');
    match = parseDVW(dvwContent);
  });

  it('retourne tous les rallies quand setNumber=null', () => {
    const allRallies = getRalliesForSet(match, null);

    // Calculer le total de rallies dans tous les sets
    const totalRallies = match.sets.reduce((sum, set) => sum + set.rallies.length, 0);

    expect(allRallies.length).toBe(totalRallies);
    expect(allRallies.length).toBeGreaterThan(0);
  });

  it('filtre par set correctement', () => {
    const set1Rallies = getRalliesForSet(match, 1);

    expect(set1Rallies.length).toBeGreaterThan(0);
    expect(set1Rallies.every(r => r.setNumber === 1)).toBe(true);
  });

  it('retourne un tableau vide pour un set inexistant', () => {
    const invalidSetRallies = getRalliesForSet(match, 99);

    expect(invalidSetRallies).toEqual([]);
  });
});

// ============================================================================
// Test 8: SKILL_FILTERS contient 6 filtres
// ============================================================================

describe('SKILL_FILTERS', () => {
  it('contient exactement 6 filtres', () => {
    expect(SKILL_FILTERS).toBeDefined();
    expect(SKILL_FILTERS.length).toBe(6);
  });

  it('contient les skills attendus', () => {
    const expectedSkills: Skill[] = ['serve', 'receive', 'set', 'attack', 'block', 'dig'];
    const actualSkills = SKILL_FILTERS.map(f => f.skill);

    expectedSkills.forEach(skill => {
      expect(actualSkills).toContain(skill);
    });
  });

  it('chaque filtre a un icon, label et skill', () => {
    SKILL_FILTERS.forEach(filter => {
      expect(filter.icon).toBeTruthy();
      expect(filter.label).toBeTruthy();
      expect(filter.skill).toBeTruthy();

      expect(typeof filter.icon).toBe('string');
      expect(typeof filter.label).toBe('string');
      expect(typeof filter.skill).toBe('string');
    });
  });
});

// ============================================================================
// Test 9: getSkillLabel retourne le label français
// ============================================================================

describe('getSkillLabel', () => {
  it('retourne le label français pour serve', () => {
    expect(getSkillLabel('serve')).toBe('Service');
  });

  it('retourne le label français pour attack', () => {
    expect(getSkillLabel('attack')).toBe('Attaque');
  });

  it('retourne le label français pour receive', () => {
    expect(getSkillLabel('receive')).toBe('Réception');
  });

  it('retourne le label français pour block', () => {
    expect(getSkillLabel('block')).toBe('Block');
  });

  it('retourne le label français pour dig', () => {
    expect(getSkillLabel('dig')).toBe('Défense');
  });

  it('retourne le label français pour set', () => {
    expect(getSkillLabel('set')).toBe('Passe');
  });
});
