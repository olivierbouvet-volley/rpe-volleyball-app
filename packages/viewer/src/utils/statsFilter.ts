import type {
  PlayerMatchStats,
  QualityDistribution,
  Skill,
  SkillStats,
} from '@volleyvision/data-model';
import { createEmptyDistribution } from '@volleyvision/dvw-parser';

/**
 * Create empty skill stats object
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
 * Filter stats by set number and/or player ID
 */
export function filterStats(
  stats: PlayerMatchStats[],
  selectedSet: number | null,
  selectedPlayer: string | null
): PlayerMatchStats[] {
  let filtered = stats;

  // Filter by player
  if (selectedPlayer) {
    filtered = filtered.filter((s) => s.playerId === selectedPlayer);
  }

  // Filter by set: reconstruct stats from bySet and bySetAndSkill
  if (selectedSet !== null) {
    filtered = filtered.map((playerStats) => ({
      ...playerStats,
      overall: playerStats.bySet[selectedSet] || createEmptySkillStats(),
      bySkill: filterBySetSkills(playerStats, selectedSet),
    }));
  }

  return filtered;
}

/**
 * Filter bySkill to only include actions from a specific set
 * Uses bySetAndSkill keys like "set1-serve", "set2-attack"
 */
function filterBySetSkills(
  playerStats: PlayerMatchStats,
  setNumber: number
): Partial<Record<Skill, QualityDistribution>> {
  const result: Partial<Record<Skill, QualityDistribution>> = {};

  Object.entries(playerStats.bySetAndSkill).forEach(([key, dist]) => {
    if (key.startsWith(`set${setNumber}-`)) {
      const skill = key.split('-')[1] as Skill;
      result[skill] = dist;
    }
  });

  return result;
}

/**
 * Get quality distribution for a specific set and skill
 */
export function getDistForSetAndSkill(
  stats: PlayerMatchStats,
  setNumber: number,
  skill: Skill
): QualityDistribution {
  const key = `set${setNumber}-${skill}`;
  return stats.bySetAndSkill[key] || createEmptyDistribution();
}
