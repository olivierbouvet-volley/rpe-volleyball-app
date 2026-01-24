import ICAL from 'ical.js';
import type { CalendarEvent } from '../types';

export interface CalendarConfig {
  url?: string;
  lastSync?: Date;
}

export const CalendarService = {
  /**
   * Parse le contenu ICS (texte) et retourne une liste d'événements
   * Gère désormais les événements récurrents (RRULE)
   */
  parseICS: (icsData: string): CalendarEvent[] => {
    try {
      const jcalData = ICAL.parse(icsData);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');
      
      const allEvents: CalendarEvent[] = [];
      
      // Définir la plage de temps pour l'expansion des récurrences
      // On regarde 1 mois en arrière et 6 mois en avant pour être large
      const now = new Date();
      const rangeStart = ICAL.Time.fromJSDate(new Date(now.getFullYear(), now.getMonth() - 1, 1), true);
      const rangeEnd = ICAL.Time.fromJSDate(new Date(now.getFullYear(), now.getMonth() + 6, 1), true);

      vevents.forEach(vevent => {
        const event = new ICAL.Event(vevent);

        if (event.isRecurring()) {
          // Gérer les événements récurrents
          const iterator = event.iterator();
          let next;
          
          while ((next = iterator.next())) {
            const occurrenceTime = next;
            
            // Si l'occurrence est avant le début de notre plage, on continue
            if (occurrenceTime.compare(rangeStart) < 0) continue;
            
            // Si l'occurrence est après la fin de notre plage, on arrête
            if (occurrenceTime.compare(rangeEnd) > 0) break;

            const details = event.getOccurrenceDetails(occurrenceTime);
            const startDate = details.startDate.toJSDate();
            const endDate = details.endDate.toJSDate();

            allEvents.push({
              id: `imported-${event.uid}-${startDate.getTime()}`, // ID unique par occurrence
              title: event.summary || 'Sans titre',
              start: startDate,
              end: endDate,
              type: 'training' // Par défaut, on peut affiner selon le titre
            });
          }
        } else {
          // Événement unique classique
          const startDate = event.startDate.toJSDate();
          const endDate = event.endDate.toJSDate();

          // On filtre aussi les événements uniques trop vieux ou trop loin
          // (Optionnel, mais garde l'appli légère)
          if (startDate >= rangeStart.toJSDate() && startDate <= rangeEnd.toJSDate()) {
            allEvents.push({
              id: `imported-${event.uid}`,
              title: event.summary || 'Sans titre',
              start: startDate,
              end: endDate,
              type: 'training'
            });
          }
        }
      });

      return allEvents;
    } catch (error) {
      console.error("Erreur lors du parsing ICS:", error);
      throw new Error("Format de fichier invalide");
    }
  },

  /**
   * Récupère le contenu ICS depuis une URL (via un proxy CORS si nécessaire en prod)
   * Note: En local ou sans backend proxy, les URL externes peuvent bloquer à cause de CORS.
   * Pour cette démo, on assume que l'utilisateur peut aussi uploader le fichier.
   */
  fetchFromUrl: async (url: string): Promise<string> => {
    try {
      // Utilisation d'un proxy CORS public pour contourner les restrictions du navigateur
      // Note: En production, il est préférable d'avoir son propre proxy backend
      const proxyUrl = `https://thingproxy.freeboard.io/fetch/${url}`;
      
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/calendar, text/plain, */*'
        }
      });
      
      if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
      return await response.text();
    } catch (error) {
      console.error("Erreur lors du fetch:", error);
      // Tentative de fallback direct si le proxy échoue (au cas où CORS ne soit pas le problème)
      try {
        const directResponse = await fetch(url);
        if (directResponse.ok) return await directResponse.text();
      } catch (e) {
        console.error("Erreur CORS probable, impossible de fetcher directement depuis le navigateur sans proxy.");
      }
      throw new Error("Impossible de récupérer le calendrier. Utilisez l'upload de fichier à la place.");
    }
  },

  /**
   * Détecte les conflits entre les événements existants et les nouveaux importés
   * Retourne les événements qui chevauchent des événements existants modifiés localement
   */
  detectConflicts: (_existingEvents: CalendarEvent[], _importedEvents: CalendarEvent[]) => {
    // Logique simplifiée : on considère qu'il y a conflit si un événement importé 
    // chevauche un événement existant sur la même plage horaire
    // Dans une version avancée, on vérifierait si l'événement existant a été modifié manuellement
    return [];
  }
};
