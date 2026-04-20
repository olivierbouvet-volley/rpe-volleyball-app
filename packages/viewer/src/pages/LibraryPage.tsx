/**
 * @file LibraryPage.tsx
 * @description Bibliothèque de matchs — vue principale post-connexion
 * Remplace ImportPage comme point d'entrée de l'application
 *
 * Layout :
 *   [Sidebar Saisons] | [Grille de matchs + header + quota]
 *   [Barre "Analyser la sélection" sticky en bas quand ≥1 match sélectionné]
 */

import { useEffect, useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useMatchLibraryStore } from '../store/matchLibraryStore';
import type { MatchMeta, Season } from '../types/library';
import { DVW_QUOTA } from '../types/library';

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composants
// ─────────────────────────────────────────────────────────────────────────────

// ── Carte d'un match ─────────────────────────────────────────────────────────
function MatchCard({
  match,
  isSelected,
  onToggleSelect,
  onOpen,
  onDelete,
}: {
  match: MatchMeta;
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { shareMatch, revokeShare } = useMatchLibraryStore();
  const { user } = useAuthStore();

  const shareUrl = match.shareToken
    ? `${window.location.origin}${window.location.pathname}?shareMatch=${match.shareToken}`
    : null;

  const dateLabel = match.date
    ? new Date(match.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Date inconnue';

  return (
    <div
      className="relative rounded-xl transition-all cursor-pointer group"
      style={{
        backgroundColor: isSelected ? 'var(--brand-blue-muted)' : 'var(--surface-3)',
        border: `2px solid ${isSelected ? 'var(--brand-blue)' : 'var(--surface-border)'}`,
        boxShadow: isSelected ? 'var(--shadow-glow-blue)' : 'none',
      }}
      onClick={onToggleSelect}
    >
      {/* Checkbox de sélection */}
      <div
        className="absolute top-3 left-3 w-5 h-5 rounded flex items-center justify-center transition-all"
        style={{
          backgroundColor: isSelected ? 'var(--brand-blue)' : 'var(--surface-4)',
          border: isSelected ? 'none' : '2px solid var(--border-strong)',
        }}
      >
        {isSelected && <span className="text-white text-xs font-bold">✓</span>}
      </div>

      {/* Badge partage */}
      {match.isPublic && (
        <div
          className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: 'var(--brand-green-muted)', color: 'var(--brand-green)' }}
        >
          Partagé
        </div>
      )}

      {/* Contenu */}
      <div className="p-4 pt-10">
        {/* Équipes */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)', maxWidth: '45%' }}>
            {match.teams.home || 'Équipe A'}
          </span>
          <span className="text-xs font-bold px-2" style={{ color: 'var(--text-muted)' }}>VS</span>
          <span className="text-sm font-semibold truncate text-right" style={{ color: 'var(--text-primary)', maxWidth: '45%' }}>
            {match.teams.away || 'Équipe B'}
          </span>
        </div>

        {/* Score global */}
        {match.score && (
          <div className="flex items-center justify-center gap-3 mb-3">
            <span
              className="text-2xl font-bold tabular-nums"
              style={{ color: match.score.home > match.score.away ? 'var(--brand-green)' : 'var(--text-secondary)' }}
            >
              {match.score.home}
            </span>
            <span className="text-lg font-bold" style={{ color: 'var(--text-disabled)' }}>–</span>
            <span
              className="text-2xl font-bold tabular-nums"
              style={{ color: match.score.away > match.score.home ? 'var(--brand-green)' : 'var(--text-secondary)' }}
            >
              {match.score.away}
            </span>
          </div>
        )}

        {/* Scores par set */}
        {(match.setScores?.length ?? 0) > 0 && (
          <div className="flex gap-1 justify-center mb-3">
            {match.setScores!.map((s, i) => (
              <span
                key={i}
                className="text-xs px-1.5 py-0.5 rounded font-mono tabular-nums"
                style={{ backgroundColor: 'var(--surface-4)', color: 'var(--text-muted)' }}
              >
                {s.home}-{s.away}
              </span>
            ))}
          </div>
        )}

        {/* Date */}
        <p className="text-xs text-center mb-3" style={{ color: 'var(--text-disabled)' }}>
          {dateLabel}
        </p>

        {/* Actions */}
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onOpen}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: 'var(--brand-blue)',
              color: '#fff',
            }}
          >
            📂 Ouvrir
          </button>
          {confirmDelete ? (
            <div className="flex gap-1">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1.5 rounded-lg text-xs transition-all"
                style={{ backgroundColor: 'var(--surface-4)', color: 'var(--text-muted)' }}
              >
                Annuler
              </button>
              <button
                onClick={onDelete}
                className="px-2 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ backgroundColor: 'var(--state-error-bg)', color: 'var(--state-error)' }}
              >
                Confirmer
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg text-xs transition-all"
              style={{ backgroundColor: 'var(--surface-4)', color: 'var(--text-muted)' }}
              title="Supprimer ce match"
            >
              🗑️
            </button>
          )}
        </div>

        {/* Partage */}
        <div
          className="mt-2 pt-2"
          style={{ borderTop: '1px solid var(--surface-border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {match.isPublic && shareUrl ? (
            <div className="flex gap-1">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2500);
                }}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: copied ? 'var(--state-success-bg)' : 'var(--surface-4)',
                  color: copied ? 'var(--state-success)' : 'var(--text-muted)',
                }}
              >
                {copied ? '\u2713 Lien copié !' : '\uD83D\uDD17 Copier lien'}
              </button>
              <button
                onClick={async () => {
                  if (!user) return;
                  await revokeShare(user.uid, match);
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ backgroundColor: 'var(--state-error-bg)', color: 'var(--state-error)' }}
                title="Révoquer le partage"
              >
                Révoquer
              </button>
            </div>
          ) : (
            <button
              onClick={async () => {
                if (!user) return;
                setShareLoading(true);
                await shareMatch(user.uid, user.email ?? '', match.id);
                setShareLoading(false);
              }}
              disabled={shareLoading}
              className="w-full py-1.5 rounded-lg text-xs transition-all disabled:opacity-50"
              style={{ backgroundColor: 'var(--surface-4)', color: 'var(--text-muted)' }}
            >
              {shareLoading ? 'Génération du lien…' : '\uD83D\uDD17 Partager ce match'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal Import DVW ──────────────────────────────────────────────────────────
function ImportMatchModal({
  seasonId,
  uid,
  onClose,
}: {
  seasonId: string;
  uid: string;
  onClose: () => void;
}) {
  const { addMatch, saveMatchVideoUrl, isImporting, importProgress, error, clearError } = useMatchLibraryStore();

  // ── Step management ──────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);
  const [importedMatchId, setImportedMatchId] = useState<string | null>(null);

  // ── Step 1: DVW file selection ───────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 2: Video URL ────────────────────────────────────────────────────
  const [videoUrl, setVideoUrl] = useState('');
  const [videoSaving, setVideoSaving] = useState(false);

  const isYouTubeUrl = (url: string) =>
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)/.test(url);

  const handleFileSelect = (file: File) => {
    clearError();
    if (!file.name.toLowerCase().endsWith('.dvw')) return;
    setSelectedFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  // Step 1 → upload DVW → go to step 2
  const handleImportDVW = async () => {
    if (!selectedFile) return;
    const matchId = await addMatch(uid, selectedFile, seasonId);
    if (matchId) {
      setImportedMatchId(matchId);
      setStep(2);
    }
  };

  // Step 2 → save video URL and close
  const handleAssociateVideo = async () => {
    if (!importedMatchId || !videoUrl.trim()) return;
    setVideoSaving(true);
    await saveMatchVideoUrl(uid, importedMatchId, videoUrl.trim());
    setVideoSaving(false);
    onClose();
  };

  const handleSkipVideo = () => onClose();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && !isImporting && onClose()}
    >
      <div
        className="w-full max-w-md rounded-xl shadow-xl p-6"
        style={{
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--surface-border)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {step === 1 ? 'Importer un match DVW' : 'Associer une vidéo'}
          </h2>
          <button onClick={onClose} disabled={isImporting} style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-5">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{
                  backgroundColor: step === s ? 'var(--brand-green)' : step > s ? 'var(--brand-green-glow)' : 'var(--surface-3)',
                  color: step >= s ? '#fff' : 'var(--text-muted)',
                  border: step > s ? '2px solid var(--brand-green)' : 'none',
                }}
              >
                {step > s ? '✓' : s}
              </div>
              {s < 2 && <div className="flex-1 h-px" style={{ backgroundColor: step > s ? 'var(--brand-green)' : 'var(--border-strong)', width: 40 }} />}
            </div>
          ))}
          <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
            {step === 1 ? 'Fichier DVW' : 'Vidéo (optionnel)'}
          </span>
        </div>

        {/* Error banner */}
        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--state-error-bg)', color: 'var(--state-error)' }}
          >
            {error}
          </div>
        )}

        {/* ── STEP 1: DVW drop area ── */}
        {step === 1 && (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !isImporting && fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 py-10 rounded-xl cursor-pointer transition-all"
              style={{
                border: `2px dashed ${isDragging ? 'var(--brand-green)' : selectedFile ? 'var(--brand-blue)' : 'var(--border-strong)'}`,
                backgroundColor: isDragging ? 'var(--brand-green-glow)' : 'var(--surface-3)',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".dvw"
                className="hidden"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
              {selectedFile ? (
                <>
                  <span className="text-2xl">📂</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--brand-blue)' }}>{selectedFile.name}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {(selectedFile.size / 1024).toFixed(0)} KB
                  </span>
                </>
              ) : (
                <>
                  <span className="text-3xl">📥</span>
                  <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                    Glissez un fichier <strong>.dvw</strong> ou cliquez
                  </p>
                </>
              )}
            </div>

            {isImporting && (
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  <span>Import en cours…</span>
                  <span>{importProgress}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-3)' }}>
                  <div
                    className="h-full transition-all"
                    style={{ width: `${importProgress}%`, backgroundColor: 'var(--brand-green)' }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={onClose}
                disabled={isImporting}
                className="flex-1 py-2.5 rounded-lg text-sm transition-all"
                style={{
                  backgroundColor: 'var(--surface-3)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-secondary)',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleImportDVW}
                disabled={!selectedFile || isImporting}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                style={{ backgroundColor: 'var(--brand-green)', color: '#fff' }}
              >
                {isImporting ? `${importProgress}%…` : 'Suivant →'}
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: Video URL ── */}
        {step === 2 && (
          <>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Associez une vidéo à ce match pour pouvoir la synchroniser avec les actions DVW.
            </p>

            {/* YouTube URL input */}
            <div className="mb-2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                🎬 URL YouTube
              </label>
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: 'var(--surface-3)',
                  border: `1px solid ${videoUrl && !isYouTubeUrl(videoUrl) ? 'var(--state-error)' : 'var(--border-strong)'}`,
                  color: 'var(--text-primary)',
                }}
              />
              {videoUrl && !isYouTubeUrl(videoUrl) && (
                <p className="text-xs mt-1" style={{ color: 'var(--state-error)' }}>
                  URL YouTube invalide (ex : youtube.com/watch?v=…)
                </p>
              )}
            </div>

            <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
              Vous pourrez également ajouter ou changer la vidéo plus tard depuis la carte du match.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleSkipVideo}
                className="flex-1 py-2.5 rounded-lg text-sm transition-all"
                style={{
                  backgroundColor: 'var(--surface-3)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-secondary)',
                }}
              >
                Ignorer
              </button>
              <button
                onClick={handleAssociateVideo}
                disabled={!videoUrl.trim() || !isYouTubeUrl(videoUrl) || videoSaving}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                style={{ backgroundColor: 'var(--brand-blue)', color: '#fff' }}
              >
                {videoSaving ? 'Enregistrement…' : '🔗 Associer la vidéo'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Modal Nouvelle Saison ────────────────────────────────────────────────────
function AddSeasonModal({ uid, onClose }: { uid: string; onClose: () => void }) {
  const { addSeason, setActiveSeason } = useMatchLibraryStore();
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const YEARS = [year - 1, year, year + 1];

  const handleCreate = async () => {
    if (!name.trim()) { setError('Le nom est requis.'); return; }
    setLoading(true);
    try {
      const newId = await addSeason(uid, name, year);
      setActiveSeason(newId, uid);
      onClose();
    } catch {
      setError('Erreur lors de la création.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-xl shadow-xl p-6"
        style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--surface-border)' }}
      >
        <h2 className="text-lg font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
          Nouvelle saison
        </h2>
        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--state-error-bg)', color: 'var(--state-error)' }}>
            {error}
          </div>
        )}
        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Ex : Interpole, Pro A…"
            className="px-3 py-2.5 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--surface-3)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          <div className="flex gap-2">
            {YEARS.map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: year === y ? 'var(--brand-blue)' : 'var(--surface-3)',
                  color: year === y ? '#fff' : 'var(--text-secondary)',
                  border: year === y ? '1px solid var(--brand-blue)' : '1px solid var(--border-strong)',
                }}
              >
                {y}
              </button>
            ))}
          </div>
          <div className="flex gap-3 mt-1">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--surface-3)', border: '1px solid var(--border-strong)', color: 'var(--text-secondary)' }}>
              Annuler
            </button>
            <button onClick={handleCreate} disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand-green)', color: '#fff' }}>
              {loading ? 'Création…' : 'Créer →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export function LibraryPage() {
  const { user, signOut } = useAuthStore();
  const {
    seasons, matches, totalMatchCount, activeSeasonId,
    selectedMatchIds, isLoadingSeasons, isLoadingMatches,
    isImporting, error,
    loadSeasons, loadTotalCount, setActiveSeason,
    toggleMatchSelection, clearSelection, selectAll,
    deleteMatch, deleteSeason, openMatchForAnalysis, openMultipleForAnalysis,
    clearError,
  } = useMatchLibraryStore();

  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddSeason, setShowAddSeason] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [confirmDeleteSeason, setConfirmDeleteSeason] = useState<typeof seasons[0] | null>(null);
  const [deletingSeasonId, setDeletingSeasonId] = useState<string | null>(null);

  const uid = user!.uid;
  const activeSeason = seasons.find((s) => s.id === activeSeasonId);
  const quotaPercent = Math.min(100, (totalMatchCount / DVW_QUOTA) * 100);
  const quotaReached = totalMatchCount >= DVW_QUOTA;

  // ── Chargement initial ──
  useEffect(() => {
    loadSeasons(uid);
    loadTotalCount(uid);
  }, [uid]);

  // ── Analyser la sélection ──
  const handleAnalyzeSelection = async () => {
    if (selectedMatchIds.length === 0) return;
    setLoadingAnalysis(true);
    const selectedMatches = matches.filter((m) => selectedMatchIds.includes(m.id));
    await openMultipleForAnalysis(selectedMatches);
    setLoadingAnalysis(false);
  };

  // ── Ouvrir un match ──
  const handleOpenMatch = async (match: MatchMeta) => {
    setLoadingAnalysis(true);
    await openMatchForAnalysis(match);
    setLoadingAnalysis(false);
  };

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ backgroundColor: 'var(--surface-root)', color: 'var(--text-primary)' }}
    >
      {/* ── Header global ── */}
      <header
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{
          backgroundColor: 'var(--surface-1)',
          borderBottom: '1px solid var(--surface-border)',
        }}
      >
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-primary-green">Volley</span>
          <span className="text-primary-blue">Vision</span>
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm hidden sm:block" style={{ color: 'var(--text-muted)' }}>
            {user?.displayName ?? user?.email}
          </span>
          <button
            onClick={signOut}
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{
              backgroundColor: 'var(--surface-3)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-muted)',
            }}
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* ── Corps principal ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar Saisons ── */}
        <aside
          className="w-60 shrink-0 flex flex-col"
          style={{
            backgroundColor: 'var(--surface-1)',
            borderRight: '1px solid var(--surface-border)',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Saisons
            </span>
            <button
              onClick={() => setShowAddSeason(true)}
              className="w-6 h-6 rounded flex items-center justify-center text-sm transition-all"
              style={{ backgroundColor: 'var(--surface-3)', color: 'var(--text-secondary)' }}
              title="Ajouter une saison"
            >
              +
            </button>
          </div>

          {/* Liste des saisons */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingSeasons ? (
              <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-disabled)' }}>
                Chargement…
              </div>
            ) : seasons.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-disabled)' }}>
                Aucune saison
              </div>
            ) : (
              seasons.map((season) => (
                <div
                  key={season.id}
                  className="group relative flex items-center"
                  style={{
                    backgroundColor: activeSeasonId === season.id ? 'var(--surface-3)' : 'transparent',
                    borderLeft: `3px solid ${activeSeasonId === season.id ? 'var(--brand-blue)' : 'transparent'}`,
                  }}
                >
                  <button
                    onClick={() => setActiveSeason(season.id, uid)}
                    className="flex-1 px-4 py-2.5 text-left transition-all min-w-0"
                  >
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {season.label}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-disabled)' }}>
                      {season.matchCount} match{season.matchCount !== 1 ? 's' : ''}
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteSeason(season); }}
                    title="Supprimer cette saison"
                    className="shrink-0 mr-2 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--state-error)' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Quota */}
          <div
            className="p-4"
            style={{ borderTop: '1px solid var(--surface-border)' }}
          >
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Matchs importés</span>
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: quotaReached ? 'var(--state-error)' : 'var(--text-secondary)' }}
              >
                {totalMatchCount} / {DVW_QUOTA}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-3)' }}>
              <div
                className="h-full transition-all"
                style={{
                  width: `${quotaPercent}%`,
                  backgroundColor: quotaReached
                    ? 'var(--state-error)'
                    : quotaPercent > 80
                    ? 'var(--state-warning)'
                    : 'var(--brand-green)',
                }}
              />
            </div>
          </div>
        </aside>

        {/* ── Zone principale ── */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Sous-header de la saison */}
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            style={{ borderBottom: '1px solid var(--surface-border)' }}
          >
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {activeSeason ? activeSeason.label : 'Sélectionnez une saison'}
              </h2>
              {activeSeason && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {activeSeason.matchCount} match{activeSeason.matchCount !== 1 ? 's' : ''}
                  {selectedMatchIds.length > 0 && (
                    <span style={{ color: 'var(--brand-blue)' }}>
                      {' '}· {selectedMatchIds.length} sélectionné{selectedMatchIds.length > 1 ? 's' : ''}
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedMatchIds.length > 0 && (
                <button
                  onClick={clearSelection}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    backgroundColor: 'var(--surface-3)',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--text-muted)',
                  }}
                >
                  Désélectionner tout
                </button>
              )}
              {matches.length > 0 && selectedMatchIds.length === 0 && (
                <button
                  onClick={selectAll}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    backgroundColor: 'var(--surface-3)',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--text-muted)',
                  }}
                >
                  Tout sélectionner
                </button>
              )}
              <button
                onClick={() => activeSeasonId && setShowImportModal(true)}
                disabled={quotaReached || !activeSeasonId}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--brand-green)', color: '#fff' }}
                title={quotaReached ? `Quota atteint (${DVW_QUOTA} max)` : 'Importer un fichier DVW'}
              >
                <span>+ Importer</span>
                {quotaReached && <span className="text-xs opacity-70">({DVW_QUOTA}/{DVW_QUOTA})</span>}
              </button>
            </div>
          </div>

          {/* Erreur globale */}
          {error && (
            <div
              className="mx-6 mt-4 px-4 py-3 rounded-lg text-sm flex items-center justify-between"
              style={{ backgroundColor: 'var(--state-error-bg)', color: 'var(--state-error)' }}
            >
              <span>{error}</span>
              <button onClick={clearError} className="text-lg leading-none">✕</button>
            </div>
          )}

          {/* Grille des matchs */}
          <div className="flex-1 overflow-y-auto p-6">
            {!activeSeasonId ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <span className="text-4xl">📁</span>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Sélectionnez ou créez une saison
                </p>
                <button
                  onClick={() => setShowAddSeason(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: 'var(--brand-green)', color: '#fff' }}
                >
                  + Nouvelle saison
                </button>
              </div>
            ) : isLoadingMatches ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-48 rounded-xl animate-pulse"
                    style={{ backgroundColor: 'var(--surface-3)' }}
                  />
                ))}
              </div>
            ) : matches.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <span className="text-4xl">🏐</span>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Aucun match dans cette saison
                </p>
                {!quotaReached && (
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: 'var(--brand-green)', color: '#fff' }}
                  >
                    Importer votre premier match
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {matches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    isSelected={selectedMatchIds.includes(match.id)}
                    onToggleSelect={() => toggleMatchSelection(match.id)}
                    onOpen={() => handleOpenMatch(match)}
                    onDelete={() => deleteMatch(uid, match)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Barre sticky "Analyser la sélection" ── */}
      {selectedMatchIds.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4"
          style={{
            backgroundColor: 'var(--surface-2)',
            borderTop: '2px solid var(--brand-blue)',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          <div>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {selectedMatchIds.length} match{selectedMatchIds.length > 1 ? 's' : ''} sélectionné{selectedMatchIds.length > 1 ? 's' : ''}
            </span>
            {selectedMatchIds.length > 1 && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Analyse cumulative · Tous les joueurs agrégés
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={clearSelection}
              className="px-4 py-2 rounded-lg text-sm transition-all"
              style={{
                backgroundColor: 'var(--surface-3)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-muted)',
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleAnalyzeSelection}
              disabled={loadingAnalysis}
              className="px-6 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
              style={{ backgroundColor: 'var(--brand-blue)', color: '#fff' }}
            >
              {loadingAnalysis
                ? `Chargement (${selectedMatchIds.length} matchs)…`
                : selectedMatchIds.length === 1
                ? '📊 Analyser'
                : `📊 Analyser les ${selectedMatchIds.length} matchs`}
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showImportModal && activeSeasonId && (
        <ImportMatchModal
          seasonId={activeSeasonId}
          uid={uid}
          onClose={() => setShowImportModal(false)}
        />
      )}
      {showAddSeason && (
        <AddSeasonModal uid={uid} onClose={() => setShowAddSeason(false)} />
      )}

      {/* ── Confirmation suppression saison ── */}
      {confirmDeleteSeason && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setConfirmDeleteSeason(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl shadow-xl p-6"
            style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--surface-border)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'var(--state-error-bg)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--state-error)' }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Supprimer la saison ?</h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{confirmDeleteSeason.label}</p>
              </div>
            </div>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
              Cette action supprimera <strong style={{ color: 'var(--state-error)' }}>définitivement</strong> la saison
              et ses <strong>{confirmDeleteSeason.matchCount} match{confirmDeleteSeason.matchCount !== 1 ? 's' : ''}</strong> associé{confirmDeleteSeason.matchCount !== 1 ? 's' : ''}.
              Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteSeason(null)}
                disabled={deletingSeasonId === confirmDeleteSeason.id}
                className="flex-1 py-2.5 rounded-lg text-sm transition-all"
                style={{ backgroundColor: 'var(--surface-3)', border: '1px solid var(--border-strong)', color: 'var(--text-secondary)' }}
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  setDeletingSeasonId(confirmDeleteSeason.id);
                  await deleteSeason(uid, confirmDeleteSeason.id);
                  setDeletingSeasonId(null);
                  setConfirmDeleteSeason(null);
                }}
                disabled={deletingSeasonId === confirmDeleteSeason.id}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                style={{ backgroundColor: 'var(--state-error)', color: '#fff' }}
              >
                {deletingSeasonId === confirmDeleteSeason.id ? 'Suppression…' : '🗑 Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Overlay de chargement analyse ── */}
      {loadingAnalysis && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--brand-green)', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Chargement du match…
          </p>
        </div>
      )}
    </div>
  );
}

export default LibraryPage;
