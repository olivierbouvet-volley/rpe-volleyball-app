import type { Match, Player, QualityDistribution } from '@volleyvision/data-model';

/**
 * Format efficiency as percentage with 1 decimal place
 */
export function formatEfficiency(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format positive rate as percentage with 1 decimal place
 */
export function formatPositiveRate(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format quality distribution as compact string
 * Example: "#:5 +:3 -:1 =:2"
 */
export function formatQualityDist(dist: QualityDistribution): string {
  const parts: string[] = [];
  if (dist['#'] > 0) parts.push(`#:${dist['#']}`);
  if (dist['+'] > 0) parts.push(`+:${dist['+']}`);
  if (dist['!'] > 0) parts.push(`!:${dist['!']}`);
  if (dist['-'] > 0) parts.push(`-:${dist['-']}`);
  if (dist['/'] > 0) parts.push(`/:${dist['/']}`);
  if (dist['='] > 0) parts.push(`=:${dist['=']}`);
  return parts.join(' ') || 'No actions';
}

/**
 * Get player name from player ID
 */
export function getPlayerName(playerId: string, match: Match): string {
  const allPlayers = [...match.homeTeam.players, ...match.awayTeam.players];
  const player = allPlayers.find((p) => p.id === playerId);
  return player ? `${player.firstName} ${player.lastName}` : 'Unknown';
}

/**
 * Get player number from player ID
 */
export function getPlayerNumber(playerId: string, match: Match): number {
  const allPlayers = [...match.homeTeam.players, ...match.awayTeam.players];
  const player = allPlayers.find((p) => p.id === playerId);
  return player?.number || 0;
}

/**
 * Get player object from player ID
 */
export function getPlayer(playerId: string, match: Match): Player | undefined {
  const allPlayers = [...match.homeTeam.players, ...match.awayTeam.players];
  return allPlayers.find((p) => p.id === playerId);
}

/**
 * Format date as DD/MM/YYYY
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  } catch {
    return dateString;
  }
}

/**
 * Get all players from a match
 */
export function getAllPlayers(match: Match): Player[] {
  return [...match.homeTeam.players, ...match.awayTeam.players];
}
