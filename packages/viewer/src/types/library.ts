/**
 * @file library.ts
 * @description Types partagés pour la bibliothèque de matchs VolleyVision
 */

import type { Timestamp } from 'firebase/firestore';

export interface Season {
  id: string;
  name: string;
  year: number;
  label: string;          // "Interpole 2026"
  matchCount: number;
  createdAt: Timestamp | null;
  ownerId: string;
}

export interface MatchMeta {
  id: string;
  seasonId: string;
  fileName: string;
  dvwUrl: string;         // Firebase Storage download URL
  /** URL YouTube ou vide pour fichier local (persisté en Firestore) */
  videoUrl?: string;
  /** Décalage de synchronisation vidéo en secondes (persisté en Firestore) */
  videoOffset?: number;
  isPublic: boolean;
  shareToken: string | null;
  ownerId: string;
  createdAt: Timestamp | null;
  // Métadonnées extraites au parsing DVW
  title: string;
  teams: { home: string; away: string };
  date: string | null;    // ISO date
  score: { home: number; away: number } | null;
  setScores: Array<{ home: number; away: number }>;
}

export const DVW_QUOTA = 100;
