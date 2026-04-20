/**
 * @file OnboardingWizard.tsx
 * @description Wizard 2 étapes affiché à la première connexion
 * Étape 1 : Créer une saison (nom + année)
 * Étape 2 : Importer un premier match DVW (optionnel — skip possible)
 */

import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { doc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db, storage, auth } from '../firebase';
import { ref } from 'firebase/storage';
import { useAuthStore } from '../store/useAuthStore';

interface OnboardingWizardProps {
  onComplete: () => void;
}

type Step = 1 | 2;

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user, completeOnboarding } = useAuthStore();

  // ── Étape ──
  const [step, setStep] = useState<Step>(1);

  // ── Étape 1 : Saison ──
  const [seasonName, setSeasonName] = useState('');
  const [seasonYear, setSeasonYear] = useState(CURRENT_YEAR);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [seasonError, setSeasonError] = useState<string | null>(null);
  const [createdSeasonId, setCreatedSeasonId] = useState<string | null>(null);

  // ── Étape 2 : Import DVW ──
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─────────────────────────────────────────────────────────────
  // Étape 1 : Créer la saison dans Firestore
  // ─────────────────────────────────────────────────────────────
  const handleCreateSeason = async () => {
    if (!user) return;
    if (!seasonName.trim()) {
      setSeasonError('Le nom de la saison est requis.');
      return;
    }
    setSeasonLoading(true);
    setSeasonError(null);
    try {
      const seasonId = `${seasonYear}-${Date.now()}`;
      await setDoc(doc(db, 'users', user.uid, 'seasons', seasonId), {
        id: seasonId,
        name: seasonName.trim(),
        year: seasonYear,
        label: `${seasonName.trim()} ${seasonYear}`,
        matchCount: 0,
        createdAt: serverTimestamp(),
        ownerId: user.uid,
      });
      setCreatedSeasonId(seasonId);
      setStep(2);
    } catch {
      setSeasonError('Erreur lors de la création. Réessayez.');
    } finally {
      setSeasonLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Étape 2 : Upload DVW vers Firebase Storage + metadata Firestore
  // ─────────────────────────────────────────────────────────────
  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.dvw')) {
      setUploadError('Seuls les fichiers .dvw sont acceptés.');
      return;
    }
    setUploadError(null);
    setSelectedFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!user || !selectedFile || !createdSeasonId) return;
    setUploadLoading(true);
    setUploadError(null);
    try {
      const matchId = `match-${Date.now()}-${crypto.randomUUID().split('-')[0]}`;
      const objectPath = `users/${user.uid}/dvw/${matchId}.dvw`;
      const bucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string;

      // Upload direct REST API — évite x-goog-if-generation-match:0 (412)
      setUploadProgress(20);
      const token = await auth.currentUser!.getIdToken();
      setUploadProgress(40);

      const uploadResp = await fetch(
        `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodeURIComponent(objectPath)}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Firebase ${token}`,
            'Content-Type': 'application/octet-stream',
          },
          body: await selectedFile.arrayBuffer(),
        }
      );
      if (!uploadResp.ok) {
        const errBody = await uploadResp.text().catch(() => '');
        throw new Error(`Upload échoué (${uploadResp.status}): ${errBody}`);
      }
      const uploadJson = await uploadResp.json() as { downloadTokens?: string };
      const dvwUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media&token=${uploadJson.downloadTokens ?? ''}`;
      setUploadProgress(80);

      // Réf. Storage (pour suppression future uniquement)
      ref(storage, objectPath);

      // Metadata Firestore
      await setDoc(doc(db, 'users', user.uid, 'matches', matchId), {
        id: matchId,
        seasonId: createdSeasonId,
        fileName: selectedFile.name,
        dvwUrl,
        isPublic: false,
        shareToken: null,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        // Les métadonnées détaillées (équipes, scores) seront remplies au parsing
        title: selectedFile.name.replace('.dvw', ''),
        teams: { home: '', away: '' },
        date: null,
        score: null,
      });

      // Incrémenter le compteur de la saison
      await setDoc(
        doc(db, 'users', user.uid, 'seasons', createdSeasonId),
        { matchCount: increment(1) },
        { merge: true },
      );

      handleFinish();
    } catch {
      setUploadError('Erreur lors de l\'upload. Réessayez.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleFinish = () => {
    completeOnboarding();
    onComplete();
  };

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--surface-root)' }}
    >
      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-1">
          <span className="text-primary-green">Volley</span>
          <span className="text-primary-blue">Vision</span>
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Bienvenue,{user?.displayName ? ` ${user.displayName.split(' ')[0]}` : ''} 👋
        </p>
      </div>

      {/* Card wizard */}
      <div
        className="w-full max-w-lg rounded-xl shadow-lg"
        style={{
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--surface-border)',
        }}
      >
        {/* Progress bar */}
        <div className="h-1 rounded-t-xl overflow-hidden" style={{ backgroundColor: 'var(--surface-3)' }}>
          <div
            className="h-full transition-all duration-500"
            style={{
              width: step === 1 ? '50%' : '100%',
              backgroundColor: 'var(--brand-green)',
            }}
          />
        </div>

        <div className="p-8">
          {/* Indicateur d'étapes */}
          <div className="flex items-center gap-2 mb-6">
            {([1, 2] as Step[]).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    backgroundColor: step >= s ? 'var(--brand-green)' : 'var(--surface-3)',
                    color: step >= s ? '#fff' : 'var(--text-disabled)',
                  }}
                >
                  {step > s ? '✓' : s}
                </div>
                {s < 2 && (
                  <div
                    className="w-12 h-px"
                    style={{ backgroundColor: step > s ? 'var(--brand-green)' : 'var(--surface-3)' }}
                  />
                )}
              </div>
            ))}
            <span className="ml-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              {step === 1 ? 'Créer une saison' : 'Importer un match'}
            </span>
          </div>

          {/* ── Étape 1 : Saison ── */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Créez votre première saison
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Les saisons regroupent vos matchs. Vous pourrez en créer d'autres plus tard.
                </p>
              </div>

              {seasonError && (
                <div
                  className="px-4 py-3 rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--state-error-bg)', color: 'var(--state-error)' }}
                >
                  {seasonError}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Nom de la saison
                </label>
                <input
                  type="text"
                  value={seasonName}
                  onChange={(e) => setSeasonName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateSeason()}
                  placeholder="Ex : Interpole, Pro A, U20 Elite…"
                  className="px-3 py-2.5 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--surface-3)',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Année
                </label>
                <div className="flex gap-2">
                  {YEAR_OPTIONS.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setSeasonYear(y)}
                      className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{
                        backgroundColor: seasonYear === y ? 'var(--brand-blue)' : 'var(--surface-3)',
                        color: seasonYear === y ? '#fff' : 'var(--text-secondary)',
                        border: seasonYear === y ? '1px solid var(--brand-blue)' : '1px solid var(--border-strong)',
                      }}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreateSeason}
                disabled={seasonLoading || !seasonName.trim()}
                className="mt-2 py-3 px-4 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--brand-green)', color: '#fff' }}
              >
                {seasonLoading ? 'Création…' : 'Créer la saison →'}
              </button>
            </div>
          )}

          {/* ── Étape 2 : Import DVW ── */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Importez votre premier match
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Glissez un fichier <code className="font-mono text-xs px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-3)' }}>.dvw</code> DataVolley ou passez cette étape.
                </p>
              </div>

              {uploadError && (
                <div
                  className="px-4 py-3 rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--state-error-bg)', color: 'var(--state-error)' }}
                >
                  {uploadError}
                </div>
              )}

              {/* Zone de drop */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 py-10 rounded-xl cursor-pointer transition-all"
                style={{
                  border: `2px dashed ${isDragging ? 'var(--brand-green)' : selectedFile ? 'var(--brand-blue)' : 'var(--border-strong)'}`,
                  backgroundColor: isDragging ? 'var(--brand-green-glow)' : selectedFile ? 'var(--brand-blue-muted)' : 'var(--surface-3)',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".dvw"
                  className="hidden"
                  onChange={handleInputChange}
                />
                {selectedFile ? (
                  <>
                    <span className="text-2xl">📂</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--brand-blue)' }}>
                      {selectedFile.name}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {(selectedFile.size / 1024).toFixed(0)} KB
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl">📥</span>
                    <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                      Glissez votre fichier <strong>.dvw</strong> ici<br />
                      <span style={{ color: 'var(--text-muted)' }}>ou cliquez pour parcourir</span>
                    </p>
                  </>
                )}
              </div>

              {/* Barre de progression */}
              {uploadLoading && (
                <div>
                  <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    <span>Upload en cours…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-3)' }}>
                    <div
                      className="h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%`, backgroundColor: 'var(--brand-green)' }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={uploadLoading}
                  className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--surface-3)',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Passer cette étape
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadLoading}
                  className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--brand-green)', color: '#fff' }}
                >
                  {uploadLoading ? `Upload… ${uploadProgress}%` : 'Importer →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
