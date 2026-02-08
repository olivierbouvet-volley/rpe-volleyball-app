/**
 * @file layoutStore.ts
 * @description Zustand store for dashboard layout configuration and persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Layout } from 'react-grid-layout';

interface PanelConfig {
  id: string;
  title: string;
  icon: string;
  visible: boolean;
  collapsed: boolean; // true = panneau réduit à sa barre de titre
}

interface LayoutState {
  // Layouts par breakpoint (lg, md, sm)
  layouts: { lg: Layout[]; md: Layout[]; sm: Layout[] };
  panels: PanelConfig[];
  isVideoDetached: boolean; // true = vidéo dans fenêtre séparée

  // Actions
  setLayouts: (layouts: { lg: Layout[]; md: Layout[]; sm: Layout[] }) => void;
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
  // Futurs panneaux (ajoutés par 2D-2H) :
  // { id: 'playbyplay', title: 'Play-by-Play', icon: '📈', visible: false, collapsed: false },
  // { id: 'distribution', title: 'Passeuse', icon: '🎯', visible: false, collapsed: false },
  // { id: 'rotation', title: 'Rotation', icon: '🔄', visible: false, collapsed: false },
];

const DEFAULT_LAYOUTS = {
  lg: [ // 12 colonnes, écran >= 1200px
    // Vidéo plus grande par défaut (7 colonnes), peut s'étendre jusqu'à 12
    { i: 'video', x: 0, y: 0, w: 7, h: 9, minW: 4, minH: 5 },
    // Calibration en dessous de la vidéo, repliée par défaut (height=1 car collapsed)
    { i: 'calibration', x: 0, y: 9, w: 7, h: 1, minW: 3, minH: 1 },
    // Timeline/Playlist à droite de la vidéo (5 colonnes)
    { i: 'timeline', x: 7, y: 0, w: 5, h: 12, minW: 3, minH: 6 },
    // Filtres en dessous de la timeline
    { i: 'filters', x: 7, y: 12, w: 5, h: 6, minW: 3, minH: 3 },
    // Stats en bas, toute la largeur
    { i: 'stats', x: 0, y: 18, w: 12, h: 7, minW: 6, minH: 4 },
  ],
  md: [ // 10 colonnes, écran 996-1199px
    // Vidéo occupe 6 colonnes sur 10
    { i: 'video', x: 0, y: 0, w: 6, h: 8, minW: 4, minH: 5 },
    { i: 'calibration', x: 0, y: 8, w: 6, h: 1, minW: 3, minH: 1 },
    // Timeline à droite (4 colonnes)
    { i: 'timeline', x: 6, y: 0, w: 4, h: 10, minW: 3, minH: 6 },
    // Filtres en dessous de la timeline
    { i: 'filters', x: 6, y: 10, w: 4, h: 5, minW: 3, minH: 3 },
    // Stats en bas
    { i: 'stats', x: 0, y: 15, w: 10, h: 7, minW: 6, minH: 4 },
  ],
  sm: [ // 6 colonnes, écran < 996px (mobile/tablette)
    // Sur mobile, tout empilé verticalement, vidéo en premier
    { i: 'video', x: 0, y: 0, w: 6, h: 7, minW: 6, minH: 5 },
    { i: 'calibration', x: 0, y: 7, w: 6, h: 1, minW: 6, minH: 1 },
    { i: 'timeline', x: 0, y: 8, w: 6, h: 10, minW: 6, minH: 6 },
    { i: 'filters', x: 0, y: 18, w: 6, h: 6, minW: 6, minH: 3 },
    { i: 'stats', x: 0, y: 24, w: 6, h: 7, minW: 6, minH: 4 },
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
  setLayouts: (layouts: { lg: Layout[]; md: Layout[]; sm: Layout[] }) => {
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
          name: 'volleyvision-layout', // localStorage key
        }
      )
    );

// Expose store to window for debugging
if (typeof window !== 'undefined') {
  (window as any).layoutStore = useLayoutStore;
}

// Export defaults for testing
export { DEFAULT_PANELS, DEFAULT_LAYOUTS };
