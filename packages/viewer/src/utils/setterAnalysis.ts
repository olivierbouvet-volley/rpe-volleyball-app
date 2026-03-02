/**
 * @file setterAnalysis.ts
 * @description Analyse de distribution du setter (passeuse) basée sur les actions d'attaque
 */

import type { Match, Rally, Action, TeamSide, Quality } from '@volleyvision/data-model';

export interface ZoneDistribution {
  zone: number;                   // Zone de destination (1-6, 8=pipe)
  count: number;                  // Nombre de passes vers cette zone
  percentage: number;             // % du total
  attackEfficiency: number;       // (#-errors)/total — entre -1 et 1
  attackKills: number;
  attackErrors: number;
  attackTotal: number;
  comboBreakdown: Record<string, number>;  // PP→5, V5→8, C1→3
  playerBreakdown: Record<string, { count: number; kills: number; errors: number }>;
}

export interface SetterDistributionData {
  totalSets: number;                              // Nombre total de passes analysées
  byZone: Map<number, ZoneDistribution>;          // Zone 1-6 + 8(pipe) → distribution
  byReceptionQuality: Map<string, ZoneDistribution[]>;  // K# → distribution par zone
  byRotation: Map<number, ZoneDistribution[]>;    // R1-R6 → distribution par zone
}

export interface SetterAnalysisOptions {
  setFilter?: number;
  rotationFilter?: number;
  receptionQualityFilter?: string;   // Quality code: '#', '+', '!', '-', etc.
  receptionZoneFilter?: number;      // Zone 1-9 where reception made contact
  teamSide?: TeamSide;
}

/**
 * Setter call labels for display
 */
export function getSetterCallLabel(call: string): string {
  const labels: Record<string, string> = {
    'K0': 'Passe parfaite (#)',
    'K1': 'Bonne passe (+)',
    'K2': 'Passe moyenne (!)',
    'K7': 'Passe difficile (-)',
    'KA': 'Transition après attaque adverse',
    'KB': 'Free ball',
    'KC': 'Transition après service',
    'KF': 'Transition après faute',
    'KK': 'Contre-attaque après block',
    'K#': 'Passe parfaite (#)',
  };
  return labels[call] || call;
}

/**
 * Zone labels for display
 */
export function getZoneLabel(zone: number): string {
  const labels: Record<number, string> = {
    1: 'Poste 1 (arrière droite)',
    2: 'Poste 2 (avant droite)',
    3: 'Poste 3 (centre)',
    4: 'Poste 4 (avant gauche)',
    5: 'Poste 5 (arrière gauche)',
    6: 'Poste 6 (arrière centre)',
    8: 'Pipe (centre arrière)',
  };
  return labels[zone] || `Zone ${zone}`;
}

/**
 * Short zone labels for compact display
 */
export function getZoneShortLabel(zone: number): string {
  const labels: Record<number, string> = {
    1: 'Z1',
    2: 'Z2',
    3: 'Z3',
    4: 'Z4',
    5: 'Z5',
    6: 'Z6',
    8: 'Pipe',
  };
  return labels[zone] || `Z${zone}`;
}

/**
 * Analyze setter distribution from match data.
 * Collects all attacks and groups them by zone, reception quality, and rotation.
 */
export function analyzeSetterDistribution(
  match: Match,
  options?: SetterAnalysisOptions
): SetterDistributionData {
  const teamSide = options?.teamSide ?? 'home';
  const attacks = collectAttacks(match, teamSide, options);

  // Build byZone distribution
  const byZone = buildZoneDistribution(attacks);

  // Build byReceptionQuality distribution
  const byReceptionQuality = buildByReceptionQuality(attacks);

  // Build byRotation distribution
  const byRotation = buildByRotation(attacks);

  return {
    totalSets: attacks.length,
    byZone,
    byReceptionQuality,
    byRotation,
  };
}

interface CollectedAttack {
  action: Action;
  rally: Rally;
  setNumber: number;
  zone: number;
  combo: string;
  quality: Quality;
  receptionQuality: string | null;   // Quality of the preceding reception
  setterCall: string | null;
  rotation: number | null;
  playerKey: string;                 // "#{number} {name}"
}

/**
 * Collect all attacks for a given team, applying filters.
 */
function collectAttacks(
  match: Match,
  teamSide: TeamSide,
  options?: SetterAnalysisOptions
): CollectedAttack[] {
  const attacks: CollectedAttack[] = [];

  for (const set of match.sets) {
    // Set filter
    if (options?.setFilter && set.number !== options.setFilter) continue;

    for (const rally of set.rallies) {
      // Rotation filter
      const rotation = teamSide === 'home' ? rally.rotation?.home : rally.rotation?.away;
      if (options?.rotationFilter && rotation !== options.rotationFilter) continue;

      // Find reception quality in this rally
      const reception = rally.actions.find(
        a => a.skill === 'receive' && a.player.team === teamSide
      );
      const receptionQuality = reception?.quality as string ?? null;
      const receptionZone = reception?.endZone ?? null;

      // Reception quality filter
      if (options?.receptionQualityFilter && receptionQuality !== options.receptionQualityFilter) continue;
      
      // Reception zone filter
      if (options?.receptionZoneFilter && receptionZone !== options.receptionZoneFilter) continue;

      // Find setter call from set action
      const setAction = rally.actions.find(
        a => a.skill === 'set' && a.player.team === teamSide
      );
      const setterCall = setAction?.setterCall ?? null;

      // Collect all attacks for this team
      const teamAttacks = rally.actions.filter(
        a => a.skill === 'attack' && a.player.team === teamSide
      );

      for (const attack of teamAttacks) {
        const zone = attack.startZone ?? 0;
        if (zone === 0) {
          console.warn('[SetterAnalysis] Attack without startZone:', attack.id, attack.player.number, attack.subtype);
          continue; // Skip attacks without zone info
        }

        // Map zone 6 attacks to pipe (zone 8) if it's a pipe combo
        const effectiveZone = isPipeCombo(attack.subtype) ? 8 : zone;

        const player = findPlayerName(match, teamSide, attack.player.number);

        attacks.push({
          action: attack,
          rally,
          setNumber: set.number,
          zone: effectiveZone,
          combo: attack.subtype ?? '??',
          quality: attack.quality,
          receptionQuality,
          setterCall,
          rotation: rotation ?? null,
          playerKey: `#${attack.player.number} ${player}`,
        });
      }
    }
  }

  return attacks;
}

/**
 * Check if an attack combo is a pipe (back-row attack from middle)
 */
function isPipeCombo(combo?: string): boolean {
  if (!combo) return false;
  const pipeCombos = ['PP', 'PJ', 'PI', 'PC'];
  return pipeCombos.includes(combo.toUpperCase());
}

/**
 * Find player name from match data
 */
function findPlayerName(match: Match, teamSide: TeamSide, playerNumber: number): string {
  const team = teamSide === 'home' ? match.homeTeam : match.awayTeam;
  const player = team.players.find(p => p.number === playerNumber);
  return player ? player.lastName : `#${playerNumber}`;
}

/**
 * Build zone distribution from collected attacks
 */
function buildZoneDistribution(attacks: CollectedAttack[]): Map<number, ZoneDistribution> {
  const byZone = new Map<number, ZoneDistribution>();
  const total = attacks.length;

  // Group by zone
  const grouped = new Map<number, CollectedAttack[]>();
  for (const attack of attacks) {
    const arr = grouped.get(attack.zone) ?? [];
    arr.push(attack);
    grouped.set(attack.zone, arr);
  }

  for (const [zone, zoneAttacks] of grouped) {
    const kills = zoneAttacks.filter(a => a.quality === '#').length;
    const errors = zoneAttacks.filter(a => a.quality === '=' || a.quality === '/').length;
    const count = zoneAttacks.length;

    // Combo breakdown
    const comboBreakdown: Record<string, number> = {};
    for (const a of zoneAttacks) {
      comboBreakdown[a.combo] = (comboBreakdown[a.combo] ?? 0) + 1;
    }

    // Player breakdown
    const playerBreakdown: Record<string, { count: number; kills: number; errors: number }> = {};
    for (const a of zoneAttacks) {
      if (!playerBreakdown[a.playerKey]) {
        playerBreakdown[a.playerKey] = { count: 0, kills: 0, errors: 0 };
      }
      playerBreakdown[a.playerKey].count++;
      if (a.quality === '#') playerBreakdown[a.playerKey].kills++;
      if (a.quality === '=' || a.quality === '/') playerBreakdown[a.playerKey].errors++;
    }

    byZone.set(zone, {
      zone,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      attackEfficiency: count > 0 ? (kills - errors) / count : 0,
      attackKills: kills,
      attackErrors: errors,
      attackTotal: count,
      comboBreakdown,
      playerBreakdown,
    });
  }

  return byZone;
}

/**
 * Build distribution grouped by reception quality
 */
function buildByReceptionQuality(attacks: CollectedAttack[]): Map<string, ZoneDistribution[]> {
  const byRecQ = new Map<string, CollectedAttack[]>();

  for (const attack of attacks) {
    const key = attack.receptionQuality ?? 'unknown';
    const arr = byRecQ.get(key) ?? [];
    arr.push(attack);
    byRecQ.set(key, arr);
  }

  const result = new Map<string, ZoneDistribution[]>();
  for (const [quality, qualityAttacks] of byRecQ) {
    const zoneDist = buildZoneDistribution(qualityAttacks);
    result.set(quality, Array.from(zoneDist.values()));
  }

  return result;
}

/**
 * Build distribution grouped by rotation
 */
function buildByRotation(attacks: CollectedAttack[]): Map<number, ZoneDistribution[]> {
  const byRot = new Map<number, CollectedAttack[]>();

  for (const attack of attacks) {
    if (attack.rotation === null) continue;
    const arr = byRot.get(attack.rotation) ?? [];
    arr.push(attack);
    byRot.set(attack.rotation, arr);
  }

  const result = new Map<number, ZoneDistribution[]>();
  for (const [rotation, rotAttacks] of byRot) {
    const zoneDist = buildZoneDistribution(rotAttacks);
    result.set(rotation, Array.from(zoneDist.values()));
  }

  return result;
}

/**
 * Get the efficiency color for display
 */
export function getEfficiencyColor(efficiency: number): string {
  if (efficiency >= 0.4) return '#22c55e';   // Green
  if (efficiency >= 0.2) return '#f59e0b';   // Orange
  if (efficiency >= 0) return '#f97316';     // Dark orange
  return '#ef4444';                          // Red
}

/**
 * Get arrow thickness based on percentage (1-8 scale)
 */
export function getArrowThickness(percentage: number): number {
  return Math.max(1, Math.min(8, Math.round(percentage / 10)));
}
