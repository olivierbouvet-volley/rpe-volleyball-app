/**
 * Team Planner - Netflix Edition
 * Intégration avec l'application React via iframe
 * Mode hybride : serveur dev local OU fichiers buildés intégrés
 */

(function() {
    'use strict';

    const DEV_SERVER_URL = 'http://localhost:5173';
    const PROD_URL = '/manus/'; // Fichiers buildés intégrés
    let isIframeLoaded = false;
    let loadAttempts = 0;
    const MAX_LOAD_ATTEMPTS = 2;
    let useDevServer = false;

    /**
     * Initialise le Team Planner
     */
    function initTeamPlanner() {
        console.log('🎬 Initialisation Team Planner...');
        
        const iframe = document.getElementById('teamPlannerIframe');
        const fallback = document.getElementById('teamPlannerFallback');
        
        if (!iframe) {
            console.error('Iframe Team Planner non trouvée');
            return;
        }

        // Si l'iframe est déjà chargée, ne rien faire
        if (isIframeLoaded && iframe.src !== 'about:blank') {
            console.log('✅ Team Planner déjà chargé');
            return;
        }

        // Cacher le fallback au départ
        if (fallback) {
            fallback.style.display = 'none';
        }

        // Charger l'application React
        loadReactApp(iframe, fallback);
    }

    /**
     * Charge l'application React dans l'iframe
     * Essaie d'abord le serveur dev local, puis les fichiers buildés
     */
    function loadReactApp(iframe, fallback) {
        loadAttempts++;
        
        // En local, essayer d'abord le serveur dev
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log(`🔄 Tentative serveur dev (${loadAttempts}/${MAX_LOAD_ATTEMPTS})...`);
            
            // Vérifier si le serveur React dev est accessible
            fetch(DEV_SERVER_URL, { mode: 'no-cors', cache: 'no-cache' })
                .then(() => {
                    // Serveur dev disponible, l'utiliser
                    console.log('✅ Serveur dev React détecté, utilisation du hot-reload');
                    useDevServer = true;
                    loadIframe(iframe, DEV_SERVER_URL);
                })
                .catch(() => {
                    console.log('ℹ️ Serveur dev non disponible, utilisation des fichiers buildés');
                    loadIframe(iframe, PROD_URL);
                });
        } else {
            // En production, toujours utiliser les fichiers buildés
            console.log('🌐 Mode production, utilisation des fichiers intégrés');
            loadIframe(iframe, PROD_URL);
        }
    }

    /**
     * Charge l'URL dans l'iframe
     */
    function loadIframe(iframe, url) {
        iframe.src = url;
        iframe.style.display = 'block';
        
        iframe.onload = () => {
            isIframeLoaded = true;
            const mode = useDevServer ? 'DEV (hot-reload)' : 'PROD (intégré)';
            console.log(`✅ Team Planner chargé - Mode: ${mode}`);
            
            // Envoyer les données des joueuses à l'iframe
            setTimeout(() => sendPlayersToReactApp(), 500);
        };

        iframe.onerror = () => {
            console.error('❌ Erreur de chargement de l\'iframe');
        };
    }

    /**
     * Envoie les données des joueuses à l'application React via postMessage
     */
    async function sendPlayersToReactApp() {
        const iframe = document.getElementById('teamPlannerIframe');
        if (!iframe || !iframe.contentWindow) return;

        try {
            // Récupérer les joueuses depuis Firebase
            if (typeof db === 'undefined' || !db) {
                console.error('Firebase non initialisé');
                return;
            }

            const today = new Date().toISOString().split('T')[0];
            const playersSnapshot = await db.collection('players').get();
            const players = [];

            for (const doc of playersSnapshot.docs) {
                const data = doc.data();
                if (data.role !== 'coach') {
                    // Récupérer le check-in du jour pour le score actuel
                    const checkinSnapshot = await db.collection('checkins')
                        .where('playerId', '==', doc.id)
                        .where('date', '==', today)
                        .limit(1)
                        .get();

                    let readiness = 0;
                    let energy = 0;
                    let mood = 0;
                    let hasCheckin = false;
                    let status = 'critical'; // Par défaut si pas de check-in
                    let hasSPM = false;
                    let symptoms = [];
                    
                    if (!checkinSnapshot.empty) {
                        hasCheckin = true;
                        const checkin = checkinSnapshot.docs[0].data();
                        
                        // Extraire les symptômes et vérifier leur intensité
                        if (checkin.symptoms && typeof checkin.symptoms === 'object') {
                            symptoms = Object.entries(checkin.symptoms)
                                .filter(([key, value]) => value > 0)
                                .map(([key, value]) => ({ name: key, intensity: value }));
                            
                            // Vérifier si au moins un symptôme est >= 5/10
                            hasSPM = symptoms.some(s => s.intensity >= 5);
                        }
                        
                        // Calculer le score comme dans getPlayerStatus
                        let score;
                        if (checkin.energy !== undefined && checkin.energy !== null) {
                            score = Math.round((checkin.sleep + (10 - checkin.soreness) + (10 - checkin.stress) + checkin.mood + checkin.energy) / 5);
                        } else {
                            score = Math.round((checkin.sleep + (10 - checkin.soreness) + (10 - checkin.stress) + checkin.mood) / 4);
                        }
                        
                        // Déterminer le statut
                        if (score >= 7) {
                            status = 'optimal';
                        } else if (score >= 5) {
                            status = 'attention';
                        } else {
                            status = 'critical';
                        }
                        
                        readiness = score * 10;
                        energy = checkin.energy || 5;
                        mood = checkin.mood || 0;
                    }
                    
                    const wellnessScore = hasCheckin ? Math.round((readiness * 0.5) + (energy * 10 * 0.5)) : 0;
                    
                    // Récupérer la phase du cycle
                    let cyclePhase = 'unknown';
                    let cycleDay = 0;
                    if (typeof getPlayerCyclePhase === 'function') {
                        const phaseInfo = await getPlayerCyclePhase(doc.id);
                        cyclePhase = mapCyclePhase(phaseInfo.phase);
                        cycleDay = phaseInfo.day || 0;
                    }
                    
                    players.push({
                        id: doc.id,
                        name: data.name || data.email?.split('@')[0] || 'Joueuse',
                        cyclePhase: cyclePhase,
                        cycleDay: cycleDay,
                        readinessScore: readiness,
                        energy: energy,
                        mood: mood,
                        wellnessScore: wellnessScore,
                        status: status,
                        hasCheckin: hasCheckin,
                        hasSPM: hasSPM,
                        symptoms: symptoms
                    });
                }
            }

            console.log(`📤 Envoi de ${players.length} joueuses à l'application React`);

            // Envoyer les données à l'iframe avec l'URL appropriée
            const targetOrigin = useDevServer ? DEV_SERVER_URL : window.location.origin;
            iframe.contentWindow.postMessage({
                type: 'PLAYERS_DATA',
                players: players
            }, targetOrigin);
            
            // Envoyer aussi l'ID de l'utilisateur connecté
            if (auth.currentUser) {
                iframe.contentWindow.postMessage({
                    type: 'USER_ID',
                    userId: auth.currentUser.uid
                }, targetOrigin);
                console.log(`📤 User ID envoyé: ${auth.currentUser.uid}`);
            }

        } catch (error) {
            console.error('Erreur lors de l\'envoi des joueuses:', error);
        }
    }

    /**
     * Mappe la phase du cycle vers le format attendu par React
     */
    function mapCyclePhase(phase) {
        if (!phase) return 'unknown';
        const p = phase.toLowerCase();
        if (p === 'menstrual' || p === 'règles' || p === 'menstruation') return 'menstrual';
        if (p === 'follicular' || p === 'folliculaire') return 'follicular';
        if (p === 'ovulatory' || p === 'ovulation') return 'ovulatory';
        if (p === 'luteal' || p === 'lutéale') return 'luteal';
        return 'unknown';
    }

    /**
     * Calcule le score de readiness
     */
    function calculateReadinessScore(playerData) {
        let score = 75;
        if (playerData.lastRPE) {
            score = Math.max(0, 100 - (playerData.lastRPE * 8));
        }
        if (playerData.fatigue) score -= playerData.fatigue * 5;
        if (playerData.stress) score -= playerData.stress * 3;
        if (playerData.sleep) score += (playerData.sleep - 6) * 5;
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    // Écouter les messages de l'iframe React
    window.addEventListener('message', (event) => {
        // Vérifier que le message vient de l'iframe (dev ou prod)
        const allowedOrigins = [DEV_SERVER_URL, window.location.origin];
        if (!allowedOrigins.includes(event.origin) && event.origin !== 'null') {
            // Autoriser aussi 'null' pour les iframes en mode file://
            return;
        }

        if (event.data.type === 'REACT_APP_READY') {
            console.log('📨 Application React prête, envoi des joueuses...');
            sendPlayersToReactApp();
        }
    });

    // Export global
    window.TeamPlanner = {
        init: initTeamPlanner,
        refresh: sendPlayersToReactApp
    };

})();
