/**
 * @file calculator.ts
 * @description Calculates player match statistics from rally data
 */

import type {
  Match,
  PlayerMatchStats,
  SkillStats,
  QualityDistribution,
  Skill,
  QualityPro,
  Action,
} from '@volleyvision/data-model';
import { QUALITY_PRO_TO_SIMPLE } from '@volleyvision/data-model';

/**
 * Creates an empty quality distribution object
 */
export function createEmptyDistribution(): QualityDistribution {
  return {
    total: 0,
    '#': 0,
    '+': 0,
    '!': 0,
    '-': 0,
    '/': 0,
    '=': 0,
    perfect: 0,
    good: 0,
    error: 0,
  };
}

/**
 * Adds a quality to a distribution, updating both pro and simple counts
 */
export function addToDistribution(
  dist: QualityDistribution,
  quality: QualityPro
): void {
  dist.total++;
  dist[quality]++;
  const simple = QUALITY_PRO_TO_SIMPLE[quality];
  dist[simple]++;
}

/**
 * Creates empty skill stats
 */
function createEmptySkillStats(): SkillStats {
  return {
    totalActions: 0,
    kills: 0,
    errors: 0,
    efficiency: 0,
    positiveRate: 0,
  };
}

/**
 * Calculates skill stats from a list of actions
 */
function calculateSkillStats(actions: Action[]): SkillStats {
  if (actions.length === 0) {
    return createEmptySkillStats();
  }

  const stats = createEmptySkillStats();
  // Exclure les erreurs d'adversaire du total
  const validActions = actions.filter((a) => !a.isOpponentError);
  stats.totalActions = validActions.length;

  for (const action of validActions) {
    // Only count quality-based actions (QualityPro type)
    if (
      action.quality === '#' ||
      action.quality === '+' ||
      action.quality === '!' ||
      action.quality === '-' ||
      action.quality === '/' ||
      action.quality === '='
    ) {
      if (action.quality === '#') {
        stats.kills++;
      }
      if (action.quality === '/' || action.quality === '=') {
        stats.errors++;
      }
    }
  }

  stats.efficiency =
    stats.totalActions > 0
      ? (stats.kills - stats.errors) / stats.totalActions
      : 0;

  // Positive rate = (kills + positive) / total (sans les erreurs d'adversaire)
  const positiveCount = validActions.filter(
    (a) => a.quality === '#' || a.quality === '+'
  ).length;
  stats.positiveRate =
    stats.totalActions > 0 ? positiveCount / stats.totalActions : 0;

  return stats;
}

/**
 * Calculates comprehensive stats for each player in the match
 */
export function calculatePlayerStats(match: Match): PlayerMatchStats[] {
  // Collect all actions per player
  const playerActionsMap = new Map<string, Action[]>();

  // Iterate through all sets and rallies
  for (const set of match.sets) {
    for (const rally of set.rallies) {
      for (const action of rally.actions) {
        const playerId = action.player.id;
        if (!playerActionsMap.has(playerId)) {
          playerActionsMap.set(playerId, []);
        }
        playerActionsMap.get(playerId)!.push(action);
      }
    }
  }

  // Calculate stats for each player
  const allPlayerStats: PlayerMatchStats[] = [];

  for (const [playerId, actions] of playerActionsMap.entries()) {
    // Overall stats
    const overall = calculateSkillStats(actions);

    // By set
    const bySet: Record<number, SkillStats> = {};
    for (const set of match.sets) {
      const setActions = actions.filter(
        (a) =>
          match.sets[set.number - 1]?.rallies.some((r) =>
            r.actions.some((ra) => ra.id === a.id)
          )
      );
      bySet[set.number] = calculateSkillStats(setActions);
    }

    // By skill
    const bySkill: Partial<Record<Skill, QualityDistribution>> = {};
    const skillTypes: Skill[] = [
      'serve',
      'receive',
      'set',
      'attack',
      'block',
      'dig',
      'freeball',
    ];

    for (const skill of skillTypes) {
      const skillActions = actions.filter((a) => a.skill === skill);
      if (skillActions.length > 0) {
        const dist = createEmptyDistribution();
        for (const action of skillActions) {
          // Ne pas compter les erreurs d'adversaire comme des kills du joueur
          if (action.isOpponentError) {
            continue;
          }

          if (
            action.quality === '#' ||
            action.quality === '+' ||
            action.quality === '!' ||
            action.quality === '-' ||
            action.quality === '/' ||
            action.quality === '='
          ) {
            addToDistribution(dist, action.quality as QualityPro);
          }
        }
        bySkill[skill] = dist;
      }
    }

    // By set and skill
    const bySetAndSkill: Record<string, QualityDistribution> = {};
    for (const set of match.sets) {
      for (const skill of skillTypes) {
        const key = `set${set.number}-${skill}`;
        const setSkillActions = actions.filter(
          (a) =>
            a.skill === skill &&
            match.sets[set.number - 1]?.rallies.some((r) =>
              r.actions.some((ra) => ra.id === a.id)
            )
        );

        if (setSkillActions.length > 0) {
          const dist = createEmptyDistribution();
          for (const action of setSkillActions) {
            // Ne pas compter les erreurs d'adversaire comme des kills du joueur
            if (action.isOpponentError) {
              continue;
            }

            if (
              action.quality === '#' ||
              action.quality === '+' ||
              action.quality === '!' ||
              action.quality === '-' ||
              action.quality === '/' ||
              action.quality === '='
            ) {
              addToDistribution(dist, action.quality as QualityPro);
            }
          }
          bySetAndSkill[key] = dist;
        }
      }
    }

    allPlayerStats.push({
      matchId: match.id,
      playerId,
      date: match.date,
      overall,
      bySet,
      bySkill,
      bySetAndSkill,
    });
  }

  return allPlayerStats;
}
