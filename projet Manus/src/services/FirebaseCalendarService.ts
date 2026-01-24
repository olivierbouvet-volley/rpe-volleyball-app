/**
 * Service pour sauvegarder et charger l'agenda et les séquences d'entraînement depuis Firebase
 */

import type { CalendarEvent, SequenceBlock } from '../types';

interface ScheduleData {
  date: string; // Format ISO date (YYYY-MM-DD)
  events: CalendarEvent[];
  sequences?: SequenceBlock[];
  lastModified: Date;
}

let db: any = null;

/**
 * Initialise Firebase si pas déjà fait
 */
async function initFirebase(): Promise<void> {
  if (db) {
    console.log('🔄 Firebase déjà initialisé');
    return; // Déjà initialisé
  }

  // Vérifier si Firebase est déjà chargé (depuis le parent ou globalement)
  if (typeof window !== 'undefined' && (window as any).firebase) {
    const firebase = (window as any).firebase;
    console.log('🔍 Firebase détecté:', {
      exists: !!firebase,
      apps: firebase.apps?.length,
      firestore: typeof firebase.firestore
    });
    
    // Utiliser la connexion existante
    if (firebase.apps && firebase.apps.length > 0) {
      db = firebase.firestore();
      console.log('✅ Firebase Calendar Service initialisé depuis le contexte global');
      return;
    }
  }

  console.error('❌ Firebase non disponible dans window');
  throw new Error('Firebase non disponible. Assurez-vous que Firebase est initialisé dans l\'application parent.');
}

/**
 * Convertit une date en clé de format YYYY-MM-DD
 */
function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Sauvegarde les événements et séquences d'un jour spécifique
 */
export async function saveScheduleForDate(
  userId: string,
  date: Date,
  events: CalendarEvent[],
  sequences?: SequenceBlock[]
): Promise<void> {
  console.log(`💾 Tentative sauvegarde pour ${userId}, ${events.length} événements, ${sequences?.length || 0} séquences`);
  try {
    await initFirebase();
    
    const dateKey = getDateKey(date);
    const docRef = db.collection('schedules').doc(userId).collection('days').doc(dateKey);
    
    // Préparer les données pour Firestore
    const eventsData = events.map(event => ({
      ...event,
      start: event.start.toISOString(),
      end: event.end.toISOString()
    }));
    
    const data: any = {
      date: dateKey,
      events: eventsData,
      lastModified: new Date()
    };
    
    if (sequences && sequences.length > 0) {
      // Aplatir les médias pour Firestore (tableau d'objets → tableau de strings)
      // Firestore n'aime pas les nested objects dans les arrays
      data.sequences = sequences.map(seq => {
        const cleanSeq: any = {};
        
        Object.entries(seq).forEach(([key, value]) => {
          if (value !== undefined) {
            // Transformer le tableau media en tableau simple d'URLs
            if (key === 'media' && Array.isArray(value) && value.length > 0) {
              cleanSeq.mediaUrls = value.map(m => m.url);
              cleanSeq.mediaThumbnails = value.map(m => m.thumbnailUrl || '');
              cleanSeq.mediaTypes = value.map(m => m.type);
              cleanSeq.mediaIds = value.map(m => m.id);
            } else {
              cleanSeq[key] = value;
            }
          }
        });
        
        return cleanSeq;
      });
      console.log(`📋 Sauvegarde de ${sequences.length} groupes (médias via Firebase Storage)`);
    }
    
    console.log(`💾 Données à sauvegarder:`, { dateKey, events: eventsData.length, sequences: sequences?.length });
    await docRef.set(data);
    console.log(`✅ Agenda sauvegardé pour ${dateKey} dans schedules/${userId}/days/${dateKey}`);
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde de l\'agenda:', error);
    throw error;
  }
}

/**
 * Charge les événements et séquences d'un jour spécifique
 */
export async function loadScheduleForDate(
  userId: string,
  date: Date
): Promise<{ events: CalendarEvent[], sequences?: SequenceBlock[] } | null> {
  try {
    await initFirebase();
    
    const dateKey = getDateKey(date);
    const docRef = db.collection('schedules').doc(userId).collection('days').doc(dateKey);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data() as ScheduleData;
    
    // Reconvertir les dates ISO en objets Date
    const events: CalendarEvent[] = data.events.map(event => ({
      ...event,
      start: new Date(event.start as any),
      end: new Date(event.end as any)
    }));
    
    console.log(`✅ Agenda chargé pour ${dateKey}: ${events.length} événements`);
    
    // Reconstituer les objets media depuis les tableaux aplatis
    let sequences = data.sequences || [];
    
    if (sequences.length > 0) {
      sequences = sequences.map((seq: any) => {
        // Reconstituer le tableau media depuis les arrays aplatis
        if (seq.mediaUrls && seq.mediaUrls.length > 0) {
          const media = seq.mediaUrls.map((url: string, index: number) => ({
            id: seq.mediaIds?.[index] || `media-${index}`,
            url: url,
            thumbnailUrl: seq.mediaThumbnails?.[index],
            type: seq.mediaTypes?.[index] || 'image'
          }));
          
          const { mediaUrls, mediaThumbnails, mediaTypes, mediaIds, ...rest } = seq;
          return { ...rest, media };
        }
        return seq;
      });
      console.log(`📋 ${sequences.length} séquences chargées`);
    }
    
    return {
      events,
      sequences
    };
  } catch (error) {
    console.error('❌ Erreur lors du chargement de l\'agenda:', error);
    return null;
  }
}

/**
 * Charge tous les événements d'une plage de dates (ex: semaine, mois)
 * Retourne aussi les séquences groupées par date
 */
export async function loadSchedulesForRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ events: CalendarEvent[], sequencesByDate: Record<string, SequenceBlock[]> }> {
  try {
    await initFirebase();
    
    const startKey = getDateKey(startDate);
    const endKey = getDateKey(endDate);
    
    const snapshot = await db
      .collection('schedules')
      .doc(userId)
      .collection('days')
      .where('date', '>=', startKey)
      .where('date', '<=', endKey)
      .get();
    
    const allEvents: CalendarEvent[] = [];
    const sequencesByDate: Record<string, SequenceBlock[]> = {};
    
    snapshot.forEach((doc: any) => {
      const data = doc.data() as ScheduleData;
      const dateKey = data.date;
      
      const events = data.events.map(event => ({
        ...event,
        start: new Date(event.start as any),
        end: new Date(event.end as any)
      }));
      allEvents.push(...events);
      
      if (data.sequences && data.sequences.length > 0) {
        // Reconstituer les objets media depuis les tableaux aplatis
        const sequences = data.sequences.map((seq: any) => {
          if (seq.mediaUrls && seq.mediaUrls.length > 0) {
            const media = seq.mediaUrls.map((url: string, index: number) => ({
              id: seq.mediaIds?.[index] || `media-${index}`,
              url: url,
              thumbnailUrl: seq.mediaThumbnails?.[index],
              type: seq.mediaTypes?.[index] || 'image'
            }));
            
            const { mediaUrls, mediaThumbnails, mediaTypes, mediaIds, ...rest } = seq;
            return { ...rest, media };
          }
          return seq;
        });
        sequencesByDate[dateKey] = sequences;
      }
    });
    
    console.log(`✅ Agenda chargé pour ${startKey} → ${endKey}: ${allEvents.length} événements, ${Object.keys(sequencesByDate).length} jours avec séquences`);
    
    return { events: allEvents, sequencesByDate };
  } catch (error) {
    console.error('❌ Erreur lors du chargement de l\'agenda:', error);
    return { events: [], sequencesByDate: {} };
  }
}

/**
 * Supprime les événements d'un jour spécifique
 */
export async function deleteScheduleForDate(
  userId: string,
  date: Date
): Promise<void> {
  try {
    await initFirebase();
    
    const dateKey = getDateKey(date);
    await db.collection('schedules').doc(userId).collection('days').doc(dateKey).delete();
    
    console.log(`✅ Agenda supprimé pour ${dateKey}`);
  } catch (error) {
    console.error('❌ Erreur lors de la suppression de l\'agenda:', error);
    throw error;
  }
}

/**
 * Écoute les changements en temps réel d'un jour spécifique
 */
export function subscribeToSchedule(
  userId: string,
  date: Date,
  callback: (events: CalendarEvent[], sequences?: SequenceBlock[]) => void
): () => void {
  let unsubscribe = () => {};
  
  initFirebase().then(() => {
    const dateKey = getDateKey(date);
    const docRef = db.collection('schedules').doc(userId).collection('days').doc(dateKey);
    
    unsubscribe = docRef.onSnapshot((doc: any) => {
      if (!doc.exists) {
        callback([]);
        return;
      }
      
      const data = doc.data() as ScheduleData;
      const events = data.events.map(event => ({
        ...event,
        start: new Date(event.start as any),
        end: new Date(event.end as any)
      }));
      
      callback(events, data.sequences);
    });
  }).catch(error => {
    console.error('❌ Erreur lors de l\'abonnement:', error);
  });
  
  return unsubscribe;
}
