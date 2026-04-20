/**
 * @file LayoutPresetBar.tsx
 * @description Barre de préréglages de layout — 4 presets intégrés + presets utilisateur
 */

import { useState } from 'react';
import {
  useLayoutStore,
  BUILT_IN_PRESETS,
  PRESET_ORDER,
  type BuiltInPresetId,
} from '../../store/layoutStore';
import type { IJsonModel } from 'flexlayout-react';

interface LayoutPresetBarProps {
  /** Appelé quand l'utilisateur clique sur "Sauvegarder" */
  onSave: () => void;
}

export function LayoutPresetBar({ onSave }: LayoutPresetBarProps) {
  const {
    activePreset,
    savedPresets,
    applyPreset,
    applySavedPreset,
    deletePreset,
    resetToDefault,
  } = useLayoutStore();

  const hasSavedPresets = Object.keys(savedPresets).length > 0;

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 shrink-0 overflow-x-auto"
      style={{
        backgroundColor: 'var(--surface-1)',
        borderBottom: '1px solid var(--surface-border)',
        scrollbarWidth: 'none',
      }}
    >
      {/* Presets intégrés */}
      <div className="flex items-center gap-1 shrink-0">
        {PRESET_ORDER.map((id: BuiltInPresetId) => {
          const preset = BUILT_IN_PRESETS[id];
          const isActive = activePreset === id;
          return (
            <button
              key={id}
              onClick={() => applyPreset(id)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all whitespace-nowrap"
              style={{
                backgroundColor: isActive ? 'var(--brand-blue)' : 'var(--surface-3)',
                color: isActive ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${isActive ? 'var(--brand-blue)' : 'transparent'}`,
              }}
              title={`Preset : ${preset.label}`}
            >
              <span>{preset.icon}</span>
              <span className="hidden sm:inline">{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* Séparateur + presets sauvegardés */}
      {hasSavedPresets && (
        <>
          <div
            className="w-px h-4 shrink-0"
            style={{ backgroundColor: 'var(--surface-border)' }}
          />
          <div className="flex items-center gap-1 min-w-0">
            {Object.keys(savedPresets).map((name) => {
              const isActive = activePreset === name;
              return (
                <div key={name} className="flex items-center group">
                  <button
                    onClick={() => applySavedPreset(name)}
                    className="flex items-center gap-1 px-2 py-1 rounded-l text-xs font-medium transition-all"
                    style={{
                      backgroundColor: isActive ? 'rgba(34,197,94,0.15)' : 'var(--surface-3)',
                      color: isActive ? 'var(--brand-green)' : 'var(--text-muted)',
                      border: `1px solid ${isActive ? 'var(--brand-green)' : 'transparent'}`,
                      borderRight: 'none',
                      maxWidth: '120px',
                    }}
                  >
                    <span>⭐</span>
                    <span className="truncate">{name}</span>
                  </button>
                  <button
                    onClick={() => deletePreset(name)}
                    className="px-1.5 py-1 rounded-r text-xs transition-all opacity-0 group-hover:opacity-100"
                    style={{
                      backgroundColor: 'var(--state-error-bg)',
                      color: 'var(--state-error)',
                      border: '1px solid transparent',
                    }}
                    title="Supprimer ce preset"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Reset + Sauvegarder */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={resetToDefault}
          className="px-2 py-1 rounded text-xs transition-all"
          style={{
            backgroundColor: 'var(--surface-3)',
            color: 'var(--text-disabled)',
          }}
          title="Réinitialiser au layout par défaut"
        >
          🔄
        </button>
        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all"
          style={{
            backgroundColor: 'var(--surface-3)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-muted)',
          }}
          title="Sauvegarder cette disposition"
        >
          <span>💾</span>
          <span className="hidden md:inline">Sauvegarder</span>
        </button>
      </div>
    </div>
  );
}
