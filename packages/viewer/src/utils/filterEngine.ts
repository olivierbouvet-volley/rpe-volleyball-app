import type { Match, Rally, Action, Quality } from '@volleyvision/data-model';
import type { FilterCriteria } from '../store/filterStore';

export interface FilteredAction {
  action: Action;
  rally: Rally;
  setNumber: number;
  matchTime: string;           // "Set 1 — 15-12 — Rally #23"
  estimatedTimestamp?: number; // Timestamp calculé pour les actions sans timestamp
  sequenceStart?: number;      // Début de la séquence (pour contexte)
  sequenceEnd?: number;        // Fin de la séquence (pour contexte)
}

/**
 * Applique les critères de filtrage sur toutes les actions d'un match
 */
export function applyFilters(match: Match, criteria: FilterCriteria): FilteredAction[] {
  const results: FilteredAction[] = [];

  for (const set of match.sets) {
    // Filtre set
    if (criteria.setNumbers.length > 0 && !criteria.setNumbers.includes(set.number)) {
      continue;
    }

    for (const rally of set.rallies) {
      // Filtre rotation
      if (criteria.rotations.length > 0) {
        if (criteria.teamSide) {
          // Si une équipe est sélectionnée, filtrer par sa rotation
          const relevantRot = criteria.teamSide === 'home'
            ? rally.rotation?.home
            : rally.rotation?.away;
          if (relevantRot && !criteria.rotations.includes(relevantRot)) {
            continue;
          }
        } else {
          // Si pas d'équipe sélectionnée, filtrer par rotation de l'équipe home
          const homeRot = rally.rotation?.home;
          if (homeRot && !criteria.rotations.includes(homeRot)) {
            continue;
          }
        }
      }

      // Filtre servingTeam
      if (criteria.servingTeam && rally.servingTeam !== criteria.servingTeam) {
        continue;
      }

      // Parcourir les actions du rally
      for (let i = 0; i < rally.actions.length; i++) {
        const action = rally.actions[i];
        if (matchesActionCriteria(action, criteria)) {
          // Calculer timestamps pour actions sans timestamp (notamment les passes)
          let estimatedTimestamp: number | undefined;
          let sequenceStart: number | undefined;
          let sequenceEnd: number | undefined;

          if (!action.videoTimestamp && action.skill === 'set') {
            // Chercher l'action précédente (réception/défense) et suivante (attaque)
            const prevAction = i > 0 ? rally.actions[i - 1] : null;
            const nextAction = i < rally.actions.length - 1 ? rally.actions[i + 1] : null;

            if (prevAction?.videoTimestamp && nextAction?.videoTimestamp) {
              // Timestamp interpolé : milieu entre réception et attaque
              estimatedTimestamp = (prevAction.videoTimestamp + nextAction.videoTimestamp) / 2;
              // Séquence complète : de la réception à l'attaque + 1s
              sequenceStart = prevAction.videoTimestamp;
              sequenceEnd = nextAction.videoTimestamp + 1;
            } else if (prevAction?.videoTimestamp) {
              // Seulement action précédente : estimer +0.5s après
              estimatedTimestamp = prevAction.videoTimestamp + 0.5;
              sequenceStart = prevAction.videoTimestamp;
              sequenceEnd = prevAction.videoTimestamp + 2;
            } else if (nextAction?.videoTimestamp) {
              // Seulement action suivante : estimer -0.5s avant
              estimatedTimestamp = nextAction.videoTimestamp - 0.5;
              sequenceStart = nextAction.videoTimestamp - 1;
              sequenceEnd = nextAction.videoTimestamp + 1;
            }
          }

          results.push({
            action,
            rally,
            setNumber: set.number,
            matchTime: formatMatchTime(set.number, rally),
            estimatedTimestamp,
            sequenceStart,
            sequenceEnd,
          });
        }
      }
    }
  }

  return results;
}

/**
 * Vérifie si une action correspond aux critères de filtrage
 */
function matchesActionCriteria(action: Action, criteria: FilterCriteria): boolean {
  // Filtre team
  if (criteria.teamSide && action.player.team !== criteria.teamSide) {
    return false;
  }

  // Filtre joueur
  if (criteria.playerIds.length > 0 && !criteria.playerIds.includes(action.player.id)) {
    return false;
  }

  // Filtre skill
  if (criteria.skills.length > 0 && !criteria.skills.includes(action.skill)) {
    return false;
  }

  // Filtre qualité
  if (criteria.qualities.length > 0 && !criteria.qualities.includes(action.quality)) {
    return false;
  }

  // Filtre combo d'attaque (action.subtype)
  if (criteria.attackCombos.length > 0) {
    if (!action.subtype || !criteria.attackCombos.includes(action.subtype)) {
      return false;
    }
  }

  // Filtre zone départ
  if (criteria.startZones.length > 0) {
    if (!action.startZone || !criteria.startZones.includes(action.startZone)) {
      return false;
    }
  }

  // Filtre zone arrivée
  if (criteria.endZones.length > 0) {
    if (!action.endZone || !criteria.endZones.includes(action.endZone)) {
      return false;
    }
  }

  // Filtre bloqueurs
  if (criteria.minBlockers !== null && (action.numBlockers ?? 0) < criteria.minBlockers) {
    return false;
  }
  if (criteria.maxBlockers !== null && (action.numBlockers ?? 0) > criteria.maxBlockers) {
    return false;
  }

  // Filtre setter call
  if (criteria.setterCalls.length > 0) {
    if (!action.setterCall || !criteria.setterCalls.includes(action.setterCall)) {
      return false;
    }
  }

  // Filtre videoTimestamp - accepter aussi les timestamps estimés pour les passes
  if (criteria.hasVideoTimestamp) {
    // Les passes sans timestamp seront acceptées car on calcule un estimatedTimestamp
    // Les autres skills doivent avoir un vrai timestamp
    if (action.skill !== 'set' && action.videoTimestamp == null) {
      return false;
    }
  }

  return true;
}

/**
 * Formate le contexte temporel d'une action dans le match
 */
function formatMatchTime(setNumber: number, rally: Rally): string {
  return `Set ${setNumber} — ${rally.homeScoreAfter}-${rally.awayScoreAfter} — Rally #${rally.rallyNumber}`;
}

/**
 * Construit des presets de filtres courants
 */
export function buildPreset(
  type: string,
  match: Match,
  playerId?: string
): Partial<FilterCriteria> {
  switch (type) {
    case 'all-attacks':
      return {
        skills: ['attack'],
        playerIds: playerId ? [playerId] : [],
      };

    case 'all-serves':
      return {
        skills: ['serve'],
        playerIds: playerId ? [playerId] : [],
      };

    case 'kills-only':
      return {
        skills: ['attack'],
        qualities: ['#'],
        playerIds: playerId ? [playerId] : [],
      };

    case 'errors-only':
      return {
        qualities: ['=', '/'],
      };

    case 'reception':
      return {
        skills: ['receive'],
        playerIds: playerId ? [playerId] : [],
      };

    default:
      return {};
  }
}
