import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useVideoStore } from '../store/videoStore';
import { useFilterStore } from '../store/filterStore';
import { useMatchStore } from '../store/matchStore';
import { getSkillIcon, getSkillLabel, getQualityColorClass } from '../utils/timelineHelpers';
import type { FilteredAction } from '../utils/filterEngine';
import { ExportDialog } from './ExportDialog';
import { buildPlaylistExport } from '../utils/exportPlaylist';

interface PlaylistPlayerProps {
  items: FilteredAction[];
  isActive: boolean;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  className?: string;
}

/**
 * Mode playlist : enchaîne les clips filtrés automatiquement
 */
export function PlaylistPlayer({
  items,
  isActive,
  currentIndex,
  onIndexChange,
  className = '',
}: PlaylistPlayerProps) {
  const { currentTime, offset, seekTo, videoId } = useVideoStore();
  const {
    preRollSeconds,
    postRollSeconds,
    autoAdvance,
    selectedActionIds,
    setMargins,
    toggleAutoAdvance,
    toggleActionSelection,
    selectAllActions,
  } = useFilterStore();
  const { match } = useMatchStore();

  const currentItem = items[currentIndex];
  const currentIndexRef = useRef(currentIndex);
  const hasAdvancedRef = useRef(false);

  // Export dialog state
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Sélectionner toutes les actions par défaut quand la liste change
  useEffect(() => {
    const allActionIds = items.map(item => item.action.id);
    // Si aucune action n'est sélectionnée, tout sélectionner par défaut
    const hasSelections = allActionIds.some(id => selectedActionIds.has(id));
    if (!hasSelections && allActionIds.length > 0) {
      selectAllActions(allActionIds);
    }
  }, [items, selectedActionIds, selectAllActions]);

  // Filtrer seulement les actions sélectionnées
  const selectedItems = useMemo(() => {
    return items.filter(item => selectedActionIds.has(item.action.id));
  }, [items, selectedActionIds]);

  // Helper pour trouver le prochain index sélectionné
  const findNextSelectedIndex = useCallback((fromIndex: number): number | null => {
    for (let i = fromIndex + 1; i < items.length; i++) {
      if (selectedActionIds.has(items[i].action.id)) {
        return i;
      }
    }
    return null; // Pas de prochain sélectionné
  }, [items, selectedActionIds]);

  // Sync currentIndexRef with currentIndex
  useEffect(() => {
    currentIndexRef.current = currentIndex;
    hasAdvancedRef.current = false; // Reset when index changes
  }, [currentIndex]);

  // ============================================================================
  // Keyboard Navigation
  // - Flèches gauche/droite : Naviguer dans la playlist (clip précédent/suivant)
  // - Ctrl + Flèches gauche/droite : Avancer/Reculer dans la vidéo de 1 seconde
  // - Ctrl + Flèches haut/bas : Avancer/Reculer dans la vidéo de 10 secondes
  // ============================================================================

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer si Alt ou Shift sont pressés
      if (e.altKey || e.shiftKey) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (e.ctrlKey) {
          // Ctrl+Flèche gauche : Reculer de 1 seconde dans la vidéo
          seekTo(Math.max(0, currentTime - 1));
        } else {
          // Flèche gauche seule : Clip précédent
          if (currentIndex > 0) {
            onIndexChange(currentIndex - 1);
          }
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (e.ctrlKey) {
          // Ctrl+Flèche droite : Avancer de 1 seconde dans la vidéo
          seekTo(currentTime + 1);
        } else {
          // Flèche droite seule : Clip suivant
          if (currentIndex < items.length - 1) {
            onIndexChange(currentIndex + 1);
          }
        }
      } else if (e.key === 'ArrowUp' && e.ctrlKey) {
        e.preventDefault();
        // Ctrl+Flèche haut : Avancer de 10 secondes dans la vidéo
        seekTo(currentTime + 10);
      } else if (e.key === 'ArrowDown' && e.ctrlKey) {
        e.preventDefault();
        // Ctrl+Flèche bas : Reculer de 10 secondes dans la vidéo
        seekTo(Math.max(0, currentTime - 10));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentIndex, items.length, onIndexChange, currentTime, seekTo]);

  // ============================================================================
  // Auto-Advance Logic: Surveiller currentTime et passer au clip suivant
  // ============================================================================

  useEffect(() => {
    if (!autoAdvance || !currentItem || !isActive) return;

    // Utiliser timestamp réel ou estimé
    const timestamp = currentItem.action.videoTimestamp ?? currentItem.estimatedTimestamp;
    if (!timestamp) return;

    // Éviter de re-déclencher si on a déjà avancé pour cet index
    if (hasAdvancedRef.current) return;

    const actionYTTime = timestamp + offset;
    // Utiliser sequenceEnd si disponible, sinon postRollSeconds
    const clipEndTime = currentItem.sequenceEnd
      ? currentItem.sequenceEnd + offset
      : actionYTTime + postRollSeconds;

    // Détection avec buffer de 0.5s pour éviter les transitions manquées
    if (currentTime >= clipEndTime - 0.5) {
      // Trouver le prochain clip sélectionné
      const nextIndex = findNextSelectedIndex(currentIndexRef.current);
      if (nextIndex !== null) {
        // Passer au clip suivant sélectionné
        hasAdvancedRef.current = true;
        onIndexChange(nextIndex);
      } else {
        // Fin de la playlist - arrêter l'auto-advance
        hasAdvancedRef.current = true;
        toggleAutoAdvance();
      }
    }
  }, [currentTime, autoAdvance, items.length, offset, postRollSeconds, isActive, onIndexChange, toggleAutoAdvance, currentItem, findNextSelectedIndex]);

  // ============================================================================
  // Seek Logic: Quand l'index change, chercher la vidéo au bon moment
  // ============================================================================

  useEffect(() => {
    if (!currentItem || !isActive) return;

    // Utiliser timestamp réel ou estimé
    const timestamp = currentItem.action.videoTimestamp ?? currentItem.estimatedTimestamp;
    if (!timestamp) return;

    // Utiliser sequenceStart si disponible (pour voir tout le contexte), sinon preRollSeconds
    const startTime = currentItem.sequenceStart
      ? Math.max(0, currentItem.sequenceStart + offset)
      : Math.max(0, timestamp + offset - preRollSeconds);

    seekTo(startTime);

    // Petit délai pour que le seek se termine avant de jouer
    setTimeout(() => {
      // Note: Le play sera géré par le VideoPlayer lui-même
    }, 100);
  }, [currentIndex, isActive, currentItem, offset, preRollSeconds, seekTo]);

  // ============================================================================
  // Navigation handlers
  // ============================================================================

  const onPrev = () => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    }
  };

  const onNext = () => {
    if (currentIndex < items.length - 1) {
      onIndexChange(currentIndex + 1);
    }
  };

  // ============================================================================
  // UI Rendering
  // ============================================================================

  if (items.length === 0) {
    return (
      <div className={`bg-slate-800 rounded-lg p-8 text-center text-slate-400 ${className}`}>
        Aucune action filtrée. Ajustez les filtres pour créer une playlist.
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className={`bg-slate-800 rounded-lg p-8 text-center text-slate-400 ${className}`}>
        Index de playlist invalide.
      </div>
    );
  }

  return (
    <div className={`bg-slate-800 rounded-lg p-3 flex flex-col h-full ${className}`}>
      {/* Contrôles playlist */}
      <div className="flex items-center justify-between gap-2 mb-2 flex-shrink-0">
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            disabled={currentIndex <= 0}
            className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors"
            title="Clip précédent"
          >
            ⏮
          </button>
          <span className="text-sm font-mono tabular-nums text-slate-300 min-w-[50px] text-center">
            {currentIndex + 1}/{items.length}
          </span>
          <button
            onClick={onNext}
            disabled={currentIndex >= items.length - 1}
            className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors"
            title="Clip suivant"
          >
            ⏭
          </button>
        </div>

        {/* Marges */}
        <div className="flex items-center gap-1 text-xs">
          <div className="flex flex-col items-center">
            <label className="text-slate-500 text-[10px] leading-none mb-0.5">Avant</label>
            <select
              value={preRollSeconds}
              onChange={e => setMargins(+e.target.value, postRollSeconds)}
              className="bg-slate-700 text-slate-200 rounded px-1 py-0.5 cursor-pointer text-xs"
            >
              <option value={1}>1s</option>
              <option value={2}>2s</option>
              <option value={3}>3s</option>
              <option value={5}>5s</option>
            </select>
          </div>

          <div className="flex flex-col items-center">
            <label className="text-slate-500 text-[10px] leading-none mb-0.5">Après</label>
            <select
              value={postRollSeconds}
              onChange={e => setMargins(preRollSeconds, +e.target.value)}
              className="bg-slate-700 text-slate-200 rounded px-1 py-0.5 cursor-pointer text-xs"
            >
              <option value={2}>2s</option>
              <option value={3}>3s</option>
              <option value={5}>5s</option>
              <option value={7}>7s</option>
              <option value={10}>10s</option>
            </select>
          </div>
        </div>

        {/* Auto-advance et export */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleAutoAdvance}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              autoAdvance
                ? 'bg-primary-green text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
            title="Lecture automatique"
          >
            Auto ▶
          </button>

          <button
            onClick={() => setShowExportDialog(true)}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={selectedItems.length === 0 || !videoId}
            title={!videoId ? "Associez d'abord une vidéo YouTube" : `Exporter ${selectedItems.length} clips sélectionnés`}
          >
            🎬 Exporter ({selectedItems.length})
          </button>
        </div>
      </div>

      {/* Info clip courant */}
      <div className="text-xs text-slate-300 bg-slate-900 rounded p-2 mb-2 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`${getQualityColorClass(currentItem.action.quality)} px-1.5 py-0.5 rounded font-bold`}>
            {currentItem.action.quality}
          </span>
          <span>{getSkillIcon(currentItem.action.skill)} {getSkillLabel(currentItem.action.skill)}</span>
          <span>— #{currentItem.action.player.number}</span>
          {currentItem.sequenceStart && currentItem.sequenceEnd && (
            <span className="px-1.5 py-0.5 bg-blue-900/50 text-blue-300 rounded text-[10px]" title="Séquence complète (réception → passe → attaque)">
              🔗 Séquence
            </span>
          )}
          {currentItem.estimatedTimestamp && !currentItem.action.videoTimestamp && (
            <span className="px-1.5 py-0.5 bg-yellow-900/50 text-yellow-300 rounded text-[10px]" title="Timestamp estimé">
              ⏱ Estimé
            </span>
          )}
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">{currentItem.matchTime}</span>
        </div>
      </div>

      {/* Mini-liste scrollable des clips */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
        {items.map((item, i) => {
          const isSelected = selectedActionIds.has(item.action.id);
          return (
            <div
              key={item.action.id}
              className={`w-full px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                i === currentIndex
                  ? 'bg-primary-blue/20 text-white font-medium'
                  : 'text-slate-400 hover:bg-slate-700'
              }`}
            >
              {/* Checkbox pour sélection */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleActionSelection(item.action.id);
                }}
                className="w-3 h-3 rounded border-slate-600 bg-slate-700 text-primary-blue focus:ring-1 focus:ring-primary-blue opacity-50 hover:opacity-100 cursor-pointer"
                title={isSelected ? "Désélectionner" : "Sélectionner"}
              />

              {/* Bouton pour naviguer vers le clip */}
              <button
                onClick={() => onIndexChange(i)}
                className="flex-1 flex items-center gap-1.5"
              >
                <span className="w-5 text-right font-mono text-slate-500">{i + 1}</span>
                <span className={`${getQualityColorClass(item.action.quality)} px-1 rounded font-bold`}>
                  {item.action.quality}
                </span>
                <span>{getSkillIcon(item.action.skill)}</span>
                <span>#{item.action.player.number}</span>
                <span className="text-slate-500 ml-auto text-[10px]">{item.matchTime}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Export dialog */}
      {showExportDialog && match && videoId && (
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          playlist={buildPlaylistExport(
            match,
            selectedItems,
            videoId,
            offset,
            preRollSeconds,
            postRollSeconds
          )}
        />
      )}
    </div>
  );
}
