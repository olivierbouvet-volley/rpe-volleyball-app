/**
 * @file playByPlayHelpers.ts
 * @description Helpers for Play-by-Play chart — score difference curve point by point
 */

import type { Match, Rally, TeamSide } from '@volleyvision/data-model';

export interface PlayByPlayPoint {
  rallyIndex: number;           // Index global (toutes les rallies)
  setRallyIndex: number;        // Index dans le set courant
  setNumber: number;
  scoreDiff: number;            // home - away (positif = home mène)
  homeScore: number;
  awayScore: number;
  pointWinner: TeamSide;
  isRun: boolean;               // Fait partie d'un run de 3+
  runLength: number;            // Longueur du run en cours (1 si pas de run)
  rally: Rally;                 // Référence au rally original
  servingTeam: TeamSide;
}

export interface RunInfo {
  team: TeamSide;
  length: number;
  startScore: { home: number; away: number };
  endScore: { home: number; away: number };
  setNumber: number;
  startRallyIndex: number;
  endRallyIndex: number;
}

export interface LeadStats {
  homeLeadPoints: number;
  awayLeadPoints: number;
  tiedPoints: number;
  totalPoints: number;
  homeLeadPercent: number;
  awayLeadPercent: number;
  tiedPercent: number;
}

/**
 * Build the play-by-play data from a match.
 * Each point in the match is mapped to a PlayByPlayPoint with score difference, runs, etc.
 */
export function buildPlayByPlayData(match: Match): PlayByPlayPoint[] {
  const points: PlayByPlayPoint[] = [];
  let globalIndex = 0;

  for (const set of match.sets) {
    let setRallyIndex = 0;

    for (const rally of set.rallies) {
      // Determine who scored by comparing scores
      const homeScore = rally.homeScoreAfter;
      const awayScore = rally.awayScoreAfter;
      const scoreDiff = homeScore - awayScore;

      // Determine point winner from the rally data
      const pointWinner: TeamSide = rally.pointWinner ?? (
        // Fallback: deduce from score change
        homeScore > rally.homeScoreBefore ? 'home' : 'away'
      );

      points.push({
        rallyIndex: globalIndex,
        setRallyIndex,
        setNumber: rally.setNumber ?? set.number,
        scoreDiff,
        homeScore,
        awayScore,
        pointWinner,
        isRun: false,      // Will be computed in a second pass
        runLength: 1,
        rally,
        servingTeam: rally.servingTeam,
      });

      globalIndex++;
      setRallyIndex++;
    }
  }

  // Second pass: detect runs (3+ consecutive points by the same team)
  markRuns(points);

  return points;
}

/**
 * Mark runs in the data: 3+ consecutive points by the same team.
 * A run within a single set only (set change resets the run counter).
 */
function markRuns(points: PlayByPlayPoint[]): void {
  if (points.length === 0) return;

  let runStart = 0;
  let currentTeam = points[0].pointWinner;
  let currentSet = points[0].setNumber;

  for (let i = 1; i <= points.length; i++) {
    const current = points[i];
    const isEndOfRun =
      i === points.length ||
      current.pointWinner !== currentTeam ||
      current.setNumber !== currentSet;

    if (isEndOfRun) {
      const runLength = i - runStart;
      if (runLength >= 3) {
        for (let j = runStart; j < i; j++) {
          points[j].isRun = true;
          points[j].runLength = runLength;
        }
      }

      if (i < points.length) {
        runStart = i;
        currentTeam = current.pointWinner;
        currentSet = current.setNumber;
      }
    }
  }
}

/**
 * Find the longest run for each team across the entire match.
 */
export function findLongestRuns(data: PlayByPlayPoint[]): { home: RunInfo | null; away: RunInfo | null } {
  const runs = extractAllRuns(data);

  let longestHome: RunInfo | null = null;
  let longestAway: RunInfo | null = null;

  for (const run of runs) {
    if (run.team === 'home' && (longestHome === null || run.length > longestHome.length)) {
      longestHome = run;
    }
    if (run.team === 'away' && (longestAway === null || run.length > longestAway.length)) {
      longestAway = run;
    }
  }

  return { home: longestHome, away: longestAway };
}

/**
 * Extract all runs (consecutive points by the same team) from the data.
 */
function extractAllRuns(data: PlayByPlayPoint[]): RunInfo[] {
  if (data.length === 0) return [];

  const runs: RunInfo[] = [];
  let runStart = 0;

  for (let i = 1; i <= data.length; i++) {
    const isEndOfRun =
      i === data.length ||
      data[i].pointWinner !== data[runStart].pointWinner ||
      data[i].setNumber !== data[runStart].setNumber;

    if (isEndOfRun) {
      const length = i - runStart;
      if (length >= 2) {
        runs.push({
          team: data[runStart].pointWinner,
          length,
          startScore: { home: data[runStart].homeScore - (data[runStart].pointWinner === 'home' ? 1 : 0), away: data[runStart].awayScore - (data[runStart].pointWinner === 'away' ? 1 : 0) },
          endScore: { home: data[i - 1].homeScore, away: data[i - 1].awayScore },
          setNumber: data[runStart].setNumber,
          startRallyIndex: runStart,
          endRallyIndex: i - 1,
        });
      }

      if (i < data.length) {
        runStart = i;
      }
    }
  }

  return runs;
}

/**
 * Calculate lead statistics: how much time each team was in front.
 */
export function calculateLeadStats(data: PlayByPlayPoint[]): LeadStats {
  if (data.length === 0) {
    return {
      homeLeadPoints: 0,
      awayLeadPoints: 0,
      tiedPoints: 0,
      totalPoints: 0,
      homeLeadPercent: 0,
      awayLeadPercent: 0,
      tiedPercent: 0,
    };
  }

  let homeLeadPoints = 0;
  let awayLeadPoints = 0;
  let tiedPoints = 0;

  for (const point of data) {
    if (point.scoreDiff > 0) homeLeadPoints++;
    else if (point.scoreDiff < 0) awayLeadPoints++;
    else tiedPoints++;
  }

  const total = data.length;

  return {
    homeLeadPoints,
    awayLeadPoints,
    tiedPoints,
    totalPoints: total,
    homeLeadPercent: Math.round((homeLeadPoints / total) * 100),
    awayLeadPercent: Math.round((awayLeadPoints / total) * 100),
    tiedPercent: Math.round((tiedPoints / total) * 100),
  };
}

/**
 * Get set separator indices (the first rally index of each new set).
 */
export function getSetSeparators(data: PlayByPlayPoint[]): { index: number; setNumber: number }[] {
  const separators: { index: number; setNumber: number }[] = [];
  let currentSet = -1;

  for (let i = 0; i < data.length; i++) {
    if (data[i].setNumber !== currentSet) {
      currentSet = data[i].setNumber;
      separators.push({ index: i, setNumber: currentSet });
    }
  }

  return separators;
}

/**
 * Format rally info for tooltip display.
 */
export function formatRallyTooltip(point: PlayByPlayPoint, homeTeamName: string, awayTeamName: string): string {
  const server = point.servingTeam === 'home' ? homeTeamName : awayTeamName;
  return `Rally #${point.rally.rallyNumber} — Set ${point.setNumber} — ${point.homeScore}-${point.awayScore} — Service ${server}`;
}
