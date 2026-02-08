import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Skill, Quality, TeamSide } from '@volleyvision/data-model';

export interface FilterCriteria {
  // Filtres de base
  setNumbers: number[];             // [] = tous les sets
  playerIds: string[];              // [] = tous les joueurs
  teamSide: TeamSide | null;       // null = les deux équipes

  // Filtres par skill
  skills: Skill[];                  // [] = tous les skills
  qualities: Quality[];             // [] = toutes les qualités

  // Filtres spécifiques attaque
  attackCombos: string[];           // [] = tous les combos (V5, XC, C1...)
  startZones: number[];             // [] = toutes les zones de départ
  endZones: number[];               // [] = toutes les zones d'arrivée
  minBlockers: number | null;       // null = pas de filtre
  maxBlockers: number | null;

  // Filtres contextuels
  rotations: number[];              // [] = toutes les rotations (1-6)
  servingTeam: TeamSide | null;     // null = pas de filtre
  setterCalls: string[];            // [] = tous les setter calls

  // Filtres vidéo
  hasVideoTimestamp: boolean;       // true = seulement les actions avec timestamp
}

interface FilterState {
  criteria: FilterCriteria;
  isPlaylistMode: boolean;
  playlistIndex: number;            // Index courant dans la playlist

  // Playlist preferences (persisted)
  preRollSeconds: number;
  postRollSeconds: number;
  autoAdvance: boolean;

  // Actions
  setCriteria: (partial: Partial<FilterCriteria>) => void;
  resetCriteria: () => void;
  togglePlaylistMode: () => void;
  setPlaylistIndex: (index: number) => void;
  nextInPlaylist: () => void;
  prevInPlaylist: () => void;
  setMargins: (pre: number, post: number) => void;
  toggleAutoAdvance: () => void;
}

export const DEFAULT_CRITERIA: FilterCriteria = {
  setNumbers: [],
  playerIds: [],
  teamSide: null,
  skills: [],
  qualities: [],
  attackCombos: [],
  startZones: [],
  endZones: [],
  minBlockers: null,
  maxBlockers: null,
  rotations: [],
  servingTeam: null,
  setterCalls: [],
  hasVideoTimestamp: false,
};

export const useFilterStore = create<FilterState>()(
  persist(
    (set, get) => ({
      criteria: DEFAULT_CRITERIA,
      isPlaylistMode: false,
      playlistIndex: 0,
      preRollSeconds: 2,
      postRollSeconds: 3,
      autoAdvance: false,

      setCriteria: (partial) =>
        set((state) => ({
          criteria: { ...state.criteria, ...partial },
        })),

      resetCriteria: () =>
        set({ criteria: DEFAULT_CRITERIA }),

      togglePlaylistMode: () =>
        set((state) => {
          const newMode = !state.isPlaylistMode;
          return {
            isPlaylistMode: newMode,
            playlistIndex: 0,
            // Auto-enable timestamp filter when entering playlist mode
            criteria: {
              ...state.criteria,
              hasVideoTimestamp: newMode ? true : state.criteria.hasVideoTimestamp,
            },
          };
        }),

      setPlaylistIndex: (index) =>
        set({ playlistIndex: index }),

      nextInPlaylist: () =>
        set((state) => ({
          playlistIndex: state.playlistIndex + 1,
        })),

      prevInPlaylist: () =>
        set((state) => ({
          playlistIndex: Math.max(0, state.playlistIndex - 1),
        })),

      setMargins: (pre, post) =>
        set({
          preRollSeconds: pre,
          postRollSeconds: post,
        }),

      toggleAutoAdvance: () =>
        set((state) => ({
          autoAdvance: !state.autoAdvance,
        })),
    }),
    {
      name: 'filter-storage',
      // Only persist playlist preferences, not criteria
      partialize: (state) => ({
        preRollSeconds: state.preRollSeconds,
        postRollSeconds: state.postRollSeconds,
        autoAdvance: state.autoAdvance,
      }),
    }
  )
);

// Expose store for debugging
if (typeof window !== 'undefined') {
  (window as any).filterStore = useFilterStore;
}
