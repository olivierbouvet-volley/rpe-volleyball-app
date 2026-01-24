/**
 * Service pour charger les joueuses depuis Firebase
 */

import type { Player, CyclePhase } from '../types';
import { calculateWellnessScore } from '../utils/prediction';

// Configuration Firebase (sera chargée depuis l'environnement ou le parent)
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCWmypBYOHLKPy2zJcsGBV7vI8sHWiS-2w",
  authDomain: "rpe-gen2-eeaee.firebaseapp.com",
  projectId: "rpe-gen2-eeaee",
  storageBucket: "rpe-gen2-eeaee.firebasestorage.app",
  messagingSenderId: "987876565426",
  appId: "1:987876565426:web:c68a7c1f4f3f0db5a5e3e8"
};

let db: any = null;
let isInitialized = false;

/**
 * Initialise Firebase si pas déjà fait
 */
async function initFirebase(): Promise<void> {
  if (isInitialized) return;

  // Vérifier si Firebase est déjà chargé (depuis le parent ou globalement)
  if (typeof window !== 'undefined' && (window as any).firebase) {
    const firebase = (window as any).firebase;
    
    // Vérifier si l'app existe déjà, sinon l'initialiser
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    
    db = firebase.firestore();
    isInitialized = true;
    console.log('✅ Firebase initialisé depuis le contexte global');
    return;
  }

  // Sinon, charger dynamiquement les scripts Firebase
  try {
    await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js');
    
    const firebase = (window as any).firebase;
    
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    
    db = firebase.firestore();
    isInitialized = true;
    console.log('✅ Firebase chargé et initialisé dynamiquement');
  } catch (error) {
    console.error('❌ Erreur lors du chargement de Firebase:', error);
    throw error;
  }
}

/**
 * Charge un script dynamiquement
 */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Vérifier si le script est déjà chargé
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Impossible de charger ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Convertit les données Firestore en objet Player
 */
function mapFirestoreToPlayer(doc: any): Player {
  const data = doc.data ? doc.data() : doc;
  const id = doc.id || data.id || Math.random().toString();

  // Mapper cyclePhase
  let cyclePhase: CyclePhase = 'follicular';
  if (data.cyclePhase) {
    const phase = data.cyclePhase.toLowerCase();
    if (phase === 'menstrual' || phase === 'règles' || phase === 'menstruation') {
      cyclePhase = 'menstrual';
    } else if (phase === 'follicular' || phase === 'folliculaire') {
      cyclePhase = 'follicular';
    } else if (phase === 'ovulatory' || phase === 'ovulation') {
      cyclePhase = 'ovulatory';
    } else if (phase === 'luteal' || phase === 'lutéale') {
      cyclePhase = 'luteal';
    }
  }

  // Calculer readinessScore si non présent
  let readinessScore = data.readinessScore || 70;
  if (!data.readinessScore && data.lastRPE) {
    // RPE faible = bonne readiness
    readinessScore = Math.max(0, 100 - (data.lastRPE * 8));
  }

  // Calculer energy si non présent
  let energy = data.energy || 7;
  if (!data.energy && data.fatigue) {
    energy = Math.max(1, 10 - data.fatigue);
  }

  const player: Player = {
    id,
    name: data.name || data.displayName || data.email?.split('@')[0] || 'Joueuse',
    cyclePhase,
    cycleDay: data.cycleDay || Math.floor(Math.random() * 28) + 1,
    readinessScore,
    energy,
    hasSPM: data.hasSPM || data.spm || false,
    symptoms: data.symptoms || [],
    wellnessScore: 0 // Sera calculé
  };

  // Calculer le wellness score
  player.wellnessScore = calculateWellnessScore(player);

  return player;
}

/**
 * Charge toutes les joueuses depuis Firebase
 */
export async function loadPlayersFromFirebase(): Promise<Player[]> {
  try {
    await initFirebase();

    if (!db) {
      throw new Error('Base de données non initialisée');
    }

    console.log('🔄 Chargement des joueuses depuis Firebase...');
    
    const snapshot = await db.collection('players').get();
    const players: Player[] = [];

    snapshot.forEach((doc: any) => {
      const data = doc.data();
      // Filtrer les coachs
      if (data.role !== 'coach') {
        const player = mapFirestoreToPlayer({ id: doc.id, data: () => data });
        players.push(player);
      }
    });

    // Trier par readinessScore décroissant
    players.sort((a, b) => b.readinessScore - a.readinessScore);

    console.log(`✅ ${players.length} joueuses chargées depuis Firebase`);
    return players;

  } catch (error) {
    console.error('❌ Erreur lors du chargement des joueuses:', error);
    throw error;
  }
}

/**
 * Écoute les changements en temps réel des joueuses
 */
export function subscribeToPlayers(callback: (players: Player[]) => void): () => void {
  let unsubscribe: (() => void) | null = null;

  initFirebase().then(() => {
    if (!db) return;

    unsubscribe = db.collection('players').onSnapshot((snapshot: any) => {
      const players: Player[] = [];
      
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        if (data.role !== 'coach') {
          const player = mapFirestoreToPlayer({ id: doc.id, data: () => data });
          players.push(player);
        }
      });

      players.sort((a, b) => b.readinessScore - a.readinessScore);
      callback(players);
    });
  });

  // Retourner une fonction de cleanup
  return () => {
    if (unsubscribe) {
      unsubscribe();
    }
  };
}

/**
 * Vérifie si Firebase est disponible et configuré
 */
export function isFirebaseAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window as any).firebase;
}

/**
 * Récupère les données d'une joueuse spécifique
 */
export async function getPlayerById(playerId: string): Promise<Player | null> {
  try {
    await initFirebase();

    if (!db) return null;

    const doc = await db.collection('players').doc(playerId).get();
    
    if (!doc.exists) return null;

    return mapFirestoreToPlayer({ id: doc.id, data: () => doc.data() });
  } catch (error) {
    console.error('Erreur lors de la récupération du joueur:', error);
    return null;
  }
}
