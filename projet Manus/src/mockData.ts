import type { Player, CalendarEvent } from './types';
import { addDays, setHours, startOfWeek } from 'date-fns';
import { calculateWellnessScore } from './utils/prediction';

const today = new Date();
const weekStart = startOfWeek(today, { weekStartsOn: 1 });

const createPlayer = (data: Partial<Player>): Player => {
  const player = {
    id: data.id || Math.random().toString(),
    name: data.name || 'Joueuse',
    cyclePhase: data.cyclePhase || 'follicular',
    cycleDay: data.cycleDay || 1,
    readinessScore: data.readinessScore || 70,
    mood: data.mood || 7,
    energy: data.energy || 7,
    hasSPM: data.hasSPM || false,
    symptoms: data.symptoms || [],
    wellnessScore: 0 // Sera calculé juste après
  } as Player;
  
  player.wellnessScore = calculateWellnessScore(player);
  return player;
};

export const MOCK_PLAYERS: Player[] = [
  createPlayer({
    id: '1',
    name: 'Julia Prou',
    cyclePhase: 'follicular',
    cycleDay: 8,
    readinessScore: 85,
    mood: 9,
    energy: 8,
    hasSPM: false
  }),
  createPlayer({
    id: '2',
    name: 'Léa Gueguen',
    cyclePhase: 'luteal',
    cycleDay: 22,
    readinessScore: 65,
    mood: 6,
    energy: 5,
    hasSPM: false,
    symptoms: [{ name: 'fatigue', intensity: 4 }]
  }),
  createPlayer({
    id: '3',
    name: 'Eline Chevrollier',
    cyclePhase: 'menstrual',
    cycleDay: 2,
    readinessScore: 45,
    mood: 4,
    energy: 3,
    hasSPM: true,
    symptoms: [
      { name: 'cramps', intensity: 6 },
      { name: 'headache', intensity: 5 }
    ]
  }),
  createPlayer({
    id: '4',
    name: 'Chloé Le Falher',
    cyclePhase: 'ovulatory',
    cycleDay: 14,
    readinessScore: 92,
    mood: 10,
    energy: 9,
    hasSPM: false
  }),
  createPlayer({
    id: '5',
    name: 'Nine Wester',
    cyclePhase: 'luteal',
    cycleDay: 26,
    readinessScore: 55,
    mood: 5,
    energy: 4,
    hasSPM: true,
    symptoms: [
      { name: 'bloating', intensity: 5 },
      { name: 'irritability', intensity: 6 }
    ]
  }),
  createPlayer({
    id: '6',
    name: 'Cyrielle Koffi',
    cyclePhase: 'follicular',
    cycleDay: 10,
    readinessScore: 78,
    mood: 8,
    energy: 7,
    hasSPM: false
  }),
  createPlayer({
    id: '7',
    name: 'Rose Lecrivain',
    cyclePhase: 'menstrual',
    cycleDay: 4,
    readinessScore: 60,
    mood: 7,
    energy: 6,
    hasSPM: false
  }),
  createPlayer({
    id: '8',
    name: 'Lovely Durimel',
    cyclePhase: 'ovulatory',
    cycleDay: 15,
    readinessScore: 88,
    mood: 9,
    energy: 8,
    hasSPM: false
  })
];

export const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: '1',
    title: '🏐 Entraînement Volley',
    start: setHours(addDays(weekStart, 0), 10), // Lundi 10h
    end: setHours(addDays(weekStart, 0), 12),
    type: 'training'
  },
  {
    id: '2',
    title: '🏋️ Musculation',
    start: setHours(addDays(weekStart, 1), 14), // Mardi 14h
    end: setHours(addDays(weekStart, 1), 16),
    type: 'gym'
  },
  {
    id: '3',
    title: '🏐 Entraînement Volley',
    start: setHours(addDays(weekStart, 2), 10), // Mercredi 10h
    end: setHours(addDays(weekStart, 2), 12),
    type: 'training'
  },
  {
    id: '4',
    title: '🏋️ Musculation',
    start: setHours(addDays(weekStart, 3), 14), // Jeudi 14h
    end: setHours(addDays(weekStart, 3), 16),
    type: 'gym'
  },
  {
    id: '5',
    title: '🏆 Match',
    start: setHours(addDays(weekStart, 5), 15), // Samedi 15h
    end: setHours(addDays(weekStart, 5), 18),
    type: 'match'
  }
];
