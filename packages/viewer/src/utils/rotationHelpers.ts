/**
 * @file rotationHelpers.ts
 * @description Helper functions for rotation analysis and court diagram
 */

import type { Match, Rally, TeamSide, Player } from '@volleyvision/data-model';

export interface PlayerPosition {
  position: 1 | 2 | 3 | 4 | 5 | 6;
  playerId: string;
  playerName: string;
  playerNumber: number;
  isLibero?: boolean;
  isSetter?: boolean;
}

/**
 * Récupère les joueurs d'une équipe pour un rally donné
 *
 * @param match - Match complet
 * @param teamSide - Côté de l'équipe ('home' | 'away')
 * @param rally - Rally contenant les positions des joueurs
 * @returns Array de PlayerPosition avec position, playerId, playerName, playerNumber, isSetter
 *
 * Utilise rally.positions qui contient les numéros de joueurs à chaque position P1-P6
 */
export function getPlayersForRotation(
  match: Match,
  teamSide: TeamSide,
  rally: Rally
): PlayerPosition[] {
  if (!rally.positions) {
    return [];
  }

  const team = teamSide === 'home' ? match.homeTeam : match.awayTeam;
  const rotation = teamSide === 'home' ? rally.positions.home : rally.positions.away;

  const positions: PlayerPosition[] = [];

  // Parcourir les 6 positions
  for (let pos = 1; pos <= 6; pos++) {
    const posKey = `P${pos}` as keyof typeof rotation;
    const playerNumber = rotation[posKey];

    // Trouver le joueur dans l'équipe
    const player = team.players.find((p) => p.number === playerNumber);

    if (player) {
      positions.push({
        position: pos as 1 | 2 | 3 | 4 | 5 | 6,
        playerId: player.id,
        playerName: `${player.lastName}`,
        playerNumber: player.number,
        isLibero: player.isLibero ?? false,
        isSetter: player.position === 'SET',
      });
    } else {
      // Joueur non trouvé, afficher juste le numéro
      positions.push({
        position: pos as 1 | 2 | 3 | 4 | 5 | 6,
        playerId: `unknown-${playerNumber}`,
        playerName: `#${playerNumber}`,
        playerNumber: playerNumber,
        isLibero: false,
        isSetter: false,
      });
    }
  }

  return positions;
}

/**
 * Trouve le rally actuel en fonction du temps vidéo
 *
 * @param match - Match complet
 * @param currentTime - Temps actuel de la vidéo (en secondes)
 * @param offset - Offset de synchronisation entre vidéo et DVW
 * @returns Rally le plus proche, ou null si aucun rally trouvé
 *
 * Utilise les videoTimestamp des rallies pour déterminer quel rally est actif.
 * Le match DVW time = video time - offset
 */
export function findCurrentRally(
  match: Match,
  currentTime: number,
  offset: number
): Rally | null {
  if (!match.sets || match.sets.length === 0) {
    return null;
  }

  // Temps DVW = temps vidéo - offset
  const dvwTime = currentTime - offset;

  let closestRally: Rally | null = null;
  let smallestDiff = Infinity;

  // Parcourir tous les sets et rallies
  for (const set of match.sets) {
    for (const rally of set.rallies) {
      // Utiliser le videoTimestamp du rally (début du rally)
      if (rally.videoTimestamp !== undefined) {
        const rallyStart = rally.videoTimestamp;
        const rallyEnd = rally.endVideoTimestamp ?? rallyStart + 15; // Durée par défaut 15s

        // Vérifier si le temps actuel est dans cet intervalle
        if (dvwTime >= rallyStart && dvwTime <= rallyEnd) {
          return rally;
        }

        // Sinon, garder le rally le plus proche
        const diff = Math.abs(rallyStart - dvwTime);
        if (diff < smallestDiff) {
          smallestDiff = diff;
          closestRally = rally;
        }
      }
    }
  }

  // Retourner null si le rally le plus proche est à plus de 60 secondes
  if (smallestDiff > 60) {
    return null;
  }

  return closestRally;
}

/**
 * Compte le nombre de points marqués par une équipe dans une rotation donnée
 *
 * @param match - Match complet
 * @param teamSide - Côté de l'équipe
 * @param setNumber - Numéro du set
 * @param rotation - Numéro de rotation (1-6)
 * @returns Nombre de points marqués dans cette rotation
 */
export function countPointsInRotation(
  match: Match,
  teamSide: TeamSide,
  setNumber: number,
  rotation: number
): number {
  const set = match.sets.find((s) => s.number === setNumber);
  if (!set) return 0;

  let points = 0;

  for (const rally of set.rallies) {
    // Vérifier si l'équipe est dans la bonne rotation
    const teamRotation = teamSide === 'home' ? rally.rotation?.home : rally.rotation?.away;
    if (teamRotation !== rotation) continue;

    // Vérifier si l'équipe a gagné le point
    if (rally.pointWinner === teamSide) {
      points++;
    }
  }

  return points;
}

/**
 * Calcule le taux de side-out pour une équipe dans une rotation
 *
 * Side-out = récupération du service (gagner le point quand on ne sert pas)
 *
 * @param match - Match complet
 * @param teamSide - Côté de l'équipe
 * @param setNumber - Numéro du set
 * @param rotation - Numéro de rotation (1-6)
 * @returns Pourcentage de side-out (0-100)
 */
export function calculateSideOutRate(
  match: Match,
  teamSide: TeamSide,
  setNumber: number,
  rotation: number
): number {
  const set = match.sets.find((s) => s.number === setNumber);
  if (!set) return 0;

  let sideOutOpportunities = 0;
  let successfulSideOuts = 0;

  for (const rally of set.rallies) {
    // Vérifier si l'équipe est dans la bonne rotation
    const teamRotation = teamSide === 'home' ? rally.rotation?.home : rally.rotation?.away;
    if (teamRotation !== rotation) continue;

    // Vérifier si l'équipe ne sert PAS (c'est une opportunité de side-out)
    if (rally.servingTeam !== teamSide) {
      sideOutOpportunities++;

      // Si l'équipe gagne le point, c'est un side-out réussi
      if (rally.pointWinner === teamSide) {
        successfulSideOuts++;
      }
    }
  }

  if (sideOutOpportunities === 0) return 0;
  return (successfulSideOuts / sideOutOpportunities) * 100;
}

/**
 * Compte le nombre de break points (points gagnés en tant que serveur)
 *
 * Break point = gagner le point quand on sert (empêcher le side-out adverse)
 *
 * @param match - Match complet
 * @param teamSide - Côté de l'équipe
 * @param setNumber - Numéro du set
 * @param rotation - Numéro de rotation (1-6)
 * @returns Nombre de break points
 */
export function countBreakPoints(
  match: Match,
  teamSide: TeamSide,
  setNumber: number,
  rotation: number
): number {
  const set = match.sets.find((s) => s.number === setNumber);
  if (!set) return 0;

  let breakPoints = 0;

  for (const rally of set.rallies) {
    // Vérifier si l'équipe est dans la bonne rotation
    const teamRotation = teamSide === 'home' ? rally.rotation?.home : rally.rotation?.away;
    if (teamRotation !== rotation) continue;

    // Vérifier si l'équipe sert ET gagne le point
    if (rally.servingTeam === teamSide && rally.pointWinner === teamSide) {
      breakPoints++;
    }
  }

  return breakPoints;
}

/**
 * Tronque un nom de joueur pour l'affichage
 *
 * @param name - Nom complet
 * @param maxLength - Longueur maximum
 * @returns Nom tronqué avec "." si nécessaire
 *
 * Exemples:
 * - "Alexandre" (max 8) -> "Alex."
 * - "Kim" (max 8) -> "Kim"
 */
export function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) {
    return name;
  }
  return name.slice(0, maxLength - 1) + '.';
}

/**
 * Récupère toutes les rotations uniques pour une équipe dans un set
 *
 * @param match - Match complet
 * @param teamSide - Côté de l'équipe
 * @param setNumber - Numéro du set
 * @returns Array des rotations utilisées (triées)
 */
export function getRotationsInSet(
  match: Match,
  teamSide: TeamSide,
  setNumber: number
): number[] {
  const set = match.sets.find((s) => s.number === setNumber);
  if (!set) return [];

  const rotations = new Set<number>();

  for (const rally of set.rallies) {
    const teamRotation = teamSide === 'home' ? rally.rotation?.home : rally.rotation?.away;
    if (teamRotation) {
      rotations.add(teamRotation);
    }
  }

  return Array.from(rotations).sort((a, b) => a - b);
}

/**
 * Compte le nombre de blocs et défenses pour une équipe dans une rotation
 *
 * @param match - Match complet
 * @param teamSide - Côté de l'équipe
 * @param setNumber - Numéro du set
 * @param rotation - Numéro de rotation (1-6)
 * @returns Objet avec blocks et digs
 */
export function countBlocksAndDigs(
  match: Match,
  teamSide: TeamSide,
  setNumber: number,
  rotation: number
): { blocks: number; digs: number } {
  const set = match.sets.find((s) => s.number === setNumber);
  if (!set) return { blocks: 0, digs: 0 };

  let blocks = 0;
  let digs = 0;

  for (const rally of set.rallies) {
    // Vérifier si l'équipe est dans la bonne rotation
    const teamRotation = teamSide === 'home' ? rally.rotation?.home : rally.rotation?.away;
    if (teamRotation !== rotation) continue;

    // Compter les actions de l'équipe
    for (const action of rally.actions) {
      const actionTeam = action.player.id.startsWith('home') ? 'home' : 'away';
      if (actionTeam !== teamSide) continue;

      if (action.skill === 'block' && action.quality === '#') {
        blocks++;
      } else if (action.skill === 'dig' && (action.quality === '#' || action.quality === '+')) {
        digs++;
      }
    }
  }

  return { blocks, digs };
}

/**
 * Calcule le taux de réception positif et le nombre d'excellentes réceptions
 *
 * @param match - Match complet
 * @param teamSide - Côté de l'équipe
 * @param setNumber - Numéro du set
 * @param rotation - Numéro de rotation (1-6)
 * @returns Objet avec posRate (%), perfectCount, totalReceptions
 */
export function calculateReceptionStats(
  match: Match,
  teamSide: TeamSide,
  setNumber: number,
  rotation: number
): { posRate: number; perfectCount: number; totalReceptions: number } {
  const set = match.sets.find((s) => s.number === setNumber);
  if (!set) return { posRate: 0, perfectCount: 0, totalReceptions: 0 };

  let totalReceptions = 0;
  let positiveReceptions = 0; // # et +
  let perfectCount = 0; // # seulement

  for (const rally of set.rallies) {
    // Vérifier si l'équipe est dans la bonne rotation
    const teamRotation = teamSide === 'home' ? rally.rotation?.home : rally.rotation?.away;
    if (teamRotation !== rotation) continue;

    // Vérifier si l'équipe reçoit (ne sert pas)
    if (rally.servingTeam === teamSide) continue;

    // Compter les réceptions de l'équipe
    for (const action of rally.actions) {
      const actionTeam = action.player.id.startsWith('home') ? 'home' : 'away';
      if (actionTeam !== teamSide) continue;

      if (action.skill === 'receive') {
        totalReceptions++;
        if (action.quality === '#' || action.quality === '+') {
          positiveReceptions++;
        }
        if (action.quality === '#') {
          perfectCount++;
        }
      }
    }
  }

  const posRate = totalReceptions > 0 ? (positiveReceptions / totalReceptions) * 100 : 0;
  return { posRate, perfectCount, totalReceptions };
}

/**
 * Récupère tous les rallies pour une équipe dans une rotation donnée
 *
 * @param match - Match complet
 * @param teamSide - Côté de l'équipe
 * @param setNumber - Numéro du set
 * @param rotation - Numéro de rotation (1-6)
 * @param servingTeam - Optionnel: filtrer par équipe au service
 * @returns Array de rallies
 */
export function getRalliesForRotation(
  match: Match,
  teamSide: TeamSide,
  setNumber: number,
  rotation: number,
  servingTeam?: TeamSide
): Rally[] {
  const set = match.sets.find((s) => s.number === setNumber);
  if (!set) return [];

  const rallies: Rally[] = [];

  for (const rally of set.rallies) {
    const teamRotation = teamSide === 'home' ? rally.rotation?.home : rally.rotation?.away;
    if (teamRotation !== rotation) continue;

    // Filtrer par équipe au service si spécifié
    if (servingTeam !== undefined && rally.servingTeam !== servingTeam) continue;

    rallies.push(rally);
  }

  return rallies;
}

/**
 * Récupère les informations du serveur pour un rally
 *
 * @param match - Match complet
 * @param rally - Rally
 * @returns Objet avec player (joueur serveur) et teamSide
 */
export function getServerInfo(
  match: Match,
  rally: Rally
): { player: Player | null; teamSide: TeamSide } | null {
  if (!rally.servingTeam || !rally.positions) return null;

  const team = rally.servingTeam === 'home' ? match.homeTeam : match.awayTeam;
  const positions = rally.servingTeam === 'home' ? rally.positions.home : rally.positions.away;

  // Le serveur est toujours en position P1
  const serverNumber = positions.P1;
  const player = team.players.find((p) => p.number === serverNumber);

  return {
    player: player || null,
    teamSide: rally.servingTeam,
  };
}

/**
 * Identifie la position du passeur dans une rotation
 *
 * @param match - Match complet
 * @param teamSide - Côté de l'équipe
 * @param rally - Rally
 * @returns Position du passeur (1-6) ou null si non trouvé
 */
export function identifySetterPosition(
  match: Match,
  teamSide: TeamSide,
  rally: Rally
): number | null {
  if (!rally.positions) return null;

  const team = teamSide === 'home' ? match.homeTeam : match.awayTeam;
  const positions = teamSide === 'home' ? rally.positions.home : rally.positions.away;

  // Trouver le passeur dans l'équipe (position = 'SET')
  const setter = team.players.find((p) => p.position === 'SET');
  if (!setter) return null;

  // Trouver à quelle position se trouve le passeur
  for (let pos = 1; pos <= 6; pos++) {
    const posKey = `P${pos}` as keyof typeof positions;
    if (positions[posKey] === setter.number) {
      return pos;
    }
  }

  return null;
}
