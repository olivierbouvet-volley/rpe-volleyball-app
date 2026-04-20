/**
 * @file layoutStore.ts
 * @description Zustand store for dashboard layout configuration and persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LayoutItem } from 'react-grid-layout';

interface PanelConfig {
  id: string;
  title: string;
  icon: string;
  visible: boolean;
  collapsed: boolean; // true = panneau réduit à sa barre de titre
}

interface LayoutState {
  // Layouts par breakpoint (lg, md, sm)
  layouts: { lg: LayoutItem[]; md: LayoutItem[]; sm: LayoutItem[] };
  panels: PanelConfig[];
  isVideoDetached: boolean; // true = vidéo dans fenêtre séparée

  // Actions
  setLayouts: (layouts: { lg: LayoutItem[]; md: LayoutItem[]; sm: LayoutItem[] }) => void;
  togglePanelVisibility: (panelId: string) => void;
  togglePanelCollapsed: (panelId: string) => void;
  setVideoDetached: (detached: boolean) => void;
  resetToDefault: () => void;
}

const DEFAULT_PANELS: PanelConfig[] = [
  { id: 'video', title: 'Vidéo', icon: '🎥', visible: true, collapsed: false },
  { id: 'calibration', title: 'Calibration', icon: '⚙️', visible: true, collapsed: true },
  { id: 'timeline', title: 'Timeline / Playlist', icon: '📋', visible: true, collapsed: false },
  { id: 'filters', title: 'Filtres avancés', icon: '🔍', visible: true, collapsed: false },
  { id: 'stats', title: 'Statistiques', icon: '📊', visible: true, collapsed: false },
  { id: 'player', title: 'Fiche Joueur', icon: '👤', visible: false, collapsed: false },
  // Futurs panneaux (ajoutés par 2D-2H) :
  // { id: 'playbyplay', title: 'Play-by-Play', icon: '📈', visible: false, collapsed: false },
  // { id: 'distribution', title: 'Passeuse', icon: '🎯', visible: false, collapsed: false },
  // { id: 'rotation', title: 'Rotation', icon: '🔄', visible: false, collapsed: false },
];

const DEFAULT_LAYOUTS = {
  lg: [ // 12 colonnes, écran >= 1200px
    // Vidéo à gauche (4 colonnes) avec hauteur confortable
    { i: 'video', x: 0, y: 0, w: 4, h: 10, minW: 4, minH: 8 },
    // Calibration en dessous de la vidéo, repliée par défaut (height=1 car collapsed)
    { i: 'calibration', x: 0, y: 10, w: 4, h: 1, minW: 4, minH: 1 },
    // Timeline/Playlist au milieu (4 colonnes) avec bonne hauteur
    { i: 'timeline', x: 4, y: 0, w: 4, h: 14, minW: 4, minH: 10 },
    // Filtres avancés à droite (4 colonnes) avec hauteur raisonnable
    { i: 'filters', x: 8, y: 0, w: 4, h: 14, minW: 4, minH: 8 },
    // Fiche Joueur à droite (4 colonnes), masquée par défaut mais avec bonne taille quand activée
    { i: 'player', x: 8, y: 0, w: 4, h: 14, minW: 4, minH: 10 },
    // Stats en bas, toute la largeur avec hauteur confortable
    { i: 'stats', x: 0, y: 14, w: 12, h: 9, minW: 8, minH: 7 },
  ],
  md: [ // 10 colonnes, écran 996-1199px
    // Vidéo occupe 5 colonnes avec hauteur confortable
    { i: 'video', x: 0, y: 0, w: 5, h: 10, minW: 4, minH: 8 },
    { i: 'calibration', x: 0, y: 10, w: 5, h: 1, minW: 4, minH: 1 },
    // Timeline à droite (5 colonnes)
    { i: 'timeline', x: 5, y: 0, w: 5, h: 12, minW: 4, minH: 10 },
    // Filtres en dessous de la vidéo avec hauteur raisonnable
    { i: 'filters', x: 0, y: 11, w: 5, h: 8, minW: 4, minH: 6 },
    // Fiche Joueur à droite avec bonne taille
    { i: 'player', x: 5, y: 0, w: 5, h: 12, minW: 4, minH: 10 },
    // Stats en bas avec hauteur confortable
    { i: 'stats', x: 0, y: 19, w: 10, h: 9, minW: 8, minH: 7 },
  ],
  sm: [ // 6 colonnes, écran < 996px (mobile/tablette)
    // Sur mobile, tout empilé verticalement, vidéo en premier
    { i: 'video', x: 0, y: 0, w: 6, h: 8, minW: 6, minH: 6 },
    { i: 'calibration', x: 0, y: 8, w: 6, h: 1, minW: 6, minH: 1 },
    { i: 'timeline', x: 0, y: 9, w: 6, h: 12, minW: 6, minH: 10 },
    { i: 'filters', x: 0, y: 21, w: 6, h: 8, minW: 6, minH: 6 },
    // Fiche Joueur empilée avec bonne hauteur
    { i: 'player', x: 0, y: 29, w: 6, h: 12, minW: 6, minH: 10 },
    { i: 'stats', x: 0, y: 41, w: 6, h: 9, minW: 6, minH: 7 },
  ],
};

/**
 * Layout store for managing dashboard panel configuration
 *
 * Persists panel visibility, collapsed state, and grid positions to localStorage
 * Supports responsive layouts across different breakpoints (lg, md, sm)
 */

// Store implementation without persist (for testing)
const createLayoutStore = () => ({
  // Initial state
  layouts: DEFAULT_LAYOUTS,
  panels: DEFAULT_PANELS,
  isVideoDetached: false,

  // Actions
  setLayouts: (layouts: { lg: LayoutItem[]; md: LayoutItem[]; sm: LayoutItem[] }) => {
    useLayoutStore.setState({ layouts });
  },

  togglePanelVisibility: (panelId: string) => {
    useLayoutStore.setState((state) => ({
      panels: state.panels.map((panel) =>
        panel.id === panelId ? { ...panel, visible: !panel.visible } : panel
      ),
    }));
  },

  togglePanelCollapsed: (panelId: string) => {
    useLayoutStore.setState((state) => ({
      panels: state.panels.map((panel) =>
        panel.id === panelId ? { ...panel, collapsed: !panel.collapsed } : panel
      ),
    }));
  },

  setVideoDetached: (detached: boolean) => {
    useLayoutStore.setState({ isVideoDetached: detached });
  },

  resetToDefault: () => {
    useLayoutStore.setState({
      layouts: DEFAULT_LAYOUTS,
      panels: DEFAULT_PANELS,
      isVideoDetached: false,
    });
  },
});

// Check if we're in a test environment
const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

export const useLayoutStore = isTest
  ? create<LayoutState>()(() => createLayoutStore())
  : create<LayoutState>()(
      persist(
        (set) => ({
          // Initial state
          layouts: DEFAULT_LAYOUTS,
          panels: DEFAULT_PANELS,
          isVideoDetached: false,

          // Actions
          setLayouts: (layouts) => {
            set({ layouts });
          },

          togglePanelVisibility: (panelId) => {
            set((state) => ({
              panels: state.panels.map((panel) =>
                panel.id === panelId ? { ...panel, visible: !panel.visible } : panel
              ),
            }));
          },

          togglePanelCollapsed: (panelId) => {
            set((state) => ({
              panels: state.panels.map((panel) =>
                panel.id === panelId ? { ...panel, collapsed: !panel.collapsed } : panel
              ),
            }));
          },

          setVideoDetached: (detached) => {
            set({ isVideoDetached: detached });
          },

          resetToDefault: () => {
            set({
              layouts: DEFAULT_LAYOUTS,
              panels: DEFAULT_PANELS,
              isVideoDetached: false,
            });
          },
        }),
        {
          name: 'volleyvision-layout-v2', // localStorage key (v2 pour forcer reset avec nouveaux defaults)
        }
      )
    );

// Expose store to window for debugging
if (typeof window !== 'undefined') {
  (window as any).layoutStore = useLayoutStore;
}

// Export defaults for testing
export { DEFAULT_PANELS, DEFAULT_LAYOUTS };
