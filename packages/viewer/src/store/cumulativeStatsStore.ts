/**
 * @file cumulativeStatsStore.ts
 * @description Agrégation des stats sur N matchs sélectionnés
 * Activé quand selectedMatchIds.length > 1 dans matchLibraryStore
 */

import { create } from 'zustand';
import type { Match, PlayerMatchStats } from '@volleyvision/data-model';
import { aggregatePlayerStats } from '../utils/statsAggregator';

interface CumulativeStatsState {
  isActive: boolean;              // true = mode multi-matchs actif
  matchCount: number;
  matchTitles: string[];          // titres des matchs sélectionnés
  aggregatedStats: PlayerMatchStats[];
  isComputing: boolean;

  /** teamName → liste de playerIds (pour filtrer par équipe) */
  teamPlayerIds: Record<string, string[]>;
  /** teamNames disponibles parmi les matchs (ordre alphabétique) */
  teamNames: string[];
  /** Nom de l'équipe actuellement sélectionnée pour le tableau de stats */
  selectedTeamForStats: string | null;
  /** playerId → "Prénom Nom" — résolution cross-matchs */
  playerNameMap: Map<string, string>;
  /** playerId → numéro — résolution cross-matchs */
  playerNumberMap: Map<string, number>;

  // Actions
  compute: (statsPerMatch: PlayerMatchStats[][], matchTitles: string[], matches: Match[]) => void;
  setSelectedTeamForStats: (teamName: string | null) => void;
  clear: () => void;
}

export const useCumulativeStatsStore = create<CumulativeStatsState>()((set) => ({
  isActive: false,
  matchCount: 0,
  matchTitles: [],
  aggregatedStats: [],
  isComputing: false,
  teamPlayerIds: {},
  teamNames: [],
  selectedTeamForStats: null,
  playerNameMap: new Map(),
  playerNumberMap: new Map(),

  compute: (statsPerMatch, matchTitles, matches) => {
    set({ isComputing: true });
    try {
      // ── Construire idRemap : "home-7" → "TeamName|7" ──
      // Nécessaire car le même joueur physique peut être "home-7" dans un match
      // et "away-7" dans un autre quand son équipe joue à l'extérieur.
      const idRemap = new Map<string, string>();
      const teamMap: Record<string, Set<string>> = {};
      const nameMap = new Map<string, string>();
      const numMap = new Map<string, number>();

      for (const match of matches) {
        for (const side of ['homeTeam', 'awayTeam'] as const) {
          const team = match[side];
          const canonical = (p: { id: string; number: number }) => `${team.name}|${p.number}`;
          if (!teamMap[team.name]) teamMap[team.name] = new Set();
          for (const p of team.players) {
            const cid = canonical(p);
            // Remappe l'ID côté-relatif vers l'ID canonique stable
            idRemap.set(p.id, cid);
            teamMap[team.name].add(cid);
            if (!nameMap.has(cid)) {
              nameMap.set(cid, `${p.firstName} ${p.lastName}`.trim() || `#${p.number}`);
            }
            if (!numMap.has(cid)) {
              numMap.set(cid, p.number);
            }
          }
        }
      }

      // Agréger avec remappage des IDs
      const aggregatedStats = aggregatePlayerStats(statsPerMatch, idRemap);

      const teamPlayerIds = Object.fromEntries(
        Object.entries(teamMap).map(([k, v]) => [k, Array.from(v)]),
      );
      const teamNames = Object.keys(teamPlayerIds).sort();
      const selectedTeamForStats = teamNames[0] ?? null;

      set({
        isActive: true,
        matchCount: statsPerMatch.length,
        matchTitles,
        aggregatedStats,
        isComputing: false,
        teamPlayerIds,
        teamNames,
        selectedTeamForStats,
        playerNameMap: nameMap,
        playerNumberMap: numMap,
      });
    } catch (err) {
      console.error('[cumulativeStatsStore] Aggregation error:', err);
      set({ isComputing: false });
    }
  },

  setSelectedTeamForStats: (teamName) => set({ selectedTeamForStats: teamName }),

  clear: () => set({
    isActive: false,
    matchCount: 0,
    matchTitles: [],
    aggregatedStats: [],
    isComputing: false,
    teamPlayerIds: {},
    teamNames: [],
    selectedTeamForStats: null,
    playerNameMap: new Map(),
    playerNumberMap: new Map(),
  }),
}));
