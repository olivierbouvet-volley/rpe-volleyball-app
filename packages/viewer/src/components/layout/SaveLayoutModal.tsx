/**
 * @file SaveLayoutModal.tsx
 * @description Modal pour nommer et sauvegarder le layout courant
 */

import { useState } from 'react';
import type { IJsonModel } from 'flexlayout-react';
import { useLayoutStore } from '../../store/layoutStore';

interface SaveLayoutModalProps {
  /** JSON du modèle courant (model.toJson()) */
  modelJson: IJsonModel;
  onClose: () => void;
}

export function SaveLayoutModal({ modelJson, onClose }: SaveLayoutModalProps) {
  const [name, setName] = useState('');
  const { savePreset, savedPresets } = useLayoutStore();
  const isNameTaken = name.trim() in savedPresets;

  const handleSave = () => {
    if (!name.trim()) return;
    savePreset(name.trim(), modelJson);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-xl p-6 shadow-xl"
        style={{
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--surface-border)',
        }}
      >
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          💾 Sauvegarder cette disposition
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Ce layout sera disponible dans la barre de presets.
        </p>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="Nom du préréglage…"
          autoFocus
          className="w-full px-3 py-2.5 rounded-lg text-sm mb-1"
          style={{
            backgroundColor: 'var(--surface-3)',
            border: `1px solid ${isNameTaken ? 'var(--state-warning)' : 'var(--border-strong)'}`,
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        />
        {isNameTaken && (
          <p className="text-xs mb-3" style={{ color: 'var(--state-warning)' }}>
            ⚠️ Un preset portant ce nom existe déjà — il sera écrasé.
          </p>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm transition-all"
            style={{
              backgroundColor: 'var(--surface-3)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-muted)',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
            style={{ backgroundColor: 'var(--brand-green)', color: '#fff' }}
          >
            Sauvegarder →
          </button>
        </div>
      </div>
    </div>
  );
}
