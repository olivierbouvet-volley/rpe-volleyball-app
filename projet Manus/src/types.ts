export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | 'unknown';

export interface Player {
  id: string;
  name: string;
  cyclePhase: CyclePhase;
  cycleDay: number;
  readinessScore: number; // 0-100 (Forme physique)
  energy: number; // 1-10
  mood?: number; // 1-10 (humeur du jour)
  wellnessScore: number; // 0-100 (Score global calculé)
  hasSPM: boolean; // Présence de symptômes pré-menstruels
  symptoms: Array<{ name: string; intensity: number }>;
  status?: 'optimal' | 'attention' | 'critical'; // Statut de la joueuse
  hasCheckin?: boolean; // A fait son check-in aujourd'hui
}

export type GroupType = 'wonder_woman' | 'bad_girl' | 'recovery';

// --- NOUVEAUX TYPES GANTT / TIMELINE FLUIDE ---

export interface SequenceBlock {
  id: string;
  title: string; // "Atelier Service", "Muscu", "Match"
  startTime: string; // "10:00"
  endTime: string;   // "10:20"
  playerIds: string[]; // Joueuses assignées
  notes: string;
  media?: {
    id: string;
    url: string;
    type: 'image' | 'video';
    notes?: string; // Note spécifique pour ce média
  }[];
  color?: string; // Pour différencier visuellement les blocs
}

// --- FIN NOUVEAUX TYPES ---

export interface SessionGroup {
  id: string;
  name: string;
  type: 'training' | 'gym' | 'recovery' | 'other';
  players: Player[];
  notes: string;
  imageUrl?: string;
}

export interface TrainingSession {
  id: string;
  date: Date;
  groups: SessionGroup[];
}

// Interface pour le résultat de la prédiction
export interface GroupPrediction {
  group: GroupType;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
}

// Interface pour les événements du calendrier
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'training' | 'gym' | 'match' | 'other';
}

export const GROUPS = {
  wonder_woman: {
    id: 'wonder_woman',
    name: 'Wonder Woman',
    icon: '⚡',
    color: 'text-amber-400 border-amber-500/50 bg-amber-500/10',
    description: 'Fenêtre d\'opportunité : Intensité & Puissance'
  },
  bad_girl: {
    id: 'bad_girl',
    name: 'Bad Girl',
    icon: '🛡️',
    color: 'text-violet-400 border-violet-500/50 bg-violet-500/10',
    description: 'Phase d\'adaptation : Technique & Endurance'
  },
  recovery: {
    id: 'recovery',
    name: 'Récupération',
    icon: '🌸',
    color: 'text-pink-400 border-pink-500/50 bg-pink-500/10',
    description: 'Régénération : Mobilité & Repos'
  }
} as const;
