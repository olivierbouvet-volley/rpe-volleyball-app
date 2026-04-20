/**
 * @file ShareMatchView.tsx
 * @description Vue publique d'un match partagé — accessible sans authentification
 * Lit publicShares/{token} dans Firestore, télécharge le DVW, affiche l'analyse
 *
 * URL : ?shareMatch=<token>
 */

import { useEffect, useState } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { parseDVW } from '@volleyvision/dvw-parser';
import { db } from '../firebase';
import { useMatchStore } from '../store/matchStore';
import AnalysisPage from './AnalysisPage';
import type { MatchMeta } from '../types/library';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PublicShareDoc {
  matchMeta: MatchMeta;
  ownerId: string;
  ownerEmail: string;
}

type LoadStatus = 'loading' | 'loaded' | 'not-found' | 'error';

// ─── Écrans d'état ───────────────────────────────────────────────────────────

function FullscreenState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4 p-6"
      style={{ backgroundColor: 'var(--surface-root)', color: 'var(--text-primary)' }}
    >
      <span className="text-5xl">{icon}</span>
      <h1 className="text-xl font-bold text-center">{title}</h1>
      {subtitle && (
        <p className="text-sm text-center max-w-sm" style={{ color: 'var(--text-muted)' }}>
          {subtitle}
        </p>
      )}
      {action}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface ShareMatchViewProps {
  token: string;
}

export function ShareMatchView({ token }: ShareMatchViewProps) {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [shareData, setShareData] = useState<PublicShareDoc | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // ① Lire le document public dans Firestore
        const snap = await getDoc(doc(db, 'publicShares', token));
        if (cancelled) return;

        if (!snap.exists()) {
          setStatus('not-found');
          return;
        }

        const data = snap.data() as PublicShareDoc;

        // ② Télécharger le fichier DVW depuis Storage
        const res = await fetch(data.matchMeta.dvwUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const content = await res.text();
        if (cancelled) return;

        // ③ Parser et charger dans le matchStore
        const match = parseDVW(content);
        useMatchStore.getState().setMatch(match);

        setShareData(data);
        setStatus('loaded');
      } catch (err) {
        if (!cancelled) setStatus('error');
        console.error('[ShareMatchView] Erreur de chargement :', err);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [token]);

  // ── États de chargement / erreur ──────────────────────────────────────────

  if (status === 'loading') {
    return (
      <FullscreenState
        icon="🏐"
        title="Chargement du match…"
        subtitle="Récupération du fichier DVW depuis le cloud"
        action={
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--brand-green)', borderTopColor: 'transparent' }}
          />
        }
      />
    );
  }

  if (status === 'not-found') {
    return (
      <FullscreenState
        icon="🔗"
        title="Lien expiré ou invalide"
        subtitle="Ce match n'est plus partagé ou le lien a été révoqué."
        action={
          <a
            href="/"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: 'var(--brand-green)', color: '#fff' }}
          >
            Ouvrir VolleyVision
          </a>
        }
      />
    );
  }

  if (status === 'error') {
    return (
      <FullscreenState
        icon="⚠️"
        title="Erreur de chargement"
        subtitle="Impossible de charger ce match. Vérifiez votre connexion."
        action={
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl text-sm font-medium"
            style={{
              backgroundColor: 'var(--surface-3)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          >
            Réessayer
          </button>
        }
      />
    );
  }

  // ── Vue principale (loaded) ───────────────────────────────────────────────

  const { matchMeta, ownerEmail } = shareData!;
  const matchTitle = matchMeta.title
    || (matchMeta.teams.home && matchMeta.teams.away
      ? `${matchMeta.teams.home} vs ${matchMeta.teams.away}`
      : matchMeta.fileName);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--surface-root)' }}>
      {/* ── Bannière "match partagé" (sticky) ── */}
      <div
        className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 gap-4"
        style={{
          backgroundColor: 'var(--surface-2)',
          borderBottom: `2px solid var(--brand-blue)`,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Info match */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl shrink-0">🔗</span>
          <div className="min-w-0">
            <p
              className="text-sm font-semibold truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {matchTitle}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Match partagé par{' '}
              <span style={{ color: 'var(--brand-blue)' }}>{ownerEmail}</span>
              {matchMeta.date && (
                <> · {new Date(matchMeta.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</>
              )}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Télécharger le DVW */}
          <a
            href={matchMeta.dvwUrl}
            download={matchMeta.fileName}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: 'var(--surface-3)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-secondary)',
            }}
          >
            📥 <span className="hidden sm:inline">Télécharger</span> DVW
          </a>

          {/* CTA inscription */}
          <a
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ backgroundColor: 'var(--brand-green)', color: '#fff' }}
          >
            <span className="hidden sm:inline">Ouvrir</span> VolleyVision →
          </a>
        </div>
      </div>

      {/* ── Analyse complète ── */}
      <AnalysisPage />
    </div>
  );
}

export default ShareMatchView;
