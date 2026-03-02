/**
 * @file teamColorStore.ts
 * @description Zustand store for team jersey colors (user-configurable).
 *
 * Persisted to localStorage so the user only has to pick colors once per match.
 * Default colors: green (home) and blue (away) — matching the app's palette.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TeamColorState {
  homeColor: string;
  awayColor: string;
  setHomeColor: (color: string) => void;
  setAwayColor: (color: string) => void;
}

/** Pre-defined jersey color palette */
export const JERSEY_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#ef4444', // red
  '#f59e0b', // amber
  '#a855f7', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ffffff', // white
  '#1e293b', // dark (slate-800)
  '#000000', // black
  '#84cc16', // lime
];

export const useTeamColorStore = create<TeamColorState>()(
  persist(
    (set) => ({
      homeColor: '#22c55e', // green by default
      awayColor: '#3b82f6', // blue by default

      setHomeColor: (color) => set({ homeColor: color }),
      setAwayColor: (color) => set({ awayColor: color }),
    }),
    {
      name: 'volleyvision-team-colors',
    }
  )
);
