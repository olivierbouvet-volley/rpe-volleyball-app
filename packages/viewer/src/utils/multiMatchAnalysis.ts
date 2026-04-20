/**
 * @file multiMatchAnalysis.ts
 * @description Analyse SetterDistribution cumulée sur N matchs
 *
 * La fonction principale analyzeSetterDistributionMulti() :
 *  1. Détermine automatiquement le teamSide (home|away) dans chaque match
 *     en comparant le nom de l'équipe étudiée
 *  2. Appelle analyzeSetterDistribution() sur chaque match
 *  3. Fusionne tous les résultats en une seule SetterDistributionData
 */

import type { Match, TeamSide } from '@volleyvision/data-model';
import {
  analyzeSetterDistribution,
  type SetterDistributionData,
  type ZoneDistribution,
  type SetterCallStat,
  type SetterAnalysisOptions,
} from './setterAnalysis';

// ─── Helpers internes ───────────────────────────────────────────────────────

export function getTeamSideByName(match: Match, teamName: string): TeamSide | null {
  if (match.homeTeam.name === teamName) return 'home';
  if (match.awayTeam.name === teamName) return 'away';
  return null;
}

function mergeZoneDistsTwo(a: ZoneDistribution, b: ZoneDistribution): ZoneDistribution {
  const comboBreakdown = { ...a.comboBreakdown };
  for (const [k, v] of Object.entries(b.comboBreakdown)) {
    comboBreakdown[k] = (comboBreakdown[k] ?? 0) + v;
  }
  const playerBreakdown = { ...a.playerBreakdown };
  for (const [k, v] of Object.entries(b.playerBreakdown)) {
    if (playerBreakdown[k]) {
      playerBreakdown[k] = {
        count: playerBreakdown[k].count + v.count,
        kills: playerBreakdown[k].kills + v.kills,
        errors: playerBreakdown[k].errors + v.errors,
      };
    } else {
      playerBreakdown[k] = { ...v };
    }
  }
  const count = a.count + b.count;
  const kills = a.attackKills + b.attackKills;
  const errors = a.attackErrors + b.attackErrors;
  return {
    zone: a.zone,
    count,
    percentage: 0, // recalculé par l'appelant
    attackEfficiency: count > 0 ? (kills - errors) / count : 0,
    attackKills: kills,
    attackErrors: errors,
    attackTotal: count,
    comboBreakdown,
    playerBreakdown,
    videoSecondsList: [...(a.videoSecondsList ?? []), ...(b.videoSecondsList ?? [])],
  };
}

function recalcByZonePercent(
  map: Map<number, ZoneDistribution>,
): Map<number, ZoneDistribution> {
  const total = Array.from(map.values()).reduce((s, z) => s + z.count, 0);
  const result = new Map<number, ZoneDistribution>();
  for (const [zone, zd] of map) {
    result.set(zone, {
      ...zd,
      percentage: total > 0 ? Math.round((zd.count / total) * 100) : 0,
    });
  }
  return result;
}

function mergeZoneArrays(
  a: ZoneDistribution[],
  b: ZoneDistribution[],
): ZoneDistribution[] {
  const map = new Map<number, ZoneDistribution>();
  for (const zd of [...a, ...b]) {
    const ex = map.get(zd.zone);
    map.set(zd.zone, ex ? mergeZoneDistsTwo(ex, zd) : { ...zd });
  }
  const total = Array.from(map.values()).reduce((s, z) => s + z.count, 0);
  return Array.from(map.values()).map((zd) => ({
    ...zd,
    percentage: total > 0 ? Math.round((zd.count / total) * 100) : 0,
  }));
}

function mergeSetterDistributionData(
  a: SetterDistributionData,
  b: SetterDistributionData,
): SetterDistributionData {
  // ── byZone ──────────────────────────────────────────────────────────────
  const byZoneRaw = new Map<number, ZoneDistribution>(
    Array.from(a.byZone.entries()).map(([k, v]) => [k, { ...v }]),
  );
  for (const [zone, zd] of b.byZone) {
    const ex = byZoneRaw.get(zone);
    byZoneRaw.set(zone, ex ? mergeZoneDistsTwo(ex, zd) : { ...zd });
  }
  const byZone = recalcByZonePercent(byZoneRaw);

  // ── byReceptionQuality ───────────────────────────────────────────────────
  const byReceptionQuality = new Map<string, ZoneDistribution[]>(a.byReceptionQuality);
  for (const [qual, zdList] of b.byReceptionQuality) {
    const ex = byReceptionQuality.get(qual);
    byReceptionQuality.set(qual, ex ? mergeZoneArrays(ex, zdList) : zdList);
  }

  // ── byRotation ───────────────────────────────────────────────────────────
  const byRotation = new Map<number, ZoneDistribution[]>(a.byRotation);
  for (const [rot, zdList] of b.byRotation) {
    const ex = byRotation.get(rot);
    byRotation.set(rot, ex ? mergeZoneArrays(ex, zdList) : zdList);
  }

  // ── bySetterCall ─────────────────────────────────────────────────────────
  const bySetterCall = new Map<string, ZoneDistribution[]>(a.bySetterCall);
  for (const [call, zdList] of b.bySetterCall) {
    const ex = bySetterCall.get(call);
    bySetterCall.set(call, ex ? mergeZoneArrays(ex, zdList) : zdList);
  }

  // ── availableSetterCalls ─────────────────────────────────────────────────
  const callMap = new Map<string, SetterCallStat>();
  for (const c of [...a.availableSetterCalls, ...b.availableSetterCalls]) {
    const ex = callMap.get(c.code);
    callMap.set(c.code, ex ? { ...ex, count: ex.count + c.count } : { ...c });
  }
  const availableSetterCalls = Array.from(callMap.values()).sort(
    (x, y) => y.count - x.count,
  );

  return {
    totalSets: a.totalSets + b.totalSets,
    byZone,
    byReceptionQuality,
    byRotation,
    bySetterCall,
    availableSetterCalls,
  };
}

// ─── Résultat vide ──────────────────────────────────────────────────────────

const EMPTY_DATA: SetterDistributionData = {
  totalSets: 0,
  byZone: new Map(),
  byReceptionQuality: new Map(),
  byRotation: new Map(),
  bySetterCall: new Map(),
  availableSetterCalls: [],
};

// ─── API publique ────────────────────────────────────────────────────────────

export interface MultiMatchAnalysisOptions
  extends Omit<SetterAnalysisOptions, 'teamSide'> {
  /**
   * Numéros de joueuses à verrouiller.
   * Seuls les rallyes où TOUTES ces joueuses sont simultanément sur le terrain
   * seront inclus dans l'analyse.
   */
  lockedPlayerNumbers?: number[];
}

/**
 * Analyse cumulée de la distribution du setter sur N matchs.
 *
 * Détermine automatiquement le côté (home|away) de l'équipe nommée dans chaque match,
 * puis agrège les résultats en une seule SetterDistributionData.
 *
 * @param matches  Liste de matchs parsés
 * @param teamName Nom exact de l'équipe à analyser
 * @param options  Filtres optionnels (rotation, qualité réception, verrou joueuses…)
 */
export function analyzeSetterDistributionMulti(
  matches: Match[],
  teamName: string,
  options?: MultiMatchAnalysisOptions,
): SetterDistributionData {
  const results: SetterDistributionData[] = [];

  for (const match of matches) {
    const teamSide = getTeamSideByName(match, teamName);
    if (!teamSide) continue; // Ce match ne concerne pas cette équipe

    const data = analyzeSetterDistribution(match, {
      teamSide,
      rotationFilter: options?.rotationFilter,
      receptionQualityFilters: options?.receptionQualityFilters,
      receptionQualityFilter: options?.receptionQualityFilter,
      setterCallFilter: options?.setterCallFilter,
      receptionZoneFilter: options?.receptionZoneFilter,
      lockedPlayerNumbers: options?.lockedPlayerNumbers,
    });
    results.push(data);
  }

  if (results.length === 0) return { ...EMPTY_DATA };
  return results.reduce(mergeSetterDistributionData);
}
