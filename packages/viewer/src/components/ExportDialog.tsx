import { useState, useEffect } from 'react';
import type { PlaylistExport } from '../utils/exportPlaylist';
import {
  exportAsJSON,
  exportAsCSV,
  exportAsShareURL,
  generateYouTubeChapters,
  formatTime,
} from '../utils/exportPlaylist';
import { formatDate } from '../utils/formatters';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: PlaylistExport;
}

/**
 * Modal dialog for exporting playlists in various formats
 */
export function ExportDialog({ isOpen, onClose, playlist }: ExportDialogProps) {
  // Local state
  const [title, setTitle] = useState(playlist.title);
  const [shareCopied, setShareCopied] = useState(false);
  const [chaptersCopied, setChaptersCopied] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTitle(playlist.title);
      setShareCopied(false);
      setChaptersCopied(false);
    }
  }, [isOpen, playlist.title]);

  // Don't render if not open
  if (!isOpen) return null;

  // Handler: Export JSON
  const handleExportJSON = () => {
    const updatedPlaylist = { ...playlist, title };
    exportAsJSON(updatedPlaylist);
  };

  // Handler: Export CSV
  const handleExportCSV = () => {
    const updatedPlaylist = { ...playlist, title };
    exportAsCSV(updatedPlaylist);
  };

  // Handler: Copy share URL
  const handleCopyShareURL = async () => {
    const updatedPlaylist = { ...playlist, title };
    const url = exportAsShareURL(updatedPlaylist);

    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (err) {
      console.error('[ExportDialog] Failed to copy URL:', err);
      alert('Erreur lors de la copie du lien. Vérifiez les permissions du navigateur.');
    }
  };

  // Handler: Copy YouTube chapters
  const handleCopyChapters = async () => {
    const updatedPlaylist = { ...playlist, title };
    const chapters = generateYouTubeChapters(updatedPlaylist);

    try {
      await navigator.clipboard.writeText(chapters);
      setChaptersCopied(true);
      setTimeout(() => setChaptersCopied(false), 2000);
    } catch (err) {
      console.error('[ExportDialog] Failed to copy chapters:', err);
      alert('Erreur lors de la copie des chapitres.');
    }
  };

  // Format total duration for display
  const formattedDuration = formatTime(playlist.totalDuration);
  const formattedDate = formatDate(playlist.matchDate);

  return (
    // Fixed overlay with backdrop blur
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Modal container */}
      <div className="bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            🎬 Exporter le montage
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-2xl leading-none"
            title="Fermer"
          >
            ×
          </button>
        </div>

        {/* Body - scrollable */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {/* Editable title */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Titre du montage
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="Titre de votre playlist..."
            />
          </div>

          {/* Summary */}
          <div className="bg-slate-900 rounded-lg p-4 mb-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Clips :</span>
              <span className="text-white font-medium">{playlist.clips.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Durée totale :</span>
              <span className="text-white font-medium">{formattedDuration}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Match :</span>
              <span className="text-white font-medium">
                {playlist.homeTeam} vs {playlist.awayTeam}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Date :</span>
              <span className="text-white font-medium">{formattedDate}</span>
            </div>
          </div>

          {/* Export options */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">
              Choisissez un format d'export :
            </h3>

            {/* Option 1: JSON */}
            <ExportOption
              icon="📋"
              title="Fichier JSON (.volleyvision.json)"
              description="Fichier réimportable dans VolleyVision pour partager ou archiver vos playlists"
              onClick={handleExportJSON}
            />

            {/* Option 2: CSV */}
            <ExportOption
              icon="📊"
              title="Fichier CSV"
              description="Ouvrir dans Excel ou Google Sheets — clips avec timestamps et URLs YouTube"
              onClick={handleExportCSV}
            />

            {/* Option 3: Share URL */}
            <ExportOption
              icon={shareCopied ? '✅' : '🔗'}
              title={shareCopied ? 'Lien copié !' : 'Lien partageable'}
              description="Copiez un lien raccourci pour partager la playlist directement"
              onClick={handleCopyShareURL}
            />

            {/* Option 4: YouTube Chapters */}
            <ExportOption
              icon={chaptersCopied ? '✅' : '📝'}
              title={chaptersCopied ? 'Chapitres copiés !' : 'Chapitres YouTube'}
              description="Copiez les timestamps formatés pour la description YouTube"
              onClick={handleCopyChapters}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-component: ExportOption
// ============================================================================

interface ExportOptionProps {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}

function ExportOption({ icon, title, description, onClick }: ExportOptionProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-slate-900 hover:bg-slate-700/50 rounded-lg p-3 text-left transition-colors group"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <div className="font-medium text-white group-hover:text-blue-400 transition-colors">
            {title}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {description}
          </div>
        </div>
      </div>
    </button>
  );
}
