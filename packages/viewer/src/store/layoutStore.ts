/**
 * @file layoutStore.ts — FlexLayout-React v3 (remplace react-grid-layout v2)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IJsonModel } from 'flexlayout-react';

import videoAnalysisPreset from '../layouts/presets/video-analysis.json';
import statsFocusPreset from '../layouts/presets/stats-focus.json';
import singleScreenPreset from '../layouts/presets/single-screen.json';
import fullscreenVideoPreset from '../layouts/presets/fullscreen-video.json';
import gamePlanPreset from '../layouts/presets/game-plan.json';

export type BuiltInPresetId = 'video-analysis' | 'stats-focus' | 'single-screen' | 'fullscreen-video' | 'game-plan';
export interface PresetMeta { label: string; icon: string; model: IJsonModel; }

export const BUILT_IN_PRESETS: Record<BuiltInPresetId, PresetMeta> = {
  'video-analysis':   { label: 'Analyse',      icon: '🎥', model: videoAnalysisPreset   as IJsonModel },
  'stats-focus':      { label: 'Stats',         icon: '📊', model: statsFocusPreset      as IJsonModel },
  'single-screen':    { label: 'Vue simple',    icon: '▪️', model: singleScreenPreset    as IJsonModel },
  'fullscreen-video': { label: 'Plein écran',   icon: '⛶',  model: fullscreenVideoPreset as IJsonModel },
  'game-plan':        { label: 'Plan de Match', icon: '🗓', model: gamePlanPreset        as IJsonModel },
};

export const PRESET_ORDER: BuiltInPresetId[] = ['video-analysis', 'stats-focus', 'single-screen', 'fullscreen-video', 'game-plan'];

interface LayoutState {
  modelJson: IJsonModel;
  modelVersion: number;
  activePreset: string | null;
  savedPresets: Record<string, IJsonModel>;
  isVideoDetached: boolean;
  pendingTabSelect: string | null;
  // Compat stubs — usePopOutWindow + VideoPlayer lisent isVideoDetached / setVideoDetached
  panels: { id: string; visible: boolean }[];
  togglePanelVisibility: (id: string) => void;
  // Actions
  setModelJson: (json: IJsonModel) => void;
  applyPreset: (presetId: BuiltInPresetId) => void;
  savePreset: (name: string, json: IJsonModel) => void;
  deletePreset: (name: string) => void;
  applySavedPreset: (name: string) => void;
  resetToDefault: () => void;
  setVideoDetached: (detached: boolean) => void;
  requestSelectTab: (tabId: string) => void;
  clearPendingTabSelect: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      modelJson: videoAnalysisPreset as IJsonModel,
      modelVersion: 0,
      activePreset: 'video-analysis' as BuiltInPresetId,
      savedPresets: {},
      isVideoDetached: false,
      pendingTabSelect: null,
      panels: [],
      togglePanelVisibility: (_id: string) => {},
      setModelJson: (json) => set({ modelJson: json, activePreset: null }),
      applyPreset: (presetId) => set((s) => ({
        modelJson: BUILT_IN_PRESETS[presetId].model,
        activePreset: presetId,
        modelVersion: s.modelVersion + 1,
      })),
      savePreset: (name, json) => set((s) => ({
        savedPresets: { ...s.savedPresets, [name]: json },
        activePreset: name,
      })),
      deletePreset: (name) => set((s) => {
        const { [name]: _r, ...rest } = s.savedPresets;
        return { savedPresets: rest, activePreset: s.activePreset === name ? 'video-analysis' : s.activePreset };
      }),
      applySavedPreset: (name) => {
        const json = get().savedPresets[name];
        if (json) set((s) => ({ modelJson: json, activePreset: name, modelVersion: s.modelVersion + 1 }));
      },
      resetToDefault: () => set((s) => ({
        modelJson: videoAnalysisPreset as IJsonModel,
        activePreset: 'video-analysis',
        modelVersion: s.modelVersion + 1,
      })),
      setVideoDetached: (d) => set({ isVideoDetached: d }),
      requestSelectTab: (tabId) => set({ pendingTabSelect: tabId }),
      clearPendingTabSelect: () => set({ pendingTabSelect: null }),
    }),
    {
      name: 'volleyvision-layout-v3',
      version: 2,
      migrate: (persisted: unknown, fromVersion: number) => {
        const state = persisted as Partial<LayoutState>;
        if (fromVersion < 2) {
          // Activer tabEnableClose dans le modèle sauvegardé
          if (state.modelJson && (state.modelJson as any).global) {
            (state.modelJson as any).global.tabEnableClose = true;
          }
          // Même patch pour tous les presets sauvegardés
          if (state.savedPresets) {
            for (const key of Object.keys(state.savedPresets)) {
              const p = (state.savedPresets as any)[key];
              if (p?.global) p.global.tabEnableClose = true;
            }
          }
        }
        return state as LayoutState;
      },
      partialize: (s) => ({
        modelJson: s.modelJson,
        activePreset: s.activePreset,
        savedPresets: s.savedPresets,
        isVideoDetached: s.isVideoDetached,
      }),
    },
  ),
);

if (typeof window !== 'undefined') (window as any).layoutStore = useLayoutStore;

export const DEFAULT_PANELS = [] as { id: string; visible: boolean }[];
export const DEFAULT_LAYOUTS = {};


