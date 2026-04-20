/**
 * @file matchLibraryStore.ts
 * @description Bibliothèque de matchs — Firestore + Firebase Storage
 * Remplace le matchStore single-slot pour la gestion multi-matchs
 *
 * Structure Firestore :
 *   users/{uid}/seasons/{seasonId}
 *   users/{uid}/matches/{matchId}
 */

import { create } from 'zustand';
import {
  collection, doc, setDoc, getDoc, getDocs,
  deleteDoc, serverTimestamp, increment, query,
  orderBy, updateDoc,
} from 'firebase/firestore';
import { ref, getDownloadURL, deleteObject } from 'firebase/storage';
import { parseDVW, calculatePlayerStats } from '@volleyvision/dvw-parser';
import type { Match } from '@volleyvision/data-model';
import { db, storage, auth } from '../firebase';
import { useMatchStore } from './matchStore';
import { useCumulativeStatsStore } from './cumulativeStatsStore';
import { useGamePlanStore } from './gamePlanStore';
import { useVideoStore } from './videoStore';
import type { Season, MatchMeta } from '../types/library';
import { DVW_QUOTA } from '../types/library';

// ─── Helper : lecture DVW ───────────────────────────────────────────────────

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Impossible de lire le fichier'));
    reader.readAsText(file, 'utf-8');
  });
}

async function fetchDVWFromUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Téléchargement échoué (${res.status})`);
  return res.text();
}

// ─── State ──────────────────────────────────────────────────────────────────

interface MatchLibraryState {
  seasons: Season[];
  matches: MatchMeta[];          // matchs de la saison active
  totalMatchCount: number;       // total toutes saisons confondues (quota)
  activeSeasonId: string | null;
  /** Match actuellement ouvert en analyse (pour sauvegarder l'URL vidéo / l'offset) */
  currentMatchId: string | null;
  currentMatchOwnerId: string | null;
  selectedMatchIds: string[];    // pour analyse multi-matchs
  isLoadingSeasons: boolean;
  isLoadingMatches: boolean;
  isImporting: boolean;
  importProgress: number;        // 0–100
  error: string | null;

  // ── Chargement ──
  loadSeasons: (uid: string) => Promise<void>;
  loadMatches: (uid: string, seasonId: string) => Promise<void>;
  loadTotalCount: (uid: string) => Promise<void>;
  setActiveSeason: (seasonId: string, uid: string) => void;

  // ── Import / Suppression ──
  addMatch: (uid: string, file: File, seasonId: string) => Promise<string | null>;
  deleteMatch: (uid: string, match: MatchMeta) => Promise<void>;
  addSeason: (uid: string, name: string, year: number) => Promise<string>;
  deleteSeason: (uid: string, seasonId: string) => Promise<void>;

  // ── Sélection ──
  toggleMatchSelection: (matchId: string) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // ── Navigation vers analyse ──
  openMatchForAnalysis: (match: MatchMeta) => Promise<void>;
  openMultipleForAnalysis: (matches: MatchMeta[]) => Promise<void>;
  /** Sauvegarde (ou efface) l'URL vidéo YouTube associée à un match */
  saveMatchVideoUrl: (uid: string, matchId: string, videoUrl: string) => Promise<void>;
  /** Sauvegarde l'offset de synchronisation vidéo associé à un match */
  saveMatchVideoOffset: (uid: string, matchId: string, offset: number) => Promise<void>;

  shareMatch: (uid: string, ownerEmail: string, matchId: string) => Promise<string>;
  revokeShare: (uid: string, match: MatchMeta) => Promise<void>;
  clearError: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useMatchLibraryStore = create<MatchLibraryState>()((set, get) => ({
  seasons: [],
  matches: [],
  totalMatchCount: 0,
  activeSeasonId: null,
  currentMatchId: null,
  currentMatchOwnerId: null,
  selectedMatchIds: [],
  isLoadingSeasons: false,
  isLoadingMatches: false,
  isImporting: false,
  importProgress: 0,
  error: null,

  // ─── Chargement des saisons ────────────────────────────────────────────────
  loadSeasons: async (uid) => {
    set({ isLoadingSeasons: true, error: null });
    try {
      const snap = await getDocs(
        query(collection(db, 'users', uid, 'seasons'), orderBy('createdAt', 'desc')),
      );
      const seasons = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Season));
      set({ seasons, isLoadingSeasons: false });

      // Charger auto la première saison
      if (seasons.length > 0 && !get().activeSeasonId) {
        get().setActiveSeason(seasons[0].id, uid);
      }
    } catch (err) {
      set({ error: 'Erreur lors du chargement des saisons.', isLoadingSeasons: false });
      console.error('[matchLibraryStore] loadSeasons:', err);
    }
  },

  // ─── Chargement des matchs d'une saison ───────────────────────────────────
  loadMatches: async (uid, seasonId) => {
    set({ isLoadingMatches: true, error: null });
    try {
      const snap = await getDocs(
        query(
          collection(db, 'users', uid, 'matches'),
          orderBy('createdAt', 'desc'),
        ),
      );
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MatchMeta));
      const matches = all.filter((m) => m.seasonId === seasonId);
      set({ matches, isLoadingMatches: false });
    } catch (err) {
      set({ error: 'Erreur lors du chargement des matchs.', isLoadingMatches: false });
      console.error('[matchLibraryStore] loadMatches:', err);
    }
  },

  // ─── Comptage total (quota) ────────────────────────────────────────────────
  loadTotalCount: async (uid) => {
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'matches'));
      set({ totalMatchCount: snap.size });
    } catch (err) {
      console.error('[matchLibraryStore] loadTotalCount:', err);
    }
  },

  // ─── Changer de saison ────────────────────────────────────────────────────
  setActiveSeason: (seasonId, uid) => {
    set({ activeSeasonId: seasonId, selectedMatchIds: [] });
    get().loadMatches(uid, seasonId);
  },

  // ─── Import DVW ──────────────────────────────────────────────────────────
  addMatch: async (uid, file, seasonId) => {
    const { totalMatchCount } = get();
    if (totalMatchCount >= DVW_QUOTA) {
      set({ error: `Quota atteint (${DVW_QUOTA} matchs maximum).` });
      return null;
    }
    if (!file.name.toLowerCase().endsWith('.dvw')) {
      set({ error: 'Seuls les fichiers .dvw sont acceptés.' });
      return null;
    }

    set({ isImporting: true, importProgress: 0, error: null });
    try {
      const matchId = `match-${Date.now()}-${crypto.randomUUID().split('-')[0]}`;
      const objectPath = `users/${uid}/dvw/${matchId}.dvw`;
      const bucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string;

      // ① Upload via REST API Firebase Storage
      // On n'utilise PAS le SDK pour éviter le header x-goog-if-generation-match:0
      // qui cause des 412 quand le réseau retente une requête déjà reçue par le serveur
      set({ importProgress: 20 });
      const token = await auth.currentUser!.getIdToken();
      set({ importProgress: 40 });

      const uploadResp = await fetch(
        `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodeURIComponent(objectPath)}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Firebase ${token}`,
            'Content-Type': 'application/octet-stream',
          },
          body: await file.arrayBuffer(),
        }
      );
      if (!uploadResp.ok) {
        const errBody = await uploadResp.text().catch(() => '');
        throw new Error(`Storage upload échoué (${uploadResp.status}): ${errBody}`);
      }
      const uploadJson = await uploadResp.json() as { downloadTokens?: string };
      const dvwUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media&token=${uploadJson.downloadTokens ?? ''}`;
      set({ importProgress: 85 });

      // Réf. Storage pour la suppression ulterieure
      const storageRef = ref(storage, objectPath);

      // ② Parser le DVW pour extraire les métadonnées
      let parsedMeta: Partial<MatchMeta> = {
        title: file.name.replace(/\.dvw$/i, ''),
        teams: { home: '', away: '' },
        date: null,
        score: null,
        setScores: [],
      };
      try {
        const content = await readFileAsText(file);
        const match = parseDVW(content);
        parsedMeta = {
          title: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
          teams: { home: match.homeTeam.name, away: match.awayTeam.name },
          date: match.date,
          score: { home: match.result.homeWins, away: match.result.awayWins },
          setScores: match.sets.map((s) => ({
            home: s.homeScore ?? 0,
            away: s.awayScore ?? 0,
          })),
        };
      } catch {
        // Parsing optionnel — on garde les métadonnées minimales
      }
      set({ importProgress: 90 });

      // ③ Écrire les métadonnées dans Firestore
      const matchDoc: MatchMeta = {
        id: matchId,
        seasonId,
        fileName: file.name,
        dvwUrl,
        isPublic: false,
        shareToken: null,
        ownerId: uid,
        createdAt: null, // serverTimestamp() ci-dessous
        ...parsedMeta,
      } as MatchMeta;

      await setDoc(doc(db, 'users', uid, 'matches', matchId), {
        ...matchDoc,
        createdAt: serverTimestamp(),
      });

      // ④ Incrémenter le compteur de la saison
      await updateDoc(doc(db, 'users', uid, 'seasons', seasonId), {
        matchCount: increment(1),
      });

      set({ importProgress: 100 });

      // ⑤ Mettre à jour le state local
      set((state) => ({
        matches: [matchDoc, ...state.matches],
        totalMatchCount: state.totalMatchCount + 1,
        seasons: state.seasons.map((s) =>
          s.id === seasonId ? { ...s, matchCount: s.matchCount + 1 } : s,
        ),
        isImporting: false,
        importProgress: 0,
      }));

      return matchId;
    } catch (err) {
      set({ error: 'Erreur lors de l\'import. Réessayez.', isImporting: false, importProgress: 0 });
      console.error('[matchLibraryStore] addMatch:', err);
      return null;
    }
  },

  // ─── Suppression d'un match ───────────────────────────────────────────────
  deleteMatch: async (uid, match) => {
    set({ error: null });
    try {
      // Supprimer le fichier DVW du Storage
      try {
        const fileRef = ref(storage, `users/${uid}/dvw/${match.id}.dvw`);
        await deleteObject(fileRef);
      } catch {
        // Le fichier peut déjà ne plus exister — pas bloquant
      }

      // Supprimer le doc Firestore
      await deleteDoc(doc(db, 'users', uid, 'matches', match.id));

      // Décrémenter le compteur de la saison
      await updateDoc(doc(db, 'users', uid, 'seasons', match.seasonId), {
        matchCount: increment(-1),
      });

      // Mettre à jour le state local
      set((state) => ({
        matches: state.matches.filter((m) => m.id !== match.id),
        totalMatchCount: Math.max(0, state.totalMatchCount - 1),
        selectedMatchIds: state.selectedMatchIds.filter((id) => id !== match.id),
        seasons: state.seasons.map((s) =>
          s.id === match.seasonId ? { ...s, matchCount: Math.max(0, s.matchCount - 1) } : s,
        ),
      }));
    } catch (err) {
      set({ error: 'Erreur lors de la suppression.' });
      console.error('[matchLibraryStore] deleteMatch:', err);
    }
  },

  // ─── Ajout d'une saison ───────────────────────────────────────────────────
  addSeason: async (uid, name, year) => {
    const seasonId = `season-${Date.now()}`;
    const season: Omit<Season, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
      id: seasonId,
      name: name.trim(),
      year,
      label: `${name.trim()} ${year}`,
      matchCount: 0,
      ownerId: uid,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', uid, 'seasons', seasonId), season);
    set((state) => ({
      seasons: [{ ...season, createdAt: null }, ...state.seasons],
    }));
    return seasonId;
  },

  // ─── Suppression d'une saison (et ses matchs) ────────────────────────────
  deleteSeason: async (uid, seasonId) => {
    // Supprimer tous les matchs de la saison
    const { matches } = get();
    const seasonMatches = matches.filter((m) => m.seasonId === seasonId);
    for (const m of seasonMatches) {
      await get().deleteMatch(uid, m);
    }
    await deleteDoc(doc(db, 'users', uid, 'seasons', seasonId));
    set((state) => ({
      seasons: state.seasons.filter((s) => s.id !== seasonId),
      activeSeasonId: state.activeSeasonId === seasonId ? null : state.activeSeasonId,
    }));
  },

  // ─── Sélection ────────────────────────────────────────────────────────────
  toggleMatchSelection: (matchId) => {
    set((state) => ({
      selectedMatchIds: state.selectedMatchIds.includes(matchId)
        ? state.selectedMatchIds.filter((id) => id !== matchId)
        : [...state.selectedMatchIds, matchId],
    }));
  },

  clearSelection: () => set({ selectedMatchIds: [] }),

  selectAll: () => set((state) => ({
    selectedMatchIds: state.matches.map((m) => m.id),
  })),

  // ─── Ouvrir un match dans l'AnalysisPage ─────────────────────────────────
  openMatchForAnalysis: async (matchMeta) => {
    useCumulativeStatsStore.getState().clear();
    useGamePlanStore.getState().clear();
    set({ error: null, currentMatchId: matchMeta.id, currentMatchOwnerId: matchMeta.ownerId });
    try {
      const content = await fetchDVWFromUrl(matchMeta.dvwUrl);
      const match = parseDVW(content);
      useMatchStore.getState().setMatch(match);
      // Restaurer l'URL vidéo YouTube associée au match si présente
      if (matchMeta.videoUrl) {
        useVideoStore.getState().setYoutubeUrl(matchMeta.videoUrl);
      }
      // Restaurer l'offset de synchronisation si présent
      if (matchMeta.videoOffset !== undefined) {
        useVideoStore.getState().setOffset(matchMeta.videoOffset);
      }
    } catch (err) {
      set({ error: 'Impossible de charger ce match. Réessayez.' });
      console.error('[matchLibraryStore] openMatchForAnalysis:', err);
    }
  },

  // ─── Ouvrir N matchs pour analyse cumulative ─────────────────────────────
  openMultipleForAnalysis: async (matchMetas) => {
    if (matchMetas.length === 0) return;
    if (matchMetas.length === 1) {
      return get().openMatchForAnalysis(matchMetas[0]);
    }
    set({ error: null });
    try {
      const parsed: Match[] = [];
      for (const meta of matchMetas) {
        const content = await fetchDVWFromUrl(meta.dvwUrl);
        parsed.push(parseDVW(content));
      }

      // Charger le premier match dans matchStore (pour l'UI principal)
      useMatchStore.getState().setMatch(parsed[0]);

      // Agréger toutes les stats dans cumulativeStatsStore
      const statsPerMatch = parsed.map((m) => calculatePlayerStats(m));
      useCumulativeStatsStore.getState().compute(
        statsPerMatch,
        matchMetas.map((m) => m.title),
        parsed,
      );

      // Charger tous les matchs dans gamePlanStore pour le Plan de Match multi-matchs
      useGamePlanStore.getState().setMatches(
        parsed,
        matchMetas.map((m) => m.title),
      );
    } catch (err) {
      set({ error: 'Erreur lors du chargement des matchs.' });
      console.error('[matchLibraryStore] openMultipleForAnalysis:', err);
    }
  },

  // ─── Sauvegarder l'URL vidéo YouTube d'un match ────────────────────
  saveMatchVideoUrl: async (uid, matchId, videoUrl) => {
    try {
      await updateDoc(doc(db, 'users', uid, 'matches', matchId), { videoUrl });
      set((state) => ({
        matches: state.matches.map((m) =>
          m.id === matchId ? { ...m, videoUrl } : m,
        ),
      }));
    } catch (err) {
      console.error('[matchLibraryStore] saveMatchVideoUrl:', err);
    }
  },

  // ─── Sauvegarder l'offset de synchronisation d'un match ────────────
  saveMatchVideoOffset: async (uid, matchId, offset) => {
    try {
      await updateDoc(doc(db, 'users', uid, 'matches', matchId), { videoOffset: offset });
      set((state) => ({
        matches: state.matches.map((m) =>
          m.id === matchId ? { ...m, videoOffset: offset } : m,
        ),
      }));
    } catch (err) {
      console.error('[matchLibraryStore] saveMatchVideoOffset:', err);
    }
  },

  // ─── Partager un match (génère un lien public) ────────────────────────────
  shareMatch: async (uid, ownerEmail, matchId) => {
    const token = crypto.randomUUID();
    const shareUrl = `${window.location.origin}${window.location.pathname}?shareMatch=${token}`;

    const match = get().matches.find((m) => m.id === matchId);
    if (!match) throw new Error('Match non trouvé');

    // Mettre à jour le doc utilisateur
    await updateDoc(doc(db, 'users', uid, 'matches', matchId), {
      isPublic: true,
      shareToken: token,
    });

    // Écrire dans la collection publique
    await setDoc(doc(db, 'publicShares', token), {
      matchMeta: { ...match, isPublic: true, shareToken: token },
      ownerId: uid,
      ownerEmail,
      createdAt: serverTimestamp(),
    });

    // Mettre à jour le state local
    set((state) => ({
      matches: state.matches.map((m) =>
        m.id === matchId ? { ...m, isPublic: true, shareToken: token } : m,
      ),
    }));

    return shareUrl;
  },

  // ─── Révoquer un partage ──────────────────────────────────────────────────
  revokeShare: async (uid, match) => {
    if (!match.shareToken) return;

    try {
      await deleteDoc(doc(db, 'publicShares', match.shareToken));
    } catch {
      // Document déjà supprimé — pas bloquant
    }

    await updateDoc(doc(db, 'users', uid, 'matches', match.id), {
      isPublic: false,
      shareToken: null,
    });

    set((state) => ({
      matches: state.matches.map((m) =>
        m.id === match.id ? { ...m, isPublic: false, shareToken: null } : m,
      ),
    }));
  },

  clearError: () => set({ error: null }),
}));

// Debug
if (typeof window !== 'undefined') {
  (window as any).matchLibraryStore = useMatchLibraryStore;
}
