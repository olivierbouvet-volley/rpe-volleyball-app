import { useEffect, useMemo, useRef } from 'react';
import { useVideoStore } from '../store/videoStore';
import { useFilterStore } from '../store/filterStore';
import { getSkillIcon, getSkillLabel, getQualityColorClass } from '../utils/timelineHelpers';
import type { FilteredAction } from '../utils/filterEngine';

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
  const { currentTime, offset, seekTo } = useVideoStore();
  const {
    preRollSeconds,
    postRollSeconds,
    autoAdvance,
    setMargins,
    toggleAutoAdvance,
  } = useFilterStore();

  const currentItem = items[currentIndex];
  const currentIndexRef = useRef(currentIndex);
  const hasAdvancedRef = useRef(false);

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
      if (currentIndexRef.current < items.length - 1) {
        // Passer au clip suivant
        hasAdvancedRef.current = true;
        onIndexChange(currentIndexRef.current + 1);
      } else {
        // Fin de la playlist - arrêter l'auto-advance
        hasAdvancedRef.current = true;
        toggleAutoAdvance();
      }
    }
  }, [currentTime, autoAdvance, items.length, offset, postRollSeconds, isActive, onIndexChange, toggleAutoAdvance, currentItem]);

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
    <div className={`bg-slate-800 rounded-lg p-3 ${className}`}>
      {/* Contrôles playlist */}
      <div className="flex items-center justify-between mb-2">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={currentIndex <= 0}
            className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors"
            title="Clip précédent"
          >
            ⏮
          </button>
          <span className="text-sm font-mono tabular-nums text-slate-300 min-w-[60px] text-center">
            {currentIndex + 1} / {items.length}
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

        {/* Marges et auto-advance */}
        <div className="flex items-center gap-2 text-xs">
          <label className="text-slate-400">Avant :</label>
          <select
            value={preRollSeconds}
            onChange={e => setMargins(+e.target.value, postRollSeconds)}
            className="bg-slate-700 text-slate-200 rounded px-1 py-0.5 cursor-pointer"
          >
            <option value={1}>1s</option>
            <option value={2}>2s</option>
            <option value={3}>3s</option>
            <option value={5}>5s</option>
          </select>

          <label className="text-slate-400">Après :</label>
          <select
            value={postRollSeconds}
            onChange={e => setMargins(preRollSeconds, +e.target.value)}
            className="bg-slate-700 text-slate-200 rounded px-1 py-0.5 cursor-pointer"
          >
            <option value={2}>2s</option>
            <option value={3}>3s</option>
            <option value={5}>5s</option>
            <option value={7}>7s</option>
            <option value={10}>10s</option>
          </select>

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
        </div>
      </div>

      {/* Info clip courant */}
      <div className="text-xs text-slate-300 bg-slate-900 rounded p-2 mb-2">
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
      <div className="max-h-[150px] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
        {items.map((item, i) => (
          <button
            key={item.action.id}
            onClick={() => onIndexChange(i)}
            className={`w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2 transition-colors ${
              i === currentIndex
                ? 'bg-primary-blue/20 text-white font-medium'
                : 'text-slate-400 hover:bg-slate-700'
            }`}
          >
            <span className="w-6 text-right font-mono text-slate-500">{i + 1}</span>
            <span className={`${getQualityColorClass(item.action.quality)} px-1 rounded font-bold`}>
              {item.action.quality}
            </span>
            <span>{getSkillIcon(item.action.skill)}</span>
            <span>#{item.action.player.number}</span>
            <span className="text-slate-500 ml-auto text-[10px]">{item.matchTime}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
