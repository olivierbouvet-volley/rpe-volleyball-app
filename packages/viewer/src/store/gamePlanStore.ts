/**
 * @file gamePlanStore.ts
 * @description État du Plan de Match en mode multi-matchs
 *
 * Activé automatiquement quand plusieurs DVW sont sélectionnés dans la bibliothèque.
 * Permet de :
 *  - détecter toutes les équipes présentes dans les matchs chargés
 *  - choisir l'équipe étudiée (l'adversaire)
 *  - verrouiller un 6 de joueuses pour filtrer l'analyse aux rallyes
 *    où exactement ces joueuses sont sur le terrain
 */

import { create } from 'zustand';
import type { Match, Player } from '@volleyvision/data-model';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Retourne l'union des joueuses d'une équipe sur N matchs (dédupliquées par numéro) */
function getUniquePlayers(matches: Match[], teamName: string): Player[] {
  const seen = new Set<number>();
  const result: Player[] = [];
  for (const match of matches) {
    const team =
      match.homeTeam.name === teamName
        ? match.homeTeam
        : match.awayTeam.name === teamName
          ? match.awayTeam
          : null;
    if (!team) continue;
    for (const p of team.players) {
      if (!seen.has(p.number)) {
        seen.add(p.number);
        result.push(p);
      }
    }
  }
  return result.sort((a, b) => a.number - b.number);
}

/** Retourne toutes les équipes distinctes présentes dans une liste de matchs */
function getAllTeamNames(matches: Match[]): string[] {
  const names = new Set<string>();
  for (const m of matches) {
    names.add(m.homeTeam.name);
    names.add(m.awayTeam.name);
  }
  return Array.from(names).sort();
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GamePlanState {
  /** true quand au moins 2 matchs sont chargés */
  isMultiMatch: boolean;
  /** Matchs parsés (tous les DVW sélectionnés) */
  matches: Match[];
  /** Titres correspondants (pour l'affichage) */
  matchTitles: string[];
  /** Toutes les équipes détectées parmi les matchs chargés */
  detectedTeams: string[];
  /** Équipe actuellement étudiée */
  studiedTeamName: string | null;
  /** Union de toutes les joueuses de l'équipe étudiée sur tous les matchs */
  allPlayersForStudiedTeam: Player[];
  /**
   * Numéros des joueuses verrouillées (max 6).
   * Vide = pas de filtre, toutes les joueuses sont incluses.
   */
  lockedPlayerNumbers: number[];

  // ── Actions ──
  setMatches: (matches: Match[], titles: string[]) => void;
  setStudiedTeam: (name: string) => void;
  togglePlayerLock: (num: number) => void;
  clearLock: () => void;
  clear: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useGamePlanStore = create<GamePlanState>()((set, get) => ({
  isMultiMatch: false,
  matches: [],
  matchTitles: [],
  detectedTeams: [],
  studiedTeamName: null,
  allPlayersForStudiedTeam: [],
  lockedPlayerNumbers: [],

  setMatches: (matches, titles) => {
    const teams = getAllTeamNames(matches);
    // Par défaut, on choisit la première équipe alphabétiquement.
    // L'utilisateur pourra la changer via setStudiedTeam.
    const studiedTeamName = teams[0] ?? null;
    const allPlayersForStudiedTeam = studiedTeamName
      ? getUniquePlayers(matches, studiedTeamName)
      : [];
    set({
      isMultiMatch: matches.length > 1,
      matches,
      matchTitles: titles,
      detectedTeams: teams,
      studiedTeamName,
      allPlayersForStudiedTeam,
      lockedPlayerNumbers: [],
    });
  },

  setStudiedTeam: (name) => {
    const { matches } = get();
    const allPlayersForStudiedTeam = getUniquePlayers(matches, name);
    set({
      studiedTeamName: name,
      allPlayersForStudiedTeam,
      lockedPlayerNumbers: [],
    });
  },

  togglePlayerLock: (num) => {
    const { lockedPlayerNumbers } = get();
    if (lockedPlayerNumbers.includes(num)) {
      set({ lockedPlayerNumbers: lockedPlayerNumbers.filter((n) => n !== num) });
    } else if (lockedPlayerNumbers.length < 6) {
      set({ lockedPlayerNumbers: [...lockedPlayerNumbers, num] });
    }
  },

  clearLock: () => set({ lockedPlayerNumbers: [] }),

  clear: () =>
    set({
      isMultiMatch: false,
      matches: [],
      matchTitles: [],
      detectedTeams: [],
      studiedTeamName: null,
      allPlayersForStudiedTeam: [],
      lockedPlayerNumbers: [],
    }),
}));
