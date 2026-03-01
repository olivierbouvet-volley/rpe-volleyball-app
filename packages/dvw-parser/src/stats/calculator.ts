/**
 * @file calculator.ts
 * @description Calcule les statistiques par joueuse à partir des données de rally
 */

import type {
  Match,
  PlayerMatchStats,
  SkillStats,
  QualityDistribution,
  Skill,
  QualityPro,
  Quality,
  Action,
  Rally,
  TeamSide,
  AttackCombination,
} from '@volleyvision/data-model';
import { QUALITY_PRO_TO_SIMPLE } from '@volleyvision/data-model';

// Liste des qualités DVW professionnelles
const QUALITY_PRO_VALUES: QualityPro[] = ['#', '+', '!', '-', '/', '='];

/** Vérifie si une qualité est une valeur QualityPro (code DVW) */
function isQualityPro(quality: Quality): quality is QualityPro {
  return QUALITY_PRO_VALUES.includes(quality as QualityPro);
}

/**
 * Crée une distribution de qualité vide
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
 * Ajoute une qualité dans une distribution (met à jour les totaux pro et simplifié)
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
 * Crée des stats de compétence vides
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
 * Calcule les stats à partir d'une liste d'actions
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
    if (action.quality === '#') {
      stats.kills++;
    }
    if (action.quality === '/' || action.quality === '=') {
      stats.errors++;
    }
  }

  stats.efficiency =
    stats.totalActions > 0
      ? (stats.kills - stats.errors) / stats.totalActions
      : 0;

  const positiveCount = validActions.filter(
    (a) => a.quality === '#' || a.quality === '+'
  ).length;
  stats.positiveRate =
    stats.totalActions > 0 ? positiveCount / stats.totalActions : 0;

  return stats;
}

/**
 * Trouve la position de rotation (P1=1 à P6=6) d'une joueuse dans un rally donné.
 * Retourne null si les positions ne sont pas disponibles ou si la joueuse n'est pas trouvée.
 */
function getPlayerRotationPosition(
  playerNumber: number,
  playerTeam: TeamSide,
  rally: Rally
): number | null {
  if (!rally.positions) return null;
  const positions =
    playerTeam === 'home' ? rally.positions.home : rally.positions.away;
  if (!positions) return null;

  for (let pos = 1; pos <= 6; pos++) {
    const posKey = `P${pos}` as keyof typeof positions;
    if (positions[posKey] === playerNumber) {
      return pos; // 1 = P1, 2 = P2, ..., 6 = P6
    }
  }
  return null;
}

/**
 * Calcule les statistiques complètes pour chaque joueuse du match.
 *
 * Nouveautés :
 * - attackByCombo : stats d'attaque par code combo DVW (V5, C1, XC...)
 * - attackByTempo : stats d'attaque par tempo (Q=Rapide, H=Haute, T=Tempo, O=Overpass)
 * - byRotation    : stats globales par position de rotation P1-P6
 */
export function calculatePlayerStats(match: Match): PlayerMatchStats[] {
  // Construire le dictionnaire des combinaisons d'attaque pour la liaison croisée
  const comboDictionary = new Map<string, AttackCombination>();
  if (match.dvwMetadata?.attackCombinations) {
    for (const combo of match.dvwMetadata.attackCombinations) {
      comboDictionary.set(combo.code, combo);
    }
  }

  // Collecter les paires {action, rally} par joueuse
  // (on a besoin du rally pour accéder aux positions de rotation)
  const playerDataMap = new Map<string, Array<{ action: Action; rally: Rally }>>();

  for (const set of match.sets) {
    for (const rally of set.rallies) {
      for (const action of rally.actions) {
        const playerId = action.player.id;
        if (!playerDataMap.has(playerId)) {
          playerDataMap.set(playerId, []);
        }
        playerDataMap.get(playerId)!.push({ action, rally });
      }
    }
  }

  const allPlayerStats: PlayerMatchStats[] = [];

  for (const [playerId, actionRallyPairs] of playerDataMap.entries()) {
    const actions = actionRallyPairs.map((p) => p.action);

    // Stats globales
    const overall = calculateSkillStats(actions);

    // Par set
    const bySet: Record<number, SkillStats> = {};
    for (const set of match.sets) {
      const setActions = actions.filter((a) =>
        match.sets[set.number - 1]?.rallies.some((r) =>
          r.actions.some((ra) => ra.id === a.id)
        )
      );
      bySet[set.number] = calculateSkillStats(setActions);
    }

    // Par compétence
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
          if (action.isOpponentError) continue;
          if (isQualityPro(action.quality)) {
            addToDistribution(dist, action.quality);
          }
        }
        bySkill[skill] = dist;
      }
    }

    // Par set et compétence
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
            if (action.isOpponentError) continue;
            if (isQualityPro(action.quality)) {
              addToDistribution(dist, action.quality);
            }
          }
          bySetAndSkill[key] = dist;
        }
      }
    }

    // ─── AMÉLIORATION 1 : Attaque par code combo et par tempo ───────────────

    /** Stats d'attaque groupées par code combo DVW (ex: "V5", "C1", "XC") */
    const attackByCombo: Record<string, QualityDistribution> = {};

    /** Stats d'attaque groupées par tempo (ex: "Q"=Rapide, "H"=Haute, "T"=Tempo) */
    const attackByTempo: Record<string, QualityDistribution> = {};

    // ─── AMÉLIORATION 2 : Actions collectées par position P1-P6 ─────────────

    /** Actions groupées par position de rotation (1=P1 ... 6=P6) */
    const rotationActionsMap = new Map<number, Action[]>();

    for (const { action, rally } of actionRallyPairs) {
      if (action.isOpponentError) continue;

      // Amélioration 1 — liaison croisée combo attaque ↔ définitions
      if (action.skill === 'attack' && action.subtype) {
        const comboCode = action.subtype;

        // Par code combo (V5, C1, XC...)
        if (!attackByCombo[comboCode]) {
          attackByCombo[comboCode] = createEmptyDistribution();
        }
        if (isQualityPro(action.quality)) {
          addToDistribution(attackByCombo[comboCode], action.quality);
        }

        // Par tempo — via le dictionnaire construit depuis [3ATTACKCOMBINATION]
        const comboDef = comboDictionary.get(comboCode);
        if (comboDef?.tempo) {
          const tempoKey = comboDef.tempo; // 'Q' | 'H' | 'T' | 'O' | 'U'
          if (!attackByTempo[tempoKey]) {
            attackByTempo[tempoKey] = createEmptyDistribution();
          }
          if (isQualityPro(action.quality)) {
            addToDistribution(attackByTempo[tempoKey], action.quality);
          }
        }
      }

      // Amélioration 2 — position de rotation de la joueuse pendant cette action
      const rotPos = getPlayerRotationPosition(
        action.player.number,
        action.player.team,
        rally
      );
      if (rotPos !== null) {
        if (!rotationActionsMap.has(rotPos)) {
          rotationActionsMap.set(rotPos, []);
        }
        rotationActionsMap.get(rotPos)!.push(action);
      }
    }

    // Calculer les SkillStats par position de rotation
    const byRotation: Record<number, SkillStats> = {};
    for (const [pos, posActions] of rotationActionsMap.entries()) {
      byRotation[pos] = calculateSkillStats(posActions);
    }

    allPlayerStats.push({
      matchId: match.id,
      playerId,
      date: match.date,
      overall,
      bySet,
      bySkill,
      bySetAndSkill,
      attackByCombo:
        Object.keys(attackByCombo).length > 0 ? attackByCombo : undefined,
      attackByTempo:
        Object.keys(attackByTempo).length > 0 ? attackByTempo : undefined,
      byRotation:
        Object.keys(byRotation).length > 0 ? byRotation : undefined,
    });
  }

  return allPlayerStats;
}
