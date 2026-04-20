/**
 * @file statsAggregator.ts
 * @description Agrège les PlayerMatchStats de N matchs en une vue cumulée par joueur
 */

import type { PlayerMatchStats, QualityDistribution, SkillStats, Skill } from '@volleyvision/data-model';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addQualityDist(a: QualityDistribution, b: QualityDistribution): QualityDistribution {
  return {
    total:   a.total   + b.total,
    '#':     a['#']    + b['#'],
    '+':     a['+']    + b['+'],
    '!':     a['!']    + b['!'],
    '-':     a['-']    + b['-'],
    '/':     a['/']    + b['/'],
    '=':     a['=']    + b['='],
    perfect: a.perfect + b.perfect,
    good:    a.good    + b.good,
    error:   a.error   + b.error,
  };
}

function emptyQualityDist(): QualityDistribution {
  return { total: 0, '#': 0, '+': 0, '!': 0, '-': 0, '/': 0, '=': 0, perfect: 0, good: 0, error: 0 };
}

function addSkillStats(a: SkillStats, b: SkillStats): SkillStats {
  const totalActions = a.totalActions + b.totalActions;
  const kills        = a.kills        + b.kills;
  const errors       = a.errors       + b.errors;
  return {
    totalActions,
    kills,
    errors,
    efficiency:   totalActions > 0 ? (kills - errors) / totalActions : 0,
    positiveRate: totalActions > 0 ? (kills + (a.kills - a.errors + b.kills - b.errors)) / totalActions : 0,
  };
}

function emptySkillStats(): SkillStats {
  return { totalActions: 0, kills: 0, errors: 0, efficiency: 0, positiveRate: 0 };
}

// ─── Agrégateur principal ─────────────────────────────────────────────────────

/**
 * Agrège les stats de plusieurs matchs par joueur (identifié par playerId).
 * Retourne un tableau de PlayerMatchStats synthétiques (matchId = "cumulative").
 *
 * @param idRemap - optionnel : Map "home-7" → "TeamName|7" pour stabiliser
 *   l'identité cross-matchs quand la même équipe joue parfois à domicile,
 *   parfois à l'extérieur.
 */
export function aggregatePlayerStats(
  statsPerMatch: PlayerMatchStats[][],
  idRemap?: Map<string, string>,
): PlayerMatchStats[] {
  // Map playerId → stats agrégées
  const byPlayer = new Map<string, PlayerMatchStats>();

  for (const matchStats of statsPerMatch) {
    for (const ps of matchStats) {
      // Remapper vers l'identifiant canonique si dispo
      const canonicalId = idRemap?.get(ps.playerId) ?? ps.playerId;
      const existing = byPlayer.get(canonicalId);

      if (!existing) {
        // Premier match pour ce joueur — copie profonde avec l'ID canonique
        byPlayer.set(canonicalId, {
          ...ps,
          playerId: canonicalId,
          matchId: 'cumulative',
          overall: { ...ps.overall },
          bySet: {},   // pas de vision par set en cumulatif
          bySetAndSkill: {},
          bySkill: Object.fromEntries(
            (Object.entries(ps.bySkill) as [Skill, QualityDistribution][])
              .map(([skill, dist]) => [skill, { ...dist }]),
          ) as Partial<Record<Skill, QualityDistribution>>,
        });
      } else {
        // Fusion
        existing.overall = addSkillStats(existing.overall, ps.overall);

        // bySkill
        for (const [skill, dist] of Object.entries(ps.bySkill) as [Skill, QualityDistribution][]) {
          existing.bySkill[skill] = existing.bySkill[skill]
            ? addQualityDist(existing.bySkill[skill]!, dist)
            : { ...dist };
        }
      }
    }
  }

  return Array.from(byPlayer.values());
}

export { emptyQualityDist, emptySkillStats };
