// ============================================================================
// CONFIGURATION FIREBASE
// ============================================================================
// La configuration est chargée depuis /js/config/firebase-loader.js
// qui sélectionne automatiquement PROD ou DEV selon le hostname

// Vérifier que firebase-loader.js a bien chargé la config
if (!window.FIREBASE_CONFIG) {
    console.error('❌ ERREUR: Configuration Firebase non chargée !');
    console.error('Vérifiez que firebase-loader.js est bien inclus dans index.html');
    throw new Error('Configuration Firebase manquante');
}

// Initialize Firebase
firebase.initializeApp(window.FIREBASE_CONFIG);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// Exporter db globalement pour les autres modules
window.db = db;

// ============================================================================
// AUTHENTIFICATION ANONYME FIREBASE
// ============================================================================
// Connecte automatiquement un utilisateur anonyme pour satisfaire les règles Firestore
// (request.auth != null) tout en gardant le système de mot de passe local "pole"
(async function initAnonymousAuth() {
    try {
        // Vérifier si déjà connecté
        if (auth.currentUser) {
            console.log('🔐 Firebase Auth: Déjà connecté (UID:', auth.currentUser.uid.substring(0, 8) + '...)');
            return;
        }

        // Connexion anonyme
        const result = await auth.signInAnonymously();
        console.log('🔐 Firebase Auth: Connexion anonyme réussie (UID:', result.user.uid.substring(0, 8) + '...)');
    } catch (error) {
        console.error('❌ Firebase Auth: Erreur connexion anonyme:', error.message);
        // L'app peut quand même fonctionner si les règles Firestore sont ouvertes
    }
})();

// ============================================================================
// SUPPORT EMULATOR LOCAL - DÉSACTIVÉ
// ============================================================================
// Pour activer les émulateurs, décommenter et lancer: firebase emulators:start
/*
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 Mode Emulator Local détecté');
    
    try {
        // Connecter aux emulators Firebase
        db.useEmulator('localhost', 8080);
        console.log('  ✓ Firestore Emulator (localhost:8080)');
        
        auth.useEmulator('http://localhost:9099', { disableWarnings: true });
        console.log('  ✓ Auth Emulator (localhost:9099)');
        
        storage.useEmulator('localhost', 9199);
        console.log('  ✓ Storage Emulator (localhost:9199)');
        
    } catch (error) {
        console.log('  ⚠️ Emulators non disponibles, utilisation Firebase réel');
    }
}
*/
console.log('🌐 Connexion à Firebase Cloud (rpe-gen2-eeaee)');

// État de l'application
const appState = {
    currentUser: null,
    currentRole: null,
    currentFilter: 'all',
    coachName: null
};

// Table de correspondance : prénom avec accents → ID sans accents
const ACCENTS_TO_ID = {
    'mélina': 'Melina',
    'melina': 'Melina',
    'nélia': 'Nelia',
    'nelia': 'Nelia',
    'chloé': 'Chloe',
    'chloe': 'Chloe',
    'léa': 'Lea',
    'lea': 'Lea',
    'zoé': 'Zoe',
    'zoe': 'Zoe'
};

// Liste des joueuses par défaut
const defaultPlayers = [
    { id: 'Julia', name: 'JULIA PROU', birthday: '16/01/10' },
    { id: 'Lea', name: 'LÉA GUEGUEN', birthday: '11/07/10' },
    { id: 'Eline', name: 'ELINE CHEVROLLIER', birthday: '10/02/10' },
    { id: 'Chloe', name: 'Chloé LE FALHER', birthday: '11/02/10' },
    { id: 'Nine', name: 'Nine WESTER', birthday: '17/02/10' },
    { id: 'Cyrielle', name: 'Cyrielle KOFFI', birthday: '17/09/10' },
    { id: 'Rose', name: 'ROSE LECRIVAIN', birthday: '20/04/10' },
    { id: 'Lovely', name: 'Lovely DURIMEL GATO', birthday: '14/02/11' },
    { id: 'Lilou', name: 'Lilou POUGET', birthday: '03/07/11' },
    { id: 'Melina', name: 'Mélina ZIMAGLIA', birthday: '15/01/11' },
    { id: 'Lise', name: 'Lise VINCENT', birthday: '18/03/11' },
    { id: 'Zoe', name: 'Zoé LEFEVRE', birthday: '22/01/11' },
    { id: 'Nelia', name: 'Nélia AMEZA', birthday: '04/10/11' },
    { id: 'Charlotte', name: 'Charlotte MARIONNEAU', birthday: '15/04/12' }
];

// Initialiser les joueuses si elles n'existent pas
async function initializePlayers() {
    try {
        const playersSnapshot = await db.collection('players').get();
        
        if (playersSnapshot.empty) {
            console.log('Création des joueuses par défaut...');
            
            for (const player of defaultPlayers) {
                await db.collection('players').doc(player.id).set({
                    name: player.name,
                    birthday: player.birthday,
                    photoURL: null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            console.log('Joueuses créées avec succès !');
        } else {
            console.log(`Joueuses chargées: ${playersSnapshot.size}`);
        }
    } catch (error) {
        console.error('Erreur lors de l\'initialisation des joueuses:', error);
    }
}

// Appeler l'initialisation au démarrage
initializePlayers();

// Gestion de la connexion
// ============================================================================
// LOGIN SYSTEM - AVEC OLIVIER ET ALEXIS
// ============================================================================

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('playerName').value.trim();
    const password = document.getElementById('teamCode').value;
    
    // ========================================================================
    // COACHES AUTORISÉS
    // ========================================================================
    const authorizedCoaches = {
        'olivier': 'pole',
        'alexis': 'pole',
        'coach': 'pole'  // Ancien login, gardé pour compatibilité
    };
    
    // ========================================================================
    // VÉRIFIER SI C'EST UN COACH
    // ========================================================================
    const lowerUsername = username.toLowerCase();
    
    if (authorizedCoaches[lowerUsername] && password === authorizedCoaches[lowerUsername]) {
        // C'est un coach autorisé!
        appState.currentUser = lowerUsername;
        appState.currentRole = 'coach';
        appState.coachName = username; // Garder le nom original avec la casse
        
        console.log('Coach connecté:', username);
        showScreen('coachScreen');
        loadCoachDashboard();
        return;
    }
    
    // ========================================================================
    // VÉRIFIER SI C'EST UNE JOUEUSE
    // ========================================================================
    if (password === 'pole') {
        // Convertir en minuscule pour la recherche dans la table
        const lowerInput = username.toLowerCase();
        
        // Vérifier d'abord dans la table de correspondance des accents
        let playerId = ACCENTS_TO_ID[lowerInput];
        
        // Si pas dans la table, essayer avec le nom capitalisé
        if (!playerId) {
            playerId = username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
        }
        
        // Chercher le document joueur
        let playerDoc = await db.collection('players').doc(playerId).get();
        
        // Si pas trouvé avec l'ID calculé, essayer le nom exact
        if (!playerDoc.exists) {
            playerDoc = await db.collection('players').doc(username).get();
            if (playerDoc.exists) {
                playerId = username;
            }
        }
        
        if (playerDoc.exists) {
            appState.currentUser = playerId;
            appState.currentRole = 'player';
            showScreen('playerScreen');
            loadPlayerDashboard();
            return;
        } else {
            alert('Nom d\'utilisateur incorrect. Veuillez vérifier votre nom.');
        }
    } else {
        alert('Mot de passe incorrect.');
    }
});

// Afficher un écran
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Déconnexion
function logout() {
    appState.currentUser = null;
    appState.currentRole = null;
    appState.coachName = null;
    
    // Réinitialiser les formulaires RPE progressifs
    if (typeof resetRpeForm === 'function') resetRpeForm();
    if (typeof resetRpeFormYesterday === 'function') resetRpeFormYesterday();
    if (typeof resetRpeFormDayBefore === 'function') resetRpeFormDayBefore();
    
    // Réinitialiser les pastilles
    if (typeof refreshRatingBadges === 'function') {
        refreshRatingBadges();
    }
    
    showScreen('loginScreen');
    document.getElementById('loginForm').reset();
}

// ============================================================================
// AFFICHER LE NOM DU COACH DANS LE HEADER
// ============================================================================
function updateCoachHeader() {
    if (appState.currentRole === 'coach' && appState.coachName) {
        const headerTitle = document.querySelector('.header-title');
        if (headerTitle) {
            headerTitle.textContent = `Tableau de Bord - ${appState.coachName}`;
        }
    }
}

// Appeler cette fonction après loadCoachDashboard
document.addEventListener('DOMContentLoaded', function() {
    if (appState.currentRole === 'coach') {
        updateCoachHeader();
    }
});


// Afficher un écran
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Déconnexion
function logout() {
    appState.currentUser = null;
    appState.currentRole = null;
    showScreen('loginScreen');
    document.getElementById('loginForm').reset();
}

// Gestion des onglets (joueuse)
function switchTab(tabName) {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Initialiser le calculateur de charge si on ouvre cet onglet
    if (tabName === 'loadcalc' && typeof initLoadCalculator === 'function') {
        console.log('switchTab: Appel initLoadCalculator, currentPlayer =', window.currentPlayer);
        // Petit délai pour s'assurer que le DOM est prêt
        setTimeout(() => {
            initLoadCalculator();
        }, 100);
    }
}

// Charger le dashboard de la joueuse
async function loadPlayerDashboard() {
    try {
        // Réinitialiser les formulaires RPE progressifs
        if (typeof resetRpeForm === 'function') resetRpeForm();
        if (typeof resetRpeFormYesterday === 'function') resetRpeFormYesterday();
        if (typeof resetRpeFormDayBefore === 'function') resetRpeFormDayBefore();
        
        // Réinitialiser les pastilles
        if (typeof refreshRatingBadges === 'function') {
            refreshRatingBadges();
        }
        
        const playerDoc = await db.collection('players').doc(appState.currentUser).get();
        const playerData = playerDoc.data();
        
        document.getElementById('playerName').textContent = playerData.name;
        
        // Afficher le nom dans le message de bienvenue
        const welcomeElement = document.getElementById('playerWelcome');
        if (welcomeElement) {
            welcomeElement.textContent = `Bienvenue ${playerData.name}`;
        }
        
        // ============================================
        // VÉRIFICATION CONFIGURATION CYCLE (ONBOARDING)
        // ============================================
        await checkCycleConfiguration(appState.currentUser);
        
        // Charger les données du jour
        const today = new Date().toISOString().split('T')[0];
        
        // Check-in du jour
        const checkinSnapshot = await db.collection('checkins')
            .where('playerId', '==', appState.currentUser)
            .where('date', '==', today)
            .limit(1)
            .get();
        
        // RPE du jour
        const rpeSnapshot = await db.collection('rpe')
            .where('playerId', '==', appState.currentUser)
            .where('date', '==', today)
            .get();
        
        // Calculer le score (avec énergie si disponible)
        let score = 0;
        let status = 'Aucune donnée';
        
        if (!checkinSnapshot.empty) {
            const checkin = checkinSnapshot.docs[0].data();
            
            // Calcul avec énergie si disponible, sinon sans
            if (checkin.energy !== undefined && checkin.energy !== null) {
                score = Math.round((checkin.sleep + (10 - checkin.soreness) + (10 - checkin.stress) + checkin.mood + checkin.energy) / 5);
            } else {
                score = Math.round((checkin.sleep + (10 - checkin.soreness) + (10 - checkin.stress) + checkin.mood) / 4);
            }
            
            if (score >= 7) status = 'Optimal';
            else if (score >= 5) status = 'Attention';
            else status = 'Critique';
        }
        
        document.getElementById('currentScore').textContent = `${score}/10`;
        document.getElementById('currentStatus').textContent = status;
        
        // Mettre à jour la jauge
        const gauge = document.getElementById('statusGauge');
        if (gauge) {
            gauge.style.width = `${score * 10}%`;
            gauge.className = 'status-gauge-fill';
            if (score >= 7) gauge.classList.add('optimal');
            else if (score >= 5) gauge.classList.add('attention');
            else gauge.classList.add('critical');
        }
        
        // === NOUVEAU : Calculer le score de préparation (moyenne 7 jours) ===
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
        
        const last7CheckinsSnapshot = await db.collection('checkins')
            .where('playerId', '==', appState.currentUser)
            .where('date', '>=', sevenDaysAgoStr)
            .orderBy('date', 'desc')
            .get();
        
        let readinessScore = 0;
        if (!last7CheckinsSnapshot.empty) {
            let totalScore = 0;
            let count = 0;
            
            last7CheckinsSnapshot.forEach(doc => {
                const c = doc.data();
                const sleep = c.sleepQuality || c.sleep || 5;
                const soreness = c.soreness || 5;
                const stress = c.stress || 5;
                const mood = c.mood || 5;
                const energy = c.energy !== undefined && c.energy !== null ? c.energy : null;
                
                let dayScore;
                if (energy !== null) {
                    dayScore = Math.round((sleep + (11 - soreness) + (11 - stress) + mood + energy) / 5);
                } else {
                    dayScore = Math.round((sleep + (11 - soreness) + (11 - stress) + mood) / 4);
                }
                
                totalScore += dayScore;
                count++;
            });
            
            readinessScore = count > 0 ? Math.round(totalScore / count) : 0;
        }
        
        document.getElementById('readinessScore').textContent = readinessScore > 0 ? `${readinessScore}/10` : '--';
        
        // Charger la photo de profil (avec fallback vers image par défaut)
        const profilePhoto = document.getElementById('playerProfilePhoto');
        if (profilePhoto) {
            if (playerData && playerData.photoURL) {
                profilePhoto.src = playerData.photoURL;
                // Gérer l'erreur de chargement de l'image
                profilePhoto.onerror = function() {
                    this.src = '/img/default-avatar.png';
                };
            } else {
                profilePhoto.src = '/img/default-avatar.png';
            }
        }
        
        // Charger les statistiques de volume d'entraînement
        if (typeof updatePlayerVolumeStats === 'function') {
            await updatePlayerVolumeStats(appState.currentUser);
        }
        
        // Charger les notifications d'anniversaire et messages urgents
        if (typeof checkAndDisplayBirthdayNotifications === 'function') {
            await checkAndDisplayBirthdayNotifications(appState.currentUser, 'player');
        }
        if (typeof checkAndDisplayUrgentMessages === 'function') {
            await checkAndDisplayUrgentMessages(appState.currentUser);
        }
        
        // Charger les notifications du coach
        if (typeof loadPlayerNotifications === 'function') {
            loadPlayerNotifications(appState.currentUser);
        }
        
        // Afficher le prompt pour activer les notifications push
        if (typeof showNotificationPrompt === 'function') {
            showNotificationPrompt(appState.currentUser);
        }
        
        // Vérifier si aujourd'hui est un jour de repos
        await checkAndBlockRestDay();
        
        // Charger les graphiques du dashboard
        if (typeof loadDashboardCharts === 'function') {
            loadDashboardCharts();
        }
        
        // Stocker le joueur actuel pour les graphiques
        window.currentPlayer = {
            id: appState.currentUser,
            name: playerData.name
        };
        
        // Afficher le nom et la photo du joueur dans le header
        document.getElementById('playerHeaderName').textContent = playerData.name || '--';
        
        // Toujours réinitialiser la photo (sinon elle reste de la joueuse précédente)
        const photoURL = playerData.photoURL || '/img/default-avatar.png';
        window.currentPlayerPhoto = photoURL;
        document.getElementById('playerHeaderPhoto').src = photoURL;
        
        console.log('✅ Header mis à jour - Player:', window.currentPlayer.id, 'Name:', playerData.name, 'Photo:', photoURL);
        
        // Charger les graphiques du dashboard joueuse (tendance forme + charge)
        if (typeof initPlayerDashboardCharts === 'function') {
            setTimeout(initPlayerDashboardCharts, 200);
        }
        
        // Charger les recommandations d'entraînement par phase du cycle
        console.log('📋 Vérification window.loadAndDisplayRecommendations:', typeof window.loadAndDisplayRecommendations);
        const recoContainer = document.getElementById('recommendationsContainer');
        console.log('📋 Conteneur recommendationsContainer trouvé:', !!recoContainer);
        
        if (typeof window.loadAndDisplayRecommendations === 'function') {
            console.log('📋 Appel loadAndDisplayRecommendations avec playerId:', window.currentPlayer.id);
            setTimeout(() => {
                console.log('📋 Exécution de loadAndDisplayRecommendations...');
                window.loadAndDisplayRecommendations(window.currentPlayer.id);
            }, 500);
        } else {
            console.warn('⚠️ loadAndDisplayRecommendations non disponible');
        }
        
        // Charger l'historique RPE
        if (typeof loadRpeHistoryList === 'function') {
            setTimeout(loadRpeHistoryList, 300);
        }
        
        // Charger l'historique des check-ins
        setTimeout(loadPlayerCheckinHistory, 300);
        
        // === GAMIFICATION : Vérifier et réinitialiser les stats hebdomadaires si nécessaire ===
        if (typeof checkAndResetWeeklyStats === 'function') {
            await checkAndResetWeeklyStats(appState.currentUser);
        }
        
        // === GAMIFICATION : Synchroniser le streak de check-in avec l'historique réel ===
        if (typeof syncCheckInStreak === 'function') {
            await syncCheckInStreak(appState.currentUser);
        }
        
        // === GAMIFICATION : Charger les widgets flammes et progression ===
        if (typeof displayStreakWidget === 'function') {
            setTimeout(() => displayStreakWidget(appState.currentUser), 400);
        }
        if (typeof displayTrainingWidget === 'function') {
            setTimeout(() => displayTrainingWidget(appState.currentUser), 400);
        }
        
        // === GAMIFICATION : Charger le widget stickers ===
        if (typeof displayStickerWidget === 'function') {
            setTimeout(() => displayStickerWidget(appState.currentUser), 400);
        }

        // === DOULEURS : Vérifier les douleurs actives à confirmer ===
        setTimeout(() => checkActivePainsForCheckin(), 600);

    } catch (error) {
        console.error('Erreur lors du chargement du dashboard:', error);
    }
}

// Fonction pour charger l'historique des check-ins de la joueuse
async function loadPlayerCheckinHistory() {
    const historyList = document.getElementById('checkinHistoryList');
    if (!historyList || !appState.currentUser) return;
    
    try {
        const checkinsSnapshot = await db.collection('checkins')
            .where('playerId', '==', appState.currentUser)
            .orderBy('date', 'desc')
            .get();
        
        if (checkinsSnapshot.empty) {
            historyList.innerHTML = '<div style="text-align: center; color: var(--color-text-secondary); padding: 20px;">Aucun check-in enregistré</div>';
            return;
        }
        
        // Déduplication par date (garder le plus récent)
        const checkinsMap = new Map();
        checkinsSnapshot.forEach(doc => {
            const data = doc.data();
            const date = data.date;
            
            if (!checkinsMap.has(date)) {
                checkinsMap.set(date, data);
            } else {
                const existing = checkinsMap.get(date);
                const existingTime = existing.timestamp?.seconds || 0;
                const currentTime = data.timestamp?.seconds || 0;
                if (currentTime > existingTime) {
                    checkinsMap.set(date, data);
                }
            }
        });
        
        // Limiter à 8 résultats après déduplication
        const checkinsArray = Array.from(checkinsMap.entries())
            .sort((a, b) => b[0].localeCompare(a[0]))
            .slice(0, 8);
        
        // Fonction pour obtenir la couleur du texte selon la valeur
        const getColorStyle = (value, inverse = false) => {
            if (value === null || value === undefined) return '';
            let color;
            if (inverse) {
                // Pour courbatures et stress (bas = bon)
                if (value <= 3) color = 'var(--color-success)'; // vert
                else if (value <= 6) color = 'var(--color-warning)'; // orange
                else color = 'var(--color-error)'; // rouge
            } else {
                // Pour sommeil, humeur, énergie (haut = bon)
                if (value >= 7) color = 'var(--color-success)'; // vert
                else if (value >= 4) color = 'var(--color-warning)'; // orange
                else color = 'var(--color-error)'; // rouge
            }
            return `color: ${color}; font-weight: 600;`;
        };
        
        // Créer le tableau au format popup coach
        let html = `
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                    <tr style="background: var(--color-background);">
                        <th style="text-align: left; padding: 12px 8px; color: var(--color-text-secondary); font-weight: 500; border-bottom: 1px solid var(--color-border);">Date</th>
                        <th style="text-align: left; padding: 12px 8px; color: var(--color-text-secondary); font-weight: 500; border-bottom: 1px solid var(--color-border);">Sommeil</th>
                        <th style="text-align: left; padding: 12px 8px; color: var(--color-text-secondary); font-weight: 500; border-bottom: 1px solid var(--color-border);">Courbatures</th>
                        <th style="text-align: left; padding: 12px 8px; color: var(--color-text-secondary); font-weight: 500; border-bottom: 1px solid var(--color-border);">Stress</th>
                        <th style="text-align: left; padding: 12px 8px; color: var(--color-text-secondary); font-weight: 500; border-bottom: 1px solid var(--color-border);">Humeur</th>
                        <th style="text-align: left; padding: 12px 8px; color: var(--color-text-secondary); font-weight: 500; border-bottom: 1px solid var(--color-border);">Énergie</th>
                        <th style="text-align: left; padding: 12px 8px; color: var(--color-text-secondary); font-weight: 500; border-bottom: 1px solid var(--color-border);">Score</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        checkinsArray.forEach(([date, data]) => {
            const dateObj = new Date(date);
            const dateStr = dateObj.toLocaleDateString('fr-FR');
            
            const sleep = data.sleepQuality || data.sleep || 5;
            const soreness = data.soreness || 5;
            const stress = data.stress || 5;
            const mood = data.mood || 5;
            const energy = data.energy !== undefined ? data.energy : null;
            
            // Calcul du score
            let score;
            if (energy !== null) {
                score = Math.round((sleep + (11 - soreness) + (11 - stress) + mood + energy) / 5 * 10);
            } else {
                score = Math.round((sleep + (11 - soreness) + (11 - stress) + mood) / 4 * 10);
            }
            
            let scoreClass = 'color: var(--color-error);';
            if (score >= 80) scoreClass = 'color: var(--color-success);';
            else if (score >= 60) scoreClass = 'color: var(--color-warning);';
            
            // Récupérer les symptômes menstruels > 4
            const symptoms = data.symptoms || {};
            const symptomLabels = {
                cramps: { label: 'Crampes', icon: '🩸' },
                headache: { label: 'Maux de tête', icon: '🤕' },
                fatigue: { label: 'Fatigue', icon: '😴' },
                moodSwings: { label: 'Humeur', icon: '😢' },
                bloating: { label: 'Ballonnements', icon: '🎈' },
                backPain: { label: 'Dos', icon: '🔙' },
                breastTenderness: { label: 'Sensibilité', icon: '⚠️' }
            };
            
            const highSymptoms = [];
            Object.entries(symptoms).forEach(([key, value]) => {
                if (value > 4 && symptomLabels[key]) {
                    highSymptoms.push(`${symptomLabels[key].icon} ${symptomLabels[key].label}: ${value}/10`);
                }
            });
            
            // SPM (symptômes pré-menstruels)
            const spmSymptoms = data.spmSymptoms || [];
            const spmLabels = {
                spmCramps: 'Crampes SPM',
                spmIrritability: 'Irritabilité',
                spmBloating: 'Ballonnements SPM',
                spmHeadache: 'Maux de tête SPM',
                spmFatigue: 'Fatigue SPM'
            };
            
            const highSpmSymptoms = [];
            if (Array.isArray(spmSymptoms)) {
                spmSymptoms.forEach(spm => {
                    if (spmLabels[spm]) {
                        highSpmSymptoms.push(`🔸 ${spmLabels[spm]}`);
                    }
                });
            }
            
            const symptomsHtml = (highSymptoms.length > 0 || highSpmSymptoms.length > 0) ? `
                <tr>
                    <td colspan="7" style="padding: 8px 16px; background: var(--color-error-bg, #fef2f2); border-bottom: 1px solid var(--color-border); font-size: 12px; color: var(--color-error-text, #991b1b);">
                        ${highSymptoms.length > 0 ? `<div style="margin-bottom: 4px;"><strong>Symptômes :</strong> ${highSymptoms.join(' • ')}</div>` : ''}
                        ${highSpmSymptoms.length > 0 ? `<div><strong>SPM :</strong> ${highSpmSymptoms.join(' • ')}</div>` : ''}
                    </td>
                </tr>
            ` : '';
            
            html += `
                <tr>
                    <td style="padding: 12px 8px; border-bottom: ${symptomsHtml ? '0' : '1px solid var(--color-border)'};">${dateStr}</td>
                    <td style="padding: 12px 8px; border-bottom: ${symptomsHtml ? '0' : '1px solid var(--color-border)'}; ${getColorStyle(sleep)}">${sleep}/10</td>
                    <td style="padding: 12px 8px; border-bottom: ${symptomsHtml ? '0' : '1px solid var(--color-border)'}; ${getColorStyle(soreness, true)}">${soreness}/10</td>
                    <td style="padding: 12px 8px; border-bottom: ${symptomsHtml ? '0' : '1px solid var(--color-border)'}; ${getColorStyle(stress, true)}">${stress}/10</td>
                    <td style="padding: 12px 8px; border-bottom: ${symptomsHtml ? '0' : '1px solid var(--color-border)'}; ${getColorStyle(mood)}">${mood}/10</td>
                    <td style="padding: 12px 8px; border-bottom: ${symptomsHtml ? '0' : '1px solid var(--color-border)'}; ${energy !== null ? getColorStyle(energy) : ''}">${energy !== null ? energy + '/10' : '--'}</td>
                    <td style="padding: 12px 8px; border-bottom: ${symptomsHtml ? '0' : '1px solid var(--color-border)'}; font-weight: 600; ${scoreClass}">${score}%</td>
                </tr>
                ${symptomsHtml}
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        historyList.innerHTML = html;
    } catch (error) {
        console.error('Erreur chargement historique check-ins:', error);
        historyList.innerHTML = '<div style="text-align: center; color: var(--color-error); padding: 20px;">Erreur de chargement</div>';
    }
}

// Gestion du formulaire de check-in
document.getElementById('checkinForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // VÉRIFIER SI ON EST EN PÉRIODE DE REPOS
    const today = new Date().toISOString().split('T')[0];
    if (typeof window.isRestDay === 'function') {
        const restInfo = window.isRestDay(today);
        if (restInfo && restInfo.isRest) {
            alert('⏸️ ' + restInfo.message + '\n\nLe check-in est bloqué pendant cette période.\nLe formulaire RPE reste accessible pour enregistrer vos activités sportives.');
            return; // Bloquer la soumission
        }
    }
    
    // Récupérer les valeurs
    const sleepValue = parseInt(document.getElementById('sleepQuality').value);
    const sorenessValue = parseInt(document.getElementById('soreness').value);
    const stressValue = parseInt(document.getElementById('stress').value);
    const moodValue = parseInt(document.getElementById('mood').value);
    const energyValue = parseInt(document.getElementById('energy').value);
    
    // Vérifier que toutes les valeurs ont été sélectionnées (pas 0)
    if (sleepValue === 0 || sorenessValue === 0 || stressValue === 0 || moodValue === 0 || energyValue === 0) {
        alert('Veuillez sélectionner une valeur pour chaque critère (cliquez sur une pastille).');
        return;
    }
    
    const comment = document.getElementById('checkinComment') ? document.getElementById('checkinComment').value.trim() : '';
    
    const checkinData = {
        playerId: appState.currentUser,
        date: new Date().toISOString().split('T')[0],
        sleep: sleepValue,
        soreness: sorenessValue,
        stress: stressValue,
        mood: moodValue,
        energy: energyValue,
        comment: comment || null,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Ajouter les données du cycle si disponibles
    if (typeof window.getCycleDataForCheckin === 'function') {
        const cycleData = window.getCycleDataForCheckin();
        Object.assign(checkinData, cycleData);
        console.log('Données cycle ajoutées:', cycleData);
        
        // Si la joueuse a cliqué sur un jour J1-J8, mettre à jour la config cycle
        if (cycleData.dayOfCycle >= 1 && cycleData.dayOfCycle <= 8 && cycleData.hasPeriod === true) {
            console.log(`🩸 Mise à jour config cycle: J${cycleData.dayOfCycle} → calculer J1`);
            if (typeof window.updateCycleStartFromDay === 'function') {
                await window.updateCycleStartFromDay(cycleData.dayOfCycle);
            }
        }
    }
    
    try {
        await db.collection('checkins').add(checkinData);

        // === DOULEUR : Enregistrer si déclarée dans le formulaire ===
        const painData = getCheckinPainData();
        if (painData) {
            const today2 = new Date().toISOString().split('T')[0];
            await db.collection('pains').add({
                playerId: appState.currentUser,
                playerName: window.currentPlayer?.name || appState.currentUser,
                bodyZone: painData.zone,
                intensity: painData.intensity,
                description: painData.description,
                daysSince: painData.daysSince,
                source: 'checkin',
                teamCode: 'pole',
                lastConfirmedDate: today2,
                confirmationHistory: [{ date: today2, intensity: painData.intensity }],
                painDate: firebase.firestore.Timestamp.fromDate(new Date()),
                status: 'active',
                recoveryDate: null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        resetCheckinPainForm();
        // Remettre le bouton toggle en état "Aucune douleur"
        const painToggleBtn = document.getElementById('painToggleBtn');
        if (painToggleBtn) {
            painToggleBtn.textContent = '✅ Aucune douleur';
            painToggleBtn.style.background = '#f3f4f6';
            painToggleBtn.style.color = '#6b7280';
            painToggleBtn.style.borderColor = '#e5e7eb';
        }

        // === GAMIFICATION : Vérifier et attribuer les stickers ===
        if (typeof checkAndAwardStickers === 'function') {
            await checkAndAwardStickers(appState.currentUser, 'checkin');
        }
        
        // === GAMIFICATION : Mise à jour du streak check-in ===
        if (typeof updateCheckInStreak === 'function') {
            const streakResult = await updateCheckInStreak(appState.currentUser);
            if (streakResult && streakResult.message && !streakResult.alreadyDone) {
                // Afficher la célébration
                if (typeof showStreakCelebration === 'function') {
                    setTimeout(() => showStreakCelebration(streakResult), 500);
                }
            }
            // Rafraîchir le widget flammes
            if (typeof displayStreakWidget === 'function') {
                displayStreakWidget(appState.currentUser);
            }
        }
        
        // Message de succès géré par cycle-checkin.js
        document.getElementById('checkinForm').reset();
        // Réinitialiser les pastilles après soumission
        if (typeof refreshRatingBadges === 'function') {
            refreshRatingBadges();
        }
        if (document.getElementById('commentCount')) {
            document.getElementById('commentCount').textContent = '0';
        }
        loadPlayerDashboard();
        loadPlayerCheckinHistory(); // Rafraîchir l'historique
        
        // Retourner au dashboard après enregistrement
        switchTab('dashboard');
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement du check-in:', error);
        alert('Erreur lors de l\'enregistrement. Veuillez réessayer.');
    }
});

// ===================================================
// MODULE DOULEUR — CHECK-IN JOUEUSE
// ===================================================

/** Afficher le formulaire douleur dans le check-in */
function showCheckinPainForm() {
    const form = document.getElementById('painCheckinForm');
    if (form) form.style.display = 'block';
}

/** Masquer le formulaire douleur SANS réinitialiser (appelé seul) */
function hideCheckinPainForm() {
    const form = document.getElementById('painCheckinForm');
    if (form) form.style.display = 'none';
}

/**
 * Toggle le formulaire douleur via le bouton discret.
 * Par défaut : "Aucune douleur" (fermé). Si on clique, ça ouvre le formulaire.
 */
function toggleCheckinPainForm() {
    const form = document.getElementById('painCheckinForm');
    const btn = document.getElementById('painToggleBtn');
    if (!form) return;

    const isOpen = form.style.display !== 'none';
    if (isOpen) {
        // Fermer et réinitialiser
        resetCheckinPainForm();
        if (btn) { btn.textContent = '✅ Aucune douleur'; btn.style.background = '#f3f4f6'; btn.style.color = '#6b7280'; }
    } else {
        // Ouvrir
        form.style.display = 'block';
        if (btn) { btn.textContent = '🤕 Signaler une douleur'; btn.style.background = '#fff7ed'; btn.style.color = '#92400e'; btn.style.borderColor = '#fed7aa'; }
    }
}

/** Sélectionner l'intensité de la douleur (pastilles) */
function selectPainIntensity(value) {
    document.getElementById('checkinPainIntensity').value = value;
    const labels = ['', 'Légère', 'Légère', 'Modérée', 'Modérée', 'Modérée', 'Importante', 'Importante', 'Forte', 'Très forte', 'Insupportable'];
    const colors = ['', '#10b981', '#10b981', '#84cc16', '#84cc16', '#f59e0b', '#f59e0b', '#f59e0b', '#ef4444', '#dc2626', '#dc2626'];
    const labelEl = document.getElementById('checkinPainIntensityLabel');
    if (labelEl) labelEl.textContent = `${value}/10 — ${labels[value] || ''}`;

    document.querySelectorAll('.pain-intensity-btn').forEach(btn => {
        const v = parseInt(btn.dataset.value);
        if (v <= value) {
            btn.style.background = colors[value] || '#f59e0b';
            btn.style.color = 'white';
            btn.style.borderColor = colors[value] || '#f59e0b';
        } else {
            btn.style.background = 'white';
            btn.style.color = '#374151';
            btn.style.borderColor = '#e5e7eb';
        }
    });
}

/** Lire les données du formulaire douleur. Retourne null si non rempli. */
function getCheckinPainData() {
    const form = document.getElementById('painCheckinForm');
    if (!form || form.style.display === 'none') return null;

    const zone = document.getElementById('checkinPainZone')?.value;
    if (!zone) return null;

    const intensity = parseInt(document.getElementById('checkinPainIntensity')?.value) || null;
    if (!intensity || intensity === 0) return null;

    const daysSince = parseInt(document.getElementById('checkinPainDaysSince')?.value) || 1;
    const description = document.getElementById('checkinPainDescription')?.value.trim() || '';

    return { zone, intensity, daysSince, description };
}

/** Réinitialiser le formulaire douleur après soumission (sans appeler hideCheckinPainForm) */
function resetCheckinPainForm() {
    const zoneEl = document.getElementById('checkinPainZone');
    const intensityEl = document.getElementById('checkinPainIntensity');
    const daysSinceEl = document.getElementById('checkinPainDaysSince');
    const descEl = document.getElementById('checkinPainDescription');
    const labelEl = document.getElementById('checkinPainIntensityLabel');

    if (zoneEl) zoneEl.value = '';
    if (intensityEl) intensityEl.value = '0';
    if (daysSinceEl) daysSinceEl.value = '1';
    if (descEl) descEl.value = '';
    if (labelEl) labelEl.textContent = 'Aucune sélection';

    document.querySelectorAll('.pain-intensity-btn').forEach(btn => {
        btn.style.background = 'white';
        btn.style.color = '#374151';
        btn.style.borderColor = '#e5e7eb';
    });

    // Masquer le formulaire DIRECTEMENT (pas via hideCheckinPainForm pour éviter la récursion)
    const form = document.getElementById('painCheckinForm');
    if (form) form.style.display = 'none';
}

/** Vérifier les douleurs actives à confirmer au check-in */
async function checkActivePainsForCheckin() {
    const playerId = appState.currentUser;
    if (!playerId || typeof getActivePainsForPlayer !== 'function') return;

    try {
        const today = new Date().toISOString().split('T')[0];
        const activePains = await getActivePainsForPlayer(playerId);

        // Filtrer celles pas encore confirmées aujourd'hui
        const unconfirmed = activePains.filter(p => p.lastConfirmedDate !== today);
        if (unconfirmed.length === 0) return;

        displayPainConfirmationSection(unconfirmed);
    } catch (error) {
        console.warn('Erreur checkActivePainsForCheckin:', error);
    }
}

/** Afficher la section de confirmation des douleurs en cours */
function displayPainConfirmationSection(pains) {
    const section = document.getElementById('painConfirmationSection');
    if (!section) return;

    const PAIN_ZONE_LABELS = {
        head: 'Tête', neck: 'Cou', shoulder: 'Épaule', elbow: 'Coude',
        wrist: 'Poignet', hand: 'Main/Doigts', back: 'Dos', lower_back: 'Bas du dos',
        hip: 'Hanche', thigh: 'Cuisse', knee: 'Genou', calf: 'Mollet',
        ankle: 'Cheville', foot: 'Pied', finger: 'Doigt', other: 'Autre'
    };

    let html = `<div style="background:#fef3c7;padding:16px;border-radius:12px;border-left:4px solid #f59e0b;margin-bottom:8px;">
        <div style="font-size:14px;font-weight:600;color:#92400e;margin-bottom:12px;">⚠️ Tu avais signalé ${pains.length > 1 ? 'ces douleurs' : 'cette douleur'} — comment ça va aujourd'hui ?</div>`;

    pains.forEach(pain => {
        const zone = PAIN_ZONE_LABELS[pain.bodyZone] || pain.bodyZone;
        const painDate = pain.painDate?.toDate?.() || new Date(pain.painDate);
        const duration = Math.ceil((new Date() - painDate) / (1000 * 60 * 60 * 24));
        const intensityLabel = pain.intensity ? ` (${pain.intensity}/10)` : '';

        html += `<div id="painConfirm_${pain.id}" style="background:white;padding:12px;border-radius:8px;margin-bottom:8px;">
            <div style="font-size:13px;font-weight:600;margin-bottom:8px;">🤕 ${zone}${intensityLabel} — depuis ${duration} j</div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <span style="font-size:12px;color:#6b7280;">Intensité actuelle :</span>
                ${[1,2,3,4,5,6,7,8,9,10].map(v => `
                    <button type="button" onclick="confirmPainStillHere('${pain.id}',${v})"
                        style="width:26px;height:26px;padding:0;border:2px solid #e5e7eb;background:white;border-radius:50%;cursor:pointer;font-size:11px;font-weight:600;" class="confirm-intensity-${pain.id}"
                        data-val="${v}">${v}</button>`).join('')}
            </div>
            <div style="display:flex;gap:8px;margin-top:8px;">
                <button type="button" onclick="confirmPainGone('${pain.id}')" style="padding:6px 14px;background:#10b981;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">
                    ✅ C'est passé !
                </button>
            </div>
        </div>`;
    });

    html += '</div>';
    section.innerHTML = html;
    section.style.display = 'block';
}

/** La joueuse confirme que la douleur continue avec une intensité */
async function confirmPainStillHere(painId, intensity) {
    // Mettre à jour visuellement
    document.querySelectorAll(`.confirm-intensity-${painId}`).forEach(btn => {
        const v = parseInt(btn.dataset.val);
        const color = intensity >= 8 ? '#dc2626' : intensity >= 5 ? '#f59e0b' : '#10b981';
        if (v <= intensity) {
            btn.style.background = color;
            btn.style.color = 'white';
            btn.style.borderColor = color;
        } else {
            btn.style.background = 'white';
            btn.style.color = '#374151';
            btn.style.borderColor = '#e5e7eb';
        }
    });

    if (typeof confirmPainContinues === 'function') {
        await confirmPainContinues(painId, intensity);
        // Masquer cette entrée après confirmation
        setTimeout(() => {
            const el = document.getElementById(`painConfirm_${painId}`);
            if (el) el.style.opacity = '0.5';
        }, 500);
    }
}

/** La joueuse indique que la douleur est passée */
async function confirmPainGone(painId) {
    if (typeof markPainResolvedFromCheckin === 'function') {
        await markPainResolvedFromCheckin(painId);
        const el = document.getElementById(`painConfirm_${painId}`);
        if (el) {
            el.innerHTML = '<div style="font-size:13px;color:#10b981;font-weight:600;padding:4px;">✅ Super ! Marquée comme rétablie.</div>';
        }
    }
}

// Exposer les fonctions globales
window.showCheckinPainForm = showCheckinPainForm;
window.hideCheckinPainForm = hideCheckinPainForm;
window.toggleCheckinPainForm = toggleCheckinPainForm;
window.resetCheckinPainForm = resetCheckinPainForm;
window.selectPainIntensity = selectPainIntensity;
window.confirmPainStillHere = confirmPainStillHere;
window.confirmPainGone = confirmPainGone;

// Gestion du formulaire RPE
document.getElementById('rpeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const sessionType = document.getElementById('sessionType').value;
    const rpeValue = parseInt(document.getElementById('rpeValue').value);
    const duration = parseInt(document.getElementById('duration').value);
    const performanceValue = parseInt(document.getElementById('performance').value);
    
    // Vérifier que le type de session est sélectionné
    if (!sessionType) {
        alert('Veuillez sélectionner un type de session.');
        return;
    }
    
    // Vérifier que l'effort ressenti a été sélectionné (pas 0)
    if (rpeValue === 0 || isNaN(rpeValue)) {
        alert('Veuillez sélectionner une valeur pour l\'effort ressenti (cliquez sur une pastille).');
        return;
    }
    
    // Vérifier la durée
    if (!duration || duration <= 0) {
        alert('Veuillez entrer une durée valide.');
        return;
    }
    
    // Vérifier que la performance a été sélectionnée (pas 0)
    if (performanceValue === 0 || isNaN(performanceValue)) {
        alert('Veuillez sélectionner une valeur pour votre performance (cliquez sur une pastille).');
        return;
    }
    
    const rpeComment = document.getElementById('rpeComment') ? document.getElementById('rpeComment').value.trim() : '';
    const today = new Date().toISOString().split('T')[0];
    
    // Récupérer les données spécifiques au match (si applicable)
    let matchWon = null;
    let matchScore = null;
    let timePlayed = null;
    
    if (sessionType === 'Match') {
        matchWon = document.getElementById('matchWon') ? document.getElementById('matchWon').value : null;
        matchScore = document.getElementById('matchScore') ? document.getElementById('matchScore').value : null;
        timePlayed = document.getElementById('timePlayed') ? document.getElementById('timePlayed').value : null;

        // Temps de jeu obligatoire pour un match
        if (timePlayed === null || timePlayed === '') {
            alert('Veuillez sélectionner ton temps de jeu (même 0% si tu n\'es pas rentré en jeu).');
            return;
        }
    }
    
    try {
        // CAS SPÉCIAL: Muscu+Volley → Créer 2 entrées RPE
        if (sessionType === 'Muscu+Volley') {
            const muscuDuration = 45; // Toujours 45 min de muscu
            const volleyDuration = duration - muscuDuration; // Le reste en volley
            
            if (volleyDuration <= 0) {
                alert('La durée totale doit être supérieure à 45 minutes pour Muscu + Volley.');
                return;
            }
            
            // 1. Entrée Prépa Physique (45 min)
            const muscuData = {
                playerId: appState.currentUser,
                date: today,
                sessionType: 'Preparation Physique',
                rpe: rpeValue,
                duration: muscuDuration,
                load: rpeValue * muscuDuration,
                performance: performanceValue,
                comment: rpeComment ? `[Muscu+Volley] ${rpeComment}` : '[Muscu+Volley]',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // 2. Entrée Entraînement Volley (le reste)
            const volleyData = {
                playerId: appState.currentUser,
                date: today,
                sessionType: 'Entrainement',
                rpe: rpeValue,
                duration: volleyDuration,
                load: rpeValue * volleyDuration,
                performance: performanceValue,
                comment: rpeComment ? `[Muscu+Volley] ${rpeComment}` : '[Muscu+Volley]',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Enregistrer les 2 entrées
            await db.collection('rpe').add(muscuData);
            await db.collection('rpe').add(volleyData);
            
            let successMessage = `RPE Muscu + Volley enregistré !\n• Prépa Physique: 45 min\n• Entraînement: ${volleyDuration} min`;
            if (performanceValue < 5) {
                successMessage += `\n\n✨ ${getRandomEncouragementQuote()}`;
            } else {
                successMessage += `\n\n🎉 ${getRandomCongratulationsQuote()}`;
            }
            showTemporaryMessage(successMessage, 'success');
            
        } else {
            // CAS NORMAL: Une seule entrée
            const rpeData = {
                playerId: appState.currentUser,
                date: today,
                sessionType: sessionType,
                rpe: rpeValue,
                duration: duration,
                load: rpeValue * duration,
                performance: performanceValue,
                comment: rpeComment || null,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Ajouter les données de match si applicable
            if (sessionType === 'Match' && matchWon) {
                rpeData.matchWon = matchWon === 'oui';
                rpeData.matchScore = matchScore || null;
                rpeData.timePlayed = timePlayed || null;
            }
            
            await db.collection('rpe').add(rpeData);
            
            // === GAMIFICATION : Vérifier et attribuer les stickers ===
            if (typeof checkAndAwardStickers === 'function') {
                await checkAndAwardStickers(appState.currentUser, 'rpe');
            }
            
            // === GAMIFICATION : Mise à jour du streak entraînement ===
            if (typeof updateTrainingStreak === 'function') {
                const trainingResult = await updateTrainingStreak(appState.currentUser);
                if (trainingResult && trainingResult.message) {
                    // Afficher le toast de progression
                    if (typeof showTrainingCelebration === 'function') {
                        setTimeout(() => showTrainingCelebration(trainingResult), 500);
                    }
                }
                // Rafraîchir le widget progression
                if (typeof displayTrainingWidget === 'function') {
                    displayTrainingWidget(appState.currentUser);
                }
            }
            
            // Personnaliser le message selon le contexte
            let successMessage = 'RPE enregistré avec succès !';
            let motivationQuote = '';
            
            if (sessionType === 'Match' && matchWon) {
                // Message personnalisé pour les matchs
                if (matchWon === 'oui') {
                    motivationQuote = getRandomVictoryQuote();
                } else if (matchWon === 'non') {
                    motivationQuote = getRandomDefeatQuote();
                }
                
                // Si faible temps de jeu (< 50%), prioriser ce message
                if (timePlayed && parseInt(timePlayed) < 50) {
                    motivationQuote = getRandomLowPlayingTimeQuote();
                }
            } else {
                // Messages standards pour entraînements
                if (performanceValue < 5) {
                    motivationQuote = getRandomEncouragementQuote();
                } else {
                    motivationQuote = getRandomCongratulationsQuote();
                }
            }
            
            successMessage += `\n\n✨ ${motivationQuote}`;
            showTemporaryMessage(successMessage, 'success');
        }
        
        // Réinitialiser le formulaire
        document.getElementById('rpeForm').reset();
        if (typeof resetRpeForm === 'function') {
            resetRpeForm();
        }
        if (typeof refreshRatingBadges === 'function') {
            refreshRatingBadges();
        }
        if (document.getElementById('rpeCommentCount')) {
            document.getElementById('rpeCommentCount').textContent = '0';
        }
        
        // Rafraîchir les graphiques du dashboard
        if (typeof refreshPlayerDashboardCharts === 'function') {
            refreshPlayerDashboardCharts();
        }
        
        // Rafraîchir l'historique RPE
        if (typeof loadRpeHistoryList === 'function') {
            loadRpeHistoryList();
        }
        
        // Rafraîchir les stats de volume
        if (typeof updatePlayerVolumeStats === 'function') {
            updatePlayerVolumeStats(appState.currentUser);
        }
        
        switchTab('dashboard');
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement du RPE:', error);
        alert('Erreur lors de l\'enregistrement. Veuillez réessayer.');
    }
});

// Mise à jour des valeurs des sliders
document.getElementById('sleepQuality').addEventListener('input', (e) => {
    document.getElementById('sleepValue').textContent = e.target.value;
});

document.getElementById('soreness').addEventListener('input', (e) => {
    document.getElementById('sorenessValue').textContent = e.target.value;
});

document.getElementById('stress').addEventListener('input', (e) => {
    document.getElementById('stressValue').textContent = e.target.value;
});

document.getElementById('mood').addEventListener('input', (e) => {
    document.getElementById('moodValue').textContent = e.target.value;
});

document.getElementById('rpeValue').addEventListener('input', (e) => {
    document.getElementById('rpeValueDisplay').textContent = e.target.value;
});

// Charger le dashboard coach
async function loadCoachDashboard() {
    console.log('🎯 loadCoachDashboard: Début du chargement...');
    
    // Vider le cache des phases de cycle pour forcer le recalcul
    window.playersPhaseCache = {};
    
    try {
        const playersSnapshot = await db.collection('players').get();
        
        // Calculer les statistiques de volume pour toutes les joueuses
        const volumeStats = typeof calculateAllPlayersVolumeStats === 'function' 
            ? await calculateAllPlayersVolumeStats() 
            : {};
        
        // Paralléliser les requêtes de statut pour toutes les joueuses
        const players = await Promise.all(playersSnapshot.docs.map(async (doc) => {
            const playerData = doc.data();
            const status = await getPlayerStatus(doc.id);
            const volume = volumeStats[doc.id] || { weekly: 0, monthly: 0, yearly: 0 };
            
            return {
                id: doc.id,
                name: playerData.name,
                birthday: playerData.birthday,
                photoURL: playerData.photoURL,
                score: status.score,
                status: status.status,
                weeklyHours: volume.weekly,
                monthlyHours: volume.monthly,
                yearlyHours: volume.yearly
            };
        }));
        
        // Trier par score décroissant
        players.sort((a, b) => b.score - a.score);
        
        // Calculer les phases du cycle et mettre à jour les compteurs
        await updatePhaseCounts(players);
        
        // Filtrer par phase si nécessaire
        const filteredByPhase = filterPlayersByPhase(players);
        
        // Afficher la grille
        displayTeamGrid(filteredByPhase);
        
        // Mettre à jour les compteurs
        updateFilterCounts(players);
        
        // Charger les notifications d'anniversaire pour le coach
        console.log('🎯 loadCoachDashboard: Vérification des anniversaires...');
        console.log('🎯 loadCoachDashboard: checkAndDisplayBirthdayNotifications existe?', typeof checkAndDisplayBirthdayNotifications);
        if (typeof checkAndDisplayBirthdayNotifications === 'function') {
            console.log('🎯 loadCoachDashboard: Appel de checkAndDisplayBirthdayNotifications...');
            await checkAndDisplayBirthdayNotifications('coach', 'coach');
        }
        
        // Charger les graphiques de charge d'entraînement coach
        if (typeof initCoachCharts === 'function') {
            setTimeout(initCoachCharts, 300);
        }
        
        // Initialiser le système de notifications coach
        if (typeof initCoachNotificationSystem === 'function') {
            setTimeout(initCoachNotificationSystem, 500);
        }
        
        // Charger les alertes coach (popup de vigilance) - délai plus long pour s'assurer que le script est chargé
        setTimeout(() => {
            console.log('Coach Dashboard: Tentative chargement alertes, initCoachAlerts existe:', typeof initCoachAlerts === 'function');
            if (typeof initCoachAlerts === 'function') {
                initCoachAlerts();
            } else {
                console.warn('Coach Dashboard: initCoachAlerts non disponible');
            }
            
            // Charger les alertes santé (Aménorrhée, RED-S)
            console.log('Coach Dashboard: Tentative chargement alertes santé, initHealthAlerts existe:', typeof initHealthAlerts === 'function');
            if (typeof initHealthAlerts === 'function') {
                initHealthAlerts();
            } else {
                console.warn('Coach Dashboard: initHealthAlerts non disponible');
            }
            
            // Charger les phases du cycle pour chaque joueuse
            if (typeof loadAllPlayersCyclePhases === 'function') {
                loadAllPlayersCyclePhases();
            }
        }, 1000);
        
    } catch (error) {
        console.error('Erreur lors du chargement du dashboard coach:', error);
    }
}

// Obtenir le statut d'une joueuse
async function getPlayerStatus(playerId) {
    const today = new Date().toISOString().split('T')[0];
    
    const checkinSnapshot = await db.collection('checkins')
        .where('playerId', '==', playerId)
        .where('date', '==', today)
        .limit(1)
        .get();
    
    if (checkinSnapshot.empty) {
        return { score: 0, status: 'critical' };
    }
    
    const checkin = checkinSnapshot.docs[0].data();
    
    // Calcul avec énergie si disponible, sinon sans
    let score;
    if (checkin.energy !== undefined && checkin.energy !== null) {
        score = Math.round((checkin.sleep + (10 - checkin.soreness) + (10 - checkin.stress) + checkin.mood + checkin.energy) / 5);
    } else {
        score = Math.round((checkin.sleep + (10 - checkin.soreness) + (10 - checkin.stress) + checkin.mood) / 4);
    }
    
    let status = 'critical';
    if (score >= 7) status = 'optimal';
    else if (score >= 5) status = 'attention';
    
    return { score, status };
}

// Afficher la grille des joueuses
function displayTeamGrid(players) {
    const grid = document.getElementById('teamGrid');
    grid.innerHTML = '';
    
    const filteredPlayers = appState.currentFilter === 'all' 
        ? players 
        : players.filter(p => p.status === appState.currentFilter);
    
    filteredPlayers.forEach(player => {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.style.cursor = 'pointer';
        
        // Gestionnaire de clic pour ouvrir le popup
        card.onclick = () => {
            if (typeof showPlayerDetail === 'function') {
                showPlayerDetail(player.id);
            }
        };
        
        // Générer les initiales
        const initials = player.name.split(' ').map(n => n[0]).join('').substring(0, 2);
        
        // Photo ou initiales (avec fallback si l'image ne charge pas)
        const avatarContent = player.photoURL 
            ? `<img src="${player.photoURL}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" alt="${player.name}" onerror="this.style.display='none'; this.parentElement.textContent='${initials}';">`
            : initials;
        
        card.setAttribute('data-status', player.status);
        card.innerHTML = `
            <div class="player-score-badge player-score-badge--${player.status}">${player.score}</div>
            <div class="player-avatar-circle">
                ${avatarContent}
            </div>
            <div class="player-card-info">
                <div class="player-card-name">
                    <span class="status-dot status-dot--${player.status}"></span>${player.name}
                </div>
                <div class="status-gauge" style="margin-top: 6px;">
                    <div class="status-gauge-fill ${player.status}" style="width: ${player.score * 10}%"></div>
                </div>
                <div class="player-hours" style="border-top: 1px solid var(--color-border); padding-top: 8px; margin-top: 8px;">
                    <span class="player-hours-item">
                        <i class="fas fa-calendar-week"></i>
                        <strong>${player.weeklyHours.toFixed(1)}h</strong>
                    </span>
                    <span class="player-hours-item">
                        <i class="fas fa-calendar-alt"></i>
                        <strong>${player.monthlyHours.toFixed(1)}h</strong>
                    </span>
                    <span class="player-hours-item">
                        <i class="fas fa-chart-line"></i>
                        <strong>${player.yearlyHours.toFixed(0)}h</strong>
                    </span>
                </div>
                <div id="cyclePhase-${player.id}" class="player-cycle-phase" style="background: ${getPhaseBackground(player.cyclePhase)};">
                    ${getPhaseDisplay(player.cyclePhase, player.cycleDay)}
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
    
    if (filteredPlayers.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); padding: var(--space-48);">Aucune joueuse dans cette catégorie</p>';
    }
}

// Mettre à jour les compteurs de filtres + KPI
function updateFilterCounts(players) {
    const counts = {
        all: players.length,
        optimal: players.filter(p => p.status === 'optimal').length,
        attention: players.filter(p => p.status === 'attention').length,
        critical: players.filter(p => p.status === 'critical').length
    };

    document.getElementById('countAll').textContent = counts.all;
    document.getElementById('countOptimal').textContent = counts.optimal;
    document.getElementById('countAttention').textContent = counts.attention;
    document.getElementById('countCritical').textContent = counts.critical;

    // Mise à jour des KPI
    const kpiOptimal = document.getElementById('kpiOptimal');
    const kpiAttention = document.getElementById('kpiAttention');
    const kpiCritical = document.getElementById('kpiCritical');
    const kpiScoreMoyen = document.getElementById('kpiScoreMoyen');
    if (kpiOptimal) kpiOptimal.textContent = counts.optimal;
    if (kpiAttention) kpiAttention.textContent = counts.attention;
    if (kpiCritical) kpiCritical.textContent = counts.critical;
    if (kpiScoreMoyen && players.length > 0) {
        const avg = players.reduce((s, p) => s + (p.score || 0), 0) / players.length;
        kpiScoreMoyen.textContent = avg.toFixed(1);
    }
}

// Filtrer les joueuses par statut
async function filterPlayers(filter) {
    appState.currentFilter = filter;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    
    await loadCoachDashboard();
}

// ============================================
// FILTRAGE PAR PHASE DU CYCLE
// ============================================

// Variable pour stocker le filtre de phase actuel
if (!appState.currentPhaseFilter) {
    appState.currentPhaseFilter = 'all';
}

// Cache pour stocker les phases des joueuses
window.playersPhaseCache = {};

// Filtrer les joueuses par phase du cycle
async function filterByPhase(phase) {
    appState.currentPhaseFilter = phase;
    
    // Mettre à jour les boutons actifs
    document.querySelectorAll('.cycle-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-cycle-filter="${phase}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Recharger le dashboard avec le nouveau filtre
    await loadCoachDashboard();
}

// Calculer la phase du cycle pour une joueuse
async function getPlayerCyclePhase(playerId) {
    try {
        // Vérifier le cache
        if (window.playersPhaseCache[playerId]) {
            return window.playersPhaseCache[playerId];
        }
        
        // Récupérer la configuration du cycle depuis menstrualCycle
        const configDoc = await db.collection('menstrualCycle').doc(playerId).get();
        
        if (!configDoc.exists) {
            window.playersPhaseCache[playerId] = { phase: 'unknown', day: 0 };
            return window.playersPhaseCache[playerId];
        }
        
        const config = configDoc.data();
        
        // Champ est cycleStartDate dans menstrualCycle, pas lastPeriodDate
        const periodDateField = config.cycleStartDate || config.lastPeriodDate;
        
        if (!periodDateField) {
            window.playersPhaseCache[playerId] = { phase: 'unknown', day: 0 };
            return window.playersPhaseCache[playerId];
        }
        
        // Calculer le jour du cycle avec la même logique que calculateCyclePhaseWithRealData
        let lastJ1 = periodDateField.toDate ? periodDateField.toDate() : new Date(periodDateField);
        lastJ1.setHours(0, 0, 0, 0);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const cycleLength = config.cycleLength || 28;
        
        // Si le J1 est dans le futur (erreur de saisie), retourner unknown
        if (lastJ1 > today) {
            window.playersPhaseCache[playerId] = { phase: 'unknown', day: 0 };
            return window.playersPhaseCache[playerId];
        }

        // Calculer le jour depuis J1 SANS recalcul automatique
        // Seule la joueuse peut déclarer un nouveau J1 via check-in (boutons J1-J8)
        const diffTime = today - lastJ1;
        const daysSinceJ1 = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        let cycleDay = daysSinceJ1 + 1;
        if (cycleDay <= 0) cycleDay = 1;

        // Cycle prolongé si on dépasse la durée théorique (pas de reset auto)
        const isExtended = cycleDay > cycleLength;

        // Déterminer la phase
        let phase;
        if (cycleDay <= 5) {
            phase = 'menstrual';
        } else if (cycleDay <= 13) {
            phase = 'follicular';
        } else if (cycleDay <= 16) {
            phase = 'ovulatory';
        } else if (isExtended) {
            phase = 'extended'; // Cycle prolongé - possible aménorrhée
        } else {
            phase = 'luteal';
        }
        
        window.playersPhaseCache[playerId] = { phase, day: cycleDay };
        console.log(`✅ getPlayerCyclePhase: ${playerId} → Phase=${phase}, J${cycleDay}`);
        return window.playersPhaseCache[playerId];
        
    } catch (error) {
        console.error('Erreur calcul phase cycle:', error);
        return { phase: 'unknown', day: 0 };
    }
}

// Mettre à jour les compteurs de phase
async function updatePhaseCounts(players) {
    const counts = {
        all: players.length,
        menstrual: 0,
        follicular: 0,
        ovulatory: 0,
        luteal: 0,
        unknown: 0
    };
    
    // Calculer les phases pour toutes les joueuses en parallèle
    await Promise.all(players.map(async (player) => {
        const phaseInfo = await getPlayerCyclePhase(player.id);
        console.log(`📊 updatePhaseCounts: ${player.name} → Phase=${phaseInfo.phase}, J${phaseInfo.day}`);
        player.cyclePhase = phaseInfo.phase;
        player.cycleDay = phaseInfo.day;
        counts[phaseInfo.phase]++;
    }));
    
    // Mettre à jour les compteurs dans l'interface
    const countPhaseAll = document.getElementById('countPhaseAll');
    const countMenstrual = document.getElementById('countMenstrual');
    const countFollicular = document.getElementById('countFollicular');
    const countOvulatory = document.getElementById('countOvulatory');
    const countLuteal = document.getElementById('countLuteal');
    const countUnknown = document.getElementById('countUnknown');
    
    if (countPhaseAll) countPhaseAll.textContent = counts.all;
    if (countMenstrual) countMenstrual.textContent = counts.menstrual;
    if (countFollicular) countFollicular.textContent = counts.follicular;
    if (countOvulatory) countOvulatory.textContent = counts.ovulatory;
    if (countLuteal) countLuteal.textContent = counts.luteal;
    if (countUnknown) countUnknown.textContent = counts.unknown;
    
    return players;
}

// Filtrer les joueuses par phase (utilisé dans displayTeamGrid)
function filterPlayersByPhase(players) {
    if (!appState.currentPhaseFilter || appState.currentPhaseFilter === 'all') {
        return players;
    }
    return players.filter(p => p.cyclePhase === appState.currentPhaseFilter);
}

// Fonctions helper pour l'affichage des phases
function getPhaseBackground(phase) {
    const backgrounds = {
        'menstrual': 'linear-gradient(135deg, rgba(233, 30, 99, 0.15), rgba(244, 67, 54, 0.1))',
        'follicular': 'linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(139, 195, 74, 0.1))',
        'ovulatory': 'linear-gradient(135deg, rgba(255, 152, 0, 0.15), rgba(255, 193, 7, 0.1))',
        'luteal': 'linear-gradient(135deg, rgba(156, 39, 176, 0.15), rgba(103, 58, 183, 0.1))',
        'unknown': 'linear-gradient(135deg, rgba(158, 158, 158, 0.15), rgba(189, 189, 189, 0.1))'
    };
    return backgrounds[phase] || backgrounds['unknown'];
}

function getPhaseDisplay(phase, day) {
    const phaseInfo = {
        'menstrual': { icon: '🩸', name: 'Menstruelle', tip: 'Récupération' },
        'follicular': { icon: '🌱', name: 'Folliculaire', tip: 'Force & Puissance' },
        'ovulatory': { icon: '⚡', name: 'Ovulatoire', tip: 'Performance Max' },
        'luteal': { icon: '🍂', name: 'Lutéale', tip: 'Endurance' },
        'unknown': { icon: '❓', name: 'Non configuré', tip: 'Config. requise' }
    };
    
    const info = phaseInfo[phase] || phaseInfo['unknown'];
    const dayText = day > 0 ? ` J${day}` : '';
    
    return `
        <div style="font-weight: 600;">${info.icon} ${info.name}${dayText}</div>
        <div style="font-size: 11px; color: var(--color-text-secondary); margin-top: 2px;">${info.tip}</div>
    `;
}

console.log('Application RPE Gen2 chargée');



// Upload de la photo de profil par une joueuse
window.uploadProfilePhoto = async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('La photo ne peut pas dépasser 5MB');
        return;
    }
    
    try {
        const playerId = appState.currentUser;
        
        // Créer une référence unique pour la photo
        const timestamp = Date.now();
        const extension = file.name.split('.').pop();
        const fileName = `${playerId}_${timestamp}.${extension}`;
        const storageRef = firebase.storage().ref(`players/${fileName}`);
        
        console.log('Upload de la photo en cours...');
        
        // Upload du fichier
        const snapshot = await storageRef.put(file);
        
        // Récupérer l'URL de téléchargement
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        // Mettre à jour Firestore
        await db.collection('players').doc(playerId).update({
            photoURL: downloadURL,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Mettre à jour l'affichage
        document.getElementById('playerProfilePhoto').src = downloadURL;
        
        alert('Photo mise à jour avec succès !');
        
    } catch (error) {
        console.error('Erreur lors de l\'upload:', error);
        alert('Erreur lors de l\'upload de la photo: ' + error.message);
    }
}



// ========================================
// GESTION DES PÉRIODES DE REPOS
// ========================================

// Vérifier et bloquer le Check-in si jour de repos (RPE reste accessible)
async function checkAndBlockRestDay() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const restInfo = await isRestDay(today);
        
        if (restInfo.isRest) {
            // Afficher le message de repos
            displayRestDayMessage(restInfo.message);
            
            // Bloquer UNIQUEMENT le formulaire Check-in
            blockCheckinForm();
            
            // Le formulaire RPE reste accessible pour enregistrer les activités sportives
        }
    } catch (error) {
        console.error('Erreur lors de la vérification du jour de repos:', error);
    }
}

// Afficher le message de repos
function displayRestDayMessage(message) {
    // Créer la bannière si elle n'existe pas
    let banner = document.getElementById('restDayBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'restDayBanner';
        banner.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 25px;
            text-align: center;
            font-size: 18px;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        `;
        
        // Insérer au début du dashboard
        const playerDashboard = document.getElementById('playerDashboard');
        if (playerDashboard && playerDashboard.firstChild) {
            playerDashboard.insertBefore(banner, playerDashboard.firstChild);
        }
    }
    
    // Message avec information sur le RPE
    banner.innerHTML = `
        <div style="margin-bottom: 10px;">${message}</div>
        <div style="font-size: 14px; opacity: 0.9;">
            ℹ️ Le formulaire RPE reste accessible pour enregistrer vos activités sportives
        </div>
    `;
}

// Bloquer le formulaire Check-in
function blockCheckinForm() {
    const checkinForm = document.getElementById('checkinForm');
    if (checkinForm) {
        // Désactiver tous les inputs
        const inputs = checkinForm.querySelectorAll('input, textarea, button[type="submit"]');
        inputs.forEach(input => {
            input.disabled = true;
            input.style.opacity = '0.5';
            input.style.cursor = 'not-allowed';
        });
        
        // Ajouter un message
        let message = checkinForm.querySelector('.rest-day-message');
        if (!message) {
            message = document.createElement('p');
            message.className = 'rest-day-message';
            message.style.cssText = `
                background: var(--color-info-bg, #e3f2fd);
                color: var(--color-info-text, #1976d2);
                padding: 15px;
                border-radius: 8px;
                margin-top: 15px;
                text-align: center;
                font-weight: 600;
            `;
            message.textContent = '⏸️ Check-in désactivé pendant la période de repos';
            checkinForm.appendChild(message);
        }
    }
}


// ============================================================================
// GESTION DES JOUEUSES - AJOUT/SUPPRESSION
// ============================================================================

async function deletePlayer() {
    // Utiliser currentPopupPlayerId du nouveau popup ou l'ancien champ
    const playerId = window.currentPopupPlayerId || document.getElementById('playerIdField')?.value;
    if (!playerId) {
        alert('Aucune joueuse sélectionnée');
        return;
    }
    
    // Récupérer le nom de la joueuse pour confirmation
    let playerName = playerId;
    try {
        const playerDoc = await db.collection('players').doc(playerId).get();
        if (playerDoc.exists) {
            playerName = playerDoc.data().name || playerId;
        }
    } catch (e) {}
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${playerName} ?\n\nCette action est irréversible.`)) return;
    
    try {
        // Supprimer la joueuse
        await db.collection('players').doc(playerId).delete();
        console.log('Joueuse supprimée:', playerId);
        
        // Supprimer aussi les check-ins associés (optionnel mais recommandé)
        const checkinsSnapshot = await db.collection('checkins')
            .where('playerId', '==', playerId)
            .get();
        
        const batch = db.batch();
        checkinsSnapshot.forEach(doc => batch.delete(doc.ref));
        
        // Supprimer les RPE associés
        const rpeSnapshot = await db.collection('rpe')
            .where('playerId', '==', playerId)
            .get();
        
        rpeSnapshot.forEach(doc => batch.delete(doc.ref));
        
        await batch.commit();
        console.log('Données associées supprimées');
        
        // Invalider le cache des graphiques
        if (typeof invalidateChartsCache === 'function') {
            invalidateChartsCache();
        }
        
        // Fermer le popup
        if (typeof closePlayerDetailModal === 'function') {
            closePlayerDetailModal();
        }
        
        // Recharger le dashboard coach
        await loadCoachDashboard();
        
        alert(`${playerName} a été supprimée avec succès.`);
        
    } catch (error) {
        console.error('Erreur suppression joueuse:', error);
        alert('Erreur lors de la suppression: ' + error.message);
    }
}

async function openAddPlayerModal() {
    const modal = document.getElementById('addPlayerModal');
    if (modal) modal.style.display = 'flex';
}

function closeAddPlayerModal() {
    const modal = document.getElementById('addPlayerModal');
    if (modal) modal.style.display = 'none';
}

async function addPlayer() {
    const form = document.getElementById('addPlayerForm');
    if (!form) return;
    
    const formData = new FormData(form);
    const playerData = {
        name: formData.get('playerName'),
        birthDate: formData.get('playerBirthDate'),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        rpe: []
    };
    
    try {
        await db.collection('players').add(playerData);
        console.log('Joueuse ajoutée');
        
        // Invalider le cache des graphiques
        if (typeof invalidateChartsCache === 'function') {
            invalidateChartsCache();
        }
        
        // Recharger le dashboard coach
        await loadCoachDashboard();
        closeAddPlayerModal();
        form.reset();
        
    } catch (error) {
        console.error('Erreur ajout joueuse:', error);
        alert('Erreur lors de l\'ajout');
    }
}

// ============================================================================
// GESTION DE LA CONFIGURATION DU CYCLE MENSTRUEL (ONBOARDING)
// ============================================================================

// État local pour la configuration du cycle
let cycleConfigState = {
    periodLength: 5,
    hasContraception: false
};

/**
 * Vérifie si la joueuse a configuré son cycle menstruel
 * Si non, affiche le modal de configuration (bloquant)
 * @param {string} playerId - ID de la joueuse
 */
async function checkCycleConfiguration(playerId) {
    try {
        // Vérifier d'abord dans la collection menstrualCycle
        const cycleDoc = await db.collection('menstrualCycle').doc(playerId).get();
        
        if (cycleDoc.exists && cycleDoc.data().cycleStartDate) {
            // Cycle déjà configuré
            console.log('Cycle configuré:', cycleDoc.data());
            
            // Mettre à jour l'affichage de la phase si disponible
            if (typeof updateCyclePhaseDisplay === 'function') {
                updateCyclePhaseDisplay();
            }
            return true;
        }
        
        // Vérifier aussi dans players (ancien système)
        const playerDoc = await db.collection('players').doc(playerId).get();
        if (playerDoc.exists && playerDoc.data().cycleStartDate) {
            // Migrer vers la nouvelle collection
            await db.collection('menstrualCycle').doc(playerId).set({
                cycleStartDate: playerDoc.data().cycleStartDate,
                cycleLength: playerDoc.data().cycleLength || 28,
                periodLength: playerDoc.data().periodLength || 5,
                contraception: playerDoc.data().contraception || { type: 'none', hasHormonal: false },
                trackingMethod: 'calendar',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Données cycle migrées vers menstrualCycle');
            return true;
        }
        
        // Pas de configuration → Afficher le questionnaire complet
        console.log('Cycle non configuré, affichage du questionnaire complet');
        openCycleQuestionnaireModal();
        return false;
        
    } catch (error) {
        console.error('Erreur vérification config cycle:', error);
        return false;
    }
}

/**
 * Affiche le modal de configuration du cycle
 */
function showCycleConfigModal() {
    // Fonction dépréciée - utiliser openCycleQuestionnaireModal() à la place
    if (typeof openCycleQuestionnaireModal === 'function') {
        openCycleQuestionnaireModal();
    }
}



/**
 * Définit si la joueuse utilise une contraception hormonale



/**
 * Ferme le modal de configuration du cycle (dépréciée)
 */
function closeCycleConfigModal() {
    // Fonction stub - le questionnaire gère sa propre fermeture
}

// Initialiser les event listeners pour le formulaire de configuration cycle
document.addEventListener('DOMContentLoaded', function() {
    const cycleConfigForm = document.getElementById('cycleConfigForm');
    if (cycleConfigForm) {
        cycleConfigForm.addEventListener('submit', saveCycleConfig);
    }
});

// Ajouter l'animation de secousse via CSS
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(shakeStyle);

// Exports globaux
window.checkCycleConfiguration = checkCycleConfiguration;

// ============================================================================
// CITATIONS DE MOTIVATION
// ============================================================================

const encouragementQuotes = [
    "Chaque effort compte. Continuez à pousser !",
    "La persévérance est la clé du succès.",
    "Croyez en vous, tout est possible !",
    "Vos efforts d'aujourd'hui sont vos résultats de demain.",
    "Ne regardez jamais en arrière, sauf pour voir le chemin parcouru.",
    "Le succès n'est pas final, l'échec n'est pas fatal : c'est le courage de continuer qui compte.",
    "La seule limite à notre épanouissement de demain sera nos doutes d'aujourd'hui.",
    "Transformez vos défis en opportunités.",
    "La force ne vient pas de la capacité physique, elle vient d'une volonté indomptable.",
    "Faites de chaque jour un chef-d'œuvre.",
    "Votre potentiel est infini.",
    "Petit à petit, l'oiseau fait son nid. Chaque petit pas compte.",
    "Même les plus grands athlètes ont connu des jours difficiles. L'important est de se relever."
];

const congratulationsQuotes = [
    "Excellent travail ! Continuez sur cette lancée.",
    "Félicitations pour cette performance ! C'est inspirant.",
    "Bravo ! Votre persévérance porte ses fruits.",
    "Magnifique ! Chaque victoire, petite ou grande, compte.",
    "Formidable ! Votre détermination est exemplaire.",
    "Impressionnant ! Le travail acharné est récompensé.",
    "Superbe effort ! Vous avez donné le meilleur de vous-même.",
    "Chapeau ! Une performance de haut niveau.",
    "Continuez à briller ! Votre talent est évident.",
    "C'est une grande réussite ! Félicitations !"
];

const victoryQuotes = [
    "Savoure ce moment, c’est le fruit de ton investissement !",
    "Une victoire qui porte la marque de votre solidarité.",
    "Le talent gagne des matchs, votre esprit d’équipe gagne des championnats.",
    "Fier(e) de ton intensité aujourd’hui. Bravo !",
    "Chaque point gagné est une preuve de votre progression.",
    "La victoire est belle, le chemin pour y arriver l'est encore plus.",
    "Ton énergie a fait la différence sur le terrain.",
    "Un succès mérité pour un groupe qui ne lâche rien.",
    "Continue de viser haut, tu as tout pour réussir.",
    "La gagne est un état d’esprit, et tu l’as montré aujourd’hui.",
    "Bravo pour cette performance collective étincelante !",
    "Profite de cette sensation, elle est ton moteur.",
    "Le travail paie toujours. La preuve aujourd'hui !",
    "Ensemble, rien ne vous arrête. Quelle démonstration !",
    "Ton attitude positive a porté l'équipe vers le haut.",
    "Un match référence pour la suite de la saison.",
    "Magnifique maîtrise technique et mentale.",
    "Tu peux être fière de ce que vous avez accompli.",
    "Le plaisir de jouer se lit dans ce résultat.",
    "Une étape de plus franchie avec brio !",
    "Victoire nette et sans bavure. Bravo à toi !",
    "Ton engagement a été exemplaire tout au long du match.",
    "C’est dans ces moments-là qu’on voit la force du groupe.",
    "Bravo pour ton calme et ta lucidité dans les moments clés.",
    "On savoure ce soir, on repart au travail demain. Belle victoire !",
    "Le cri de victoire est la plus belle des récompenses.",
    "Ta détermination a été contagieuse aujourd'hui.",
    "Une victoire qui construit votre identité de championnes.",
    "Tu as su élever ton niveau de jeu au bon moment.",
    "Quelle intensité ! Tu n'as rien laissé passer.",
    "Bravo pour ce mental d'acier !",
    "La cohésion a été votre plus grande force aujourd'hui.",
    "Un grand bravo pour ton apport à cette victoire."
];

const defeatQuotes = [
    "On ne perd jamais : soit on gagne, soit on apprend.",
    "Le score ne définit pas votre valeur, votre réaction le fera.",
    "Relève la tête, le prochain match commence dès maintenant.",
    "C'est dans la difficulté que se forge le caractère d'une joueuse.",
    "Déçues peut-être, mais jamais vaincues. On revient plus fortes.",
    "Analysons, apprenons et tournons la page ensemble.",
    "Ta combativité a été remarquable malgré le résultat.",
    "Une défaite est un tremplin vers un futur succès si on sait l'écouter.",
    "Fier(e) de votre état d'esprit jusqu'au dernier point.",
    "Le chemin vers le sommet est parsemé d'obstacles. On continue.",
    "Parfois, le filet n'est pas de notre côté, mais l'envie doit rester.",
    "Rien n'est perdu tant que l'on garde l'envie de progresser.",
    "Ce match nous a montré où travailler. On va s'en servir.",
    "Garde confiance en toi, tes efforts finiront par payer.",
    "On gagne ensemble, on apprend ensemble. Solidarité.",
    "Le sport est fait de hauts et de bas. Demain sera un haut.",
    "Ta déception montre à quel point tu as du cœur. Utilise-le.",
    "On a perdu une bataille, pas la saison. Reste focus.",
    "Le plus important n'est pas la chute, mais la rapidité avec laquelle on se relève.",
    "Un match difficile qui vous rendra plus solides techniquement.",
    "Ne laisse pas un résultat gâcher ta progression constante.",
    "On reste soudées, c’est notre plus grande force dans l’adversité.",
    "La résilience est la qualité des plus grandes.",
    "Un mauvais jour ne signifie pas une mauvaise saison.",
    "On se soutient, on s'encourage et on repart au combat.",
    "Prends le temps de digérer, mais n'oublie pas tes qualités.",
    "Demain est une nouvelle opportunité de briller.",
    "Fier(e) de ton implication malgré le contexte difficile.",
    "On va transformer cette frustration en énergie positive.",
    "Le volley est un jeu de séries, la nôtre va arriver.",
    "Garde le sourire, le plaisir de jouer est ta meilleure arme.",
    "L'échec est l'épice qui donne sa saveur au succès futur.",
    "On apprend plus de ses erreurs que de ses réussites."
];

const lowPlayingTimeQuotes = [
    "Ta présence et ton soutien ont été essentiels pour le groupe aujourd'hui.",
    "Chaque rôle est vital. Ton tour viendra, reste prête.",
    "L'énergie du banc est le moteur de celles qui sont sur le terrain.",
    "Ta patience aujourd'hui est une force pour demain.",
    "Continue de travailler dans l'ombre, la lumière viendra à toi.",
    "Une équipe, c'est un puzzle. Tu es une pièce indispensable.",
    "Ton attitude exemplaire renforce la cohésion de l'équipe.",
    "Reste focus sur tes objectifs personnels, le travail paie toujours.",
    "Même sans beaucoup jouer, tu as contribué à cette dynamique.",
    "Ta préparation et ton sérieux à l'échauffement sont remarqués.",
    "Ne sous-estime jamais l'importance de tes encouragements.",
    "Le sport de haut niveau, c'est aussi savoir attendre son moment.",
    "Ta frustration est légitime, transforme-la en intensité à l'entraînement.",
    "Le collectif passe par chacune d'entre vous. Merci pour ton état d'esprit.",
    "Ta maturité face au temps de jeu est une preuve de ton professionnalisme.",
    "Prépare-toi, car quand l'équipe aura besoin de toi, tu seras là.",
    "Le talent attend, mais le travail n'attend pas. Continue.",
    "Tu es un maillon essentiel de cette chaîne. Ne l'oublie pas.",
    "Ta voix sur le côté a porté tes coéquipières. Bravo pour cela.",
    "On ne gagne pas à 6, on gagne à 12. Tu fais partie de cette victoire.",
    "Reste positive, ton énergie influence tout le groupe.",
    "Profite de ce match pour observer et apprendre tactiquement.",
    "La saison est longue, chaque joueuse aura son moment de gloire.",
    "Ta persévérance est ta plus grande qualité. Ne lâche rien.",
    "Merci de mettre ton ego de côté pour le bien du groupe.",
    "Ton soutien inconditionnel fait de toi une grande coéquipière.",
    "Les grandes victoires se construisent avec toutes les joueuses.",
    "Ton investissement à l'entraînement mérite d'être récompensé. Ça viendra.",
    "Reste affûtée, le volley va très vite.",
    "Ta discipline est un exemple pour les plus jeunes.",
    "On avance ensemble, pas à pas, joueuse par joueuse.",
    "Un groupe fort a besoin de joueuses prêtes à tout moment. Comme toi.",
    "Ta valeur ne se mesure pas qu'au temps de jeu, mais à ton impact sur le groupe.",
    "Garde la tête haute, ton rôle évoluera avec ton travail constant."
];

function getRandomEncouragementQuote() {
    const randomIndex = Math.floor(Math.random() * encouragementQuotes.length);
    return encouragementQuotes[randomIndex];
}

function getRandomCongratulationsQuote() {
    const randomIndex = Math.floor(Math.random() * congratulationsQuotes.length);
    return congratulationsQuotes[randomIndex];
}

function getRandomVictoryQuote() {
    const randomIndex = Math.floor(Math.random() * victoryQuotes.length);
    return victoryQuotes[randomIndex];
}

function getRandomDefeatQuote() {
    const randomIndex = Math.floor(Math.random() * defeatQuotes.length);
    return defeatQuotes[randomIndex];
}

function getRandomLowPlayingTimeQuote() {
    const randomIndex = Math.floor(Math.random() * lowPlayingTimeQuotes.length);
    return lowPlayingTimeQuotes[randomIndex];
}

// Fonction pour afficher un message temporaire
function showTemporaryMessage(message, type = 'success') {
    const messageContainer = document.createElement('div');
    messageContainer.className = `temp-message temp-message-${type}`;
    messageContainer.textContent = message;

    // Style minimal pour le message
    Object.assign(messageContainer.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: type === 'success' ? '#4CAF50' : '#f44336', // Vert ou Rouge
        color: 'white',
        padding: '15px',
        borderRadius: '8px',
        zIndex: '10000',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        opacity: '0',
        transition: 'opacity 0.5s ease-in-out'
    });

    document.body.appendChild(messageContainer);

    // Fade in
    setTimeout(() => {
        messageContainer.style.opacity = '1';
    }, 10);

    // Fade out and remove after 3 seconds
    setTimeout(() => {
        messageContainer.style.opacity = '0';
        messageContainer.addEventListener('transitionend', () => {
            messageContainer.remove();
        });
    }, 3000);
}

// HTML pour les questions spécifiques au match (généré dynamiquement)
const matchQuestionsHTML = `
    <div class="form-group" id="matchQuestions">
        <label class="form-label">As-tu gagné ?</label>
        <div class="match-win-lose-buttons" style="display: flex; gap: 10px; margin-bottom: 15px;">
            <button type="button" class="match-result-btn" data-value="oui" style="background: #10b981; color: white; border: none; padding: 10px 15px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Oui</button>
            <button type="button" class="match-result-btn" data-value="non" style="background: #ef4444; color: white; border: none; padding: 10px 15px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Non</button>
        </div>
        <input type="hidden" id="matchWon" value="">

        <div id="matchScoreGroup" style="display: none;">
            <label class="form-label">Score</label>
            <select id="matchScore" class="form-control" style="margin-bottom: 15px;">
                <option value="">Sélectionner un score</option>
            </select>
        </div>

        <label class="form-label">Ton temps de jeu</label>
        <div id="timePlayedTooltip" style="display: none; position: fixed; background: rgba(0,0,0,0.9); color: white; padding: 10px 15px; border-radius: 8px; font-size: 14px; font-weight: 600; z-index: 10000; pointer-events: none; box-shadow: 0 4px 12px rgba(0,0,0,0.3);"></div>
        <div class="time-played-badges" style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 15px;">
            <button type="button" class="time-played-badge" data-value="0" data-label="0 set" style="min-width: 50px; height: 50px; border-radius: 50%; border: 3px solid #ef4444; background: var(--color-surface); color: #ef4444; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;">0%</button>
            <button type="button" class="time-played-badge" data-value="20" data-label="1/5 set" style="min-width: 50px; height: 50px; border-radius: 50%; border: 3px solid #f59e0b; background: var(--color-surface); color: #f59e0b; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;">20%</button>
            <button type="button" class="time-played-badge" data-value="25" data-label="1/4 set" style="min-width: 50px; height: 50px; border-radius: 50%; border: 3px solid #f59e0b; background: var(--color-surface); color: #f59e0b; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;">25%</button>
            <button type="button" class="time-played-badge" data-value="33" data-label="1/3 set" style="min-width: 50px; height: 50px; border-radius: 50%; border: 3px solid #fbbf24; background: var(--color-surface); color: #fbbf24; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;">33%</button>
            <button type="button" class="time-played-badge" data-value="40" data-label="2/5 sets" style="min-width: 50px; height: 50px; border-radius: 50%; border: 3px solid #fbbf24; background: var(--color-surface); color: #fbbf24; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;">40%</button>
            <button type="button" class="time-played-badge" data-value="50" data-label="2/4 sets" style="min-width: 50px; height: 50px; border-radius: 50%; border: 3px solid #3b82f6; background: var(--color-surface); color: #3b82f6; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;">50%</button>
            <button type="button" class="time-played-badge" data-value="60" data-label="3/5 sets" style="min-width: 50px; height: 50px; border-radius: 50%; border: 3px solid #3b82f6; background: var(--color-surface); color: #3b82f6; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;">60%</button>
            <button type="button" class="time-played-badge" data-value="66" data-label="2/3 sets" style="min-width: 50px; height: 50px; border-radius: 50%; border: 3px solid #10b981; background: var(--color-surface); color: #10b981; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;">66%</button>
            <button type="button" class="time-played-badge" data-value="75" data-label="3/4 sets" style="min-width: 50px; height: 50px; border-radius: 50%; border: 3px solid #10b981; background: var(--color-surface); color: #10b981; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;">75%</button>
            <button type="button" class="time-played-badge" data-value="80" data-label="4/5 sets" style="min-width: 50px; height: 50px; border-radius: 50%; border: 3px solid #10b981; background: var(--color-surface); color: #10b981; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;">80%</button>
            <button type="button" class="time-played-badge" data-value="100" data-label="Tous les sets" style="min-width: 50px; height: 50px; border-radius: 50%; border: 3px solid #10b981; background: var(--color-surface); color: #10b981; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;">100%</button>
        </div>
        <input type="hidden" id="timePlayed" value="">
    </div>
`;

function renderMatchQuestions(sessionType) {
    const rpeForm = document.getElementById('rpeForm');
    let matchQuestionsContainer = document.getElementById('matchQuestions');

    if (sessionType === 'Match') {
        if (!matchQuestionsContainer) {
            // Insérer juste avant rpeStep2
            const rpeStep2 = document.getElementById('rpeStep2');
            rpeStep2.insertAdjacentHTML('beforebegin', matchQuestionsHTML);
            matchQuestionsContainer = document.getElementById('matchQuestions');

            // Attacher les listeners aux nouveaux éléments
            attachMatchQuestionListeners();
        }
        matchQuestionsContainer.style.display = 'block';
    } else {
        if (matchQuestionsContainer) {
            matchQuestionsContainer.style.display = 'none';
            // Optionnel: Réinitialiser les valeurs quand caché
            document.getElementById('matchWon').value = '';
            document.getElementById('matchScore').value = '';
            document.getElementById('timePlayed').value = '';
            document.getElementById('matchScoreGroup').style.display = 'none';
        }
    }
}

function attachMatchQuestionListeners() {
    // Gérer les boutons Oui/Non pour "As-tu gagné ?"
    document.querySelectorAll('.match-result-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.match-result-btn').forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            const matchWon = button.dataset.value;
            document.getElementById('matchWon').value = matchWon;
            console.log('Match gagné:', matchWon);

            // Afficher ou masquer le score et peupler les options
            const matchScoreGroup = document.getElementById('matchScoreGroup');
            const matchScoreSelect = document.getElementById('matchScore');
            matchScoreSelect.innerHTML = '<option value="">Sélectionner un score</option>'; // Reset options

            if (matchWon === 'oui') {
                matchScoreGroup.style.display = 'block';
                ['3-0', '3-1', '3-2', '2-0', '2-1'].forEach(score => {
                    const option = document.createElement('option');
                    option.value = score;
                    option.textContent = score;
                    matchScoreSelect.appendChild(option);
                });
            } else if (matchWon === 'non') {
                matchScoreGroup.style.display = 'block';
                ['0-3', '1-3', '2-3'].forEach(score => {
                    const option = document.createElement('option');
                    option.value = score;
                    option.textContent = score;
                    matchScoreSelect.appendChild(option);
                });
            } else {
                matchScoreGroup.style.display = 'none';
            }
        });
    });

    // Gérer les pastilles de pourcentage pour "Ton temps de jeu"
    document.querySelectorAll('.time-played-badge').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Désélectionner les autres pastilles
            document.querySelectorAll('.time-played-badge').forEach(btn => {
                btn.style.background = 'white';
                btn.style.color = btn.style.borderColor;
            });
            
            // Sélectionner la pastille cliquée
            button.style.background = button.style.borderColor;
            button.style.color = 'white';
            
            const timePlayed = button.dataset.value;
            document.getElementById('timePlayed').value = timePlayed;
            console.log('Temps de jeu:', timePlayed + '%');
            
            // Afficher le tooltip avec le label
            const tooltip = document.getElementById('timePlayedTooltip');
            tooltip.textContent = button.dataset.label;
            tooltip.style.display = 'block';
            
            // Positionner le tooltip au centre de l'écran
            const rect = button.getBoundingClientRect();
            tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
            tooltip.style.top = rect.bottom + 10 + 'px';
            
            // Masquer après 2 secondes
            setTimeout(() => {
                tooltip.style.display = 'none';
            }, 2000);
        });
    });
}

// ========================================
// FONCTIONS ONGLET MATCHS - PARTAGE LIENS
// ========================================

/**
 * Ouvre le formulaire de déclaration de match avec les infos de la joueuse pré-remplies
 */
async function openMatchDeclaration() {
    try {
        // Récupérer les informations de la joueuse connectée
        if (!window.currentPlayer || !window.currentPlayer.id) {
            console.error('❌ Aucune joueuse connectée');
            alert('Erreur : Impossible de récupérer vos informations. Veuillez vous reconnecter.');
            return;
        }

        // Charger les données complètes de la joueuse depuis Firestore
        const playerDoc = await db.collection('players').doc(window.currentPlayer.id).get();
        
        if (!playerDoc.exists) {
            console.error('❌ Joueuse introuvable dans la base de données');
            alert('Erreur : Vos informations ne sont pas disponibles.');
            return;
        }

        const playerData = playerDoc.data();
        
        // Extraire prénom et nom du nom complet
        const nameParts = (playerData.name || '').split(' ');
        const prenom = nameParts[0] || '';
        const nom = nameParts.slice(1).join(' ') || '';
        
        // Récupérer le club depuis les données de la joueuse (avec fallback)
        const club = playerData.club || 'SCO Volley Sablé';
        
        // Construire l'URL avec les paramètres (compatible iOS)
        const baseUrl = 'https://interface-match-en-live.web.app/formulaire-match.html';
        const params = [
            `prenom=${encodeURIComponent(prenom)}`,
            `nom=${encodeURIComponent(nom)}`,
            `club=${encodeURIComponent(club)}`,
            `playerId=${encodeURIComponent(window.currentPlayer.id)}`
        ].join('&');
        
        const fullUrl = `${baseUrl}?${params}`;
        
        console.log('🏐 Ouverture du formulaire avec les infos:', { prenom, nom, club });
        
        // Ouvrir dans un nouvel onglet (compatible iOS)
        const newWindow = window.open(fullUrl, '_blank');
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            // Si le popup est bloqué, proposer un lien direct
            if (confirm('Impossible d\'ouvrir automatiquement. Voulez-vous ouvrir le lien manuellement ?')) {
                window.location.href = fullUrl;
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'ouverture du formulaire:', error);
        alert('Une erreur est survenue. Veuillez réessayer.');
    }
}

/**
 * Copie le lien TV Pôle Sablé dans le presse-papier
 */
function copyTVLink() {
    const input = document.getElementById('tvLinkInput');
    const message = document.getElementById('copySuccessMessage');
    const btn = document.getElementById('copyTVLinkBtn');
    
    // Méthode compatible iOS
    input.select();
    input.setSelectionRange(0, 99999); // Pour mobile
    
    // Essayer d'abord avec l'API Clipboard moderne
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(input.value).then(() => {
            // Afficher le message de succès
            message.style.display = 'block';
            btn.textContent = '✅ Copié !';
            
            // Réinitialiser après 3 secondes
            setTimeout(() => {
                message.style.display = 'none';
                btn.textContent = '📋 Copier';
            }, 3000);
        }).catch(err => {
            console.error('Erreur lors de la copie:', err);
            // Fallback pour iOS
            copyFallback(input, message, btn);
        });
    } else {
        // Fallback pour les anciens navigateurs et iOS
        copyFallback(input, message, btn);
    }
}

/**
 * Méthode de copie alternative pour iOS
 */
function copyFallback(input, message, btn) {
    try {
        // Méthode execCommand (deprecated mais fonctionne sur iOS)
        input.select();
        input.setSelectionRange(0, 99999);
        const successful = document.execCommand('copy');
        
        if (successful) {
            message.style.display = 'block';
            btn.textContent = '✅ Copié !';
            
            setTimeout(() => {
                message.style.display = 'none';
                btn.textContent = '📋 Copier';
            }, 3000);
        } else {
            throw new Error('execCommand failed');
        }
    } catch (err) {
        console.error('Erreur lors de la copie fallback:', err);
        alert('Veuillez maintenir votre doigt sur le lien et sélectionner "Copier"');
    }
}

/**
 * Partage le lien via WhatsApp
 */
function shareTVLinkWhatsApp() {
    const link = 'https://interface-match-en-live.web.app/lives-weekend.html';
    const text = encodeURIComponent(`🏐 Venez suivre nos matchs en direct sur le Pôle TV Sablé ! ${link}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

/**
 * Partage le lien via Email
 */
function shareTVLinkEmail() {
    const link = 'https://interface-match-en-live.web.app/lives-weekend.html';
    const subject = encodeURIComponent('🏐 Pôle TV Sablé - Matchs en direct');
    const body = encodeURIComponent(`Bonjour,\n\nVenez suivre nos matchs de volleyball en direct sur le Pôle TV Sablé !\n\n🔗 Lien : ${link}\n\nÀ bientôt pour les matchs !`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

/**
 * Partage le lien via SMS
 */
function shareTVLinkSMS() {
    const link = 'https://interface-match-en-live.web.app/lives-weekend.html';
    const text = encodeURIComponent(`🏐 Venez suivre nos matchs en direct sur le Pôle TV Sablé ! ${link}`);
    window.location.href = `sms:?body=${text}`;
}
