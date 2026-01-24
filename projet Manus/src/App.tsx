import { useState, useEffect, useRef } from 'react';
import { WeekCalendar } from './components/WeekCalendar';
import { PlayerList } from './components/PlayerList';
import { DayDetailsModal } from './components/DayDetailsModal';
import { CalendarImportModal } from './components/CalendarImportModal';
import { MOCK_PLAYERS } from './mockData';
import { loadPlayersFromFirebase, subscribeToPlayers } from './services/FirebasePlayerService';
import { loadSchedulesForRange, saveScheduleForDate, loadScheduleForDate } from './services/FirebaseCalendarService';
import type { Player, CalendarEvent, SequenceBlock } from './types';
import { Users, RefreshCw, Link as LinkIcon, Unlink, Loader2, PlayCircle } from 'lucide-react';
import { format, addWeeks, subWeeks, getWeek, differenceInWeeks, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [playerLoadError, setPlayerLoadError] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [sequencesByDate, setSequencesByDate] = useState<Record<string, SequenceBlock[]>>({}); // Stocker les séquences par date
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [initialTime, setInitialTime] = useState<string | undefined>(undefined);
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [groupClipboard, setGroupClipboard] = useState<any | null>(null); // Pour copier/coller les groupes entre jours
  const [showImportModal, setShowImportModal] = useState(false);
  const [userId, setUserId] = useState<string>('coach'); // ID du coach/utilisateur actuel
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Pour annuler le timeout

  // Écouter les messages postMessage du parent (intégration iframe)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Accepter les messages de localhost (dev) ou du même origin
      const allowedOrigins = ['http://localhost:5000', 'http://127.0.0.1:5000', window.location.origin];
      
      if (!allowedOrigins.includes(event.origin) && event.origin !== '*') {
        return;
      }

      if (event.data && event.data.type === 'PLAYERS_DATA') {
        console.log('📨 Données joueuses reçues via postMessage:', event.data.players?.length);
        
        // Annuler le timeout car les données sont arrivées
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
        
        if (event.data.players && Array.isArray(event.data.players)) {
          // Mapper les données reçues vers le format Player
          const mappedPlayers: Player[] = event.data.players.map((p: any) => ({
            id: p.id || String(Math.random()),
            name: p.name || 'Joueuse',
            cyclePhase: p.cyclePhase || 'unknown',
            cycleDay: p.cycleDay || 0,
            readinessScore: p.readinessScore ?? 75,
            energy: p.energy ?? 7,
            mood: p.mood,
            wellnessScore: p.wellnessScore ?? 75,
            hasSPM: p.hasSPM || false,
            symptoms: p.symptoms || [],
            status: p.status || 'optimal',
            hasCheckin: p.hasCheckin !== undefined ? p.hasCheckin : true
          }));
          
          setPlayers(mappedPlayers);
          setIsLoadingPlayers(false);
          setPlayerLoadError(null);
          console.log(`✅ ${mappedPlayers.length} joueuses chargées via postMessage`);
        }
      }
      
      // Recevoir l'ID de l'utilisateur connecté du parent
      if (event.data && event.data.type === 'USER_ID') {
        setUserId(event.data.userId);
        console.log(`✅ User ID reçu: ${event.data.userId}`);
      }
    };

    window.addEventListener('message', handleMessage);

    // Signaler au parent que l'app est prête et demander l'user ID
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'REACT_APP_READY' }, '*');
      window.parent.postMessage({ type: 'REQUEST_USER_ID' }, '*');
      console.log('📤 Signal REACT_APP_READY et REQUEST_USER_ID envoyés au parent');
    } else {
      // Mode standalone: récupérer depuis Firebase Auth
      if (typeof window !== 'undefined' && (window as any).firebase) {
        const firebase = (window as any).firebase;
        const auth = firebase.auth?.();
        
        if (auth) {
          auth.onAuthStateChanged((user: any) => {
            if (user) {
              setUserId(user.uid);
              console.log(`✅ User ID depuis Firebase Auth: ${user.uid}`);
            } else {
              setUserId('coach'); // Fallback si pas connecté
            }
          });
        }
      }
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Charger les joueuses depuis Firebase au démarrage (mode standalone)
  useEffect(() => {
    // Si on est dans une iframe, attendre les données du parent (plus longtemps)
    if (window.parent !== window) {
      console.log('🖼️ Mode iframe détecté, attente des données du parent...');
      // Timeout plus long (10s) car les données peuvent prendre du temps à arriver
      const timeoutId = setTimeout(() => {
        if (isLoadingPlayers) {
          console.log('⏰ Timeout 10s, aucune donnée reçue - affichage message d\'attente');
          // Ne pas utiliser les mock data, afficher un message
          setPlayerLoadError('En attente des données du serveur principal...');
          setIsLoadingPlayers(false);
        }
      }, 10000);
      
      loadingTimeoutRef.current = timeoutId;
      
      return () => {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
      };
    }

    // Mode standalone: charger depuis Firebase
    let unsubscribe: (() => void) | null = null;

    const loadPlayers = async () => {
      setIsLoadingPlayers(true);
      setPlayerLoadError(null);

      try {
        // Essayer de charger depuis Firebase
        const firebasePlayers = await loadPlayersFromFirebase();
        
        if (firebasePlayers.length > 0) {
          setPlayers(firebasePlayers);
          console.log(`✅ ${firebasePlayers.length} joueuses chargées depuis Firebase`);
          
          // S'abonner aux mises à jour en temps réel
          unsubscribe = subscribeToPlayers((updatedPlayers) => {
            setPlayers(updatedPlayers);
            console.log(`🔄 Mise à jour: ${updatedPlayers.length} joueuses`);
          });
        } else {
          // Fallback sur les données mock si pas de joueuses dans Firebase
          console.log('⚠️ Aucune joueuse dans Firebase, utilisation des données de démonstration');
          setPlayers(MOCK_PLAYERS);
        }
      } catch (error) {
        console.error('❌ Erreur chargement Firebase:', error);
        setPlayerLoadError('Erreur de connexion à la base de données');
        // Fallback sur les données mock
        setPlayers(MOCK_PLAYERS);
      } finally {
        setIsLoadingPlayers(false);
      }
    };

    loadPlayers();

    // Cleanup: se désabonner quand le composant est démonté
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Charger les événements de la semaine courante depuis Firebase
  useEffect(() => {
    const loadEvents = async () => {
      // Vérifier que Firebase est disponible
      if (typeof window !== 'undefined' && !(window as any).firebase) {
        console.log('⚠️ Firebase non disponible pour le chargement des événements');
        return;
      }
      
      try {
        // Calculer la plage de la semaine (lundi → dimanche + 7 jours)
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = addDays(endOfWeek(currentDate, { weekStartsOn: 1 }), 7); // 2 semaines pour avoir de la marge
        
        const { events: loadedEvents, sequencesByDate: loadedSequences } = await loadSchedulesForRange(userId, weekStart, weekEnd);
        
        if (loadedEvents.length > 0) {
          setEvents(loadedEvents);
          console.log(`✅ ${loadedEvents.length} événements chargés depuis Firebase (mode ${window.parent !== window ? 'iframe' : 'standalone'})`);
        }
        
        if (Object.keys(loadedSequences).length > 0) {
          setSequencesByDate(loadedSequences);
          console.log(`✅ ${Object.keys(loadedSequences).length} jours avec séquences chargés`);
        }
      } catch (error) {
        console.error('❌ Erreur lors du chargement des événements:', error);
        // Pas de fallback sur MOCK_EVENTS pour ne pas mélanger les données
      }
    };

    loadEvents();
  }, [currentDate, userId]);

  const handleImportClick = () => {
    setShowImportModal(true);
  };

  const handleImportEvents = (importedEvents: CalendarEvent[]) => {
    // Fusionner avec les événements existants
    // On évite les doublons parfaits (même ID ou même titre/start/end)
    const newEvents = [...events];
    let addedCount = 0;

    importedEvents.forEach(imp => {
      const exists = newEvents.some(e => 
        e.id === imp.id || 
        (e.title === imp.title && e.start.getTime() === imp.start.getTime())
      );
      
      if (!exists) {
        newEvents.push(imp);
        addedCount++;
      }
    });

    setEvents(newEvents);
    setIsGoogleLinked(true); // On considère que c'est lié après un import réussi
    
    // Sauvegarder TOUS les événements (après fusion) dans Firebase
    if (typeof window !== 'undefined' && (window as any).firebase) {
      // Grouper TOUS les événements par date et sauvegarder
      const eventsByDate = new Map<string, CalendarEvent[]>();
      
      newEvents.forEach(event => {
        const dateKey = event.start.toISOString().split('T')[0];
        if (!eventsByDate.has(dateKey)) {
          eventsByDate.set(dateKey, []);
        }
        eventsByDate.get(dateKey)!.push(event);
      });
      
      // Sauvegarder chaque jour
      eventsByDate.forEach((dayEvents, dateKey) => {
        const date = new Date(dateKey);
        saveScheduleForDate(userId, date, dayEvents).catch(err => 
          console.error(`Erreur sauvegarde ${dateKey}:`, err)
        );
      });
      
      console.log(`💾 ${importedEvents.length} événements sauvegardés dans Firebase`);
    }
    
    alert(`${addedCount} événements importés avec succès !`);
  };

  const handleSync = () => {
    if (!isGoogleLinked) return;
    setIsSyncing(true);
    // Simulation de délai réseau et de scan sur 2 mois
    setTimeout(() => {
      setIsSyncing(false);
      // Simulation de la logique de scan étendu
      const scanRange = "2 mois";
      alert(`Synchronisation terminée sur les ${scanRange} à venir. Aucun conflit détecté.`);
    }, 2000);
  };

  const handleUpdatePlayer = (updatedPlayer: Player) => {
    setPlayers(players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
  };

  const handleDayClick = async (date: Date) => {
    // Charger les séquences pour ce jour depuis Firebase
    const dateKey = date.toISOString().split('T')[0];
    
    try {
      const scheduleData = await loadScheduleForDate(userId, date);
      if (scheduleData?.sequences && scheduleData.sequences.length > 0) {
        setSequencesByDate(prev => ({
          ...prev,
          [dateKey]: scheduleData.sequences!
        }));
      }
    } catch (error) {
      console.error('Erreur chargement séquences:', error);
    }
    
    setSelectedDate(date);
    setInitialTime(undefined); // Pas d'heure spécifique si on clique sur "Détails"
  };

  const handleEventClick = async (event: CalendarEvent) => {
    const date = event.start;
    const dateKey = date.toISOString().split('T')[0];
    
    try {
      const scheduleData = await loadScheduleForDate(userId, date);
      if (scheduleData?.sequences && scheduleData.sequences.length > 0) {
        setSequencesByDate(prev => ({
          ...prev,
          [dateKey]: scheduleData.sequences!
        }));
      }
    } catch (error) {
      console.error('Erreur chargement séquences:', error);
    }
    
    setSelectedDate(date);
    // Formater l'heure de début (ex: "14:00")
    setInitialTime(format(date, 'HH:mm'));
  };

  const handlePasteEvent = (clipboardEvent: CalendarEvent, targetDate: Date) => {
    // Créer un nouvel événement basé sur le presse-papier mais à la date cible
    const duration = clipboardEvent.end.getTime() - clipboardEvent.start.getTime();
    
    // On garde l'heure de début originale mais sur le jour cible
    const newStart = new Date(targetDate);
    newStart.setHours(clipboardEvent.start.getHours(), clipboardEvent.start.getMinutes());
    
    const newEnd = new Date(newStart.getTime() + duration);
    
    const newEvent: CalendarEvent = {
      ...clipboardEvent,
      id: `evt-${Date.now()}`,
      start: newStart,
      end: newEnd,
      // On pourrait aussi copier les séquences internes si elles étaient stockées ici
    };
    
    const updatedEvents = [...events, newEvent];
    setEvents(updatedEvents);
    
    // Sauvegarder dans Firebase
    const dayEvents = updatedEvents.filter(e => 
      e.start.getDate() === targetDate.getDate() &&
      e.start.getMonth() === targetDate.getMonth() &&
      e.start.getFullYear() === targetDate.getFullYear()
    );
    saveScheduleForDate(userId, targetDate, dayEvents).catch(err => 
      console.error('Erreur sauvegarde:', err)
    );
  };

  return (
    <div className="min-h-screen bg-[#141414] text-gray-100 font-sans selection:bg-[#E50914] selection:text-white">
      {/* Header Netflix Style */}
      <header className="bg-gradient-to-b from-black/80 to-transparent fixed top-0 w-full z-50 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-[#E50914] transform hover:scale-110 transition-transform duration-300">
              <PlayCircle size={40} fill="#E50914" color="white" strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl font-bold tracking-tighter text-[#E50914] uppercase drop-shadow-lg">
              RPE <span className="text-white font-light">Team Planner</span>
            </h1>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-gray-300">
            <div className="flex items-center gap-2 bg-[#333]/50 px-4 py-2 rounded-full border border-white/10 hover:bg-[#333] transition-colors cursor-pointer">
              <Users size={18} className="text-[#E50914]" />
              {isLoadingPlayers ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Chargement...
                </span>
              ) : (
                <span>{players.length} Joueuses</span>
              )}
              {playerLoadError && (
                <span className="text-red-400 text-xs ml-1" title={playerLoadError}>⚠️</span>
              )}
            </div>
            <div className="h-6 w-px bg-white/20"></div>
            
            {/* Google Calendar Controls */}
            <div className="flex items-center gap-2">
              <button 
                onClick={handleImportClick}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                  isGoogleLinked 
                    ? 'bg-green-900/30 text-green-400 border border-green-500/30 hover:bg-green-900/50' 
                    : 'bg-[#333] text-gray-400 border border-gray-600 hover:bg-[#444]'
                }`}
              >
                {isGoogleLinked ? <Unlink size={14} /> : <LinkIcon size={14} />}
                {isGoogleLinked ? 'Agenda Lié' : 'Importer Agenda'}
              </button>
              
              {isGoogleLinked && (
                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold bg-blue-900/30 text-blue-400 border border-blue-500/30 hover:bg-blue-900/50 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'Sync...' : 'Mise à jour'}
                </button>
              )}
            </div>

            <div className="h-6 w-px bg-white/20"></div>
            <div className="text-gray-400 uppercase tracking-widest text-xs">Saison 2025-2026</div>
            <div className="w-10 h-10 rounded bg-[#E50914] flex items-center justify-center font-bold text-white cursor-pointer hover:bg-[#b20710] transition-colors">
              C
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content - Calendar */}
          <div className="lg:col-span-3 space-y-8">
            {/* Hero Section / Calendar Header */}
            <div className="relative overflow-hidden rounded-xl bg-[#181818] border border-[#333] shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#E50914] via-purple-600 to-[#E50914]"></div>
              <div className="p-8">
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Planning Hebdomadaire</h2>
                    <p className="text-gray-400">Gérez la charge d'entraînement en fonction des cycles.</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setCurrentDate(d => subWeeks(d, 1))}
                      className="px-4 py-2 text-sm font-bold text-gray-300 bg-[#2A2A2A] rounded hover:bg-[#3A3A3A] transition-colors border border-[#404040]"
                    >
                      Semaine {getWeek(subWeeks(currentDate, 1), { locale: fr })}
                    </button>
                    <button 
                      onClick={() => setCurrentDate(new Date())}
                      className="px-6 py-2 text-sm font-bold text-white bg-[#E50914] rounded hover:bg-[#b20710] transition-colors shadow-lg shadow-red-900/20"
                    >
                      Semaine {getWeek(currentDate, { locale: fr })}
                    </button>
                    <button 
                      onClick={() => {
                        const nextWeek = addWeeks(currentDate, 1);
                        if (differenceInWeeks(nextWeek, new Date()) <= 8) {
                          setCurrentDate(nextWeek);
                        }
                      }}
                      disabled={differenceInWeeks(addWeeks(currentDate, 1), new Date()) > 8}
                      className="px-4 py-2 text-sm font-bold text-gray-300 bg-[#2A2A2A] rounded hover:bg-[#3A3A3A] transition-colors border border-[#404040] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Semaine {getWeek(addWeeks(currentDate, 1), { locale: fr })}
                    </button>
                  </div>
                </div>
                
                <WeekCalendar 
                  currentDate={currentDate}
                  events={events}
                  players={players}
                  onEventClick={handleEventClick}
                  onDayClick={handleDayClick}
                  onPasteEvent={handlePasteEvent}
                />
              </div>
            </div>

            {/* Legend - Netflix Categories */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#181818] p-6 rounded-xl border border-amber-500/20 hover:border-amber-500/50 transition-colors group cursor-default relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="text-6xl">⚡</span>
                </div>
                <div className="font-bold text-amber-400 text-xl flex items-center gap-3 mb-3">
                  <span className="text-2xl">⚡</span> Wonder Woman
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  <span className="text-white font-semibold">Phase Folliculaire/Ovulatoire.</span><br/>
                  Pic de performance. Focus sur l'intensité maximale et la puissance explosive.
                </p>
              </div>

              <div className="bg-[#181818] p-6 rounded-xl border border-violet-500/20 hover:border-violet-500/50 transition-colors group cursor-default relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="text-6xl">🛡️</span>
                </div>
                <div className="font-bold text-violet-400 text-xl flex items-center gap-3 mb-3">
                  <span className="text-2xl">🛡️</span> Bad Girl
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  <span className="text-white font-semibold">Phase Lutéale.</span><br/>
                  Endurance stable mais récupération plus lente. Focus technique et volume modéré.
                </p>
              </div>

              <div className="bg-[#181818] p-6 rounded-xl border border-pink-500/20 hover:border-pink-500/50 transition-colors group cursor-default relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="text-6xl">🌸</span>
                </div>
                <div className="font-bold text-pink-400 text-xl flex items-center gap-3 mb-3">
                  <span className="text-2xl">🌸</span> Récupération
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  <span className="text-white font-semibold">Phase Menstruelle.</span><br/>
                  Niveau d'énergie bas. Priorité à la mobilité, aux soins et à la charge légère.
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar - Player List */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <PlayerList 
                players={players}
                onUpdatePlayer={handleUpdatePlayer}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {selectedDate && (
        <DayDetailsModal 
          date={selectedDate}
          players={players}
          initialTime={initialTime}
          savedSequences={sequencesByDate[selectedDate.toISOString().split('T')[0]] || []}
          importedEvents={events.filter(e => 
            e.start.getDate() === selectedDate.getDate() &&
            e.start.getMonth() === selectedDate.getMonth() &&
            e.start.getFullYear() === selectedDate.getFullYear()
          )}
          onSave={(sequences) => {
            // Mettre à jour l'état local
            const dateKey = selectedDate.toISOString().split('T')[0];
            setSequencesByDate(prev => ({
              ...prev,
              [dateKey]: sequences
            }));
            
            // Synchroniser les séquences avec les événements du calendrier
            // Supprimer les anciens événements de séquence pour ce jour
            const nonSequenceEvents = events.filter(e => 
              !(e.start.getDate() === selectedDate.getDate() &&
                e.start.getMonth() === selectedDate.getMonth() &&
                e.start.getFullYear() === selectedDate.getFullYear() &&
                e.id.startsWith('seq-'))
            );
            
            // Créer des événements pour chaque séquence
            const sequenceEvents: CalendarEvent[] = sequences.map(seq => {
              const [startHour, startMin] = seq.startTime.split(':').map(Number);
              const [endHour, endMin] = seq.endTime.split(':').map(Number);
              
              const startDate = new Date(selectedDate);
              startDate.setHours(startHour, startMin, 0, 0);
              
              const endDate = new Date(selectedDate);
              endDate.setHours(endHour, endMin, 0, 0);
              
              return {
                id: seq.id, // Utiliser l'ID de la séquence
                title: seq.title,
                start: startDate,
                end: endDate,
                type: 'training' as const,
                color: seq.color ? seq.color.replace('border-', 'bg-') : 'bg-blue-500'
              };
            });
            
            // Fusionner tous les événements
            const updatedEvents = [...nonSequenceEvents, ...sequenceEvents];
            setEvents(updatedEvents);
            
            // Sauvegarder dans Firebase (événements + séquences)
            const dayEvents = updatedEvents.filter(e => 
              e.start.getDate() === selectedDate.getDate() &&
              e.start.getMonth() === selectedDate.getMonth() &&
              e.start.getFullYear() === selectedDate.getFullYear()
            );
            saveScheduleForDate(userId, selectedDate, dayEvents, sequences).catch(err => 
              console.error('Erreur sauvegarde:', err)
            );
          }}
          onClose={() => setSelectedDate(null)}
          groupClipboard={groupClipboard}
          onCopyGroup={(groupData) => setGroupClipboard(groupData)}
          onClearGroupClipboard={() => setGroupClipboard(null)}
        />
      )}

      {showImportModal && (
        <CalendarImportModal 
          onClose={() => setShowImportModal(false)}
          onImport={handleImportEvents}
        />
      )}
    </div>
  );
}

export default App;
