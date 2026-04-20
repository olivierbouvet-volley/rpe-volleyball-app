import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Match, PlayerMatchStats } from '@volleyvision/data-model';
import { calculatePlayerStats } from '@volleyvision/dvw-parser';

interface MatchState {
  // State
  match: Match | null;
  stats: PlayerMatchStats[];
  error: string | null;

  // Actions
  setMatch: (match: Match) => void;
  clear: () => void;
  setError: (error: string) => void;
}

export const useMatchStore = create<MatchState>()(
  persist(
    (set) => ({
      // Initial state
      match: null,
      stats: [],
      error: null,

      // Actions
      setMatch: (match) => {
        try {
          const stats = calculatePlayerStats(match);
          console.log('[matchStore] Calculated stats for players:', stats.map(s => ({ id: s.playerId, attack: s.bySkill.attack })));
          set({ match, stats, error: null });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to calculate stats',
          });
        }
      },

      clear: () => set({ match: null, stats: [], error: null }),

      setError: (error) => set({ error }),
    }),
    {
      name: 'match-storage', // localStorage key
    }
  )
);

// Expose store to window for debugging
if (typeof window !== 'undefined') {
  (window as any).matchStore = useMatchStore;
}
